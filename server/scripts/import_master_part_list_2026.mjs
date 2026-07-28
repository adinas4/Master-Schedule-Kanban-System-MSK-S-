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
dotenv.config({ path: path.resolve(repoRoot, ".env") });

const SOURCE_FILE =
  process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) ||
  path.resolve(repoRoot, ".tmp/new-master-part-list-all-plant-2026.xlsx");
const INVENTORY_FILES = process.argv
  .filter((arg) => arg.startsWith("--inventory="))
  .map((arg) => arg.slice("--inventory=".length));
const DEFAULT_INVENTORY_FILE = path.resolve(repoRoot, ".tmp/form-inventory-rm-pipa-wire-stilbar.xlsx");
if (fs.existsSync(DEFAULT_INVENTORY_FILE) && INVENTORY_FILES.length === 0) {
  INVENTORY_FILES.push(DEFAULT_INVENTORY_FILE);
}
const COMMIT = process.argv.includes("--commit");
const REPORT_PATH =
  process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length) ||
  path.resolve(repoRoot, ".tmp/master-part-list-2026-import-report.json");

const SOURCE_REF = "NEW MASTER PART LIST ALL PLANT 2026.xlsx";
const BOM_VERSION = "AUTO-MASTER-PART-LIST-2026";
const PRL_SOURCE_TYPE = "master_part_list_2026";
const MASTER_SHEETS = ["MASTER PART LIST SINGLE FG", "MASTER PART LIST ASSY FG"];
const PRL_SHEET = "REKAP PRL ALL PART (DIPAKAI)";
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "user",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const upper = (value) => clean(value).toUpperCase();
const codeClean = (value) => clean(value).replace(/\s*-\s*/g, "-").toUpperCase();
const isBlankLike = (value) => {
  const text = upper(value);
  return !text || text === "-" || text === "N/A" || text === "NA" || text === "NULL";
};
const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).replace(/\./g, "").replace(",", ".").trim();
  if (!text || text === "-") return fallback;
  const direct = Number(String(value).replace(",", "."));
  if (Number.isFinite(direct)) return direct;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const compactNumber = (value) => {
  const num = toNumber(value, null);
  if (num === null) return "";
  return String(num).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};
