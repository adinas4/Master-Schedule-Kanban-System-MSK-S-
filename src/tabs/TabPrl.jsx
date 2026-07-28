import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  Printer,
  Rocket,
  Search,
  Users,
  Upload,
} from 'lucide-react';

import ImportHistoryTable from '../components/ImportHistoryTable';
import ImportSummaryModal from '../components/ImportSummaryModal';
import TabPrlToSupplier from './TabPrlToSupplier';

const PRL_FORECAST_TIMEOUT_MS = 180000;

const TabPrl = (props) => {
  const {
    mainTab,
    apiFetch,
    currentYear,
    prlImportRef,
    prlImportHistoryError,
    prlImportHistoryLoading,
    prlImportHistoryRows,
    prlImportSummary,
    setPrlImportSummary,
    handlePrlImport,
    handlePrlPrintPdf,
    setPrlMenuOpen,
    prlMenuOpen,
    handlePrlExport,
    handlePrlTemplateDownload,
    setPrlFlowOpen,
    prlFlowOpen,
    prlFilters,
    canViewPrl,
    canPrlProcess,
    canPrlImport,
    setPrlFilters,
    masterModels,
    masterCategories,
    masterVendors,
    prlCategoryOptions,
    monthKeyByIndex,
    handlePrlPeriodChange,
    handlePrlRelease,
    prlMonthLabel,
    prlAutoDraftSummary,
    prlActiveMonthKey,
    prlActiveMonthLabel,
    prlLoading,
    prlColumns,
    prlMonthKeys,
    prlPaginationMeta,
    formatModelCodes,
    masterModelsMap,
    formatNumber0,
    packingNameByCode,
    getPrlTypePack,
    getPrlVolPerDay,
    renderPaginationControls,
    showToastMessage,
    refreshPrlImportHistory,
  } = props;

  const [modelFilterOpen, setModelFilterOpen] = useState(false);
  const [modelFilterQuery, setModelFilterQuery] = useState('');
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [categoryFilterQuery, setCategoryFilterQuery] = useState('');
  const [supplierPreviewOpen, setSupplierPreviewOpen] = useState(false);

  const filteredModelOptions = useMemo(() => {
    const keyword = modelFilterQuery.trim().toLowerCase();
    if (!keyword) return masterModels;
    return masterModels.filter((model) => (
      String(model.code || '').toLowerCase().includes(keyword)
      || String(model.name || '').toLowerCase().includes(keyword)
    ));
  }, [masterModels, modelFilterQuery]);

  const visibleModelCodes = useMemo(
    () => filteredModelOptions.map((model) => model.code),
    [filteredModelOptions],
  );
  const categoryOptions = useMemo(() => {
    if (masterCategories.length > 0) {
      return masterCategories.map((category) => ({ code: category.code, name: category.name }));
    }
    return prlCategoryOptions.map((category) => ({ code: category, name: '' }));
  }, [masterCategories, prlCategoryOptions]);
  const filteredCategoryOptions = useMemo(() => {
    const keyword = categoryFilterQuery.trim().toLowerCase();
    if (!keyword) return categoryOptions;
    return categoryOptions.filter((category) => (
      String(category.code || '').toLowerCase().includes(keyword)
      || String(category.name || '').toLowerCase().includes(keyword)
    ));
  }, [categoryOptions, categoryFilterQuery]);
  const visibleCategoryCodes = useMemo(
    () => filteredCategoryOptions.map((category) => category.code),
    [filteredCategoryOptions],
  );

  const toggleModelFilter = (code) => {
    const selected = prlFilters.model || [];
    if (selected.includes(code)) {
      setPrlFilters({ ...prlFilters, model: selected.filter((value) => value !== code) });
    } else {
      setPrlFilters({ ...prlFilters, model: [...selected, code] });
    }
  };

  const clearModelFilter = () => {
    setPrlFilters({ ...prlFilters, model: [] });
  };
  const toggleCategoryFilter = (code) => {
    const selected = prlFilters.category || [];
    if (selected.includes(code)) {
      setPrlFilters({ ...prlFilters, category: selected.filter((value) => value !== code) });
    } else {
      setPrlFilters({ ...prlFilters, category: [...selected, code] });
    }
  };
  const clearCategoryFilter = () => {
    setPrlFilters({ ...prlFilters, category: [] });
  };

  const allVisibleSelected = visibleModelCodes.length > 0
    && visibleModelCodes.every((code) => (prlFilters.model || []).includes(code));
  const allVisibleCategorySelected = visibleCategoryCodes.length > 0
    && visibleCategoryCodes.every((code) => (prlFilters.category || []).includes(code));

  const handleSelectAllVisible = () => {
    const current = prlFilters.model || [];
    if (allVisibleSelected) {
      setPrlFilters({
        ...prlFilters,
        model: current.filter((code) => !visibleModelCodes.includes(code)),
      });
      return;
    }
    const next = Array.from(new Set([...current, ...visibleModelCodes]));
    setPrlFilters({ ...prlFilters, model: next });
  };
  const handleSelectAllVisibleCategory = () => {
    const current = prlFilters.category || [];
    if (allVisibleCategorySelected) {
      setPrlFilters({
        ...prlFilters,
        category: current.filter((code) => !visibleCategoryCodes.includes(code)),
      });
      return;
    }
    const next = Array.from(new Set([...current, ...visibleCategoryCodes]));
    setPrlFilters({ ...prlFilters, category: next });
  };
  const autoDraftOnly = Boolean(prlFilters.autoDraft);
  const toggleAutoDraftFilter = () => {
    setPrlFilters({ ...prlFilters, autoDraft: !autoDraftOnly });
  };
  const supplierPreviewCacheKey = useMemo(() => {
    const year = String(prlFilters?.year || currentYear || new Date().getFullYear()).trim();
    const month = String(prlFilters?.month || prlActiveMonthKey || '').trim().toLowerCase();
    const supplierKey = String(prlFilters?.supplier || '').trim().toLowerCase() || 'all';
    if (!year || !month) return '';
    return `${year}:${month}:${supplierKey}`;
  }, [currentYear, prlActiveMonthKey, prlFilters?.month, prlFilters?.supplier, prlFilters?.year]);
  const [supplierPreviewPreparing, setSupplierPreviewPreparing] = useState(false);
  const [supplierPreviewInitialReport, setSupplierPreviewInitialReport] = useState(null);
  const supplierPreviewPrefetchRef = useRef({ key: '', requestId: 0 });

  const prefetchSupplierPreview = useCallback(async (targetCacheKey, { showPreparing = false } = {}) => {
    if (!apiFetch || !targetCacheKey) return null;
    if (supplierPreviewPrefetchRef.current.key === targetCacheKey && supplierPreviewInitialReport) {
      return supplierPreviewInitialReport;
    }
    const [year, month, supplierKey] = targetCacheKey.split(':');
    if (!year || !month) return null;
    const requestId = supplierPreviewPrefetchRef.current.requestId + 1;
    supplierPreviewPrefetchRef.current.requestId = requestId;
    if (showPreparing) setSupplierPreviewPreparing(true);
    try {
      const params = new URLSearchParams();
      params.set('year', year);
      params.set('month', month);
      if (supplierKey && supplierKey !== 'all' && prlFilters.supplier) {
        params.set('supplier', prlFilters.supplier);
      }
      const report = await apiFetch(`/api/prl/forecast-preview?${params.toString()}`, {
        timeoutMs: PRL_FORECAST_TIMEOUT_MS,
      });
      if (requestId !== supplierPreviewPrefetchRef.current.requestId) return null;
      const cachedReport = report ? { ...report, __previewCacheKey: targetCacheKey } : null;
      supplierPreviewPrefetchRef.current.key = targetCacheKey;
      setSupplierPreviewInitialReport(cachedReport);
      return cachedReport;
    } catch {
      if (requestId !== supplierPreviewPrefetchRef.current.requestId) return null;
      supplierPreviewPrefetchRef.current.key = targetCacheKey;
      setSupplierPreviewInitialReport(null);
      return null;
    } finally {
      if (showPreparing) setSupplierPreviewPreparing(false);
    }
  }, [apiFetch, prlFilters.supplier, supplierPreviewInitialReport]);

  const getMonthHeaderClass = (monthKey) => (
    monthKey === prlActiveMonthKey ? 'bg-slate-200 text-slate-900' : ''
  );
  const getMonthCellClass = (row, monthKey) => {
    const isFocusedMonth = monthKey === prlActiveMonthKey;
    if (!isFocusedMonth) return '';
    if (Number(row.suggestedQty || 0) > 0) return 'bg-amber-50 text-amber-900 font-semibold';
    return 'bg-slate-50 text-slate-900';
  };
  const getModelCodeLabel = (row) => {
    const modelLabel = formatModelCodes(masterModelsMap, row.modelCodes) || row.model || '-';
    return String(modelLabel).split(' - ')[0] || '-';
  };

  const handleOpenSupplierPreview = useCallback(async () => {
    if (supplierPreviewCacheKey && supplierPreviewInitialReport?.__previewCacheKey === supplierPreviewCacheKey) {
      setSupplierPreviewOpen(true);
      return;
    }
    setSupplierPreviewOpen(true);
  }, [supplierPreviewCacheKey, supplierPreviewInitialReport]);

  return (
    <>
            {/* PRL */}
            {mainTab === 'prl' && !canViewPrl && (
            <div className="bg-white rounded-xl border p-6 text-sm text-slate-500">
              Anda tidak memiliki akses untuk melihat PRL.
            </div>
            )}
            {mainTab === 'prl' && canViewPrl && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">PART REQUIREMENT LIST (PRL)</div>
                    <div className="text-xs text-slate-500">Daftar kebutuhan part per model dan bulan.</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={prlImportRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handlePrlImport}
                    />
                    <div className="relative">
                      <button
                        className="px-3 py-2 text-xs border rounded flex items-center gap-2 whitespace-nowrap"
                        onClick={() => setPrlMenuOpen((prev) => !prev)}
                      >
                        <FileUp size={14} /> PRL Tools <ChevronDown size={12} />
                      </button>
                      {prlMenuOpen && (
                        <div
                          className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canPrlImport && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                prlImportRef.current?.click();
                                setPrlMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Upload size={14} /> Import
                            </button>
                          )}
                          <button
                            onClick={() => { setPrlMenuOpen(false); handlePrlExport(); }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Download size={14} /> Export
                          </button>
                          {canPrlImport && (
                            <button
                              onClick={() => { setPrlMenuOpen(false); handlePrlTemplateDownload(); }}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileSpreadsheet size={14} /> Template XLS
                            </button>
                          )}
                          <button
                            onClick={() => { setPrlMenuOpen(false); handlePrlPrintPdf(); }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Printer size={14} /> Cetak
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenSupplierPreview}
                      disabled={supplierPreviewPreparing}
                      className="px-3 py-2 text-xs border rounded flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      {supplierPreviewPreparing ? 'Menyiapkan...' : '🖨️ PRL to Supplier'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPrlFlowOpen((prev) => !prev)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between"
                  >
                      Flowchart Naratif PRL &gt; Scan QR
                    <ChevronDown size={14} className={`transition-transform ${prlFlowOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {prlFlowOpen && (
                    <div className="px-4 py-3 text-xs text-slate-600 space-y-3 border-t">
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">
                        <div className="font-semibold">PRL = Kanban (Daftar Induk)</div>
                        <div className="mt-1">Ada di daftar = ada Kanban. Hapus dari daftar = hapus Kanban.</div>
                        <div>Setiap baris PRL adalah tiket Kanban yang menunggu dieksekusi, tanpa pemisahan rencana vs kartu.</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Fase 1: Perencanaan & Pemicu (Push)</div>
                        <div className="mt-1">1) PRL = Kanban: Data material di PRL langsung menjadi data kartu Kanban.</div>
                        <div>2) Pending: Item shortage masuk antrean eksekusi; user/auto-trigger menekan "Buat Kanban".</div>
                        <div>3) Requests (Open): Tiket permintaan barang diproses procurement/gudang pusat.</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Fase 2: Kedatangan & Fisik (Inbound)</div>
                        <div className="mt-1">4) DN Register: Admin input surat jalan; status berubah ke in transit/partial.</div>
                        <div>5) Receiving Notes: Validasi fisik; stok bertambah, pairing bin + kartu QR, status request closed.</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Fase 3: Konsumsi & Sirkulasi Ulang (Pull)</div>
                        <div className="mt-1">6) Pemakaian Produksi: Bin ke line side; parts diambil untuk produksi.</div>
                        <div>7) Kanban Kosong: Bin kosong menjadi sinyal order ulang.</div>
                        <div>8) Scan QR: Sistem validasi part & line; jika PRL masih ada maka auto request baru, jika PRL selesai maka catat konsumsi tanpa order ulang.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 h-9">
                    <Search size={13} className="text-slate-400" />
                    <input
                      className="w-full outline-none text-[11px]"
                      placeholder="Cari part no, deskripsi, model..."
                      value={prlFilters.search}
                      onChange={(e) => setPrlFilters({ ...prlFilters, search: e.target.value })}
                    />
                  </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setModelFilterOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 border rounded-md px-2 py-1.5 h-9 text-[11px] bg-white"
                      >
                        <div className="flex items-center gap-2 text-slate-600">
                          <Filter size={14} className="text-slate-400" />
                          <span>Model</span>
                          {(prlFilters.model?.length || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 border">
                              {prlFilters.model.length}
                            </span>
                          )}
                        </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${modelFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                      {modelFilterOpen && (
                        <div className="absolute z-20 mt-2 w-64 rounded-lg border bg-white shadow-lg">
                          <div className="p-2 border-b">
                            <input
                              className="w-full text-xs border rounded px-2 py-1"
                              placeholder="Cari model..."
                              value={modelFilterQuery}
                              onChange={(e) => setModelFilterQuery(e.target.value)}
                            />
                          </div>
                          <div className="px-2 py-2 border-b flex items-center justify-between text-[11px] text-slate-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="accent-slate-700"
                                checked={allVisibleSelected}
                                onChange={handleSelectAllVisible}
                              />
                              Select All
                            </label>
                            {(prlFilters.model?.length || 0) > 0 && (
                              <button
                                type="button"
                                onClick={clearModelFilter}
                                className="px-2 py-0.5 text-[10px] border rounded border-slate-200 bg-white hover:bg-slate-50"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                            {filteredModelOptions.length === 0 && (
                              <div className="text-[10px] text-slate-400">Tidak ada model.</div>
                            )}
                            {filteredModelOptions.map((model) => {
                              const checked = prlFilters.model?.includes(model.code);
                              return (
                                <label key={model.code} className="flex items-center gap-2 text-[11px] text-slate-700">
                                  <input
                                    type="checkbox"
                                    className="accent-slate-700"
                                    checked={checked}
                                    onChange={() => toggleModelFilter(model.code)}
                                  />
                                  <span className="truncate" title={`${model.code} - ${model.name}`}>
                                    {model.code} <span className="text-[10px] text-slate-400">- {model.name}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="p-2 border-t flex justify-end">
                            <button
                              type="button"
                              onClick={() => setModelFilterOpen(false)}
                              className="px-2 py-1 text-[11px] border rounded bg-white hover:bg-slate-50"
                            >
                              Tutup
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCategoryFilterOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 border rounded-md px-2 py-1.5 h-9 text-[11px] bg-white"
                    >
                      <div className="flex items-center gap-2 text-slate-600">
                        <Filter size={14} className="text-slate-400" />
                        <span>Category</span>
                        {(prlFilters.category?.length || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 border">
                            {prlFilters.category.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${categoryFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {categoryFilterOpen && (
                      <div className="absolute z-20 mt-2 w-64 rounded-lg border bg-white shadow-lg">
                        <div className="p-2 border-b">
                          <input
                            className="w-full text-xs border rounded px-2 py-1"
                            placeholder="Cari kategori..."
                            value={categoryFilterQuery}
                            onChange={(e) => setCategoryFilterQuery(e.target.value)}
                          />
                        </div>
                        <div className="px-2 py-2 border-b flex items-center justify-between text-[11px] text-slate-600">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="accent-slate-700"
                              checked={allVisibleCategorySelected}
                              onChange={handleSelectAllVisibleCategory}
                            />
                            Select All
                          </label>
                          {(prlFilters.category?.length || 0) > 0 && (
                            <button
                              type="button"
                              onClick={clearCategoryFilter}
                              className="px-2 py-0.5 text-[10px] border rounded border-slate-200 bg-white hover:bg-slate-50"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                          {filteredCategoryOptions.length === 0 && (
                            <div className="text-[10px] text-slate-400">Tidak ada kategori.</div>
                          )}
                          {filteredCategoryOptions.map((category) => {
                            const checked = prlFilters.category?.includes(category.code);
                            return (
                              <label key={category.code} className="flex items-center gap-2 text-[11px] text-slate-700">
                                <input
                                  type="checkbox"
                                  className="accent-slate-700"
                                  checked={checked}
                                  onChange={() => toggleCategoryFilter(category.code)}
                                />
                                <span className="truncate" title={`${category.code} ${category.name ? `- ${category.name}` : ''}`}>
                                  {category.code}
                                  {category.name && (
                                    <span className="text-[10px] text-slate-400"> - {category.name}</span>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="p-2 border-t flex justify-end">
                          <button
                            type="button"
                            onClick={() => setCategoryFilterOpen(false)}
                            className="px-2 py-1 text-[11px] border rounded bg-white hover:bg-slate-50"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                  <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 h-9">
                    <Users size={13} className="text-slate-400" />
                    <select
                      className="w-full outline-none bg-transparent text-[11px]"
                      value={prlFilters.supplier}
                      onChange={(e) => setPrlFilters({ ...prlFilters, supplier: e.target.value })}
                    >
                      <option value="">All Suppliers</option>
                      {masterVendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.id} - {vendor.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 h-9">
                    <Calendar size={13} className="text-slate-400" />
                    <input
                      type="month"
                      className="w-full outline-none bg-transparent text-[11px]"
                      value={prlFilters.month ? `${prlFilters.year}-${String(monthKeyByIndex.indexOf(prlFilters.month) + 1).padStart(2, '0')}` : ''}
                      onChange={(e) => handlePrlPeriodChange(e.target.value)}
                    />
                    {canPrlProcess && (
                      <button
                        type="button"
                        onClick={handlePrlRelease}
                        disabled={!prlFilters.month}
                        className="h-7 px-2 rounded text-[11px] font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                        title="Rilis Kanban Bulan Berjalan"
                      >
                        <Rocket size={12} />
                        {prlFilters.month ? `Rilis ${prlMonthLabel(prlFilters.month)} ${prlFilters.year}` : 'Rilis'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={toggleAutoDraftFilter}
                    className={`px-3 py-1.5 rounded-full border transition ${
                      autoDraftOnly
                        ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Auto Draft Kanban
                  </button>
                  <div className="text-slate-500">
                    Bulan fokus: <span className="font-semibold text-slate-700">{prlActiveMonthLabel}</span>
                  </div>
                  {autoDraftOnly && (
                    <div className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                      Filter aktif: hanya draft shortage Kanban
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-wide text-slate-500">ROWS VISIBLE</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900">{formatNumber0(prlPaginationMeta.total || 0)}</div>
                    <div className="text-[11px] text-slate-500">Setelah semua filter aktif</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-wide text-amber-700">AUTO DRAFT</div>
                    <div className="mt-1 text-xl font-semibold text-amber-900">{formatNumber0(prlAutoDraftSummary.rows || 0)}</div>
                    <div className="text-[11px] text-amber-700">Item shortage dari Kanban</div>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-wide text-sky-700">SUGGESTED QTY</div>
                    <div className="mt-1 text-xl font-semibold text-sky-900">{formatNumber0(prlAutoDraftSummary.suggestedQty || 0)}</div>
                    <div className="text-[11px] text-sky-700">{prlActiveMonthLabel} qty {formatNumber0(prlAutoDraftSummary.focusMonthQty || 0)}</div>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                    <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-rose-700">
                      <AlertTriangle size={12} />
                      URGENT DUE
                    </div>
                    <div className="mt-1 text-xl font-semibold text-rose-900">{formatNumber0(prlAutoDraftSummary.urgent || 0)}</div>
                    <div className="text-[11px] text-rose-700">Due date hari ini atau lewat</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border p-4 overflow-x-auto">
                {prlLoading && (
                  <div className="text-xs text-slate-500 mb-3">Memuat data PRL...</div>
                )}
                <table className="min-w-full text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      {prlColumns.map((col) => {
                        const monthEntry = prlMonthKeys.find((entry) => entry.label === col);
                        return (
                          <th
                            key={col}
                            className={`text-left p-2 whitespace-nowrap ${monthEntry ? getMonthHeaderClass(monthEntry.key) : ''}`}
                          >
                            {col}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {prlPaginationMeta.rows.map((row, idx) => (
                      <tr key={`${row.partNo}-${idx}`} className="border-t">
                        <td className="p-2 whitespace-nowrap">{prlPaginationMeta.startIndex + idx}</td>
                        <td className="p-2 whitespace-nowrap">{row.uniq}</td>
                        <td className="p-2 whitespace-nowrap">{row.partNo}</td>
                        <td className="p-2 whitespace-nowrap">
                          <div>{row.description}</div>
                        </td>
                          <td className="p-2 whitespace-nowrap">
                            {getModelCodeLabel(row)}
                          </td>
                        <td className="p-2 whitespace-nowrap">{formatNumber0(row.qtyPerKanban)}</td>
                        <td className="p-2 whitespace-nowrap">{row.uom}</td>
                        <td className="p-2 whitespace-nowrap">{row.typePackName || packingNameByCode.get(getPrlTypePack(row)) || getPrlTypePack(row) || '-'}</td>
                        <td className="p-2 whitespace-nowrap">{formatNumber0(getPrlVolPerDay(row))}</td>
                        {prlMonthKeys.map((month) => (
                          <td
                            key={`${row.uniq}-${month.key}`}
                            className={`p-2 whitespace-nowrap ${getMonthCellClass(row, month.key)}`}
                          >
                            {formatNumber0(row.months?.[month.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {prlPaginationMeta.total === 0 && (
                      <tr>
                        <td colSpan={prlColumns.length} className="p-4 text-center text-slate-400">
                          Belum ada data PRL. Silakan import file CSV.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-3">
                  {renderPaginationControls('prl', prlPaginationMeta)}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <ImportHistoryTable
                title="Riwayat Import PRL"
                subtitle="Menampilkan batch upload PRL terakhir beserta status dan error detail."
                rows={prlImportHistoryRows}
                loading={prlImportHistoryLoading}
                error={prlImportHistoryError}
                onRefresh={refreshPrlImportHistory}
                noDataMessage="Belum ada riwayat import PRL."
                columns={[
                  { key: 'created_at', label: 'Upload Time' },
                  { key: 'file_name', label: 'File Name', render: (row) => row.file_name || '-' },
                  { key: 'total_rows', label: 'Rows', className: 'text-right', render: (row) => Number(row.total_rows || 0) },
                  { key: 'status', label: 'Status' },
                  { key: 'created_by_name', label: 'User', render: (row) => row.created_by_name || '-' },
                  { key: 'error_message', label: 'Error', render: (row) => row.error_message || '-' },
                ]}
              />
            </div>
            </div>
            )}
            {prlImportSummary?.open && (
              <ImportSummaryModal
                open={Boolean(prlImportSummary?.open)}
                title="Hasil Import PRL"
                subtitle="Ringkasan eksekusi import dan baris bermasalah."
                summary={prlImportSummary}
                detailRows={Array.isArray(prlImportSummary.detailRows) ? prlImportSummary.detailRows : []}
                detailColumns={[
                  { key: 'rowNumber', label: 'Row', className: 'text-right' },
                  { key: 'uniq', label: 'UNIQ' },
                  { key: 'type', label: 'Type', render: (row) => String(row.type || '-').toUpperCase() },
                  { key: 'reason', label: 'Reason' },
                ]}
                onClose={() => setPrlImportSummary(null)}
              />
            )}
            {supplierPreviewOpen && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 print:hidden">
                <div className="flex h-[92vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">PRL to Supplier</div>
                      <div className="text-xs text-slate-500">Preview forecast supplier dari hasil BOM explosion.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSupplierPreviewOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto bg-slate-50 p-4">
                    <TabPrlToSupplier
                      apiFetch={apiFetch}
                      canViewPrl={canViewPrl}
                      currentYear={currentYear}
                      initialReport={supplierPreviewInitialReport}
                      masterModels={masterModels}
                      masterVendors={masterVendors}
                      prlFilters={prlFilters}
                      showToastMessage={showToastMessage}
                    />
                  </div>
                </div>
              </div>
            )}
    </>
  );
};

export default TabPrl;



