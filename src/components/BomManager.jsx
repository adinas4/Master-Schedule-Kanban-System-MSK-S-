import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, FolderTree, Table, ChevronRight, ChevronDown, ChevronUp, Pencil,
  Package, FileText, Hammer, Clock, Settings, FileSpreadsheet,
  Layers, Sparkles, Bot, Loader2, X, Calculator, Upload, Download,
  MoreVertical, Calendar, Database, MessageSquareText, BookOpenText, Send,
  Factory, Timer, Box, Search, LayoutDashboard, Copy, BarChart3, ArrowRight,
  Printer, FileCheck, Lock
} from 'lucide-react';

import {
  parseModelCodes,
  joinModelCodes,
  buildModelMap,
  formatModelCodes,
} from '../utils/modelUtils';

const getLabel = (record) => {
  if (!record) return '';
  if (typeof record === 'string') return record;
  return record.name || record.code || record.id || '';
};
const getLineOptionLabel = (record) => {
  if (!record) return '';
  const code = String(record.code || record.id || '').trim();
  const lineType = String(record.line_description || record.lineDescription || record.category || '').trim();
  const processLabel = String(
    record.process_name
    || record.processDescription
    || record.process_description
    || record.process
    || record.processCode
    || record.fifo_lane
    || record.fifoLane
    || ''
  ).trim();
  const parts = [code, lineType, processLabel].filter(Boolean);
  return parts.join(' - ');
};
const isProductionOrWorkCenter = (record) => {
  const raw = String(
    record?.line_description
      || record?.lineDescription
      || record?.type
      || record?.category
      || record?.name
      || ''
  ).toLowerCase();
  return raw.includes('production line') || raw.includes('work center');
};
const normalizeMaterialType = (value, fallback = 'RAW MATERIAL') => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized.includes('INDIRECT')) return 'INDIRECT MATERIAL';
  if (normalized.includes('RAW')) return 'RAW MATERIAL';
  return fallback;
};
const normalizeBucketKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const bucketAliasPatterns = {
  FG: [
    /\bfg\b/i,
    /\bfinished\s*goods?\b/i,
    /\bbarang\s*jadi\b/i,
    /\bfinal\s*goods?\b/i,
  ],
  SUB_ASSY: [
    /\bsub[-\s]*assy\b/i,
    /\bsub[-\s]*assembly\b/i,
    /\bsubassembly\b/i,
  ],
  CP: [
    /\bcp\b/i,
    /\bchild\s*part\b/i,
    /\bchildpart\b/i,
    /\bcomponent\b/i,
  ],
  RM: [
    /\brm\b/i,
    /\braw\s*material\b/i,
    /\braw\b/i,
    /\bbahan\s*baku\b/i,
  ],
  INDIRECT: [
    /\bindirect\s*material\b/i,
    /\bindirect\b/i,
    /\bim\b/i,
    /\bconsumable\b/i,
  ],
};
const inferBomBucketFromText = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (bucketAliasPatterns.FG.some((pattern) => pattern.test(text))) return 'FG';
  if (bucketAliasPatterns.SUB_ASSY.some((pattern) => pattern.test(text))) return 'SUB_ASSY';
  if (bucketAliasPatterns.CP.some((pattern) => pattern.test(text))) return 'CP';
  if (bucketAliasPatterns.RM.some((pattern) => pattern.test(text))) return 'RM';
  if (bucketAliasPatterns.INDIRECT.some((pattern) => pattern.test(text))) return 'INDIRECT';
  return '';
};