const normalizeText = (value) =>
  upper(value)
    .replace(/Ø/g, "D")
    .replace(/0D/g, "OD")
    .replace(/SWM\s*-?\s*B/g, "SWMB")
    .replace(/[^A-Z0-9.]+/g, " ")
    .replace(/\b0+(\d)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
const normalizeKey = (value) => normalizeText(value).replace(/[^A-Z0-9]+/g, "");
const normalizeToken = (value) => {
  const text = normalizeText(value);
  const tokens = new Set();
  for (const token of text.split(" ").filter(Boolean)) {
    tokens.add(token);
    const numeric = token.match(/^\d+(?:\.\d+)?$/);
    if (numeric) tokens.add(token.replace(".", ""));
  }
  return tokens;
};
const validCode = (value) => {
  const text = codeClean(value);
  return Boolean(text && text.length <= 40 && /[A-Z0-9]/.test(text));
};
const isParentType = (type) => {
  const text = upper(type);
  return text.includes("FINISH") || text === "FG" || text.includes("ASSY");
};
const isChildIndex = (index) => upper(index).includes("CHILD");
const isMaterialLike = (material) => {
  const text = upper(material);
  return ["COIL", "SHEET", "WIRE", "PIPA", "PIPE", "STEEL BAR", "BAR"].includes(text);
};
const isIndirectLike = (material) => upper(material).includes("INDIRECT");
const isAssemblyLike = (material) => {
  const text = upper(material);
  return text === "ASSY" || text === "SUB-ASSY" || text === "SUB ASSY";
};
const materialTypeFor = (material) => (isIndirectLike(material) ? "INDIRECT" : "RM");

const processListFromRow = (row, columns) => {
  const result = [];
  for (const column of columns.processColumns) {
    const value = clean(row[column.index]);
    if (!value || value === "-") continue;
    result.push({ step: column.label, process: value });
  }
  return result;
};

const makeMaterialName = (row, columns) => {
  const material = upper(row[columns.material]);
  const spec = clean(row[columns.specMaterial]);
  const d = clean(row[columns.diameter]);
  const t = clean(row[columns.thickness]);
  const l = clean(row[columns.length]);
  const p = clean(row[columns.pitch]);
  if (isIndirectLike(material)) return clean(row[columns.name]) || clean(row[columns.partNo]);
  if (material === "WIRE") return clean(["Wire", spec, d && !isBlankLike(d) ? `D ${d}` : ""].filter(Boolean).join(" "));
  if (material === "PIPA" || material === "PIPE") {
    return clean([spec, d, t, l || p].filter((value) => !isBlankLike(value)).join(" x "));
  }
  if (material === "STEEL BAR" || material === "BAR") {
    return clean(["Steel Bar", spec, d, l || p].filter((value) => !isBlankLike(value)).join(" x "));
  }
  if (material === "COIL" || material === "SHEET") {
    const dims = [];
    if (!isBlankLike(t)) dims.push(`T=${t}`);
    if (!isBlankLike(l)) dims.push(`W=${l}`);
    if (!isBlankLike(p)) dims.push(`P=${p}`);
    return clean([material, spec, dims.join(",")].filter(Boolean).join(" "));
  }
  return clean([material, spec, d, t, l, p].filter((value) => !isBlankLike(value)).join(" "));
};

const makeMaterialMatchTokens = (row, columns) => {
  const material = upper(row[columns.material]);
  const spec = clean(row[columns.specMaterial]);
  const d = clean(row[columns.diameter]);
  const t = clean(row[columns.thickness]);
  const l = clean(row[columns.length]);
  const p = clean(row[columns.pitch]);
  const tokens = [spec];
  if (material === "WIRE") {
    if (!isBlankLike(d)) tokens.push(d);
  } else if (material === "PIPA" || material === "PIPE") {
    for (const value of [d, t, l, p]) if (!isBlankLike(value)) tokens.push(value);
  } else if (material === "COIL" || material === "SHEET") {
    for (const value of [spec, t, l, p]) if (!isBlankLike(value)) tokens.push(value);
  } else {
    for (const value of [d, t, l, p]) if (!isBlankLike(value)) tokens.push(value);
  }
  return [...new Set(tokens.map((token) => [...normalizeToken(token)]).flat().filter(Boolean))];
};

const getHeaderColumns = (headerRow) => {
  const normalized = headerRow.map((cell) => upper(cell).replace(/\s+/g, " "));
  const find = (...names) => {
    const wanted = names.map((name) => upper(name).replace(/\s+/g, " "));
    return normalized.findIndex((cell) => wanted.includes(cell));
  };
  const processColumns = normalized
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => /^PROSES \d+/.test(label));
  return {
    no: find("NO"),
    code: find("NO UNIQ"),
    partNo: find("PART NO"),
    name: find("PART NAME"),
    customer: find("CUSTOMER"),
    startPlant: find("AWAL PROSES (PLANT)"),
    endPlant: find("AKHIR PROSES (PLANT)"),
    warehousePlant: find("WAREHOUSE (PLANT)"),
    index: find("INDEX"),
    supplierMaterial: find("SUPPLIER MATERIAL"),
    model: find("MODEL"),
    useQty: find("USE / SUB ASSY / ASSY (PCS)", "USE / ASSY (PCS)"),
    weight: find("BERAT/PCS (KG)"),
    weightPack: find("BERAT/PACK (KG)"),
    typePacking: find("TYPE PACKING"),
    boxWeight: find("BERAT BOX (KG)"),
    packQty: find("QTY/PACK KBN (PCS)"),
    ct: find("CT", "BOTTLE NECK CT (DETIK)"),
    lineStart: find("LINE AWAL"),
    lineEnd: find("LINE AKHIR"),
    destination: find("DESTINASI DELIVERY CUSTOMER"),
    uniqMaterial: find("UNIQ MATERIAL"),
    material: find("MATERIAL"),
    specMaterial: find("SPEC MATERIAL"),
    diameter: normalized.findIndex((cell) => cell.replace(/[^A-Z]/g, "") === "D"),
    thickness: find("T"),
    length: find("L"),
    pitch: find("P / FL"),
    processColumns,
  };
};

const addMap = (map, key, value) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, value);
};

const mergeItem = (items, item) => {
  const existing = items.get(item.code);
  if (!existing) {
    items.set(item.code, item);
    return;
  }
  for (const [key, value] of Object.entries(item)) {
    if (key === "sourceRows") {
      existing.sourceRows = [...new Set([...(existing.sourceRows || []), ...(value || [])])];
    } else if ((existing[key] === null || existing[key] === undefined || existing[key] === "" || existing[key] === 0) && value) {
      existing[key] = value;
    } else if (["name", "partNo", "type", "model", "weight", "typePack", "packQty", "lineProduction", "locationName", "supplierName", "vendorId", "processFlow"].includes(key) && value) {
      existing[key] = value;
    }
  }
};

