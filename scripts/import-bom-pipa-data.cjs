const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('../server/node_modules/pg');

const rootDir = path.resolve(__dirname, '..');
const workbookPath = path.resolve(rootDir, process.env.BOM_PIPA_FILE || '.tmp/prl_pipa.xlsx');
const sheetName = process.env.BOM_PIPA_SHEET || 'DATA';
const applyChanges = process.env.APPLY === '1';
const bomVersion = process.env.BOM_PIPA_VERSION || 'PIPA DATA - DATA SHEET';
const sourceLabel = path.relative(rootDir, workbookPath).replace(/\\/g, '/');

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalizeCode = (value) => normalizeText(value).toUpperCase();
const normalizeSpec = (value) => normalizeText(value).replace(/\s*x\s*/gi, ' x ');
const normalizeQty = (value, fallback = 1) => {
  const raw = normalizeText(value).replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};
const itemTypeFromWipFg = (code) => (normalizeText(code).includes('-') ? 'WIP' : 'FG');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    if (process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
};

loadEnv(path.join(rootDir, '.env'));
loadEnv(path.join(rootDir, 'server', '.env'));

const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'monitoring_supplier',
};

const readRows = () => {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook tidak ditemukan: ${workbookPath}`);
  }
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan di ${sourceLabel}`);
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: false });
  const records = [];
  for (let idx = 4; idx < matrix.length; idx += 1) {
    const row = matrix[idx] || [];
    const sebango = normalizeCode(row[0]);
    const uniqNo = normalizeCode(row[1]);
    const partNo = normalizeText(row[2]);
    const partName = normalizeText(row[3]);
    const model = normalizeText(row[4]);
    const materialCode = normalizeCode(row[5]);
    const specMaterial = normalizeSpec(row[6]);
    const location = normalizeText(row[7]);
    const packaging = normalizeText(row[8]);
    const useQty = normalizeQty(row[9], 1);
    if (!sebango && !uniqNo && !materialCode && !specMaterial) continue;
    if (!materialCode || !specMaterial) continue;

    // Engineering rule from user:
    // - ID RM = Kode Material.
    // - Sebango is the parent; for combined parent like H14/H15, the grouped value is in UNIQ NO.
    // - WIP/FG with '-' is child part/WIP, otherwise Finish Good.
    const parentCode = uniqNo.includes('/') ? uniqNo : (sebango || uniqNo);
    if (!parentCode || parentCode === materialCode) continue;
    records.push({
      sourceRow: idx + 1,
      sebango,
      uniqNo,
      parentCode,
      parentType: itemTypeFromWipFg(parentCode),
      partNo,
      partName: partName || parentCode,
      model,
      materialCode,
      specMaterial,
      location,
      packaging,
      useQty,
    });
  }
  return records;
};

const queryOne = async (client, text, values = []) => {
  const result = await client.query(text, values);
  return result.rows[0] || null;
};

const upsertItem = async (client, item, stats, report) => {
  const existing = await queryOne(client, 'select code, name, type from items where code = $1', [item.code]);
  const action = existing ? 'updated' : 'inserted';
  if (existing) stats.itemsUpdated += 1;
  else stats.itemsInserted += 1;
  report.items.push({ action, code: item.code, type: item.type, name: item.name, sourceRow: item.sourceRow });
  if (!applyChanges) return;
  await client.query(
    `
    insert into items (
      code, name, part_no, type, unit, model, location_name, packing_name,
      line_production, moving_status, pack_qty
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SLOW',$10)
    on conflict (code) do update set
      name = excluded.name,
      part_no = coalesce(nullif(excluded.part_no, ''), items.part_no),
      type = excluded.type,
      unit = excluded.unit,
      model = coalesce(nullif(excluded.model, ''), items.model),
      location_name = coalesce(nullif(excluded.location_name, ''), items.location_name),
      packing_name = coalesce(nullif(excluded.packing_name, ''), items.packing_name),
      line_production = coalesce(nullif(excluded.line_production, ''), items.line_production),
      pack_qty = case when excluded.pack_qty > 0 then excluded.pack_qty else items.pack_qty end
    `,
    [
      item.code,
      item.name,
      item.partNo || null,
      item.type,
      item.unit || 'PCS',
      item.model || null,
      item.location || null,
      item.packaging || null,
      item.location || null,
      Number(item.packQty || 0),
    ],
  );
};

const ensureKanbanSetting = async (client, itemCode, row, stats, report) => {
  const existing = await queryOne(client, 'select item_code from kanban_settings where item_code = $1', [itemCode]);
  if (existing) {
    stats.kanbanExisting += 1;
    return;
  }
  stats.kanbanInserted += 1;
  report.kanban.push({ action: 'inserted', itemCode, sourceRow: row.sourceRow });
  if (!applyChanges) return;
  await client.query(
    `
    insert into kanban_settings (
      item_code, min_qty, max_qty, lot_qty, lead_time_days, safety_factor,
      regular_kanban, safety_hours, work_hours, cycle_x, cycle_y, cycle_z,
      default_supplier, drop_zone, active
    )
    values ($1,0,0,0,0,0,2,48,24,1,4,4,null,$2,true)
    on conflict (item_code) do nothing
    `,
    [itemCode, row.location || null],
  );
};

