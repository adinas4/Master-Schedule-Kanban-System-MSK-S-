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

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
};

const now = new Date();
const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const prefix = resolveArgValue("--prefix") || `MOCK${stamp}`;
const supplierId = resolveArgValue("--supplier-id") || `SUP-${prefix}`;
const supplierName = resolveArgValue("--supplier-name") || `Supplier ${prefix}`;
const itemsCount = toInt(resolveArgValue("--items"), 3);
const poCount = toInt(resolveArgValue("--po-count"), 1);
const linesPerPo = toInt(resolveArgValue("--lines-per-po"), itemsCount);
const qtyPerLine = toInt(resolveArgValue("--qty"), 100);
const withPo = !argSet.has("--no-po");
const withSchedule = argSet.has("--with-schedule");
const dryRun = argSet.has("--dry-run");

const outputPath = resolveArgValue("--out")
  ? path.resolve(resolveArgValue("--out"))
  : path.join(__dirname, "..", "..", "docs", "mock_data_output.json");

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const ensureVendor = async (client) => {
  const existing = await client.query(
    "select * from master_vendors where id = $1 limit 1",
    [supplierId],
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const inserted = await client.query(
    `
    insert into master_vendors (id, name, type, role, email, lead_time_days)
    values ($1, $2, 'Supplier', 'Delivery Note', null, 0)
    returning *
    `,
    [supplierId, supplierName],
  );
  return inserted.rows[0];
};

const ensureItems = async (client) => {
  const items = [];
  for (let idx = 1; idx <= itemsCount; idx += 1) {
    const code = `ITEM-${prefix}-${String(idx).padStart(3, "0")}`;
    const existing = await client.query("select code from items where code = $1", [code]);
    if (existing.rows.length === 0) {
      await client.query(
        `
        insert into items (code, name, type, unit, vendor_id, supplier_name)
        values ($1, $2, 'RAW', 'PCS', $3, $4)
        `,
        [code, `Item ${prefix} ${idx}`, supplierId, supplierName],
      );
    }
    items.push(code);
  }
  return items;
};

const createPo = async (client, poNumber, itemCodes) => {
  const poDate = now.toISOString().slice(0, 10);
  await client.query(
    `
    insert into po_headers (po_number, po_date, supplier_id, status, remarks)
    values ($1, $2, $3, 'open', 'Mock data')
    `,
    [poNumber, poDate, supplierId],
  );
  const lines = [];
  for (let idx = 0; idx < Math.min(linesPerPo, itemCodes.length); idx += 1) {
    const itemCode = itemCodes[idx];
    const lineNo = idx + 1;
    const qtyOrder = qtyPerLine + idx * 10;
    const lineResult = await client.query(
      `
      insert into po_lines (po_number, line_no, item_code, qty_order, qty_received)
      values ($1, $2, $3, $4, 0)
      returning *
      `,
      [poNumber, lineNo, itemCode, qtyOrder],
    );
    lines.push(lineResult.rows[0]);
  }
  return lines;
};

const createSchedules = async (client, poNumber, poLines) => {
  const requestDate = now.toISOString().slice(0, 10);
  const schedules = [];
  for (const line of poLines) {
    const scheduleResult = await client.query(
      `
      insert into schedules (po_number, supplier, item, request_date, delivery_time, request_qty, status, po_line_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning id
      `,
      [poNumber, supplierId, line.item_code, requestDate, "08:00", line.qty_order, "Planned", line.id],
    );
    schedules.push({ id: scheduleResult.rows[0]?.id, itemCode: line.item_code });
  }
  return schedules;
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const vendor = await ensureVendor(client);
    const itemCodes = await ensureItems(client);

    const poNumbers = [];
    const poLinesByPo = {};
    const schedulesByPo = {};
    if (withPo) {
      for (let idx = 1; idx <= poCount; idx += 1) {
        const poNumber = `PO-${prefix}-${String(idx).padStart(3, "0")}`;
        await client.query("delete from po_headers where po_number = $1", [poNumber]);
        const lines = await createPo(client, poNumber, itemCodes);
        poNumbers.push(poNumber);
        poLinesByPo[poNumber] = lines;
        if (withSchedule) {
          schedulesByPo[poNumber] = await createSchedules(client, poNumber, lines);
        }
      }
    }

    if (dryRun) {
      await client.query("rollback");
    } else {
      await client.query("commit");
    }

    const payload = {
      dryRun,
      supplierId: vendor.id,
      supplierName: vendor.name,
      itemCodes,
      poNumbers,
      poLinesByPo,
      schedulesByPo,
      notes: {
        withPo,
        withSchedule,
        prefix,
      },
    };
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");

    console.log("Mock data generator done.");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Supplier: ${vendor.id}`);
    console.log(`- Items: ${itemCodes.length}`);
    console.log(`- PO: ${poNumbers.length}`);
    console.log(`- Output: ${outputPath}`);
    if (withSchedule && !dryRun) {
      console.log("Note: Schedules dibuat langsung di DB tanpa auto inbound card.");
    }
  } catch (error) {
    await client.query("rollback");
    console.error("Mock generator failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