const parseMasterSheets = (workbook) => {
  const items = new Map();
  const bomLinks = new Map();
  const materialNeeds = [];
  const exceptions = [];
  const itemSignatures = new Map();
  const stats = {};

  for (const sheetName of MASTER_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      exceptions.push({ sheetName, issue: "sheet_missing" });
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false, raw: false });
    const columns = getHeaderColumns(rows[2] || []);
    let currentFg = null;
    stats[sheetName] = { rows: 0, items: 0, bomLinks: 0, materialNeeds: 0 };

    for (let rowIndex = 3; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 1;
      const code = codeClean(row[columns.code]);
      if (!validCode(code)) continue;
      const indexValue = upper(row[columns.index]);
      const material = upper(row[columns.material]);
      const partNo = clean(row[columns.partNo]) || code;
      const name = clean(row[columns.name]) || partNo || code;
      const supplierName = clean(row[columns.supplierMaterial]);
      const itemType = isIndirectLike(material)
        ? "INDIRECT"
        : isParentType(indexValue)
          ? "FG"
          : isChildIndex(indexValue)
            ? "CP"
            : "FG";
      const signature = normalizeKey([partNo, name, itemType, clean(row[columns.model])].join("|"));
      const existingSignature = itemSignatures.get(code);
      if (existingSignature && existingSignature.signature !== signature) {
        exceptions.push({
          sheetName,
          rowNumber,
          code,
          issue: "duplicate_item_code_conflict",
          kept: existingSignature.detail,
          skipped: {
            partNo,
            name,
            type: itemType,
            model: clean(row[columns.model]),
            material,
          },
        });
        continue;
      }
      if (!existingSignature) {
        itemSignatures.set(code, {
          signature,
          detail: {
            sourceRow: `${sheetName}:${rowNumber}`,
            partNo,
            name,
            type: itemType,
            model: clean(row[columns.model]),
            material,
          },
        });
      }
      const processFlow = processListFromRow(row, columns);
      const item = {
        code,
        name,
        partNo,
        type: itemType,
        unit: "PCS",
        model: clean(row[columns.model]),
        weight: toNumber(row[columns.weight], null),
        typePack: clean(row[columns.typePacking]),
        packQty: toNumber(row[columns.packQty], 0) || 0,
        vendorId: supplierName ? upper(supplierName) : "",
        supplierName,
        locationName: clean(row[columns.warehousePlant]),
        lineProduction: clean(row[columns.lineEnd]) || clean(row[columns.lineStart]),
        cycleTimeSeconds: toNumber(row[columns.ct], 0) || 0,
        processFlow,
        sourceRows: [`${sheetName}:${rowNumber}`],
      };
      mergeItem(items, item);
      stats[sheetName].rows += 1;
      stats[sheetName].items += 1;

      if (itemType === "FG") currentFg = code;

      if (sheetName === "MASTER PART LIST ASSY FG" && itemType !== "FG" && currentFg) {
        addMap(bomLinks, `${currentFg}->${code}`, {
          parentCode: currentFg,
          childCode: code,
          quantity: toNumber(row[columns.useQty], 1) || 1,
          componentType: itemType === "INDIRECT" ? "INDIRECT MATERIAL" : "CP",
          componentDescription: name,
          modelSpec: clean(row[columns.model]),
          lineProduction: item.lineProduction,
          supplierName,
          packing: item.typePack,
          cycleTimeSeconds: item.cycleTimeSeconds,
          processFlow,
          locationName: item.locationName,
          sourceRow: `${sheetName}:${rowNumber}`,
        });
        stats[sheetName].bomLinks += 1;
      }

      if (isMaterialLike(material)) {
        materialNeeds.push({
          parentCode: sheetName === "MASTER PART LIST SINGLE FG" ? code : code,
          rowCode: code,
          sourceFg: currentFg,
          materialCode: codeClean(row[columns.uniqMaterial]),
          materialType: materialTypeFor(material),
          materialName: makeMaterialName(row, columns),
          materialPartNo: clean(row[columns.specMaterial]) || makeMaterialName(row, columns),
          quantity: itemType === "FG" ? 1 : 1,
          supplierName,
          vendorId: supplierName ? upper(supplierName) : "",
          locationName: item.locationName,
          lineProduction: item.lineProduction,
          model: item.model,
          tokens: makeMaterialMatchTokens(row, columns),
          material,
          spec: clean(row[columns.specMaterial]),
          dims: {
            d: clean(row[columns.diameter]),
            t: clean(row[columns.thickness]),
            l: clean(row[columns.length]),
            p: clean(row[columns.pitch]),
          },
          sourceRow: `${sheetName}:${rowNumber}`,
        });
        stats[sheetName].materialNeeds += 1;
      } else if (material && !isBlankLike(material) && !isIndirectLike(material) && !isAssemblyLike(material)) {
        exceptions.push({ sheetName, rowNumber, code, material, issue: "unknown_material_category" });
      }
    }
  }

  return {
    items: [...items.values()],
    bomLinks: [...bomLinks.values()],
    materialNeeds,
    exceptions,
    stats,
  };
};

