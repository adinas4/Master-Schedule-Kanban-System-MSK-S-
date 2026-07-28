const fs = require('fs');
const path = require('path');
const { Client } = require('../server/node_modules/pg');

const rootDir = path.resolve(__dirname, '..');
const defaultSource = 'C:/Users/matra/.codex/attachments/9f89d05e-e24e-4862-95b2-fe5400f5fa41/pasted-text.txt';
const sourceFile = path.resolve(process.env.BOM_TEXT_FILE || defaultSource);
const applyChanges = process.env.APPLY === '1';
const bomVersion = process.env.BOM_TEXT_VERSION || 'PASTED RM-WIPFG-SEBANGO';
const previousWorkbookVersion = process.env.CLEAN_PREVIOUS_BOM_VERSION || 'PIPA DATA - DATA SHEET';

const normalizeText = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/Ã˜/g, 'Ø')
  .replace(/âŒ€/g, 'Ø')
  .replace(/\s+/g, ' ')
  .trim();
const normalizeCode = (value) => normalizeText(value).toUpperCase();
const hasSlash = (value) => normalizeText(value).includes('/');
const parseNumber = (value, fallback = null) => {
  const raw = normalizeText(value).replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};
const itemTypeFromWipFg = (code) => (normalizeText(code).includes('-') ? 'WIP' : 'FG');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
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

const readSourceRows = () => {
  if (!fs.existsSync(sourceFile)) throw new Error(`Source text tidak ditemukan: ${sourceFile}`);
  const lines = fs.readFileSync(sourceFile, 'utf8').split(/\r?\n/);
  const rows = [];
  const skipped = [];
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (!normalizeText(line)) return;
    const cols = line.split('\t');
    const idRm = normalizeCode(cols[0]);
    const wipFg = normalizeCode(cols[1]);
    const sebango = normalizeCode(cols[2]);
    const specMaterial = normalizeText(cols[3]);
    const weight = parseNumber(cols[4], null);
    const model = normalizeText(cols[5]);
    const useQty = parseNumber(cols[6], 1) || 1;
    if (['ID RM', 'IDRM'].includes(idRm.replace(/\s+/g, ''))) return;
    if (!idRm || !wipFg || !sebango) {
      skipped.push({ lineNo, reason: 'Kolom ID RM/WIP-FG/Sebango belum lengkap.', raw: line });
      return;
    }
    if (hasSlash(idRm) || hasSlash(wipFg) || hasSlash(sebango)) {
      skipped.push({ lineNo, reason: 'Kode mengandung garis miring (/), sesuai instruksi tidak diinput.', idRm, wipFg, sebango });
      return;
    }
    rows.push({
      lineNo,
      idRm,
      wipFg,
      sebango,
      specMaterial: specMaterial || idRm,
      weight,
      model,
      useQty,
      wipFgType: itemTypeFromWipFg(wipFg),
      parentType: itemTypeFromWipFg(sebango),
    });
  });
  return { rows, skipped };
};

const queryOne = async (client, text, values = []) => {
  const result = await client.query(text, values);
  return result.rows[0] || null;
};

const upsertItem = async (client, item, stats, report) => {
  const existing = await queryOne(client, 'select code, name, type, weight from items where code = $1', [item.code]);
  if (existing) stats.itemsUpdated += 1;
  else stats.itemsInserted += 1;
  report.items.push({
    action: existing ? 'updated' : 'inserted',
    code: item.code,
    type: item.type,
    name: item.name,
    weight: item.weight,
    lineNo: item.lineNo,
  });
  if (!applyChanges) return;
  await client.query(
    `
    insert into items (code, name, part_no, type, unit, model, weight, moving_status)
    values ($1,$2,$3,$4,$5,$6,$7,'SLOW')
    on conflict (code) do update set
      name = case
        when excluded.type = 'RM' then excluded.name
        when nullif(items.name, '') is null then excluded.name
        else items.name
      end,
      part_no = coalesce(nullif(items.part_no, ''), excluded.part_no),
      type = excluded.type,
      model = coalesce(nullif(excluded.model, ''), items.model),
      weight = coalesce(excluded.weight, items.weight)
    `,
    [
      item.code,
      item.name || item.code,
      item.partNo || item.code,
      item.type,
      item.unit || 'PCS',
      item.model || null,
      Number.isFinite(item.weight) ? item.weight : null,
    ],
  );
};

