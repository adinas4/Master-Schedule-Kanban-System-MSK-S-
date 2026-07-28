import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ATTACHMENT_PATH =
  process.argv.find((arg) => arg.startsWith("--attachment="))?.slice("--attachment=".length) ||
  "C:\\Users\\matra\\.codex\\attachments\\6ad43f5c-a4c7-4787-b991-dc060d9ff5a8\\pasted-text.txt";
const INVENTORY_PATH =
  process.argv.find((arg) => arg.startsWith("--inventory="))?.slice("--inventory=".length) ||
  path.resolve(repoRoot, ".tmp/form-inventory-juni.xlsx");
const COMMIT = process.argv.includes("--commit");

const BOM_VERSION = "AUTO-SEBANGO-20260725";
const DEFAULT_SUPPLIER_ID = "TBINA";
const DEFAULT_SUPPLIER_NAME = "TBINA";

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "user",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const codeClean = (value) => clean(value).replace(/\s*-\s*/g, "-").toUpperCase();
const upper = (value) => clean(value).toUpperCase();
const isBlank = (value) => clean(value) === "";

const materialLike = (value) => {
  const text = upper(value);
  if (!text) return false;
  return (
    /^SP(C|H|CC|C590|C440|H440|H590|H270|H90|H570)/.test(text) ||
    /^SHEET\b/.test(text) ||
    /^COIL\b/.test(text) ||
    /^STKM\b/.test(text) ||
    /^WIRE\b/.test(text) ||
    /^SPHCP\b/.test(text) ||
    text.includes("-OD") ||
    text.includes("-0D") ||
    text.includes(" C OD") ||
    text.includes("SPH 590") ||
    text.includes("SPH 440") ||
    text.includes("SPCC")
  );
};

const supplierLike = (value) => {
  const text = upper(value);
  return ["TTMI", "SCI", "SGP"].includes(text);
};

const validCode = (value) => {
  const text = codeClean(value);
  if (!text || text.length > 24) return false;
  if (!/[A-Z]/.test(text) || !/[0-9]/.test(text)) return false;
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return false;
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)?$/.test(text);
};

const validRawCode = (value) => {
  const text = codeClean(value);
  if (!text || text.length > 24) return false;
  if (text.includes("/") || text.includes(" ")) return false;
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return false;
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)?$/.test(text);
};

const extractCodes = (value) => {
  const text = upper(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[;,]/g, "/")
    .replace(/\s+\/\s+/g, "/")
    .replace(/\s+/g, " ");
  const result = [];
  let previousPrefix = "";
  for (const rawPart of text.split("/")) {
    const part = rawPart.trim();
    if (!part) continue;
    const matches = part.match(/[A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)?/g) || [];
    for (const match of matches) {
      let token = codeClean(match);
      if (/^\d{1,3}$/.test(token) && previousPrefix) {
        token = `${previousPrefix}${token.padStart(2, "0")}`;
      }
      if (!validCode(token)) continue;
      result.push(token);
      const prefixMatch = token.match(/^([A-Z]+)\d/);
      if (prefixMatch) previousPrefix = prefixMatch[1];
    }
  }
  return [...new Set(result)];
};

const removeCodes = (value, codes) => {
  let text = clean(value);
  for (const code of codes) {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\-/g, "\\s*-\\s*");
    text = text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return clean(text.replace(/[\/,]+/g, " "));
};