const parsePrlRecords = (workbook) => {
  const sheet = workbook.Sheets[PRL_SHEET];
  if (!sheet) return { records: [], exceptions: [{ sheetName: PRL_SHEET, issue: "sheet_missing" }] };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false, raw: false });
  const header = (rows[1] || []).map(clean);
  const normalized = header.map(upper);
  const find = (name) => normalized.findIndex((cell) => cell === upper(name));
  const columns = {
    code: find("NO UNIQ"),
    partNo: find("PART NO"),
    name: find("PART NAME"),
    index: find("INDEX"),
  };
  const monthColumns = [];
  for (const [index, label] of header.entries()) {
    const match = clean(label).match(/^([A-Za-z]{3})-(\d{2})$/);
    if (!match) continue;
    const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[1].toLowerCase());
    if (monthIndex < 0) continue;
    monthColumns.push({ index, key: MONTH_KEYS[monthIndex], year: 2000 + Number(match[2]) });
  }
  const byCodeYear = new Map();
  const exceptions = [];
  for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const code = codeClean(row[columns.code]);
    if (!validCode(code)) continue;
    for (const monthColumn of monthColumns) {
      const qty = toNumber(row[monthColumn.index], 0) || 0;
      const key = `${code}:${monthColumn.year}`;
      const record = byCodeYear.get(key) || {
        itemCode: code,
        year: monthColumn.year,
        partNo: clean(row[columns.partNo]) || code,
        description: clean(row[columns.name]) || code,
        index: clean(row[columns.index]),
        months: Object.fromEntries(MONTH_KEYS.map((month) => [month, 0])),
        sourceRows: [],
      };
      record.months[monthColumn.key] = qty;
      record.sourceRows.push(`${PRL_SHEET}:${rowIndex + 1}`);
      byCodeYear.set(key, record);
    }
  }
  return { records: [...byCodeYear.values()], exceptions };
};

const queryArray = async (client, sql, params = []) => (await client.query(sql, params)).rows;

const rowHeaderIndex = (rows, requiredHeaders) => rows.findIndex((row) => {
  const values = row.map(upper);
  return requiredHeaders.every((header) => values.includes(upper(header)));
});

const loadInventoryMaterialItems = (filePaths) => {
  const items = new Map();
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    const workbook = XLSX.readFile(filePath, { cellDates: false, cellNF: false, cellStyles: false });
    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        blankrows: false,
        raw: false,
      });
      const headerIndex = rowHeaderIndex(rows, ["UNIQ", "GRADE / SIZE"]);
      if (headerIndex < 0) continue;
      const header = rows[headerIndex].map(upper);
      const find = (...names) => header.findIndex((cell) => names.map(upper).includes(cell));
      const col = {
        code: find("UNIQ"),
        sebango: find("SEBANGO", "PART NO"),
        name: find("GRADE / SIZE"),
        model: find("MODEL"),
        typePack: find("TYPE PACK", "PACKING"),
        unit: find("UOM"),
        status: find("STATUS"),
        kbn: find("KBN", "QTY/ KBN", "QTY / KBN"),
        location: find("LOKASI", "LOKASI", "Lokasi"),
      };
      for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const code = codeClean(row[col.code]);
        if (!validCode(code)) continue;
        const status = upper(row[col.status]);
        const item = {
          code,
          name: clean(row[col.name]) || code,
          partNo: clean(row[col.sebango]) || code,
          type: status.includes("INDIRECT") ? "INDIRECT" : "RM",
          unit: clean(row[col.unit]) || "PCS",
          model: clean(row[col.model]),
          vendorId: "",
          supplierName: "",
          locationName: clean(row[col.location]),
          lineProduction: "",
          packQty: toNumber(row[col.kbn], 0) || 0,
          typePack: clean(row[col.typePack]),
          weight: null,
          cycleTimeSeconds: 0,
          processFlow: [],
          sourceRows: [`${path.basename(filePath)}:${sheetName}:${rowIndex + 1}`],
        };
        mergeItem(items, item);
      }
    }
  }
  return [...items.values()];
};

const loadMaterialIndex = async (client) => {
  const rows = await queryArray(
    client,
    `
      select code, name, part_no, type, model, vendor_id, supplier_name, pack_qty, type_pack, line_production, location_name
      from items
      where upper(type) in ('RM', 'RAW MATERIAL', 'RAW', 'INDIRECT', 'INDIRECT MATERIAL', 'IRM')
    `,
  );
  return rows.map((row) => ({
    ...row,
    existsInDb: true,
    haystack: normalizeKey([row.code, row.name, row.part_no, row.model].filter(Boolean).join(" ")),
    tokenSet: normalizeToken([row.code, row.name, row.part_no, row.model].filter(Boolean).join(" ")),
    typeKey: upper(row.type).includes("INDIRECT") || upper(row.type) === "IRM" ? "INDIRECT" : "RM",
  }));
};

