import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

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

const writeCsv = (filePath, headers, rows) => {
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((key) => escapeCsv(row[key])).join(","));
  });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
};

const main = async () => {
  const client = await pool.connect();
  try {
    const missingHeaders = await client.query(
      `
      select
        s.po_number,
        count(*)::int as schedule_count,
        count(distinct coalesce(s.item_code, s.item))::int as item_count,
        min(s.request_date)::text as min_request_date,
        max(s.request_date)::text as max_request_date,
        max(s.supplier) as supplier_hint
      from schedules s
      left join po_headers ph on ph.po_number = s.po_number
      where s.po_line_id is null
        and s.po_number is not null
        and trim(s.po_number) <> ''
        and ph.po_number is null
      group by s.po_number
      order by schedule_count desc, s.po_number asc
      `,
    );

    const missingLines = await client.query(
      `
      select
        s.po_number,
        coalesce(s.item_code, s.item) as item_code,
        sum(s.request_qty)::numeric as total_request_qty,
        sum(s.received_qty)::numeric as total_received_qty,
        count(*)::int as schedule_count,
        max(s.supplier) as supplier_hint,
        min(s.request_date)::text as first_request_date
      from schedules s
      left join po_headers ph on ph.po_number = s.po_number
      where s.po_line_id is null
        and s.po_number is not null
        and trim(s.po_number) <> ''
        and ph.po_number is null
      group by s.po_number, coalesce(s.item_code, s.item)
      order by s.po_number asc, item_code asc
      `,
    );

    const headersPath = path.join(__dirname, "missing_po_headers.csv");
    const linesPath = path.join(__dirname, "missing_po_lines_seed.csv");

    writeCsv(
      headersPath,
      ["po_number", "schedule_count", "item_count", "min_request_date", "max_request_date", "supplier_hint"],
      missingHeaders.rows,
    );

    writeCsv(
      linesPath,
      ["po_number", "item_code", "total_request_qty", "total_received_qty", "schedule_count", "supplier_hint", "first_request_date"],
      missingLines.rows,
    );

    console.log("Missing PO Report");
    console.log(`- Missing PO headers: ${missingHeaders.rows.length}`);
    console.log(`- Missing PO line seeds: ${missingLines.rows.length}`);
    console.log(`- Headers CSV: ${headersPath}`);
    console.log(`- Lines seed CSV: ${linesPath}`);
  } catch (error) {
    console.error("Report missing PO failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
