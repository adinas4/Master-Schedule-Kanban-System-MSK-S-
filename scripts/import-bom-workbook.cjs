#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const XLSX = require('../node_modules/xlsx');
const { Client } = require('../server/node_modules/pg');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv(path.join(__dirname, '..', '.env'));
loadEnv(path.join(__dirname, '..', 'server', '.env'));

const args = Object.fromEntries(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
  const i = x.indexOf('='); return i < 0 ? [x.slice(2), true] : [x.slice(2, i), x.slice(i + 1)];
}));
const file = args.file || 'C:/Users/matra/Downloads/BOM 99,999% (1).xlsx';
const version = args.version || `XLSX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const clean = v => v == null ? '' : String(v).trim();
const parseBooleanFlag = value => value === true || ['1', 'true', 'yes', 'y'].includes(clean(value).toLowerCase());
const applyRequested = parseBooleanFlag(args.apply);
const apply = applyRequested && clean(args.confirm).toUpperCase() === 'APPLY_BOM';
const num = v => {
  const text = clean(v).replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};
const slug = (v, max = 34) => clean(v).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max) || 'UNKNOWN';
const json = v => JSON.stringify(v == null ? null : v);

const normalizeUom = value => clean(value).toUpperCase().replace(/[^A-Z]/g, '');
const isKilogramUom = value => ['KG', 'KGS', 'KILOGRAM', 'KILOGRAMS'].includes(normalizeUom(value));
const resolveMaterialCategory = row => (clean(row.kategori) || clean(row.type_material)).toLowerCase();
const normalizeMaterialForm = value => {
  const lookup = new Map([
    ['plate', 'Plate'],
    ['coil', 'Coil'],
    ['pipe', 'Pipe'],
    ['wire', 'Wire'],
  ]);
  return lookup.get(clean(value).toLowerCase()) || null;
};

function resolveMaterialSpecification(row, itemType) {
  if (!['RM', 'Indirect'].includes(itemType)) {
    return { materialGrade: null, grade: null, materialForm: null, widthMm: null, thicknessMm: null, lengthMm: null, diameterMm: null };
  }
  const materialForm = normalizeMaterialForm(row.form);
  const formKey = clean(materialForm).toLowerCase();
  return {
    materialGrade: clean(row.material_grade) || null,
    grade: clean(row.grade) || null,
    materialForm,
    widthMm: ['plate', 'coil'].includes(formKey) ? num(row.width_mm) : null,
    thicknessMm: ['plate', 'coil', 'pipe'].includes(formKey) ? num(row.thickness_mm) : null,
    lengthMm: ['pipe', 'wire'].includes(formKey) ? num(row.length_mm) : null,
    diameterMm: ['pipe', 'wire'].includes(formKey) ? num(row.diameter_mm) : null,
  };
}

function resolveRelationQuantity(row, { isChildPart = false } = {}) {
  const uom = clean(row.uom).toUpperCase() || 'PCS';
  // A child part is an assembly relation to its parent, so its usage always
  // comes from qty_per_uniq. Weight-based usage only applies to terminal
  // material rows below that parent/child part.
  const usesWeight = !isChildPart && isKilogramUom(uom);
  const sourceField = usesWeight ? 'weight_kg' : 'qty_per_uniq';
  const quantity = num(row[sourceField]);
  return {
    quantity,
    sourceField,
    basis: usesWeight ? 'WEIGHT_KG' : (isChildPart ? 'CHILD_QTY_PER_UNIT' : 'QTY_PER_UNIT'),
    uom,
  };
}

function resolveItemType(row, parentCodes = new Set()) {
  const code = clean(row.uniq_code).toUpperCase();
  const category = resolveMaterialCategory(row);
  if (clean(row.row_type).toUpperCase() === 'ROOT') return 'FG';
  if (parentCodes.has(code)) return 'WIP';
  if (category === 'indirect') return 'Indirect';
  return 'RM';
}

function processType(name) {
  const n = name.toUpperCase();
  if (/WELD|SPOT|ROBOT/.test(n)) return 'Welding';
  if (/BEND|STRAIGHT|SPRING/.test(n)) return 'Bending';
  if (/STAMP|BLANK|PRESS|PIERCH|NOTCH|RIVET|FORM/.test(n)) return 'Pressing';
  if (/CUT|SHEAR|SLIT|MILL|GRIND|CHAMFER|BROACH|DRIL|BOR|TURRET/.test(n)) return 'Machining';
  if (/ASSY|ASSEMB|INSERT|PACKING|FINISH/.test(n)) return 'Assembly';
  return 'BOM Import';
}

function parseWorkbook() {
  const wb = XLSX.readFile(file, { cellDates: false });
  const ws = wb.Sheets.Items;
  if (!ws) throw new Error('Sheet Items tidak ditemukan');
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const parentCodes = new Set(rows.map(r => clean(r.parent_uniq_code).toUpperCase()).filter(Boolean));
  const items = new Map();
  const operations = new Map();
  const relations = new Map();
  const processPairs = new Map();
  const machines = new Set();
  const lines = new Set();
  const roots = new Set();
  const sourceRows = new Map();
  const invalidRelations = [];
  const quantityBasisCounts = { WEIGHT_KG: 0, QTY_PER_UNIT: 0, CHILD_QTY_PER_UNIT: 0 };

  for (const [idx, row] of rows.entries()) {
    const code = clean(row.uniq_code).toUpperCase();
    if (!code) continue;
    const parent = clean(row.parent_uniq_code).toUpperCase();
    const category = resolveMaterialCategory(row);
    const type = resolveItemType(row, parentCodes);
    const item = items.get(code) || { code, name: '', partNo: '', model: '', unit: 'PCS', type, weight: null, status: 'Active', operations: [], materialGrade: null, grade: null, materialForm: null, widthMm: null, thicknessMm: null, lengthMm: null, diameterMm: null };
    if (!item.name && clean(row.part_name)) item.name = clean(row.part_name);
    if (!item.partNo && clean(row.part_number)) item.partNo = clean(row.part_number);
    if (!item.model && clean(row.model)) item.model = clean(row.model);
    if (item.weight == null && num(row.weight_kg) != null) item.weight = num(row.weight_kg);
    if (clean(row.uom)) item.unit = clean(row.uom).toUpperCase();
    item.type = item.type === 'FG' ? 'FG' : type;
    item.category = category;
    item.status = clean(row.status) || 'Active';
    const materialSpec = resolveMaterialSpecification(row, type);
    if (!item.materialGrade && materialSpec.materialGrade) item.materialGrade = materialSpec.materialGrade;
    if (!item.grade && materialSpec.grade) item.grade = materialSpec.grade;
    if (!item.materialForm && materialSpec.materialForm) item.materialForm = materialSpec.materialForm;
    if (item.widthMm == null && materialSpec.widthMm != null) item.widthMm = materialSpec.widthMm;
    if (item.thicknessMm == null && materialSpec.thicknessMm != null) item.thicknessMm = materialSpec.thicknessMm;
    if (item.lengthMm == null && materialSpec.lengthMm != null) item.lengthMm = materialSpec.lengthMm;
    if (item.diameterMm == null && materialSpec.diameterMm != null) item.diameterMm = materialSpec.diameterMm;
    items.set(code, item);
    sourceRows.set(code, (sourceRows.get(code) || 0) + 1);
    if (clean(row.row_type).toUpperCase() === 'ROOT') roots.add(code);

    const ops = [];
    for (let n = 1; n <= 9; n++) {
      const name = clean(row[`process_code_${n}`]);
      const machine = clean(row[`machine_number_${n}`]);
      const sequence = num(row[`op_seq_${n}`]) ?? n * 10;
      if (!name && !machine) continue;
      const machineKey = machine || 'UNASSIGNED';
      const lineKey = slug(name || 'UNASSIGNED');
      const op = { name: name || 'UNASSIGNED PROCESS', machine: machineKey, sequence, cycle: num(row[`cycle_time_sec_${n}`]), setup: num(row[`setup_time_min_${n}`]), tooling: clean(row[`tooling_ref_${n}`]) };
      ops.push(op); machines.add(machineKey); lines.add(lineKey);
      processPairs.set(`${name || 'UNASSIGNED PROCESS'}\u0000${machineKey}`, op);
    }
    if (ops.length) {
      if (!item.operations.length) item.operations = ops;
      operations.set(code, item.operations);
    }
    if (parent && parent !== code) {
      const key = `${parent}\u0000${code}`;
      const old = relations.get(key);
      const resolvedQuantity = resolveRelationQuantity(row, { isChildPart: parentCodes.has(code) });
      if (!Number.isFinite(resolvedQuantity.quantity) || resolvedQuantity.quantity <= 0) {
        invalidRelations.push({
          rowNumber: idx + 2,
          parent,
          child: code,
          uom: resolvedQuantity.uom,
          sourceField: resolvedQuantity.sourceField,
          sourceValue: row[resolvedQuantity.sourceField],
        });
        continue;
      }
      quantityBasisCounts[resolvedQuantity.basis] += 1;
      if (old) {
        old.quantity += resolvedQuantity.quantity;
        old.duplicates += 1;
      } else {
        relations.set(key, {
          parent,
          child: code,
          quantity: resolvedQuantity.quantity,
          quantityBasis: resolvedQuantity.basis,
          quantitySourceField: resolvedQuantity.sourceField,
          duplicates: 1,
          row,
          ops,
        });
      }
    }
  }
  if (invalidRelations.length > 0) {
    const sample = invalidRelations.slice(0, 10)
      .map(error => `row ${error.rowNumber}: ${error.parent} > ${error.child}, ${error.sourceField}=${String(error.sourceValue ?? '')}, UOM=${error.uom}`)
      .join('; ');
    throw new Error(`Ditemukan ${invalidRelations.length} relasi BOM tanpa Qty per Unit yang valid. ${sample}`);
  }
  return { rows, items, operations, relations, processPairs, machines, lines, roots, sourceRows, quantityBasisCounts, version };
}

async function main() {
  if (applyRequested && !apply) {
    throw new Error('Mode tulis dibatalkan. Gunakan --apply=true --confirm=APPLY_BOM untuk konfirmasi eksplisit.');
  }
  if (apply && !clean(args.version)) {
    throw new Error('Mode tulis wajib menggunakan --version=<versi BOM> yang eksplisit.');
  }
  const data = parseWorkbook();
  if (apply && (data.roots.size === 0 || data.relations.size === 0)) {
    throw new Error('Mode tulis dibatalkan karena ROOT atau relasi BOM kosong.');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_LOCAL || undefined, host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME || 'monitoring_supplier', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres' });
  await client.connect();
  const q = (text, params) => client.query(text, params);
  const existingItems = (await q('SELECT code FROM items WHERE code = ANY($1)', [[...data.items.keys()]])).rows;
  const existingProcesses = (await q("SELECT code, name, work_center FROM master_processes")).rows;
  const existingLocations = (await q("SELECT id, line_description, category FROM master_locations")).rows;
  const locationById = new Set(existingLocations.map(x => x.id));
  const warehouse = (await q("SELECT id FROM master_warehouses ORDER BY id LIMIT 1")).rows[0];
  const area = (await q("SELECT id FROM master_areas ORDER BY id LIMIT 1")).rows[0];
  if (!warehouse || !area) throw new Error('Master warehouse/area belum tersedia');
  const newItems = data.items.size - existingItems.length;
  const newLines = [...data.lines].filter(x => !locationById.has(`LOC-XLSX-LN-${x}`));
  const newMachines = [...data.machines].filter(x => !locationById.has(`LOC-XLSX-MC-${slug(x)}`));
  const processCodes = [...data.processPairs.values()].map(op => `XLSX-${slug(op.name, 24)}-${slug(op.machine, 18)}`);
  const existingProcessCodes = new Set(existingProcesses.map(x => x.code));
  const newProcesses = processCodes.filter(x => !existingProcessCodes.has(x));
  const parentCodes = new Set([...data.relations.values()].map(x => x.parent));
  const nonRootParents = [...parentCodes].filter(x => !data.roots.has(x));
  const itemTypeCounts = [...data.items.values()].reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
  const sourceMaterialTypeCounts = data.rows.reduce((counts, row) => {
    const category = resolveMaterialCategory(row) || 'blank';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const rawMaterialSpecificationCounts = [...data.items.values()].reduce((counts, item) => {
    if (item.type !== 'RM') return counts;
    counts.total += 1;
    if (item.materialGrade || item.grade || item.materialForm) counts.withSpecification += 1;
    else counts.withoutSpecification += 1;
    return counts;
  }, { total: 0, withSpecification: 0, withoutSpecification: 0 });
  const report = { file, version: data.version, apply, rows: data.rows.length, itemCodes: data.items.size, itemTypeCounts, sourceMaterialTypeCounts, rawMaterialSpecificationCounts, roots: data.roots.size, relations: data.relations.size, quantityBasisCounts: data.quantityBasisCounts, duplicateRelationKeys: [...data.relations.values()].filter(x => x.duplicates > 1).length, processes: data.processPairs.size, machines: data.machines.size, inferredLines: data.lines.size, newItems, newLines: newLines.length, newMachines: newMachines.length, newProcesses: new Set(newProcesses).size, missingRelationItems: [...data.relations.values()].filter(x => !data.items.has(x.parent) || !data.items.has(x.child)).length, nonRootParents: nonRootParents.length };
  console.log(JSON.stringify(report, null, 2));
  if (!apply) { await client.end(); return; }

  await client.query('BEGIN');
  try {
    for (const line of data.lines) {
      const id = `LOC-XLSX-LN-${line}`;
      await q(`INSERT INTO master_locations (id, warehouse_id, area_id, category, line_description, fifo_lane, machine_note) VALUES ($1,$2,$3,'LINE',$4,$5,$6) ON CONFLICT (id) DO UPDATE SET line_description=EXCLUDED.line_description, fifo_lane=EXCLUDED.fifo_lane, machine_note=EXCLUDED.machine_note`, [id, warehouse.id, area.id, `Production Line - ${line}`, line, 'Inferred from BOM workbook process code']);
    }
    for (const machine of data.machines) {
      const id = `LOC-XLSX-MC-${slug(machine)}`;
      await q(`INSERT INTO master_locations (id, warehouse_id, area_id, category, line_description, fifo_lane, machine_note) VALUES ($1,$2,$3,'MACHINE',$4,$5,$6) ON CONFLICT (id) DO UPDATE SET line_description=EXCLUDED.line_description, fifo_lane=EXCLUDED.fifo_lane, machine_note=EXCLUDED.machine_note`, [id, warehouse.id, area.id, `Machine ${machine}`, machine, 'Imported from BOM workbook machine_number']);
    }
    const pairToCode = new Map();
    for (const [key, op] of data.processPairs) {
      const code = `XLSX-${slug(op.name, 24)}-${slug(op.machine, 18)}`;
      pairToCode.set(key, code);
      const lineId = `LOC-XLSX-LN-${slug(op.name)}`;
      await q(`INSERT INTO master_processes (code,name,process_type,applies_to_level,work_center,sequence,standard_time) VALUES ($1,$2,$3,'All',$4,$5,$6) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, process_type=EXCLUDED.process_type, work_center=EXCLUDED.work_center, sequence=EXCLUDED.sequence, standard_time=EXCLUDED.standard_time`, [code, op.name, processType(op.name), lineId, op.sequence, op.cycle]);
    }
    for (const item of data.items.values()) {
      const ops = item.operations || [];
      const routing = ops.map(op => ({ code: pairToCode.get(`${op.name}\u0000${op.machine}`), name: op.name, processType: processType(op.name), appliesToLevel: 'All', workCenter: `LOC-XLSX-MC-${slug(op.machine)}`, sequence: op.sequence, standardTime: op.cycle }));
      const flow = routing.map(x => x.code).filter(Boolean);
      const line = ops[0] ? `LOC-XLSX-LN-${slug(ops[0].name)}` : null;
      const materialSpec = item.type === 'RM'
        ? item
        : { materialGrade: null, grade: null, materialForm: null, widthMm: null, thicknessMm: null, lengthMm: null, diameterMm: null };
      await q(`INSERT INTO items (code,name,part_no,type,unit,model,weight,line_production,process_flow,process_routing,item_status,material_grade,grade,material_form,width_mm,thickness_mm,length_mm,diameter_mm) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, part_no=EXCLUDED.part_no, type=EXCLUDED.type, unit=EXCLUDED.unit, model=EXCLUDED.model, weight=EXCLUDED.weight, line_production=EXCLUDED.line_production, process_flow=EXCLUDED.process_flow, process_routing=EXCLUDED.process_routing, item_status=EXCLUDED.item_status, material_grade=EXCLUDED.material_grade, grade=EXCLUDED.grade, material_form=EXCLUDED.material_form, width_mm=EXCLUDED.width_mm, thickness_mm=EXCLUDED.thickness_mm, length_mm=EXCLUDED.length_mm, diameter_mm=EXCLUDED.diameter_mm`, [item.code, item.name || item.code, item.partNo || null, item.type, item.unit || 'PCS', item.model || null, item.weight, line, json(flow), json(routing), item.status, materialSpec.materialGrade, materialSpec.grade, materialSpec.materialForm, materialSpec.widthMm, materialSpec.thicknessMm, materialSpec.lengthMm, materialSpec.diameterMm]);
    }
    await q('DELETE FROM master_bom_headers WHERE bom_version=$1', [data.version]);
    for (const root of new Set([...data.roots, ...parentCodes])) {
      await q(`INSERT INTO master_bom_headers (parent_code,bom_version,effective_date,revision_no,reference) VALUES ($1,$2,CURRENT_DATE,20260919,$3)`, [root, data.version, `Imported from ${path.basename(file)}`]);
    }
    const headers = new Map((await q('SELECT id,parent_code FROM master_bom_headers WHERE bom_version=$1',[data.version])).rows.map(x => [x.parent_code, x.id]));
    for (const rel of data.relations.values()) {
      const headerId = headers.get(rel.parent) || null;
      if (!headerId) continue;
      const child = data.items.get(rel.child); const ops = rel.ops || [];
      const routing = ops.map(op => ({ code: pairToCode.get(`${op.name}\u0000${op.machine}`), name: op.name, processType: processType(op.name), appliesToLevel: 'All', workCenter: `LOC-XLSX-MC-${slug(op.machine)}`, sequence: op.sequence, standardTime: op.cycle }));
      const flow = routing.map(x => x.code).filter(Boolean);
      const line = ops[0] ? `LOC-XLSX-LN-${slug(ops[0].name)}` : null;
      await q('DELETE FROM master_bom WHERE header_id=$1 AND child_code=$2', [headerId, rel.child]);
      await q(`INSERT INTO master_bom (header_id,parent_code,child_code,quantity,component_type,component_description,model_spec,line_production,cycle_time_seconds,process_flow,process_routing,process_code,assembly_note,yield_factor,consumption_basis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,'Per Assembly')`, [headerId, rel.parent, rel.child, rel.quantity, child?.type || 'RM', child?.name || rel.child, child?.model || null, line, ops[0]?.cycle || null, json(flow), json(routing), flow[0] || null, `Imported from workbook (${rel.duplicates} source row${rel.duplicates > 1 ? 's' : ''})`]);
    }
    await client.query('COMMIT');
    console.log(`Applied BOM version ${data.version}`);
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  await client.end();
}
if (require.main === module) {
  main().catch(e => { console.error(e.stack || e); process.exit(1); });
}

module.exports = { isKilogramUom, normalizeMaterialForm, resolveItemType, resolveMaterialCategory, resolveMaterialSpecification, resolveRelationQuantity };