const materialIndexFromInventory = (items) => items.map((item) => ({
  code: item.code,
  name: item.name,
  part_no: item.partNo,
  type: item.type,
  model: item.model,
  vendor_id: item.vendorId,
  supplier_name: item.supplierName,
  pack_qty: item.packQty,
  type_pack: item.typePack,
  line_production: item.lineProduction,
  location_name: item.locationName,
  existsInDb: false,
  sourceItem: item,
  haystack: normalizeKey([item.code, item.name, item.partNo, item.model].filter(Boolean).join(" ")),
  tokenSet: normalizeToken([item.code, item.name, item.partNo, item.model].filter(Boolean).join(" ")),
  typeKey: upper(item.type).includes("INDIRECT") ? "INDIRECT" : "RM",
}));

const resolveMaterialNeeds = (materialNeeds, materialIndex) => {
  const resolved = [];
  const exceptions = [];
  const rawItems = new Map();
  for (const need of materialNeeds) {
    let childCode = validCode(need.materialCode) ? need.materialCode : "";
    let match = null;
    let matchStatus = childCode ? "explicit_uniq_material" : "";
    if (!childCode) {
      let candidates = materialIndex.filter((item) => {
        if (item.typeKey !== need.materialType) return false;
        return need.tokens.length > 0 && need.tokens.every((token) => item.tokenSet.has(token));
      });
      const supplierKey = upper(need.vendorId || need.supplierName);
      if (supplierKey && candidates.length > 1) {
        const bySupplier = candidates.filter((item) => upper(item.vendor_id || item.supplier_name) === supplierKey);
        if (bySupplier.length > 0) candidates = bySupplier;
      }
      const modelKey = normalizeKey(need.model);
      if (modelKey && candidates.length > 1) {
        const byModel = candidates.filter((item) => {
          const itemModel = normalizeKey(item.model);
          return itemModel && (itemModel.includes(modelKey) || modelKey.includes(itemModel));
        });
        if (byModel.length > 0) candidates = byModel;
      }
      if (candidates.length > 1) {
        const exactName = candidates.filter((item) => normalizeKey(item.name) === normalizeKey(need.materialName));
        if (exactName.length > 0) candidates = exactName;
      }
      if (candidates.length === 1) {
        match = candidates[0];
        childCode = match.code;
        matchStatus = "matched_existing_material";
      } else {
        exceptions.push({
          issue: candidates.length > 1 ? "ambiguous_material_match" : "missing_material_code",
          sourceRow: need.sourceRow,
          rowCode: need.rowCode,
          material: need.material,
          spec: need.spec,
          dims: need.dims,
          tokens: need.tokens,
          candidates: candidates.slice(0, 10).map((candidate) => ({
            code: candidate.code,
            name: candidate.name,
            partNo: candidate.part_no,
            type: candidate.type,
          })),
        });
        continue;
      }
    }
    if (childCode === need.parentCode) {
      exceptions.push({ issue: "material_same_as_parent", sourceRow: need.sourceRow, parentCode: need.parentCode, childCode });
      continue;
    }
    if (!match) match = materialIndex.find((item) => item.code === childCode) || null;
    if (match && !match.existsInDb && match.sourceItem) {
      rawItems.set(childCode, {
        ...match.sourceItem,
        vendorId: match.sourceItem.vendorId || need.vendorId,
        supplierName: match.sourceItem.supplierName || need.supplierName,
        sourceRows: [...(match.sourceItem.sourceRows || []), need.sourceRow],
      });
    } else if (!match) {
      rawItems.set(childCode, {
        code: childCode,
        name: need.materialName || childCode,
        partNo: need.materialPartNo || childCode,
        type: need.materialType,
        unit: "PCS",
        model: need.model,
        vendorId: need.vendorId,
        supplierName: need.supplierName,
        locationName: need.locationName,
        lineProduction: need.lineProduction,
        packQty: 0,
        typePack: "",
        weight: null,
        cycleTimeSeconds: 0,
        processFlow: [],
        sourceRows: [need.sourceRow],
      });
    }
    resolved.push({
      parentCode: need.parentCode,
      childCode,
      quantity: need.quantity || 1,
      componentType: need.materialType === "INDIRECT" ? "INDIRECT MATERIAL" : "RAW MATERIAL",
      componentDescription: match?.name || need.materialName || childCode,
      modelSpec: need.spec,
      lineProduction: need.lineProduction,
      supplierName: match?.supplier_name || need.supplierName,
      packing: match?.type_pack || "",
      cycleTimeSeconds: 0,
      processFlow: [],
      locationName: match?.location_name || need.locationName,
      sourceRow: need.sourceRow,
      matchStatus,
    });
  }
  return { resolved, rawItems: [...rawItems.values()], exceptions };
};