const ensureKanban = async (client, itemCode, stats, report) => {
  const existing = await queryOne(client, 'select item_code from kanban_settings where item_code = $1', [itemCode]);
  if (existing) {
    stats.kanbanExisting += 1;
    return;
  }
  stats.kanbanInserted += 1;
  report.kanban.push({ action: 'inserted', itemCode });
  if (!applyChanges) return;
  await client.query(
    `
    insert into kanban_settings (
      item_code, min_qty, max_qty, lot_qty, lead_time_days, safety_factor,
      regular_kanban, safety_hours, work_hours, cycle_x, cycle_y, cycle_z, active
    )
    values ($1,0,0,0,0,0,2,48,24,1,4,4,true)
    on conflict (item_code) do nothing
    `,
    [itemCode],
  );
};

const ensureHeader = async (client, parentCode, stats, report) => {
  const existing = await queryOne(
    client,
    'select id from master_bom_headers where parent_code = $1 and bom_version = $2 order by id desc limit 1',
    [parentCode, bomVersion],
  );
  if (existing?.id) return existing.id;
  stats.headersInserted += 1;
  report.headers.push({ action: 'inserted', parentCode, bomVersion });
  if (!applyChanges) return null;
  const rev = await queryOne(
    client,
    'select coalesce(max(revision_no), 0)::int + 1 as revision_no from master_bom_headers where parent_code = $1',
    [parentCode],
  );
  const inserted = await queryOne(
    client,
    `
    insert into master_bom_headers (parent_code, bom_version, revision_no, reference, effective_date, effective_start_date)
    values ($1,$2,$3,$4,current_date,current_date)
    returning id
    `,
    [parentCode, bomVersion, rev?.revision_no || 1, `Attachment pasted-text ${path.basename(sourceFile)}`],
  );
  return inserted.id;
};

const upsertBom = async (client, relation, stats, report) => {
  if (relation.parentCode === relation.childCode) return;
  const existing = relation.headerId
    ? await queryOne(
      client,
      'select id from master_bom where header_id = $1 and parent_code = $2 and child_code = $3',
      [relation.headerId, relation.parentCode, relation.childCode],
    )
    : null;
  if (existing) stats.bomUpdated += 1;
  else stats.bomInserted += 1;
  report.bom.push({
    action: existing ? 'updated' : 'inserted',
    parentCode: relation.parentCode,
    childCode: relation.childCode,
    quantity: relation.quantity,
    componentType: relation.componentType,
    componentDescription: relation.componentDescription,
    lineNo: relation.lineNo,
  });
  if (!applyChanges || !relation.headerId) return;
  await client.query(
    `
    insert into master_bom (
      header_id, parent_code, child_code, quantity, scrap_factor, yield_factor,
      component_type, component_description, model_spec, assembly_note
    )
    values ($1,$2,$3,$4,0,1,$5,$6,$7,$8)
    on conflict (header_id, parent_code, child_code) do update set
      quantity = excluded.quantity,
      component_type = excluded.component_type,
      component_description = excluded.component_description,
      model_spec = coalesce(nullif(excluded.model_spec, ''), master_bom.model_spec),
      assembly_note = excluded.assembly_note
    `,
    [
      relation.headerId,
      relation.parentCode,
      relation.childCode,
      relation.quantity,
      relation.componentType,
      relation.componentDescription || null,
      relation.model || null,
      `Source pasted-text line ${relation.lineNo}; ID RM=${relation.idRm}; WIP/FG=${relation.wipFg}; Sebango=${relation.sebango}`,
    ],
  );
};

const cleanupPreviousSlashImport = async (client, stats, report) => {
  const slashHeaders = await client.query(
    `
    select id, parent_code
    from master_bom_headers
    where bom_version = $1 and parent_code like '%/%'
    `,
    [previousWorkbookVersion],
  );
  stats.previousSlashHeadersRemoved = slashHeaders.rows.length;
  report.cleanup = slashHeaders.rows.map((row) => ({
    action: applyChanges ? 'deleted' : 'would-delete',
    bomVersion: previousWorkbookVersion,
    headerId: row.id,
    parentCode: row.parent_code,
  }));
  if (applyChanges && slashHeaders.rows.length > 0) {
    await client.query(
      'delete from master_bom_headers where bom_version = $1 and parent_code like $2',
      [previousWorkbookVersion, '%/%'],
    );
  }
};