const readInventoryLookup = (filePath) => {
  if (!fs.existsSync(filePath)) return new Map();
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const lookup = new Map();
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
    });
    const headerIndex = rows.findIndex((row) =>
      row.some((cell) => upper(cell) === "UNIQ")
    );
    if (headerIndex < 0) continue;
    const header = rows[headerIndex].map((cell) => upper(cell));
    const indexOf = (...names) => header.findIndex((cell) => names.includes(cell));
    const uniqIdx = indexOf("UNIQ");
    const sebangoIdx = indexOf("SEBANGO", "PART NO");
    const gradeIdx = indexOf("GRADE / SIZE");
    const supplierIdx = indexOf("SUPPLIER", "ID SUPP");
    const locationIdx = indexOf("LOKASI");
    const packIdx = indexOf("QTY/ KBN", "KBN");
    const packingIdx = indexOf("PACKING", "TYPE PACK");
    const modelIdx = indexOf("MODEL");
    const uomIdx = indexOf("UOM");
    const statusIdx = indexOf("STATUS");
    for (const row of rows.slice(headerIndex + 1)) {
      const code = codeClean(row[uniqIdx]);
      if (!code || !validRawCode(code)) continue;
      const current = lookup.get(code) || {};
      const next = {
        code,
        partNo: clean(row[sebangoIdx]) || current.partNo || "",
        name: clean(row[gradeIdx]) || current.name || "",
        supplierId: clean(row[supplierIdx]) || current.supplierId || "",
        supplierName: clean(row[supplierIdx]) || current.supplierName || "",
        locationName: clean(row[locationIdx]) || current.locationName || "",
        packQty: Number(row[packIdx]) > 0 ? Number(row[packIdx]) : current.packQty,
        packingName: clean(row[packingIdx]) || current.packingName || "",
        model: clean(row[modelIdx]) || current.model || "",
        unit: clean(row[uomIdx]) || current.unit || "",
        status: clean(row[statusIdx]) || current.status || "",
        sourceSheet: current.sourceSheet ? `${current.sourceSheet},${sheetName}` : sheetName,
      };
      lookup.set(code, next);
    }
  }
  return lookup;
};

const parseAttachment = (filePath, inventoryLookup) => {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const rawItems = new Map();
  const links = new Map();
  const rowIssues = [];
  const duplicateConflicts = [];

  for (const [index, line] of lines.entries()) {
    if (index === 0 && upper(line).includes("NO UNIQE")) continue;
    const cells = line.split("\t");
    const rowNo = clean(cells[0]) || String(index + 1);
    const rawCode = codeClean(cells[1]);
    const sebango = clean(cells[2]);
    const spec = clean(cells[3]);
    const size = clean(cells.slice(4).join(" "));

    if (!rawCode || !validRawCode(rawCode)) {
      rowIssues.push({ rowNo, rawCode, issue: "raw_code_invalid_or_ambiguous", sebango, spec, size });
      continue;
    }

    const shifted = materialLike(sebango) || supplierLike(sebango);
    const parentSource = shifted ? spec : sebango;
    const parents = extractCodes(parentSource);
    const specWithoutParents = shifted ? removeCodes(spec, parents) : spec;
    const inventory = inventoryLookup.get(rawCode) || {};
    const partNo = clean(inventory.partNo) || (shifted ? sebango : specWithoutParents) || rawCode;
    const name =
      clean(inventory.name) ||
      (shifted ? clean([specWithoutParents, size].filter(Boolean).join(" ")) : size) ||
      partNo ||
      rawCode;
    const supplierId = clean(inventory.supplierId) || DEFAULT_SUPPLIER_ID;
    const supplierName = clean(inventory.supplierName) || DEFAULT_SUPPLIER_NAME;
    const unit = clean(inventory.unit) || "PCS";
    const packQty = Number(inventory.packQty) > 0 ? Number(inventory.packQty) : 0;

    const existing = rawItems.get(rawCode);
    const hasMeaningfulDetail = (candidate) =>
      clean(candidate.partNo) !== rawCode || clean(candidate.name) !== rawCode;
    let skipBomLinks = false;
    const item = {
      code: rawCode,
      name,
      partNo,
      type: "RM",
      unit,
      vendorId: supplierId,
      supplierName,
      locationName: clean(inventory.locationName),
      packingName: clean(inventory.packingName),
      model: clean(inventory.model),
      packQty,
      sourceRows: existing ? [...existing.sourceRows, rowNo] : [rowNo],
      sourceSheets: clean(inventory.sourceSheet),
    };

    if (existing) {
      const bothHaveMeaningfulDetail = hasMeaningfulDetail(existing) && hasMeaningfulDetail(item);
      const conflicting =
        bothHaveMeaningfulDetail &&
        (clean(existing.partNo) !== clean(item.partNo) ||
          clean(existing.name) !== clean(item.name));
      if (conflicting) {
        skipBomLinks = true;
        duplicateConflicts.push({
          code: rawCode,
          kept: { partNo: existing.partNo, name: existing.name, rows: existing.sourceRows },
          skipped: { partNo: item.partNo, name: item.name, rowNo },
        });
      } else {
        existing.sourceRows = item.sourceRows;
      }
    } else {
      rawItems.set(rawCode, item);
    }

    if (!parents.length && !isBlank(sebango)) {
      rowIssues.push({ rowNo, rawCode, issue: "no_parent_detected", sebango, spec, size });
    }

    if (skipBomLinks) continue;

    for (const parent of parents) {
      if (parent === rawCode) continue;
      links.set(`${parent}->${rawCode}`, {
        parentCode: parent,
        childCode: rawCode,
        componentType: "RM",
        componentDescription: name,
        supplierName,
        packing: item.packingName,
        sourceRow: rowNo,
      });
    }
  }

  return {
    rawItems: [...rawItems.values()],
    links: [...links.values()],
    rowIssues,
    duplicateConflicts,
  };
};