const upsertItem = async (client, item) => {
  const result = await client.query(
    `
      insert into items (
        code, name, type, unit, model, weight, vendor_id, location_id,
        type_pack, part_no, pack_qty, supplier_name, location_name, packing_name,
        line_production, cycle_time_seconds, process_flow, process_routing, order_lot_size
      )
      values (
        $1, $2, $3, $4, nullif($5, ''), $6, nullif($7, ''), null,
        nullif($8, ''), nullif($9, ''), $10, nullif($11, ''), nullif($12, ''), nullif($8, ''),
        nullif($13, ''), $14, $15::jsonb, $15::jsonb, $10
      )
      on conflict (code) do update set
        name = excluded.name,
        type = excluded.type,
        unit = excluded.unit,
        model = coalesce(excluded.model, items.model),
        weight = coalesce(excluded.weight, items.weight),
        vendor_id = coalesce(excluded.vendor_id, items.vendor_id),
        type_pack = coalesce(excluded.type_pack, items.type_pack),
        part_no = coalesce(excluded.part_no, items.part_no),
        pack_qty = case when excluded.pack_qty > 0 then excluded.pack_qty else items.pack_qty end,
        supplier_name = coalesce(excluded.supplier_name, items.supplier_name),
        location_name = coalesce(excluded.location_name, items.location_name),
        packing_name = coalesce(excluded.packing_name, items.packing_name),
        line_production = coalesce(excluded.line_production, items.line_production),
        cycle_time_seconds = case when excluded.cycle_time_seconds > 0 then excluded.cycle_time_seconds else items.cycle_time_seconds end,
        process_flow = case when jsonb_array_length(excluded.process_flow) > 0 then excluded.process_flow else items.process_flow end,
        process_routing = case when jsonb_array_length(excluded.process_routing) > 0 then excluded.process_routing else items.process_routing end,
        order_lot_size = case when excluded.order_lot_size > 0 then excluded.order_lot_size else items.order_lot_size end
      returning (xmax = 0) as inserted
    `,
    [
      item.code,
      item.name || item.code,
      item.type || "FG",
      item.unit || "PCS",
      item.model || "",
      item.weight,
      item.vendorId || "",
      item.typePack || "",
      item.partNo || item.code,
      Number(item.packQty || 0),
      item.supplierName || "",
      item.locationName || "",
      item.lineProduction || "",
      Number(item.cycleTimeSeconds || 0),
      JSON.stringify(item.processFlow || []),
    ],
  );
  return result.rows[0]?.inserted ? "inserted" : "updated";
};

const ensureVendor = async (client, vendorId, vendorName) => {
  if (!vendorId) return false;
  const result = await client.query(
    `
      insert into master_vendors (id, name, type, role)
      values ($1, $2, 'Supplier', 'Delivery Note')
      on conflict (id) do update set
        name = coalesce(nullif(master_vendors.name, ''), excluded.name),
        type = coalesce(nullif(master_vendors.type, ''), excluded.type)
      returning (xmax = 0) as inserted
    `,
    [vendorId, vendorName || vendorId],
  );
  return Boolean(result.rows[0]?.inserted);
};

const ensureItemSupplier = async (client, itemCode, vendorId) => {
  if (!itemCode || !vendorId) return false;
  const result = await client.query(
    `
      insert into item_suppliers (item_code, vendor_id, share_percent)
      values ($1, $2, 100)
      on conflict (item_code, vendor_id) do update set share_percent = excluded.share_percent
      returning (xmax = 0) as inserted
    `,
    [itemCode, vendorId],
  );
  return Boolean(result.rows[0]?.inserted);
};

const ensureBomHeader = async (client, parentCode) => {
  const existing = await client.query(
    "select id from master_bom_headers where parent_code = $1 and bom_version = $2 limit 1",
    [parentCode, BOM_VERSION],
  );
  if (existing.rows[0]) return { id: existing.rows[0].id, inserted: false };
  const revision = await client.query(
    "select coalesce(max(revision_no), 0)::int + 1 as revision_no from master_bom_headers where parent_code = $1",
    [parentCode],
  );
  const inserted = await client.query(
    `
      insert into master_bom_headers (parent_code, bom_version, revision_no, reference, effective_start_date)
      values ($1, $2, $3, $4, current_date)
      returning id
    `,
    [parentCode, BOM_VERSION, revision.rows[0].revision_no, `Imported from ${SOURCE_REF}`],
  );
  return { id: inserted.rows[0].id, inserted: true };
};

const upsertBomLink = async (client, headerId, link) => {
  const result = await client.query(
    `
      insert into master_bom (
        header_id, parent_code, child_code, quantity, scrap_factor, component_type,
        component_description, model_spec, line_production, supplier_name, packing,
        cycle_time_seconds, process_flow, process_routing, location_name, consumption_basis
      )
      values ($1, $2, $3, $4, 0, $5, $6, nullif($7, ''), nullif($8, ''), nullif($9, ''),
        nullif($10, ''), $11, $12::jsonb, $12::jsonb, nullif($13, ''), 'per_parent')
      on conflict (header_id, parent_code, child_code) do update set
        quantity = excluded.quantity,
        component_type = excluded.component_type,
        component_description = excluded.component_description,
        model_spec = excluded.model_spec,
        line_production = excluded.line_production,
        supplier_name = excluded.supplier_name,
        packing = excluded.packing,
        cycle_time_seconds = excluded.cycle_time_seconds,
        process_flow = excluded.process_flow,
        process_routing = excluded.process_routing,
        location_name = excluded.location_name,
        consumption_basis = excluded.consumption_basis
      returning (xmax = 0) as inserted
    `,
    [
      headerId,
      link.parentCode,
      link.childCode,
      Number(link.quantity || 1),
      link.componentType,
      link.componentDescription || link.childCode,
      link.modelSpec || "",
      link.lineProduction || "",
      link.supplierName || "",
      link.packing || "",
      Number(link.cycleTimeSeconds || 0),
      JSON.stringify(link.processFlow || []),
      link.locationName || "",
    ],
  );
  return result.rows[0]?.inserted ? "inserted" : "updated";
};