const ensureBomHeader = async (client, parentCode, stats, report) => {
  const existing = await queryOne(
    client,
    `
    select id
    from master_bom_headers
    where parent_code = $1 and bom_version = $2
    order by id desc
    limit 1
    `,
    [parentCode, bomVersion],
  );
  if (existing?.id) return existing.id;
  stats.headersInserted += 1;
  report.headers.push({ action: 'inserted', parentCode, bomVersion });
  if (!applyChanges) return null;
  const nextRevision = await queryOne(
    client,
    'select coalesce(max(revision_no), 0)::int + 1 as revision_no from master_bom_headers where parent_code = $1',
    [parentCode],
  );
  const inserted = await queryOne(
    client,
    `
    insert into master_bom_headers (
      parent_code, bom_version, revision_no, reference, effective_date, effective_start_date
    )
    values ($1,$2,$3,$4,current_date,current_date)
    returning id
    `,
    [parentCode, bomVersion, nextRevision?.revision_no || 1, `${sourceLabel} sheet ${sheetName}`],
  );
  return inserted.id;
};

const upsertBom = async (client, row, headerId, stats, report) => {
  const existing = headerId
    ? await queryOne(
      client,
      'select id, quantity, component_description from master_bom where header_id = $1 and parent_code = $2 and child_code = $3',
      [headerId, row.parentCode, row.materialCode],
    )
    : null;
  if (existing) stats.bomUpdated += 1;
  else stats.bomInserted += 1;
  report.bom.push({
    action: existing ? 'updated' : 'inserted',
    parentCode: row.parentCode,
    childCode: row.materialCode,
    quantity: row.useQty,
    componentDescription: row.specMaterial,
    sourceRow: row.sourceRow,
  });
  if (!applyChanges || !headerId) return;
  await client.query(
    `
    insert into master_bom (
      header_id, parent_code, child_code, quantity, scrap_factor, yield_factor,
      component_type, component_description, model_spec, location_name,
      line_production, packing, assembly_note
    )
    values ($1,$2,$3,$4,0,1,'RM',$5,$6,$7,$7,$8,$9)
    on conflict (header_id, parent_code, child_code) do update set
      quantity = excluded.quantity,
      component_type = excluded.component_type,
      component_description = excluded.component_description,
      model_spec = coalesce(nullif(excluded.model_spec, ''), master_bom.model_spec),
      location_name = coalesce(nullif(excluded.location_name, ''), master_bom.location_name),
      line_production = coalesce(nullif(excluded.line_production, ''), master_bom.line_production),
      packing = coalesce(nullif(excluded.packing, ''), master_bom.packing),
      assembly_note = excluded.assembly_note
    `,
    [
      headerId,
      row.parentCode,
      row.materialCode,
      row.useQty,
      row.specMaterial,
      row.model || null,
      row.location || null,
      row.packaging || null,
      `Source ${sourceLabel}:${sheetName}!row ${row.sourceRow}; Sebango=${row.sebango}; UNIQ=${row.uniqNo}`,
    ],
  );
};

const main = async () => {
  const rows = readRows();
  const client = new Client(dbConfig);
  const stats = {
    sourceRows: rows.length,
    fgParents: rows.filter((row) => row.parentType === 'FG').length,
    wipParents: rows.filter((row) => row.parentType === 'WIP').length,
    itemsInserted: 0,
    itemsUpdated: 0,
    kanbanInserted: 0,
    kanbanExisting: 0,
    headersInserted: 0,
    bomInserted: 0,
    bomUpdated: 0,
  };
  const report = {
    apply: applyChanges,
    workbook: sourceLabel,
    sheetName,
    bomVersion,
    generatedAt: new Date().toISOString(),
    rules: {
      materialCode: 'DATA.Kode Material -> items.code for RM',
      materialSpec: 'DATA.SIZE -> items.name for RM and master_bom.component_description',
      parentCode: 'DATA.SEBANGO, except grouped UNIQ NO with "/" such as H14/H15',
      parentType: 'Code containing "-" => WIP, otherwise FG',
    },
    items: [],
    kanban: [],
    headers: [],
    bom: [],
  };

  await client.connect();
  try {
    await client.query('begin');
    const seenItems = new Set();
    const seenKanban = new Set();
    const headerMap = new Map();

    for (const row of rows) {
      const parentItem = {
        code: row.parentCode,
        name: row.partName,
        partNo: row.partNo || row.parentCode,
        type: row.parentType,
        unit: 'PCS',
        model: row.model,
        location: row.location,
        packaging: row.packaging,
        sourceRow: row.sourceRow,
      };
      const rmItem = {
        code: row.materialCode,
        name: row.specMaterial,
        partNo: row.materialCode,
        type: 'RM',
        unit: 'PCS',
        model: row.model,
        location: row.location,
        packaging: row.packaging,
        sourceRow: row.sourceRow,
      };

      for (const item of [parentItem, rmItem]) {
        if (!seenItems.has(item.code)) {
          await upsertItem(client, item, stats, report);
          seenItems.add(item.code);
        }
        if (!seenKanban.has(item.code)) {
          await ensureKanbanSetting(client, item.code, row, stats, report);
          seenKanban.add(item.code);
        }
      }

      if (!headerMap.has(row.parentCode)) {
        headerMap.set(row.parentCode, await ensureBomHeader(client, row.parentCode, stats, report));
      }
      await upsertBom(client, row, headerMap.get(row.parentCode), stats, report);
    }

    if (applyChanges) await client.query('commit');
    else await client.query('rollback');

    const outDir = path.join(rootDir, '.tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `bom-pipa-data-${applyChanges ? 'apply' : 'dry-run'}.json`);
    fs.writeFileSync(outFile, JSON.stringify({ stats, report }, null, 2));
    console.log(JSON.stringify({ apply: applyChanges, stats, reportFile: path.relative(rootDir, outFile) }, null, 2));
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