const queryArray = async (client, sql, params = []) => (await client.query(sql, params)).rows;

const main = async () => {
  const inventoryLookup = readInventoryLookup(INVENTORY_PATH);
  const parsed = parseAttachment(ATTACHMENT_PATH, inventoryLookup);
  const client = await pool.connect();
  try {
    await client.query("begin");

    const rawCodes = parsed.rawItems.map((item) => item.code);
    const parentCodes = [...new Set(parsed.links.map((link) => link.parentCode))];
    const existingItems = new Set(
      (await queryArray(client, "select code from items where code = any($1)", [
        [...new Set([...rawCodes, ...parentCodes])],
      ])).map((row) => row.code)
    );
    const existingRaw = rawCodes.filter((code) => existingItems.has(code));
    const newRaw = rawCodes.filter((code) => !existingItems.has(code));
    const missingParents = parentCodes.filter((code) => !existingItems.has(code));
    const parentPlaceholders = missingParents.map((code) => ({
      code,
      name: code,
      partNo: code,
      type: code.includes("-") ? "CP" : "FG",
      unit: "PCS",
    }));

    let rawUpserted = 0;
    let placeholdersInserted = 0;
    let headersInserted = 0;
    let bomInserted = 0;

    for (const item of parsed.rawItems) {
      const result = await client.query(
        `
          insert into items (
            code, name, part_no, type, unit, model, vendor_id, supplier_name,
            location_name, packing_name, pack_qty
          )
          values ($1, $2, $3, $4, $5, nullif($6, ''), $7, $8, nullif($9, ''), nullif($10, ''), $11)
          on conflict (code) do update set
            name = coalesce(nullif(items.name, ''), excluded.name),
            part_no = coalesce(nullif(items.part_no, ''), excluded.part_no),
            type = case
              when upper(coalesce(items.type, '')) in ('', 'RAW MATERIAL') then excluded.type
              else items.type
            end,
            unit = coalesce(nullif(items.unit, ''), excluded.unit),
            vendor_id = coalesce(nullif(items.vendor_id, ''), excluded.vendor_id),
            supplier_name = coalesce(nullif(items.supplier_name, ''), excluded.supplier_name),
            location_name = coalesce(nullif(items.location_name, ''), excluded.location_name),
            packing_name = coalesce(nullif(items.packing_name, ''), excluded.packing_name),
            pack_qty = case when coalesce(items.pack_qty, 0) = 0 then excluded.pack_qty else items.pack_qty end
          returning code
        `,
        [
          item.code,
          item.name,
          item.partNo,
          item.type,
          item.unit,
          item.model,
          item.vendorId,
          item.supplierName,
          item.locationName,
          item.packingName,
          item.packQty,
        ]
      );
      rawUpserted += result.rowCount;
    }

    for (const item of parentPlaceholders) {
      const result = await client.query(
        `
          insert into items (code, name, part_no, type, unit)
          values ($1, $2, $3, $4, $5)
          on conflict (code) do nothing
        `,
        [item.code, item.name, item.partNo, item.type, item.unit]
      );
      placeholdersInserted += result.rowCount;
    }

    for (const parentCode of parentCodes) {
      const existingImportHeader = (
        await client.query(
          "select id from master_bom_headers where parent_code = $1 and bom_version = $2 limit 1",
          [parentCode, BOM_VERSION]
        )
      ).rows[0];
      if (existingImportHeader) continue;
      const revision = (
        await client.query(
          "select coalesce(max(revision_no), 0)::int + 1 as revision_no from master_bom_headers where parent_code = $1",
          [parentCode]
        )
      ).rows[0].revision_no;
      const result = await client.query(
        `
          insert into master_bom_headers (
            parent_code, bom_version, revision_no, reference, effective_start_date
          )
          values ($1, $2, $3, $4, current_date)
          on conflict (parent_code, revision_no) do nothing
          returning id
        `,
        [parentCode, BOM_VERSION, revision, "Imported from pasted SEBANGO raw material list"]
      );
      headersInserted += result.rowCount;
    }

    for (const link of parsed.links) {
      const header = (
        await client.query(
          `
            select id
            from master_bom_headers
            where parent_code = $1 and bom_version = $2
            order by id desc
            limit 1
          `,
          [link.parentCode, BOM_VERSION]
        )
      ).rows[0];
      if (!header) continue;
      const result = await client.query(
        `
          insert into master_bom (
            header_id, parent_code, child_code, quantity, scrap_factor,
            component_type, component_description, supplier_name, packing
          )
          values ($1, $2, $3, 1, 0, $4, $5, $6, nullif($7, ''))
          on conflict (header_id, parent_code, child_code) do nothing
        `,
        [
          header.id,
          link.parentCode,
          link.childCode,
          link.componentType,
          link.componentDescription,
          link.supplierName,
          link.packing,
        ]
      );
      bomInserted += result.rowCount;
    }

    const tm008 = await queryArray(
      client,
      `
        select h.parent_code, b.child_code
        from master_bom b
        join master_bom_headers h on h.id = b.header_id
        where h.bom_version = $1 and b.child_code = 'TM008'
        order by h.parent_code
      `,
      [BOM_VERSION]
    );
    const hyphenParents = await queryArray(
      client,
      "select code, type, name from items where code = any($1) order by code limit 80",
      [[...new Set(parentCodes.filter((code) => code.includes("-")))]]
    );

    const summary = {
      mode: COMMIT ? "commit" : "dry-run",
      sourceRows: parsed.rawItems.reduce((count, item) => count + item.sourceRows.length, 0),
      inventoryMatches: parsed.rawItems.filter((item) => item.sourceSheets).length,
      uniqueRawItems: parsed.rawItems.length,
      existingRaw: existingRaw.length,
      newRaw: newRaw.length,
      uniqueParents: parentCodes.length,
      missingParentsCreatedAsPlaceholders: missingParents.length,
      bomLinks: parsed.links.length,
      rawUpserted,
      placeholdersInserted,
      headersInserted,
      bomInserted,
      tm008Parents: tm008.map((row) => row.parent_code),
      hyphenParentTypes: hyphenParents,
      duplicateConflicts: parsed.duplicateConflicts,
      rowIssues: parsed.rowIssues,
    };

    if (COMMIT) {
      await client.query("commit");
    } else {
      await client.query("rollback");
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