const upsertKanban = async (client, item) => {
  const lotQty = Number(item.packQty || 0);
  if (!lotQty || lotQty <= 0) return "skipped_no_pack_qty";
  const maxQty = lotQty * 4;
  const result = await client.query(
    `
      insert into kanban_settings (
        item_code, min_qty, max_qty, lot_qty, lead_time_days, default_supplier,
        active, drop_zone, safety_factor, regular_kanban, safety_hours, work_hours,
        cycle_x, cycle_y, cycle_z, updated_at
      )
      values ($1, 0, $2, $3, 0, nullif($4, ''), true, nullif($5, ''), 0, 2, 48, 24, 1, 4, 4, now())
      on conflict (item_code) do update set
        lot_qty = case when excluded.lot_qty > 0 then excluded.lot_qty else kanban_settings.lot_qty end,
        max_qty = case when excluded.max_qty > 0 then excluded.max_qty else kanban_settings.max_qty end,
        default_supplier = coalesce(excluded.default_supplier, kanban_settings.default_supplier),
        drop_zone = coalesce(excluded.drop_zone, kanban_settings.drop_zone),
        updated_at = now()
      returning (xmax = 0) as inserted
    `,
    [item.code, maxQty, lotQty, item.vendorId || item.supplierName || "", item.locationName || item.lineProduction || ""],
  );
  return result.rows[0]?.inserted ? "inserted" : "updated";
};

const upsertPrl = async (client, record, item) => {
  const packQty = Number(item?.pack_qty || item?.packQty || 0);
  const existing = await client.query("select status from prl_records where item_code = $1 and year = $2", [record.itemCode, record.year]);
  const status = existing.rows[0]?.status && typeof existing.rows[0].status === "object" ? existing.rows[0].status : {};
  for (const key of MONTH_KEYS) {
    if (Number(record.months[key] || 0) > 0 && status[key] !== "active") status[key] = "manual";
  }
  const result = await client.query(
    `
      insert into prl_records (
        item_code, year, part_no, description, model, qty_per_kanban, uom, type_pack,
        volume, months, status, source_type, source_ref, suggested_qty, due_date, priority_score, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, null, $9::jsonb, $10::jsonb, $11, $12, 0, null, 0, now())
      on conflict (item_code, year) do update set
        part_no = excluded.part_no,
        description = excluded.description,
        model = excluded.model,
        qty_per_kanban = excluded.qty_per_kanban,
        uom = excluded.uom,
        type_pack = excluded.type_pack,
        months = excluded.months,
        status = excluded.status,
        source_type = excluded.source_type,
        source_ref = excluded.source_ref,
        updated_at = now()
      returning (xmax = 0) as inserted
    `,
    [
      record.itemCode,
      record.year,
      record.partNo || record.itemCode,
      record.description || record.itemCode,
      item?.model || "",
      packQty || null,
      item?.unit || "PCS",
      item?.type_pack || item?.typePack || "",
      JSON.stringify(record.months),
      JSON.stringify(status),
      PRL_SOURCE_TYPE,
      SOURCE_REF,
    ],
  );
  return result.rows[0]?.inserted ? "inserted" : "updated";
};

