import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Edit,
  Flag,
  FileSpreadsheet,
  FileUp,
  Plus,
  Save,
  Trash2,
  X as XIcon,
} from 'lucide-react';
import BomManager from '../components/BomManager';

const TabMasterRef = (props) => {
  const {
    activeConfigModal,
    addModelCodeToItemForm,
    apiFetch,
    appendConfigToken,
    areaForm,
    bomProcessOptions,
    canImportExport,
    canViewMaster,
    canManageMaster,
    canManageVendors,
    canManageItems,
    categoryForm,
    categoryNameByCode,
    closeConfigModal,
    configModalDraft,
    configModalKey,
    configModalValue,
    customerForm,
    deliveryForm,
    editingLocationId,
    fetchMasterReferences,
    fifoMethodOptions,
    filteredMasterItems,
    formatModelCodes,
    formatRelationList,
    handleDeleteMaster,
    handleDeleteModel,
    handleDeleteProcess,
    handleDownloadItemsTemplate,
    handleEditModel,
    handleEditProcess,
    handleExportItemsXls,
    handleSaveArea,
    handleSaveCategory,
    handleSaveConfig,
    handleSaveCustomer,
    handleSaveDelivery,
    handleSaveItemMaster,
    handleSaveLocation,
    handleSaveModel,
    handleSaveProcess,
    handleSavePacking,
    handleSavePlant,
    handleSaveVendor,
    handleSaveWarehouse,
    itemBulkCategory,
    itemBulkCustomer,
    itemBulkOpen,
    itemBulkSaving,
    itemBulkShelfLife,
    itemBulkSupplier,
    itemBulkTypePack,
    itemCustomerMap,
    itemMasterForm,
    itemMenuOpen,
    itemModelEntry,
    itemsImportRef,
    itemSupplierMap,
    itemTableFilters,
    itemDuplicateKeySets,
    locationForm,
    mainTab,
    masterAreas,
    masterCategories,
    masterCategoryOptions,
    masterConfig,
    masterCustomers,
    masterDeliveries,
    masterError,
    masterFormVisible,
    masterEditingItemCode,
    masterItems,
    masterItemsPaginationMeta,
    masterLoading,
    masterLocations,
    masterModels,
    masterModelsMap,
    masterProcesses,
    masterPackings,
    masterPlants,
    masterRefTab,
    masterVendorSearch,
    masterVendors,
    masterWarehouses,
    modelCatalogForm,
    modelFormVisible,
    processCatalogForm,
    processFormVisible,
    openConfigModal,
    packingForm,
    packingNameByCode,
    parseModelCodes,
    plantForm,
    removeModelCodeFromItemForm,
    renderPaginationControls,
    resetMasterForms,
    selectedItemCodes,
    setActiveMenu,
    setAreaForm,
    setCategoryForm,
    setConfigModalDraft,
    setConfigModalValue,
    setCustomerForm,
    setDeliveryForm,
    setEditingAreaId,
    setEditingCategoryCode,
    setEditingCustomerId,
    setEditingDeliveryId,
    setEditingLocationId,
    setEditingModelCode,
    setEditingProcessCode,
    setEditingPackingCode,
    setEditingPlantId,
    setEditingVendorId,
    setEditingWarehouseId,
    setItemBulkCategory,
    setItemBulkCustomer,
    setItemBulkOpen,
    setItemBulkSaving,
    setItemBulkShelfLife,
    setItemBulkSupplier,
    setItemBulkTypePack,
    setItemMasterForm,
    setItemMenuOpen,
    setItemModelEntry,
    setItemTableFilters,
    setLocationForm,
    setMasterEditingItemCode,
    setMasterFormVisible,
    setMasterRefTab,
    setMasterVendorSearch,
    setModelCatalogForm,
    setModelFormVisible,
    setProcessCatalogForm,
    setProcessFormVisible,
    setPackingForm,
    setPlantForm,
    setSelectedItemCodes,
    setVendorForm,
    setWarehouseForm,
    showToastMessage,
    vendorForm,
    vendorTypeOptions,
    warehouseForm,
    warehouseTypeOptions,
  } = props;

  const [localItemFilters, setLocalItemFilters] = useState(itemTableFilters || {});
  const lastFiltersRef = useRef(itemTableFilters || {});
  const [orgSubTab, setOrgSubTab] = useState('warehouse');
  const [configSubTab, setConfigSubTab] = useState('format');
  const itemImageInputRef = useRef(null);
  const [itemImageUploading, setItemImageUploading] = useState(false);
  const [itemImagePreview, setItemImagePreview] = useState(null);
  const [itemImageError, setItemImageError] = useState('');
  const areFiltersEqual = (a, b) => (
    (a?.duplicatesOnly ?? false) === (b?.duplicatesOnly ?? false)
    && String(a?.code ?? '') === String(b?.code ?? '')
    && String(a?.partNo ?? '') === String(b?.partNo ?? '')
    && String(a?.name ?? '') === String(b?.name ?? '')
    && String(a?.category ?? '') === String(b?.category ?? '')
    && String(a?.unit ?? '') === String(b?.unit ?? '')
    && String(a?.typePack ?? '') === String(b?.typePack ?? '')
    && String(a?.supplier ?? '') === String(b?.supplier ?? '')
    && String(a?.customer ?? '') === String(b?.customer ?? '')
    && String(a?.model ?? '') === String(b?.model ?? '')
  );
  const locationTypeOptions = ['Production Line', 'Work Center', 'Warehouse'];
  const getStandardLocationType = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/production\s*line/i.test(raw)) return 'Production Line';
    if (/work\s*center/i.test(raw)) return 'Work Center';
    if (/warehouse/i.test(raw)) return 'Warehouse';
    return '';
  };
  const isProcessLocationType = (value) => {
    const normalized = getStandardLocationType(value);
    return normalized === 'Production Line' || normalized === 'Work Center';
  };

  const processTypeOptions = useMemo(() => {
    const defaults = ['Subcon', 'Assembly', 'Machining', 'Welding', 'Painting', 'Inspection', 'Packing', 'Other'];
    const dynamic = (masterProcesses || [])
      .map((process) => String(process.process_type || process.processType || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...defaults, ...dynamic])).filter(Boolean);
  }, [masterProcesses]);
  const processWorkCenterOptions = useMemo(() => {
    const seen = new Set();
    return (masterLocations || [])
      .map((location) => {
        const locationId = String(location.id || '').trim();
        const lineDescription = getStandardLocationType(location.line_description || location.lineDescription);
        const inferredType = lineDescription || String(location.category || location.type || '').trim();
        const fifoLane = String(location.fifo_lane || location.fifoLane || '').trim();
        const labelParts = [locationId, inferredType, fifoLane].filter(Boolean);
        return {
          value: locationId,
          label: labelParts.join(' • '),
          isProcessType: isProcessLocationType(lineDescription),
        };
      })
      .filter((option) => {
        if (!option.value || seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
  }, [masterLocations]);
  const getProcessWorkCenterLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const matched = processWorkCenterOptions.find(
      (option) => option.value === raw || String(option.label || '').toLowerCase() === raw.toLowerCase(),
    );
    return matched?.label || raw;
  };
  const masterFormHelperText = {
    warehouse: 'Gedung fisik atau fungsi utama secara keseluruhan. Contoh: Gudang Material (RM), Gudang Barang Jadi (FG).',
    area: 'Pembagian zona atau blok di dalam Gudang. Contoh: Area Karantina, Area Rak Besi.',
    location: 'Titik koordinat paling spesifik untuk meletakkan barang fisik. Contoh: Rak A-01, Bin B-05, Palet 12.',
    productionLine: 'Jalur produksi atau area perakitan secara keseluruhan. Contoh: Line Perakitan Rangka, Line Pengecatan.',
    workCenter: 'Titik mesin atau stasiun kerja spesifik di dalam Line. Contoh: Mesin Las 01, Meja Inspeksi 02.',
  };

  useEffect(() => {
    setLocalItemFilters(itemTableFilters || {});
    lastFiltersRef.current = itemTableFilters || {};
  }, [itemTableFilters]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!areFiltersEqual(localItemFilters, lastFiltersRef.current)) {
        setItemTableFilters(localItemFilters);
        lastFiltersRef.current = localItemFilters;
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [localItemFilters, setItemTableFilters]);

  useEffect(() => {
    const nextPreview = itemMasterForm?.imageThumbUrl || itemMasterForm?.imageUrl || null;
    setItemImagePreview(nextPreview);
  }, [itemMasterForm?.imageThumbUrl, itemMasterForm?.imageUrl]);

  const handleItemImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const itemCode = masterEditingItemCode || itemMasterForm?.code;
    if (!itemCode) {
      setItemImageError('Isi kode item terlebih dahulu.');
      if (itemImageInputRef.current) itemImageInputRef.current.value = '';
      return;
    }
    const hasExistingItem = (masterItems || []).some((item) => item.code === itemCode);
    if (!hasExistingItem && !masterEditingItemCode) {
      setItemImageError('Simpan item terlebih dahulu sebelum upload.');
      if (itemImageInputRef.current) itemImageInputRef.current.value = '';
      return;
    }
    setItemImageUploading(true);
    setItemImageError('');
    try {
      const payload = new FormData();
      payload.append('image', file);
      const response = await apiFetch(`/api/master/items/${encodeURIComponent(itemCode)}/image`, {
        method: 'POST',
        body: payload,
      });
      const imageUrl = response?.imageUrl || response?.image_url || '';
      const imageThumbUrl = response?.imageThumbUrl || response?.image_thumb_url || '';
      setItemMasterForm((prev) => ({
        ...prev,
        imageUrl: imageUrl || prev.imageUrl,
        imageThumbUrl: imageThumbUrl || prev.imageThumbUrl,
      }));
      if (imageThumbUrl || imageUrl) {
        setItemImagePreview(imageThumbUrl || imageUrl);
      }
      if (typeof fetchMasterReferences === 'function') {
        fetchMasterReferences({ silent: true });
      }
      if (showToastMessage) {
        showToastMessage('Gambar item berhasil diunggah.');
      }
    } catch (error) {
      const message = error?.message || 'Gagal mengunggah gambar.';
      setItemImageError(message);
      if (showToastMessage) showToastMessage(message, '', null, 'error');
    } finally {
      setItemImageUploading(false);
      if (itemImageInputRef.current) itemImageInputRef.current.value = '';
    }
  };

  const handleQuickSaveModelForItem = async () => {
    const savedModel = await handleSaveModel?.();
    if (!savedModel?.code) return;
    const savedCode = String(savedModel.code || '').trim();
    if (!savedCode) return;
    setItemModelEntry(savedCode);
    setItemMasterForm((prev) => {
      const existing = prev.modelCodes || [];
      if (existing.includes(savedCode)) return prev;
      return { ...prev, modelCodes: [...existing, savedCode] };
    });
  };

  const allowMasterEdit = !!canManageMaster;
  const allowVendorEdit = !!canManageVendors;
  const [vendorSearch, setVendorSearch] = useState('');

  useEffect(() => {
    if (typeof masterVendorSearch !== 'string') return;
    setVendorSearch(masterVendorSearch);
  }, [masterVendorSearch]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return masterVendors;
    const query = String(vendorSearch || '').trim().toLowerCase();
    if (!query) return masterVendors;
    return (masterVendors || []).filter((vendor) => {
      const id = String(vendor.id || '').toLowerCase();
      const name = String(vendor.name || '').toLowerCase();
      const type = String(vendor.type || '').toLowerCase();
      const email = String(vendor.email || '').toLowerCase();
      return id.includes(query) || name.includes(query) || type.includes(query) || email.includes(query);
    });
  }, [masterVendors, vendorSearch]);
  const warehouseById = useMemo(
    () => new Map((masterWarehouses || []).map((wh) => [wh.id, wh])),
    [masterWarehouses],
  );
  const areaById = useMemo(
    () => new Map((masterAreas || []).map((area) => [area.id, area])),
    [masterAreas],
  );
  const getAreaWarehouseId = (area) => area?.warehouse_id || area?.plant_id || '';
  const getWarehouseLabel = (warehouseId) => {
    if (!warehouseId) return '-';
    const wh = warehouseById.get(warehouseId);
    return wh ? `${wh.id} - ${wh.name}` : warehouseId;
  };
  const getAreaLabel = (areaId) => {
    if (!areaId) return '-';
    const area = areaById.get(areaId);
    return area ? `${area.id} - ${area.name}` : areaId;
  };
  const isLocationProcessEnabled = isProcessLocationType(locationForm?.lineDescription);
  const getProcessScopeLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'single') return 'Single-Level';
    if (normalized === 'multi') return 'Multi-Level';
    return 'All';
  };
  const isCreatingLocation = !editingLocationId;
  const normalizePrefix = (value, fallback) => {
    const trimmed = String(value || '').trim();
    return trimmed || fallback;
  };
  const locationPrefixMap = {
    Warehouse: normalizePrefix(masterConfig?.locationPrefixWarehouse, 'LOC-WH'),
    'Production Line': normalizePrefix(masterConfig?.locationPrefixProduction, 'LOC-PR'),
    'Work Center': normalizePrefix(masterConfig?.locationPrefixWorkCenter, 'LOC-WC'),
  };
  const getLocationPrefix = (locationType) => locationPrefixMap[locationType] || '';
  const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buildNextLocationId = (prefix, locations) => {
    const trimmedPrefix = String(prefix || '').trim().replace(/-+$/, '');
    if (!trimmedPrefix) return '';
    const regex = new RegExp(`^${escapeRegExp(trimmedPrefix)}-(\\d+)$`, 'i');
    let maxCounter = 0;
    (locations || []).forEach((loc) => {
      const idValue = String(loc?.id || '').trim();
      const match = idValue.match(regex);
      if (match) {
        const counter = Number(match[1]);
        if (Number.isFinite(counter)) maxCounter = Math.max(maxCounter, counter);
      }
    });
    const nextCounter = String(maxCounter + 1).padStart(3, '0');
    return `${trimmedPrefix}-${nextCounter}`;
  };

  useEffect(() => {
    if (!isCreatingLocation) return;
    const normalizedType = getStandardLocationType(locationForm?.lineDescription);
    if (!normalizedType) return;
    const prefix = getLocationPrefix(normalizedType);
    if (!prefix) return;
    const nextId = buildNextLocationId(prefix, masterLocations);
    if (!nextId) return;
    setLocationForm((prev) => (prev.id === nextId ? prev : { ...prev, id: nextId }));
  }, [isCreatingLocation, locationForm?.lineDescription, masterLocations, masterConfig, setLocationForm]);

  const normalizeVendorScheduleRows = (input) => {
    let rows = input;
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch (error) {
        return [];
      }
    }
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch (error) {
        return [];
      }
    }
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const ritRaw = row?.rit ?? row?.RIT ?? row?.rit_no ?? row?.ritNo ?? '';
        const ritValue = ritRaw !== null && ritRaw !== undefined ? String(ritRaw).trim() : '';
        const timeValue = String(row?.time ?? row?.delivery_time ?? row?.deliveryTime ?? '').trim();
        const cycleValue = String(row?.cycle ?? '').trim();
        return {
          rit: ritValue,
          time: timeValue,
          cycle: cycleValue,
        };
      })
      .filter((row) => row.rit || row.time || row.cycle);
  };

  const buildVendorScheduleRows = (vendor) => {
    if (!vendor) return [];
    const schedule = normalizeVendorScheduleRows(vendor.delivery_schedule || vendor.deliverySchedule);
    if (schedule.length > 0) return schedule;
    const legacy = {
      rit: String(vendor.rit ?? '').trim(),
      time: String(vendor.delivery_time ?? vendor.deliveryTime ?? '').trim(),
      cycle: String(vendor.cycle ?? '').trim(),
    };
    return normalizeVendorScheduleRows([legacy]);
  };

  const vendorScheduleRows = vendorForm?.deliverySchedule || [];

  const addVendorScheduleRow = () => {
    setVendorForm((prev) => ({
      ...prev,
      deliverySchedule: [...(prev.deliverySchedule || []), { rit: '', time: '', cycle: '' }],
    }));
  };

  const updateVendorScheduleRow = (index, patch) => {
    setVendorForm((prev) => {
      const rows = [...(prev.deliverySchedule || [])];
      rows[index] = { ...rows[index], ...patch };
      return { ...prev, deliverySchedule: rows };
    });
  };

  const removeVendorScheduleRow = (index) => {
    setVendorForm((prev) => {
      const rows = [...(prev.deliverySchedule || [])];
      rows.splice(index, 1);
      return { ...prev, deliverySchedule: rows };
    });
  };
  const allowItemEdit = !!canManageItems;
  const normalizeDuplicateKey = (value) => String(value ?? '').trim().toLowerCase();

  return (
    <>
            {mainTab === 'masterref' && !canViewMaster && (
            <div className="bg-white rounded-xl border p-6 text-sm text-slate-500">
              Anda tidak memiliki akses untuk melihat Master Referensi.
            </div>
            )}
            {mainTab === 'masterref' && canViewMaster && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Master Referensi</div>
                    <div className="mt-1 text-xs text-slate-500">Data master terintegrasi untuk alur Kanban-DN-RN-FIFO.</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {[
                    { key: 'org', label: 'Org' },
                    { key: 'vendor', label: 'Vendor' },
                    { key: 'customer', label: 'Customer' },
                    { key: 'item', label: 'Item' },
                    { key: 'bom', label: 'BOM' },
                    { key: 'model', label: 'Model' },
                    { key: 'process', label: 'Process' },
                    { key: 'category', label: 'Category' },
                    { key: 'packing', label: 'Packing' },
                    { key: 'config', label: 'Config' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMasterRefTab(tab.key)}
                      className={`px-3 py-1.5 rounded-full border transition-all ${
                        masterRefTab === tab.key
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-transparent shadow-sm'
                          : 'bg-white/80 text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {masterError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={14} /> {masterError}
                </div>
              )}

              {masterLoading && (
                <div className="text-xs text-slate-500">Memuat master referensi...</div>
              )}

              {masterRefTab === 'org' && (
              <div className="space-y-4">
                <div className="bg-white/90 rounded-xl border px-4">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    {[
                      { key: 'warehouse', label: 'Master Warehouse' },
                      { key: 'area', label: 'Master Area' },
                      { key: 'location', label: 'Master Location' },
                      { key: 'delivery', label: 'Delivery Address' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrgSubTab(tab.key)}
                        className={`relative py-3 text-sm transition ${
                          orgSubTab === tab.key
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                        {orgSubTab === tab.key && (
                          <span className="absolute left-0 -bottom-[1px] h-[2px] w-full rounded-full bg-slate-900" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {orgSubTab === 'warehouse' && (
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Warehouse</div>
                    {allowMasterEdit && (
                      <button
                        onClick={() => {
                          setWarehouseForm({ id: '', name: '', site: '', type: 'MAIN' });
                          setEditingWarehouseId(null);
                          setMasterFormVisible((prev) => ({ ...prev, warehouse: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                  </div>
                  {masterFormVisible.warehouse && allowMasterEdit && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                        <input className="border rounded px-3 py-2" placeholder="Warehouse ID" value={warehouseForm.id} onChange={(e) => setWarehouseForm({ ...warehouseForm, id: e.target.value })} />
                        <input className="border rounded px-3 py-2" placeholder="Name" value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} />
                        <input className="border rounded px-3 py-2" placeholder="Site" value={warehouseForm.site} onChange={(e) => setWarehouseForm({ ...warehouseForm, site: e.target.value })} />
                        <select
                          className="border rounded px-3 py-2"
                          value={warehouseForm.type}
                          onChange={(e) => setWarehouseForm({ ...warehouseForm, type: e.target.value })}
                        >
                          {warehouseTypeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3 text-[11px] text-slate-500 leading-relaxed">
                        {masterFormHelperText.warehouse}
                      </div>
                      <div className="flex gap-2 mb-4 text-xs">
                        <button onClick={handleSaveWarehouse} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                          <Save size={14} />
                          <span>Simpan</span>
                        </button>
                        <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, warehouse: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                          <XIcon size={14} />
                          <span>Batal</span>
                        </button>
                      </div>
                    </>
                  )}
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">Warehouse ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Site</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterWarehouses.map((wh) => (
                        <tr key={wh.id} className="border-t">
                          <td className="p-2">{wh.id}</td>
                          <td className="p-2">{wh.name}</td>
                          <td className="p-2">{wh.site}</td>
                          <td className="p-2">{wh.type}</td>
                          <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setWarehouseForm({ id: wh.id, name: wh.name, site: wh.site, type: wh.type || 'MAIN' }); setEditingWarehouseId(wh.id); setMasterFormVisible((prev) => ({ ...prev, warehouse: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/warehouses/${wh.id}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            {orgSubTab === 'area' && (
              <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Area</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                          setAreaForm({ id: '', name: '', warehouseId: '' });
                          setEditingAreaId(null);
                          setMasterFormVisible((prev) => ({ ...prev, area: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                  </div>
                  {masterFormVisible.area && allowMasterEdit && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                        <input className="border rounded px-3 py-2" placeholder="Area ID" value={areaForm.id} onChange={(e) => setAreaForm({ ...areaForm, id: e.target.value })} />
                        <input className="border rounded px-3 py-2" placeholder="Name" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} />
                        <select className="border rounded px-3 py-2" value={areaForm.warehouseId} onChange={(e) => setAreaForm({ ...areaForm, warehouseId: e.target.value })}>
                          <option value="">Pilih Warehouse</option>
                          {masterWarehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>{wh.id} - {wh.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3 text-[11px] text-slate-500 leading-relaxed">
                        {masterFormHelperText.area}
                      </div>
                      <div className="flex gap-2 mb-4 text-xs">
                        <button onClick={handleSaveArea} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                          <Save size={14} />
                          <span>Simpan</span>
                        </button>
                        <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, area: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                          <XIcon size={14} />
                          <span>Batal</span>
                        </button>
                      </div>
                    </>
                  )}
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Warehouse</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterAreas.map((area) => (
                        <tr key={area.id} className="border-t">
                          <td className="p-2">{area.id}</td>
                          <td className="p-2">{area.name}</td>
                          <td className="p-2">{getWarehouseLabel(getAreaWarehouseId(area))}</td>
                          <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setAreaForm({ id: area.id, name: area.name, warehouseId: getAreaWarehouseId(area) }); setEditingAreaId(area.id); setMasterFormVisible((prev) => ({ ...prev, area: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/areas/${area.id}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            {orgSubTab === 'location' && (
              <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Location</div>
                    {allowMasterEdit && (
                      <button
                        onClick={() => {
                        setLocationForm({ id: '', lineDescription: '', areaId: '', warehouseId: '', category: 'Raw Material', fifoLane: '', machineNote: '' });
                          setEditingLocationId(null);
                          setMasterFormVisible((prev) => ({ ...prev, location: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                  </div>
                  {masterFormVisible.location && allowMasterEdit && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                        <input
                          className="border rounded px-3 py-2 bg-slate-50 text-slate-600"
                          placeholder="Kode Lokasi"
                          value={locationForm.id}
                          onChange={(e) => setLocationForm({ ...locationForm, id: e.target.value })}
                          required
                          readOnly
                        />
                        <select
                          className="border rounded px-3 py-2"
                          value={locationForm.lineDescription}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            const shouldEnableProcess = isProcessLocationType(nextType);
                            const defaultProcess = bomProcessOptions[0] || '';
                            const normalizedType = getStandardLocationType(nextType);
                            const prefix = normalizedType ? getLocationPrefix(normalizedType) : '';
                            const generatedId = isCreatingLocation && normalizedType
                              ? buildNextLocationId(prefix, masterLocations)
                              : '';
                            setLocationForm((prev) => ({
                              ...prev,
                              lineDescription: nextType,
                              fifoLane: shouldEnableProcess
                                ? (prev.fifoLane || defaultProcess)
                                : '',
                              machineNote: shouldEnableProcess ? prev.machineNote : '',
                              id: generatedId || prev.id,
                            }));
                          }}
                          required
                          >
                            <option value="">Pilih Tipe Lokasi</option>
                            {locationTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                      </div>
                      <div className="mb-3 text-[11px] text-slate-500 leading-relaxed">
                        {locationForm.lineDescription === 'Production Line'
                          ? masterFormHelperText.productionLine
                          : locationForm.lineDescription === 'Work Center'
                            ? masterFormHelperText.workCenter
                            : masterFormHelperText.location}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                        <select
                          className="border rounded px-3 py-2"
                          value={locationForm.areaId}
                          onChange={(e) => {
                            const nextAreaId = e.target.value;
                            const area = areaById.get(nextAreaId);
                            const areaWarehouseId = getAreaWarehouseId(area);
                            setLocationForm({ ...locationForm, areaId: nextAreaId, warehouseId: areaWarehouseId });
                          }}
                          required
                        >
                          <option value="">Pilih Area</option>
                          {masterAreas.map((area) => (
                            <option key={area.id} value={area.id}>{area.id} - {area.name}</option>
                          ))}
                        </select>
                        <input
                          className={`border rounded px-3 py-2 ${isLocationProcessEnabled ? '' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                          placeholder={isLocationProcessEnabled ? 'Process Name' : 'Process Name (Production Line / Work Center)'}
                          list={isLocationProcessEnabled ? 'bom-process-options' : undefined}
                          value={locationForm.fifoLane}
                          onChange={(e) => setLocationForm({ ...locationForm, fifoLane: e.target.value })}
                          disabled={!isLocationProcessEnabled}
                          required={isLocationProcessEnabled}
                        />
                      </div>
                      {isLocationProcessEnabled && (
                        <div className="grid grid-cols-1 gap-2 text-xs mb-3 items-stretch">
                          <input
                            className="border rounded px-3 py-2"
                            placeholder="Note / Deskripsi Mesin"
                            value={locationForm.machineNote}
                            onChange={(e) => setLocationForm({ ...locationForm, machineNote: e.target.value })}
                          />
                        </div>
                      )}
                      <div className="flex gap-2 mb-4 text-xs">
                        <button onClick={handleSaveLocation} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                          <Save size={14} />
                          <span>Simpan</span>
                        </button>
                        <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, location: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                          <XIcon size={14} />
                          <span>Batal</span>
                        </button>
                      </div>
                    </>
                  )}
                  <datalist id="bom-process-options">
                    {bomProcessOptions.map((proc, idx) => (
                      <option key={`proc-${idx}`} value={proc} />
                    ))}
                  </datalist>
                  <datalist id="master-process-type-options">
                    {processTypeOptions.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">Kode Lokasi</th>
                        <th className="text-left p-2">Tipe Lokasi</th>
                        <th className="text-left p-2">Area</th>
                        <th className="text-left p-2">Warehouse</th>
                        <th className="text-left p-2">Proses</th>
                        <th className="text-left p-2">Note / Deskripsi Mesin</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterLocations.map((loc) => {
                        const resolvedAreaId = loc.area_id
                          || loc.areaId
                          || masterAreas.find((area) => getAreaWarehouseId(area) === loc.warehouse_id)?.id
                          || '';
                        return (
                          <tr key={loc.id} className="border-t">
                            <td className="p-2">{loc.id}</td>
                            <td className="p-2">{loc.line_description || loc.lineDescription || '-'}</td>
                            <td className="p-2">{getAreaLabel(resolvedAreaId)}</td>
                            <td className="p-2">{getWarehouseLabel(loc.warehouse_id)}</td>
                            <td className="p-2">{loc.fifo_lane || '-'}</td>
                            <td className="p-2">{loc.machine_note || loc.machineNote || '-'}</td>
                            <td className="p-2">
                              {allowMasterEdit ? (
                                <div className="flex gap-2">
                                  <button onClick={() => {
                                    const rawLineDescription = loc.line_description || loc.lineDescription || '';
                                    const lineDescription = getStandardLocationType(rawLineDescription);
                                    const isProcessEnabled = isProcessLocationType(lineDescription);
                                    const defaultProcess = bomProcessOptions[0] || '';
                                    setLocationForm({
                                      id: loc.id,
                                      lineDescription,
                                      areaId: resolvedAreaId,
                                      warehouseId: loc.warehouse_id,
                                      category: loc.category,
                                      fifoLane: loc.fifo_lane || (isProcessEnabled ? defaultProcess : ''),
                                      machineNote: loc.machine_note || loc.machineNote || '',
                                    });
                                    setEditingLocationId(loc.id);
                                    setMasterFormVisible((prev) => ({ ...prev, location: true }));
                                  }} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700" title="Edit" aria-label="Edit">
                                    <Edit size={14} />
                                    <span>Edit</span>
                                  </button>
                                  <button onClick={() => handleDeleteMaster(`/api/master/locations/${loc.id}`)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700" title="Hapus" aria-label="Hapus">
                                    <Trash2 size={14} />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            {orgSubTab === 'delivery' && (
            <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Delivery Address</div>
                    {allowMasterEdit && (
                      <button
                        onClick={() => {
                          setDeliveryForm({ id: '', areaId: '', address: '' });
                          setEditingDeliveryId(null);
                          setMasterFormVisible((prev) => ({ ...prev, delivery: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                  </div>
                  {masterFormVisible.delivery && allowMasterEdit && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                        <input className="border rounded px-3 py-2" placeholder="Delivery ID" value={deliveryForm.id} onChange={(e) => setDeliveryForm({ ...deliveryForm, id: e.target.value })} />
                        <select className="border rounded px-3 py-2" value={deliveryForm.areaId} onChange={(e) => setDeliveryForm({ ...deliveryForm, areaId: e.target.value })}>
                          <option value="">Pilih Area</option>
                          {masterAreas.map((area) => (
                            <option key={area.id} value={area.id}>{area.id} - {area.name}</option>
                          ))}
                        </select>
                        <input className="border rounded px-3 py-2" placeholder="Address" value={deliveryForm.address} onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })} />
                      </div>
                      <div className="flex gap-2 mb-4 text-xs">
                        <button onClick={handleSaveDelivery} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                          <Save size={14} />
                          <span>Simpan</span>
                        </button>
                        <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, delivery: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                          <XIcon size={14} />
                          <span>Batal</span>
                        </button>
                      </div>
                    </>
                  )}
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Area</th>
                        <th className="text-left p-2">Address</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-t">
                          <td className="p-2">{delivery.id}</td>
                          <td className="p-2">{delivery.area_id}</td>
                          <td className="p-2">{delivery.address}</td>
                          <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setDeliveryForm({ id: delivery.id, areaId: delivery.area_id, address: delivery.address }); setEditingDeliveryId(delivery.id); setMasterFormVisible((prev) => ({ ...prev, delivery: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/deliveries/${delivery.id}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              </div>
              )}

              {masterRefTab === 'vendor' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Vendor</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="border rounded px-3 py-1.5 text-xs"
                      placeholder="Cari vendor..."
                      value={vendorSearch}
                      onChange={(e) => {
                        const next = e.target.value;
                        setVendorSearch(next);
                        if (typeof setMasterVendorSearch === 'function') setMasterVendorSearch(next);
                      }}
                    />
                    {allowVendorEdit && (
                      <button
                        onClick={() => {
                          setVendorForm({
                            id: '',
                            name: '',
                            type: 'Supplier',
                            role: 'Delivery Note',
                            email: '',
                            leadTimeDays: '',
                            dailyCapacityQty: '',
                            deliverySchedule: [],
                          });
                          setEditingVendorId(null);
                          setMasterFormVisible((prev) => ({ ...prev, vendor: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                  </div>
                </div>
                {masterFormVisible.vendor && allowVendorEdit && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                      <input className="border rounded px-3 py-2" placeholder="Vendor ID" value={vendorForm.id} onChange={(e) => setVendorForm({ ...vendorForm, id: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Vendor Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
                      <select className="border rounded px-3 py-2" value={vendorForm.type} onChange={(e) => setVendorForm({ ...vendorForm, type: e.target.value })}>
                        {vendorTypeOptions.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <select className="border rounded px-3 py-2" value={vendorForm.role} onChange={(e) => setVendorForm({ ...vendorForm, role: e.target.value })}>
                        <option value="Delivery Note">Delivery Note</option>
                        <option value="Schedule">Schedule</option>
                      </select>
                      <input className="border rounded px-3 py-2" placeholder="Email DN" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="border rounded px-3 py-2"
                        placeholder="Lead Time (days)"
                        value={vendorForm.leadTimeDays}
                        onChange={(e) => setVendorForm({ ...vendorForm, leadTimeDays: e.target.value })}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="border rounded px-3 py-2"
                        placeholder="Kapasitas Harian (Qty/day)"
                        value={vendorForm.dailyCapacityQty}
                        onChange={(e) => setVendorForm({ ...vendorForm, dailyCapacityQty: e.target.value })}
                      />
                      <div className="md:col-span-2 border rounded px-3 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] font-semibold text-slate-600">Delivery Schedule</div>
                            <button type="button" onClick={addVendorScheduleRow} className="px-2 py-1 text-[10px] border rounded inline-flex items-center gap-1">
                              <Plus size={12} />
                              <span>Tambah Rit</span>
                            </button>
                          </div>
                        {vendorScheduleRows.length === 0 && (
                          <div className="text-[10px] text-slate-400">Belum ada jadwal pengiriman.</div>
                        )}
                        {vendorScheduleRows.map((row, idx) => (
                          <div key={`schedule-${idx}`} className="grid grid-cols-[60px_90px_1fr_auto] gap-2 mb-2">
                            <input
                              type="number"
                              min="1"
                              className="border rounded px-2 py-1"
                              placeholder="Rit"
                              value={row.rit}
                              onChange={(e) => updateVendorScheduleRow(idx, { rit: e.target.value })}
                            />
                            <input
                              type="time"
                              className="border rounded px-2 py-1"
                              value={row.time}
                              onChange={(e) => updateVendorScheduleRow(idx, { time: e.target.value })}
                            />
                            <input
                              className="border rounded px-2 py-1"
                              placeholder="Cycle (e.g. 1-8-8)"
                              value={row.cycle}
                              onChange={(e) => updateVendorScheduleRow(idx, { cycle: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => removeVendorScheduleRow(idx)}
                              className="px-2 py-1 text-[10px] border rounded text-rose-600 inline-flex items-center gap-1"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <button onClick={handleSaveVendor} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, vendor: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Vendor ID</th>
                      <th className="text-left p-2">Vendor Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Email DN</th>
                      <th className="text-left p-2">Lead Time</th>
                      <th className="text-left p-2">Qty/Day</th>
                      <th className="text-left p-2">Schedule</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="border-t">
                        <td className="p-2">{vendor.id}</td>
                        <td className="p-2">{vendor.name}</td>
                        <td className="p-2">{vendor.type}</td>
                        <td className="p-2">{vendor.role || 'Delivery Note'}</td>
                        <td className="p-2">{vendor.email}</td>
                        <td className="p-2">{vendor.lead_time_days}</td>
                        <td className="p-2">{vendor.daily_capacity_qty ?? '-'}</td>
                        <td className="p-2">
                          {(() => {
                            const rows = buildVendorScheduleRows(vendor);
                            if (rows.length === 0) return '-';
                            return (
                              <div className="space-y-1">
                                {rows.map((row, idx) => (
                                  <div key={`${vendor.id}-sch-${idx}`}>
                                    Rit {row.rit || '-'} {row.time ? `(${row.time})` : ''}{row.cycle ? ` • ${row.cycle}` : ''}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2">
                          {allowVendorEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setVendorForm({ id: vendor.id, name: vendor.name, type: vendor.type, role: vendor.role || 'Delivery Note', email: vendor.email || '', leadTimeDays: String(vendor.lead_time_days ?? ''), dailyCapacityQty: String(vendor.daily_capacity_qty ?? ''), deliverySchedule: buildVendorScheduleRows(vendor) }); setEditingVendorId(vendor.id); setMasterFormVisible((prev) => ({ ...prev, vendor: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/vendors/${vendor.id}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {masterRefTab === 'customer' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Customer</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                        setCustomerForm({ id: '', name: '', email: '', leadTimeDays: '' });
                        setEditingCustomerId(null);
                        setMasterFormVisible((prev) => ({ ...prev, customer: true }));
                      }}
                      className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Baru</span>
                    </button>
                  )}
                </div>
                {masterFormVisible.customer && allowMasterEdit && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                      <input className="border rounded px-3 py-2" placeholder="Customer ID" value={customerForm.id} onChange={(e) => setCustomerForm({ ...customerForm, id: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Customer Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="border rounded px-3 py-2"
                        placeholder="Lead Time (days)"
                        value={customerForm.leadTimeDays}
                        onChange={(e) => setCustomerForm({ ...customerForm, leadTimeDays: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <button onClick={handleSaveCustomer} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, customer: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Customer ID</th>
                      <th className="text-left p-2">Customer Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Lead Time</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t">
                        <td className="p-2">{customer.id}</td>
                        <td className="p-2">{customer.name}</td>
                        <td className="p-2">{customer.email || '-'}</td>
                        <td className="p-2">{customer.lead_time_days}</td>
                        <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setCustomerForm({ id: customer.id, name: customer.name, email: customer.email || '', leadTimeDays: String(customer.lead_time_days ?? '') }); setEditingCustomerId(customer.id); setMasterFormVisible((prev) => ({ ...prev, customer: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/customers/${customer.id}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {masterRefTab === 'bom' && (
              <div className="bg-white rounded-xl border p-4">
                <BomManager
                  apiFetch={apiFetch}
                  allowEdit={allowMasterEdit}
                  refreshMasterData={fetchMasterReferences}
                  masterPlants={masterPlants}
                  masterAreas={masterAreas}
                  masterDeliveries={masterDeliveries}
                  masterWarehouses={masterWarehouses}
                  masterVendors={masterVendors}
                  masterCustomers={masterCustomers}
                  itemSupplierMap={itemSupplierMap}
                  itemCustomerMap={itemCustomerMap}
                  masterItems={masterItems}
                  masterCategories={masterCategories}
                  masterLocations={masterLocations}
                  masterPackings={masterPackings}
                  masterConfig={masterConfig}
                  masterModels={masterModels}
                  masterProcesses={masterProcesses}
                />
              </div>
              )}

              {masterRefTab === 'model' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Model Catalog</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                        setModelCatalogForm({ code: '', name: '' });
                        setEditingModelCode(null);
                        setModelFormVisible(true);
                      }}
                      className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Model Baru</span>
                    </button>
                  )}
                </div>
                {modelFormVisible && allowMasterEdit && (
                  <div className="space-y-3 border-b pb-3 mb-4">
                    <div className="grid gap-2 text-xs">
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Kode Model"
                        value={modelCatalogForm.code}
                        onChange={(e) => setModelCatalogForm({ ...modelCatalogForm, code: e.target.value })}
                      />
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Nama Model"
                        value={modelCatalogForm.name}
                        onChange={(e) => setModelCatalogForm({ ...modelCatalogForm, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleSaveModel} className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button type="button" onClick={() => { resetMasterForms(); setModelFormVisible(false); }} className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">Kode Model</th>
                        <th className="text-left p-2">Nama Model</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterModels.map((model) => (
                        <tr key={model.code} className="border-t">
                          <td className="p-2">{model.code}</td>
                          <td className="p-2">{model.name}</td>
                          <td className="p-2 flex gap-2 text-xs">
                            {allowMasterEdit ? (
                              <>
                                <button
                                  onClick={() => handleEditModel(model)}
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                  title="Edit"
                                  aria-label="Edit"
                                >
                                  <Edit size={14} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteModel(model.code)}
                                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                  title="Hapus"
                                  aria-label="Hapus"
                                >
                                  <Trash2 size={14} />
                                  <span>Hapus</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {masterModels.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-500">Belum ada model.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {masterRefTab === 'process' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Process Catalog</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                        setProcessCatalogForm({
                          code: '',
                          name: '',
                          processType: '',
                          appliesToLevel: 'All',
                          workCenter: '',
                          sequence: '',
                          standardTime: '',
                        });
                        setEditingProcessCode(null);
                        setProcessFormVisible(true);
                      }}
                      className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Process Baru</span>
                    </button>
                  )}
                </div>
                {processFormVisible && allowMasterEdit && (
                  <div className="space-y-3 border-b pb-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Kode Process"
                        value={processCatalogForm.code}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, code: e.target.value })}
                      />
                      <input
                        className="border rounded px-3 py-2"
                        placeholder="Nama Process"
                        value={processCatalogForm.name}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, name: e.target.value })}
                      />
                      <input
                        className="border rounded px-3 py-2"
                        list="master-process-type-options"
                        placeholder="Process Type (contoh: Subcon)"
                        value={processCatalogForm.processType}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, processType: e.target.value })}
                      />
                      <select
                        className="border rounded px-3 py-2 bg-white"
                        value={processCatalogForm.appliesToLevel}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, appliesToLevel: e.target.value })}
                      >
                        <option value="All">All</option>
                        <option value="Single">Single-Level</option>
                        <option value="Multi">Multi-Level</option>
                      </select>
                        <select
                          className="border rounded px-3 py-2 bg-white"
                          value={processCatalogForm.workCenter}
                          onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, workCenter: e.target.value })}
                          required
                        >
                          <option value="">- Pilih Work Center / Production Line -</option>
                          {processWorkCenterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        placeholder="Sequence"
                        value={processCatalogForm.sequence}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, sequence: e.target.value })}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="border rounded px-3 py-2"
                        placeholder="Standard Time (detik)"
                        value={processCatalogForm.standardTime}
                        onChange={(e) => setProcessCatalogForm({ ...processCatalogForm, standardTime: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleSaveProcess} className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button type="button" onClick={() => { resetMasterForms(); setProcessFormVisible(false); }} className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2">Kode Process</th>
                        <th className="text-left p-2">Nama Process</th>
                        <th className="text-left p-2">Tipe</th>
                        <th className="text-left p-2">Scope</th>
                        <th className="text-left p-2">Work Center</th>
                        <th className="text-right p-2">Seq</th>
                        <th className="text-right p-2">Std Time</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterProcesses.map((process) => (
                        <tr key={process.code} className="border-t">
                          <td className="p-2">{process.code}</td>
                          <td className="p-2">{process.name}</td>
                          <td className="p-2">{process.process_type || process.processType || '-'}</td>
                          <td className="p-2">{getProcessScopeLabel(process.applies_to_level || process.appliesToLevel || 'All')}</td>
                          <td className="p-2">{getProcessWorkCenterLabel(process.work_center || process.workCenter || '')}</td>
                          <td className="p-2 text-right">{process.sequence ?? 0}</td>
                          <td className="p-2 text-right">{process.standard_time ?? 0}</td>
                          <td className="p-2 flex gap-2 text-xs">
                            {allowMasterEdit ? (
                              <>
                                <button
                                  onClick={() => handleEditProcess(process)}
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                  title="Edit"
                                  aria-label="Edit"
                                >
                                  <Edit size={14} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProcess(process.code)}
                                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                  title="Hapus"
                                  aria-label="Hapus"
                                >
                                  <Trash2 size={14} />
                                  <span>Hapus</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {masterProcesses.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-500">Belum ada process.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {masterRefTab === 'category' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Category</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                        setCategoryForm({ code: '', name: '' });
                        setEditingCategoryCode(null);
                        setMasterFormVisible((prev) => ({ ...prev, category: true }));
                      }}
                      className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Baru</span>
                    </button>
                  )}
                </div>
                {masterFormVisible.category && allowMasterEdit && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                      <input className="border rounded px-3 py-2" placeholder="Code" value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <button onClick={handleSaveCategory} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, category: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterCategories.map((category) => (
                      <tr key={category.code} className="border-t">
                        <td className="p-2">{category.code}</td>
                        <td className="p-2">{category.name}</td>
                        <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setCategoryForm({ code: category.code, name: category.name }); setEditingCategoryCode(category.code); setMasterFormVisible((prev) => ({ ...prev, category: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/categories/${category.code}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {masterRefTab === 'item' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Item</div>
                  <div className="flex items-center gap-2">
                    {allowItemEdit && (
                      <button
                        onClick={() => {
                          setItemMasterForm({ code: '', name: '', partNo: '', type: 'Raw Material', unit: 'PCS', typePack: '', packQty: '', orderLotSize: '', maxDeliveryPerRit: '', shelfLifeMonths: '', isSeasonal: false, suppliers: [], customers: [], modelCodes: [], weight: '', price: '', vendorId: '', locationId: '', imageUrl: '', imageThumbUrl: '', shelfLifeDays: '' });
                          setItemModelEntry('');
                          setItemImageError('');
                          setItemImageUploading(false);
                          setMasterEditingItemCode(null);
                          setMasterFormVisible((prev) => ({ ...prev, item: true }));
                        }}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                      >
                        <Plus size={14} />
                        <span>Tambah Baru</span>
                      </button>
                    )}
                    {allowItemEdit && (
                      <button
                        onClick={() => setItemBulkOpen(true)}
                        className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                        disabled={selectedItemCodes.length === 0}
                      >
                        <Flag size={14} />
                        <span>Bulk Action</span>
                      </button>
                    )}
                    {allowItemEdit && canImportExport && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemMenuOpen((prev) => !prev);
                            setActiveMenu(null);
                          }}
                          className="px-3 py-1.5 rounded border text-xs flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700"
                          title="Template & Import/Export Item"
                        >
                          <FileSpreadsheet size={14} />
                          <span>Data XLS</span>
                          <ChevronDown size={12} />
                        </button>
                        {itemMenuOpen && (
                          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                            <button
                              type="button"
                              onClick={() => {
                                if (itemsImportRef.current) itemsImportRef.current.click();
                                setItemMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 border-b border-gray-50"
                            >
                              <FileUp size={16} className="text-green-600" />
                              Import Items (.xls/.xlsx)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleExportItemsXls();
                                setItemMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 border-b border-gray-50"
                            >
                              <Download size={16} className="text-blue-600" />
                              Export Items (.xlsx)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDownloadItemsTemplate();
                                setItemMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                            >
                              <FileSpreadsheet size={16} className="text-indigo-600" />
                              Template XLS Item
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {masterFormVisible.item && allowItemEdit && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-3 items-stretch">
                      <input className="border rounded px-3 py-2" placeholder="UNIQ" value={itemMasterForm.code} onChange={(e) => setItemMasterForm({ ...itemMasterForm, code: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Part Name" value={itemMasterForm.name} onChange={(e) => setItemMasterForm({ ...itemMasterForm, name: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Part No" value={itemMasterForm.partNo} onChange={(e) => setItemMasterForm({ ...itemMasterForm, partNo: e.target.value })} />
                      <select className="border rounded px-3 py-2" value={itemMasterForm.type} onChange={(e) => setItemMasterForm({ ...itemMasterForm, type: e.target.value })}>
                        {masterCategories.length > 0 ? masterCategories.map((category) => (
                          <option key={category.code} value={category.code}>{category.code} - {category.name}</option>
                        )) : masterCategoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <input className="border rounded px-3 py-2" placeholder="Unit" value={itemMasterForm.unit} onChange={(e) => setItemMasterForm({ ...itemMasterForm, unit: e.target.value })} />
                      <select className="border rounded px-3 py-2" value={itemMasterForm.typePack} onChange={(e) => setItemMasterForm({ ...itemMasterForm, typePack: e.target.value })}>
                        <option value="">Pilih Type Pack</option>
                        {masterPackings.map((packing) => (
                          <option key={packing.code} value={packing.code}>{packing.code} - {packing.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        placeholder="SNP / Pack Qty"
                        value={itemMasterForm.packQty || ''}
                        onChange={(e) => setItemMasterForm({ ...itemMasterForm, packQty: e.target.value })}
                      />
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        placeholder="Order Lot Size"
                        value={itemMasterForm.orderLotSize || ''}
                        onChange={(e) => setItemMasterForm({ ...itemMasterForm, orderLotSize: e.target.value })}
                      />
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        placeholder="Max Delivery / Rit"
                        value={itemMasterForm.maxDeliveryPerRit || ''}
                        onChange={(e) => setItemMasterForm({ ...itemMasterForm, maxDeliveryPerRit: e.target.value })}
                      />
                      <label className="border rounded px-3 py-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={!!itemMasterForm.isSeasonal}
                          onChange={(e) => setItemMasterForm({ ...itemMasterForm, isSeasonal: e.target.checked })}
                        />
                        Seasonal Override
                      </label>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Model / Spesifikasi</label>
                          <div className="flex flex-wrap gap-1 min-h-[32px]">
                            {itemMasterForm.modelCodes?.length ? (
                              itemMasterForm.modelCodes.map((code) => (
                              <span key={`model-chip-${code}`} className="text-[10px] flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <span>{code}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeModelCodeFromItemForm(code)}
                                    className="text-[10px] text-rose-600 hover:text-rose-700 inline-flex items-center"
                                    title="Hapus model"
                                  >
                                    <XIcon size={12} />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400">Belum ada model</span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <select
                              className="border rounded px-3 py-2 flex-1 text-xs bg-white"
                              value={itemModelEntry}
                              onChange={(e) => setItemModelEntry(e.target.value)}
                            >
                              <option value="">Pilih kode model</option>
                              {masterModels.map((model) => (
                                <option key={`item-model-opt-${model.code}`} value={model.code}>
                                  {model.code}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => addModelCodeToItemForm(itemModelEntry)}
                              className="px-3 py-2 text-[10px] rounded border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1"
                            >
                              <Plus size={12} />
                              <span>Tambah</span>
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setModelCatalogForm({ code: '', name: '' });
                                setEditingModelCode(null);
                                setModelFormVisible(true);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
                            >
                              <Plus size={12} />
                              <span>Model belum ada? Tambah di sini</span>
                            </button>
                          </div>
                          {modelFormVisible && allowMasterEdit && (
                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                              <div className="text-[11px] font-semibold text-slate-700">Tambah Model Baru</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <input
                                  className="border rounded px-3 py-2"
                                  placeholder="Kode Model"
                                  value={modelCatalogForm.code}
                                  onChange={(e) => setModelCatalogForm({ ...modelCatalogForm, code: e.target.value })}
                                />
                                <input
                                  className="border rounded px-3 py-2"
                                  placeholder="Nama Model"
                                  value={modelCatalogForm.name}
                                  onChange={(e) => setModelCatalogForm({ ...modelCatalogForm, name: e.target.value })}
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={handleQuickSaveModelForItem}
                                  className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs inline-flex items-center gap-1"
                                >
                                  <Save size={14} />
                                  <span>Simpan &amp; Pakai</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModelFormVisible(false);
                                    setModelCatalogForm({ code: '', name: '' });
                                  }}
                                  className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                                >
                                  <XIcon size={14} />
                                  <span>Batal</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        placeholder="Shelf Life (bulan)"
                        value={itemMasterForm.shelfLifeMonths || ''}
                        onChange={(e) => setItemMasterForm({ ...itemMasterForm, shelfLifeMonths: e.target.value })}
                      />
                    </div>
                    <div className="border rounded p-3 text-xs mb-4">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Gambar Item</div>
                        <button
                          type="button"
                          onClick={() => itemImageInputRef.current?.click()}
                          className="px-2 py-1 text-[10px] border rounded inline-flex items-center gap-1 disabled:opacity-60"
                          disabled={itemImageUploading || !allowItemEdit}
                        >
                          {itemImageUploading ? 'Mengunggah...' : 'Upload Gambar'}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="h-20 w-20 rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center text-[10px] text-slate-400">
                          {itemImagePreview ? (
                            <img
                              src={itemImagePreview}
                              alt="Preview Item"
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span>Belum ada</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          <div>Auto .webp, original &le; 200KB.</div>
                          <div>Thumbnail 150x150px &le; 30KB (dipakai di kanban).</div>
                          {!masterEditingItemCode && !(masterItems || []).some((item) => item.code === itemMasterForm.code) && (
                            <div className="text-amber-600">Simpan item dulu sebelum upload.</div>
                          )}
                          {itemImageError && <div className="text-rose-600">{itemImageError}</div>}
                        </div>
                      </div>
                      <input
                        ref={itemImageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleItemImageUpload}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
                      <div className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-slate-700">Suppliers</div>
                          <button
                            type="button"
                            onClick={() => setItemMasterForm({ ...itemMasterForm, suppliers: [...(itemMasterForm.suppliers || []), { vendorId: '', sharePercent: '' }] })}
                            className="px-2 py-1 text-[10px] border rounded inline-flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>Tambah Supplier</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(itemMasterForm.suppliers || []).length === 0 && (
                            <div className="text-[10px] text-slate-400">Belum ada supplier.</div>
                          )}
                          {(itemMasterForm.suppliers || []).map((row, idx) => (
                            <div key={`${row.vendorId}-${idx}`} className="grid grid-cols-[1fr_80px_24px] gap-2 items-center">
                              <select
                                className="border rounded px-2 py-1"
                                value={row.vendorId}
                                onChange={(e) => {
                                  const next = [...(itemMasterForm.suppliers || [])];
                                  next[idx] = { ...row, vendorId: e.target.value };
                                  setItemMasterForm({ ...itemMasterForm, suppliers: next });
                                }}
                              >
                                <option value="">Pilih Supplier</option>
                                {masterVendors.map((vendor) => (
                                  <option key={vendor.id} value={vendor.id}>{vendor.id}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="border rounded px-2 py-1 text-right"
                                placeholder="%"
                                value={row.sharePercent}
                                onChange={(e) => {
                                  const next = [...(itemMasterForm.suppliers || [])];
                                  next[idx] = { ...row, sharePercent: e.target.value };
                                  setItemMasterForm({ ...itemMasterForm, suppliers: next });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(itemMasterForm.suppliers || [])];
                                  next.splice(idx, 1);
                                  setItemMasterForm({ ...itemMasterForm, suppliers: next });
                                }}
                                className="text-red-500"
                                title="Hapus"
                              >
                                <XIcon size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-slate-700">Customers</div>
                          <button
                            type="button"
                            onClick={() => setItemMasterForm({ ...itemMasterForm, customers: [...(itemMasterForm.customers || []), { customerId: '', sharePercent: '' }] })}
                            className="px-2 py-1 text-[10px] border rounded inline-flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>Tambah Customer</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(itemMasterForm.customers || []).length === 0 && (
                            <div className="text-[10px] text-slate-400">Belum ada customer.</div>
                          )}
                          {(itemMasterForm.customers || []).map((row, idx) => (
                            <div key={`${row.customerId}-${idx}`} className="grid grid-cols-[1fr_80px_24px] gap-2 items-center">
                              <select
                                className="border rounded px-2 py-1"
                                value={row.customerId}
                                onChange={(e) => {
                                  const next = [...(itemMasterForm.customers || [])];
                                  next[idx] = { ...row, customerId: e.target.value };
                                  setItemMasterForm({ ...itemMasterForm, customers: next });
                                }}
                              >
                                <option value="">Pilih Customer</option>
                                {masterCustomers.map((customer) => (
                                  <option key={customer.id} value={customer.id}>{customer.id}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="border rounded px-2 py-1 text-right"
                                placeholder="%"
                                value={row.sharePercent}
                                onChange={(e) => {
                                  const next = [...(itemMasterForm.customers || [])];
                                  next[idx] = { ...row, sharePercent: e.target.value };
                                  setItemMasterForm({ ...itemMasterForm, customers: next });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(itemMasterForm.customers || [])];
                                  next.splice(idx, 1);
                                  setItemMasterForm({ ...itemMasterForm, customers: next });
                                }}
                                className="text-red-500"
                                title="Hapus"
                              >
                                <XIcon size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <button onClick={handleSaveItemMaster} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, item: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-center p-2 w-10">
                        <input
                          type="checkbox"
                          checked={filteredMasterItems.length > 0 && filteredMasterItems.every((row) => selectedItemCodes.includes(row.code))}
                          disabled={!allowItemEdit}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemCodes(filteredMasterItems.map((row) => row.code));
                            } else {
                              setSelectedItemCodes([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-2">UNIQ</th>
                      <th className="text-left p-2">Part No</th>
                      <th className="text-left p-2">Part Name</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Type Pack</th>
                      <th className="text-left p-2">SNP</th>
                      <th className="text-left p-2">Suppliers</th>
                      <th className="text-left p-2">Customers</th>
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Moving Status</th>
                      <th className="text-left p-2">Shelf Life</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                    <tr className="bg-white text-[10px] text-slate-500">
                      <th className="p-1 text-left" colSpan={14}>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                          checked={!!localItemFilters.duplicatesOnly}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, duplicatesOnly: e.target.checked })}
                          />
                          <span>Show Duplicates Only</span>
                        </label>
                      </th>
                    </tr>
                    <tr className="bg-white text-[10px] text-slate-500">
                      <th className="p-1" />
                      <th className="p-1">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          placeholder="Filter UNIQ"
                          value={localItemFilters.code}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, code: e.target.value })}
                        />
                      </th>
                      <th className="p-1">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          placeholder="Filter Part No"
                          value={localItemFilters.partNo}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, partNo: e.target.value })}
                        />
                      </th>
                      <th className="p-1">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          placeholder="Filter Name"
                          value={localItemFilters.name}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, name: e.target.value })}
                        />
                      </th>
                      <th className="p-1">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={localItemFilters.category}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, category: e.target.value })}
                        >
                          <option value="">All</option>
                          {masterCategories.length > 0 ? masterCategories.map((category) => (
                            <option key={category.code} value={category.code}>{category.code} - {category.name}</option>
                          )) : masterCategoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </th>
                      <th className="p-1">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          placeholder="Filter Unit"
                          value={localItemFilters.unit}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, unit: e.target.value })}
                        />
                      </th>
                      <th className="p-1">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={localItemFilters.typePack}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, typePack: e.target.value })}
                        >
                          <option value="">All</option>
                          {masterPackings.map((packing) => (
                            <option key={packing.code} value={packing.code}>{packing.code} - {packing.name}</option>
                          ))}
                        </select>
                      </th>
                      <th className="p-1" />
                      <th className="p-1">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={localItemFilters.supplier}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, supplier: e.target.value })}
                        >
                          <option value="">All</option>
                          {masterVendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.id}</option>
                          ))}
                        </select>
                      </th>
                      <th className="p-1">
                        <select
                          className="border rounded px-2 py-1 w-full"
                          value={localItemFilters.customer}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, customer: e.target.value })}
                        >
                          <option value="">All</option>
                          {masterCustomers.map((customer) => (
                            <option key={customer.id} value={customer.id}>{customer.id}</option>
                          ))}
                        </select>
                      </th>
                      <th className="p-1">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          placeholder="Filter Model"
                          value={localItemFilters.model}
                          onChange={(e) => setLocalItemFilters({ ...localItemFilters, model: e.target.value })}
                        />
                      </th>
                      <th className="p-1" />
                      <th className="p-1" />
                      <th className="p-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {masterItemsPaginationMeta.rows.map((item) => {
                      const codeKey = normalizeDuplicateKey(item.code);
                      const partKey = normalizeDuplicateKey(item.part_no || item.partNo);
                      const isCodeDuplicate = itemDuplicateKeySets?.code?.has(codeKey);
                      const isPartDuplicate = itemDuplicateKeySets?.partNo?.has(partKey);
                      const movingStatusValue = String(item.moving_status || item.movingStatus || '').trim().toUpperCase();
                      const movingBadgeClass = movingStatusValue === 'FAST'
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : movingStatusValue === 'SLOW'
                          ? 'border-amber-200 bg-amber-100 text-amber-700'
                          : movingStatusValue === 'DEAD'
                            ? 'border-slate-300 bg-slate-200 text-slate-700'
                            : movingStatusValue === 'SEASONAL'
                              ? 'border-orange-200 bg-orange-100 text-orange-700'
                              : 'border-slate-200 bg-slate-100 text-slate-500';
                      const movingLabel = movingStatusValue === 'FAST'
                        ? 'Fast Moving'
                        : movingStatusValue === 'SLOW'
                          ? 'Slow Moving'
                          : movingStatusValue === 'DEAD'
                            ? 'Dead Stock'
                            : movingStatusValue === 'SEASONAL'
                              ? 'Seasonal'
                              : '-';
                      return (
                        <tr key={item.code} className="border-t">
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedItemCodes.includes(item.code)}
                              disabled={!allowItemEdit}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItemCodes((prev) => Array.from(new Set([...prev, item.code])));
                                } else {
                                  setSelectedItemCodes((prev) => prev.filter((code) => code !== item.code));
                                }
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <span>{item.code}</span>
                              {isCodeDuplicate && (
                                <Flag size={12} className="text-red-500" title="Duplicate Detected" />
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <span>{item.part_no || item.partNo || '-'}</span>
                              {isPartDuplicate && (
                                <Flag size={12} className="text-red-500" title="Duplicate Detected" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 max-w-[240px] truncate">{item.name}</td>
                          <td className="p-2">{categoryNameByCode.get(item.type) || item.type || '-'}</td>
                          <td className="p-2">{item.unit}</td>
                          <td className="p-2">{packingNameByCode.get(item.type_pack) || item.type_pack || '-'}</td>
                          <td className="p-2 text-right">{item.pack_qty ?? '-'}</td>
                          <td className="p-2">{formatRelationList(itemSupplierMap.get(item.code) || [], 'vendorId', 'vendorId')}</td>
                          <td className="p-2">{formatRelationList(itemCustomerMap.get(item.code) || [], 'customerId', 'customerId')}</td>
                          <td className="p-2">
                            {formatModelCodes(masterModelsMap, item.modelCodes) || item.model || '-'}
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${movingBadgeClass}`}>
                              {movingLabel}
                            </span>
                          </td>
                          <td className="p-2">{item.shelf_life_months ?? item.shelf_life_days ?? '-'}</td>
                          <td className="p-2">
                            {allowItemEdit ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemMasterForm({
                                      code: item.code,
                                      name: item.name,
                                      partNo: item.part_no || item.partNo || '',
                                      type: item.type,
                                      unit: item.unit,
                                      typePack: item.type_pack || '',
                                      packQty: String(item.pack_qty ?? ''),
                                      orderLotSize: String(item.order_lot_size ?? ''),
                                      maxDeliveryPerRit: String(item.max_delivery_per_rit ?? ''),
                                      shelfLifeMonths: String(item.shelf_life_months ?? ''),
                                      isSeasonal: !!(item.is_seasonal || item.isSeasonal),
                                      suppliers: itemSupplierMap.get(item.code) || [],
                                      customers: itemCustomerMap.get(item.code) || [],
                                      modelCodes: parseModelCodes(item.model || ''),
                                      weight: item.weight || '',
                                      price: item.price || '',
                                      vendorId: item.vendor_id || '',
                                      locationId: item.location_id || '',
                                      imageUrl: item.image_url || '',
                                      imageThumbUrl: item.image_thumb_url || '',
                                      shelfLifeDays: String(item.shelf_life_days ?? ''),
                                    });
                                    setItemModelEntry('');
                                    setItemImageError('');
                                    setItemImageUploading(false);
                                    setMasterEditingItemCode(item.code);
                                    setMasterFormVisible((prev) => ({ ...prev, item: true }));
                                  }}
                                  className="p-2 rounded text-indigo-600 hover:bg-indigo-50"
                                  title="Edit"
                                  aria-label="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaster(`/api/master/items/${item.code}`)}
                                  className="p-2 rounded text-rose-600 hover:bg-rose-50"
                                  title="Hapus"
                                  aria-label="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-3">
                  {renderPaginationControls('masterItems', masterItemsPaginationMeta)}
                </div>
              </div>
              )}

              {masterRefTab === 'packing' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Packing</div>
                  {allowMasterEdit && (
                    <button
                      onClick={() => {
                        setPackingForm({ code: '', name: '' });
                        setEditingPackingCode(null);
                        setMasterFormVisible((prev) => ({ ...prev, packing: true }));
                      }}
                      className="px-3 py-1.5 rounded border text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah Baru</span>
                    </button>
                  )}
                </div>
                {masterFormVisible.packing && allowMasterEdit && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3 items-stretch">
                      <input className="border rounded px-3 py-2" placeholder="Code" value={packingForm.code} onChange={(e) => setPackingForm({ ...packingForm, code: e.target.value })} />
                      <input className="border rounded px-3 py-2" placeholder="Name" value={packingForm.name} onChange={(e) => setPackingForm({ ...packingForm, name: e.target.value })} />
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <button onClick={handleSavePacking} className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1">
                        <Save size={14} />
                        <span>Simpan</span>
                      </button>
                      <button onClick={() => { resetMasterForms(); setMasterFormVisible((prev) => ({ ...prev, packing: false })); }} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                    </div>
                  </>
                )}
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterPackings.map((packing) => (
                      <tr key={packing.code} className="border-t">
                        <td className="p-2">{packing.code}</td>
                        <td className="p-2">{packing.name}</td>
                        <td className="p-2">
                          {allowMasterEdit ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setPackingForm({ code: packing.code, name: packing.name }); setEditingPackingCode(packing.code); setMasterFormVisible((prev) => ({ ...prev, packing: true })); }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(`/api/master/packings/${packing.code}`)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                                title="Hapus"
                                aria-label="Hapus"
                              >
                                <Trash2 size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {masterRefTab === 'config' && (
              <div className="space-y-4">
                <div className="bg-white/90 rounded-xl border px-4">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    {[
                      { key: 'format', label: 'Format & Prefix' },
                      { key: 'fifo', label: 'FIFO Method' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setConfigSubTab(tab.key)}
                        className={`relative py-3 text-sm transition ${
                          configSubTab === tab.key
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                        {configSubTab === tab.key && (
                          <span className="absolute left-0 -bottom-[1px] h-[2px] w-full rounded-full bg-slate-900" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {configSubTab === 'format' && (
                <div className="bg-white rounded-xl border p-4">
                  <div className="text-sm font-semibold mb-3">Format & Prefix</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs items-stretch">
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">DN Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('dnFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.dnFormat} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">RN Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('rnFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.rnFormat} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">SJ Subcon Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('sjSubFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.sjSubFormat || ''} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">PRL Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('prlFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.prlFormat || ''} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">DN Status Flow (comma)</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('dnStatusFlow')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.dnStatusFlow} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">QR Text Rule</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('qrTextRule')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.qrTextRule} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">QC Status (comma)</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('qcStatus')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.qcStatus} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Hold Location</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('holdLocation')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.holdLocation} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Kanban ID Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('kanbanIdFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.kanbanIdFormat} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Request ID Format</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('requestIdFormat')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.requestIdFormat} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Location Prefix - Warehouse</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('locationPrefixWarehouse')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.locationPrefixWarehouse || ''} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Location Prefix - Production Line</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('locationPrefixProduction')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.locationPrefixProduction || ''} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Location Prefix - Work Center</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('locationPrefixWorkCenter')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <input className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.locationPrefixWorkCenter || ''} readOnly />
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">Working Days (JSON)</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('workingDays')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <textarea
                        className="border rounded px-3 py-2 w-full bg-slate-50 text-xs"
                        rows={3}
                        value={masterConfig.workingDays}
                        readOnly
                      />
                      <div className="flex-1" />
                    </div>
                  </div>
                </div>
                )}

                {configSubTab === 'fifo' && (
                <div className="bg-white rounded-xl border p-4">
                  <div className="text-sm font-semibold mb-3">FIFO Method</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs items-stretch">
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">FIFO Raw Material</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('raw')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <select className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.raw} disabled>
                        {fifoMethodOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">FIFO Indirect Material</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('indirect')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <select className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.indirect} disabled>
                        {fifoMethodOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">FIFO Consumable</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('consumable')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <select className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.consumable} disabled>
                        {fifoMethodOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                    </div>
                    <div className="border rounded p-3 space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-700">FIFO Subcon</div>
                        {allowMasterEdit && (
                          <button type="button" onClick={() => openConfigModal('subcon')} className="text-indigo-600" title="Edit"><Edit size={14} /></button>
                        )}
                      </div>
                      <select className="border rounded px-3 py-2 w-full bg-slate-50" value={masterConfig.subcon} disabled>
                        {fifoMethodOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                    </div>
                  </div>
                </div>
                )}

                {configModalKey && activeConfigModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
                    onClick={closeConfigModal}
                  >
                    <div
                      className="bg-white rounded-xl border shadow-xl w-full max-w-lg p-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-900">{activeConfigModal.label}</div>
                        <button type="button" onClick={closeConfigModal} className="text-slate-500 hover:text-slate-700">
                          <XIcon size={16} />
                        </button>
                      </div>
                      {activeConfigModal.type === 'text' && (
                        <input
                          className="border rounded px-3 py-2 w-full text-sm"
                          value={typeof configModalValue === 'string' ? configModalValue : ''}
                          onChange={(event) => setConfigModalValue(event.target.value)}
                        />
                      )}
                      {activeConfigModal.type === 'textarea' && (
                        <textarea
                          className="border rounded px-3 py-2 w-full text-sm font-mono"
                          rows={6}
                          value={typeof configModalValue === 'string' ? configModalValue : ''}
                          onChange={(event) => setConfigModalValue(event.target.value)}
                        />
                      )}
                      {activeConfigModal.type === 'select' && (
                        <select
                          className="border rounded px-3 py-2 w-full text-sm"
                          value={String(configModalValue || '')}
                          onChange={(event) => setConfigModalValue(event.target.value)}
                        >
                          {activeConfigModal.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                      {activeConfigModal.type === 'tags' && (
                        <div className="border rounded px-2 py-2 w-full text-sm flex flex-wrap gap-2 items-center">
                          {(Array.isArray(configModalValue) ? configModalValue : []).map((value) => (
                            <span key={value} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[11px]">
                              {value}
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-700"
                                onClick={() => {
                                  const next = (Array.isArray(configModalValue) ? configModalValue : []).filter((item) => item !== value);
                                  setConfigModalValue(next);
                                }}
                              >
                                <XIcon size={12} />
                              </button>
                            </span>
                          ))}
                          <input
                            className="flex-1 min-w-[120px] outline-none py-1 text-sm"
                            placeholder="Ketik lalu Enter"
                            value={configModalDraft}
                            onChange={(event) => setConfigModalDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ',') {
                                event.preventDefault();
                                const trimmed = configModalDraft.trim();
                                if (!trimmed) return;
                                const current = Array.isArray(configModalValue) ? configModalValue : [];
                                if (!current.includes(trimmed)) {
                                  setConfigModalValue([...current, trimmed]);
                                }
                                setConfigModalDraft('');
                              } else if (event.key === 'Backspace' && !configModalDraft) {
                                const current = Array.isArray(configModalValue) ? configModalValue : [];
                                if (current.length > 0) {
                                  setConfigModalValue(current.slice(0, -1));
                                }
                              }
                            }}
                            onBlur={() => {
                              const trimmed = configModalDraft.trim();
                              if (!trimmed) return;
                              const current = Array.isArray(configModalValue) ? configModalValue : [];
                              if (!current.includes(trimmed)) {
                                setConfigModalValue([...current, trimmed]);
                              }
                              setConfigModalDraft('');
                            }}
                          />
                        </div>
                      )}
                      {activeConfigModal.helper && activeConfigModal.type === 'text' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeConfigModal.helper.map((token) => (
                            <button
                              key={token}
                              type="button"
                              className="px-2 py-1 text-[10px] border rounded text-slate-600 hover:text-slate-800 hover:border-slate-300"
                              onClick={() => appendConfigToken(token)}
                            >
                              {token}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-4 text-xs">
                        <button type="button" onClick={closeConfigModal} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                          <XIcon size={14} />
                          <span>Batal</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!configModalKey) return;
                            if (configModalKey === 'qcStatus' || configModalKey === 'dnStatusFlow') {
                              await handleSaveConfig({
                                [configModalKey]: Array.isArray(configModalValue) ? configModalValue.join(',') : '',
                              });
                            } else {
                              await handleSaveConfig({
                                [configModalKey]: String(configModalValue ?? ''),
                              });
                            }
                            closeConfigModal();
                          }}
                          className="px-3 py-1.5 rounded bg-slate-900 text-white inline-flex items-center gap-1"
                        >
                          <Save size={14} />
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {itemBulkOpen && allowItemEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setItemBulkOpen(false)}>
                  <div className="bg-white rounded-xl border shadow-xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-900">Bulk Action</div>
                      <button type="button" onClick={() => setItemBulkOpen(false)} className="text-slate-500 hover:text-slate-700">
                        <XIcon size={16} />
                      </button>
                    </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-600 mb-1">Update Category</div>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={itemBulkCategory}
                            onChange={(e) => setItemBulkCategory(e.target.value)}
                          >
                            <option value="">Pilih Category</option>
                            {masterCategories.length > 0 ? masterCategories.map((category) => (
                              <option key={category.code} value={category.code}>{category.code} - {category.name}</option>
                            )) : masterCategoryOptions.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-600 mb-1">Update Type Pack</div>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={itemBulkTypePack}
                            onChange={(e) => setItemBulkTypePack(e.target.value)}
                          >
                            <option value="">Pilih Type Pack</option>
                            {masterPackings.map((packing) => (
                              <option key={packing.code} value={packing.code}>{packing.code} - {packing.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-600 mb-1">Update Supplier</div>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={itemBulkSupplier}
                            onChange={(e) => setItemBulkSupplier(e.target.value)}
                          >
                            <option value="">Pilih Supplier</option>
                            {masterVendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>{vendor.id} - {vendor.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-600 mb-1">Update Customer</div>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={itemBulkCustomer}
                            onChange={(e) => setItemBulkCustomer(e.target.value)}
                          >
                            <option value="">Pilih Customer</option>
                            {masterCustomers.map((customer) => (
                              <option key={customer.id} value={customer.id}>{customer.id} - {customer.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-600 mb-1">Update Shelf Life (hari)</div>
                          <input
                            type="number"
                            className="border rounded px-3 py-2 w-full"
                            value={itemBulkShelfLife}
                            onChange={(e) => setItemBulkShelfLife(e.target.value)}
                          />
                        </div>
                      </div>
                    <div className="flex justify-end gap-2 mt-4 text-xs">
                      <button type="button" onClick={() => setItemBulkOpen(false)} className="px-3 py-1.5 rounded border inline-flex items-center gap-1">
                        <XIcon size={14} />
                        <span>Batal</span>
                      </button>
                        <button
                          type="button"
                          disabled={itemBulkSaving}
                          onClick={async () => {
                            if (selectedItemCodes.length === 0) {
                              showToastMessage('Tidak ada item terpilih.');
                              return;
                            }
                            const updates = {};
                            if (itemBulkCategory) updates.type = itemBulkCategory;
                            if (itemBulkTypePack) updates.typePack = itemBulkTypePack;
                            if (itemBulkSupplier) updates.vendorId = itemBulkSupplier;
                            if (itemBulkCustomer) updates.customerId = itemBulkCustomer;
                            if (itemBulkShelfLife !== '') updates.shelfLifeDays = itemBulkShelfLife;
                            if (Object.keys(updates).length === 0) {
                              showToastMessage('Pilih minimal satu field untuk diupdate.');
                              return;
                            }
                            setItemBulkSaving(true);
                            try {
                              await apiFetch('/api/master/items/bulk-update', {
                                method: 'PUT',
                                body: JSON.stringify({ itemCodes: selectedItemCodes, updates }),
                              });
                              showToastMessage('Bulk update berhasil.');
                              setItemBulkOpen(false);
                              setItemBulkCategory('');
                              setItemBulkTypePack('');
                              setItemBulkSupplier('');
                              setItemBulkCustomer('');
                              setItemBulkShelfLife('');
                              setSelectedItemCodes([]);
                              await fetchMasterReferences();
                            } catch (error) {
                              showToastMessage(`Bulk update gagal: ${error.message || 'Unknown error'}`);
                            } finally {
                              setItemBulkSaving(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-70 inline-flex items-center gap-1"
                        >
                          <Save size={14} />
                          <span>{itemBulkSaving ? 'Menyimpan...' : 'Simpan'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
            )}
    </>
  );
};

export default TabMasterRef;
