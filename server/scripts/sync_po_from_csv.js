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
const mode = (args.find((arg) => arg.startsWith("--mode=")) || "--mode=insert").split("=")[1] || "insert";
const updateHeader = argSet.has("--update-header");
const allowDecrease = argSet.has("--allow-decrease");

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const fileArg = resolveArgValue("--file");
if (!fileArg) {
  console.error("Wajib isi --file=path/to/po.csv");
  process.exit(1);
}

const csvPath = path.resolve(fileArg);
if (!fs.existsSync(csvPath)) {
  console.error(`File tidak ditemukan: ${csvPath}`);
  process.exit(1);
}

const errorsFileArg = resolveArgValue("--errors-file");
const defaultErrorsPath = path.join(__dirname, "sync_po_errors.csv");
const errorsFile = errorsFileArg ? path.resolve(errorsFileArg) : defaultErrorsPath;

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const normalizeText = (value) => String(value ?? "").trim();
const normalizePoNumber = (value) => normalizeText(value);
const normalizeItemCode = (value) => normalizeText(value);

const parseImportDate = (value) => {
  if (!value) return null;
  const parseExcelSerial = (input) => {
    const serial = Number(input);
    if (!Number.isFinite(serial) || serial <= 0) return null;
    const base = Date.UTC(1899, 11, 30);
    const date = new Date(base + Math.round(serial) * 86400 * 1000);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const serialDate = parseExcelSerial(value);
    if (serialDate) return serialDate;
  }
  const raw = String(value).trim();
  if (/^\d{1,6}$/.test(raw)) {
    const serialDate = parseExcelSerial(raw);
    if (serialDate) return serialDate;
  }
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const dd = match[1].padStart(2, "0");
    const mm = match[2].padStart(2, "0");
    const yyyy = match[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const toHeaderKey = (value) => String(value || "").trim().toLowerCase();

const main = async () => {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text).filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
  if (rows.length < 2) {
    console.error("CSV kosong.");
    process.exit(1);
  }

  const header = rows[0].map(toHeaderKey);
  const dataRows = rows.slice(1);

  const errors = [];
  const addError = (rowIndex, poNumber, itemCode, reason) => {
    errors.push({ row_number: rowIndex, po_number: poNumber || "", item_code: itemCode || "", reason });
  };

  const groups = new Map();
  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const record = {};
    header.forEach((key, colIdx) => {
      record[key] = row[colIdx];
    });

    const poNumber = normalizePoNumber(record.po_number || record.po || record.ponumber || record["no_po"] || record["no. po"]);
    const supplierRaw = normalizeText(record.supplier_id || record.supplier_code || record.supplier || record.vendor_id || record.vendor);
    const itemCode = normalizeItemCode(record.item_code || record.item || record.itemcode);
    const qtyOrder = Number(record.qty_order || record.qty || record.quantity || record.qtyorder || 0);
    const poDateRaw = record.po_date || record.date || record.po_date_raw || record.po_date_text || record.tanggal_po;
    const poDate = poDateRaw ? parseImportDate(poDateRaw) : null;
    const lineNoRaw = record.line_no || record.line || record.lineno;
    const lineNo = Number.isFinite(Number(lineNoRaw)) ? Number(lineNoRaw) : null;

    const missing = [];
    if (!poNumber) missing.push("po_number");
    if (!itemCode) missing.push("item_code");
    if (!Number.isFinite(qtyOrder) || qtyOrder <= 0) missing.push("qty_order");
    if (missing.length) {
      addError(rowNumber, poNumber, itemCode, `${missing.join(", ")} tidak valid`);
      return;
    }

    const entry = groups.get(poNumber) || {
      poNumber,
      poDate,
      supplierRaw,
      lines: [],
      rowNumbers: [],
    };
    if (!entry.poDate && poDate) {
      entry.poDate = poDate;
    }
    if (!entry.supplierRaw && supplierRaw) {
      entry.supplierRaw = supplierRaw;
    }
    if (entry.poDate && poDate && entry.poDate !== poDate) {
      entry.dateMismatch = true;
    }
    if (entry.supplierRaw && supplierRaw && entry.supplierRaw !== supplierRaw) {
      entry.supplierMismatch = true;
    }
    entry.lines.push({ rowNumber, itemCode, qtyOrder, lineNo });
    entry.rowNumbers.push(rowNumber);
    groups.set(poNumber, entry);
  });

  let insertedHeaders = 0;
  let insertedLines = 0;
  let updatedLines = 0;
  let skippedLines = 0;

  const client = await pool.connect();
  try {
    await client.query("begin");

    for (const group of groups.values()) {
      if (group.dateMismatch) {
        group.rowNumbers.forEach((rowNumber) => addError(rowNumber, group.poNumber, "", "Tanggal PO tidak konsisten."));
        continue;
      }
      if (group.supplierMismatch) {
        group.rowNumbers.forEach((rowNumber) => addError(rowNumber, group.poNumber, "", "Kode Supplier tidak konsisten."));
        continue;
      }

      const headerResult = await client.query("select * from po_headers where po_number = $1 for update", [group.poNumber]);
      const headerRow = headerResult.rows[0] || null;

      let supplierId = group.supplierRaw;
      if (supplierId) {
        const supplierResult = await client.query("select id from master_vendors where id = $1", [supplierId]);
        if (supplierResult.rows.length === 0) {
          const byName = await client.query(
            "select id from master_vendors where lower(name) = lower($1)",
            [supplierId],
          );
          if (byName.rows.length === 1) {
            supplierId = byName.rows[0].id;
          } else {
            group.rowNumbers.forEach((rowNumber) => addError(rowNumber, group.poNumber, "", `Supplier ${supplierId} tidak ditemukan.`));
            continue;
          }
        }
      }

      if (!headerRow) {
        if (!group.poDate || !supplierId) {
          group.rowNumbers.forEach((rowNumber) => addError(rowNumber, group.poNumber, "", "Header PO belum ada. po_date/supplier wajib diisi."));
          continue;
        }
        await client.query(
          `
          insert into po_headers (po_number, po_date, supplier_id, status, remarks, created_at, updated_at)
          values ($1, $2, $3, $4, $5, now(), now())
          `,
          [group.poNumber, group.poDate, supplierId, "open", null],
        );
        insertedHeaders += 1;
      } else if (updateHeader) {
        await client.query(
          `
          update po_headers
          set po_date = $2, supplier_id = $3, updated_at = now()
          where po_number = $1
          `,
          [group.poNumber, group.poDate, supplierId],
        );
      }

      const maxLineResult = await client.query(
        "select coalesce(max(line_no), 0) as max_line from po_lines where po_number = $1",
        [group.poNumber],
      );
      let nextLineNo = Number(maxLineResult.rows[0]?.max_line || 0) + 1;

      for (const line of group.lines) {
        const itemResult = await client.query(
          "select code from items where code = $1",
          [line.itemCode],
        );
        if (itemResult.rows.length === 0) {
          addError(line.rowNumber, group.poNumber, line.itemCode, "Item tidak ditemukan.");
          continue;
        }

        if (!Number.isFinite(line.qtyOrder) || line.qtyOrder <= 0) {
          addError(line.rowNumber, group.poNumber, line.itemCode, "Qty order tidak valid.");
          continue;
        }

        let existingLine = null;
        if (line.lineNo) {
          const existingResult = await client.query(
            "select * from po_lines where po_number = $1 and line_no = $2",
            [group.poNumber, line.lineNo],
          );
          existingLine = existingResult.rows[0] || null;
        } else {
          const existingResult = await client.query(
            "select * from po_lines where po_number = $1 and item_code = $2 order by line_no asc",
            [group.poNumber, line.itemCode],
          );
          if (existingResult.rows.length === 1) {
            existingLine = existingResult.rows[0];
          } else if (existingResult.rows.length > 1) {
            addError(line.rowNumber, group.poNumber, line.itemCode, "Item ganda di PO, butuh line_no.");
            continue;
          }
        }

        if (!existingLine) {
          const lineNo = line.lineNo || nextLineNo++;
          await client.query(
            `
            insert into po_lines (po_number, line_no, item_code, qty_order, qty_received)
            values ($1, $2, $3, $4, 0)
            `,
            [group.poNumber, lineNo, line.itemCode, line.qtyOrder],
          );
          insertedLines += 1;
          continue;
        }

        if (mode !== "upsert") {
          skippedLines += 1;
          continue;
        }

        const existingQty = Number(existingLine.qty_order || 0);
        const receivedQty = Number(existingLine.qty_received || 0);
        let nextQty = line.qtyOrder;
        if (!allowDecrease && nextQty < existingQty) {
          skippedLines += 1;
          continue;
        }
        if (nextQty < receivedQty) {
          addError(line.rowNumber, group.poNumber, line.itemCode, "Qty order < qty_received.");
          continue;
        }
        await client.query(
          "update po_lines set qty_order = $1 where id = $2",
          [nextQty, existingLine.id],
        );
        updatedLines += 1;
      }
    }

    await client.query(dryRun ? "rollback" : "commit");

    console.log("Sync PO Summary");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Mode: ${mode}`);
    console.log(`- Inserted headers: ${insertedHeaders}`);
    console.log(`- Inserted lines: ${insertedLines}`);
    console.log(`- Updated lines: ${updatedLines}`);
    console.log(`- Skipped lines: ${skippedLines}`);
    console.log(`- Errors: ${errors.length}`);

    if (errors.length > 0) {
      const headers = ["row_number", "po_number", "item_code", "reason"];
      const lines = [headers.join(",")];
      const escapeCsv = (value) => {
        const text = String(value ?? "");
        if (/[",\n\r]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };
      errors.forEach((row) => {
        lines.push(headers.map((key) => escapeCsv(row[key])).join(","));
      });
      fs.writeFileSync(errorsFile, lines.join("\n"), "utf8");
      console.log(`Errors CSV: ${errorsFile}`);
    }
  } catch (error) {
    await client.query("rollback");
    console.error("Sync PO failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