export default function BOMManager({
  apiFetch,
  allowEdit = false,
  refreshMasterData,
  masterPlants = [],
  masterAreas = [],
  masterDeliveries = [],
  masterWarehouses = [],
  masterVendors = [],
  masterCustomers = [],
  itemSupplierMap = new Map(),
  itemCustomerMap = new Map(),
  masterItems = [],
  masterCategories = [],
  masterLocations = [],
  masterPackings = [],
  masterConfig = {},
  masterModels = [],
  masterProcesses = [],
}) {
  const normalizeWithModels = (list) => list.map((item) => ({
    ...item,
    id: item.id || item.code,
    modelCodes: parseModelCodes(item.model),
    processes: Array.isArray(item.process_flow)
      ? item.process_flow
      : Array.isArray(item.processes)
        ? item.processes
        : [],
    processRouting: Array.isArray(item.process_routing)
      ? item.process_routing
      : Array.isArray(item.processRouting)
        ? item.processRouting
        : [],
    lead_time_days: Number(item.lead_time_days || 0),
    cycle_time_seconds: Number(item.cycle_time_seconds || 0),
    supplier: item.supplier_name || item.supplier || '',
    location: item.location_name || item.location || '',
    packing: item.packing_name || item.packing || '',
    line: item.line_production || item.line || '',
  }));
  const [items, setItems] = useState(() => normalizeWithModels(masterItems));
  useEffect(() => {
    setItems(normalizeWithModels(masterItems));
  }, [masterItems]);
  const masterItemsNormalized = useMemo(() => normalizeWithModels(masterItems), [masterItems]);
  const [bomRelations, setBomRelations] = useState([]);
  const [whereUsedCode, setWhereUsedCode] = useState('');

  const pluralize = (count, label) => `${count} ${label}${count === 1 ? '' : 's'}`;
  const SummaryCard = ({ label, primary, secondary }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{primary}</div>
      {secondary && <div className="text-[11px] text-gray-500 leading-snug">{secondary}</div>}
    </div>
  );
  const [localModels, setLocalModels] = useState(() => (Array.isArray(masterModels) ? masterModels : []));
  useEffect(() => {
    setLocalModels(Array.isArray(masterModels) ? masterModels : []);
  }, [masterModels]);
  const categoryNameByCode = useMemo(() => {
    const map = new Map();
    (masterCategories || []).forEach((category) => {
      const code = String(category.code || category.id || '').trim();
      const name = String(category.name || code || '').trim();
      if (code) map.set(code.toLowerCase(), name || code);
      if (name) map.set(name.toLowerCase(), name);
    });
    return map;
  }, [masterCategories]);
  const categoryBucketByKey = useMemo(() => {
    const map = new Map();
    (masterCategories || []).forEach((category) => {
      const code = String(category.code || category.id || '').trim();
      const name = String(category.name || code || '').trim();
      const inferredBucket = inferBomBucketFromText([code, name].filter(Boolean).join(' '));
      if (!inferredBucket) return;
      if (code) map.set(normalizeBucketKey(code), inferredBucket);
      if (name) map.set(normalizeBucketKey(name), inferredBucket);
    });
    return map;
  }, [masterCategories]);
  const customerNameById = useMemo(() => {
    const map = new Map();
    (masterCustomers || []).forEach((customer) => {
      const id = String(customer.id || '').trim();
      const name = String(customer.name || id || '').trim();
      if (id) map.set(id, name || id);
    });
    return map;
  }, [masterCustomers]);
  const resolveCategoryLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return categoryNameByCode.get(raw.toLowerCase()) || raw;
  };
  const bomBucketPatterns = useMemo(() => ({
    fg: [/^fg[-_]/i, /\bfg\b/i, /finished\s*goods?/i, /finish(ed)?/i],
    subAssy: [/^sa[-_]/i, /^sub[-_]/i, /\bsub[- ]?assy\b/i, /\bsubassy\b/i],
    childPart: [/^cp[-_]/i, /\bcp\b/i, /child\s*part/i],
    rawMaterial: [/^rm[-_]/i, /\brm\b/i, /raw\s*material/i, /raw\b/i],
    indirectMaterial: [/^im[-_]/i, /\bim\b/i, /indirect\s*material/i, /indirect\b/i],
  }), []);
  const getBomItemBucket = (item) => {
    const candidates = [
      item?.type,
      item?.category,
      item?.item_category,
      item?.itemCategory,
      item?.category_name,
      item?.categoryName,
      item?.category_code,
      item?.categoryCode,
      resolveCategoryLabel(item?.type),
      resolveCategoryLabel(item?.category),
      item?.code,
    ].filter(Boolean);
    for (const candidate of candidates) {
      const mappedBucket = categoryBucketByKey.get(normalizeBucketKey(candidate));
      if (mappedBucket) return mappedBucket;
    }
    const joinedText = candidates.join(' ');
    const inferredBucket = inferBomBucketFromText(joinedText);
    if (inferredBucket) return inferredBucket;
    return '';
  };
  const bomPickerOptions = useMemo(() => {
    const buckets = {
      FG: [],
      SUB_ASSY: [],
      CP: [],
      RM: [],
      INDIRECT: [],
    };
    (masterItemsNormalized || []).forEach((item) => {
      const bucket = getBomItemBucket(item);
      if (bucket && buckets[bucket]) {
        buckets[bucket].push(item);
      }
    });
    return buckets;
  }, [masterItemsNormalized, categoryBucketByKey, categoryNameByCode]);
  const configuredParentCodes = useMemo(() => {
    const set = new Set();
    (bomRelations || []).forEach((rel) => {
      const parentCode = String(rel.parent_code || rel.parentCode || '').trim();
      if (parentCode) set.add(parentCode);
    });
    return set;
  }, [bomRelations]);
  const modelMap = useMemo(() => buildModelMap(localModels), [localModels]);
  const processMap = useMemo(() => {
    const map = new Map();
    (masterProcesses || []).forEach((proc) => {
      map.set(proc.code, proc);
      map.set(String(proc.code || '').toLowerCase(), proc);
      map.set(String(proc.name || '').toLowerCase(), proc);
    });
    return map;
  }, [masterProcesses]);
  const getProcessScopeValue = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('single')) return 'Single';
    if (normalized.includes('multi')) return 'Multi';
    return 'All';
  };
  const getProcessOptionsForMode = (mode) => {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const targetScope = normalizedMode === 'single'
      ? 'Single'
      : normalizedMode === 'multi'
        ? 'Multi'
        : null;
    return [...(masterProcesses || [])]
      .filter((proc) => {
        if (!targetScope) return true;
        const scope = getProcessScopeValue(proc.applies_to_level || proc.appliesToLevel || 'All');
        return scope === 'All' || scope === targetScope;
      })
      .sort((left, right) => {
        const leftSequence = Number(left?.sequence || 0);
        const rightSequence = Number(right?.sequence || 0);
        if (leftSequence !== rightSequence) return leftSequence - rightSequence;
        return String(left?.code || '').localeCompare(String(right?.code || ''));
      });
  };
  const getProcessDisplayLabel = (proc) => {
    if (!proc) return '';
    const processType = String(proc.process_type || proc.processType || '').trim();
    const parts = [
      processType ? `[${processType}]` : '',
      proc.code,
      proc.name,
      proc.work_center || proc.workCenter,
      proc.sequence !== undefined && proc.sequence !== null ? `Seq ${proc.sequence}` : '',
      proc.standard_time !== undefined && proc.standard_time !== null && proc.standard_time !== '' ? `${proc.standard_time}s` : '',
    ].filter(Boolean);
    return parts.join(' • ');
  };
  const buildProcessRoutingSnapshot = (codes) => (
    (codes || [])
      .map((value, index) => {
        const rawValue = String(value || '').trim();
        if (!rawValue) return null;
        const resolved = processMap.get(rawValue) || processMap.get(rawValue.toLowerCase());
        const code = resolved?.code || rawValue;
        const name = resolved?.name || rawValue;
        return {
          code,
          name,
          processType: String(resolved?.process_type || resolved?.processType || '').trim(),
          appliesToLevel: resolved?.applies_to_level || resolved?.appliesToLevel || 'All',
          workCenter: resolved?.work_center || resolved?.workCenter || '',
          sequence: Number.isFinite(Number(resolved?.sequence)) ? Number(resolved.sequence) : index + 1,
          standardTime: Number.isFinite(Number(resolved?.standard_time ?? resolved?.standardTime))
            ? Number(resolved?.standard_time ?? resolved?.standardTime)
            : 0,
        };
      })
      .filter(Boolean)
  );
  const getProcessNodeLabel = (value) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    const resolved = processMap.get(rawValue) || processMap.get(rawValue.toLowerCase());
    return resolved ? getProcessDisplayLabel(resolved) : rawValue;
  };
  const areaMap = useMemo(() => new Map((masterAreas || []).map((area) => [area.id, area])), [masterAreas]);
  const warehouseMap = useMemo(
    () => new Map((masterWarehouses || []).map((warehouse) => [warehouse.id, warehouse])),
    [masterWarehouses],
  );
  const [viewMode, setViewMode] = useState('tree'); 
  const fileInputRef = useRef(null);
  const planInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  
  // State UI
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State AI
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResultModal, setAiResultModal] = useState({ show: false, content: '', title: '' });
  
  // State Chat
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: 'Halo! Saya asisten produksi. Ada yang bisa dibantu terkait data BOM?' }]);
  const [chatInput, setChatInput] = useState('');

  // State Forecast & Report
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showPRLReport, setShowPRLReport] = useState(false);
  const [productionPlan, setProductionPlan] = useState([]); 
  const [newPlan, setNewPlan] = useState({ fgId: '', qty: 1000, period: 'December 2025' }); // Default sesuai PDF
  const [forecastResult, setForecastResult] = useState(null);
  const showSingleForm = false;
  const todayDateInput = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const formTopRef = useRef(null);
  const parseSubstituteCodes = (value) => {
    const rawList = Array.isArray(value)
      ? value
      : String(value || '').split(/[\n,;]+/g);
    const seen = new Set();
    return rawList
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .filter((entry) => {
        const key = entry.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };
  const formatSubstituteCodes = (value) => parseSubstituteCodes(value).join(', ');
  const normalizeBomHeaderState = (overrides = {}) => ({
    parentCode: '',
    bomVersion: '',
    revisionNo: 1,
    effectiveStartDate: todayDateInput,
    effectiveEndDate: '',
    reference: '',
    headerId: null,
    ...overrides,
  });

  // State Input
  const getDefaultNewItem = (overrides = {}) => ({
    parentId: '',
    code: '',
    partNo: '',
    name: '',
    type: 'RAW MATERIAL',
    qty: 1,
    uom: 'PCS',
    weight: 0,
    scrap: 0,
    leadTime: 0,
    line: '',
    supplier: '',
    customer: '',
    organization: '',
    location: '',
    category: '',
    processes: [''],
    cycleTime: 0,
    packing: '',
    modelCodes: [],
    note: '',
    yieldFactor: 1,
    positionCode: '',
    substituteCodesText: '',
    ...overrides,
  });
  const [newItem, setNewItem] = useState(() => getDefaultNewItem());
  const [selectedParent, setSelectedParent] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null);
  const createBulkMaterial = (type = 'RAW MATERIAL') => ({
    id: `${Date.now()}-${Math.random()}`,
    code: '',
    name: '',
    uom: 'PCS',
    qty: 1,
    scrap: 0,
    yieldFactor: 1,
    positionCode: '',
    substituteCodesText: '',
    type: normalizeMaterialType(type),
    isExisting: false,
    originalCode: '',
  });
  const createBulkParentDetails = () => ({
    line: '',
    supplier: '',
    customer: '',
    location: '',
    packing: '',
    cycleTime: 0,
    modelCodes: [''],
    processCodes: [''],
    note: '',
  });
  const createBulkChild = () => ({
    id: `${Date.now()}-${Math.random()}`,
    code: '',
    name: '',
    type: 'CP',
    uom: 'PCS',
    qty: 1,
    scrap: 0,
    weight: 0,
    leadTime: 0,
    line: '',
    supplier: '',
    customer: '',
    location: '',
    packing: '',
    cycleTime: 0,
    modelCodes: [''],
    processCodes: [''],
    note: '',
    yieldFactor: 1,
    positionCode: '',
    substituteCodesText: '',
    materials: [createBulkMaterial()],
  });
  const [bulkMode, setBulkMode] = useState('multi');
  const [bulkParentCode, setBulkParentCode] = useState('');
  const [bulkParentDetails, setBulkParentDetails] = useState(() => createBulkParentDetails());
  const [bulkParentMaterials, setBulkParentMaterials] = useState([createBulkMaterial()]);
  const [bulkChildren, setBulkChildren] = useState([createBulkChild()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [revisionAuditParentCode, setRevisionAuditParentCode] = useState('');
  const [revisionAuditHeaderId, setRevisionAuditHeaderId] = useState('');
  const [treeRevisionMode, setTreeRevisionMode] = useState('active');
  const bomProcessOptionsForMode = useMemo(
    () => getProcessOptionsForMode(bulkMode),
    [masterProcesses, bulkMode],
  );
  const bomProcessOptionsAll = useMemo(
    () => getProcessOptionsForMode('all'),
    [masterProcesses],
  );

  const [bomHeader, setBomHeader] = useState(() => normalizeBomHeaderState());
  const [bomLines, setBomLines] = useState([
    { childCode: '', description: '' },
  ]);
  const [bomSaving, setBomSaving] = useState(false);

  const syncMasterRefContext = async ({ refreshBom = true } = {}) => {
    if (typeof refreshMasterData === 'function') {
      await refreshMasterData();
    }
    if (refreshBom) {
      await refreshBomRelations();
    }
  };

  // --- HANDLER PROCESSES DINAMIS ---
  const handleProcessChange = (index, value) => {
    const updated = [...newItem.processes];
    updated[index] = value;
    setNewItem({ ...newItem, processes: updated });
  };
  const addProcessField = () => setNewItem({ ...newItem, processes: [...newItem.processes, ''] });
  const removeProcessField = (index) => {
    const updated = newItem.processes.filter((_, i) => i !== index);
    setNewItem({ ...newItem, processes: updated });
  };

  const resetNewItem = (overrides = {}) => {
    setNewItem(getDefaultNewItem(overrides));
  };

  const handleSelectParent = (parent) => {
    const parentCode = parent?.code || '';
    setEditingRelation(null);
    setSelectedParent(parent ? { code: parent.code, name: parent.name, type: parent.type } : null);
    resetNewItem({ parentId: parentCode, type: parent ? 'RAW MATERIAL' : 'FG' });
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleParentSelectChange = (value) => {
    const codeValue = String(value || '').trim();
    if (!codeValue) {
      setSelectedParent(null);
      setEditingRelation(null);
      setNewItem((prev) => ({ ...prev, parentId: '', type: 'FG' }));
      return;
    }
    const parentItem = masterItemsByCode.get(codeValue) || itemsByCode.get(codeValue) || items.find((item) => item.code === codeValue);
    setSelectedParent(
      parentItem
        ? { code: parentItem.code, name: parentItem.name, type: parentItem.type }
        : { code: codeValue, name: codeValue, type: '' },
    );
    setNewItem((prev) => ({
      ...prev,
      parentId: codeValue,
      type: 'RAW MATERIAL',
    }));
  };

  const handleAddRoot = () => {
    handleSelectParent(null);
  };

  const handleEditRelation = (node) => {
    if (!node?.relation) return;
    const relation = node.relation;
    const parentItem = masterItemsByCode.get(relation.parent_code) || itemsByCode.get(relation.parent_code) || items.find((item) => item.code === relation.parent_code);
    const item = masterItemsByCode.get(node.code) || itemsByCode.get(node.code) || {};
    const modelCodes = parseModelCodes(item.model || relation.child_model || '');
    const processFlow = Array.isArray(item.process_flow) && item.process_flow.length
      ? item.process_flow
      : Array.isArray(item.processes) && item.processes.length
        ? item.processes
        : Array.isArray(relation.process_flow) && relation.process_flow.length
          ? relation.process_flow
          : [''];
    const relationType = String(relation.component_type || relation.child_type || item.type || '').trim();
    setSelectedParent(
      parentItem
        ? { code: parentItem.code, name: parentItem.name, type: parentItem.type }
        : { code: relation.parent_code, name: relation.parent_code, type: '' },
    );
    setEditingRelation({
      id: relation.id,
      parentCode: relation.parent_code,
      childCode: relation.child_code,
    });
    setBomHeader(normalizeBomHeaderState({
      parentCode: relation.parent_code,
      bomVersion: relation.bom_version || '',
      revisionNo: Number(relation.revision_no || 1) || 1,
      effectiveStartDate: relation.effective_start_date || relation.effective_date || todayDateInput,
      effectiveEndDate: relation.effective_end_date || '',
      reference: relation.reference || '',
      headerId: relation.header_id || null,
    }));
    setWhereUsedCode(node.code || relation.child_code || '');
    setIsFormOpen(true);
    setNewItem(
      getDefaultNewItem({
        parentId: relation.parent_code,
        code: node.code,
        partNo: item.part_no || '',
        name: item.name || relation.child_name || node.name || '',
        type: relationType,
        uom: item.unit || item.uom || relation.child_unit || '',
        weight: Number(item.weight || 0),
        leadTime: Number(item.lead_time_days || relation.lead_time_days || 0),
        cycleTime: Number(item.cycle_time_seconds || relation.cycle_time_seconds || 0),
        processes: mapProcessFlowToCodes(processFlow),
        modelCodes,
        qty: Number(relation.quantity || 1),
        scrap: Number(relation.scrap_factor || 0),
        note: relation.assembly_note || '',
        yieldFactor: Number(relation.yield_factor || 1),
        positionCode: relation.position_code || '',
        substituteCodesText: formatSubstituteCodes(relation.substitute_material_codes || []),
        line: item.line_production || item.line || '',
        supplier: item.supplier_name || item.supplier || '',
        customer: getItemCustomerLabel(item.code || relation.child_code || node.code || ''),
        location: item.location_name || item.location || '',
        packing: item.packing_name || item.packing || '',
      }),
    );
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // --- LOGIC SEARCH & FILTER ---
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(i => 
      String(i.code || '').toLowerCase().includes(lower) ||
      String(i.name || '').toLowerCase().includes(lower) ||
      String(i.model || '').toLowerCase().includes(lower) ||
      String(i.supplier || '').toLowerCase().includes(lower) ||
      String(i.category || '').toLowerCase().includes(lower) ||
      String(i.location || '').toLowerCase().includes(lower) ||
      String(i.customer || '').toLowerCase().includes(lower)
    );
  }, [items, searchTerm]);

  const isBomHeaderActiveOnDate = (headerMeta, dateValue = todayDateInput) => {
    const targetDate = String(dateValue || '').trim();
    const startDate = String(headerMeta?.effective_start_date || headerMeta?.effectiveStartDate || '').trim();
    const endDate = String(headerMeta?.effective_end_date || headerMeta?.effectiveEndDate || '').trim();
    if (startDate && startDate > targetDate) return false;
    if (endDate && endDate < targetDate) return false;
    return true;
  };
  const compareBomHeaderPriority = (left, right) => {
    const leftRevision = Number(left?.revision_no ?? left?.revisionNo ?? 0);
    const rightRevision = Number(right?.revision_no ?? right?.revisionNo ?? 0);
    if (leftRevision !== rightRevision) return rightRevision - leftRevision;
    const leftStart = String(left?.effective_start_date || left?.effectiveStartDate || '');
    const rightStart = String(right?.effective_start_date || right?.effectiveStartDate || '');
    if (leftStart !== rightStart) return rightStart.localeCompare(leftStart);
    const leftCreated = String(left?.header_created_at || left?.created_at || '');
    const rightCreated = String(right?.header_created_at || right?.created_at || '');
    if (leftCreated !== rightCreated) return rightCreated.localeCompare(leftCreated);
    return Number(right?.header_id || right?.id || 0) - Number(left?.header_id || left?.id || 0);
  };
  const pickBomHeaderMeta = (rows = [], preferredDate = todayDateInput) => {
    if (!Array.isArray(rows) || rows.length === 0) return normalizeBomHeaderState();
    const activeRows = rows.filter((row) => isBomHeaderActiveOnDate(row, preferredDate));
    const source = activeRows.length > 0 ? activeRows : rows;
    const sorted = [...source].sort(compareBomHeaderPriority);
    const row = sorted[0] || {};
    return normalizeBomHeaderState({
      parentCode: row.parent_code || '',
      bomVersion: row.bom_version || '',
      revisionNo: Number(row.revision_no || 1) || 1,
      effectiveStartDate: row.effective_start_date || row.effective_date || todayDateInput,
      effectiveEndDate: row.effective_end_date || '',
      reference: row.reference || '',
      headerId: row.header_id || null,
    });
  };
  const bomHeaderRowsByParent = useMemo(() => {
    const map = new Map();
    (bomRelations || []).forEach((relation) => {
      const parentCode = String(relation.parent_code || '').trim();
      if (!parentCode) return;
      if (!map.has(parentCode)) map.set(parentCode, []);
      map.get(parentCode).push(relation);
    });
    return map;
  }, [bomRelations]);
  const activeBomRelations = useMemo(() => {
    const rows = [];
    bomHeaderRowsByParent.forEach((relationsForParent) => {
      const targetHeader = pickBomHeaderMeta(relationsForParent, todayDateInput);
      const headerId = Number(targetHeader.headerId || 0);
      if (headerId > 0) {
        rows.push(...relationsForParent.filter((relation) => Number(relation.header_id || 0) === headerId));
      }
    });
    return rows;
  }, [bomHeaderRowsByParent, todayDateInput]);
  const parentOptionsSingle = useMemo(() => bomPickerOptions.FG, [bomPickerOptions]);
  const parentOptionsMulti = useMemo(() => bomPickerOptions.SUB_ASSY, [bomPickerOptions]);
  const childPartOptions = useMemo(() => bomPickerOptions.CP, [bomPickerOptions]);
  const rawMaterialOptions = useMemo(() => bomPickerOptions.RM, [bomPickerOptions]);
  const indirectMaterialOptions = useMemo(() => bomPickerOptions.INDIRECT, [bomPickerOptions]);

  const getItemByCode = (code) => masterItems.find((item) => item.code === code);

  const updateBomLine = (index, field, value) => {
    setBomLines((prev) => {
      const next = [...prev];
      const current = next[index] || { childCode: '', description: '' };
      next[index] = { ...current, [field]: value };
      return next;
    });
  };

  const handleBomChildChange = (index, value) => {
    const selected = getItemByCode(value);
    setBomLines((prev) => {
      const next = [...prev];
      const current = next[index] || { childCode: '', description: '' };
      next[index] = {
        ...current,
        childCode: value,
        description: selected?.name || '',
      };
      return next;
    });
  };

  const handleAddBomLine = () => {
    setBomLines((prev) => [...prev, { childCode: '', description: '' }]);
  };

  const handleRemoveBomLine = (index) => {
    setBomLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBom = async (event) => {
    event.preventDefault();
    const parentCode = String(bomHeader.parentCode || '').trim();
    if (!parentCode) {
      alert('Parent Item wajib diisi.');
      return;
    }
    const validLines = bomLines.filter((line) => String(line.childCode || '').trim());
    if (validLines.length === 0) {
      alert('Minimal 1 komponen harus diisi.');
      return;
    }
    const payload = {
      parentCode,
      bomVersion: String(bomHeader.bomVersion || '').trim(),
      revisionNo: Number(bomHeader.revisionNo) || 1,
      effectiveStartDate: String(bomHeader.effectiveStartDate || '').trim(),
      effectiveEndDate: String(bomHeader.effectiveEndDate || '').trim(),
      reference: String(bomHeader.reference || '').trim(),
      lines: validLines.map((line) => ({
        childCode: String(line.childCode || '').trim(),
        description: String(line.description || '').trim(),
      })),
    };
    if (!apiFetch) {
      alert('API belum tersedia untuk menyimpan BOM.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
      return;
    }
    setBomSaving(true);
    try {
      await apiFetch('/api/bom/headers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setBomHeader(normalizeBomHeaderState());
      setBomLines([{ childCode: '', description: '' }]);
      await syncMasterRefContext();
      alert('BOM berhasil disimpan.');
    } catch (error) {
      alert(`Gagal menyimpan BOM: ${error.message || 'Unknown error'}`);
    } finally {
      setBomSaving(false);
    }
  };

  const refreshBomRelations = async () => {
    if (!apiFetch) return;
    setBomLoading(true);
    try {
      const data = await apiFetch('/api/bom');
      setBomRelations(Array.isArray(data) ? data : []);
    } catch (error) {
      setBomRelations([]);
    } finally {
      setBomLoading(false);
    }
  };

  const handleResetAllBom = async () => {
    if (!apiFetch) {
      alert('API belum tersedia untuk reset BOM.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
      return;
    }
    const confirmed = window.confirm('Semua BOM akan dihapus. Lanjutkan reset total?');
    if (!confirmed) return;
    try {
      await apiFetch('/api/bom/reset-all', { method: 'DELETE' });
      setBulkParentCode('');
      setBulkParentMaterials([createBulkMaterial()]);
      setBulkChildren([createBulkChild()]);
      setEditingRelation(null);
      await refreshBomRelations();
      await syncMasterRefContext();
      alert('Semua BOM berhasil dihapus.');
    } catch (error) {
      alert(`Gagal reset BOM: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    refreshBomRelations();
  }, [apiFetch]);

  useEffect(() => { if (searchTerm) setViewMode('table'); }, [searchTerm]);

  useEffect(() => {
    if (bulkMode !== 'single') return;
    if (!bulkParentCode) return;
    if (!isBulkMaterialListBlank(bulkParentMaterials)) return;
    const derived = deriveParentMaterialsFromRelations(bulkParentCode);
    if (isBulkMaterialListBlank(derived)) return;
    setBulkParentMaterials(derived);
  }, [bulkMode, bulkParentCode, activeBomRelations, bulkParentMaterials]);

  useEffect(() => {
    const preferredParentCode = String(
      bulkParentCode
      || selectedParent?.code
      || bomHeader.parentCode
      || revisionAuditParentCode
      || ''
    ).trim();
    if (!preferredParentCode) return;
    if (preferredParentCode !== revisionAuditParentCode) {
      setRevisionAuditParentCode(preferredParentCode);
    }
  }, [bulkParentCode, selectedParent, bomHeader.parentCode, revisionAuditParentCode]);

  // --- HELPERS UMUM ---
  const handleDuplicate = (item) => {
    const newId = Date.now().toString();
    const duplicatedModelCodes = item.modelCodes ? [...item.modelCodes] : [];
    const duplicated = {
      ...item,
      id: newId,
      code: `${item.code}-COPY`,
      name: `${item.name} (Copy)`,
      modelCodes: duplicatedModelCodes,
      model: joinModelCodes(duplicatedModelCodes),
    };
    setItems(prev => [...prev, duplicated]);
  };

  const handleDelete = (id) => {
    const ids = [id];
    const findCh = (pid) => items.forEach(i => { if(i.parentId===pid) { ids.push(i.id); findCh(i.id); }});
    findCh(id);
    setItems(items.filter(i => !ids.includes(i.id)));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const codeValue = String(newItem.code || '').trim();
    const nameValue = String(newItem.name || '').trim();
    const typeValue = String(newItem.type || '').trim();
    const unitValue = String(newItem.uom || '').trim();
    if (!codeValue || !nameValue || !typeValue || !unitValue) {
      alert('Kode, Nama, Tipe, dan Satuan wajib diisi.');
      return;
    }
    const parentCode = selectedParent?.code || newItem.parentId || '';
    if (parentCode && parentCode === codeValue) {
      alert('Parent dan Child tidak boleh sama.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
      return;
    }
    const cleanedProcesses = newItem.processes.filter(p => p.trim() !== '');
    const mappedProcessCodes = mapProcessFlowToCodes(cleanedProcesses);
    const processFlowPayload = mappedProcessCodes.length ? mappedProcessCodes : cleanedProcesses;
    const modelCodes = (newItem.modelCodes || [])
      .map((code) => String(code || '').trim())
      .filter(Boolean);
    const modelValue = joinModelCodes(modelCodes);
    const existingItem = masterItemsByCode.get(codeValue);
    if (!existingItem) {
      alert('Kode item belum ada di Master Ref Item. Daftarkan item terlebih dahulu.');
      return;
    }
    setItemSaving(true);
    try {
      if (apiFetch) {
        if (parentCode) {
          await upsertBomRelation({
            relationId: editingRelation?.id || null,
            parentCode,
            childCode: codeValue,
            quantity: Number(newItem.qty) || 1,
            scrapFactor: Number(newItem.scrap) || 0,
            yieldFactor: Number(newItem.yieldFactor) || 1,
            positionCode: String(newItem.positionCode || '').trim(),
            substituteMaterialCodes: parseSubstituteCodes(newItem.substituteCodesText),
            componentType: typeValue,
            componentDescription: nameValue,
            modelSpec: modelValue || '',
            assemblyNote: String(newItem.note || '').trim(),
            processFlow: processFlowPayload,
            processRouting: buildProcessRoutingSnapshot(processFlowPayload),
            headerMeta: bomHeader,
            mergeOnDuplicate: !editingRelation?.id,
          });
        }
        await refreshBomRelations();
      } else if (parentCode) {
        setBomRelations((prev) => {
          const next = editingRelation?.id
            ? prev.map((row) =>
                row.id === editingRelation.id
                  ? {
                      ...row,
                      parent_code: parentCode,
                      child_code: codeValue,
                      quantity: Number(newItem.qty) || 1,
                      scrap_factor: Number(newItem.scrap) || 0,
                      assembly_note: String(newItem.note || '').trim(),
                    }
                  : row,
              )
            : [
                ...prev,
                {
                  parent_code: parentCode,
                  child_code: codeValue,
                  quantity: Number(newItem.qty) || 1,
                  scrap_factor: Number(newItem.scrap) || 0,
                  assembly_note: String(newItem.note || '').trim(),
                },
              ];
          return next;
        });
      }
      setEditingRelation(null);
      resetNewItem({ parentId: parentCode, type: parentCode ? 'RAW MATERIAL' : 'FG' });
    } catch (error) {
      alert(`Gagal menyimpan: ${error.message || 'Unknown error'}`);
    } finally {
      setItemSaving(false);
    }
  };

  const addModelRow = () => {
    setNewItem((prev) => {
      const current = Array.isArray(prev.modelCodes) && prev.modelCodes.length ? prev.modelCodes : [''];
      return { ...prev, modelCodes: [...current, ''] };
    });
  };

  const removeModelRow = (index) => {
    setNewItem((prev) => {
      const current = Array.isArray(prev.modelCodes) ? prev.modelCodes : [];
      const next = current.filter((_, idx) => idx !== index);
      return { ...prev, modelCodes: next };
    });
  };

  const updateModelRow = (index, value) => {
    const trimmed = String(value || '').trim();
    setNewItem((prev) => {
      const current = Array.isArray(prev.modelCodes) ? prev.modelCodes : [];
      const next = [...current];
      next[index] = trimmed;
      const seen = new Set();
      const deduped = next.map((entry) => {
        if (!entry) return '';
        if (seen.has(entry)) return '';
        seen.add(entry);
        return entry;
      });
      return { ...prev, modelCodes: deduped };
    });
  };

  const handleCreateModel = async (index) => {
    const codeInput = window.prompt('Kode model baru?');
    if (!codeInput) return;
    const code = codeInput.trim();
    if (!code) return;
    const nameInput = window.prompt('Nama model?') || code;
    const payload = { code, name: String(nameInput).trim() || code };
    try {
      let created = payload;
      if (apiFetch) {
        created = await apiFetch('/api/master/models', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setLocalModels((prev) => {
        const exists = prev.some((model) => String(model.code || '').toLowerCase() === String(created.code || payload.code).toLowerCase());
        if (exists) return prev;
        return [...prev, { code: created.code || payload.code, name: created.name || payload.name }];
      });
      setNewItem((prev) => {
        const current = Array.isArray(prev.modelCodes) ? prev.modelCodes : [];
        const next = [...current];
        const codeValue = created.code || payload.code;
        if (Number.isInteger(index)) {
          next[index] = codeValue;
        } else {
          next.push(codeValue);
        }
        return { ...prev, modelCodes: next };
      });
    } catch (error) {
      alert(`Gagal menambah model: ${error.message || 'Unknown error'}`);
    }
  };

  const handleModelSelectChange = (index, value) => {
    if (value === '__new__') {
      handleCreateModel(index);
      return;
    }
    updateModelRow(index, value);
  };

  const handleItemCodeBlur = () => {
    const codeValue = String(newItem.code || '').trim();
    if (!codeValue) return;
    const existing = masterItemsByCode.get(codeValue);
    setWhereUsedCode(codeValue);
    if (!existing) return;
    const parsedModels = parseModelCodes(existing.model || '');
    setNewItem((prev) => ({
      ...prev,
      code: existing.code,
      partNo: existing.part_no || prev.partNo,
      name: existing.name || prev.name,
      type: existing.type || prev.type,
      uom: existing.unit || existing.uom || prev.uom,
      weight: Number(existing.weight || prev.weight || 0),
      modelCodes: parsedModels.length ? parsedModels : prev.modelCodes,
      leadTime: Number(existing.lead_time_days || prev.leadTime || 0),
      cycleTime: Number(existing.cycle_time_seconds || prev.cycleTime || 0),
      processes: Array.isArray(existing.process_flow) && existing.process_flow.length
        ? mapProcessFlowToCodes(existing.process_flow)
        : Array.isArray(existing.processes) && existing.processes.length
          ? mapProcessFlowToCodes(existing.processes)
          : prev.processes,
      line: existing.line_production || existing.line || prev.line,
      supplier: existing.supplier_name || existing.supplier || prev.supplier,
      customer: getItemCustomerLabel(existing.code) || prev.customer,
      location: existing.location_name || existing.location || prev.location,
      packing: existing.packing_name || existing.packing || prev.packing,
    }));
  };

  const mapProcessFlowToCodes = (processFlow) => (
    (processFlow || [])
      .map((step) => {
        const stepValue = String(step || '').trim();
        if (!stepValue) return '';
        const match = (masterProcesses || []).find((proc) => (
          String(proc.code || '').toLowerCase() === stepValue.toLowerCase()
          || String(proc.name || '').toLowerCase() === stepValue.toLowerCase()
        ));
        return match ? match.code : '';
      })
      .filter(Boolean)
  );

  const updateBulkParentDetails = (patch) => {
    setBulkParentDetails((prev) => ({ ...prev, ...patch }));
  };

  const isBulkMaterialListBlank = (list) => (
    (list || []).every((material) => !String(material?.code || '').trim() && !String(material?.name || '').trim())
  );

  const isRawMaterialRelation = (rel) => {
    const typeValue = String(rel.component_type || rel.child_type || '').toLowerCase();
    const normalized = typeValue.replace(/[^a-z0-9]/g, '');
    const isRawByRelation = typeValue.includes('raw') || normalized === 'rm' || normalized.startsWith('rm');
    if (isRawByRelation) return true;
    const childCode = String(rel.child_code || rel.childCode || '').trim();
    const childType = String(itemsByCode.get(childCode)?.type || '').toLowerCase();
    const childNormalized = childType.replace(/[^a-z0-9]/g, '');
    return childType.includes('raw') || childNormalized === 'rm' || childNormalized.startsWith('rm');
  };

  const getExistingMaterialCodesForParent = (parentCode) => {
    const normalizedCode = String(parentCode || '').trim();
    const set = new Set();
    if (!normalizedCode) return set;
    (activeBomRelations || [])
      .filter((rel) => String(rel.parent_code || rel.parentCode || '').trim() === normalizedCode)
      .filter(isRawMaterialRelation)
      .forEach((rel) => {
        const code = String(rel.child_code || rel.childCode || '').trim();
        if (code) set.add(code.toUpperCase());
      });
    return set;
  };

  const deriveParentMaterialsFromRelations = (parentCode) => {
    const normalizedCode = String(parentCode || '').trim();
    if (!normalizedCode) return [createBulkMaterial()];
    const materials = (activeBomRelations || [])
      .filter((rel) => String(rel.parent_code || rel.parentCode || '').trim() === normalizedCode)
      .filter(isRawMaterialRelation)
      .map((rel) => ({
        id: rel.id ? `rel-${rel.id}` : `${Date.now()}-${Math.random()}`,
        code: rel.child_code || rel.childCode || '',
        name: rel.child_name || rel.component_description || '',
        uom: rel.child_unit || rel.uom || 'PCS',
        qty: Number(rel.quantity) || 1,
        scrap: Number(rel.scrap_factor) || 0,
        yieldFactor: Number(rel.yield_factor || 1) || 1,
        positionCode: rel.position_code || '',
        substituteCodesText: formatSubstituteCodes(rel.substitute_material_codes || []),
        isExisting: true,
        originalCode: rel.child_code || rel.childCode || '',
      }));
    return materials.length ? materials : [createBulkMaterial()];
  };

  const addBulkParentMaterial = () => {
    setBulkParentMaterials((prev) => [...prev, createBulkMaterial()]);
  };

  const updateBulkParentMaterial = (materialIndex, patch) => {
    setBulkParentMaterials((prev) => {
      const next = [...prev];
      next[materialIndex] = { ...next[materialIndex], ...patch };
      return next;
    });
  };

  const removeBulkParentMaterial = (materialIndex) => {
    setBulkParentMaterials((prev) => {
      const next = prev.filter((_, idx) => idx !== materialIndex);
      return next.length > 0 ? next : [createBulkMaterial()];
    });
  };

  const addBulkParentProcess = () => {
    setBulkParentDetails((prev) => ({
      ...prev,
      processCodes: [...(prev.processCodes || []), ''],
    }));
  };

  const updateBulkParentProcess = (processIndex, value) => {
    const trimmed = String(value || '').trim();
    setBulkParentDetails((prev) => {
      const list = [...(prev.processCodes || [])];
      list[processIndex] = trimmed;
      return { ...prev, processCodes: list };
    });
  };

  const removeBulkParentProcess = (processIndex) => {
    setBulkParentDetails((prev) => {
      const next = (prev.processCodes || []).filter((_, idx) => idx !== processIndex);
      return { ...prev, processCodes: next.length > 0 ? next : [''] };
    });
  };

  const addBulkParentModelRow = () => {
    setBulkParentDetails((prev) => ({
      ...prev,
      modelCodes: [...(prev.modelCodes || ['']), ''],
    }));
  };

  const removeBulkParentModelRow = (modelIndex) => {
    setBulkParentDetails((prev) => {
      const next = (prev.modelCodes || []).filter((_, idx) => idx !== modelIndex);
      return { ...prev, modelCodes: next.length > 0 ? next : [''] };
    });
  };

  const updateBulkParentModelRow = (modelIndex, value) => {
    const trimmed = String(value || '').trim();
    setBulkParentDetails((prev) => {
      const list = [...(prev.modelCodes || [])];
      list[modelIndex] = trimmed;
      const seen = new Set();
      const deduped = list.map((entry) => {
        if (!entry) return '';
        if (seen.has(entry)) return '';
        seen.add(entry);
        return entry;
      });
      return { ...prev, modelCodes: deduped };
    });
  };

  const updateBulkChild = (index, patch) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const updateBulkMaterial = (childIndex, materialIndex, patch) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      const materials = [...(child.materials || [])];
      materials[materialIndex] = { ...materials[materialIndex], ...patch };
      child.materials = materials;
      next[childIndex] = child;
      return next;
    });
  };

  const addBulkChild = () => {
    setBulkChildren((prev) => [...prev, createBulkChild()]);
  };

  const removeBulkChild = (index) => {
    setBulkChildren((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addBulkMaterial = (childIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.materials = [...(child.materials || []), createBulkMaterial()];
      next[childIndex] = child;
      return next;
    });
  };

  const removeBulkMaterial = (childIndex, materialIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.materials = (child.materials || []).filter((_, idx) => idx !== materialIndex);
      if (child.materials.length === 0) child.materials = [createBulkMaterial()];
      next[childIndex] = child;
      return next;
    });
  };

  const addBulkProcess = (childIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.processCodes = [...(child.processCodes || []), ''];
      next[childIndex] = child;
      return next;
    });
  };

  const updateBulkProcess = (childIndex, processIndex, value) => {
    const trimmed = String(value || '').trim();
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      const list = [...(child.processCodes || [])];
      list[processIndex] = trimmed;
      child.processCodes = list;
      next[childIndex] = child;
      return next;
    });
  };

  const removeBulkProcess = (childIndex, processIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.processCodes = (child.processCodes || []).filter((_, idx) => idx !== processIndex);
      if (child.processCodes.length === 0) child.processCodes = [''];
      next[childIndex] = child;
      return next;
    });
  };

  const addBulkModelRow = (childIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.modelCodes = [...(child.modelCodes || ['']), ''];
      next[childIndex] = child;
      return next;
    });
  };

  const removeBulkModelRow = (childIndex, modelIndex) => {
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      child.modelCodes = (child.modelCodes || []).filter((_, idx) => idx !== modelIndex);
      if (child.modelCodes.length === 0) child.modelCodes = [''];
      next[childIndex] = child;
      return next;
    });
  };

  const updateBulkModelRow = (childIndex, modelIndex, value) => {
    const trimmed = String(value || '').trim();
    setBulkChildren((prev) => {
      const next = [...prev];
      const child = { ...next[childIndex] };
      const list = [...(child.modelCodes || [])];
      list[modelIndex] = trimmed;
      const seen = new Set();
      child.modelCodes = list.map((entry) => {
        if (!entry) return '';
        if (seen.has(entry)) return '';
        seen.add(entry);
        return entry;
      });
      next[childIndex] = child;
      return next;
    });
  };

  const handleCreateModelForChild = async (childIndex, modelIndex) => {
    const codeInput = window.prompt('Kode model baru?');
    if (!codeInput) return;
    const code = codeInput.trim();
    if (!code) return;
    const nameInput = window.prompt('Nama model?') || code;
    const payload = { code, name: String(nameInput).trim() || code };
    try {
      let created = payload;
      if (apiFetch) {
        created = await apiFetch('/api/master/models', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setLocalModels((prev) => {
        const exists = prev.some((model) => String(model.code || '').toLowerCase() === String(created.code || payload.code).toLowerCase());
        if (exists) return prev;
        return [...prev, { code: created.code || payload.code, name: created.name || payload.name }];
      });
      updateBulkModelRow(childIndex, modelIndex, created.code || payload.code);
    } catch (error) {
      alert(`Gagal menambah model: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateModelForParent = async (modelIndex) => {
    const codeInput = window.prompt('Kode model baru?');
    if (!codeInput) return;
    const code = codeInput.trim();
    if (!code) return;
    const nameInput = window.prompt('Nama model?') || code;
    const payload = { code, name: String(nameInput).trim() || code };
    try {
      let created = payload;
      if (apiFetch) {
        created = await apiFetch('/api/master/models', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setLocalModels((prev) => {
        const exists = prev.some((model) => String(model.code || '').toLowerCase() === String(created.code || payload.code).toLowerCase());
        if (exists) return prev;
        return [...prev, { code: created.code || payload.code, name: created.name || payload.name }];
      });
      updateBulkParentModelRow(modelIndex, created.code || payload.code);
    } catch (error) {
      alert(`Gagal menambah model: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBulkModelSelectChange = (childIndex, modelIndex, value) => {
    if (value === '__new__') {
      handleCreateModelForChild(childIndex, modelIndex);
      return;
    }
    updateBulkModelRow(childIndex, modelIndex, value);
  };

  const handleBulkParentModelSelectChange = (modelIndex, value) => {
    if (value === '__new__') {
      handleCreateModelForParent(modelIndex);
      return;
    }
    updateBulkParentModelRow(modelIndex, value);
  };

  const handleBulkChildCodeBlur = (index) => {
    const child = bulkChildren[index];
    if (!child) return;
    const codeValue = String(child.code || '').trim();
    if (!codeValue) return;
    const existing = masterItemsByCode.get(codeValue);
    if (!existing) return;
    if (getBomItemBucket(existing) !== 'CP') {
      alert('Child Part hanya boleh memilih item kategori CP.');
      updateBulkChild(index, {
        code: '',
        name: '',
        uom: 'PCS',
        type: 'CP',
      });
      return;
    }
    const parsedModels = parseModelCodes(existing.model || '');
    const existingProcessFlow = Array.isArray(existing.process_flow) && existing.process_flow.length
      ? existing.process_flow
      : Array.isArray(existing.processes) && existing.processes.length
        ? existing.processes
        : [];
    const processCodes = mapProcessFlowToCodes(existingProcessFlow);
    updateBulkChild(index, {
      code: existing.code,
      name: existing.name || child.name,
      uom: existing.unit || existing.uom || child.uom,
      type: 'CP',
      weight: Number(existing.weight || child.weight || 0),
      leadTime: Number(existing.lead_time_days || child.leadTime || 0),
      cycleTime: Number(existing.cycle_time_seconds || child.cycleTime || 0),
      line: existing.line_production || existing.line || child.line,
      supplier: existing.supplier_name || existing.supplier || child.supplier,
      customer: getItemCustomerLabel(existing.code) || child.customer,
      location: existing.location_name || existing.location || child.location,
      packing: existing.packing_name || existing.packing || child.packing,
      modelCodes: parsedModels.length ? parsedModels : child.modelCodes,
      processCodes: processCodes.length ? processCodes : child.processCodes,
    });
  };

  const hydrateBulkParentDetails = (codeValue) => {
    const normalizedCode = String(codeValue || '').trim();
    if (!normalizedCode) return;
    const existing = masterItemsByCode.get(normalizedCode);
    if (!existing) return;
    const parsedModels = parseModelCodes(existing.model || '');
    const existingProcessFlow = Array.isArray(existing.process_flow) && existing.process_flow.length
      ? existing.process_flow
      : Array.isArray(existing.processes) && existing.processes.length
        ? existing.processes
        : [];
    const processCodes = mapProcessFlowToCodes(existingProcessFlow);
    setBulkParentDetails((prev) => ({
      ...prev,
      line: existing.line_production || existing.line || prev.line,
      supplier: existing.supplier_name || existing.supplier || prev.supplier,
      customer: getItemCustomerLabel(existing.code) || existing.customer || prev.customer,
      location: existing.location_name || existing.location || prev.location,
      packing: existing.packing_name || existing.packing || prev.packing,
      cycleTime: Number(existing.cycle_time_seconds || prev.cycleTime || 0),
      modelCodes: parsedModels.length ? parsedModels : prev.modelCodes,
      processCodes: processCodes.length ? processCodes : prev.processCodes,
    }));
  };

  const syncBomHeaderForParent = (parentCode, overrides = {}) => {
    const normalizedCode = String(parentCode || '').trim();
    if (!normalizedCode) {
      setBomHeader(normalizeBomHeaderState(overrides));
      return;
    }
    const matchedRows = bomHeaderRowsByParent.get(normalizedCode) || [];
    const pickedHeader = pickBomHeaderMeta(matchedRows, todayDateInput);
    setBomHeader(normalizeBomHeaderState({
      ...pickedHeader,
      parentCode: normalizedCode,
      ...overrides,
    }));
  };

  const handleBulkParentSelectChange = (value) => {
    const codeValue = String(value || '').trim();
    setBulkParentCode(codeValue);
    syncBomHeaderForParent(codeValue, { parentCode: codeValue });
    if (bulkMode === 'single') {
      hydrateBulkParentDetails(codeValue);
      setBulkParentMaterials(deriveParentMaterialsFromRelations(codeValue));
    }
  };

  const openSingleLevelBomEditor = (parent) => {
    const parentCode = String(parent?.code || '').trim();
    if (!parentCode) return;
    setBulkMode('single');
    setBulkParentCode(parentCode);
    syncBomHeaderForParent(parentCode, { parentCode });
    hydrateBulkParentDetails(parentCode);
    setBulkParentMaterials(deriveParentMaterialsFromRelations(parentCode));
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDeleteRelation = async (node) => {
    const relation = node?.relation;
    if (!relation?.id) {
      alert('Relasi BOM tidak ditemukan.');
      return;
    }
    const parentItem = itemsByCode.get(relation.parent_code) || {};
    const childItem = itemsByCode.get(relation.child_code) || {};
    const confirmed = window.confirm([
      'Hapus relasi BOM ini?',
      '',
      `Parent : ${relation.parent_code}${parentItem.name ? ` - ${parentItem.name}` : ''}`,
      `Child  : ${relation.child_code}${childItem.name ? ` - ${childItem.name}` : ''}`,
      `Qty/Use: ${Number(relation.quantity || 0)} | Scrap: ${Number(relation.scrap_factor || 0)}%`,
      `Tipe   : ${relation.component_type || childItem.type || '-'}`,
      '',
      'Aksi ini hanya menghapus relasi, bukan item master.',
    ].join('\n'));
    if (!confirmed) return;
    if (!apiFetch) {
      alert('API belum tersedia untuk menghapus BOM.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
      return;
    }
    try {
      await apiFetch(`/api/bom/${relation.id}`, { method: 'DELETE' });
      if (editingRelation?.id === relation.id) {
        setEditingRelation(null);
      }
      await syncMasterRefContext();
      alert('Relasi BOM berhasil dihapus.');
    } catch (error) {
      alert(`Gagal menghapus relasi BOM: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBulkModeChange = (mode) => {
    setBulkMode(mode);
    if (mode === 'single' && bulkParentCode) {
      hydrateBulkParentDetails(bulkParentCode);
      setBulkParentMaterials(deriveParentMaterialsFromRelations(bulkParentCode));
    }
  };

  const handleBulkMaterialCodeBlur = (childIndex, materialIndex) => {
    const material = bulkChildren[childIndex]?.materials?.[materialIndex];
    if (!material) return;
    const codeValue = String(material.code || '').trim();
    if (!codeValue) return;
    const existing = masterItemsByCode.get(codeValue);
    if (!existing) return;
    const targetBucket = getMaterialBucketForType(material.type);
    if (getBomItemBucket(existing) !== targetBucket) {
      alert(`Material Code hanya boleh memilih item kategori ${targetBucket === 'INDIRECT' ? 'INDIRECT' : 'RM'} sesuai tipe yang dipilih.`);
      updateBulkMaterial(childIndex, materialIndex, {
        code: '',
        name: '',
        uom: 'PCS',
      });
      return;
    }
    updateBulkMaterial(childIndex, materialIndex, {
      code: existing.code,
      name: existing.name || material.name,
      uom: existing.unit || existing.uom || material.uom,
    });
  };

  const getMaterialBucketForType = (typeValue) => {
    const normalized = normalizeMaterialType(typeValue, 'RAW MATERIAL');
    if (normalized === 'INDIRECT MATERIAL') return 'INDIRECT';
    return 'RM';
  };

  const handleBulkMaterialTypeChange = (childIndex, materialIndex, value) => {
    const nextType = normalizeMaterialType(value, 'RAW MATERIAL');
    const targetBucket = getMaterialBucketForType(nextType);
    const material = bulkChildren[childIndex]?.materials?.[materialIndex];
    const currentCode = String(material?.code || '').trim();
    if (currentCode) {
      const existing = masterItemsByCode.get(currentCode);
      if (!existing || getBomItemBucket(existing) !== targetBucket) {
        updateBulkMaterial(childIndex, materialIndex, {
          type: nextType,
          code: '',
          name: '',
        });
        return;
      }
    }
    updateBulkMaterial(childIndex, materialIndex, { type: nextType });
  };

  const getBulkMaterialListId = (material) => {
    const materialType = normalizeMaterialType(material?.type, 'RAW MATERIAL');
    return materialType === 'INDIRECT MATERIAL' ? 'bom-material-indirect-options' : 'bom-material-rm-options';
  };

  const handleBulkParentMaterialCodeBlur = (materialIndex) => {
    const material = bulkParentMaterials[materialIndex];
    if (!material) return;
    const codeValue = String(material.code || '').trim();
    if (!codeValue) return;
    const existing = masterItemsByCode.get(codeValue);
    if (!existing) return;
    if (getBomItemBucket(existing) !== 'RM') {
      alert('Material Code hanya boleh memilih item kategori RM (Raw Material).');
      updateBulkParentMaterial(materialIndex, {
        code: '',
        name: '',
        uom: 'PCS',
      });
      return;
    }
    updateBulkParentMaterial(materialIndex, {
      code: existing.code,
      name: existing.name || material.name,
      uom: existing.unit || existing.uom || material.uom,
    });
  };

  const handleBulkSave = async (event) => {
    event.preventDefault();
    const parentCode = String(bulkParentCode || '').trim();
    if (!parentCode) {
      alert('Parent utama wajib dipilih.');
      return;
    }
    if (!masterItemsByCode.get(parentCode)) {
      alert('Parent utama belum terdaftar di master item.');
      return;
    }
    if (!apiFetch) {
      alert('API belum tersedia untuk menyimpan BOM.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
      return;
    }
    const headerMeta = buildBomHeaderPayload(bomHeader, parentCode);
    if (!headerMeta.effectiveStartDate) {
      alert('Effective start date wajib diisi.');
      return;
    }
    if (headerMeta.effectiveEndDate && headerMeta.effectiveEndDate < headerMeta.effectiveStartDate) {
      alert('Effective end date tidak boleh lebih kecil dari effective start date.');
      return;
    }
    setBulkSaving(true);
    try {
      if (bulkMode === 'single') {
        const parentItem = masterItemsByCode.get(parentCode);
        if (!parentItem) {
          alert('Parent utama belum terdaftar di master item.');
          return;
        }
        if (getBomItemBucket(parentItem) !== 'FG') {
          alert('Mode Single-Level hanya boleh memakai parent kategori FG.');
          return;
        }
        const parentProcessCodes = mapProcessFlowToCodes(bulkParentDetails.processCodes || []);
        if (!parentItem.name || !parentItem.type || !(parentItem.unit || parentItem.uom)) {
          alert('Master item parent belum lengkap (nama/tipe/satuan).');
          return;
        }
        for (const material of aggregateDraftMaterials(bulkParentMaterials || [])) {
          const materialCode = String(material.code || '').trim();
          if (!materialCode) continue;
          const existingMaterial = masterItemsByCode.get(materialCode);
          if (!existingMaterial) {
            alert(`Material ${materialCode} belum ada di Master Ref Item.`);
            return;
          }
          if (getBomItemBucket(existingMaterial) !== 'RM') {
            alert(`Material ${materialCode} harus berkategori RM.`);
            return;
          }
          const materialRelKey = `${parentCode}__${materialCode}`;
          const materialRelPayload = {
            parentCode,
            childCode: materialCode,
            quantity: Number(material.qty) || 1,
            scrapFactor: Number(material.scrap) || 0,
            yieldFactor: Number(material.yieldFactor) || 1,
            positionCode: String(material.positionCode || '').trim(),
            substituteMaterialCodes: parseSubstituteCodes(material.substituteCodesText),
            componentType: 'RAW MATERIAL',
            componentDescription: existingMaterial?.name || materialCode,
            modelSpec: '',
            assemblyNote: '',
            processFlow: parentProcessCodes,
            processRouting: buildProcessRoutingSnapshot(parentProcessCodes),
            headerMeta,
          };
          await upsertBomRelation({
            ...materialRelPayload,
            quantity: Number(material.qty) || 1,
          });
        }
      } else {
        const parentItem = masterItemsByCode.get(parentCode);
        if (parentItem && getBomItemBucket(parentItem) !== 'SUB_ASSY') {
          alert('Mode Multi-Level hanya boleh memakai parent kategori Sub-Assy.');
          return;
        }
        for (const child of aggregateBulkChildren(bulkChildren)) {
          const childCode = String(child.code || '').trim();
          if (!childCode) continue;
          const childNote = String(child.note || '').trim();
          const existingChild = masterItemsByCode.get(childCode);
          if (!existingChild) {
            alert(`Child Part ${childCode} belum ada di Master Ref Item.`);
            return;
          }
          if (getBomItemBucket(existingChild) !== 'CP') {
            alert(`Child Part ${childCode} harus berkategori CP.`);
            return;
          }
          const childProcessCodes = mapProcessFlowToCodes(child.processCodes || []);
          const relationKey = `${parentCode}__${childCode}`;
          const childRelPayload = {
            parentCode,
            childCode,
            quantity: Number(child.qty) || 1,
            scrapFactor: Number(child.scrap) || 0,
            yieldFactor: Number(child.yieldFactor) || 1,
            positionCode: String(child.positionCode || '').trim(),
            substituteMaterialCodes: parseSubstituteCodes(child.substituteCodesText),
            componentType: 'CP',
            componentDescription: existingChild?.name || childCode,
            modelSpec: existingChild?.model || '',
            assemblyNote: childNote,
            processFlow: childProcessCodes,
            processRouting: buildProcessRoutingSnapshot(childProcessCodes),
            headerMeta,
          };
          await upsertBomRelation({
            ...childRelPayload,
            quantity: Number(child.qty) || 1,
          });
          for (const material of child.materials || []) {
            const materialCode = String(material.code || '').trim();
            if (!materialCode) continue;
            const materialType = normalizeMaterialType(material.type, 'RAW MATERIAL');
            const targetBucket = getMaterialBucketForType(materialType);
            const existingMaterial = masterItemsByCode.get(materialCode);
            if (!existingMaterial) {
              alert(`Material ${materialCode} belum ada di Master Ref Item.`);
              return;
            }
            if (getBomItemBucket(existingMaterial) !== targetBucket) {
              alert(`Material ${materialCode} harus berkategori ${targetBucket === 'INDIRECT' ? 'Indirect Material' : 'Raw Material'}.`);
              return;
            }
            const materialRelKey = `${childCode}__${materialCode}`;
            const materialRelPayload = {
              parentCode: childCode,
              childCode: materialCode,
              quantity: Number(material.qty) || 1,
              scrapFactor: Number(material.scrap) || 0,
              yieldFactor: Number(material.yieldFactor) || 1,
              positionCode: String(material.positionCode || '').trim(),
              substituteMaterialCodes: parseSubstituteCodes(material.substituteCodesText),
              componentType: materialType,
              componentDescription: existingMaterial?.name || materialCode,
              modelSpec: '',
              assemblyNote: '',
              processFlow: childProcessCodes,
              processRouting: buildProcessRoutingSnapshot(childProcessCodes),
              headerMeta: buildBomHeaderPayload(bomHeader, childCode),
            };
            await upsertBomRelation({
              ...materialRelPayload,
              quantity: Number(material.qty) || 1,
            });
          }
        }
      }
      await refreshBomRelations();
      if (bulkMode === 'single') {
        setBulkParentMaterials([createBulkMaterial()]);
        setBulkParentDetails(createBulkParentDetails());
      } else {
        setBulkChildren([createBulkChild()]);
      }
      setBomHeader((prev) => normalizeBomHeaderState({ ...prev, parentCode, headerId: null }));
    } catch (error) {
      alert(`Gagal menyimpan struktur: ${error.message || 'Unknown error'}`);
    } finally {
      setBulkSaving(false);
    }
  };

  const itemsByCode = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      map.set(item.code, item);
    });
    return map;
  }, [items]);
  const masterItemsByCode = useMemo(() => {
    const map = new Map();
    masterItemsNormalized.forEach((item) => {
      map.set(item.code, item);
    });
    return map;
  }, [masterItemsNormalized]);
  const getItemCustomerNames = (itemCode) => {
    const normalizedCode = String(itemCode || '').trim();
    if (!normalizedCode) return [];
    const rows = itemCustomerMap instanceof Map ? (itemCustomerMap.get(normalizedCode) || []) : [];
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows
      .map((row) => {
        const customerId = String(row.customerId || row.customer_id || '').trim();
        const directName = String(row.customerName || row.customer_name || '').trim();
        return directName || customerNameById.get(customerId) || customerId;
      })
      .filter(Boolean);
  };
  const getItemCustomerLabel = (itemCode) => {
    const names = Array.from(new Set(getItemCustomerNames(itemCode)));
    return names.join(', ');
  };
  const getLockedFieldClass = (locked) => (
    locked ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
  );
  const revisionAuditParentOptions = useMemo(() => (
    Array.from(bomHeaderRowsByParent.keys())
      .map((code) => {
        const item = itemsByCode.get(code) || masterItemsByCode.get(code) || {};
        return {
          code,
          name: item.name || code,
          type: item.type || '',
        };
      })
      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
  ), [bomHeaderRowsByParent, itemsByCode, masterItemsByCode]);
  const revisionAuditHeaders = useMemo(() => {
    const parentCode = String(revisionAuditParentCode || '').trim();
    if (!parentCode) return [];
    const relations = bomHeaderRowsByParent.get(parentCode) || [];
    const headerMap = new Map();
    relations.forEach((relation) => {
      const headerId = Number(relation.header_id || 0);
      if (!headerId) return;
      if (!headerMap.has(headerId)) {
        headerMap.set(headerId, {
          headerId,
          parentCode,
          parentName: relation.parent_name || itemsByCode.get(parentCode)?.name || parentCode,
          revisionNo: Number(relation.revision_no || 1) || 1,
          bomVersion: relation.bom_version || '',
          effectiveStartDate: relation.effective_start_date || relation.effective_date || '',
          effectiveEndDate: relation.effective_end_date || '',
          reference: relation.reference || '',
          createdAt: relation.header_created_at || relation.created_at || '',
          lineCount: 0,
          isActive: false,
        });
      }
      headerMap.get(headerId).lineCount += 1;
    });
    const rows = Array.from(headerMap.values()).sort(compareBomHeaderPriority);
    rows.forEach((row) => {
      row.isActive = isBomHeaderActiveOnDate({
        effective_start_date: row.effectiveStartDate,
        effective_end_date: row.effectiveEndDate,
      }, todayDateInput);
    });
    return rows;
  }, [revisionAuditParentCode, bomHeaderRowsByParent, itemsByCode, compareBomHeaderPriority, todayDateInput]);
  const revisionAuditActiveHeader = useMemo(() => {
    if (revisionAuditHeaders.length === 0) return null;
    return revisionAuditHeaders.find((row) => row.isActive) || revisionAuditHeaders[0] || null;
  }, [revisionAuditHeaders]);
  const revisionAuditSelectedHeaderId = useMemo(() => {
    const requested = Number(revisionAuditHeaderId || 0);
    if (requested > 0 && revisionAuditHeaders.some((row) => Number(row.headerId) === requested)) {
      return requested;
    }
    return Number(revisionAuditActiveHeader?.headerId || revisionAuditHeaders[0]?.headerId || 0) || 0;
  }, [revisionAuditHeaderId, revisionAuditHeaders, revisionAuditActiveHeader]);
  const revisionAuditLines = useMemo(() => (
    (bomRelations || [])
      .filter((relation) => Number(relation.header_id || 0) === Number(revisionAuditSelectedHeaderId || 0))
      .sort((left, right) => {
        const leftParent = String(left.parent_code || '');
        const rightParent = String(right.parent_code || '');
        if (leftParent !== rightParent) return leftParent.localeCompare(rightParent);
        return String(left.child_code || '').localeCompare(String(right.child_code || ''));
      })
  ), [bomRelations, revisionAuditSelectedHeaderId]);
  const treePreviewRelations = useMemo(() => {
    if (treeRevisionMode !== 'selected') return activeBomRelations;
    const parentCode = String(revisionAuditParentCode || '').trim();
    const selectedHeaderId = Number(revisionAuditSelectedHeaderId || 0);
    if (!parentCode || selectedHeaderId <= 0) return activeBomRelations;
    const relationsForParent = bomHeaderRowsByParent.get(parentCode) || [];
    if (relationsForParent.length === 0) return activeBomRelations;
    const activeWithoutTargetParent = activeBomRelations.filter(
      (relation) => String(relation.parent_code || '').trim() !== parentCode,
    );
    const selectedForTargetParent = relationsForParent.filter(
      (relation) => Number(relation.header_id || 0) === selectedHeaderId,
    );
    if (selectedForTargetParent.length === 0) return activeBomRelations;
    return [...activeWithoutTargetParent, ...selectedForTargetParent];
  }, [
    treeRevisionMode,
    revisionAuditParentCode,
    revisionAuditSelectedHeaderId,
    activeBomRelations,
    bomHeaderRowsByParent,
  ]);
  useEffect(() => {
    if (!revisionAuditSelectedHeaderId) return;
    if (Number(revisionAuditHeaderId || 0) === Number(revisionAuditSelectedHeaderId)) return;
    setRevisionAuditHeaderId(String(revisionAuditSelectedHeaderId));
  }, [revisionAuditSelectedHeaderId, revisionAuditHeaderId]);

  useEffect(() => {
    if (treeRevisionMode !== 'selected') return;
    if (Number(revisionAuditSelectedHeaderId || 0) > 0) return;
    setTreeRevisionMode('active');
  }, [treeRevisionMode, revisionAuditSelectedHeaderId]);
  const currentFormCode = String(newItem.code || '').trim();
  const currentFormMasterItem = currentFormCode ? masterItemsByCode.get(currentFormCode) : null;
  const isCurrentFormMasterLocked = Boolean(currentFormMasterItem);
  const currentFormCustomerLabel = currentFormCode ? getItemCustomerLabel(currentFormCode) : '';
  const bulkParentMasterItem = bulkParentCode ? masterItemsByCode.get(String(bulkParentCode || '').trim()) : null;
  const isBulkParentMasterLocked = Boolean(bulkParentMasterItem);
  const bulkParentCustomerLabel = bulkParentCode ? getItemCustomerLabel(bulkParentCode) : '';
  const whereUsedOptions = useMemo(() => (
    items
      .filter((item) => {
        const bucket = getBomItemBucket(item);
        return bucket === 'CP' || bucket === 'RM' || bucket === 'INDIRECT';
      })
      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
  ), [items]);
  const whereUsedTargetCode = String(whereUsedCode || currentFormCode || '').trim();
  const whereUsedRows = useMemo(() => {
    if (!whereUsedTargetCode) return [];
    return activeBomRelations
      .filter((rel) => String(rel.child_code || '').trim() === whereUsedTargetCode)
      .map((rel) => {
        const parentItem = itemsByCode.get(rel.parent_code) || {};
        return {
          id: rel.id,
          parentCode: rel.parent_code,
          parentName: parentItem.name || '-',
          parentType: parentItem.type || '-',
          qtyUse: Number(rel.quantity || 0),
          scrap: Number(rel.scrap_factor || 0),
          yieldFactor: Number(rel.yield_factor || 1),
          positionCode: rel.position_code || '',
          substituteCodes: formatSubstituteCodes(rel.substitute_material_codes || []),
          revisionNo: Number(rel.revision_no || 1),
          note: rel.assembly_note || '',
        };
      })
      .sort((a, b) => a.parentCode.localeCompare(b.parentCode));
  }, [activeBomRelations, itemsByCode, whereUsedTargetCode]);
  const buildBomHeaderPayload = (headerState, parentCodeValue, extra = {}) => {
    const normalizedRevision = Number(headerState?.revisionNo || 1) || 1;
    return {
      parentCode: String(parentCodeValue || headerState?.parentCode || '').trim(),
      headerId: Number(headerState?.headerId || 0) || null,
      bomVersion: String(headerState?.bomVersion || '').trim(),
      revisionNo: normalizedRevision,
      effectiveStartDate: String(headerState?.effectiveStartDate || todayDateInput).trim() || todayDateInput,
      effectiveEndDate: String(headerState?.effectiveEndDate || '').trim(),
      reference: String(headerState?.reference || '').trim(),
      ...extra,
    };
  };
  const relationMatchesHeader = (relation, headerPayload) => (
    String(relation.parent_code || '').trim() === String(headerPayload.parentCode || '').trim()
    && Number(relation.revision_no || 1) === Number(headerPayload.revisionNo || 1)
    && String(relation.effective_start_date || relation.effective_date || '') === String(headerPayload.effectiveStartDate || '')
    && String(relation.effective_end_date || '') === String(headerPayload.effectiveEndDate || '')
  );
  const upsertBomRelation = async ({
    relationId = null,
    parentCode,
    childCode,
    quantity,
    mergeOnDuplicate = false,
    headerMeta = null,
    ...payload
  }) => {
    const normalizedParent = String(parentCode || '').trim();
    const normalizedChild = String(childCode || '').trim();
    const qtyNumber = Number(quantity || 0);
    const headerPayload = buildBomHeaderPayload(headerMeta || bomHeader, normalizedParent);
    const existing = bomRelations.find((rel) => (
      String(rel.parent_code || '').trim() === normalizedParent
      && String(rel.child_code || '').trim() === normalizedChild
      && relationMatchesHeader(rel, headerPayload)
      && Number(rel.id) !== Number(relationId)
    ));
    if (!relationId && existing) {
      const nextQuantity = mergeOnDuplicate
        ? Number(existing.quantity || 0) + qtyNumber
        : qtyNumber;
      await apiFetch(`/api/bom/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          ...headerPayload,
          childCode: normalizedChild,
          quantity: nextQuantity,
        }),
      });
      return { relationId: existing.id, merged: mergeOnDuplicate };
    }
    if (relationId && existing) {
      await apiFetch(`/api/bom/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          ...headerPayload,
          childCode: normalizedChild,
          quantity: Number(existing.quantity || 0) + qtyNumber,
        }),
      });
      await apiFetch(`/api/bom/${relationId}`, { method: 'DELETE' });
      return { relationId: existing.id, merged: true };
    }
    if (relationId) {
      await apiFetch(`/api/bom/${relationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          ...headerPayload,
          childCode: normalizedChild,
          quantity: qtyNumber,
        }),
      });
      return { relationId, merged: false };
    }
    await apiFetch('/api/bom', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        ...headerPayload,
        parentCode: normalizedParent,
        childCode: normalizedChild,
        quantity: qtyNumber,
      }),
    });
    return { relationId: null, merged: false };
  };
  const aggregateDraftMaterials = (materials = []) => {
    const map = new Map();
    materials.forEach((material) => {
      const code = String(material?.code || '').trim();
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, {
          ...material,
          code,
          qty: Number(material?.qty) || 0,
          scrap: Number(material?.scrap) || 0,
          yieldFactor: Number(material?.yieldFactor) || 1,
        });
        return;
      }
      const current = map.get(code);
      current.qty = Number(current.qty || 0) + (Number(material?.qty) || 0);
      current.scrap = Math.max(Number(current.scrap || 0), Number(material?.scrap) || 0);
      current.yieldFactor = Number(material?.yieldFactor) || Number(current.yieldFactor || 1) || 1;
      current.positionCode = current.positionCode || material?.positionCode || '';
      current.substituteCodesText = current.substituteCodesText || material?.substituteCodesText || '';
    });
    return Array.from(map.values());
  };
  const aggregateBulkChildren = (children = []) => {
    const map = new Map();
    children.forEach((child) => {
      const code = String(child?.code || '').trim();
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, {
          ...child,
          code,
          qty: Number(child?.qty) || 0,
          scrap: Number(child?.scrap) || 0,
          yieldFactor: Number(child?.yieldFactor) || 1,
          materials: Array.isArray(child?.materials) ? [...child.materials] : [],
        });
        return;
      }
      const current = map.get(code);
      current.qty = Number(current.qty || 0) + (Number(child?.qty) || 0);
      current.scrap = Math.max(Number(current.scrap || 0), Number(child?.scrap) || 0);
      current.yieldFactor = Number(child?.yieldFactor) || Number(current.yieldFactor || 1) || 1;
      current.positionCode = current.positionCode || child?.positionCode || '';
      current.substituteCodesText = current.substituteCodesText || child?.substituteCodesText || '';
      current.materials = [...(current.materials || []), ...(Array.isArray(child?.materials) ? child.materials : [])];
    });
    return Array.from(map.values()).map((child) => ({
      ...child,
      materials: aggregateDraftMaterials(child.materials || []),
    }));
  };

  const bomTreeData = useMemo(() => {
    const childrenMap = new Map();
    const childCodes = new Set();
    treePreviewRelations.forEach((rel) => {
      if (!childrenMap.has(rel.parent_code)) {
        childrenMap.set(rel.parent_code, []);
      }
      childrenMap.get(rel.parent_code).push(rel);
      childCodes.add(rel.child_code);
    });
    const parentCodes = Array.from(childrenMap.keys());
    const fgRoots = items
      .filter((item) => String(item.type || '').toLowerCase().includes('fg') || String(item.type || '').toLowerCase().includes('finish'))
      .map((item) => item.code)
      .filter((code) => !childCodes.has(code));
    const rootCodes = Array.from(new Set([...parentCodes.filter((code) => !childCodes.has(code)), ...fgRoots]));
    const buildNode = (code, relation = null, path = new Set()) => {
      const item = itemsByCode.get(code) || { code, name: code, type: '' };
      if (path.has(code)) {
        return { ...item, type: String(relation?.component_type || item.type || '').trim(), relation, children: [] };
      }
      const nextPath = new Set(path);
      nextPath.add(code);
      const childRels = childrenMap.get(code) || [];
      const children = childRels.map((rel) => buildNode(rel.child_code, rel, nextPath));
      return { ...item, type: String(relation?.component_type || item.type || '').trim(), relation, children };
    };
    const allRoots = rootCodes.map((code) => buildNode(code));
    if (treeRevisionMode !== 'selected') return allRoots;
    const previewParentCode = String(revisionAuditParentCode || '').trim();
    if (!previewParentCode) return allRoots;
    const previewRootOnly = allRoots.find((node) => String(node.code || '').trim() === previewParentCode);
    return previewRootOnly ? [previewRootOnly] : allRoots;
  }, [treePreviewRelations, itemsByCode, treeRevisionMode, revisionAuditParentCode]);

  // --- TREE STRUCTURE ---
  const buildTree = (parentId = null) => items.filter(i => i.parentId === parentId).map(i => ({ ...i, children: buildTree(i.id) }));
  const treeData = useMemo(() => buildTree(), [items]);

  // --- KOMPONEN TREE NODE ---
  const TreeNode = ({ node, level = 0 }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    
    let typeColor = 'text-gray-500';
    let Icon = FileText;
    const typeValue = String(node.type || '').toLowerCase();
    if (typeValue.includes('fg')) { typeColor = 'text-indigo-600'; Icon = Package; }
    else if (typeValue.includes('sub') || typeValue.includes('cp') || typeValue.includes('wip')) { typeColor = 'text-orange-500'; Icon = Layers; }
    else if (typeValue.includes('raw')) { typeColor = 'text-emerald-600'; Icon = FileText; }
    else if (node.type === 'INDIRECT MATERIAL') { typeColor = 'text-purple-600'; Icon = Settings; }

    return (
      <div className="select-none text-xs group border-b border-gray-50 last:border-0 hover:bg-indigo-50 transition-colors">
        <div className={`flex items-center p-2 ${level === 0 ? 'bg-gray-50 font-medium' : ''}`} style={{ paddingLeft: `${level * 20 + 8}px` }}>
          <div className="w-5 flex justify-center cursor-pointer mr-1" onClick={() => setExpanded(!expanded)}>
            {hasChildren && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </div>
          <div className="flex-1 grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4 flex items-center gap-2 truncate">
               <Icon size={16} className={typeColor}/>
               <span className="font-bold text-slate-700">{node.code}</span>
               <span className="text-gray-500 truncate text-[11px]">- {node.name}</span>
            </div>
              <div className="col-span-2 flex flex-col text-[10px] text-gray-500 truncate">
                <span className="text-slate-600 truncate">
                  {formatModelCodes(modelMap, node.modelCodes) || node.model || '-'}
                </span>
               {(node.supplier || node.customer) && (
                 <span className="text-gray-400 truncate">
                   {[node.supplier, node.customer].filter(Boolean).join(' • ')}
                 </span>
               )}
               {(node.organization || node.location) && (
                 <span className="text-gray-400 truncate">
                   {[node.organization ? `Org: ${node.organization}` : '', node.location ? `Loc: ${node.location}` : ''].filter(Boolean).join(' • ')}
                 </span>
               )}
               {(node.category || node.packing) && (
                 <span className="text-gray-400 truncate">
                   {[node.category ? `Category: ${node.category}` : '', node.packing ? `Packing: ${node.packing}` : ''].filter(Boolean).join(' • ')}
                 </span>
               )}
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 text-[10px] text-gray-500">
               {node.processes && node.processes.length > 0 ? (
                 node.processes.map((p, idx) => (
                   <span key={idx} className="bg-gray-100 px-1.5 py-0.5 rounded border flex items-center gap-1">
                     {getProcessNodeLabel(p)}{idx < node.processes.length - 1 && <ArrowRight size={8} className="text-gray-400"/>}
                   </span>
                 ))
               ) : <span className="text-gray-300">-</span>}
            </div>
            <div className="col-span-3 text-right flex flex-col justify-center">
               <span className="font-mono font-bold text-slate-700">{node.qty} {node.uom}</span>
            </div>
            <div className="col-span-1 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleDuplicate(node)} className="text-gray-400 hover:text-blue-600"><Copy size={12}/></button>
              <button onClick={() => handleDelete(node.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={12}/></button>
            </div>
          </div>
        </div>
        {expanded && hasChildren && <div>{node.children.map(child => <TreeNode key={child.id} node={child} level={level + 1} />)}</div>}
      </div>
    );
  };

  const getBomNodeMeta = (node, level, hasChildren) => {
    const categoryLabel = resolveCategoryLabel(node.category);
    const typeText = [node.type, categoryLabel].filter(Boolean).join(' ').toLowerCase();
    if (typeText.includes('indirect')) {
      return {
        kind: 'indirect',
        label: 'Indirect Material',
        breadcrumb: level > 1 ? 'FG > Child Part > Indirect Material' : 'FG > Indirect Material',
        badgeClass: 'bg-purple-50 text-purple-700',
        icon: Settings,
        iconClass: 'text-purple-600',
      };
    }
    if (typeText.includes('raw')) {
      return {
        kind: 'raw',
        label: 'Raw Material',
        breadcrumb: level > 1 ? 'FG > Child Part > Raw Material' : 'FG > Raw Material',
        badgeClass: 'bg-emerald-50 text-emerald-700',
        icon: FileText,
        iconClass: 'text-emerald-600',
      };
    }
    if (level === 0 || typeText.includes('fg') || typeText.includes('finish')) {
      return {
        kind: 'fg',
        label: 'FG',
        breadcrumb: 'FG',
        badgeClass: 'bg-indigo-50 text-indigo-700',
        icon: Package,
        iconClass: 'text-indigo-600',
      };
    }
    if (typeText.includes('sub-assy') || typeText.includes('sub assy') || typeText.includes('subassy')) {
      return {
        kind: 'assy',
        label: 'Sub-Assy',
        breadcrumb: level > 1 ? 'FG > Child Part > Sub-Assy' : 'FG > Child Part',
        badgeClass: 'bg-orange-50 text-orange-700',
        icon: Layers,
        iconClass: 'text-orange-500',
      };
    }
    if (typeText.includes('cp') || typeText.includes('child part') || typeText.includes('childpart') || typeText.includes('wip') || hasChildren) {
      return {
        kind: 'assy',
        label: 'Child Part',
        breadcrumb: level > 1 ? 'FG > Child Part > CP' : 'FG > Child Part',
        badgeClass: 'bg-orange-50 text-orange-700',
        icon: Layers,
        iconClass: 'text-orange-500',
      };
    }
    return {
      kind: 'assy',
      label: 'Child Part',
      breadcrumb: level > 1 ? 'FG > Child Part > Component' : 'FG > Child Part',
      badgeClass: 'bg-orange-50 text-orange-700',
      icon: FolderTree,
      iconClass: 'text-blue-600',
    };
  };

  const BomTreeNode = ({ node, level = 0, isLast = false, ancestorHasSibling = [] }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const relation = node.relation;
    const categoryLabel = resolveCategoryLabel(node.category);
    const meta = getBomNodeMeta(node, level, hasChildren);
    const isLeafRaw = meta.kind === 'raw' && !hasChildren;
    const displayLevel = level + 1;
    const hasNextSibling = !isLast;
    const levelLabel = meta.label;
    const indentStep = 20;
    const baseIndent = 8;
    const connectorOffset = 10;
    const indent = level * indentStep + baseIndent;
    const connectorX = Math.max(indent - connectorOffset, 6);
    const getConnectorColor = (depth) => {
      const lightness = Math.max(55, 86 - depth * 6);
      return `hsl(220, 12%, ${lightness}%)`;
    };

    return (
        <div className={`text-xs border-b border-gray-100 last:border-0 relative group ${meta.kind === 'fg' ? 'bg-indigo-50/20 border-l-4 border-l-indigo-200' : meta.kind === 'assy' ? 'bg-orange-50/20 border-l-4 border-l-orange-200' : meta.kind === 'raw' ? 'bg-emerald-50/20 border-l-4 border-l-emerald-200' : 'bg-purple-50/20 border-l-4 border-l-purple-200'}`}>
        {level > 0 && (
          <>
            {ancestorHasSibling.map((hasSibling, idx) => {
              if (!hasSibling) return null;
              const depth = idx + 1;
              const lineX = baseIndent + depth * indentStep - connectorOffset;
              return (
                <span
                  key={`ancestor-line-${depth}`}
                  className="absolute top-0 bottom-0 border-l"
                  style={{ left: `${lineX}px`, borderColor: getConnectorColor(depth), borderLeftWidth: '1.5px' }}
                />
              );
            })}
          </>
        )}
        <div className="relative">
          {level > 0 && (
            <>
              <span
                className="absolute top-0"
                style={{
                  left: `${connectorX}px`,
                  height: '50%',
                  borderLeft: `1.5px solid ${getConnectorColor(level)}`,
                }}
              />
              {(hasChildren || hasNextSibling) && (
                <span
                  className="absolute"
                  style={{
                    left: `${connectorX}px`,
                    top: '50%',
                    bottom: 0,
                    borderLeft: `1.5px solid ${getConnectorColor(level)}`,
                  }}
                />
              )}
              <span
                className="absolute top-1/2 w-3"
                style={{
                  left: `${connectorX}px`,
                  borderTop: `1.5px solid ${getConnectorColor(level)}`,
                }}
              />
              <span
                className="absolute rounded-full"
                style={{
                  left: `${connectorX + 2}px`,
                  top: '50%',
                  width: '5px',
                  height: '5px',
                  marginTop: '-2.5px',
                  backgroundColor: getConnectorColor(level),
                }}
              />
            </>
          )}
          <div
            className="flex items-start gap-2 py-2"
            style={{ paddingLeft: `${indent}px` }}
            title={`Level: ${displayLevel} (${levelLabel})`}
          >
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 mt-0.5"
            disabled={!hasChildren}
          >
            {hasChildren ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <meta.icon size={14} className={meta.iconClass} />
              <span className="font-semibold text-slate-700">{node.code}</span>
              <span className="text-[11px] text-gray-500">{node.name || '-'}</span>
              <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
                {meta.label}
              </span>
              {isLeafRaw && (
                <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Leaf</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
              <span>{meta.breadcrumb}</span>
              {categoryLabel && categoryLabel !== meta.label && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                  Category: {categoryLabel}
                </span>
              )}
            </div>
            {relation && (
              <div className="text-[10px] text-gray-400 mt-1">
                Qty/Use: {Number(relation.quantity || 0)} • Yield: {Number(relation.yield_factor || 1)} • Scrap: {Number(relation.scrap_factor || 0)}%
              </div>
            )}
            {relation && (relation.position_code || (relation.substitute_material_codes || []).length > 0 || relation.revision_no) && (
              <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-2">
                {relation.position_code && <span>Pos: {relation.position_code}</span>}
                {relation.revision_no && <span>Rev: {relation.revision_no}</span>}
                {relation.effective_start_date && <span>Efektif: {relation.effective_start_date}{relation.effective_end_date ? ` s/d ${relation.effective_end_date}` : ''}</span>}
                {Array.isArray(relation.substitute_material_codes) && relation.substitute_material_codes.length > 0 && (
                  <span>Substitusi: {formatSubstituteCodes(relation.substitute_material_codes)}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 whitespace-nowrap">
            {allowEdit && meta.kind !== 'raw' && meta.kind !== 'indirect' && (
              <button
                type="button"
                onClick={() => openSingleLevelBomEditor(node)}
                className="h-6 px-1.5 sm:px-2 inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                title="Tambah Raw Material"
              >
                <Layers size={12} />
                <span className="hidden sm:inline text-[10px] font-semibold">Tambah</span>
              </button>
            )}
            {(meta.kind === 'assy' || meta.kind === 'raw' || meta.kind === 'indirect') && (
              <button
                type="button"
                onClick={() => setWhereUsedCode(node.code)}
                className="h-6 px-1.5 sm:px-2 inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                title="Where Used"
              >
                <BookOpenText size={12} />
                <span className="hidden sm:inline text-[10px] font-semibold">Where Used</span>
              </button>
            )}
            {relation && (
              <button
                type="button"
                onClick={() => handleEditRelation(node)}
                className="h-6 px-1.5 sm:px-2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                title="Edit"
              >
                <Pencil size={12} />
                <span className="hidden sm:inline text-[10px] font-semibold">Edit</span>
              </button>
            )}
            {relation && (
              <button
                type="button"
                onClick={() => handleDeleteRelation(node)}
                className="h-6 px-1.5 sm:px-2 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                title="Hapus"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline text-[10px] font-semibold">Hapus</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectParent(node)}
              className="h-6 px-1.5 sm:px-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              title="Add Child"
            >
              <Plus size={12} />
              <span className="hidden sm:inline text-[10px] font-semibold">Child</span>
            </button>
          </div>
          </div>
        </div>
        {expanded && hasChildren && node.children.map((child, idx) => (
          <BomTreeNode
            key={`${child.code}-${idx}`}
            node={child}
            level={level + 1}
            isLast={idx === node.children.length - 1}
            ancestorHasSibling={[...(ancestorHasSibling || []), hasNextSibling]}
          />
        ))}
      </div>
    );
  };

  // --- LOGIC FORECAST ---
  const addProductionPlan = () => {
    if (!newPlan.fgId || newPlan.qty <= 0) return;
    setProductionPlan([...productionPlan, { ...newPlan, id: Date.now() }]);
    setForecastResult(null); 
  };
  const removePlan = (id) => {
    setProductionPlan(productionPlan.filter(p => p.id !== id));
    setForecastResult(null);
  };
  const calculateTotalForecast = () => {
    if (productionPlan.length === 0) return;
    const materialsMap = {};
    const relationMap = new Map();
    activeBomRelations.forEach((relation) => {
      const parentCode = String(relation.parent_code || '').trim();
      if (!parentCode) return;
      if (!relationMap.has(parentCode)) {
        relationMap.set(parentCode, []);
      }
      relationMap.get(parentCode).push(relation);
    });
    const traverse = (parentCode, multiplier, path = new Set()) => {
      const normalizedParent = String(parentCode || '').trim();
      if (!normalizedParent || path.has(normalizedParent)) return;
      const nextPath = new Set(path);
      nextPath.add(normalizedParent);
      const children = relationMap.get(normalizedParent) || [];
      children.forEach((relation) => {
        const childCode = String(relation.child_code || '').trim();
        if (!childCode) return;
        const childItem = masterItemsByCode.get(childCode) || {
          code: childCode,
          name: relation.component_description || childCode,
          type: relation.component_type || '',
          uom: '',
        };
        const yieldFactor = Number(relation.yield_factor || 1) > 0 ? Number(relation.yield_factor || 1) : 1;
        const currentQtyNeeded = (Number(relation.quantity || 0) / yieldFactor) * multiplier;
        const childBucket = getBomItemBucket(childItem);
        if (childBucket === 'RM' || childBucket === 'INDIRECT') {
          if (!materialsMap[childCode]) {
            materialsMap[childCode] = { ...childItem, totalQty: 0 };
          }
          materialsMap[childCode].totalQty += currentQtyNeeded;
          return;
        }
        traverse(childCode, currentQtyNeeded, nextPath);
      });
    };
    productionPlan.forEach(plan => {
      const rootItem = masterItemsNormalized.find((item) => String(item.id) === String(plan.fgId));
      if (rootItem) traverse(rootItem.code, parseFloat(plan.qty));
    });
    setForecastResult(Object.values(materialsMap).sort((a, b) => a.type.localeCompare(b.type)));
  };

  // --- EXPORT TO PRINTABLE VIEW (PRL) ---
  const handlePrintPRL = () => {
    // Tanggal untuk Header
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Configurable header
    const companyName = masterConfig.companyName || 'PT. MATRA RODA PIRANTI';
    const companySub = masterConfig.companySubTitle || 'AUTOMOTIVE PARTS & COMPONENT INDUSTRIES';
    const productionMonth = masterConfig.prlMonthLabel || 'DECEMBER 2025';
    const nextMonth1 = masterConfig.prlNextMonth1 || 'JAN';
    const nextMonth2 = masterConfig.prlNextMonth2 || 'FEB';
    const nextMonth3 = masterConfig.prlNextMonth3 || 'MAR';
    const prevMonth = masterConfig.prlPrevMonth || 'NOV';
    const prlNumber = masterConfig.prlNumber || 'PRL/2025/12/001';
    const prlSupplierLabel = masterConfig.prlSupplierLabel || 'ALL SUPPLIER (INTERNAL & EXTERNAL)';

    const printWindow = window.open('', 'PRINT', 'height=800,width=1200');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>PRL Report - PT. MATRA RODA PIRANTI</title>
          <style>
            @media print {
              @page { size: landscape; margin: 5mm; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
              .no-print { display: none; }
            }
            body { font-family: 'Arial Narrow', Arial, sans-serif; font-size: 9px; padding: 10px; }
            
            /* HEADER LAYOUT */
            .header-grid { display: grid; grid-template-columns: 2fr 1fr; border-bottom: 2px double black; margin-bottom: 5px; padding-bottom: 2px; }
            .company-name { font-size: 16px; font-weight: bold; }
            .company-sub { font-size: 10px; font-weight: bold; }
            .print-time { font-size: 9px; text-align: right; align-self: end; }
            
            .report-title { font-size: 20px; font-weight: bold; text-decoration: underline; text-align: center; margin: 10px 0; }
            
            /* INFO TABLE */
            .info-table { width: 100%; border: none; font-size: 10px; margin-bottom: 8px; }
            .info-table td { padding: 1px 4px; border: none; vertical-align: top; }
            
            /* MAIN DATA TABLE */
            table.data-table { width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 8px; }
            table.data-table th, table.data-table td { border: 1px solid black; padding: 2px 3px; text-align: center; vertical-align: middle; }
            table.data-table th { background-color: #f0f0f0; font-weight: bold; }
            
            /* TEXT ALIGNMENT UTILS */
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .bg-yellow { background-color: #ffffcc !important; }
            
            /* FOOTER SIGNATURES */
            .footer-sign { width: 100%; margin-top: 15px; border-collapse: collapse; border: 1px solid black; font-size: 9px; }
            .footer-sign th, .footer-sign td { border: 1px solid black; text-align: center; }
            .sign-box { height: 50px; vertical-align: bottom; font-weight: bold; text-decoration: underline; }
            
            .page-info { text-align: right; font-size: 8px; margin-top: 5px; font-style: italic; }
          </style>
        </head>
        <body>
          
          <!-- HEADER -->
              <div class="header-grid">
                <div>
                  <div class="company-name">${companyName}</div>
                  <div class="company-sub">${companySub}</div>
                </div>
                <div class="print-time">Bekasi, ${dateStr} ${timeStr}</div>
              </div>

          <div class="report-title">PART REQUIREMENT LIST</div>

          <table class="info-table">
                <tr>
                  <td width="8%">Nomor</td><td width="1%">:</td><td width="30%">${prlNumber}</td>
                  <td width="8%">MONTH</td><td width="1%">:</td><td width="52%"><strong>${productionMonth}</strong></td>
                </tr>
                <tr>
                  <td>Supplier</td><td>:</td><td>${prlSupplierLabel}</td>
              <td colspan="3"></td>
            </tr>
          </table>

          <!-- MAIN TABLE -->
          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" width="2%">No</th>
                <th rowspan="2" width="3%">Uniq</th>
                <th rowspan="2" width="8%">Part No</th>
                <th rowspan="2" width="18%">Description</th>
                <th colspan="5">WEEKLY QTY</th>
                <th rowspan="2" width="4%">VOL/DAY<br/>[Kg]</th>
                <th rowspan="2" width="4%">LAST<br/>NEW</th>
                <th rowspan="2" width="4%">QTY/<br/>KBN</th>
                <th rowspan="2" width="3%">UOM</th>
                <th rowspan="2" width="5%">TYPE<br/>PACK</th>
                <th width="4%">N-1</th>
                <th colspan="3">FORECAST FIRM</th>
                <th rowspan="2" width="4%">N+3<br/>${nextMonth3}</th>
                <th rowspan="2" width="4%">Fluctuation<br/>%</th>
              </tr>
              <tr>
                <!-- Weekly Subheaders -->
                <th width="3%">I</th><th width="3%">II</th><th width="3%">III</th><th width="3%">IV</th><th width="3%">V</th>
                <!-- Month Subheaders -->
                <th>${prevMonth}</th>
                <th>N (${productionMonth.split(' ')[0].substring(0,3)})</th>
                <th>N+1 (${nextMonth1})</th>
                <th>N+2 (${nextMonth2})</th>
              </tr>
            </thead>
            <tbody>
              ${document.getElementById('prl-data-rows').innerHTML}
            </tbody>
          </table>

          <!-- FOOTER -->
          <table class="footer-sign">
            <thead>
              <tr>
                <th width="25%">CHECKED</th>
                <th width="25%">APPROVED</th>
                <th width="25%">CHECKED</th>
                <th width="25%">PREPARED</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="sign-box">Beverly M</td>
                <td class="sign-box">JIHAD M.</td>
                <td class="sign-box">HUFRON M.</td>
                <td class="sign-box">ADIN M</td>
              </tr>
              <tr>
                <td>Div. Head PPIC</td>
                <td>Sec. Head MKT</td>
                <td>Sec. Head PPIC</td>
                <td>Staff PPIC</td>
              </tr>
            </tbody>
          </table>
          
          <div class="page-info">No Doc: MRP-FM-PCD-01-01 Rev: 01 | Page 1</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // --- IMPORT / EXPORT (HANYA XLS HTML) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.name.toLowerCase().endsWith('.xlsx')) {
        alert("Maaf, sistem ini hanya mendukung format .xls (Excel 97-2003 / Web Format).");
        e.target.value = null;
        return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      await processHTMLImport(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const finalizeImport = async (relationDrafts, rootCodes) => {
    if (!apiFetch) {
      alert('API belum tersedia untuk import relasi BOM.');
      return;
    }
    if (!allowEdit) {
      alert('Anda tidak memiliki akses untuk import relasi BOM.');
      return;
    }
    if (relationDrafts.length === 0) {
      alert('Tidak ada relasi BOM valid ditemukan. Gunakan Template .xls.');
      return;
    }

    const validationErrors = [];
    const aggregatedMap = new Map();

    rootCodes.forEach((rootCode) => {
      if (!masterItemsByCode.get(rootCode)) {
        validationErrors.push(`Parent root ${rootCode} belum ada di Master Ref Item.`);
      }
    });

    relationDrafts.forEach((draft, index) => {
      const parentCode = String(draft.parentCode || '').trim();
      const childCode = String(draft.childCode || '').trim();
      if (!parentCode || !childCode) return;

      if (!masterItemsByCode.get(parentCode)) {
        validationErrors.push(`Baris ${index + 1}: Parent ${parentCode} belum ada di Master Ref Item.`);
        return;
      }
      if (!masterItemsByCode.get(childCode)) {
        validationErrors.push(`Baris ${index + 1}: Child ${childCode} belum ada di Master Ref Item.`);
        return;
      }
      if (parentCode === childCode) {
        validationErrors.push(`Baris ${index + 1}: Parent dan Child tidak boleh sama (${childCode}).`);
        return;
      }

      const revisionNo = Number(draft.revisionNo || 1) || 1;
      const effectiveStartDate = String(draft.effectiveStartDate || todayDateInput).trim() || todayDateInput;
      const effectiveEndDate = String(draft.effectiveEndDate || '').trim();
      const key = `${parentCode}::${childCode}::${revisionNo}::${effectiveStartDate}::${effectiveEndDate}`;
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          parentCode,
          childCode,
          qty: Number(draft.qty || 0),
          scrap: Number(draft.scrap || 0),
          yieldFactor: Number(draft.yieldFactor || 1) || 1,
          positionCode: String(draft.positionCode || '').trim(),
          substituteCodesText: String(draft.substituteCodesText || '').trim(),
          revisionNo,
          effectiveStartDate,
          effectiveEndDate,
          bomVersion: String(draft.bomVersion || '').trim(),
          reference: String(draft.reference || '').trim(),
        });
        return;
      }

      const current = aggregatedMap.get(key);
      current.qty += Number(draft.qty || 0);
      current.scrap = Math.max(Number(current.scrap || 0), Number(draft.scrap || 0));
      current.yieldFactor = Number(draft.yieldFactor || 1) || Number(current.yieldFactor || 1) || 1;
      current.positionCode = current.positionCode || String(draft.positionCode || '').trim();
      current.substituteCodesText = current.substituteCodesText || String(draft.substituteCodesText || '').trim();
    });

    if (validationErrors.length > 0) {
      const preview = validationErrors.slice(0, 10).join('\n');
      alert(`Import dibatalkan.\n${preview}${validationErrors.length > 10 ? `\n... dan ${validationErrors.length - 10} error lainnya.` : ''}`);
      return;
    }

    const aggregatedRelations = Array.from(aggregatedMap.values());
    const confirmed = window.confirm(
      `Ditemukan ${aggregatedRelations.length} relasi BOM valid dan ${rootCodes.length} baris root/reference.\nLanjut import ke database?`,
    );
    if (!confirmed) return;

    try {
      for (const relation of aggregatedRelations) {
        const childItem = masterItemsByCode.get(relation.childCode) || {};
        const processCodes = mapProcessFlowToCodes(
          Array.isArray(childItem.process_flow) && childItem.process_flow.length
            ? childItem.process_flow
            : Array.isArray(childItem.processes)
              ? childItem.processes
              : [],
        );
        await upsertBomRelation({
          parentCode: relation.parentCode,
          childCode: relation.childCode,
          quantity: Number(relation.qty || 0),
          scrapFactor: Number(relation.scrap || 0),
          yieldFactor: Number(relation.yieldFactor || 1) || 1,
          positionCode: String(relation.positionCode || '').trim(),
          substituteMaterialCodes: parseSubstituteCodes(relation.substituteCodesText),
          componentType: childItem.type || '',
          componentDescription: childItem.name || relation.childCode,
          modelSpec: childItem.model || '',
          assemblyNote: '',
          processFlow: processCodes,
          processRouting: buildProcessRoutingSnapshot(processCodes),
          headerMeta: normalizeBomHeaderState({
            parentCode: relation.parentCode,
            bomVersion: relation.bomVersion || '',
            revisionNo: Number(relation.revisionNo || 1) || 1,
            effectiveStartDate: relation.effectiveStartDate || todayDateInput,
            effectiveEndDate: relation.effectiveEndDate || '',
            reference: relation.reference || '',
          }),
          mergeOnDuplicate: true,
        });
      }
      await refreshBomRelations();
      alert(`Import BOM selesai. ${aggregatedRelations.length} relasi berhasil diproses.`);
    } catch (error) {
      alert(`Gagal import BOM: ${error.message || 'Unknown error'}`);
    }
  };

  const processHTMLImport = async (htmlContent) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr'));
      
      if (rows.length < 2) {
          alert("Gagal membaca file. Pastikan menggunakan format .xls dari Template.");
          return;
      }

      const relationDrafts = [];
      const rootCodes = new Set();

      for (let i = 1; i < rows.length; i++) { // Skip header
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 15) continue; 
        
        const getText = (idx) => cells[idx]?.innerText?.trim() || '';
        const pCode = getText(1);
        const code = getText(2);
        
        if (!code) continue;

        if (!pCode || pCode === '-') {
          rootCodes.add(code);
          continue;
        }

        relationDrafts.push({
          parentCode: pCode,
          childCode: code,
          qty: parseFloat(getText(6)) || 0,
          scrap: parseFloat(getText(9)) || 0,
          revisionNo: parseInt(getText(15), 10) || 1,
          effectiveStartDate: getText(16) || todayDateInput,
          effectiveEndDate: getText(17) || '',
          yieldFactor: parseFloat(getText(18)) || 1,
          positionCode: getText(19) || '',
          substituteCodesText: getText(20) || '',
          bomVersion: getText(21) || '',
          reference: getText(22) || '',
        });
      }
      await finalizeImport(relationDrafts, Array.from(rootCodes));
    } catch (e) { 
        alert("Error membaca file."); 
        console.error(e);
    }
  };

  const exportExcel = () => {
    const rows = [];
    const flattenRows = (nodes, level = 0) => {
      (nodes || []).forEach((node) => {
        const relation = node.relation || null;
        rows.push({
          level,
          parentCode: relation?.parent_code || '-',
          code: node.code || '',
          name: node.name || '',
          model: node.model || '',
          type: node.type || '',
          qty: relation ? Number(relation.quantity || 0) : 1,
          uom: node.unit || node.uom || '',
          weight: Number(node.weight || 0),
          scrap: relation ? Number(relation.scrap_factor || 0) : 0,
          leadTime: Number(node.lead_time_days || 0),
          line: node.line_production || node.line || '',
          processes: Array.isArray(node.processes) ? node.processes : [],
          cycleTime: Number(node.cycle_time_seconds || 0),
          packing: node.packing_name || node.packing || '',
          revisionNo: Number(relation?.revision_no || 1) || 1,
          effectiveStartDate: relation?.effective_start_date || relation?.effective_date || '',
          effectiveEndDate: relation?.effective_end_date || '',
          yieldFactor: relation ? Number(relation.yield_factor || 1) || 1 : 1,
          positionCode: relation?.position_code || '',
          substituteCodesText: formatSubstituteCodes(relation?.substitute_material_codes || []),
          bomVersion: relation?.bom_version || '',
          reference: relation?.reference || '',
        });
        flattenRows(node.children || [], level + 1);
      });
    };
    flattenRows(bomTreeData);
    let tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head><body>
    <table border="1">
      <thead>
        <tr style="background-color:#eee; font-weight:bold;">
          <th>Level</th><th>Parent Code</th><th>Kode Item</th><th>Nama Item</th><th>Model</th><th>Tipe</th>
          <th>Qty (Use)</th><th>UOM</th><th>Berat (Kg)</th><th>Scrap %</th><th>Lead Time</th>
          <th>Line</th><th>Process List</th><th>Cycle Time</th><th>Packing</th>
          <th>Revision No</th><th>Effective Start</th><th>Effective End</th><th>Yield Factor</th><th>Position Code</th><th>Substitute Codes</th><th>BOM Version</th><th>Reference</th>
        </tr>
      </thead>
      <tbody>`;
    rows.forEach((item) => {
       const procStr = item.processes ? item.processes.join(' | ') : '';
       tableHTML += `<tr>
         <td>${item.level}</td>
         <td>${item.parentCode}</td>
         <td style="mso-number-format:'\@'">${item.code}</td>
         <td>${item.name}</td><td>${item.model}</td><td>${item.type}</td>
         <td>${item.qty}</td><td>${item.uom}</td>
         <td>${item.weight}</td><td>${item.scrap}</td><td>${item.leadTime}</td>
         <td>${item.line}</td><td>${procStr}</td><td>${item.cycleTime}</td><td>${item.packing}</td>
         <td>${item.revisionNo}</td><td>${item.effectiveStartDate}</td><td>${item.effectiveEndDate}</td><td>${item.yieldFactor}</td><td>${item.positionCode}</td><td>${item.substituteCodesText}</td><td>${item.bomVersion}</td><td>${item.reference}</td>
       </tr>`;
    });
    tableHTML += `</tbody></table></body></html>`;
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([tableHTML], { type: 'application/vnd.ms-excel' })); a.download = 'Master_Data_BOM.xls'; a.click();
  };

  const exportImportTemplate = () => {
    const sampleRows = [
      {
        level: 0,
        parentCode: '-',
        code: 'FG-EXAMPLE-001',
        name: 'ASSY PEDAL COMPLETE',
        model: 'MODEL-A',
        type: 'FG',
        qty: 1,
        uom: 'PCS',
        weight: 0,
        scrap: 0,
        leadTime: 0,
        line: 'ASSY-01',
        processes: ['ASSY', 'FINAL CHECK'],
        cycleTime: 60,
        packing: 'BOX',
      },
      {
        level: 1,
        parentCode: 'FG-EXAMPLE-001',
        code: 'SUB-EXAMPLE-001',
        name: 'SUB ASSY PEDAL',
        model: 'MODEL-A',
        type: 'SUB_ASSY',
        qty: 1,
        uom: 'PCS',
        weight: 0,
        scrap: 0,
        leadTime: 1,
        line: 'ASSY-01',
        processes: ['WELDING', 'GRINDING'],
        cycleTime: 45,
        packing: 'RACK',
      },
      {
        level: 2,
        parentCode: 'SUB-EXAMPLE-001',
        code: 'CP-EXAMPLE-001',
        name: 'BRACKET LH',
        model: 'MODEL-A',
        type: 'CP',
        qty: 1,
        uom: 'PCS',
        weight: 0.12,
        scrap: 2,
        leadTime: 1,
        line: 'PRESS-01',
        processes: ['BLANKING', 'BENDING'],
        cycleTime: 12,
        packing: 'BIN',
      },
      {
        level: 2,
        parentCode: 'SUB-EXAMPLE-001',
        code: 'CP-EXAMPLE-002',
        name: 'BRACKET RH',
        model: 'MODEL-A',
        type: 'CP',
        qty: 1,
        uom: 'PCS',
        weight: 0.12,
        scrap: 2,
        leadTime: 1,
        line: 'PRESS-01',
        processes: ['BLANKING', 'BENDING'],
        cycleTime: 12,
        packing: 'BIN',
      },
      {
        level: 2,
        parentCode: 'SUB-EXAMPLE-001',
        code: 'CP-EXAMPLE-003',
        name: 'PLATE STOPPER',
        model: 'MODEL-A',
        type: 'CP',
        qty: 1,
        uom: 'PCS',
        weight: 0.08,
        scrap: 1,
        leadTime: 1,
        line: 'PRESS-02',
        processes: ['BLANKING', 'PIERCING'],
        cycleTime: 10,
        packing: 'BIN',
      },
      {
        level: 3,
        parentCode: 'CP-EXAMPLE-001',
        code: 'RM-EXAMPLE-001',
        name: 'SHEET SPHC 2.0T',
        model: '',
        type: 'RAW MATERIAL',
        qty: 0.35,
        uom: 'KG',
        weight: 0,
        scrap: 3,
        leadTime: 2,
        line: 'STORE-RM',
        processes: [],
        cycleTime: 0,
        packing: 'SHEET',
      },
      {
        level: 3,
        parentCode: 'CP-EXAMPLE-001',
        code: 'RM-EXAMPLE-002',
        name: 'BOLT M8X20',
        model: '',
        type: 'RAW MATERIAL',
        qty: 2,
        uom: 'PCS',
        weight: 0,
        scrap: 0,
        leadTime: 1,
        line: 'STORE-RM',
        processes: [],
        cycleTime: 0,
        packing: 'BAG',
      },
      {
        level: 3,
        parentCode: 'CP-EXAMPLE-002',
        code: 'RM-EXAMPLE-003',
        name: 'SHEET SPHC 2.0T RH',
        model: '',
        type: 'RAW MATERIAL',
        qty: 0.33,
        uom: 'KG',
        weight: 0,
        scrap: 3,
        leadTime: 2,
        line: 'STORE-RM',
        processes: [],
        cycleTime: 0,
        packing: 'SHEET',
      },
      {
        level: 3,
        parentCode: 'CP-EXAMPLE-003',
        code: 'RM-EXAMPLE-004',
        name: 'PLATE SPCC 1.6T',
        model: '',
        type: 'RAW MATERIAL',
        qty: 0.2,
        uom: 'KG',
        weight: 0,
        scrap: 2,
        leadTime: 2,
        line: 'STORE-RM',
        processes: [],
        cycleTime: 0,
        packing: 'SHEET',
      },
      {
        level: 3,
        parentCode: 'CP-EXAMPLE-003',
        code: 'RM-EXAMPLE-005',
        name: 'SPRING STOPPER',
        model: '',
        type: 'RAW MATERIAL',
        qty: 1,
        uom: 'PCS',
        weight: 0,
        scrap: 0,
        leadTime: 1,
        line: 'STORE-RM',
        processes: [],
        cycleTime: 0,
        packing: 'BAG',
      },
      {
        level: '',
        parentCode: '',
        code: '',
        name: '',
        model: '',
        type: '',
        qty: '',
        uom: '',
        weight: '',
        scrap: '',
        leadTime: '',
        line: '',
        processes: [],
        cycleTime: '',
        packing: '',
      },
      {
        level: '',
        parentCode: '',
        code: '',
        name: '',
        model: '',
        type: '',
        qty: '',
        uom: '',
        weight: '',
        scrap: '',
        leadTime: '',
        line: '',
        processes: [],
        cycleTime: '',
        packing: '',
      },
    ];
    const buildRow = (row) => {
      const processes = Array.isArray(row.processes) ? row.processes.join(' | ') : row.processes || '';
      return `
        <tr>
          <td>${row.level}</td><td>${row.parentCode}</td><td>${row.code}</td><td>${row.name}</td><td>${row.model}</td><td>${row.type}</td>
          <td>${row.qty}</td><td>${row.uom}</td><td>${row.weight}</td><td>${row.scrap}</td><td>${row.leadTime}</td>
          <td>${row.line}</td><td>${processes}</td><td>${row.cycleTime}</td><td>${row.packing}</td>
          <td>${row.revisionNo || 1}</td><td>${row.effectiveStartDate || todayDateInput}</td><td>${row.effectiveEndDate || ''}</td><td>${row.yieldFactor || 1}</td><td>${row.positionCode || ''}</td><td>${row.substituteCodesText || ''}</td><td>${row.bomVersion || ''}</td><td>${row.reference || ''}</td>
        </tr>`;
    };
    const tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head><body>
    <table border="1">
      <thead>
        <tr><th colspan="23" style="background-color:#dbeafe; text-align:left;">PETUNJUK: Import hanya membentuk relasi BOM. Kode Parent dan Child wajib sudah terdaftar di Master Ref Item.</th></tr>
        <tr><th colspan="23" style="background-color:#ecfccb; text-align:left;">CATATAN: Qty akan dikalkulasi dengan Yield Factor. Isi Position Code untuk titik pasang, dan Substitute Codes untuk material alternatif.</th></tr>
        <tr><th colspan="23" style="background-color:#fef3c7; text-align:left;">CONTOH: SUB-EXAMPLE-001 punya 3 Child Part. RM-EXAMPLE-001 dan RM-EXAMPLE-002 masuk ke CP-EXAMPLE-001 karena Parent Code = CP-EXAMPLE-001.</th></tr>
        <tr style="background-color:#eee; font-weight:bold;">
          <th>Level</th><th>Parent Code</th><th>Kode Item</th><th>Nama Item</th><th>Model</th><th>Tipe</th>
          <th>Qty (Use)</th><th>UOM</th><th>Berat (Kg)</th><th>Scrap %</th><th>Lead Time</th>
          <th>Line</th><th>Process List</th><th>Cycle Time</th><th>Packing</th>
          <th>Revision No</th><th>Effective Start</th><th>Effective End</th><th>Yield Factor</th><th>Position Code</th><th>Substitute Codes</th><th>BOM Version</th><th>Reference</th>
        </tr>
      </thead>
      <tbody>
        ${sampleRows.map((row) => buildRow(row)).join('')}
      </tbody></table></body></html>`;
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([tableHTML], { type: 'application/vnd.ms-excel' })); a.download = 'Template_Import_BOM.xls'; a.click();
  };

  // --- AI LOGIC ---
  const callGeminiAPI = async (prompt) => {
    try {
      const data = await apiFetch('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (data?.error) {
        throw new Error(data.error.message || data.error);
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) { return null; }
  };
  const handleGenerateBOM = async () => {
    if (!aiPrompt) return; setIsAiLoading(true);
    const res = await callGeminiAPI(`Buat BOM JSON recursive (FG,WIP,RM) utk: "${aiPrompt}". Indo. Field: code,name,type,qty,uom,weight,model,line,supplier,processes (array of string)`);
    if (res) {
      try {
        const bomData = JSON.parse(res.replace(/```json|```/g, '').trim());
        setAiResultModal({
          show: true,
          title: 'AI Draft BOM',
          content: JSON.stringify(bomData, null, 2),
        });
        setShowAiModal(false);
      } catch (e) {}
    } setIsAiLoading(false);
  };

  // --- FORECAST UTILS (UPDATED FOR XLS) ---
  const handlePlanFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const content = evt.target.result;
        // Parse HTML Table instead of CSV
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const rows = Array.from(doc.querySelectorAll('tr'));
        const loadedPlan = [];
        
        // Start from row 1 (skip header)
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length < 3) continue;
            
            const fgCode = cells[0].innerText.trim();
            const qty = parseFloat(cells[1].innerText.trim()) || 0;
            const period = cells[2].innerText.trim() || '-';
            
            const fgItem = masterItemsNormalized.find((item) => (
              item.code === fgCode && getBomItemBucket(item) === 'FG'
            ));
            if (fgItem) {
                loadedPlan.push({
                    id: Date.now() + i, fgId: fgItem.id, qty, period
                });
            }
        }
        
        if (loadedPlan.length > 0) {
            setProductionPlan(prev => [...prev, ...loadedPlan]);
            alert(`Berhasil mengimpor ${loadedPlan.length} rencana produksi.`);
        } else {
            alert("Tidak ada data rencana valid. Pastikan menggunakan Template XLS.");
        }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const exportPlanTemplate = () => {
      const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head><body>
      <table border="1">
        <thead>
          <tr style="background-color:#eee; font-weight:bold;">
            <th>FG_Code</th><th>Qty</th><th>Period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="mso-number-format:'\@'">FG-001</td>
            <td>50</td>
            <td>Januari 2025</td>
          </tr>
        </tbody></table></body></html>`;
      const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([tableHTML], { type: 'application/vnd.ms-excel' })); a.download = 'Template_Rencana.xls'; a.click();
  };

  const exportForecastResult = () => {
      if (!forecastResult) return;
      let csv = "Kode Material;Nama;Tipe;Total Kebutuhan;Satuan\n";
      forecastResult.forEach(res => csv += `${res.code};"${res.name}";${res.type};${res.totalQty};${res.uom}\n`);
      const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'Hasil_MRP_Material.csv'; a.click();
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 bg-gray-50 shadow-xl rounded-xl mt-4 min-h-screen flex flex-col font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-lg shadow-lg text-white">
            <Factory size={24}/>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">BOM PRO <span className="text-indigo-600">Manager</span></h1>
            <p className="text-slate-400 text-[10px] font-semibold tracking-wide uppercase">Production Control System</p>
            {!allowEdit && (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Read Only Mode
              </p>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400"/>
          </div>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-colors" 
            placeholder="Cari Komponen, Kode, atau Supplier..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
           <div className="relative">
             <button onClick={()=>setShowDataMenu(!showDataMenu)} className="px-3 py-2 bg-white text-slate-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-xs font-bold shadow-sm">
                <Database size={16}/> Data <ChevronDown size={12}/>
             </button>
             {showDataMenu && (
               <div className="absolute top-full right-0 mt-2 w-56 bg-white shadow-xl rounded-lg border border-gray-100 z-50 py-1 text-xs font-medium">
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xls,.xml" onChange={handleFileUpload} />
                 <button onClick={exportImportTemplate} className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex gap-2"><FileSpreadsheet size={14}/> Download Template Relasi .xls</button>
                 {allowEdit && (
                   <button onClick={() => { fileInputRef.current.click(); setShowDataMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex gap-2"><Upload size={14}/> Import Relasi BOM .xls</button>
                 )}
                 <button onClick={() => { exportExcel(); setShowDataMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex gap-2 border-t"><Download size={14}/> Export .xls</button>
               </div>
             )}
           </div>
           
           <div className="h-6 w-px bg-gray-300 mx-1"></div>
           
           <button onClick={() => setShowForecastModal(true)} className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 border border-indigo-100 shadow-sm" title="Forecast"><Calculator size={18}/></button>
           {allowEdit && (
             <button onClick={() => setShowAiModal(true)} className="p-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 border border-purple-100 shadow-sm" title="AI Generate"><Sparkles size={18}/></button>
           )}
           <button onClick={() => setViewMode(viewMode === 'tree' ? 'table' : 'tree')} className="p-2 bg-white text-slate-600 rounded-lg hover:bg-gray-50 border border-gray-200 shadow-sm" title="Switch View">
              {viewMode === 'tree' ? <Table size={18}/> : <FolderTree size={18}/>}
           </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col gap-4 flex-1">
        
        {/* --- COLLAPSIBLE INPUT FORM --- */}
        {allowEdit && (
        <div ref={formTopRef} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => setIsFormOpen(!isFormOpen)} className={`w-full flex justify-between items-center p-3 px-4 ${isFormOpen ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-white hover:bg-gray-50'} transition-colors text-left`}>
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${isFormOpen ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}><Plus size={14}/></div>
              <span className={`text-sm font-bold ${isFormOpen ? 'text-indigo-800' : 'text-slate-600'}`}>INPUT KOMPONEN BARU</span>
            </div>
            {isFormOpen ? <ChevronUp size={18} className="text-indigo-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
          </button>

          {isFormOpen && (
            <div className="p-5 bg-white animate-in slide-in-from-top-2 duration-200">
              {showSingleForm && (
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Induk (Parent)</label>
                    <select
                      value={selectedParent?.code || newItem.parentId || ''}
                      onChange={(e) => handleParentSelectChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={!!editingRelation}
                    >
                      <option value="">-- Level Teratas (FG) --</option>
                      {parentOptionsSingle.map(item => (
                        <option key={`parent-${item.code}`} value={item.code}>{item.code} - {item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipe Komponen Baru (Master Category)</label>
                    <select
                      className={`w-full p-2 border border-gray-300 rounded text-xs ${getLockedFieldClass(isCurrentFormMasterLocked)}`}
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                      disabled={isCurrentFormMasterLocked}
                    >
                      <option value="FG">Finished Good (FG)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kode Item</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs font-mono" placeholder="Contoh: RM-102" value={newItem.code} onChange={e=>setNewItem({...newItem, code:e.target.value})} onBlur={handleItemCodeBlur} required/>
                    {isCurrentFormMasterLocked && (
                      <div className="mt-1 text-[10px] text-amber-700">Field master item read-only. Ubah datanya dari Master Ref Item.</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Part No</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-600" placeholder="Auto dari kode item" value={newItem.partNo} readOnly/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Part Name</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs bg-gray-50 text-gray-600" placeholder="Auto dari kode item" value={newItem.name} readOnly/>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kategori Umum</label>
                    <input
                      list="bom-category-options"
                      className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
                      placeholder="Pilih category"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Organisasi</label>
                    <input
                      list="bom-org-options"
                      className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
                      placeholder="Plant / Area / Warehouse"
                      value={newItem.organization}
                      onChange={(e) => setNewItem({ ...newItem, organization: e.target.value })}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2">Parameter Umum</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isCurrentFormMasterLocked)}`} placeholder="Line A" value={newItem.line} onChange={e=>setNewItem({...newItem, line:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(true)}`} placeholder="Customer" value={currentFormCustomerLabel || newItem.customer} onChange={e=>setNewItem({...newItem, customer:e.target.value})} readOnly/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isCurrentFormMasterLocked)}`} placeholder="Gudang / Area" value={newItem.location} onChange={e=>setNewItem({...newItem, location:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isCurrentFormMasterLocked)}`} placeholder="Box" value={newItem.packing} onChange={e=>setNewItem({...newItem, packing:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isCurrentFormMasterLocked)}`} value={newItem.cycleTime} onChange={e=>setNewItem({...newItem, cycleTime:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                        <span>Daftar Model / Spesifikasi</span>
                        {!isCurrentFormMasterLocked && <button type="button" onClick={addModelRow} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>}
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(newItem.modelCodes && newItem.modelCodes.length ? newItem.modelCodes : ['']).map((modelCode, idx) => (
                          <div key={`model-row-${idx}`} className="flex gap-1 items-center">
                            <span className="text-[10px] text-gray-400 w-4">{idx + 1}.</span>
                            <select
                              className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(isCurrentFormMasterLocked)}`}
                              value={modelCode || ''}
                              onChange={(e) => handleModelSelectChange(idx, e.target.value)}
                              disabled={isCurrentFormMasterLocked}
                            >
                              <option value="">- Pilih Model -</option>
                              {localModels.map((model) => (
                                <option key={`model-opt-${model.code}`} value={model.code}>
                                  {model.code}{model.name ? ` - ${model.name}` : ''}
                                </option>
                              ))}
                              <option value="__new__">+ New Master Model</option>
                            </select>
                            {!isCurrentFormMasterLocked && (newItem.modelCodes?.length || 0) > 1 && (
                              <button type="button" onClick={() => removeModelRow(idx)} className="text-red-400 hover:text-red-600">
                                <X size={12}/>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                        <span>Routing Proses per Step</span>
                        {!isCurrentFormMasterLocked && <button type="button" onClick={addProcessField} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>}
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {bomProcessOptionsAll.length === 0 && (
                          <div className="text-[10px] text-gray-400">Master process masih kosong.</div>
                        )}
                        {newItem.processes.map((proc, idx) => (
                          <div key={idx} className="flex gap-1 items-center">
                            <span className="text-[10px] text-gray-400 w-4">{idx+1}.</span>
                            <select
                              className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(isCurrentFormMasterLocked)}`}
                              value={proc || ''}
                              onChange={(e) => handleProcessChange(idx, e.target.value)}
                              disabled={isCurrentFormMasterLocked}
                            >
                              <option value="">- Pilih proses -</option>
                              {bomProcessOptionsAll.map((processItem) => (
                                <option key={`route-proc-${processItem.code}`} value={processItem.code}>
                                  {getProcessDisplayLabel(processItem)}
                                </option>
                              ))}
                            </select>
                            {!isCurrentFormMasterLocked && newItem.processes.length > 1 && (<button type="button" onClick={() => removeProcessField(idx)} className="text-red-400 hover:text-red-600"><X size={12}/></button>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Catatan Khusus (Per Assembly)</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded text-xs resize-y"
                    placeholder="Instruksi perakitan khusus untuk parent ini"
                    value={newItem.note}
                    onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                   <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">QTY / USE</label><input type="number" step="0.01" className="w-full p-1 text-right text-xs bg-white border border-blue-200 rounded" value={newItem.qty} onChange={e=>setNewItem({...newItem, qty:e.target.value})}/></div>
                   <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">SATUAN</label><input type="text" className={`w-full p-1 text-xs border border-blue-200 rounded ${getLockedFieldClass(isCurrentFormMasterLocked)}`} value={newItem.uom} onChange={e=>setNewItem({...newItem, uom:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                   <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">BERAT (KG)</label><input type="number" step="0.01" className={`w-full p-1 text-right text-xs border border-blue-200 rounded ${getLockedFieldClass(isCurrentFormMasterLocked)}`} value={newItem.weight} onChange={e=>setNewItem({...newItem, weight:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                   <div className="bg-yellow-50 p-2 rounded border border-yellow-100"><label className="text-[9px] font-bold text-yellow-700 block">SCRAP %</label><input type="number" step="0.1" className="w-full p-1 text-right text-xs bg-white border border-yellow-200 rounded" value={newItem.scrap} onChange={e=>setNewItem({...newItem, scrap:e.target.value})}/></div>
                   <div className="bg-red-50 p-2 rounded border border-red-100"><label className="text-[9px] font-bold text-red-700 block">LEAD TIME</label><input type="number" className={`w-full p-1 text-right text-xs border border-red-200 rounded ${getLockedFieldClass(isCurrentFormMasterLocked)}`} value={newItem.leadTime} onChange={e=>setNewItem({...newItem, leadTime:e.target.value})} readOnly={isCurrentFormMasterLocked}/></div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={itemSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60">
                    {itemSaving ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20}/>} {itemSaving ? 'Menyimpan...' : 'SIMPAN KOMPONEN KE DATABASE'}
                  </button>
                </div>
              </form>
              )}

              <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-700">
                    {bulkMode === 'single'
                      ? 'Input Single-Level (FG -> Raw Material)'
                      : 'Input Multi-Level (FG -> Child Part -> Raw / Indirect)'}
                    </div>
                    {bulkMode === 'multi' && (
                    <button type="button" onClick={addBulkChild} className="text-xs px-3 py-1.5 rounded border text-indigo-600 hover:text-indigo-700">
                      + Tambah Child Part
                    </button>
                  )}
                </div>
                <form onSubmit={handleBulkSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Parent Utama (Level 0)</label>
                      <select
                        value={bulkParentCode}
                        onChange={(e) => handleBulkParentSelectChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- Pilih Parent --</option>
                        {(bulkMode === 'single' ? parentOptionsSingle : parentOptionsMulti).map(item => (
                          <option key={`bulk-parent-${item.code}`} value={item.code}>{item.code} - {item.name}</option>
                        ))}
                      </select>
                      {!bomLoading && (bulkMode === 'single' ? parentOptionsSingle : parentOptionsMulti).length === 0 && (
                        <div className="mt-1 text-[10px] text-amber-600">
                          {bulkMode === 'single'
                            ? 'Tidak ada FG yang belum dipakai sebagai parent BOM.'
                            : 'Tidak ada Sub-Assy yang belum dipakai sebagai parent BOM.'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Revision No</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        value={bomHeader.revisionNo}
                        onChange={(e) => setBomHeader((prev) => ({ ...prev, revisionNo: e.target.value, headerId: null }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Effective Start</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        value={bomHeader.effectiveStartDate || ''}
                        onChange={(e) => setBomHeader((prev) => ({ ...prev, effectiveStartDate: e.target.value, headerId: null }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Effective End</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        value={bomHeader.effectiveEndDate || ''}
                        onChange={(e) => setBomHeader((prev) => ({ ...prev, effectiveEndDate: e.target.value, headerId: null }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">BOM Version</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        placeholder="Opsional"
                        value={bomHeader.bomVersion || ''}
                        onChange={(e) => setBomHeader((prev) => ({ ...prev, bomVersion: e.target.value, headerId: null }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Reference</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                        placeholder="Doc / ECO / Note"
                        value={bomHeader.reference || ''}
                        onChange={(e) => setBomHeader((prev) => ({ ...prev, reference: e.target.value, headerId: null }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Mode Input BOM</label>
                      <div className="flex flex-col md:flex-row gap-2 text-xs">
                        <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${bulkMode === 'single' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                          <input
                            type="radio"
                            name="bom-mode"
                            className="accent-indigo-600"
                            checked={bulkMode === 'single'}
                            onChange={() => handleBulkModeChange('single')}
                          />
                          <span>BOM Single-Level (Part Tunggal)</span>
                        </label>
                        <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${bulkMode === 'multi' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
                          <input
                            type="radio"
                            name="bom-mode"
                            className="accent-indigo-600"
                            checked={bulkMode === 'multi'}
                            onChange={() => handleBulkModeChange('multi')}
                          />
                          <span>BOM Multi-Level (Sub-Assy)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {bulkMode === 'single' ? (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="text-xs font-semibold text-slate-600">Detail Parent Utama</div>
                        <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                          <div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2">Parameter Umum</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isBulkParentMasterLocked)}`} placeholder="Line A" value={bulkParentDetails.line} onChange={e=>updateBulkParentDetails({ line: e.target.value })} readOnly={isBulkParentMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(true)}`} placeholder="Customer" value={bulkParentCustomerLabel || bulkParentDetails.customer} onChange={e=>updateBulkParentDetails({ customer: e.target.value })} readOnly/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isBulkParentMasterLocked)}`} placeholder="Gudang / Area" value={bulkParentDetails.location} onChange={e=>updateBulkParentDetails({ location: e.target.value })} readOnly={isBulkParentMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isBulkParentMasterLocked)}`} placeholder="Box" value={bulkParentDetails.packing} onChange={e=>updateBulkParentDetails({ packing: e.target.value })} readOnly={isBulkParentMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(isBulkParentMasterLocked)}`} value={bulkParentDetails.cycleTime} onChange={e=>updateBulkParentDetails({ cycleTime: e.target.value })} readOnly={isBulkParentMasterLocked}/></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Daftar Model / Spesifikasi</span>
                                {!isBulkParentMasterLocked && <button type="button" onClick={addBulkParentModelRow} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>}
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(bulkParentDetails.modelCodes && bulkParentDetails.modelCodes.length ? bulkParentDetails.modelCodes : ['']).map((modelCode, modelIdx) => (
                                  <div key={`parent-model-${modelIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{modelIdx + 1}.</span>
                                    <select
                                      className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(isBulkParentMasterLocked)}`}
                                      value={modelCode || ''}
                                      onChange={(e) => handleBulkParentModelSelectChange(modelIdx, e.target.value)}
                                      disabled={isBulkParentMasterLocked}
                                    >
                                      <option value="">- Pilih Model -</option>
                                      {localModels.map((model) => (
                                        <option key={`parent-model-opt-${model.code}`} value={model.code}>
                                          {model.code}{model.name ? ` - ${model.name}` : ''}
                                        </option>
                                      ))}
                                      <option value="__new__">+ New Master Model</option>
                                    </select>
                                    {!isBulkParentMasterLocked && (bulkParentDetails.modelCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkParentModelRow(modelIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {localModels.length === 0 && (
                                  <div className="text-[10px] text-gray-400">Master model masih kosong.</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Urutan Proses Produksi</span>
                                {!isBulkParentMasterLocked && <button type="button" onClick={addBulkParentProcess} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>}
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(bulkParentDetails.processCodes || ['']).map((procCode, procIdx) => (
                                  <div key={`parent-proc-${procIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{procIdx + 1}.</span>
                                    <select
                                      className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(isBulkParentMasterLocked)}`}
                                      value={procCode || ''}
                                      onChange={(e) => updateBulkParentProcess(procIdx, e.target.value)}
                                      disabled={isBulkParentMasterLocked}
                                    >
                                      <option value="">- Pilih Process -</option>
                                      {bomProcessOptionsForMode.map((proc) => (
                                        <option key={`parent-proc-${proc.code}`} value={proc.code}>
                                          {getProcessDisplayLabel(proc)}
                                        </option>
                                      ))}
                                    </select>
                                    {!isBulkParentMasterLocked && (bulkParentDetails.processCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkParentProcess(procIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {bomProcessOptionsForMode.length === 0 && (
                                  <div className="text-[10px] text-gray-400">Master process masih kosong.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Catatan Khusus (Per Assembly)</label>
                          <textarea
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded text-xs resize-y"
                            placeholder="Instruksi perakitan khusus untuk parent ini"
                            value={bulkParentDetails.note}
                            onChange={(e) => updateBulkParentDetails({ note: e.target.value })}
                          />
                        </div>

                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                            <span>{bulkMode === 'single' ? 'Material (Raw) untuk Parent Ini' : 'Material (Raw / Indirect) untuk Child Ini'}</span>
                            <button type="button" onClick={addBulkParentMaterial} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Material</button>
                          </div>
                          {(() => {
                            const existingCodes = getExistingMaterialCodesForParent(bulkParentCode);
                            return (
                          <div className="space-y-2">
                            {(bulkParentMaterials || []).map((material, matIdx) => (
                              <div key={`parent-mat-${material.id || matIdx}`} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Material Code</label>
                                  <input
                                    list="bom-material-rm-options"
                                    className={`w-full p-2 border border-gray-300 rounded text-xs ${material.isExisting ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    placeholder="Kode Material"
                                    value={material.code}
                                    onChange={(e) => {
                                      if (material.isExisting) return;
                                      const nextCode = e.target.value;
                                      const normalizedCode = String(nextCode || '').trim().toUpperCase();
                                      const originalCode = String(material.originalCode || material.code || '').trim().toUpperCase();
                                      if (normalizedCode && existingCodes.has(normalizedCode) && !(material.isExisting && originalCode === normalizedCode)) {
                                        alert('Material ini sudah ada di BOM.');
                                      }
                                      updateBulkParentMaterial(matIdx, { code: nextCode });
                                    }}
                                    onBlur={() => handleBulkParentMaterialCodeBlur(matIdx)}
                                    readOnly={material.isExisting}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama Material</label>
                                  <input
                                    className={`w-full p-2 border border-gray-300 rounded text-xs ${material.isExisting ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    placeholder="Nama material"
                                    value={material.name}
                                    onChange={(e) => {
                                      if (material.isExisting) return;
                                      updateBulkParentMaterial(matIdx, { name: e.target.value });
                                    }}
                                    readOnly={material.isExisting}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Qty</label>
                                  <input
                                    type="number"
                                    className="w-full p-2 border border-gray-300 rounded text-xs text-right"
                                    value={material.qty}
                                    onChange={(e) => updateBulkParentMaterial(matIdx, { qty: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">UOM</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    value={material.uom}
                                    onChange={(e) => updateBulkParentMaterial(matIdx, { uom: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Yield</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full p-2 border border-gray-300 rounded text-xs text-right"
                                    value={material.yieldFactor ?? 1}
                                    onChange={(e) => updateBulkParentMaterial(matIdx, { yieldFactor: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Posisi</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="LH / RH / Top"
                                    value={material.positionCode || ''}
                                    onChange={(e) => updateBulkParentMaterial(matIdx, { positionCode: e.target.value })}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Substitusi</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="Kode alternatif, pisahkan koma"
                                    value={material.substituteCodesText || ''}
                                    onChange={(e) => updateBulkParentMaterial(matIdx, { substituteCodesText: e.target.value })}
                                  />
                                </div>
                                <div className="flex justify-end items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold inline-flex items-center gap-1 ${material.isExisting ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {material.isExisting && <Lock size={10} />}
                                    {material.isExisting ? 'Existing' : 'New'}
                                  </span>
                                  {(bulkParentMaterials || []).length > 1 && (
                                    <button type="button" onClick={() => removeBulkParentMaterial(matIdx)} className="text-xs text-rose-600 hover:text-rose-700">
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {bulkChildren.map((child, childIdx) => {
                      const childMasterLocked = Boolean(masterItemsByCode.get(String(child.code || '').trim()));
                      const childCustomerLabel = getItemCustomerLabel(child.code);
                      return (
                      <div key={child.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-slate-600">Child Part #{childIdx + 1}</div>
                          {bulkChildren.length > 1 && (
                            <button type="button" onClick={() => removeBulkChild(childIdx)} className="text-xs text-rose-600 hover:text-rose-700">
                              Hapus
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Child Code (Sub-Assy)</label>
                            <input
                              list="bom-child-part-options"
                              className="w-full p-2 border border-gray-300 rounded text-xs"
                              placeholder="Kode Child Part"
                              value={child.code}
                              onChange={(e) => updateBulkChild(childIdx, { code: e.target.value })}
                              onBlur={() => handleBulkChildCodeBlur(childIdx)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama Child</label>
                            <input
                              className="w-full p-2 border border-gray-300 rounded text-xs"
                              placeholder="Nama komponen"
                              value={child.name}
                              onChange={(e) => updateBulkChild(childIdx, { name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipe Child (Master Category)</label>
                            <select
                              className={`w-full p-2 border border-gray-300 rounded text-xs ${getLockedFieldClass(childMasterLocked)}`}
                              value={child.type}
                              onChange={(e) => updateBulkChild(childIdx, { type: e.target.value })}
                              disabled={childMasterLocked}
                            >
                              <option value="CP">Child Part (CP)</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                          <div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2">Parameter Umum</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(childMasterLocked)}`} placeholder="Line A" value={child.line} onChange={e=>updateBulkChild(childIdx, { line: e.target.value })} readOnly={childMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(true)}`} placeholder="Customer" value={childCustomerLabel || child.customer} onChange={e=>updateBulkChild(childIdx, { customer: e.target.value })} readOnly/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(childMasterLocked)}`} placeholder="Gudang / Area" value={child.location} onChange={e=>updateBulkChild(childIdx, { location: e.target.value })} readOnly={childMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(childMasterLocked)}`} placeholder="Box" value={child.packing} onChange={e=>updateBulkChild(childIdx, { packing: e.target.value })} readOnly={childMasterLocked}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className={`w-full p-2 border rounded text-xs ${getLockedFieldClass(childMasterLocked)}`} value={child.cycleTime} onChange={e=>updateBulkChild(childIdx, { cycleTime: e.target.value })} readOnly={childMasterLocked}/></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Daftar Model / Spesifikasi</span>
                                {!childMasterLocked && <button type="button" onClick={() => addBulkModelRow(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>}
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(child.modelCodes && child.modelCodes.length ? child.modelCodes : ['']).map((modelCode, modelIdx) => (
                                  <div key={`model-${child.id}-${modelIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{modelIdx + 1}.</span>
                                    <select
                                      className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(childMasterLocked)}`}
                                      value={modelCode || ''}
                                      onChange={(e) => handleBulkModelSelectChange(childIdx, modelIdx, e.target.value)}
                                      disabled={childMasterLocked}
                                    >
                                      <option value="">- Pilih Model -</option>
                                      {localModels.map((model) => (
                                        <option key={`bulk-model-${model.code}`} value={model.code}>
                                          {model.code}{model.name ? ` - ${model.name}` : ''}
                                        </option>
                                      ))}
                                      <option value="__new__">+ New Master Model</option>
                                    </select>
                                    {!childMasterLocked && (child.modelCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkModelRow(childIdx, modelIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {localModels.length === 0 && (
                                  <div className="text-[10px] text-gray-400">Master model masih kosong.</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Urutan Proses Produksi</span>
                                {!childMasterLocked && <button type="button" onClick={() => addBulkProcess(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>}
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(child.processCodes || ['']).map((procCode, procIdx) => (
                                  <div key={`proc-${child.id}-${procIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{procIdx + 1}.</span>
                                    <select
                                      className={`flex-1 p-1.5 border rounded text-xs focus:ring-1 focus:ring-indigo-300 outline-none ${getLockedFieldClass(childMasterLocked)}`}
                                      value={procCode || ''}
                                      onChange={(e) => updateBulkProcess(childIdx, procIdx, e.target.value)}
                                      disabled={childMasterLocked}
                                    >
                                      <option value="">- Pilih Process -</option>
                                      {bomProcessOptionsForMode.map((proc) => (
                                        <option key={`proc-${proc.code}`} value={proc.code}>
                                          {getProcessDisplayLabel(proc)}
                                        </option>
                                      ))}
                                    </select>
                                    {!childMasterLocked && (child.processCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkProcess(childIdx, procIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {bomProcessOptionsForMode.length === 0 && (
                                  <div className="text-[10px] text-gray-400">Master process masih kosong.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Catatan Khusus (Per Assembly)</label>
                          <textarea
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded text-xs resize-y"
                            placeholder="Instruksi perakitan khusus untuk parent ini"
                            value={child.note}
                            onChange={(e) => updateBulkChild(childIdx, { note: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">QTY / USE</label><input type="number" step="0.01" className="w-full p-1 text-right text-xs bg-white border border-blue-200 rounded" value={child.qty} onChange={e=>updateBulkChild(childIdx, { qty: e.target.value })}/></div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">SATUAN</label><input type="text" className={`w-full p-1 text-xs border border-blue-200 rounded ${getLockedFieldClass(childMasterLocked)}`} value={child.uom} onChange={e=>updateBulkChild(childIdx, { uom: e.target.value })} readOnly={childMasterLocked}/></div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">BERAT (KG)</label><input type="number" step="0.01" className={`w-full p-1 text-right text-xs border border-blue-200 rounded ${getLockedFieldClass(childMasterLocked)}`} value={child.weight} onChange={e=>updateBulkChild(childIdx, { weight: e.target.value })} readOnly={childMasterLocked}/></div>
                          <div className="bg-yellow-50 p-2 rounded border border-yellow-100"><label className="text-[9px] font-bold text-yellow-700 block">SCRAP %</label><input type="number" step="0.1" className="w-full p-1 text-right text-xs bg-white border border-yellow-200 rounded" value={child.scrap} onChange={e=>updateBulkChild(childIdx, { scrap: e.target.value })}/></div>
                          <div className="bg-emerald-50 p-2 rounded border border-emerald-100"><label className="text-[9px] font-bold text-emerald-700 block">YIELD</label><input type="number" step="0.01" min="0.01" className="w-full p-1 text-right text-xs bg-white border border-emerald-200 rounded" value={child.yieldFactor ?? 1} onChange={e=>updateBulkChild(childIdx, { yieldFactor: e.target.value })}/></div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200"><label className="text-[9px] font-bold text-slate-700 block">POSITION</label><input type="text" className="w-full p-1 text-xs bg-white border border-slate-200 rounded" value={child.positionCode || ''} onChange={e=>updateBulkChild(childIdx, { positionCode: e.target.value })}/></div>
                          <div className="bg-red-50 p-2 rounded border border-red-100"><label className="text-[9px] font-bold text-red-700 block">LEAD TIME</label><input type="number" className={`w-full p-1 text-right text-xs border border-red-200 rounded ${getLockedFieldClass(childMasterLocked)}`} value={child.leadTime} onChange={e=>updateBulkChild(childIdx, { leadTime: e.target.value })} readOnly={childMasterLocked}/></div>
                        </div>
                        <div className="mt-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Substitute Material Codes</label>
                          <input
                            className="w-full p-2 border border-gray-300 rounded text-xs"
                            placeholder="Opsional untuk alternatif line ini"
                            value={child.substituteCodesText || ''}
                            onChange={(e) => updateBulkChild(childIdx, { substituteCodesText: e.target.value })}
                          />
                        </div>

                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                            <span>{bulkMode === 'single' ? 'Material (Raw) untuk Parent Ini' : 'Material (Raw / Indirect) untuk Child Ini'}</span>
                            <button type="button" onClick={() => addBulkMaterial(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Material</button>
                          </div>
                          <div className="space-y-2">
                            {(child.materials || []).map((material, matIdx) => (
                              <div key={`mat-${material.id}`} className={`grid grid-cols-1 gap-2 items-end ${bulkMode === 'multi' ? 'md:grid-cols-9' : 'md:grid-cols-8'}`}>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Material Code</label>
                                  <input
                                    list={bulkMode === 'multi' ? getBulkMaterialListId(material) : 'bom-material-rm-options'}
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="Kode Material"
                                    value={material.code}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { code: e.target.value })}
                                    onBlur={() => handleBulkMaterialCodeBlur(childIdx, matIdx)}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama Material</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="Nama material"
                                    value={material.name}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Qty</label>
                                  <input
                                    type="number"
                                    className="w-full p-2 border border-gray-300 rounded text-xs text-right"
                                    value={material.qty}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { qty: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">UOM</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    value={material.uom}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { uom: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Yield</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full p-2 border border-gray-300 rounded text-xs text-right"
                                    value={material.yieldFactor ?? 1}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { yieldFactor: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Posisi</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="LH / RH / Top"
                                    value={material.positionCode || ''}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { positionCode: e.target.value })}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Substitusi</label>
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded text-xs"
                                    placeholder="Kode alternatif, pisahkan koma"
                                    value={material.substituteCodesText || ''}
                                    onChange={(e) => updateBulkMaterial(childIdx, matIdx, { substituteCodesText: e.target.value })}
                                  />
                                </div>
                                {bulkMode === 'multi' && (
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipe</label>
                                    <select
                                      className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
                                      value={normalizeMaterialType(material.type, 'RAW MATERIAL')}
                                      onChange={(e) => handleBulkMaterialTypeChange(childIdx, matIdx, e.target.value)}
                                    >
                                      <option value="RAW MATERIAL">Raw Material</option>
                                      <option value="INDIRECT MATERIAL">Indirect Material</option>
                                    </select>
                                  </div>
                                )}
                                <div className="flex justify-end">
                                  {(child.materials || []).length > 1 && (
                                    <button type="button" onClick={() => removeBulkMaterial(childIdx, matIdx)} className="text-xs text-rose-600 hover:text-rose-700">
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  )}

                  <div className="pt-2">
                    <button type="submit" disabled={bulkSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md flex justify-center items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60">
                      {bulkSaving ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20}/>} {bulkSaving ? 'Menyimpan...' : (bulkMode === 'single' ? 'SIMPAN BOM SINGLE-LEVEL' : 'SIMPAN STRUKTUR BERTINGKAT')}
                    </button>
                  </div>
                </form>
              </div>

              <datalist id="bom-category-options">
                {masterCategories.map((category, idx) => (
                  <option key={`cat-${category.code || category.id || idx}`} value={category.code || getLabel(category)} />
                ))}
              </datalist>
              <datalist id="bom-org-options">
                {[...masterPlants, ...masterAreas, ...masterWarehouses].map((entry, idx) => (
                  <option key={`org-${entry.id || idx}`} value={getLabel(entry)} />
                ))}
              </datalist>
              <datalist id="bom-line-options">
                {(masterLocations || []).filter(isProductionOrWorkCenter).map((loc, idx) => (
                  <option
                    key={`line-${loc.id || idx}`}
                    value={getLineOptionLabel(loc)}
                  />
                ))}
              </datalist>
              <datalist id="bom-vendor-options">
                {masterVendors.map((vendor, idx) => (
                  <option key={`vendor-${vendor.id || idx}`} value={getLabel(vendor)} />
                ))}
              </datalist>
              <datalist id="bom-customer-options">
                {masterCustomers.map((customer, idx) => (
                  <option key={`customer-${customer.id || idx}`} value={getLabel(customer)} />
                ))}
              </datalist>
              <datalist id="bom-location-options">
                {masterWarehouses.map((wh, idx) => (
                  <option key={`loc-${wh.id || idx}`} value={getLabel(wh)} />
                ))}
              </datalist>
              <datalist id="bom-packing-options">
                {masterPackings.map((packing, idx) => (
                  <option key={`packing-${packing.code || packing.id || idx}`} value={getLabel(packing)} />
                ))}
              </datalist>
              <datalist id="bom-child-part-options">
                {childPartOptions.map((item, idx) => (
                  <option key={`bom-child-part-${item.code || idx}`} value={item.code} label={item.name} />
                ))}
              </datalist>
              <datalist id="bom-material-rm-options">
                {rawMaterialOptions.map((item, idx) => (
                  <option key={`bom-material-rm-${item.code || idx}`} value={item.code} label={item.name} />
                ))}
              </datalist>
              <datalist id="bom-material-indirect-options">
                {indirectMaterialOptions.map((item, idx) => (
                  <option key={`bom-material-indirect-${item.code || idx}`} value={item.code} label={item.name} />
                ))}
              </datalist>
            </div>
          )}
        </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-800">Audit Revisi BOM</div>
              <div className="text-[11px] text-slate-500">Lihat semua revisi per parent, tentukan revisi aktif, lalu audit line detailnya.</div>
            </div>
            <div className="flex gap-2 items-center">
              <input
                list="bom-revision-parent-options"
                className="w-full md:w-80 p-2 border border-slate-300 rounded text-xs"
                placeholder="Masukkan parent code BOM"
                value={revisionAuditParentCode}
                onChange={(e) => {
                  setRevisionAuditParentCode(e.target.value);
                  setRevisionAuditHeaderId('');
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const preferred = String(bulkParentCode || selectedParent?.code || bomHeader.parentCode || '').trim();
                  if (!preferred) return;
                  setRevisionAuditParentCode(preferred);
                  setRevisionAuditHeaderId('');
                }}
                className="px-3 py-2 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Pakai parent form
              </button>
            </div>
          </div>
          <datalist id="bom-revision-parent-options">
            {revisionAuditParentOptions.map((item) => (
              <option key={`bom-revision-parent-${item.code}`} value={item.code} label={item.name} />
            ))}
          </datalist>
          <div className="p-4">
            {!revisionAuditParentCode ? (
              <div className="text-xs text-slate-400">Pilih parent code untuk melihat histori revisi BOM.</div>
            ) : revisionAuditHeaders.length === 0 ? (
              <div className="text-xs text-slate-500">
                Parent <span className="font-mono">{revisionAuditParentCode}</span> belum punya histori revisi BOM.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {revisionAuditHeaders.map((header) => {
                    const isSelected = Number(header.headerId) === Number(revisionAuditSelectedHeaderId);
                    return (
                      <button
                        key={`rev-card-${header.headerId}`}
                        type="button"
                        onClick={() => setRevisionAuditHeaderId(String(header.headerId))}
                        className={`text-left rounded-xl border p-3 transition-colors ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800">Rev {header.revisionNo}</div>
                          <div className="flex items-center gap-1">
                            {header.isActive && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Active</span>}
                            {isSelected && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">Selected</span>}
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                          <div><span className="font-medium text-slate-700">{header.parentCode}</span>{header.parentName ? ` - ${header.parentName}` : ''}</div>
                          <div>Efektif: {header.effectiveStartDate || '-'}{header.effectiveEndDate ? ` s/d ${header.effectiveEndDate}` : ''}</div>
                          <div>Version: {header.bomVersion || '-'}</div>
                          <div>Reference: {header.reference || '-'}</div>
                          <div>Lines: {header.lineCount}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {revisionAuditSelectedHeaderId > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Detail Revisi</div>
                        <div className="text-[11px] text-slate-500">
                          Header ID {revisionAuditSelectedHeaderId} • {revisionAuditActiveHeader && Number(revisionAuditSelectedHeaderId) === Number(revisionAuditActiveHeader.headerId) ? 'Revisi aktif' : 'Revisi historis'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const targetHeader = revisionAuditHeaders.find((header) => Number(header.headerId) === Number(revisionAuditSelectedHeaderId));
                            if (!targetHeader) return;
                            setBomHeader(normalizeBomHeaderState({
                              parentCode: targetHeader.parentCode,
                              bomVersion: targetHeader.bomVersion || '',
                              revisionNo: targetHeader.revisionNo || 1,
                              effectiveStartDate: targetHeader.effectiveStartDate || todayDateInput,
                              effectiveEndDate: targetHeader.effectiveEndDate || '',
                              reference: targetHeader.reference || '',
                              headerId: targetHeader.headerId,
                            }));
                            setBulkParentCode(targetHeader.parentCode);
                          }}
                          className="px-3 py-2 rounded border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Pakai untuk input
                        </button>
                        {revisionAuditActiveHeader && Number(revisionAuditSelectedHeaderId) !== Number(revisionAuditActiveHeader.headerId) && (
                          <button
                            type="button"
                            onClick={() => setRevisionAuditHeaderId(String(revisionAuditActiveHeader.headerId))}
                            className="px-3 py-2 rounded border border-emerald-200 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Lompat ke aktif
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-white text-slate-500 uppercase">
                          <tr>
                            <th className="p-2 text-left">Parent</th>
                            <th className="p-2 text-left">Child</th>
                            <th className="p-2 text-right">Qty/Use</th>
                            <th className="p-2 text-right">Yield</th>
                            <th className="p-2 text-right">Scrap %</th>
                            <th className="p-2 text-left">Posisi</th>
                            <th className="p-2 text-left">Substitusi</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revisionAuditLines.map((line) => (
                            <tr key={`revision-line-${line.id}`} className="border-t border-slate-100">
                              <td className="p-2 font-mono text-slate-700">{line.parent_code}</td>
                              <td className="p-2">
                                <div className="font-mono text-indigo-700">{line.child_code}</div>
                                <div className="text-[11px] text-slate-500">{line.child_name || line.component_description || '-'}</div>
                              </td>
                              <td className="p-2 text-right font-mono">{Number(line.quantity || 0)}</td>
                              <td className="p-2 text-right font-mono">{Number(line.yield_factor || 1)}</td>
                              <td className="p-2 text-right font-mono">{Number(line.scrap_factor || 0)}</td>
                              <td className="p-2">{line.position_code || '-'}</td>
                              <td className="p-2">{formatSubstituteCodes(line.substitute_material_codes || []) || '-'}</td>
                              <td className="p-2">{line.component_type || line.child_type || '-'}</td>
                              <td className="p-2">{line.assembly_note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-800">Where Used</div>
              <div className="text-[11px] text-slate-500">Menampilkan parent yang memakai CP/RM/Indirect tertentu.</div>
            </div>
            <div className="flex gap-2 items-center">
              <input
                list="bom-where-used-options"
                className="w-full md:w-80 p-2 border border-slate-300 rounded text-xs"
                placeholder="Masukkan kode CP / RM / Indirect"
                value={whereUsedCode}
                onChange={(e) => setWhereUsedCode(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setWhereUsedCode(currentFormCode)}
                className="px-3 py-2 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Pakai kode form
              </button>
            </div>
          </div>
          <datalist id="bom-where-used-options">
            {whereUsedOptions.map((item) => (
              <option key={`where-used-${item.code}`} value={item.code} label={item.name} />
            ))}
          </datalist>
          <div className="p-4">
            {!whereUsedTargetCode ? (
              <div className="text-xs text-slate-400">Pilih kode CP/RM/Indirect untuk melihat parent yang memakainya.</div>
            ) : whereUsedRows.length === 0 ? (
              <div className="text-xs text-slate-500">
                Kode <span className="font-mono">{whereUsedTargetCode}</span> belum dipakai di parent manapun.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{whereUsedTargetCode}</span> dipakai di {whereUsedRows.length} parent.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr>
                        <th className="p-2 text-left">Parent Code</th>
                        <th className="p-2 text-left">Parent Name</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-right">Qty/Use</th>
                        <th className="p-2 text-right">Yield</th>
                        <th className="p-2 text-right">Scrap %</th>
                        <th className="p-2 text-left">Posisi</th>
                        <th className="p-2 text-left">Substitusi</th>
                        <th className="p-2 text-center">Rev</th>
                        <th className="p-2 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whereUsedRows.map((row) => (
                        <tr key={`where-used-row-${row.id}-${row.parentCode}`} className="border-t border-slate-100">
                          <td className="p-2 font-mono text-indigo-700">{row.parentCode}</td>
                          <td className="p-2">{row.parentName}</td>
                          <td className="p-2">{row.parentType}</td>
                          <td className="p-2 text-right font-mono">{row.qtyUse}</td>
                          <td className="p-2 text-right font-mono">{row.yieldFactor}</td>
                          <td className="p-2 text-right font-mono">{row.scrap}</td>
                          <td className="p-2">{row.positionCode || '-'}</td>
                          <td className="p-2">{row.substituteCodes || '-'}</td>
                          <td className="p-2 text-center font-mono">{row.revisionNo}</td>
                          <td className="p-2">{row.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- DATA VIEW --- */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-[500px]">
          {viewMode === 'tree' ? (
            <div className="flex-1 flex flex-col">
               <div className="flex items-center justify-between p-3 bg-gray-50 font-bold text-[10px] text-gray-500 border-b border-gray-200 uppercase tracking-wider sticky top-0 z-10">
                 <div className="flex items-center gap-2 flex-wrap">
                   <div>Struktur BOM (Multi Level)</div>
                   <span className={`px-2 py-1 rounded-full text-[9px] font-semibold ${treeRevisionMode === 'selected' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                     {treeRevisionMode === 'selected' ? 'Preview Revisi Terpilih' : 'BOM Aktif'}
                   </span>
                   {treeRevisionMode === 'selected' && revisionAuditParentCode && (
                     <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[9px] font-semibold">
                       Parent: {revisionAuditParentCode}
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                     <button
                       type="button"
                       onClick={() => setTreeRevisionMode('active')}
                       className={`px-2 py-1 rounded text-[9px] font-semibold ${treeRevisionMode === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                       BOM Aktif
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         if (Number(revisionAuditSelectedHeaderId || 0) <= 0) return;
                         setTreeRevisionMode('selected');
                       }}
                       disabled={Number(revisionAuditSelectedHeaderId || 0) <= 0}
                       className={`px-2 py-1 rounded text-[9px] font-semibold ${treeRevisionMode === 'selected' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                     >
                       Preview Revisi
                     </button>
                   </div>
                   <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-700">FG</span>
                   <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[9px] font-semibold text-orange-700">Child Part</span>
                   <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Raw</span>
                   <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[9px] font-semibold text-purple-700">Indirect</span>
                   {allowEdit && (
                     <button
                       type="button"
                       onClick={handleAddRoot}
                       className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded border border-indigo-100 bg-white hover:bg-indigo-50"
                     >
                       + Add Parent
                     </button>
                   )}
                 </div>
               </div>
               <div className="overflow-y-auto flex-1 p-0">
                 {bomLoading ? (
                   <div className="p-6 text-center text-gray-400 text-xs">Memuat struktur BOM...</div>
                 ) : bomTreeData.length === 0 ? (
                   <div className="p-6 text-center text-gray-400 text-xs">Belum ada struktur BOM. Tambah parent terlebih dahulu.</div>
                 ) : (
                   bomTreeData.map((node, idx) => (
                     <BomTreeNode
                       key={`${node.code}-${idx}`}
                       node={node}
                       level={0}
                       isLast={idx === bomTreeData.length - 1}
                       ancestorHasSibling={[]}
                     />
                   ))
                 )}
               </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-3">Kode</th><th className="p-3">Nama</th><th className="p-3">Tipe</th>
                    <th className="p-3">Model</th><th className="p-3">Line</th><th className="p-3">Supplier</th>
                    <th className="p-3 text-right">Qty</th><th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                      {filteredItems.map(i => (
                    <tr key={i.id || i.code} className="hover:bg-indigo-50 transition-colors">
                      <td className="p-3 font-medium text-indigo-700">{i.code}</td>
                      <td className="p-3">{i.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          String(i.type || '').toLowerCase().includes('fg')
                            ? 'bg-indigo-100 text-indigo-700'
                            : String(i.type || '').toLowerCase().includes('sub') || String(i.type || '').toLowerCase().includes('cp')
                              ? 'bg-orange-100 text-orange-700'
                              : String(i.type || '').toLowerCase().includes('raw')
                                ? 'bg-emerald-100 text-emerald-700'
                                : String(i.type || '').toLowerCase().includes('indirect')
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600'
                        }`}>{i.type}</span>
                      </td>
                      <td className="p-3">
                        {formatModelCodes(modelMap, i.modelCodes) || i.model || '-'}
                        {(i.customer || i.location || i.organization || i.category || i.packing) && (
                          <div className="text-[10px] text-gray-400 mt-1 leading-snug">
                            {[i.customer ? `Cust: ${i.customer}` : '', i.location ? `Loc: ${i.location}` : '', i.organization ? `Org: ${i.organization}` : '', i.category ? `Category: ${i.category}` : '', i.packing ? `Packing: ${i.packing}` : ''].filter(Boolean).join(' / ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{i.line}</td><td className="p-3">{i.supplier}</td>
                      <td className="p-3 text-right font-mono">{i.qty} {i.uom}</td>
                      <td className="p-3 text-center flex justify-center gap-2">
                        {allowEdit && i.type === 'FG' && (
                          <button
                            type="button"
                            onClick={() => openSingleLevelBomEditor(i)}
                            className="text-emerald-500 hover:text-emerald-700"
                            title="Tambah Raw Material"
                          >
                            <Layers size={14} />
                          </button>
                        )}
                        <button onClick={() => setWhereUsedCode(i.code)} className="text-sky-500 hover:text-sky-700" title="Where Used"><BookOpenText size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Modals */}


      {showAiModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <h3 className="font-bold text-lg mb-2 flex gap-2 text-purple-700"><Sparkles/> AI Auto-BOM</h3>
              <p className="text-xs text-gray-500 mb-4">Masukkan nama produk, AI akan membuatkan BOM lengkap.</p>
              <input className="border p-3 w-full rounded-lg mb-4 outline-purple-500" placeholder="Contoh: Kursi Kantor Hidrolik" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}/>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setShowAiModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
                <button onClick={handleGenerateBOM} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">Generate</button>
              </div>
           </div>
        </div>
      )}

      {aiResultModal.show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-bold text-lg text-purple-700">{aiResultModal.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Draft ini tidak mengubah Master Ref Item. Daftarkan kode item di Master Ref, lalu import relasi BOM dari template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAiResultModal({ show: false, content: '', title: '' })}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium"
              >
                Tutup
              </button>
            </div>
            <pre className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-slate-950 text-emerald-200 p-4 text-[11px] leading-relaxed whitespace-pre-wrap">
              {aiResultModal.content}
            </pre>
          </div>
        </div>
      )}
      
      {showForecastModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                <Calendar size={24}/> Forecast & MRP
              </h3>
              <button onClick={() => setShowForecastModal(false)}><X size={24}/></button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
              {/* Left: Input Plan */}
              <div className="md:w-1/3 flex flex-col gap-4 border-r pr-4 overflow-y-auto">
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <h4 className="font-bold text-sm mb-2 text-indigo-800">1. Tambah Rencana</h4>
                  <div className="space-y-2">
                    <select className="w-full p-2 border rounded text-xs" value={newPlan.fgId} onChange={e=>setNewPlan({...newPlan, fgId:e.target.value})}>
                      <option value="">- Pilih FG -</option>
                      {bomPickerOptions.FG.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
                    </select>
                    <input type="text" className="w-full p-2 border rounded text-xs" placeholder="Periode (Mis: Jan 2025)" value={newPlan.period} onChange={e=>setNewPlan({...newPlan, period:e.target.value})}/>
                    <div className="flex gap-2">
                      <input type="number" className="w-1/2 p-2 border rounded text-xs" placeholder="Qty" value={newPlan.qty} onChange={e=>setNewPlan({...newPlan, qty:e.target.value})}/>
                      <button onClick={addProductionPlan} className="w-1/2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Tambah</button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <button onClick={exportPlanTemplate} className="flex-1 bg-gray-100 border p-2 rounded hover:bg-gray-200 flex items-center justify-center gap-1"><Download size={12}/> Templat XLS</button>
                  <button onClick={()=>planInputRef.current.click()} className="flex-1 bg-gray-100 border p-2 rounded hover:bg-gray-200 flex items-center justify-center gap-1"><Upload size={12}/> Import Rencana</button>
                  <input type="file" ref={planInputRef} className="hidden" accept=".xls,.csv" onChange={handlePlanFileUpload} />
                </div>

                <div className="flex-1 overflow-auto border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Produk</th>
                        <th className="p-2">Prd</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionPlan.map(p => {
                        const fg = items.find(i=>i.id===p.fgId);
                        return (
                          <tr key={p.id} className="border-b">
                            <td className="p-2 truncate max-w-[100px]">{fg?.code}</td>
                            <td className="p-2">{p.period}</td>
                            <td className="p-2 text-right">{p.qty}</td>
                            <td className="p-2"><button onClick={()=>removePlan(p.id)} className="text-red-500"><X size={12}/></button></td>
                          </tr>
                        )
                      })}
                      {productionPlan.length===0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">Belum ada rencana</td></tr>}
                    </tbody>
                  </table>
                </div>

                <button onClick={calculateTotalForecast} className="w-full py-3 bg-green-600 text-white font-bold rounded shadow-lg hover:bg-green-700">
                  Hitung Material (MRP)
                </button>
              </div>

              {/* Right: Result */}
              <div className="md:w-2/3 flex flex-col">
                 <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-700">Hasil: Total Kebutuhan Material</h4>
                    <div className="flex gap-2">
                        {forecastResult && (
                          <button onClick={() => setShowPRLReport(true)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded border border-blue-300 font-bold flex items-center gap-1 hover:bg-blue-200">
                            <FileCheck size={12}/> View PRL Report
                          </button>
                        )}
                        {forecastResult && (
                          <button onClick={exportForecastResult} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded border border-green-300 font-bold flex items-center gap-1">
                            <Download size={12}/> Download Hasil
                          </button>
                        )}
                    </div>
                 </div>
                 <div className="flex-1 overflow-auto border rounded bg-slate-50">
                    {forecastResult ? (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-200 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Kode</th>
                            <th className="p-2 text-left">Nama Material</th>
                            <th className="p-2 text-center">Tipe</th>
                            <th className="p-2 text-right">Total Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {forecastResult.map((res, idx) => (
                            <tr key={idx} className="hover:bg-blue-50">
                              <td className="p-2 font-mono">{res.code}</td>
                              <td className="p-2">{res.name}</td>
                              <td className="p-2 text-center"><span className="bg-yellow-100 px-1 rounded">{res.type}</span></td>
                              <td className="p-2 text-right font-bold">{res.totalQty.toLocaleString()} {res.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 flex-col">
                        <Calculator size={48} className="mb-2 opacity-20"/>
                        <p>Klik "Hitung Material" untuk melihat hasil</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRL REPORT MODAL --- */}
      {showPRLReport && forecastResult && (
        <div className="fixed inset-0 bg-white z-[60] overflow-auto flex justify-center">
          <div className="w-full max-w-[1000px] p-8 print:p-0">
             <div className="flex justify-between mb-4 no-print">
               <h2 className="font-bold text-xl">Preview Laporan</h2>
               <div className="flex gap-2">
                 <button onClick={handlePrintPRL} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2"><Printer size={16}/> Print / PDF</button>
                 <button onClick={() => setShowPRLReport(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Tutup</button>
               </div>
             </div>
             
             {/* CONTENT REPORT (Hidden HTML for Print Logic) */}
             <div id="prl-report-content" className="border border-black p-4 bg-white text-[10px] font-sans">
                <div className="mb-4">
                   <div className="font-bold text-sm">PT. MATRA RODA PIRANTI</div>
                   <div className="font-bold text-xs mb-2">AUTOMOTIVE PARTS & COMPONENT INDUSTRIES</div>
                   <div className="text-center font-bold text-lg underline mb-1">PART REQUIREMENT LIST</div>
                   <div className="flex justify-between mt-2">
                      <div>
                         <div>Nomor : PRL/2025/12/001</div>
                         <div>Month : DECEMBER 2025</div>
                         <div>Supplier: ALL SUPPLIER (INTERNAL & EXTERNAL)</div>
                      </div>
                      <div className="text-right">
                         <div>Bekasi, {new Date().toLocaleDateString('id-ID')}</div>
                      </div>
                   </div>
                </div>

                <table className="w-full border-collapse border border-black text-center">
                   <thead>
                      <tr className="bg-gray-200">
                         <th className="border border-black p-1" rowSpan="2">No</th>
                         <th className="border border-black p-1" rowSpan="2">Uniq</th>
                         <th className="border border-black p-1" rowSpan="2">Part No</th>
                         <th className="border border-black p-1" rowSpan="2">Description</th>
                         <th className="border border-black p-1" colSpan="5">WEEKLY QTY</th>
                         <th className="border border-black p-1" rowSpan="2">VOL/DAY<br/>[Kg]</th>
                         <th className="border border-black p-1" rowSpan="2">LAST<br/>NEW</th>
                         <th className="border border-black p-1" rowSpan="2">QTY/<br/>KBN</th>
                         <th className="border border-black p-1" rowSpan="2">UOM</th>
                         <th className="border border-black p-1" rowSpan="2">TYPE<br/>PACK</th>
                         <th className="border border-black p-1">N-1</th>
                         <th className="border border-black p-1" colSpan="3">FORECAST FIRM</th>
                         <th className="border border-black p-1" rowSpan="2">N+3<br/>MAR</th>
                         <th className="border border-black p-1" rowSpan="2">Fluctuation %</th>
                      </tr>
                      <tr className="bg-gray-200">
                         <th className="border border-black p-1 w-8">I</th>
                         <th className="border border-black p-1 w-8">II</th>
                         <th className="border border-black p-1 w-8">III</th>
                         <th className="border border-black p-1 w-8">IV</th>
                         <th className="border border-black p-1 w-8">V</th>
                         <th className="border border-black p-1">NOV</th>
                         <th className="border border-black p-1">N (DEC)</th>
                         <th className="border border-black p-1">N+1 (JAN)</th>
                         <th className="border border-black p-1">N+2 (FEB)</th>
                      </tr>
                   </thead>
                   <tbody>
                      {forecastResult.map((item, idx) => {
                         const weeklyAvg = Math.ceil(item.totalQty / 4); // Simple distribution
                         return (
                           <tr key={idx}>
                              <td className="border border-black p-1">{idx + 1}</td>
                              <td className="border border-black p-1">{item.id.substring(0,4)}</td>
                              <td className="border border-black p-1 text-left">{item.code}</td>
                              <td className="border border-black p-1 text-left">{item.name}</td>
                              <td className="border border-black p-1">{weeklyAvg}</td>
                              <td className="border border-black p-1">{weeklyAvg}</td>
                              <td className="border border-black p-1">{weeklyAvg}</td>
                              <td className="border border-black p-1">{weeklyAvg}</td>
                              <td className="border border-black p-1">0</td>
                              <td className="border border-black p-1">{(item.totalQty/22).toFixed(1)}</td>
                              <td className="border border-black p-1">-</td>
                              <td className="border border-black p-1">{item.qty || '-'}</td>
                              <td className="border border-black p-1">{item.uom}</td>
                              <td className="border border-black p-1">{item.packing || '-'}</td>
                              <td className="border border-black p-1">-</td>
                              <td className="border border-black p-1 font-bold bg-yellow-50">{item.totalQty}</td>
                              <td className="border border-black p-1">{item.totalQty}</td>
                              <td className="border border-black p-1">{item.totalQty}</td>
                              <td className="border border-black p-1">{item.totalQty}</td>
                              <td className="border border-black p-1">100%</td>
                           </tr>
                         )
                      })}
                      <tr className="bg-gray-100 font-bold">
                         <td className="border border-black p-1" colSpan={4}>TOTAL</td>
                         <td className="border border-black p-1" colSpan={5}>{forecastResult.reduce((sum,i) => sum + i.totalQty, 0).toLocaleString()}</td>
                         <td className="border border-black p-1" colSpan={11}></td>
                      </tr>
                   </tbody>
                </table>

                {/* Footer Tanda Tangan */}
                <table className="w-full border border-black mt-4 text-center">
                   <thead>
                      <tr>
                         <th className="border border-black p-1 w-1/4">CHECKED</th>
                         <th className="border border-black p-1 w-1/4">APPROVED</th>
                         <th className="border border-black p-1 w-1/4">CHECKED</th>
                         <th className="border border-black p-1 w-1/4">PREPARED</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr className="h-20 align-bottom">
                         <td className="border border-black p-1 h-20 align-bottom font-bold underline">Beverly M</td>
                         <td className="border border-black p-1 h-20 align-bottom font-bold underline">JIHAD M.</td>
                         <td className="border border-black p-1 h-20 align-bottom font-bold underline">HUFRON M.</td>
                         <td className="border border-black p-1 h-20 align-bottom font-bold underline">ADIN M</td>
                      </tr>
                      <tr>
                         <td className="border border-black p-1">Div. Head PPIC</td>
                         <td className="border border-black p-1">Sec. Head MKT</td>
                         <td className="border border-black p-1">Sec. Head PPIC</td>
                         <td className="border border-black p-1">Staff PPIC</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
