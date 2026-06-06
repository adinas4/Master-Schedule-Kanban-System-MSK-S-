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
  const description = String(record.line_description || record.lineDescription || record.name || '').trim();
  if (!code) return description;
  if (!description || description === code) return code;
  return `${code} - ${description}`;
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
  const categoryOptions = useMemo(() => (
    (masterCategories || []).map((category) => {
      const value = category.code || category.id || category.name || category;
      const label = category.name && category.code
        ? `${category.code} - ${category.name}`
        : (category.name || category.code || category.id || category);
      return { value, label };
    })
  ), [masterCategories]);
  const categoryValueSet = useMemo(() => new Set(categoryOptions.map((opt) => opt.value)), [categoryOptions]);
  const modelMap = useMemo(() => buildModelMap(localModels), [localModels]);
  const processMap = useMemo(() => {
    const map = new Map();
    (masterProcesses || []).forEach((proc) => {
      map.set(proc.code, proc);
    });
    return map;
  }, [masterProcesses]);
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

  const formTopRef = useRef(null);

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
    ...overrides,
  });
  const [newItem, setNewItem] = useState(() => getDefaultNewItem());
  const [selectedParent, setSelectedParent] = useState(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [bomRelations, setBomRelations] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null);
  const createBulkMaterial = () => ({
    id: `${Date.now()}-${Math.random()}`,
    code: '',
    name: '',
    uom: 'PCS',
    qty: 1,
    scrap: 0,
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
    type: 'WIP',
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
    materials: [createBulkMaterial()],
  });
  const [bulkMode, setBulkMode] = useState('multi');
  const [bulkParentCode, setBulkParentCode] = useState('');
  const [bulkParentDetails, setBulkParentDetails] = useState(() => createBulkParentDetails());
  const [bulkParentMaterials, setBulkParentMaterials] = useState([createBulkMaterial()]);
  const [bulkChildren, setBulkChildren] = useState([createBulkChild()]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [bomHeader, setBomHeader] = useState({
    parentCode: '',
    bomVersion: '',
    effectiveDate: '',
    reference: '',
  });
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
    const parentItem = itemsByCode.get(codeValue) || items.find((item) => item.code === codeValue);
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
    const parentItem = itemsByCode.get(relation.parent_code) || items.find((item) => item.code === relation.parent_code);
    const item = itemsByCode.get(node.code) || {};
    const modelCodes = parseModelCodes(item.model || relation.child_model || '');
    const processFlow = Array.isArray(item.process_flow) && item.process_flow.length
      ? item.process_flow
      : Array.isArray(item.processes) && item.processes.length
        ? item.processes
        : Array.isArray(relation.process_flow) && relation.process_flow.length
          ? relation.process_flow
          : [''];
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
    setIsFormOpen(true);
    setNewItem(
      getDefaultNewItem({
        parentId: relation.parent_code,
        code: node.code,
        partNo: item.part_no || '',
        name: item.name || relation.child_name || node.name || '',
        type: item.type || relation.child_type || 'RAW MATERIAL',
        uom: item.unit || item.uom || relation.child_unit || '',
        weight: Number(item.weight || 0),
        leadTime: Number(item.lead_time_days || relation.lead_time_days || 0),
        cycleTime: Number(item.cycle_time_seconds || relation.cycle_time_seconds || 0),
        processes: processFlow,
        modelCodes,
        qty: Number(relation.quantity || 1),
        scrap: Number(relation.scrap_factor || 0),
        note: relation.assembly_note || '',
        line: item.line_production || item.line || '',
        supplier: item.supplier_name || item.supplier || '',
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

  const parentCandidates = useMemo(() => {
    const fgItems = masterItems.filter((item) => {
      const typeValue = String(item.type || '').toLowerCase();
      return typeValue.includes('fg') || typeValue.includes('finish');
    });
    return fgItems.length ? fgItems : masterItems;
  }, [masterItems]);

  const parentOptions = useMemo(() => {
    const options = items.filter((item) => {
      const typeValue = String(item.type || '').toLowerCase();
      return typeValue.includes('fg') || typeValue.includes('finish') || typeValue.includes('wip');
    });
    return options.length ? options : items;
  }, [items]);

  const childCandidates = useMemo(() => {
    const rawItems = masterItems.filter((item) => {
      const typeValue = String(item.type || '').toLowerCase();
      return typeValue.includes('raw');
    });
    return rawItems.length ? rawItems : masterItems;
  }, [masterItems]);

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
      effectiveDate: String(bomHeader.effectiveDate || '').trim(),
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
      setBomHeader({ parentCode: '', bomVersion: '', effectiveDate: '', reference: '' });
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
  }, [bulkMode, bulkParentCode, bomRelations, bulkParentMaterials]);

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
    const modelCodes = (newItem.modelCodes || [])
      .map((code) => String(code || '').trim())
      .filter(Boolean);
    const modelValue = joinModelCodes(modelCodes);
    const existingItem = itemsByCode.get(codeValue);
    const normalizedNewItem = {
      ...newItem,
      id: existingItem?.id || codeValue,
      parentId: parentCode || null,
      processes: cleanedProcesses,
      process_flow: cleanedProcesses,
      modelCodes,
      model: modelValue,
      code: codeValue,
      partNo: newItem.partNo,
      name: nameValue,
      lead_time_days: Number(newItem.leadTime) || 0,
      cycle_time_seconds: Number(newItem.cycleTime) || 0,
      line: String(newItem.line || '').trim(),
      supplier: String(newItem.supplier || '').trim(),
      location: String(newItem.location || '').trim(),
      packing: String(newItem.packing || '').trim(),
    };
    setItemSaving(true);
    try {
      if (apiFetch) {
        await apiFetch('/api/master/items', {
          method: 'POST',
          body: JSON.stringify({
            code: codeValue,
            partNo: newItem.partNo || null,
            name: nameValue,
            type: typeValue,
            unit: unitValue,
            model: modelValue || null,
            weight: Number(newItem.weight) || null,
            supplierName: String(newItem.supplier || '').trim(),
            locationName: String(newItem.location || '').trim(),
            packingName: String(newItem.packing || '').trim(),
            lineProduction: String(newItem.line || '').trim(),
            leadTimeDays: Number(newItem.leadTime) || 0,
            cycleTimeSeconds: Number(newItem.cycleTime) || 0,
            processFlow: cleanedProcesses,
            packQty: 0,
          }),
        });
        if (parentCode) {
          const bomPayload = {
            parentCode,
            childCode: codeValue,
            quantity: Number(newItem.qty) || 1,
            scrapFactor: Number(newItem.scrap) || 0,
            componentType: typeValue,
            componentDescription: nameValue,
            modelSpec: modelValue || '',
            assemblyNote: String(newItem.note || '').trim(),
          };
          if (editingRelation?.id) {
            await apiFetch(`/api/bom/${editingRelation.id}`, {
              method: 'PUT',
              body: JSON.stringify({ ...bomPayload, childCode: codeValue }),
            });
          } else {
            await apiFetch('/api/bom', {
              method: 'POST',
              body: JSON.stringify(bomPayload),
            });
          }
        }
        await syncMasterRefContext();
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
      setItems((prev) => {
        const next = prev.filter((item) => item.code !== codeValue);
        return [...next, normalizedNewItem];
      });
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
    const existing = itemsByCode.get(codeValue);
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
        ? existing.process_flow
        : Array.isArray(existing.processes) && existing.processes.length
          ? existing.processes
          : prev.processes,
      line: existing.line_production || existing.line || prev.line,
      supplier: existing.supplier_name || existing.supplier || prev.supplier,
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

  const resolveItemRelations = async (itemCode) => {
    const suppliersFromMap = itemSupplierMap instanceof Map ? itemSupplierMap.get(itemCode) : undefined;
    const customersFromMap = itemCustomerMap instanceof Map ? itemCustomerMap.get(itemCode) : undefined;
    const suppliers = Array.isArray(suppliersFromMap) ? suppliersFromMap : [];
    const customers = Array.isArray(customersFromMap) ? customersFromMap : [];
    const mapHasData = (itemSupplierMap instanceof Map && itemSupplierMap.size > 0)
      || (itemCustomerMap instanceof Map && itemCustomerMap.size > 0);
    if (!apiFetch || mapHasData || suppliers.length || customers.length) {
      return { suppliers, customers };
    }
    try {
      const relations = await apiFetch('/api/master/item-relations');
      const relSuppliers = [];
      const relCustomers = [];
      (relations?.suppliers || []).forEach((row) => {
        if (row.item_code !== itemCode) return;
        relSuppliers.push({
          vendorId: row.vendor_id,
          vendorName: row.vendor_name || row.vendor_id,
          sharePercent: row.share_percent,
        });
      });
      (relations?.customers || []).forEach((row) => {
        if (row.item_code !== itemCode) return;
        relCustomers.push({
          customerId: row.customer_id,
          customerName: row.customer_name || row.customer_id,
          sharePercent: row.share_percent,
        });
      });
      return { suppliers: relSuppliers, customers: relCustomers };
    } catch (error) {
      return { suppliers, customers };
    }
  };

  const buildParentUpdatePayload = (parentItem, overrides) => {
    const modelCodes = (overrides.modelCodes || [])
      .map((code) => String(code || '').trim())
      .filter(Boolean);
    const modelValue = joinModelCodes(modelCodes);
    const processLabels = (overrides.processCodes || [])
      .map((code) => String(code || '').trim())
      .filter(Boolean)
      .map((code) => processMap.get(code)?.name || code);
    return {
      name: parentItem?.name || parentItem?.code || '',
      partNo: parentItem?.part_no ?? parentItem?.partNo ?? null,
      type: parentItem?.type || '',
      unit: parentItem?.unit || parentItem?.uom || '',
      model: modelValue || null,
      weight: parentItem?.weight ?? null,
      price: parentItem?.price ?? null,
      vendorId: parentItem?.vendor_id ?? parentItem?.vendorId ?? null,
      locationId: parentItem?.location_id ?? parentItem?.locationId ?? null,
      supplierName: overrides.supplier,
      locationName: overrides.location,
      packingName: overrides.packing,
      lineProduction: overrides.line,
      imageUrl: parentItem?.image_url ?? parentItem?.imageUrl ?? null,
      shelfLifeDays: parentItem?.shelf_life_days ?? parentItem?.shelfLifeDays ?? null,
      shelfLifeMonths: parentItem?.shelf_life_months ?? parentItem?.shelfLifeMonths ?? null,
      movingStatus: parentItem?.moving_status ?? parentItem?.movingStatus ?? null,
      isSeasonal: parentItem?.is_seasonal ?? parentItem?.isSeasonal ?? false,
      typePack: parentItem?.type_pack ?? parentItem?.typePack ?? null,
      packQty: parentItem?.pack_qty ?? parentItem?.packQty ?? 0,
      leadTimeDays: parentItem?.lead_time_days ?? parentItem?.leadTimeDays ?? 0,
      cycleTimeSeconds: Number(overrides.cycleTime) || 0,
      orderLotSize: parentItem?.order_lot_size ?? parentItem?.orderLotSize ?? 0,
      maxDeliveryPerRit: parentItem?.max_delivery_per_rit ?? parentItem?.maxDeliveryPerRit ?? 0,
      processFlow: processLabels,
      modelCodes,
      processLabels,
    };
  };

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
    (bomRelations || [])
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
    const materials = (bomRelations || [])
      .filter((rel) => String(rel.parent_code || rel.parentCode || '').trim() === normalizedCode)
      .filter(isRawMaterialRelation)
      .map((rel) => ({
        id: rel.id ? `rel-${rel.id}` : `${Date.now()}-${Math.random()}`,
        code: rel.child_code || rel.childCode || '',
        name: rel.child_name || rel.component_description || '',
        uom: rel.child_unit || rel.uom || 'PCS',
        qty: Number(rel.quantity) || 1,
        scrap: Number(rel.scrap_factor) || 0,
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
    const existing = itemsByCode.get(codeValue);
    if (!existing) return;
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
      type: existing.type || child.type,
      weight: Number(existing.weight || child.weight || 0),
      leadTime: Number(existing.lead_time_days || child.leadTime || 0),
      cycleTime: Number(existing.cycle_time_seconds || child.cycleTime || 0),
      line: existing.line_production || existing.line || child.line,
      supplier: existing.supplier_name || existing.supplier || child.supplier,
      location: existing.location_name || existing.location || child.location,
      packing: existing.packing_name || existing.packing || child.packing,
      modelCodes: parsedModels.length ? parsedModels : child.modelCodes,
      processCodes: processCodes.length ? processCodes : child.processCodes,
    });
  };

  const hydrateBulkParentDetails = (codeValue) => {
    const normalizedCode = String(codeValue || '').trim();
    if (!normalizedCode) return;
    const existing = itemsByCode.get(normalizedCode);
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
      customer: existing.customer || prev.customer,
      location: existing.location_name || existing.location || prev.location,
      packing: existing.packing_name || existing.packing || prev.packing,
      cycleTime: Number(existing.cycle_time_seconds || prev.cycleTime || 0),
      modelCodes: parsedModels.length ? parsedModels : prev.modelCodes,
      processCodes: processCodes.length ? processCodes : prev.processCodes,
    }));
  };

  const handleBulkParentSelectChange = (value) => {
    const codeValue = String(value || '').trim();
    setBulkParentCode(codeValue);
    if (bulkMode === 'single') {
      hydrateBulkParentDetails(codeValue);
      setBulkParentMaterials(deriveParentMaterialsFromRelations(codeValue));
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
    const existing = itemsByCode.get(codeValue);
    if (!existing) return;
    updateBulkMaterial(childIndex, materialIndex, {
      code: existing.code,
      name: existing.name || material.name,
      uom: existing.unit || existing.uom || material.uom,
    });
  };

  const handleBulkParentMaterialCodeBlur = (materialIndex) => {
    const material = bulkParentMaterials[materialIndex];
    if (!material) return;
    const codeValue = String(material.code || '').trim();
    if (!codeValue) return;
    const existing = itemsByCode.get(codeValue);
    if (!existing) return;
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
    if (!itemsByCode.get(parentCode)) {
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
    const existingRelationMap = new Map();
    bomRelations.forEach((rel) => {
      existingRelationMap.set(`${rel.parent_code}__${rel.child_code}`, rel.id);
    });
    const newItems = new Map();
    setBulkSaving(true);
    try {
      if (bulkMode === 'single') {
        const parentItem = itemsByCode.get(parentCode);
        if (!parentItem) {
          alert('Parent utama belum terdaftar di master item.');
          return;
        }
        const {
          modelCodes: parentModelCodes,
          processLabels: parentProcessLabels,
          ...parentPayload
        } = buildParentUpdatePayload(parentItem, bulkParentDetails);
        if (!parentPayload.name || !parentPayload.type || !parentPayload.unit) {
          alert('Master item parent belum lengkap (nama/tipe/satuan).');
          return;
        }
        const relations = await resolveItemRelations(parentCode);
        const updatedParent = await apiFetch(`/api/master/items/${parentCode}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...parentPayload,
            suppliers: relations.suppliers || [],
            customers: relations.customers || [],
          }),
        });
        if (updatedParent) {
          const normalizedParent = normalizeWithModels([updatedParent])[0];
          setItems((prev) => {
            const next = prev.filter((item) => item.code !== normalizedParent.code);
            return [...next, normalizedParent];
          });
        } else {
          setItems((prev) => prev.map((item) => {
            if (item.code !== parentCode) return item;
            return {
              ...item,
              line: bulkParentDetails.line,
              supplier: bulkParentDetails.supplier,
              location: bulkParentDetails.location,
              packing: bulkParentDetails.packing,
              cycle_time_seconds: Number(bulkParentDetails.cycleTime) || 0,
              process_flow: parentProcessLabels,
              processes: parentProcessLabels,
              model: joinModelCodes(parentModelCodes),
              modelCodes: parentModelCodes,
            };
          }));
        }
        for (const material of bulkParentMaterials || []) {
          const materialCode = String(material.code || '').trim();
          if (!materialCode) continue;
          const materialName = String(material.name || '').trim();
          const materialUom = String(material.uom || '').trim();
          const existingMaterial = itemsByCode.get(materialCode);
          if (!existingMaterial && (!materialName || !materialUom)) {
            alert(`Nama dan UOM wajib diisi untuk material baru: ${materialCode}`);
            return;
          }
          if (!existingMaterial) {
            await apiFetch('/api/master/items', {
              method: 'POST',
              body: JSON.stringify({
                code: materialCode,
                name: materialName || materialCode,
                type: 'RAW MATERIAL',
                unit: materialUom || 'PCS',
                model: null,
                weight: null,
                supplierName: null,
                locationName: null,
                packingName: null,
                lineProduction: null,
                leadTimeDays: 0,
                cycleTimeSeconds: 0,
                processFlow: [],
                packQty: 0,
              }),
            });
            newItems.set(materialCode, {
              id: materialCode,
              code: materialCode,
              name: materialName || materialCode,
              type: 'RAW MATERIAL',
              unit: materialUom || 'PCS',
              process_flow: [],
              processes: [],
              modelCodes: [],
              lead_time_days: 0,
              cycle_time_seconds: 0,
              supplier: '',
              location: '',
              packing: '',
              line: '',
            });
          }
          const materialRelKey = `${parentCode}__${materialCode}`;
          const materialRelPayload = {
            parentCode,
            childCode: materialCode,
            quantity: Number(material.qty) || 1,
            scrapFactor: Number(material.scrap) || 0,
            componentType: 'RAW MATERIAL',
            componentDescription: materialName || existingMaterial?.name || materialCode,
            modelSpec: '',
            assemblyNote: '',
          };
          if (existingRelationMap.has(materialRelKey)) {
            await apiFetch(`/api/bom/${existingRelationMap.get(materialRelKey)}`, {
              method: 'PUT',
              body: JSON.stringify(materialRelPayload),
            });
          } else {
            await apiFetch('/api/bom', {
              method: 'POST',
              body: JSON.stringify(materialRelPayload),
            });
          }
        }
      } else {
        for (const child of bulkChildren) {
          const childCode = String(child.code || '').trim();
          if (!childCode) continue;
          const childName = String(child.name || '').trim();
          const childUom = String(child.uom || '').trim();
          const childType = String(child.type || 'WIP').trim();
          const childModelCodes = (child.modelCodes || [])
            .map((code) => String(code || '').trim())
            .filter(Boolean);
          const childModelValue = joinModelCodes(childModelCodes);
          const childLeadTime = Number(child.leadTime) || 0;
          const childCycleTime = Number(child.cycleTime) || 0;
          const childWeight = Number(child.weight) || null;
          const childLine = String(child.line || '').trim();
          const childSupplier = String(child.supplier || '').trim();
          const childLocation = String(child.location || '').trim();
          const childPacking = String(child.packing || '').trim();
          const childNote = String(child.note || '').trim();
          const existingChild = itemsByCode.get(childCode);
          if (!existingChild && (!childName || !childUom)) {
            alert(`Nama dan UOM wajib diisi untuk komponen baru: ${childCode}`);
            return;
          }
          const processLabels = (child.processCodes || [])
            .map((code) => String(code || '').trim())
            .filter(Boolean)
            .map((code) => processMap.get(code)?.name || code);
          if (!existingChild) {
            await apiFetch('/api/master/items', {
              method: 'POST',
              body: JSON.stringify({
                code: childCode,
                name: childName || childCode,
                type: childType || 'WIP',
                unit: childUom || 'PCS',
                model: childModelValue || null,
                weight: childWeight,
                supplierName: childSupplier || null,
                locationName: childLocation || null,
                packingName: childPacking || null,
                lineProduction: childLine || null,
                leadTimeDays: childLeadTime,
                cycleTimeSeconds: childCycleTime,
                processFlow: processLabels,
                packQty: 0,
              }),
            });
            newItems.set(childCode, {
              id: childCode,
              code: childCode,
              name: childName || childCode,
              type: childType || 'WIP',
              unit: childUom || 'PCS',
              process_flow: processLabels,
              processes: processLabels,
              modelCodes: childModelCodes,
              lead_time_days: childLeadTime,
              cycle_time_seconds: childCycleTime,
              weight: childWeight || 0,
              supplier: childSupplier,
              location: childLocation,
              packing: childPacking,
              line: childLine,
            });
          }
          const relationKey = `${parentCode}__${childCode}`;
          const childRelPayload = {
            parentCode,
            childCode,
            quantity: Number(child.qty) || 1,
            scrapFactor: Number(child.scrap) || 0,
            componentType: childType || 'WIP',
            componentDescription: childName || existingChild?.name || childCode,
            modelSpec: childModelValue || '',
            assemblyNote: childNote,
          };
          if (existingRelationMap.has(relationKey)) {
            await apiFetch(`/api/bom/${existingRelationMap.get(relationKey)}`, {
              method: 'PUT',
              body: JSON.stringify(childRelPayload),
            });
          } else {
            await apiFetch('/api/bom', {
              method: 'POST',
              body: JSON.stringify(childRelPayload),
            });
          }
          for (const material of child.materials || []) {
            const materialCode = String(material.code || '').trim();
            if (!materialCode) continue;
            const materialName = String(material.name || '').trim();
            const materialUom = String(material.uom || '').trim();
            const existingMaterial = itemsByCode.get(materialCode);
            if (!existingMaterial && (!materialName || !materialUom)) {
              alert(`Nama dan UOM wajib diisi untuk material baru: ${materialCode}`);
              return;
            }
            if (!existingMaterial) {
              await apiFetch('/api/master/items', {
                method: 'POST',
                body: JSON.stringify({
                  code: materialCode,
                  name: materialName || materialCode,
                  type: 'RAW MATERIAL',
                  unit: materialUom || 'PCS',
                  model: null,
                  weight: null,
                  supplierName: null,
                  locationName: null,
                  packingName: null,
                  lineProduction: null,
                  leadTimeDays: 0,
                  cycleTimeSeconds: 0,
                  processFlow: [],
                  packQty: 0,
                }),
              });
              newItems.set(materialCode, {
                id: materialCode,
                code: materialCode,
                name: materialName || materialCode,
                type: 'RAW MATERIAL',
                unit: materialUom || 'PCS',
                process_flow: [],
                processes: [],
                modelCodes: [],
                lead_time_days: 0,
                cycle_time_seconds: 0,
                supplier: '',
                location: '',
                packing: '',
                line: '',
              });
            }
            const materialRelKey = `${childCode}__${materialCode}`;
            const materialRelPayload = {
              parentCode: childCode,
              childCode: materialCode,
              quantity: Number(material.qty) || 1,
              scrapFactor: Number(material.scrap) || 0,
              componentType: 'RAW MATERIAL',
              componentDescription: materialName || existingMaterial?.name || materialCode,
              modelSpec: '',
              assemblyNote: '',
            };
            if (existingRelationMap.has(materialRelKey)) {
              await apiFetch(`/api/bom/${existingRelationMap.get(materialRelKey)}`, {
                method: 'PUT',
                body: JSON.stringify(materialRelPayload),
              });
            } else {
              await apiFetch('/api/bom', {
                method: 'POST',
                body: JSON.stringify(materialRelPayload),
              });
            }
          }
        }
      }
      if (newItems.size > 0) {
        setItems((prev) => {
          const next = prev.filter((item) => !newItems.has(item.code));
          return [...next, ...Array.from(newItems.values())];
        });
      }
      await syncMasterRefContext();
      if (bulkMode === 'single') {
        setBulkParentMaterials([createBulkMaterial()]);
        setBulkParentDetails(createBulkParentDetails());
      } else {
        setBulkChildren([createBulkChild()]);
      }
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

  const bomTreeData = useMemo(() => {
    const childrenMap = new Map();
    const childCodes = new Set();
    bomRelations.forEach((rel) => {
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
        return { ...item, relation, children: [] };
      }
      const nextPath = new Set(path);
      nextPath.add(code);
      const childRels = childrenMap.get(code) || [];
      const children = childRels.map((rel) => buildNode(rel.child_code, rel, nextPath));
      return { ...item, relation, children };
    };
    return rootCodes.map((code) => buildNode(code));
  }, [bomRelations, itemsByCode]);

  // --- TREE STRUCTURE ---
  const buildTree = (parentId = null) => items.filter(i => i.parentId === parentId).map(i => ({ ...i, children: buildTree(i.id) }));
  const treeData = useMemo(() => buildTree(), [items]);

  // --- KOMPONEN TREE NODE ---
  const TreeNode = ({ node, level = 0 }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    
    let typeColor = 'text-gray-500';
    let Icon = FileText;
    if (node.type === 'FG') { typeColor = 'text-indigo-600'; Icon = Package; }
    else if (node.type === 'WIP') { typeColor = 'text-orange-500'; Icon = Layers; }
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
                     {p} {idx < node.processes.length - 1 && <ArrowRight size={8} className="text-gray-400"/>}
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

  const BomTreeNode = ({ node, level = 0, isLast = false, ancestorHasSibling = [] }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const typeLabel = node.type || 'UNKNOWN';
    const relation = node.relation;
    const typeValue = String(node.type || '').toLowerCase();
    const isRaw = typeValue.includes('raw');
    const isLeafRaw = isRaw && !hasChildren;
    const Icon = isRaw ? FileText : FolderTree;
    const iconClass = isRaw ? 'text-emerald-600' : 'text-blue-600';
    const displayLevel = level + 1;
    const hasNextSibling = !isLast;
    const levelLabel = typeValue.includes('wip')
      ? 'Sub-Assy'
      : (typeValue.includes('fg') || typeValue.includes('finish'))
        ? 'Finish Good'
        : isRaw
          ? 'Raw Material'
          : 'Component';
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
        <div className="text-xs border-b border-gray-100 last:border-0 relative group">
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
              <Icon size={14} className={iconClass} />
              <span className="font-semibold text-slate-700">{node.code}</span>
              <span className="text-[11px] text-gray-500">{node.name || '-'}</span>
              <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full ${isRaw ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                {typeLabel}
              </span>
              {isLeafRaw && (
                <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">PRL</span>
              )}
            </div>
            {relation && (
              <div className="text-[10px] text-gray-400 mt-1">
                Qty/Use: {Number(relation.quantity || 0)} • Scrap: {Number(relation.scrap_factor || 0)}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            {relation && (
              <button
                type="button"
                onClick={() => handleEditRelation(node)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectParent(node)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              title="Add Child"
            >
              <Plus size={12} />
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
    const traverse = (itemId, multiplier) => {
      const children = items.filter(i => i.parentId === itemId);
      children.forEach(child => {
        const currentQtyNeeded = child.qty * multiplier;
          if (child.type === 'RAW MATERIAL' || child.type === 'INDIRECT MATERIAL') {
            if (!materialsMap[child.code]) {
              materialsMap[child.code] = { ...child, totalQty: 0 };
            }
            materialsMap[child.code].totalQty += currentQtyNeeded;
          } else if (child.type === 'WIP') traverse(child.id, currentQtyNeeded);
      });
    };
    productionPlan.forEach(plan => {
      const rootItem = items.find(i => i.id === plan.fgId);
      if (rootItem) traverse(rootItem.id, parseFloat(plan.qty));
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
    reader.onload = (evt) => {
      processHTMLImport(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const finalizeImport = (newItems, codeToIdMap) => {
    if (newItems.length === 0) {
        alert("Tidak ada data valid ditemukan. Gunakan Template .xls");
        return;
    }
      const linkedItems = newItems.map(item => {
          let parentId = null;
          if (item.parentCodeRef && item.parentCodeRef !== '-') {
            parentId = codeToIdMap[item.parentCodeRef];
            if (!parentId) { const existing = items.find(ex => ex.code === item.parentCodeRef); if (existing) parentId = existing.id; }
          }
          const { parentCodeRef, ...final } = item;
          const modelCodes = final.modelCodes || parseModelCodes(final.model);
          return { ...final, parentId, modelCodes, model: final.model || joinModelCodes(modelCodes) };
      });
    if (confirm(`Ditemukan ${linkedItems.length} item. Tambahkan ke database?`)) {
        setItems(prev => [...prev, ...linkedItems]);
    }
  };

  const processHTMLImport = (htmlContent) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr'));
      
      if (rows.length < 2) {
          alert("Gagal membaca file. Pastikan menggunakan format .xls dari Template.");
          return;
      }

      const newItems = [];
      const codeToIdMap = {};

      for (let i = 1; i < rows.length; i++) { // Skip header
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 17) continue; 
        
        const getText = (idx) => cells[idx]?.innerText?.trim() || '';
        const pCode = getText(1);
        const code = getText(2);
        
        if (!code) continue;

        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        codeToIdMap[code] = newId;

        const procStr = getText(13);
        const procArray = procStr ? procStr.split('|').map(s=>s.trim()).filter(s=>s!=='') : [];

        const rawModel = getText(4);
        const parsedModelCodes = parseModelCodes(rawModel);
        newItems.push({
          id: newId, 
          parentCodeRef: pCode, 
          code: code, 
          name: getText(3), 
          model: rawModel,
          modelCodes: parsedModelCodes,
          type: getText(5) || 'RAW MATERIAL',
          qty: parseFloat(getText(6)) || 0, 
          uom: getText(7) || 'PCS', 
          weight: parseFloat(getText(8)) || 0,
          scrap: parseFloat(getText(9)) || 0,
          leadTime: parseInt(getText(10)) || 0, 
          line: getText(11), 
          supplier: getText(12), 
          processes: procArray,
          cycleTime: parseInt(getText(14)) || 0, 
          packing: getText(15)
        });
      }
      finalizeImport(newItems, codeToIdMap);
    } catch (e) { 
        alert("Error membaca file."); 
        console.error(e);
    }
  };

  const exportExcel = () => {
    let tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head><body>
    <table border="1">
      <thead>
        <tr style="background-color:#eee; font-weight:bold;">
          <th>Level</th><th>Parent Code</th><th>Kode Item</th><th>Nama Item</th><th>Model</th><th>Tipe</th>
          <th>Qty (Use)</th><th>UOM</th><th>Berat (Kg)</th><th>Scrap %</th><th>Lead Time</th>
          <th>Line</th><th>Supplier</th><th>Process List</th><th>Cycle Time</th><th>Packing</th>
        </tr>
      </thead>
      <tbody>`;
    items.forEach(item => {
       const parent = items.find(p => p.id === item.parentId);
       const procStr = item.processes ? item.processes.join(' | ') : '';
       tableHTML += `<tr>
         <td>${item.parentId ? 1 : 0}</td>
         <td>${parent ? parent.code : '-'}</td>
         <td style="mso-number-format:'\@'">${item.code}</td>
         <td>${item.name}</td><td>${item.model}</td><td>${item.type}</td>
         <td>${item.qty}</td><td>${item.uom}</td>
         <td>${item.weight}</td><td>${item.scrap}</td><td>${item.leadTime}</td>
         <td>${item.line}</td><td>${item.supplier}</td><td>${procStr}</td><td>${item.cycleTime}</td><td>${item.packing}</td>
       </tr>`;
    });
    tableHTML += `</tbody></table></body></html>`;
    const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([tableHTML], { type: 'application/vnd.ms-excel' })); a.download = 'Master_Data_BOM.xls'; a.click();
  };

  const exportImportTemplate = () => {
    const defaults = {
      parentId: '',
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
      supplier: '',
      processes: [],
      cycleTime: '',
      packing: '',
    };
    const templateRows = items.length ? items.slice(0, 2) : [{ ...defaults }];
    const buildRow = (item, index) => {
      const row = { ...defaults, ...item };
      const processes = Array.isArray(row.processes) ? row.processes.join(' | ') : row.processes || '';
      return `
        <tr>
          <td>${index}</td><td>${getLabel(items.find((it) => it.id === row.parentId) || { code: '-' })}</td><td>${row.code}</td><td>${row.name}</td><td>${row.model}</td><td>${row.type}</td>
          <td>${row.qty}</td><td>${row.uom}</td><td>${row.weight}</td><td>${row.scrap}</td><td>${row.leadTime}</td>
          <td>${row.line}</td><td>${row.supplier}</td><td>${processes}</td><td>${row.cycleTime}</td><td>${row.packing}</td>
        </tr>`;
    };
    const tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head><body>
    <table border="1">
      <thead>
        <tr style="background-color:#eee; font-weight:bold;">
          <th>Level</th><th>Parent Code</th><th>Kode Item</th><th>Nama Item</th><th>Model</th><th>Tipe</th>
          <th>Qty (Use)</th><th>UOM</th><th>Berat (Kg)</th><th>Scrap %</th><th>Lead Time</th>
          <th>Line</th><th>Supplier</th><th>Process List</th><th>Cycle Time</th><th>Packing</th>
        </tr>
      </thead>
      <tbody>
        ${templateRows.map((row, idx) => buildRow(row, idx)).join('')}
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
        const newItems = [];
          const processNode = (node, parentId) => {
            const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const procList = Array.isArray(node.processes) ? node.processes : (node.process ? [node.process] : []);
            const incomingModelCodes = Array.isArray(node.modelCodes)
              ? node.modelCodes
              : parseModelCodes(node.model);
            const normalizedModel = joinModelCodes(incomingModelCodes) || node.model || '';
            newItems.push({
              ...node,
              id: newId,
              parentId,
              type: node.type || 'RAW MATERIAL',
              qty: node.qty || 1,
              uom: node.uom || 'PCS',
              weight: node.weight || 0,
              processes: procList,
              modelCodes: incomingModelCodes,
              model: normalizedModel,
            });
            if (node.children) node.children.forEach(c => processNode(c, newId));
          };
        Array.isArray(bomData) ? bomData.forEach(r => processNode(r, null)) : processNode(bomData, null);
        setItems(prev => [...prev, ...newItems]); setShowAiModal(false);
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
            
            const fgItem = items.find(itm => itm.code === fgCode && itm.type === 'FG');
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
                 <button onClick={exportImportTemplate} className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex gap-2"><FileSpreadsheet size={14}/> Download Template .xls</button>
                 {allowEdit && (
                   <button onClick={() => { fileInputRef.current.click(); setShowDataMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex gap-2"><Upload size={14}/> Import .xls (HTML)</button>
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
                      {parentOptions.map(item => (
                        <option key={`parent-${item.code}`} value={item.code}>{item.code} - {item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipe Komponen Baru (Master Category)</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    >
                      <option value="">- Pilih Category -</option>
                      {categoryOptions.map((opt) => (
                        <option key={`child-type-${opt.value}`} value={opt.value}>{opt.label}</option>
                      ))}
                      {newItem.type && !categoryValueSet.has(newItem.type) && (
                        <option value={newItem.type}>{newItem.type}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kode Item</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs font-mono" placeholder="Contoh: RM-102" value={newItem.code} onChange={e=>setNewItem({...newItem, code:e.target.value})} onBlur={handleItemCodeBlur} required/>
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
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Line A" value={newItem.line} onChange={e=>setNewItem({...newItem, line:e.target.value})}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Supplier</label><input list="bom-vendor-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Vendor Name" value={newItem.supplier} onChange={e=>setNewItem({...newItem, supplier:e.target.value})}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Customer" value={newItem.customer} onChange={e=>setNewItem({...newItem, customer:e.target.value})}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Gudang / Area" value={newItem.location} onChange={e=>setNewItem({...newItem, location:e.target.value})}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Box" value={newItem.packing} onChange={e=>setNewItem({...newItem, packing:e.target.value})}/></div>
                      <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className="w-full p-2 border rounded text-xs bg-white" value={newItem.cycleTime} onChange={e=>setNewItem({...newItem, cycleTime:e.target.value})}/></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                        <span>Daftar Model / Spesifikasi</span>
                        <button type="button" onClick={addModelRow} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(newItem.modelCodes && newItem.modelCodes.length ? newItem.modelCodes : ['']).map((modelCode, idx) => (
                          <div key={`model-row-${idx}`} className="flex gap-1 items-center">
                            <span className="text-[10px] text-gray-400 w-4">{idx + 1}.</span>
                            <select
                              className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                              value={modelCode || ''}
                              onChange={(e) => handleModelSelectChange(idx, e.target.value)}
                            >
                              <option value="">- Pilih Model -</option>
                              {localModels.map((model) => (
                                <option key={`model-opt-${model.code}`} value={model.code}>
                                  {model.code}{model.name ? ` - ${model.name}` : ''}
                                </option>
                              ))}
                              <option value="__new__">+ New Master Model</option>
                            </select>
                            {(newItem.modelCodes?.length || 0) > 1 && (
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
                        <span>Urutan Proses Produksi</span>
                        <button type="button" onClick={addProcessField} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {newItem.processes.map((proc, idx) => (
                          <div key={idx} className="flex gap-1 items-center">
                            <span className="text-[10px] text-gray-400 w-4">{idx+1}.</span>
                            <input type="text" className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none" placeholder={`Nama Proses ${idx+1}`} value={proc} onChange={(e) => handleProcessChange(idx, e.target.value)} />
                            {newItem.processes.length > 1 && (<button type="button" onClick={() => removeProcessField(idx)} className="text-red-400 hover:text-red-600"><X size={12}/></button>)}
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
                   <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">SATUAN</label><input type="text" className="w-full p-1 text-xs bg-white border border-blue-200 rounded" value={newItem.uom} onChange={e=>setNewItem({...newItem, uom:e.target.value})}/></div>
                   <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">BERAT (KG)</label><input type="number" step="0.01" className="w-full p-1 text-right text-xs bg-white border border-blue-200 rounded" value={newItem.weight} onChange={e=>setNewItem({...newItem, weight:e.target.value})}/></div>
                   <div className="bg-yellow-50 p-2 rounded border border-yellow-100"><label className="text-[9px] font-bold text-yellow-700 block">SCRAP %</label><input type="number" step="0.1" className="w-full p-1 text-right text-xs bg-white border border-yellow-200 rounded" value={newItem.scrap} onChange={e=>setNewItem({...newItem, scrap:e.target.value})}/></div>
                   <div className="bg-red-50 p-2 rounded border border-red-100"><label className="text-[9px] font-bold text-red-700 block">LEAD TIME</label><input type="number" className="w-full p-1 text-right text-xs bg-white border border-red-200 rounded" value={newItem.leadTime} onChange={e=>setNewItem({...newItem, leadTime:e.target.value})}/></div>
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
                    {bulkMode === 'single' ? 'Input Single-Level (Parent -> Material)' : 'Input Bertingkat (Multi-Level)'}
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
                        {parentOptions.map(item => (
                          <option key={`bulk-parent-${item.code}`} value={item.code}>{item.code} - {item.name}</option>
                        ))}
                      </select>
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
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                              <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Line A" value={bulkParentDetails.line} onChange={e=>updateBulkParentDetails({ line: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Supplier</label><input list="bom-vendor-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Vendor Name" value={bulkParentDetails.supplier} onChange={e=>updateBulkParentDetails({ supplier: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Customer" value={bulkParentDetails.customer} onChange={e=>updateBulkParentDetails({ customer: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Gudang / Area" value={bulkParentDetails.location} onChange={e=>updateBulkParentDetails({ location: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Box" value={bulkParentDetails.packing} onChange={e=>updateBulkParentDetails({ packing: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className="w-full p-2 border rounded text-xs bg-white" value={bulkParentDetails.cycleTime} onChange={e=>updateBulkParentDetails({ cycleTime: e.target.value })}/></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Daftar Model / Spesifikasi</span>
                                <button type="button" onClick={addBulkParentModelRow} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(bulkParentDetails.modelCodes && bulkParentDetails.modelCodes.length ? bulkParentDetails.modelCodes : ['']).map((modelCode, modelIdx) => (
                                  <div key={`parent-model-${modelIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{modelIdx + 1}.</span>
                                    <select
                                      className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                                      value={modelCode || ''}
                                      onChange={(e) => handleBulkParentModelSelectChange(modelIdx, e.target.value)}
                                    >
                                      <option value="">- Pilih Model -</option>
                                      {localModels.map((model) => (
                                        <option key={`parent-model-opt-${model.code}`} value={model.code}>
                                          {model.code}{model.name ? ` - ${model.name}` : ''}
                                        </option>
                                      ))}
                                      <option value="__new__">+ New Master Model</option>
                                    </select>
                                    {(bulkParentDetails.modelCodes || []).length > 1 && (
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
                                <button type="button" onClick={addBulkParentProcess} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(bulkParentDetails.processCodes || ['']).map((procCode, procIdx) => (
                                  <div key={`parent-proc-${procIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{procIdx + 1}.</span>
                                    <select
                                      className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                                      value={procCode || ''}
                                      onChange={(e) => updateBulkParentProcess(procIdx, e.target.value)}
                                    >
                                      <option value="">- Pilih Process -</option>
                                      {(masterProcesses || []).map((proc) => (
                                        <option key={`parent-proc-${proc.code}`} value={proc.code}>
                                          {proc.code} - {proc.name}
                                        </option>
                                      ))}
                                    </select>
                                    {(bulkParentDetails.processCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkParentProcess(procIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {(masterProcesses || []).length === 0 && (
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
                            <span>Material (Raw) untuk Parent Ini</span>
                            <button type="button" onClick={addBulkParentMaterial} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Material</button>
                          </div>
                          {(() => {
                            const existingCodes = getExistingMaterialCodesForParent(bulkParentCode);
                            return (
                          <div className="space-y-2">
                            {(bulkParentMaterials || []).map((material, matIdx) => (
                              <div key={`parent-mat-${material.id || matIdx}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Material Code</label>
                                  <input
                                    list="bom-item-options"
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
                    {bulkChildren.map((child, childIdx) => (
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
                              list="bom-item-options"
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
                              className="w-full p-2 border border-gray-300 rounded text-xs"
                              value={child.type}
                              onChange={(e) => updateBulkChild(childIdx, { type: e.target.value })}
                            >
                              <option value="">- Pilih Category -</option>
                              {categoryOptions.map((opt) => (
                                <option key={`bulk-child-type-${child.id}-${opt.value}`} value={opt.value}>{opt.label}</option>
                              ))}
                              {child.type && !categoryValueSet.has(child.type) && (
                                <option value={child.type}>{child.type}</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                          <div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2">Parameter Umum</div>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                              <div><label className="block text-[10px] text-gray-500 mb-1">Line Produksi</label><input list="bom-line-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Line A" value={child.line} onChange={e=>updateBulkChild(childIdx, { line: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Supplier</label><input list="bom-vendor-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Vendor Name" value={child.supplier} onChange={e=>updateBulkChild(childIdx, { supplier: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Customer</label><input list="bom-customer-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Customer" value={child.customer} onChange={e=>updateBulkChild(childIdx, { customer: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Storage Location (Gudang/Area)</label><input list="bom-location-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Gudang / Area" value={child.location} onChange={e=>updateBulkChild(childIdx, { location: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Packing</label><input list="bom-packing-options" type="text" className="w-full p-2 border rounded text-xs bg-white" placeholder="Box" value={child.packing} onChange={e=>updateBulkChild(childIdx, { packing: e.target.value })}/></div>
                              <div><label className="block text-[10px] text-gray-500 mb-1">Cycle Time (s)</label><input type="number" className="w-full p-2 border rounded text-xs bg-white" value={child.cycleTime} onChange={e=>updateBulkChild(childIdx, { cycleTime: e.target.value })}/></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase border-b border-indigo-100 pb-1 mb-2 flex justify-between">
                                <span>Daftar Model / Spesifikasi</span>
                                <button type="button" onClick={() => addBulkModelRow(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Model</button>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(child.modelCodes && child.modelCodes.length ? child.modelCodes : ['']).map((modelCode, modelIdx) => (
                                  <div key={`model-${child.id}-${modelIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{modelIdx + 1}.</span>
                                    <select
                                      className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                                      value={modelCode || ''}
                                      onChange={(e) => handleBulkModelSelectChange(childIdx, modelIdx, e.target.value)}
                                    >
                                      <option value="">- Pilih Model -</option>
                                      {localModels.map((model) => (
                                        <option key={`bulk-model-${model.code}`} value={model.code}>
                                          {model.code}{model.name ? ` - ${model.name}` : ''}
                                        </option>
                                      ))}
                                      <option value="__new__">+ New Master Model</option>
                                    </select>
                                    {(child.modelCodes || []).length > 1 && (
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
                                <button type="button" onClick={() => addBulkProcess(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Proses</button>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {(child.processCodes || ['']).map((procCode, procIdx) => (
                                  <div key={`proc-${child.id}-${procIdx}`} className="flex gap-2 items-center">
                                    <span className="text-[10px] text-gray-400 w-4">{procIdx + 1}.</span>
                                    <select
                                      className="flex-1 p-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-indigo-300 outline-none"
                                      value={procCode || ''}
                                      onChange={(e) => updateBulkProcess(childIdx, procIdx, e.target.value)}
                                    >
                                      <option value="">- Pilih Process -</option>
                                      {(masterProcesses || []).map((proc) => (
                                        <option key={`proc-${proc.code}`} value={proc.code}>
                                          {proc.code} - {proc.name}
                                        </option>
                                      ))}
                                    </select>
                                    {(child.processCodes || []).length > 1 && (
                                      <button type="button" onClick={() => removeBulkProcess(childIdx, procIdx)} className="text-red-400 hover:text-red-600">
                                        <X size={12}/>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {(masterProcesses || []).length === 0 && (
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

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">QTY / USE</label><input type="number" step="0.01" className="w-full p-1 text-right text-xs bg-white border border-blue-200 rounded" value={child.qty} onChange={e=>updateBulkChild(childIdx, { qty: e.target.value })}/></div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">SATUAN</label><input type="text" className="w-full p-1 text-xs bg-white border border-blue-200 rounded" value={child.uom} onChange={e=>updateBulkChild(childIdx, { uom: e.target.value })}/></div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100"><label className="text-[9px] font-bold text-blue-700 block">BERAT (KG)</label><input type="number" step="0.01" className="w-full p-1 text-right text-xs bg-white border border-blue-200 rounded" value={child.weight} onChange={e=>updateBulkChild(childIdx, { weight: e.target.value })}/></div>
                          <div className="bg-yellow-50 p-2 rounded border border-yellow-100"><label className="text-[9px] font-bold text-yellow-700 block">SCRAP %</label><input type="number" step="0.1" className="w-full p-1 text-right text-xs bg-white border border-yellow-200 rounded" value={child.scrap} onChange={e=>updateBulkChild(childIdx, { scrap: e.target.value })}/></div>
                          <div className="bg-red-50 p-2 rounded border border-red-100"><label className="text-[9px] font-bold text-red-700 block">LEAD TIME</label><input type="number" className="w-full p-1 text-right text-xs bg-white border border-red-200 rounded" value={child.leadTime} onChange={e=>updateBulkChild(childIdx, { leadTime: e.target.value })}/></div>
                        </div>

                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">
                            <span>Material (Raw) untuk Child Ini</span>
                            <button type="button" onClick={() => addBulkMaterial(childIdx)} className="text-indigo-600 hover:text-indigo-800 text-[9px] flex items-center gap-1">+ Tambah Material</button>
                          </div>
                          <div className="space-y-2">
                            {(child.materials || []).map((material, matIdx) => (
                              <div key={`mat-${material.id}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Material Code</label>
                                  <input
                                    list="bom-item-options"
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
                    ))}
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
                {masterLocations.filter(isProductionOrWorkCenter).map((loc, idx) => (
                  <option key={`line-${loc.id || idx}`} value={getLineOptionLabel(loc)} />
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
              <datalist id="bom-item-options">
                {items.map((item, idx) => (
                  <option key={`bom-item-${item.code || idx}`} value={item.code} label={item.name} />
                ))}
              </datalist>
            </div>
          )}
        </div>
        )}

        {/* --- DATA VIEW --- */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-[500px]">
          {viewMode === 'tree' ? (
            <div className="flex-1 flex flex-col">
               <div className="flex items-center justify-between p-3 bg-gray-50 font-bold text-[10px] text-gray-500 border-b border-gray-200 uppercase tracking-wider sticky top-0 z-10">
                 <div>Struktur BOM (Multi Level)</div>
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
                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${i.type==='FG'?'bg-indigo-100 text-indigo-700':i.type==='WIP'?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-600'}`}>{i.type}</span></td>
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
                        <button onClick={() => handleDuplicate(i)} className="text-gray-400 hover:text-blue-600" title="Duplicate"><Copy size={14}/></button>
                        <button onClick={() => handleDelete(i.id)} className="text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14}/></button>
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
                      {items.filter(i=>i.type==='FG').map(i=><option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
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
