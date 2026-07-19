import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const rootDir = process.cwd();
const sourceFile = path.join(rootDir, 'docs', 'BOM_Import_Review.xlsx');
const outputFile = path.join(rootDir, 'docs', 'BOM_Import_By_Project.xlsx');

if (!fs.existsSync(sourceFile)) {
  throw new Error(`Source workbook not found: ${sourceFile}`);
}

const workbook = XLSX.readFile(sourceFile);
const itemsSheet = workbook.Sheets['Items Review'];
const headersSheet = workbook.Sheets['BOM Headers'];
const relationsSheet = workbook.Sheets['BOM Relations'];

if (!itemsSheet || !headersSheet || !relationsSheet) {
  throw new Error('Workbook source harus punya sheet Items Review, BOM Headers, dan BOM Relations.');
}

const items = XLSX.utils.sheet_to_json(itemsSheet, { defval: '' });
const headers = XLSX.utils.sheet_to_json(headersSheet, { defval: '' });
const relations = XLSX.utils.sheet_to_json(relationsSheet, { defval: '' });

const itemMap = new Map(items.map((row) => [String(row.code || '').trim(), row]));
const headersByProject = new Map();
const relationsByHeaderKey = new Map();
const projectOrder = [];

const normalizeKey = (value) => String(value || '').trim() || 'UNASSIGNED';
const pushUniqueProject = (projectKey) => {
  const normalized = normalizeKey(projectKey);
  if (!headersByProject.has(normalized)) {
    headersByProject.set(normalized, []);
    projectOrder.push(normalized);
  }
  return normalized;
};

headers.forEach((header) => {
  const projectKey = pushUniqueProject(header.bom_version);
  headersByProject.get(projectKey).push(header);
});

relations.forEach((relation) => {
  const relationKey = `${normalizeKey(relation.parent_code)}|${normalizeKey(relation.revision_no)}`;
  if (!relationsByHeaderKey.has(relationKey)) relationsByHeaderKey.set(relationKey, []);
  relationsByHeaderKey.get(relationKey).push(relation);
});

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const normalizeArrayLike = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return String(trimmed).split(/[|,;]/).map((entry) => entry.trim()).filter(Boolean);
    }
  }
  if (value == null) return [];
  return [value];
};

const stringifySteps = (value) => normalizeArrayLike(value).map((step, index) => {
  if (typeof step === 'string') {
    const label = String(step || '').trim();
    return label ? `${index + 1}. ${label}` : '';
  }
  if (!isPlainObject(step)) return '';
  const code = String(step.code || step.processCode || '').trim();
  const name = String(step.name || step.processName || '').trim();
  const title = [code, name].filter(Boolean).join(' - ') || code || name || `Step ${index + 1}`;
  const cycle = Number(step.standardTime ?? step.standard_time ?? step.cycleTimeSeconds ?? step.cycle_time_seconds ?? 0);
  return `${index + 1}. ${title}${Number.isFinite(cycle) && cycle > 0 ? ` (${cycle}s)` : ''}`;
}).filter(Boolean).join(' | ');

const firstStepCode = (value) => {
  const steps = normalizeArrayLike(value);
  const first = steps[0] || null;
  if (typeof first === 'string') return String(first || '').trim();
  if (!isPlainObject(first)) return '';
  return String(first.code || first.processCode || '').trim();
};

const sanitizeSheetName = (value, fallback = 'Project') => {
  const raw = String(value || '').trim() || fallback;
  const cleaned = raw.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
};

const uniqueSheetName = (name, usedNames) => {
  let base = sanitizeSheetName(name);
  if (!base) base = 'Project';
  let candidate = base;
  let counter = 2;
  while (usedNames.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    counter += 1;
  }
  usedNames.add(candidate);
  return candidate;
};

const columns = [
  'Level',
  'Row Type',
  'Parent Code',
  'Kode Item',
  'Nama Item',
  'Model',
  'Tipe',
  'Qty (Use)',
  'UOM',
  'Berat (Kg)',
  'Scrap %',
  'Lead Time',
  'Line',
  'Process List',
  'Process Code',
  'Consumption Basis',
  'Cycle Time (s)',
  'Packing',
  'Revision No',
  'Effective Start',
  'Effective End',
  'Yield Factor',
  'Position Code',
  'Substitute Codes',
  'BOM Version',
  'Reference',
];

const summaryColumns = [
  'Project / BOM Version',
  'Sheet Name',
  'Parent Headers',
  'Total Rows',
  'Child Rows',
  'Root Rows',
  'Empty Routing Header',
  'Empty Routing Child',
];

const outputWorkbook = XLSX.utils.book_new();
const usedSheetNames = new Set();
const summaryRows = [];

