import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const argSet = new Set(args);
const dryRun = argSet.has("--dry-run");
const forceAssign = argSet.has("--force");
const applyReceived = !argSet.has("--no-apply-received");

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const conflictsFileArg = resolveArgValue("--conflicts-file");
const defaultConflictsPath = path.join(__dirname, "backfill_po_line_conflicts.csv");
const conflictsFile = conflictsFileArg ? path.resolve(conflictsFileArg) : defaultConflictsPath;
const summaryFileArg = resolveArgValue("--summary-file");
const defaultSummaryPath = path.join(__dirname, "backfill_po_line_summary.csv");
const summaryFile = summaryFileArg ? path.resolve(summaryFileArg) : defaultSummaryPath;

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const normalizeKey = (poNumber, itemCode) => `${String(poNumber || "").trim()}||${String(itemCode || "").trim()}`;

const refreshPoHeaderStatus = async (client, poNumber) => {
  await client.query(
    `
    update po_headers
    set status = case
      when not exists (
        select 1 from po_lines where po_number = $1 and qty_order > qty_received
      ) then 'closed'
      when exists (
        select 1 from po_lines where po_number = $1 and qty_received > 0
      ) then 'partial'
      else 'open'
    end,
    updated_at = now()
    where po_number = $1
    `,
    [poNumber],
  );
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const tableCheck = await client.query(
      "select to_regclass('po_headers') as po_headers, to_regclass('po_lines') as po_lines",
    );
    const tablesReady = tableCheck.rows[0]?.po_headers && tableCheck.rows[0]?.po_lines;
    if (!tablesReady) {
      await client.query("rollback");
      console.error("Table po_headers/po_lines belum ada. Jalankan migrasi (start API) dulu.");
      process.exitCode = 1;
      return;
    }

    const linesResult = await client.query(
      `
      select id, po_number, item_code, line_no, qty_order, qty_received
      from po_lines
      order by po_number asc, line_no asc
      `,
    );
    const lineMap = new Map();
    const lineState = new Map();
    for (const row of linesResult.rows) {
      const key = normalizeKey(row.po_number, row.item_code);
      const entry = lineMap.get(key) || [];
      entry.push(row);
      lineMap.set(key, entry);
      lineState.set(row.id, {
        id: row.id,
        poNumber: row.po_number,
        itemCode: row.item_code,
        lineNo: row.line_no,
        qtyOrder: Number(row.qty_order || 0),
        qtyReceived: Number(row.qty_received || 0),
        allocated: 0,
      });
    }

    const receiveResult = await client.query(
      `
      select schedule_id, sum(received_qty)::numeric as received_qty
      from receive_notes
      where schedule_id is not null
      group by schedule_id
      `,
    );
    const receivedBySchedule = new Map();
    receiveResult.rows.forEach((row) => {
      receivedBySchedule.set(Number(row.schedule_id), Number(row.received_qty || 0));
    });

    const scheduleResult = await client.query(
      `
      select id, po_number, item, request_qty, received_qty, request_date
      from schedules
      where po_line_id is null
        and po_number is not null
        and trim(po_number) <> ''
        and item is not null
        and trim(item) <> ''
      order by request_date nulls last, id asc
      `,
    );

    let assigned = 0;
    let skippedMissing = 0;
    let skippedAmbiguous = 0;
    let skippedNoCapacity = 0;
    const updates = [];
    const assignments = [];
    const receivedIncrements = new Map();
    const affectedPos = new Set();
    const conflicts = [];
    const addConflict = (entry) => {
      conflicts.push({
        type: entry.type || "schedule",
        schedule_id: entry.scheduleId || "",
        po_number: entry.poNumber || "",
        item_code: entry.itemCode || "",
        needed_qty: entry.needed ?? "",
        po_line_id: entry.poLineId || "",
        reason: entry.reason || "",
        increment_qty: entry.increment ?? "",
        remaining_qty: entry.remaining ?? "",
      });
    };

    for (const schedule of scheduleResult.rows) {
      const key = normalizeKey(schedule.po_number, schedule.item);
      const candidates = lineMap.get(key) || [];
      if (candidates.length === 0) {
        skippedMissing += 1;
        addConflict({ scheduleId: schedule.id, reason: "no_po_line", poNumber: schedule.po_number, itemCode: schedule.item });
        continue;
      }
      const scheduleReceived = receivedBySchedule.get(schedule.id);
      const receivedQty = Number.isFinite(scheduleReceived)
        ? scheduleReceived
        : Number(schedule.received_qty || 0);
      const requestedQty = Number(schedule.request_qty || 0);
      const needed = receivedQty > 0 ? receivedQty : Math.max(0, requestedQty);

      let chosen = null;
      if (candidates.length === 1) {
        chosen = candidates[0];
      } else {
        const withRemaining = candidates
          .map((row) => {
            const state = lineState.get(row.id);
            const remaining = state ? state.qtyOrder - state.qtyReceived - state.allocated : 0;
            return { row, remaining };
          })
          .sort((a, b) => a.row.line_no - b.row.line_no);

        const fits = withRemaining.find((entry) => (needed > 0 ? entry.remaining >= needed : entry.remaining > 0));
        if (fits) {
          chosen = fits.row;
        } else if (forceAssign) {
          chosen = withRemaining.sort((a, b) => b.remaining - a.remaining)[0]?.row || null;
        } else {
          skippedAmbiguous += 1;
          addConflict({ scheduleId: schedule.id, reason: "ambiguous_no_capacity", poNumber: schedule.po_number, itemCode: schedule.item, needed });
          continue;
        }
      }

      if (!chosen) {
        skippedNoCapacity += 1;
        addConflict({ scheduleId: schedule.id, reason: "no_capacity", poNumber: schedule.po_number, itemCode: schedule.item, needed });
        continue;
      }

      updates.push({ scheduleId: schedule.id, poLineId: chosen.id });
      assignments.push({
        schedule_id: schedule.id,
        po_number: schedule.po_number,
        item_code: schedule.item,
        po_line_id: chosen.id,
        request_qty: requestedQty,
        received_qty: receivedQty,
        needed_qty: needed,
      });
      assigned += 1;
      affectedPos.add(chosen.po_number);

      if (applyReceived && receivedQty > 0) {
        const state = lineState.get(chosen.id);
        if (state) {
          state.allocated += receivedQty;
          receivedIncrements.set(chosen.id, (receivedIncrements.get(chosen.id) || 0) + receivedQty);
        }
      }
    }

    if (!dryRun) {
      for (const update of updates) {
        await client.query("update schedules set po_line_id = $1 where id = $2", [update.poLineId, update.scheduleId]);
      }
      if (applyReceived) {
        for (const [lineId, increment] of receivedIncrements.entries()) {
          if (!Number.isFinite(increment) || increment <= 0) continue;
          const state = lineState.get(lineId);
          const remaining = state ? state.qtyOrder - state.qtyReceived : 0;
          if (increment > remaining) {
            addConflict({ poLineId: lineId, reason: "over_receive_adjust", increment, remaining });
            continue;
          }
          await client.query("update po_lines set qty_received = qty_received + $1 where id = $2", [increment, lineId]);
        }
      }
      for (const poNumber of affectedPos) {
        await refreshPoHeaderStatus(client, poNumber);
      }
    }

    await client.query(dryRun ? "rollback" : "commit");

    console.log("Backfill PO Line ID Summary");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Assigned: ${assigned}`);
    console.log(`- Skipped (missing PO line): ${skippedMissing}`);
    console.log(`- Skipped (ambiguous/no capacity): ${skippedAmbiguous}`);
    console.log(`- Skipped (no capacity): ${skippedNoCapacity}`);
    console.log(`- Apply received: ${applyReceived ? "yes" : "no"}`);
    console.log(`- Force assign: ${forceAssign ? "yes" : "no"}`);

    const escapeCsv = (value) => {
      const text = String(value ?? "");
      if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    if (assignments.length > 0) {
      const headers = ["schedule_id", "po_number", "item_code", "po_line_id", "request_qty", "received_qty", "needed_qty"];
      const rows = [headers.join(",")];
      assignments.forEach((row) => {
        rows.push(headers.map((key) => escapeCsv(row[key])).join(","));
      });
      fs.writeFileSync(summaryFile, rows.join("\n"), "utf8");
      console.log(`Assignment summary: ${assignments.length}`);
      console.log(`Summary CSV: ${summaryFile}`);
    }

    if (conflicts.length > 0) {
      const headers = [
        "type",
        "schedule_id",
        "po_number",
        "item_code",
        "needed_qty",
        "po_line_id",
        "reason",
        "increment_qty",
        "remaining_qty",
      ];
      const rows = [headers.join(",")];
      conflicts.forEach((conflict) => {
        rows.push(headers.map((key) => escapeCsv(conflict[key])).join(","));
      });
      fs.writeFileSync(conflictsFile, rows.join("\n"), "utf8");

      console.log(`Conflicts: ${conflicts.length}`);
      console.log(`Conflict CSV: ${conflictsFile}`);
      conflicts.slice(0, 20).forEach((conflict) => console.log(conflict));
      if (conflicts.length > 20) {
        console.log(`... ${conflicts.length - 20} more`);
      }
    }
  } catch (error) {
    await client.query("rollback");
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