const main = async () => {
  const { rows, skipped } = readSourceRows();
  const stats = {
    sourceRows: rows.length + skipped.length,
    eligibleRows: rows.length,
    skippedSlashOrInvalid: skipped.length,
    fgRows: rows.filter((row) => row.wipFgType === 'FG').length,
    wipRows: rows.filter((row) => row.wipFgType === 'WIP').length,
    itemsInserted: 0,
    itemsUpdated: 0,
    kanbanInserted: 0,
    kanbanExisting: 0,
    headersInserted: 0,
    bomInserted: 0,
    bomUpdated: 0,
    previousSlashHeadersRemoved: 0,
  };
  const report = {
    apply: applyChanges,
    sourceFile,
    bomVersion,
    generatedAt: new Date().toISOString(),
    rules: {
      idRm: 'ID RM -> kode material RM',
      wipFg: 'WIP/FG with "-" -> WIP child part; without "-" -> FG',
      sebango: 'Sebango -> parent BOM',
      specMaterial: 'SPEC MATERIAL -> item.name for RM',
      weight: 'BERAT -> item.weight for WIP/FG part because the same RM can appear with different weights',
      slash: 'Rows with "/" in ID RM, WIP/FG, or Sebango are skipped and not input',
      bom: 'Sebango -> WIP/FG; WIP/FG -> ID RM. If Sebango equals WIP/FG, direct Sebango -> ID RM',
    },
    skipped,
    cleanup: [],
    items: [],
    kanban: [],
    headers: [],
    bom: [],
  };

  const client = new Client(dbConfig);
  await client.connect();
  try {
    await client.query('begin');
    await cleanupPreviousSlashImport(client, stats, report);
    const seenItems = new Set();
    const seenKanban = new Set();
    const headerMap = new Map();

    for (const row of rows) {
      const items = [
        { code: row.idRm, name: row.specMaterial, partNo: row.idRm, type: 'RM', unit: 'KG', model: row.model, weight: null, lineNo: row.lineNo },
        { code: row.wipFg, name: row.wipFg, partNo: row.wipFg, type: row.wipFgType, unit: 'PCS', model: row.model, weight: row.weight, lineNo: row.lineNo },
        { code: row.sebango, name: row.sebango, partNo: row.sebango, type: row.parentType, unit: 'PCS', model: row.model, weight: row.sebango === row.wipFg ? row.weight : null, lineNo: row.lineNo },
      ];
      for (const item of items) {
        if (!seenItems.has(item.code)) {
          await upsertItem(client, item, stats, report);
          seenItems.add(item.code);
        }
        if (!seenKanban.has(item.code)) {
          await ensureKanban(client, item.code, stats, report);
          seenKanban.add(item.code);
        }
      }

      if (!headerMap.has(row.sebango)) {
        headerMap.set(row.sebango, await ensureHeader(client, row.sebango, stats, report));
      }
      const parentHeaderId = headerMap.get(row.sebango);
      if (row.sebango !== row.wipFg) {
        await upsertBom(client, {
          headerId: parentHeaderId,
          parentCode: row.sebango,
          childCode: row.wipFg,
          quantity: row.useQty,
          componentType: row.wipFgType,
          componentDescription: row.wipFg,
          model: row.model,
          lineNo: row.lineNo,
          idRm: row.idRm,
          wipFg: row.wipFg,
          sebango: row.sebango,
        }, stats, report);
      }

      if (!headerMap.has(row.wipFg)) {
        headerMap.set(row.wipFg, await ensureHeader(client, row.wipFg, stats, report));
      }
      await upsertBom(client, {
        headerId: headerMap.get(row.wipFg),
        parentCode: row.wipFg,
        childCode: row.idRm,
        quantity: row.sebango === row.wipFg ? row.useQty : 1,
        componentType: 'RM',
        componentDescription: row.specMaterial,
        model: row.model,
        lineNo: row.lineNo,
        idRm: row.idRm,
        wipFg: row.wipFg,
        sebango: row.sebango,
      }, stats, report);
    }

    if (applyChanges) await client.query('commit');
    else await client.query('rollback');

    const outDir = path.join(rootDir, '.tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `bom-pasted-text-${applyChanges ? 'apply' : 'dry-run'}.json`);
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
