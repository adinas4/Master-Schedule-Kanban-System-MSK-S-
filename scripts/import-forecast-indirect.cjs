const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('../server/node_modules/pg');

const workbookPath = process.env.FORECAST_FILE
  || 'G:/My Drive/Laporan Delivery Plant 3/FORECAS INDIRECT/2026/07 JUNI 2026/07. FORECAS JULI 2026 ALL.xlsx';
const sheetName = process.env.FORECAST_SHEET || 'PEMAKAIAN ALL';
const dryRun = process.env.APPLY !== '1';

const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'user',
  password: process.env.PGPASSWORD || 'user123',
  database: process.env.PGDATABASE || 'monitoring_supplier',
};

const normalizeText = (value) => String(value ?? '').trim();
const normalizeSupplierCode = (value) => normalizeText(value).toUpperCase();
const cellValue = (ws, rowIndex, colIndex) => ws[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })]?.v;
const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const readWorkbook = () => {
  const wb = XLSX.readFile(workbookPath);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet ${sheetName} tidak ditemukan.`);

  const roots = [];
  for (let c = 7; c <= 154; c += 1) {
    const code = normalizeText(cellValue(ws, 5, c));
    if (code) roots.push({ code, col: c });
  }

  const items = [];
  const bomLinks = [];
  for (let r = 6; r <= 214; r += 1) {
    const itemCode = normalizeText(cellValue(ws, r, 1));
    if (!itemCode) continue;
    const supplierId = normalizeSupplierCode(cellValue(ws, r, 4));
    const item = {
      rowNo: r + 1,
      code: itemCode,
      partNo: normalizeText(cellValue(ws, r, 2)),
      name: normalizeText(cellValue(ws, r, 3)) || itemCode,
      supplierId,
      packQty: asNumber(cellValue(ws, r, 5)),
    };
    items.push(item);

    roots.forEach((root) => {
      const quantity = asNumber(cellValue(ws, r, root.col));
      if (quantity > 0) {
        bomLinks.push({
          parentCode: root.code,
          childCode: item.code,
          quantity,
          supplierId,
          rowNo: item.rowNo,
        });
      }
    });
  }

  return {
    sourceFile: path.basename(workbookPath),
    roots,
    items,
    suppliers: Array.from(new Set(items.map((item) => item.supplierId).filter(Boolean))).sort(),
    bomLinks,
  };
};

const ensureVendor = async (client, supplierId, stats) => {
  if (!supplierId) return;
  const result = await client.query('select id from master_vendors where id = $1', [supplierId]);
  if (result.rows.length > 0) return;
  stats.vendorsInserted += 1;
  if (dryRun) return;
  await client.query(
    `
    insert into master_vendors (id, name, type, role)
    values ($1, $1, 'Supplier', 'Delivery Note')
    on conflict (id) do nothing
    `,
    [supplierId],
  );
};

const ensureItem = async (client, item, stats, { root = false } = {}) => {
  const existingResult = await client.query('select * from items where code = $1', [item.code]);
  const itemType = root ? 'FG' : 'INDIRECT';
  if (existingResult.rows.length === 0) {
    stats.itemsInserted += 1;
    if (dryRun) return;
    await client.query(
      `
      insert into items
        (code, name, type, unit, part_no, vendor_id, supplier_name, pack_qty, type_pack)
      values
        ($1, $2, $3, 'PCS', $4, nullif($5, ''), nullif($5, ''), $6, 'KBN')
      `,
      [
        item.code,
        item.name || item.code,
        itemType,
        item.partNo || item.code,
        item.supplierId || '',
        Number(item.packQty || 0),
      ],
    );
    return;
  }
  if (root) return;

  const existing = existingResult.rows[0];
  const next = {
    name: item.name || existing.name || item.code,
    partNo: item.partNo || existing.part_no || '',
    vendorId: item.supplierId || existing.vendor_id || '',
    supplierName: item.supplierId || existing.supplier_name || '',
    packQty: Number(item.packQty || existing.pack_qty || 0),
    typePack: item.packQty ? 'KBN' : (existing.type_pack || ''),
  };
  const changed = String(existing.name || '') !== next.name
    || String(existing.part_no || '') !== next.partNo
    || String(existing.vendor_id || '') !== next.vendorId
    || String(existing.supplier_name || '') !== next.supplierName
    || Number(existing.pack_qty || 0) !== next.packQty
    || String(existing.type_pack || '') !== next.typePack;
  if (!changed) return;
  stats.itemsUpdated += 1;
  if (dryRun) return;
  await client.query(
    `
    update items
    set
      name = $2,
      part_no = nullif($3, ''),
      vendor_id = nullif($4, ''),
      supplier_name = nullif($5, ''),
      pack_qty = $6,
      type_pack = nullif($7, '')
    where code = $1
    `,
    [item.code, next.name, next.partNo, next.vendorId, next.supplierName, next.packQty, next.typePack],
  );
};

const ensureItemSupplier = async (client, item, stats) => {
  if (!item.supplierId) return;
  const existingResult = await client.query(
    'select 1 from item_suppliers where item_code = $1 and vendor_id = $2',
    [item.code, item.supplierId],
  );
  if (existingResult.rows.length > 0) {
    if (!dryRun) {
      await client.query(
        'update item_suppliers set share_percent = 100 where item_code = $1 and vendor_id = $2 and coalesce(share_percent, 0) <> 100',
        [item.code, item.supplierId],
      );
    }
    return;
  }
  stats.itemSuppliersInserted += 1;
  if (dryRun) return;
  await client.query(
    `
    insert into item_suppliers (item_code, vendor_id, share_percent)
    values ($1, $2, 100)
    on conflict (item_code, vendor_id) do update set share_percent = excluded.share_percent
    `,
    [item.code, item.supplierId],
  );
};

const getBomHeaderId = async (client, parentCode, sourceFile, stats) => {
  const existingResult = await client.query(
    `
    select id
    from master_bom_headers
    where parent_code = $1
    order by revision_no desc nulls last, id desc
    limit 1
    `,
    [parentCode],
  );
  if (existingResult.rows[0]?.id) return existingResult.rows[0].id;

  stats.bomHeadersInserted += 1;
  if (dryRun) return null;
  const inserted = await client.query(
    `
    insert into master_bom_headers
      (parent_code, bom_version, revision_no, reference, effective_date, effective_start_date)
    values
      ($1, 'FORECAST INDIRECT JULI 2026', 1, $2, current_date, current_date)
    returning id
    `,
    [parentCode, sourceFile],
  );
  return inserted.rows[0].id;
};

const upsertBomLink = async (client, link, headerId, itemMap, stats) => {
  const child = itemMap.get(link.childCode) || {};
  const existingResult = headerId
    ? await client.query(
      'select id, quantity from master_bom where header_id = $1 and parent_code = $2 and child_code = $3',
      [headerId, link.parentCode, link.childCode],
    )
    : { rows: [] };
  if (existingResult.rows.length === 0) {
    stats.bomInserted += 1;
  } else if (Number(existingResult.rows[0].quantity || 0) !== Number(link.quantity)) {
    stats.bomUpdated += 1;
  }
  if (dryRun || !headerId) return;
  await client.query(
    `
    insert into master_bom
      (header_id, parent_code, child_code, quantity, component_type, component_description, line_production, supplier_name, location_name, packing)
    values
      ($1, $2, $3, $4, 'INDIRECT', $5, nullif($6, ''), nullif($6, ''), nullif($6, ''), nullif($7, ''))
    on conflict (header_id, parent_code, child_code) do update
    set
      quantity = excluded.quantity,
      component_description = coalesce(nullif(master_bom.component_description, ''), excluded.component_description),
      component_type = coalesce(nullif(master_bom.component_type, ''), excluded.component_type),
      line_production = coalesce(nullif(master_bom.line_production, ''), excluded.line_production),
      supplier_name = coalesce(nullif(master_bom.supplier_name, ''), excluded.supplier_name),
      location_name = coalesce(nullif(master_bom.location_name, ''), excluded.location_name),
      packing = coalesce(nullif(master_bom.packing, ''), excluded.packing)
    `,
    [
      headerId,
      link.parentCode,
      link.childCode,
      link.quantity,
      child.name || link.childCode,
      link.supplierId || '',
      child.packQty ? `KBN ${child.packQty}` : '',
    ],
  );
};

const main = async () => {
  const parsed = readWorkbook();
  const client = new Client(dbConfig);
  await client.connect();
  const stats = {
    roots: parsed.roots.length,
    items: parsed.items.length,
    suppliers: parsed.suppliers.length,
    bomLinks: parsed.bomLinks.length,
    vendorsInserted: 0,
    itemsInserted: 0,
    itemsUpdated: 0,
    itemSuppliersInserted: 0,
    bomHeadersInserted: 0,
    bomInserted: 0,
    bomUpdated: 0,
  };

  try {
    await client.query('begin');
    for (const supplierId of parsed.suppliers) {
      await ensureVendor(client, supplierId, stats);
    }

    for (const root of parsed.roots) {
      await ensureItem(client, {
        code: root.code,
        name: `Root Production ${root.code}`,
        partNo: root.code,
        supplierId: '',
        packQty: 1,
      }, stats, { root: true });
    }

    for (const item of parsed.items) {
      await ensureItem(client, item, stats);
      await ensureItemSupplier(client, item, stats);
    }

    const itemMap = new Map(parsed.items.map((item) => [item.code, item]));
    const headerMap = new Map();
    for (const root of parsed.roots) {
      const headerId = await getBomHeaderId(client, root.code, parsed.sourceFile, stats);
      headerMap.set(root.code, headerId);
    }
    for (const link of parsed.bomLinks) {
      await upsertBomLink(client, link, headerMap.get(link.parentCode), itemMap, stats);
    }

    if (dryRun) {
      await client.query('rollback');
    } else {
      await client.query('commit');
    }
    console.log(JSON.stringify({ dryRun, sourceFile: parsed.sourceFile, stats }, null, 2));
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