const main = async () => {
  if (!fs.existsSync(SOURCE_FILE)) throw new Error(`File not found: ${SOURCE_FILE}`);
  const workbook = XLSX.readFile(SOURCE_FILE, { cellDates: false, cellNF: false, cellStyles: false });
  const parsed = parseMasterSheets(workbook);
  const prl = parsePrlRecords(workbook);
  const inventoryItems = loadInventoryMaterialItems(INVENTORY_FILES);
  const client = await pool.connect();

  try {
    await client.query("begin");
    const materialIndex = [
      ...(await loadMaterialIndex(client)),
      ...materialIndexFromInventory(inventoryItems),
    ];
    const materialResolved = resolveMaterialNeeds(parsed.materialNeeds, materialIndex);
    const allItems = [...parsed.items, ...materialResolved.rawItems];
    const allBomLinks = [...parsed.bomLinks, ...materialResolved.resolved];
    const itemCodes = [...new Set(allItems.map((item) => item.code))];
    const parentCodes = [...new Set(allBomLinks.map((link) => link.parentCode))];
    const childCodes = [...new Set(allBomLinks.map((link) => link.childCode))];

    const counters = {
      vendorsInserted: 0,
      itemSupplierInserted: 0,
      itemsInserted: 0,
      itemsUpdated: 0,
      kanbanInserted: 0,
      kanbanUpdated: 0,
      kanbanSkipped: 0,
      bomHeadersInserted: 0,
      bomLinksDeleted: 0,
      bomLinksInserted: 0,
      bomLinksUpdated: 0,
      prlInserted: 0,
      prlUpdated: 0,
      prlSkippedMissingItem: 0,
    };

    for (const item of allItems) {
      if (item.vendorId) {
        if (await ensureVendor(client, item.vendorId, item.supplierName || item.vendorId)) counters.vendorsInserted += 1;
      }
      const itemResult = await upsertItem(client, item);
      if (itemResult === "inserted") counters.itemsInserted += 1;
      else counters.itemsUpdated += 1;
      if (item.vendorId) {
        if (await ensureItemSupplier(client, item.code, item.vendorId)) counters.itemSupplierInserted += 1;
      }
      const kanbanResult = await upsertKanban(client, item);
      if (kanbanResult === "inserted") counters.kanbanInserted += 1;
      else if (kanbanResult === "updated") counters.kanbanUpdated += 1;
      else counters.kanbanSkipped += 1;
    }

    for (const parentCode of parentCodes) {
      const header = await ensureBomHeader(client, parentCode);
      if (header.inserted) counters.bomHeadersInserted += 1;
      const desiredLinks = allBomLinks.filter((candidate) => candidate.parentCode === parentCode);
      const desiredChildren = [...new Set(desiredLinks.map((link) => link.childCode))];
      const deleted = await client.query(
        "delete from master_bom where header_id = $1 and parent_code = $2 and not (child_code = any($3::text[]))",
        [header.id, parentCode, desiredChildren],
      );
      counters.bomLinksDeleted += deleted.rowCount;
      for (const link of desiredLinks) {
        const result = await upsertBomLink(client, header.id, link);
        if (result === "inserted") counters.bomLinksInserted += 1;
        else counters.bomLinksUpdated += 1;
      }
    }

    const dbItemRows = await queryArray(
      client,
      "select code, type, unit, model, pack_qty, type_pack from items where code = any($1::text[])",
      [[...new Set([...itemCodes, ...prl.records.map((record) => record.itemCode)])]],
    );
    const dbItemsByCode = new Map(dbItemRows.map((row) => [row.code, row]));
    for (const record of prl.records) {
      const item = dbItemsByCode.get(record.itemCode);
      if (!item) {
        counters.prlSkippedMissingItem += 1;
        continue;
      }
      const itemType = upper(item.type);
      const isPrlCandidate = itemType.includes("FG") || itemType.includes("FINISH") || itemType.includes("SA") || parentCodes.includes(record.itemCode);
      if (!isPrlCandidate) continue;
      const result = await upsertPrl(client, record, item);
      if (result === "inserted") counters.prlInserted += 1;
      else counters.prlUpdated += 1;
    }

    const sampleBom = await queryArray(
      client,
      `
        select parent_code, child_code, component_type, quantity
        from master_bom
        where parent_code = any($1::text[])
        order by parent_code, child_code
        limit 30
      `,
      [parentCodes],
    );

    const report = {
      mode: COMMIT ? "commit" : "dry-run",
      sourceFile: SOURCE_FILE,
      sourceRef: SOURCE_REF,
      bomVersion: BOM_VERSION,
      parsedStats: parsed.stats,
      totals: {
        parsedItems: parsed.items.length,
        inventoryMaterialItems: inventoryItems.length,
        materialNeeds: parsed.materialNeeds.length,
        materialResolved: materialResolved.resolved.length,
        materialRawItemsToCreate: materialResolved.rawItems.length,
        bomLinks: allBomLinks.length,
        prlRecords: prl.records.length,
        uniqueParents: parentCodes.length,
        uniqueChildren: childCodes.length,
      },
      counters,
      exceptions: {
        master: parsed.exceptions,
        material: materialResolved.exceptions,
        prl: prl.exceptions,
      },
      samples: {
        unresolvedMaterial: materialResolved.exceptions.slice(0, 30),
        bom: sampleBom,
      },
    };

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    if (COMMIT) await client.query("commit");
    else await client.query("rollback");

    console.log(JSON.stringify({
      mode: report.mode,
      reportPath: REPORT_PATH,
      totals: report.totals,
      counters,
      exceptionCounts: {
        master: report.exceptions.master.length,
        material: report.exceptions.material.length,
        prl: report.exceptions.prl.length,
      },
    }, null, 2));
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
  process.exit(1);
});
