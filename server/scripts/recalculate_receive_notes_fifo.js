import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const summaryFileArg = resolveArgValue("--summary-file");
const defaultSummaryPath = path.join(__dirname, "recalculate_receive_notes_fifo_summary.csv");
const summaryFile = summaryFileArg ? path.resolve(summaryFileArg) : defaultSummaryPath;

const conflictsFileArg = resolveArgValue("--conflicts-file");
const defaultConflictsPath = path.join(__dirname, "recalculate_receive_notes_fifo_conflicts.csv");
const conflictsFile = conflictsFileArg ? path.resolve(conflictsFileArg) : defaultConflictsPath;

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const refreshPoHeaderStatus = async (client, poNumber) => {
  const normalized = String(poNumber || "").trim();
  if (!normalized) return;
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
    [normalized],
  );
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const planResult = await client.query(
      `
      with receipt_rows as (
        select
          rn.id as rn_id,
          rn.schedule_id as current_schedule_id,
          rn.po_line_id as current_po_line_id,
          rn.item_code,
          rn.received_qty,
          rn.received_at,
          s.supplier,
          s.po_number,
          coalesce(s.item_code, s.item) as schedule_item_code,
          row_number() over (
            partition by lower(trim(s.supplier)), lower(trim(s.po_number)), lower(trim(coalesce(rn.item_code, s.item_code, s.item)))
            order by rn.received_at asc, rn.id asc
          ) as receipt_rank
        from receive_notes rn
        join schedules s on s.id = rn.schedule_id
        where rn.schedule_id is not null
      ),
      schedule_rows as (
        select
          s.id as schedule_id,
          s.supplier,
          s.po_number,
          coalesce(s.item_code, s.item) as item_code,
          s.po_line_id as schedule_po_line_id,
          s.request_date,
          row_number() over (
            partition by lower(trim(s.supplier)), lower(trim(s.po_number)), lower(trim(coalesce(s.item_code, s.item)))
            order by s.request_date asc nulls last, s.id asc
          ) as schedule_rank
        from schedules s
      )
      select
        r.rn_id,
        r.current_schedule_id,
        r.current_po_line_id,
        r.item_code,
        r.received_qty,
        r.received_at,
        r.supplier,
        r.po_number,
        r.receipt_rank,
        s.schedule_id as desired_schedule_id,
        s.schedule_po_line_id as desired_schedule_po_line_id,
        s.request_date as desired_request_date,
        s.schedule_rank
      from receipt_rows r
      left join schedule_rows s
        on lower(trim(s.supplier)) = lower(trim(r.supplier))
       and lower(trim(s.po_number)) = lower(trim(r.po_number))
       and lower(trim(s.item_code)) = lower(trim(r.item_code))
       and s.schedule_rank = r.receipt_rank
      order by r.supplier asc, r.po_number asc, r.item_code asc, r.receipt_rank asc, r.rn_id asc
      `,
    );

    const planRows = planResult.rows || [];
    const conflicts = planRows.filter((row) => !row.desired_schedule_id);
    const mismatches = planRows.filter(
      (row) => Number(row.current_schedule_id || 0) !== Number(row.desired_schedule_id || 0),
    );

    if (planRows.length === 0) {
      await client.query("rollback");
      console.log("Recalculate receipt FIFO");
      console.log("- No posted receive_notes rows found.");
      return;
    }

    if (conflicts.length > 0) {
      const headers = [
        "rn_id",
        "supplier",
        "po_number",
        "item_code",
        "received_qty",
        "received_at",
        "current_schedule_id",
        "desired_schedule_id",
        "receipt_rank",
        "schedule_rank",
      ];
      const rows = [headers.join(",")];
      conflicts.forEach((row) => {
        rows.push(
          headers
            .map((key) => escapeCsv(row[key]))
            .join(","),
        );
      });
      fs.writeFileSync(conflictsFile, rows.join("\n"), "utf8");
      throw new Error(`Ada ${conflicts.length} receipt row yang tidak menemukan pasangan schedule. Lihat ${conflictsFile}`);
    }

    const affectedPoNumbers = Array.from(
      new Set(
        planRows
          .map((row) => String(row.po_number || "").trim())
          .filter(Boolean),
      ),
    );

    const summaryHeaders = [
      "rn_id",
      "supplier",
      "po_number",
      "item_code",
      "received_qty",
      "received_at",
      "current_schedule_id",
      "desired_schedule_id",
      "current_po_line_id",
      "desired_po_line_id",
      "receipt_rank",
      "schedule_rank",
    ];
    const summaryRows = [summaryHeaders.join(",")];
    planRows.forEach((row) => {
      summaryRows.push(
        summaryHeaders
          .map((key) => escapeCsv(row[key]))
          .join(","),
      );
    });
    fs.writeFileSync(summaryFile, summaryRows.join("\n"), "utf8");

    const updateLog = [];
    const plannedMoves = mismatches.length;
    let movedRows = 0;

    if (!dryRun) {
      for (const row of planRows) {
        const desiredScheduleId = Number(row.desired_schedule_id || 0);
        const currentScheduleId = Number(row.current_schedule_id || 0);
        const desiredPoLineId = Number(row.desired_po_line_id || 0) || null;
        const currentPoLineId = Number(row.current_po_line_id || 0) || null;
        const nextPoLineId = desiredPoLineId || currentPoLineId;

        if (currentScheduleId !== desiredScheduleId) {
          movedRows += 1;
        }

        await client.query(
          `
          update receive_notes
          set schedule_id = $1,
              po_line_id = coalesce($2, po_line_id)
          where id = $3
          `,
          [desiredScheduleId, nextPoLineId, row.rn_id],
        );

        updateLog.push({
          rn_id: row.rn_id,
          from_schedule_id: currentScheduleId,
          to_schedule_id: desiredScheduleId,
          po_number: row.po_number,
          item_code: row.item_code,
        });
      }

      await client.query(
        `
        update schedules s
        set po_line_id = coalesce(s.po_line_id, rn.po_line_id)
        from receive_notes rn
        where rn.schedule_id = s.id
          and s.po_number = any($1::text[])
          and coalesce(s.po_line_id, 0) <> coalesce(rn.po_line_id, 0)
        `,
        [affectedPoNumbers],
      );

      await client.query(
        `
        update receive_notes rn
        set po_line_id = coalesce(s.po_line_id, rn.po_line_id)
        from schedules s
        where rn.schedule_id = s.id
          and s.po_number = any($1::text[])
          and coalesce(rn.po_line_id, 0) <> coalesce(s.po_line_id, rn.po_line_id)
        `,
        [affectedPoNumbers],
      );

      await client.query(
        `
        with stats as (
          select
            s.id as schedule_id,
            coalesce(sum(rn.received_qty), 0)::numeric as total_received,
            min(rn.received_at::date) as first_received_at
          from schedules s
          left join receive_notes rn on rn.schedule_id = s.id
          where s.po_number = any($1::text[])
          group by s.id
        )
        update schedules s
        set received_qty = stats.total_received,
            arrival_date = stats.first_received_at,
            status = case
              when coalesce(stats.total_received, 0) <= 0 then s.status
              when coalesce(stats.total_received, 0) >= s.request_qty then 'RECEIVED'
              else 'PARTIAL'
            end,
            updated_at = now()
        from stats
        where s.id = stats.schedule_id
        `,
        [affectedPoNumbers],
      );

      await client.query(
        `
        with line_stats as (
          select
            pl.id as po_line_id,
            coalesce(sum(rn.received_qty), 0)::numeric as total_received
          from po_lines pl
          left join schedules s on s.po_line_id = pl.id
          left join receive_notes rn on rn.schedule_id = s.id
          where pl.po_number = any($1::text[])
          group by pl.id
        )
        update po_lines pl
        set qty_received = line_stats.total_received
        from line_stats
        where pl.id = line_stats.po_line_id
          and pl.qty_received <> line_stats.total_received
        `,
        [affectedPoNumbers],
      );

      for (const poNumber of affectedPoNumbers) {
        await refreshPoHeaderStatus(client, poNumber);
      }
    }

    await client.query("commit");

    console.log("Recalculate receive_notes FIFO");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Total rows: ${planRows.length}`);
    console.log(`- Planned moves: ${plannedMoves}`);
    console.log(`- Moved rows: ${movedRows}`);
    console.log(`- Affected PO: ${affectedPoNumbers.length}`);
    console.log(`- Summary CSV: ${summaryFile}`);
    if (conflicts.length === 0) {
      console.log("- Conflicts: 0");
    } else {
      console.log(`- Conflicts: ${conflicts.length}`);
      console.log(`- Conflict CSV: ${conflictsFile}`);
    }

    if (updateLog.length > 0) {
      const changedHeaders = [
        "rn_id",
        "from_schedule_id",
        "to_schedule_id",
        "po_number",
        "item_code",
      ];
      const changedRows = [changedHeaders.join(",")];
      updateLog.forEach((row) => {
        changedRows.push(changedHeaders.map((key) => escapeCsv(row[key])).join(","));
      });
      const changedFile = path.join(__dirname, "recalculate_receive_notes_fifo_changes.csv");
      fs.writeFileSync(changedFile, changedRows.join("\n"), "utf8");
      console.log(`- Changes CSV: ${changedFile}`);
    }
  } catch (error) {
    await client.query("rollback");
    console.error("Recalculate receive_notes FIFO failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