projectOrder.forEach((projectKey) => {
  const headersInProject = headersByProject.get(projectKey) || [];
  const rows = [];
  let emptyRoutingHeaders = 0;
  let emptyRoutingChildren = 0;

  headersInProject.forEach((header) => {
    const item = itemMap.get(String(header.parent_code || '').trim()) || {};
    const headerFlow = normalizeArrayLike(item.process_routing_steps || item.process_routing).filter((step) => String(step || '').trim());
    const headerFlowFallback = normalizeArrayLike(item.process_flow_steps || item.process_flow).filter((step) => String(step || '').trim());
    const resolvedHeaderFlow = headerFlow.length > 0 ? headerFlow : headerFlowFallback;
    if (resolvedHeaderFlow.length === 0) emptyRoutingHeaders += 1;

    rows.push({
      'Level': 0,
      'Row Type': 'ROOT',
      'Parent Code': header.parent_code || '',
      'Kode Item': header.parent_code || '',
      'Nama Item': item.name || header.parent_code || '',
      'Model': item.model || header.bom_version || '',
      'Tipe': item.type || '',
      'Qty (Use)': 1,
      'UOM': item.unit || '',
      'Berat (Kg)': '',
      'Scrap %': '',
      'Lead Time': item.lead_time_days || '',
      'Line': item.line_production || '',
      'Process List': stringifySteps(resolvedHeaderFlow),
      'Process Code': firstStepCode(resolvedHeaderFlow),
      'Consumption Basis': '',
      'Cycle Time (s)': item.cycle_time_seconds || '',
      'Packing': '',
      'Revision No': header.revision_no || '',
      'Effective Start': header.effective_start_date || '',
      'Effective End': header.effective_end_date || '',
      'Yield Factor': '',
      'Position Code': '',
      'Substitute Codes': '',
      'BOM Version': header.bom_version || '',
      'Reference': header.reference || '',
    });

    const relationKey = `${normalizeKey(header.parent_code)}|${normalizeKey(header.revision_no)}`;
    const childRows = relationsByHeaderKey.get(relationKey) || [];
    childRows.forEach((relation) => {
      const childItem = itemMap.get(String(relation.child_code || '').trim()) || {};
      const relationFlow = normalizeArrayLike(relation.process_routing).filter((step) => String(step || '').trim());
      const relationFlowFallback = normalizeArrayLike(relation.process_flow).filter((step) => String(step || '').trim());
      const resolvedRelationFlow = relationFlow.length > 0 ? relationFlow : relationFlowFallback;
      if (resolvedRelationFlow.length === 0) emptyRoutingChildren += 1;
      rows.push({
        'Level': Number.isFinite(Number(relation.level)) ? Number(relation.level) : 1,
        'Row Type': String(relation.component_type || 'CHILD').trim() || 'CHILD',
        'Parent Code': relation.parent_code || header.parent_code || '',
        'Kode Item': relation.child_code || '',
        'Nama Item': relation.child_name || relation.component_description || childItem.name || relation.child_code || '',
        'Model': relation.model_spec || childItem.model || item.model || '',
        'Tipe': relation.child_type || relation.component_type || childItem.type || '',
        'Qty (Use)': relation.quantity || '',
        'UOM': relation.child_unit || relation.uom || childItem.unit || '',
        'Berat (Kg)': '',
        'Scrap %': relation.scrap_factor || '',
        'Lead Time': '',
        'Line': relation.line_production || childItem.line_production || '',
        'Process List': stringifySteps(resolvedRelationFlow),
        'Process Code': relation.process_code || firstStepCode(resolvedRelationFlow),
        'Consumption Basis': relation.consumption_basis || '',
        'Cycle Time (s)': relation.cycle_time_seconds || '',
        'Packing': relation.packing_name || '',
        'Revision No': header.revision_no || '',
        'Effective Start': header.effective_start_date || '',
        'Effective End': header.effective_end_date || '',
        'Yield Factor': relation.yield_factor || '',
        'Position Code': relation.position_code || '',
        'Substitute Codes': relation.substitute_codes || '',
        'BOM Version': header.bom_version || '',
        'Reference': header.reference || '',
      });
    });
  });

  const sheetName = uniqueSheetName(projectKey, usedSheetNames);
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
  XLSX.utils.book_append_sheet(outputWorkbook, ws, sheetName);

  summaryRows.push({
    'Project / BOM Version': projectKey,
    'Sheet Name': sheetName,
    'Parent Headers': headersInProject.length,
    'Total Rows': rows.length,
    'Child Rows': rows.filter((row) => String(row['Row Type'] || '').toUpperCase() !== 'ROOT').length,
    'Root Rows': headersInProject.length,
    'Empty Routing Header': emptyRoutingHeaders,
    'Empty Routing Child': emptyRoutingChildren,
  });
});

const summarySheet = XLSX.utils.json_to_sheet(summaryRows, { header: summaryColumns });
XLSX.utils.book_append_sheet(outputWorkbook, summarySheet, 'Summary');

if (!fs.existsSync(path.dirname(outputFile))) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
}
XLSX.writeFile(outputWorkbook, outputFile);

console.log(`Workbook generated: ${outputFile}`);
console.log(`Project sheets: ${summaryRows.length}`);
