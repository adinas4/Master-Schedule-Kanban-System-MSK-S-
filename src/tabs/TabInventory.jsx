import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  Pause,
  Play,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const TabStockOpname = React.lazy(() => import('./TabStockOpname'));

const TabInventory = (props) => {
  const {
    apiFetch,
    mainTab,
    canManageItems,
    canUseAI,
    ensureAiConfigured,
    ensureXlsx,
    fetchSoOpenSession,
    formatRupiah,
    masterLocations = [],
    masterWarehouses = [],
    showToastMessage,
    setInventoryShowKanban,
    inventoryShowKanban,
    handleSyncInventoryFromKanban,
    inventoryItems,
    getInventoryStatusBadge,
    handleInventoryDelete,
    canDeleteRecords,
    openInventoryDetail,
    inventoryDetailOpen,
    inventoryDetailItem,
    closeInventoryDetail,
    setFifoSimActive,
    fifoSimActive,
    inventoryDetailLots,
    fifoSimStep,
    formatDateID,
    formatNumber0,
    items,
    soOpenSession,
    masterItemsByCode = new Map(),
    masterProcesses = [],
    itemSupplierMap = new Map(),
    masterVendors = [],
    openQrModal,
    qrPayload,
    qrTitle,
    showQrModal,
    setShowQrModal,
  } = props;

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPerPage, setInventoryPerPage] = useState(25);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryHealthFilter, setInventoryHealthFilter] = useState('all');
  const inventoryRowOptions = useMemo(() => [25, 50, 75], []);
  const [inventoryTab, setInventoryTab] = useState('overview');
  const [inventoryAnalyticsItem, setInventoryAnalyticsItem] = useState(null);

  const stockCardRange = getCurrentMonthRange();
  const [stockCardItem, setStockCardItem] = useState('');
  const [stockCardStart, setStockCardStart] = useState(stockCardRange.start);
  const [stockCardEnd, setStockCardEnd] = useState(stockCardRange.end);
  const [stockCardRows, setStockCardRows] = useState([]);
  const [stockCardHeader, setStockCardHeader] = useState(null);
  const [stockCardLoading, setStockCardLoading] = useState(false);
  const [stockCardError, setStockCardError] = useState('');
  const [lotItem, setLotItem] = useState('');
  const [lotBatchId, setLotBatchId] = useState('');
  const [lotBatches, setLotBatches] = useState([]);
  const [lotStart, setLotStart] = useState(stockCardRange.start);
  const [lotEnd, setLotEnd] = useState(stockCardRange.end);
  const [lotRows, setLotRows] = useState([]);
  const [lotHeader, setLotHeader] = useState(null);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotError, setLotError] = useState('');
  const [lotLabelOpen, setLotLabelOpen] = useState(false);
  const [detailBomRows, setDetailBomRows] = useState([]);
  const [detailBomLoading, setDetailBomLoading] = useState(false);
  const [detailBomError, setDetailBomError] = useState('');

  const normalizeStockCardCode = (value) => String(value || '').split(' - ')[0].trim();
  const getInventoryItemKey = (item = {}) => String(
    item.id
    || item.kanbanId
    || item.kanban_id
    || item.itemCode
    || item.item_code
    || '',
  ).trim();
  const getDetailItemCode = (item = inventoryDetailItem) => String(item?.itemCode || item?.item_code || '').trim();
  const selectedLotBatch = useMemo(() => (
    (lotBatches || []).find((batch) => String(batch.id || '') === String(lotBatchId || '')) || null
  ), [lotBatches, lotBatchId]);
  const lotLabelPayload = useMemo(() => {
    if (!lotHeader) return '';
    return JSON.stringify({
      type: 'LOT_LABEL',
      batchId: lotHeader.id || lotBatchId || '',
      lotNo: lotHeader.batch_no || '',
      itemCode: lotHeader.item_code || '',
      itemName: lotHeader.item_name || '',
      uom: lotHeader.unit || '',
      balance: Number(lotHeader.balance || 0),
      doNumber: lotHeader.do_number || '',
      arrivalDate: lotHeader.arrival_date || '',
    });
  }, [lotHeader, lotBatchId]);
  const getVendorLabel = (vendorId, fallback = '') => {
    const key = String(vendorId || '').trim();
    const vendor = (masterVendors || []).find((row) => (
      String(row.id || '').trim() === key
      || String(row.code || '').trim() === key
      || String(row.name || '').trim() === key
    ));
    const code = String(vendor?.id || vendor?.code || key || '').trim();
    const name = String(vendor?.name || fallback || '').trim();
    return [code, name].filter(Boolean).join(' - ') || fallback || '-';
  };
  const getProcessLabel = (processCode, fallback = '') => {
    const key = String(processCode || '').trim();
    const process = (masterProcesses || []).find((row) => (
      String(row.code || '').trim() === key
      || String(row.name || '').trim() === key
    ));
    const code = String(process?.code || key || '').trim();
    const name = String(process?.name || fallback || '').trim();
    return [code, name].filter(Boolean).join(' - ') || fallback || '-';
  };
  const detailMasterItem = useMemo(() => {
    const code = getDetailItemCode();
    if (!code) return null;
    return masterItemsByCode?.get?.(code) || items.find((item) => String(item.code || '').trim() === code) || null;
  }, [inventoryDetailItem, masterItemsByCode, items]);
  const detailSupplierRows = useMemo(() => {
    const code = getDetailItemCode();
    const rows = code ? (itemSupplierMap?.get?.(code) || []) : [];
    if (rows.length > 0) {
      return rows.map((row) => {
        const vendorId = row.vendorId || row.vendor_id || row.id || row.code || '';
        const vendorName = row.vendorName || row.vendor_name || row.name || '';
        return {
          label: getVendorLabel(vendorId, vendorName),
          share: row.share ?? row.percentage ?? row.ratio ?? '',
          role: row.role || row.vendorRole || row.vendor_role || '',
        };
      });
    }
    const fallbackSupplier = inventoryDetailItem?.supplierCode || inventoryDetailItem?.supplier || detailMasterItem?.vendor_id || '';
    return fallbackSupplier ? [{ label: getVendorLabel(fallbackSupplier, inventoryDetailItem?.supplierName || ''), share: '', role: '' }] : [];
  }, [detailMasterItem, inventoryDetailItem, itemSupplierMap, masterVendors]);
  const detailRoutingRows = useMemo(() => {
    const routing = Array.isArray(detailMasterItem?.process_routing) && detailMasterItem.process_routing.length > 0
      ? detailMasterItem.process_routing
      : Array.isArray(detailMasterItem?.processRouting) && detailMasterItem.processRouting.length > 0
        ? detailMasterItem.processRouting
        : Array.isArray(detailMasterItem?.process_flow) && detailMasterItem.process_flow.length > 0
          ? detailMasterItem.process_flow.map((code, index) => ({ processCode: code, sequence: index + 1 }))
          : [];
    if (routing.length > 0) {
      return routing.map((step, index) => {
        const processCode = step?.processCode || step?.process_code || step?.code || step?.process || step;
        return {
          sequence: Number(step?.sequence || step?.seq || index + 1),
          label: getProcessLabel(processCode, step?.processName || step?.name || ''),
          workCenter: step?.workCenter || step?.work_center || step?.line || '',
          cycleTime: step?.cycleTimeSeconds || step?.cycle_time_seconds || '',
          processType: step?.processType || step?.process_type || '',
        };
      }).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    }
    const lineProduction = detailMasterItem?.line_production || detailMasterItem?.lineProduction || '';
    if (lineProduction) {
      return [{
        sequence: 1,
        label: getProcessLabel(lineProduction, lineProduction),
        workCenter: lineProduction,
        cycleTime: detailMasterItem?.cycle_time_seconds || detailMasterItem?.cycleTimeSeconds || '',
        processType: '',
      }];
    }
    return [];
  }, [detailMasterItem, masterProcesses]);
  const detailRouteSummary = useMemo(() => {
    const location = inventoryDetailItem?.locationCode || inventoryDetailItem?.location || detailMasterItem?.location_id || '-';
    const route = detailRoutingRows.map((row) => row.workCenter || row.label).filter(Boolean).join(' > ');
    return route ? `${location} > ${route}` : location;
  }, [detailMasterItem, detailRoutingRows, inventoryDetailItem]);

  const fetchStockCard = async () => {
    const code = normalizeStockCardCode(stockCardItem);
    if (!code) {
      setStockCardRows([]);
      setStockCardHeader(null);
      return;
    }
    setStockCardLoading(true);
    setStockCardError('');
    try {
      const query = new URLSearchParams({
        itemCode: code,
        start: stockCardStart || '',
        end: stockCardEnd || '',
      });
      const data = await apiFetch(`/api/stock-card?${query.toString()}`);
      setStockCardHeader(data?.header || null);
      setStockCardRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (error) {
      setStockCardRows([]);
      setStockCardHeader(null);
      setStockCardError(error.message || 'Gagal memuat kartu stok.');
    } finally {
      setStockCardLoading(false);
    }
  };

  const fetchLotBatches = async (itemValue) => {
    const code = normalizeStockCardCode(itemValue);
    if (!code) {
      setLotBatches([]);
      return;
    }
    try {
      const data = await apiFetch(`/api/stock/batches/list?itemCode=${encodeURIComponent(code)}`);
      const rows = Array.isArray(data) ? data : [];
      setLotBatches(rows);
      setLotBatchId(rows[0]?.id ? String(rows[0].id) : '');
    } catch (error) {
      setLotBatches([]);
      setLotBatchId('');
    }
  };

  const fetchLotCard = async () => {
    if (!lotBatchId) {
      setLotHeader(null);
      setLotRows([]);
      return;
    }
    setLotLoading(true);
    setLotError('');
    try {
      const query = new URLSearchParams({
        batchId: lotBatchId,
        start: lotStart || '',
        end: lotEnd || '',
      });
      const data = await apiFetch(`/api/stock-card/lot?${query.toString()}`);
      setLotHeader(data?.header || null);
      setLotRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (error) {
      setLotHeader(null);
      setLotRows([]);
      setLotError(error.message || 'Gagal memuat kartu lot.');
    } finally {
      setLotLoading(false);
    }
  };

  useEffect(() => {
    if (inventoryTab !== 'stock') return;
    if (stockCardItem) {
      fetchStockCard();
    }
  }, [inventoryTab, stockCardItem, stockCardStart, stockCardEnd]);

  useEffect(() => {
    if (inventoryTab !== 'lot') return;
    setLotBatchId('');
    setLotHeader(null);
    setLotRows([]);
    fetchLotBatches(lotItem);
  }, [inventoryTab, lotItem]);

  useEffect(() => {
    if (inventoryTab !== 'lot') return;
    if (lotBatchId) {
      fetchLotCard();
    }
  }, [inventoryTab, lotBatchId, lotStart, lotEnd]);

  useEffect(() => {
    if (!lotLabelOpen) return undefined;
    document.body.classList.add('lot-label-print-active');
    return () => document.body.classList.remove('lot-label-print-active');
  }, [lotLabelOpen]);

  useEffect(() => {
    if (mainTab === 'inventory') {
      setInventoryTab('overview');
    }
  }, [mainTab]);

  useEffect(() => {
    const code = getDetailItemCode();
    if (!inventoryDetailOpen || !code) {
      setDetailBomRows([]);
      setDetailBomError('');
      return;
    }
    let cancelled = false;
    setDetailBomLoading(true);
    setDetailBomError('');
    apiFetch(`/api/bom/${encodeURIComponent(code)}`)
      .then((data) => {
        if (cancelled) return;
        setDetailBomRows(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setDetailBomRows([]);
        setDetailBomError(error.message || 'Gagal memuat BOM.');
      })
      .finally(() => {
        if (!cancelled) setDetailBomLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, inventoryDetailOpen, inventoryDetailItem]);

  const filteredInventoryItems = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const kanbanId = String(item.kanbanId || '').toLowerCase();
      const itemCode = String(item.itemCode || '').toLowerCase();
      const itemName = String(item.itemName || '').toLowerCase();
      const category = String(item.categoryCode || item.category || '').toLowerCase();
      const categoryLabel = String(item.categoryLabel || '').toLowerCase();
      const supplier = String(item.supplierCode || item.supplier || '').toLowerCase();
      const supplierName = String(item.supplierName || '').toLowerCase();
      const location = String(item.locationCode || item.location || '').toLowerCase();
      const locationName = String(item.locationName || '').toLowerCase();
      const matchesSearch = !query
        || kanbanId.includes(query)
        || itemCode.includes(query)
        || itemName.includes(query)
        || category.includes(query)
        || categoryLabel.includes(query)
        || supplier.includes(query)
        || supplierName.includes(query)
        || location.includes(query)
        || locationName.includes(query);

      if (!matchesSearch) return false;

      if (inventoryHealthFilter === 'negative') return Number(item.available || 0) < 0;
      if (inventoryHealthFilter === 'below-min') {
        const minQty = Number(item.minQty || 0);
        return minQty > 0 && Number(item.available || 0) <= minQty;
      }
      if (inventoryHealthFilter === 'reserved') return Number(item.reserved || 0) > 0;
      return true;
    });
  }, [inventoryItems, inventorySearch, inventoryHealthFilter]);

  const inventoryQuickStats = useMemo(() => {
    return filteredInventoryItems.reduce((acc, item) => {
      const onHand = Number(item.onHand || 0);
      const reserved = Number(item.reserved || 0);
      const available = Number(item.available || 0);
      const minQty = Number(item.minQty || 0);
      acc.totalOnHand += onHand;
      acc.totalReserved += reserved;
      acc.totalAvailable += available;
      if (available < 0) acc.negativeCount += 1;
      if (minQty > 0 && available <= minQty) acc.belowMinCount += 1;
      if (reserved > 0) acc.reservedCount += 1;
      return acc;
    }, {
      totalOnHand: 0,
      totalReserved: 0,
      totalAvailable: 0,
      negativeCount: 0,
      belowMinCount: 0,
      reservedCount: 0,
    });
  }, [filteredInventoryItems]);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryPerPage, inventoryHealthFilter]);

  const inventoryPaginationMeta = useMemo(() => {
    const total = filteredInventoryItems.length;
    const totalPages = Math.max(1, Math.ceil(total / inventoryPerPage));
    const safePage = Math.min(Math.max(1, inventoryPage), totalPages);
    const startIndex = total === 0 ? 0 : (safePage - 1) * inventoryPerPage + 1;
    const endIndex = Math.min(total, safePage * inventoryPerPage);
    const rows = filteredInventoryItems.slice((safePage - 1) * inventoryPerPage, safePage * inventoryPerPage);
    return {
      page: safePage,
      perPage: inventoryPerPage,
      total,
      totalPages,
      startIndex,
      endIndex,
      rows,
    };
  }, [filteredInventoryItems, inventoryPage, inventoryPerPage]);

  useEffect(() => {
    if (inventoryPaginationMeta.page !== inventoryPage) {
      setInventoryPage(inventoryPaginationMeta.page);
    }
  }, [inventoryPaginationMeta.page, inventoryPage]);

  const buildPageSequence = (current, total) => {
    const items = [];
    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    if (start > 1) {
      items.push({ type: 'page', value: 1 });
      if (start > 2) items.push({ type: 'ellipsis' });
    }
    for (let i = start; i <= end; i += 1) {
      items.push({ type: 'page', value: i });
    }
    if (end < total) {
      if (end < total - 1) items.push({ type: 'ellipsis' });
      items.push({ type: 'page', value: total });
    }
    return items;
  };

  const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));
  const buildAnalytics = (item) => {
    if (!item) return null;
    const onHand = Number(item.onHand || 0);
    const reserved = Number(item.reserved || 0);
    const available = Number(item.available || 0);
    const minQty = Number(item.minQty || 0);
    const maxQty = Number(item.maxQty || 0);
    const kanbanQty = Number(item.kanbanQty || 0);
    const noOfCards = Number(item.noOfCards || 0);
    const capacityQty = kanbanQty * noOfCards;
    const shortToMin = Math.max(minQty - available, 0);
    const shortToMax = Math.max(maxQty - available, 0);
    const excessQty = maxQty > 0 ? Math.max(available - maxQty, 0) : 0;
    const suggestedCards = kanbanQty > 0 && available <= minQty ? Math.ceil(shortToMax / kanbanQty) : 0;
    const suggestedQty = suggestedCards * kanbanQty;
    const reserveRatio = onHand > 0 ? (reserved / onHand) * 100 : (reserved > 0 ? 100 : 0);
    const stockRatio = maxQty > 0 ? (available / maxQty) * 100 : 0;
    const minRatio = minQty > 0 ? (available / minQty) * 100 : 0;
    const capacityRatio = maxQty > 0 ? (capacityQty / maxQty) * 100 : 0;
    let action = 'Stock aman';
    let actionTone = 'emerald';
    if (available < 0) {
      action = 'Available negatif';
      actionTone = 'rose';
    } else if (minQty > 0 && available <= minQty) {
      action = 'Reorder sampai max';
      actionTone = 'amber';
    } else if (excessQty > 0) {
      action = 'Over max';
      actionTone = 'sky';
    } else if (reserved > 0) {
      action = 'Ada reservasi';
      actionTone = 'amber';
    }
    const insights = [];
    if (available < 0) {
      insights.push(`Available negatif ${Math.abs(available).toLocaleString('id-ID')} ${item.uom || ''}; cek request/reserved yang belum close.`);
    }
    if (minQty > 0 && available <= minQty) {
      insights.push(`Available sudah menyentuh min. Saran order ${suggestedCards.toLocaleString('id-ID')} kartu atau ${suggestedQty.toLocaleString('id-ID')} ${item.uom || ''}.`);
    }
    if (excessQty > 0) {
      insights.push(`Available melebihi max sebesar ${excessQty.toLocaleString('id-ID')} ${item.uom || ''}; review max kanban atau stock master.`);
    }
    if (reserved > 0) {
      insights.push(`${reserved.toLocaleString('id-ID')} ${item.uom || ''} sedang reserved, pastikan request kanban lanjut sampai close.`);
    }
    if (kanbanQty <= 0) {
      insights.push('Qty per kanban belum diatur, analytics kartu dan reorder belum bisa dihitung akurat.');
    }
    if (maxQty <= 0) {
      insights.push('Max stock belum diatur, bar posisi stock belum punya pembanding.');
    }
    if (insights.length === 0) {
      insights.push('Stock berada di range min/max dan tidak ada reservasi aktif.');
    }
    return {
      onHand,
      reserved,
      available,
      minQty,
      maxQty,
      kanbanQty,
      noOfCards,
      capacityQty,
      shortToMin,
      shortToMax,
      excessQty,
      suggestedCards,
      suggestedQty,
      reserveRatio,
      stockRatio,
      minRatio,
      capacityRatio,
      action,
      actionTone,
      insights,
    };
  };
  const selectedAnalytics = useMemo(
    () => buildAnalytics(inventoryAnalyticsItem),
    [inventoryAnalyticsItem],
  );
  const renderAnalyticsBar = (label, value, helper, colorClass = 'bg-indigo-500') => (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-500">{helper}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${clampPercent(value)}%` }}
        />
      </div>
    </div>
  );

  const renderInventoryPaginationControls = (meta) => {
    const sequence = buildPageSequence(meta.page, meta.totalPages);
    return (
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            className="border rounded px-2 py-1 bg-white text-xs"
            value={meta.perPage}
            onChange={(e) => setInventoryPerPage(Number(e.target.value))}
          >
            {inventoryRowOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
            disabled={meta.page <= 1}
            className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
          >
            Previous
          </button>
          {sequence.map((item, index) => (
            item.type === 'ellipsis' ? (
              <span key={`ell-${index}`} className="px-2 text-[12px]">
                …
              </span>
            ) : (
              <button
                type="button"
                key={`page-${item.value}`}
                onClick={() => setInventoryPage(item.value)}
                className={`px-2 py-1 rounded border text-[10px] ${item.value === meta.page ? 'bg-slate-900 text-white' : 'bg-white'}`}
              >
                {item.value}
              </button>
            )
          ))}
          <button
            type="button"
            onClick={() => setInventoryPage((prev) => Math.min(meta.totalPages, prev + 1))}
            disabled={meta.page >= meta.totalPages}
            className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
          >
            Next
          </button>
        </div>
        <div>
          Showing {meta.startIndex} to {meta.endIndex} of {meta.total} entries
        </div>
      </div>
    );
  };

  return (
    <>
            {/* Inventory */}
            {mainTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white/90 rounded-xl border px-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  {[
                    { key: 'overview', label: 'Inventory Overview' },
                    { key: 'stock', label: 'Kartu Stok (Main Warehouse)' },
                    { key: 'lot', label: 'Kartu Stok per Lot' },
                    ...(canManageItems ? [{ key: 'opname', label: 'Stock Opname' }] : []),
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setInventoryTab(tab.key)}
                      className={`relative py-3 text-sm transition ${
                        inventoryTab === tab.key
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                      {inventoryTab === tab.key && (
                        <span className="absolute left-0 -bottom-[1px] h-[2px] w-full rounded-full bg-slate-900" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {inventoryTab === 'opname' && (
                <Suspense fallback={(
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Memuat Stock Opname...
                  </div>
                )}
                >
                  <TabStockOpname
                    apiFetch={apiFetch}
                    ensureXlsx={ensureXlsx}
                    formatNumber0={formatNumber0}
                    formatRupiah={formatRupiah}
                    masterLocations={masterLocations}
                    masterWarehouses={masterWarehouses}
                    soOpenSession={soOpenSession}
                    fetchSoOpenSession={fetchSoOpenSession}
                    ensureAiConfigured={ensureAiConfigured}
                    canUseAI={canUseAI}
                    showToastMessage={showToastMessage}
                  />
                </Suspense>
              )}

              {inventoryTab === 'stock' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Kartu Stok (Main Warehouse)</div>
                    <div className="text-xs text-slate-500">Riwayat transaksi per item.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 mt-4 items-end">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Item</label>
                    <input
                      className="border p-2 rounded w-full text-sm"
                      placeholder="Pilih item..."
                      list="stock-card-items"
                      value={stockCardItem}
                      onChange={(e) => setStockCardItem(e.target.value)}
                    />
                    <datalist id="stock-card-items">
                      {(items || []).map((item) => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={stockCardStart}
                      onChange={(e) => setStockCardStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={stockCardEnd}
                      onChange={(e) => setStockCardEnd(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchStockCard}
                    className="px-4 py-2 bg-slate-900 text-white rounded text-xs"
                    disabled={!stockCardItem}
                  >
                    {stockCardLoading ? 'Memuat...' : 'Load'}
                  </button>
                </div>

                {stockCardError && (
                  <div className="mt-2 text-xs text-red-600">{stockCardError}</div>
                )}

                {stockCardHeader && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
                    <div className="border rounded p-3">
                      <div className="text-[10px] uppercase text-slate-400">Part Name</div>
                      <div className="font-semibold">{stockCardHeader.name || '-'}</div>
                      <div className="text-[10px] text-slate-500">{stockCardHeader.code}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-[10px] uppercase text-slate-400">UoM</div>
                      <div className="font-semibold">{stockCardHeader.unit || '-'}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-[10px] uppercase text-slate-400">Min Stock</div>
                      <div className="font-semibold">{formatNumber0(stockCardHeader.min_qty || 0)}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-[10px] uppercase text-slate-400">Max Stock</div>
                      <div className="font-semibold">{formatNumber0(stockCardHeader.max_qty || 0)}</div>
                    </div>
                  </div>
                )}

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-xs border">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2 border">Date</th>
                        <th className="text-left p-2 border">Lot / Batch</th>
                        <th className="text-left p-2 border">Doc Ref</th>
                        <th className="text-left p-2 border">Type</th>
                        <th className="text-right p-2 border">In</th>
                        <th className="text-right p-2 border">Out</th>
                        <th className="text-right p-2 border">Balance</th>
                        <th className="text-left p-2 border">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockCardLoading && (
                        <tr><td colSpan="8" className="p-3 text-center text-slate-400">Memuat...</td></tr>
                      )}
                      {!stockCardLoading && stockCardRows.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2 border">
                            {row.date ? new Date(row.date).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="p-2 border">
                            <div className="font-semibold">{row.batch_no || (row.batch_id ? `Batch #${row.batch_id}` : '-')}</div>
                            {row.batch_no && <div className="text-[10px] text-slate-500">ID {row.batch_id || '-'}</div>}
                          </td>
                          <td className="p-2 border">{row.reference_doc || '-'}</td>
                          <td className="p-2 border">{row.transaction_type || '-'}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.qty_in || 0)}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.qty_out || 0)}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.balance || 0)}</td>
                          <td className="p-2 border">{row.username || '-'}</td>
                        </tr>
                      ))}
                      {!stockCardLoading && stockCardRows.length === 0 && (
                        <tr><td colSpan="8" className="p-3 text-center text-slate-400">Belum ada transaksi.</td></tr>
                      )}
                    </tbody>
                </table>
              </div>
            </div>
              )}

              {inventoryTab === 'lot' && (
              <div className="bg-white rounded-xl border p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Kartu Stok per Lot</div>
                    <div className="text-xs text-slate-500">Riwayat transaksi per batch/lot.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1.2fr_1fr_1fr_auto] gap-3 mt-4 items-end">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Item</label>
                    <input
                      className="border p-2 rounded w-full text-sm"
                      placeholder="Pilih item..."
                      list="stock-lot-items"
                      value={lotItem}
                      onChange={(e) => setLotItem(e.target.value)}
                    />
                    <datalist id="stock-lot-items">
                      {(items || []).map((item) => (
                        <option key={`lot-${item.code}`} value={item.code}>{item.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Batch/Lot</label>
                    <select
                      className="border p-2 rounded w-full text-sm bg-white"
                      value={lotBatchId}
                      onChange={(e) => setLotBatchId(e.target.value)}
                      disabled={!lotItem}
                    >
                      <option value="">Pilih batch...</option>
                      {lotBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_no || batch.do_number || `Batch ${batch.id}`} | Avl {formatNumber0(batch.available_qty || 0)} | Out {formatNumber0(batch.qty_out || 0)} | Last {batch.last_movement_at ? String(batch.last_movement_at).slice(0, 10) : '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={lotStart}
                      onChange={(e) => setLotStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full text-sm"
                      value={lotEnd}
                      onChange={(e) => setLotEnd(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchLotCard}
                    className="px-4 py-2 bg-slate-900 text-white rounded text-xs"
                    disabled={!lotBatchId}
                  >
                    {lotLoading ? 'Memuat...' : 'Load'}
                  </button>
                </div>

                {lotError && (
                  <div className="mt-2 text-xs text-red-600">{lotError}</div>
                )}

                {lotHeader && (
                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Lot Aktif dari Receiving</div>
                        <div className="text-[10px] text-slate-500">Gunakan label ini untuk ditempel ke barang fisik agar lot aktual sama dengan sistem.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLotLabelOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Printer size={14} /> Label Lot/Part
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-4">
                      <div className="border rounded p-3">
                        <div className="text-[10px] uppercase text-slate-400">Batch No</div>
                        <div className="font-semibold">{lotHeader.batch_no || '-'}</div>
                        <div className="text-[10px] text-slate-500">{lotHeader.item_code}</div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="text-[10px] uppercase text-slate-400">Item</div>
                        <div className="font-semibold">{lotHeader.item_name || '-'}</div>
                        <div className="text-[10px] text-slate-500">{lotHeader.unit || '-'}</div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="text-[10px] uppercase text-slate-400">Arrival / DO</div>
                        <div className="font-semibold">{lotHeader.arrival_date || '-'}</div>
                        <div className="text-[10px] text-slate-500">{lotHeader.do_number || '-'}</div>
                      </div>
                      <div className="border rounded p-3">
                        <div className="text-[10px] uppercase text-slate-400">Balance</div>
                        <div className="font-semibold">{formatNumber0(lotHeader.balance || 0)}</div>
                        <div className="text-[10px] text-slate-500">In {formatNumber0(lotHeader.qty_in || 0)} | Out {formatNumber0(lotHeader.qty_out || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2 border">Date</th>
                        <th className="text-left p-2 border">Reason</th>
                        <th className="text-right p-2 border">In</th>
                        <th className="text-right p-2 border">Out</th>
                        <th className="text-right p-2 border">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotLoading && (
                        <tr><td colSpan="5" className="p-3 text-center text-slate-400">Memuat...</td></tr>
                      )}
                      {!lotLoading && lotRows.length === 0 && (
                        <tr><td colSpan="5" className="p-3 text-center text-slate-400">Belum ada transaksi.</td></tr>
                      )}
                      {!lotLoading && lotRows.map((row) => (
                        <tr key={`lot-${row.id}`} className="border-t">
                          <td className="p-2 border">{row.date ? new Date(row.date).toLocaleString('id-ID') : '-'}</td>
                          <td className="p-2 border">{row.reason || row.direction || '-'}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.qty_in || 0)}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.qty_out || 0)}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.balance || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {inventoryTab === 'overview' && (
              <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold text-slate-900">Inventory Overview</div>
                  <div className="text-xs text-slate-500">Snapshot of on-hand, reserved, available, and kanban thresholds.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 border rounded px-3 py-2 bg-white text-xs">
                    <Search size={14} className="text-slate-400" />
                    <input
                      className="outline-none text-xs w-56"
                      placeholder="Cari kanban, item, supplier..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setInventoryShowKanban((prev) => !prev)}
                    className="px-3 py-2 rounded text-sm border border-slate-200 text-slate-600 bg-white flex items-center gap-2"
                  >
                    {inventoryShowKanban ? <EyeOff size={14} /> : <Eye size={14} />}
                    {inventoryShowKanban ? 'Sembunyikan Kanban' : 'Tampilkan Kanban'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncInventoryFromKanban}
                    className="px-3 py-2 rounded text-sm bg-indigo-600 text-white w-fit"
                  >
                    <RefreshCw size={14} className="inline-block mr-1" /> Sync dari Kanban
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">On Hand</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{Number(inventoryQuickStats.totalOnHand || 0).toLocaleString('id-ID')}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{filteredInventoryItems.length} item tampil</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-amber-700">Reserved</div>
                  <div className="mt-1 text-xl font-bold text-amber-700">{Number(inventoryQuickStats.totalReserved || 0).toLocaleString('id-ID')}</div>
                  <div className="mt-1 text-[11px] text-amber-700">{inventoryQuickStats.reservedCount} item punya reservasi</div>
                </div>
                <div className={`rounded-xl border p-4 ${inventoryQuickStats.totalAvailable < 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className={`text-[11px] uppercase tracking-wide ${inventoryQuickStats.totalAvailable < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>Available</div>
                  <div className={`mt-1 text-xl font-bold ${inventoryQuickStats.totalAvailable < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {Number(inventoryQuickStats.totalAvailable || 0).toLocaleString('id-ID')}
                  </div>
                  <div className={`mt-1 text-[11px] ${inventoryQuickStats.totalAvailable < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {inventoryQuickStats.negativeCount > 0 ? `${inventoryQuickStats.negativeCount} item negatif` : 'Tidak ada available negatif'}
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-red-700">Below Min</div>
                  <div className="mt-1 text-xl font-bold text-red-700">{Number(inventoryQuickStats.belowMinCount || 0).toLocaleString('id-ID')}</div>
                  <div className="mt-1 text-[11px] text-red-700">Available di bawah threshold min</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'negative', label: 'Negative Available' },
                  { key: 'below-min', label: 'Below Min' },
                  { key: 'reserved', label: 'Ada Reserved' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setInventoryHealthFilter(filter.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      inventoryHealthFilter === filter.key
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
                <div className="text-xs text-slate-500">
                  Filter aktif: <span className="font-semibold text-slate-700">{inventoryHealthFilter === 'all' ? 'Semua Item' : inventoryHealthFilter === 'negative' ? 'Negative Available' : inventoryHealthFilter === 'below-min' ? 'Below Min' : 'Ada Reserved'}</span>
                </div>
              </div>

              {inventoryShowKanban && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {inventoryPaginationMeta.rows.map((item) => (
                    <div
                      key={getInventoryItemKey(item)}
                      className={`bg-white rounded-xl border p-4 shadow-sm ${
                        item.status === 'Minus' ? 'border-rose-200 bg-rose-50' : item.status === 'Critical' ? 'border-red-200 bg-red-50' : ''
                      }`}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{item.kanbanId}</div>
                        <div className="text-xs text-slate-500">{item.itemCode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getInventoryStatusBadge(item.status)}`}>{item.status}</span>
                        {canDeleteRecords && (
                          <button onClick={() => handleInventoryDelete(getInventoryItemKey(item))} className="text-red-600 hover:text-red-700" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                      <div className="mt-3">
                        <div className="font-medium text-sm">{item.itemName}</div>
                        <div className="text-xs text-slate-500">{item.categoryCode || item.category || '-'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <div className="text-xs text-slate-500">Location</div>
                          <div className="font-medium">{item.locationCode || item.location || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">On Hand</div>
                          <div className={`font-medium ${item.available <= item.minQty ? 'text-red-600' : 'text-emerald-600'}`}>
                            {item.onHand} {item.uom}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Reserved</div>
                          <div className={`font-medium ${item.reserved > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {Number(item.reserved || 0).toLocaleString('id-ID')} {item.uom}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Available</div>
                          <div className={`font-medium ${item.available < 0 ? 'text-rose-600' : item.available <= item.minQty ? 'text-red-600' : 'text-emerald-600'}`}>
                            {Number(item.available || 0).toLocaleString('id-ID')} {item.uom}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Min/Max</div>
                          <div className="font-medium">{item.minQty} / {item.maxQty}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Cards</div>
                          <div className="font-medium">{item.noOfCards} x {item.kanbanQty}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <div className="text-xs text-slate-500">
                          <div>Supplier: {item.supplierCode || item.supplier || '-'}</div>
                          <div>Lead Time: {item.leadTime} days</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openInventoryDetail(item)}
                            className="px-2 py-1 border rounded text-xs text-slate-600"
                            title="Detail Item"
                          >
                            <FileText size={12} className="inline-block mr-1" /> Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => openQrModal?.(item)}
                            className="p-2 border rounded text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            title="Tampilkan QR Kanban"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInventoryAnalyticsItem(item)}
                            className="p-2 border rounded text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            title="Analytics"
                          >
                            <BarChart3 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {inventoryPaginationMeta.total === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400 lg:col-span-2 xl:col-span-3">
                      Data tidak ditemukan.
                    </div>
                  )}
                </div>
              </>
              )}

              <div className="bg-white rounded-xl border p-4 overflow-x-auto">
                <table className="min-w-full text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left p-2">Kanban ID</th>
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Location</th>
                      <th className="text-left p-2">On Hand</th>
                      <th className="text-left p-2">Reserved</th>
                      <th className="text-left p-2">Available</th>
                      <th className="text-left p-2">Min/Max</th>
                      <th className="text-left p-2">Cards</th>
                      <th className="text-left p-2">Supplier</th>
                      <th className="text-left p-2">Lead Time</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryPaginationMeta.rows.map((item) => (
                      <tr key={getInventoryItemKey(item)} className="border-t">
                        <td className="p-2 font-medium">{item.kanbanId}</td>
                        <td className="p-2">
                          <div className="font-medium">{item.itemCode}</div>
                          <div className="text-[10px] text-slate-500">{item.itemName}</div>
                        </td>
                        <td className="p-2">{item.categoryCode || item.category || '-'}</td>
                        <td className="p-2">{item.locationCode || item.location || '-'}</td>
                        <td className="p-2">
                          <span className={`${item.available <= item.minQty ? 'text-red-600' : 'text-emerald-600'} font-semibold`}>
                            {Number(item.onHand || 0).toLocaleString('id-ID')} {item.uom}
                          </span>
                        </td>
                        <td className="p-2 text-amber-700 font-semibold">{Number(item.reserved || 0).toLocaleString('id-ID')} {item.uom}</td>
                        <td className="p-2">
                          <span className={`${item.available < 0 ? 'text-rose-600' : item.available <= item.minQty ? 'text-red-600' : 'text-emerald-600'} font-semibold`}>
                            {Number(item.available || 0).toLocaleString('id-ID')} {item.uom}
                          </span>
                        </td>
                        <td className="p-2">{item.minQty} / {item.maxQty}</td>
                        <td className="p-2">{item.noOfCards} x {item.kanbanQty}</td>
                        <td className="p-2">{item.supplierCode || item.supplier || '-'}</td>
                        <td className="p-2">{item.leadTime} days</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${getInventoryStatusBadge(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openInventoryDetail(item)}
                              className="text-indigo-600 hover:text-indigo-700"
                              title="Detail Item"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openQrModal?.(item)}
                              className="text-slate-600 hover:text-indigo-700"
                              title="Tampilkan QR Kanban"
                            >
                              <QrCode size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInventoryAnalyticsItem(item)}
                              className="text-slate-600 hover:text-indigo-700"
                              title="Analytics"
                            >
                              <BarChart3 size={14} />
                            </button>
                            {canDeleteRecords && (
                              <button onClick={() => handleInventoryDelete(getInventoryItemKey(item))} className="text-red-600 hover:text-red-700" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {inventoryPaginationMeta.total === 0 && (
                      <tr>
                        <td colSpan={13} className="p-4 text-center text-slate-400">
                          Data tidak ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {renderInventoryPaginationControls(inventoryPaginationMeta)}
              </div>
              </>
              )}

              {inventoryDetailOpen && inventoryDetailItem && (
                <div className="fixed inset-0 z-40 bg-black/40 flex justify-end" onClick={closeInventoryDetail}>
                  <div
                    className="bg-white w-full max-w-xl h-full p-6 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-slate-500">Detail Item Lokasi</div>
                        <div className="text-lg font-semibold text-slate-900">{inventoryDetailItem.kanbanId}</div>
                        <div className="text-xs text-slate-500">{inventoryDetailItem.itemName}</div>
                      </div>
                      <button onClick={closeInventoryDetail} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">Location</div>
                        <div className="font-semibold">{inventoryDetailItem.locationCode || inventoryDetailItem.location || '-'}</div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">On Hand</div>
                        <div className="font-semibold">{Number(inventoryDetailItem.onHand || 0).toLocaleString('id-ID')} {inventoryDetailItem.uom}</div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">Reserved</div>
                        <div className="font-semibold text-amber-700">{Number(inventoryDetailItem.reserved || 0).toLocaleString('id-ID')} {inventoryDetailItem.uom}</div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">Available</div>
                        <div className={`font-semibold ${inventoryDetailItem.available < 0 ? 'text-rose-700' : inventoryDetailItem.available <= inventoryDetailItem.minQty ? 'text-red-700' : 'text-emerald-700'}`}>
                          {Number(inventoryDetailItem.available || 0).toLocaleString('id-ID')} {inventoryDetailItem.uom}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">Min / Max</div>
                        <div className="font-semibold">{inventoryDetailItem.minQty} / {inventoryDetailItem.maxQty}</div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-slate-500">Supplier</div>
                        <div className="font-semibold">{inventoryDetailItem.supplierCode || inventoryDetailItem.supplier || '-'}</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4">
                      <div className="text-sm font-semibold text-slate-900">Rute Material</div>
                      <div className="mt-1 text-xs text-slate-500">{detailRouteSummary || '-'}</div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[10px] uppercase text-slate-400">Item</div>
                          <div className="font-semibold text-slate-800">{getDetailItemCode()} - {detailMasterItem?.name || inventoryDetailItem.itemName || '-'}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[10px] uppercase text-slate-400">Line / Location Master</div>
                          <div className="font-semibold text-slate-800">
                            {[detailMasterItem?.line_production || detailMasterItem?.lineProduction, detailMasterItem?.location_id || inventoryDetailItem.locationCode || inventoryDetailItem.location]
                              .filter(Boolean)
                              .join(' / ') || '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Supplier / Proses</div>
                          <div className="text-xs text-slate-500">Sumber master referensi item.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openQrModal?.(inventoryDetailItem)}
                          className="rounded border px-3 py-2 text-xs font-semibold text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
                          title="Tampilkan QR Kanban"
                        >
                          <QrCode size={12} className="mr-1 inline-block" /> QR
                        </button>
                      </div>

                      <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">Supplier</div>
                        {detailSupplierRows.length === 0 ? (
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">Supplier belum terhubung di master item.</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {detailSupplierRows.map((supplier, index) => (
                              <div key={`detail-supplier-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                <div className="font-semibold text-slate-800">{supplier.label}</div>
                                {(supplier.share || supplier.role) && (
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    {[supplier.share ? `Share ${supplier.share}%` : '', supplier.role].filter(Boolean).join(' | ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">Routing Proses</div>
                        {detailRoutingRows.length === 0 ? (
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">Routing proses belum diisi di master item.</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {detailRoutingRows.map((route) => (
                              <div key={`detail-route-${route.sequence}-${route.label}`} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-slate-600">{route.sequence}</div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800">{route.label}</div>
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    {[route.workCenter, route.processType, route.cycleTime ? `${route.cycleTime}s` : ''].filter(Boolean).join(' | ') || '-'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">BOM</div>
                          <div className="text-xs text-slate-500">Komponen untuk item ini sebagai parent BOM.</div>
                        </div>
                        <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {detailBomRows.length} line
                        </div>
                      </div>
                      {detailBomLoading && (
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Memuat BOM...</div>
                      )}
                      {!detailBomLoading && detailBomError && (
                        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{detailBomError}</div>
                      )}
                      {!detailBomLoading && !detailBomError && detailBomRows.length === 0 && (
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">Belum ada struktur BOM untuk item ini.</div>
                      )}
                      {!detailBomLoading && !detailBomError && detailBomRows.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {detailBomRows.slice(0, 6).map((row) => (
                            <div key={`detail-bom-${row.id}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800">{row.child_code} - {row.child_name || row.component_description || '-'}</div>
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    {[row.component_type || row.child_type, row.process_code ? `Process ${row.process_code}` : '', row.position_code ? `Pos ${row.position_code}` : ''].filter(Boolean).join(' | ') || '-'}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right font-semibold text-slate-700">
                                  {Number(row.quantity || 0).toLocaleString('id-ID')} {row.child_unit || ''}
                                </div>
                              </div>
                            </div>
                          ))}
                          {detailBomRows.length > 6 && (
                            <div className="text-[10px] text-slate-400">+{detailBomRows.length - 6} line BOM lainnya.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Simulasi FIFO</div>
                          <div className="text-xs text-slate-500">Urutan batch keluar berdasarkan kedatangan.</div>
                        </div>
                        <button
                          onClick={() => setFifoSimActive((prev) => !prev)}
                          className={`px-3 py-2 rounded text-xs font-semibold border ${fifoSimActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200'}`}
                          disabled={!inventoryDetailLots.length}
                        >
                          {fifoSimActive ? <Pause size={12} className="inline-block mr-1" /> : <Play size={12} className="inline-block mr-1" />}
                          {fifoSimActive ? 'Stop' : 'Simulasi FIFO'}
                        </button>
                      </div>

                      {!inventoryDetailLots.length && (
                        <div className="mt-3 text-xs text-slate-400">Belum ada lot FIFO untuk item ini.</div>
                      )}

                      {inventoryDetailLots.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {inventoryDetailLots.map((lot, index) => (
                            <div
                              key={lot.id}
                              className={`border rounded-lg p-3 flex items-center justify-between transition ${
                                fifoSimActive && index === fifoSimStep ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="text-xs text-slate-500">Batch #{lot.fifoSequence}</div>
                                <div className="text-sm font-semibold">{lot.lotNumber}</div>
                                <div className="text-xs text-slate-500">Masuk: {formatDateID(lot.receivedDate)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-slate-500">Sisa</div>
                                <div className="text-sm font-semibold">{formatNumber0(lot.remainingQty)}</div>
                                <div className="text-[10px] text-slate-400">{lot.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {lotLabelOpen && lotHeader && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 lot-label-print-scope"
                  onClick={() => setLotLabelOpen(false)}
                >
                  <div
                    className="w-full max-w-xl rounded-xl bg-white shadow-2xl lot-label-print-shell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b p-4 lot-label-print-hidden">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Label Lot / Part</div>
                        <div className="text-xs text-slate-500">Cetak dan tempel pada barang aktual setelah receiving.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <Printer size={14} /> Print
                        </button>
                        <button
                          type="button"
                          onClick={() => setLotLabelOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Tutup"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 lot-label-print-wrap">
                      <div className="mx-auto rounded-lg border-2 border-slate-900 bg-white p-4 text-slate-900 lot-label-card">
                        <div className="mb-3 flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-2">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">MRP - Lot / Part Label</div>
                            <div className="mt-1 text-lg font-black leading-tight">{lotHeader.item_code || '-'}</div>
                            <div className="text-xs font-semibold leading-tight">{lotHeader.item_name || '-'}</div>
                          </div>
                          <div className="shrink-0 rounded border border-slate-300 bg-white p-1">
                            <QRCodeCanvas value={lotLabelPayload || '-'} size={92} includeMargin={false} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Lot / Batch No</div>
                            <div className="break-all text-sm font-bold">{lotHeader.batch_no || `BATCH-${lotHeader.id || lotBatchId}`}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Qty Sisa Label</div>
                            <div className="text-sm font-bold">{formatNumber0(lotHeader.balance || 0)} {lotHeader.unit || ''}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Qty Terima</div>
                            <div className="font-bold">{formatNumber0(lotHeader.qty_in || 0)} {lotHeader.unit || ''}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Qty Keluar Sistem</div>
                            <div className="font-bold">{formatNumber0(lotHeader.qty_out || 0)} {lotHeader.unit || ''}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Tanggal Terima</div>
                            <div className="font-bold">{lotHeader.arrival_date || '-'}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">DO / Referensi</div>
                            <div className="break-all font-bold">{lotHeader.do_number || '-'}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Produksi / Expired</div>
                            <div className="font-bold">{lotHeader.production_date || '-'} / {lotHeader.expired_date || '-'}</div>
                          </div>
                          <div className="rounded border border-slate-300 p-2">
                            <div className="text-[9px] font-semibold uppercase text-slate-500">Movement</div>
                            <div className="font-bold">{formatNumber0(selectedLotBatch?.movement_count || lotRows.length || 0)} transaksi</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-300 pt-3 text-[10px]">
                          <div>
                            <div className="font-semibold uppercase text-slate-500">Ditempel Oleh</div>
                            <div className="mt-7 border-t border-slate-400 pt-1">Nama / Tanggal</div>
                          </div>
                          <div>
                            <div className="font-semibold uppercase text-slate-500">Dicek Oleh</div>
                            <div className="mt-7 border-t border-slate-400 pt-1">Nama / Tanggal</div>
                          </div>
                        </div>

                        <div className="mt-2 text-[9px] text-slate-500">
                          Scan QR label ini saat cek fisik/opname untuk memastikan item dan lot aktual sama dengan data sistem.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowQrModal?.(false)}>
                  <div
                    className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">QR Kanban ID</div>
                        <div className="text-xs text-slate-500">{qrTitle || 'Kanban Item'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQrModal?.(false)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Tutup"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5">
                      <QRCodeCanvas value={qrPayload || '-'} size={180} />
                      <div className="break-all text-center text-xs font-semibold text-slate-700">{qrPayload || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              {inventoryAnalyticsItem && selectedAnalytics && (
                <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setInventoryAnalyticsItem(null)}>
                  <div
                    className="bg-white w-full max-w-xl h-full p-6 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="text-sm text-slate-500">Kanban Analytics</div>
                        <div className="text-xl font-bold text-slate-900">{inventoryAnalyticsItem.kanbanId}</div>
                        <div className="text-xs text-slate-500">{inventoryAnalyticsItem.itemCode} - {inventoryAnalyticsItem.itemName || '-'}</div>
                      </div>
                      <button onClick={() => setInventoryAnalyticsItem(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getInventoryStatusBadge(inventoryAnalyticsItem.status)}`}>
                        {inventoryAnalyticsItem.status}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        selectedAnalytics.actionTone === 'rose'
                          ? 'bg-rose-100 text-rose-700'
                          : selectedAnalytics.actionTone === 'amber'
                            ? 'bg-amber-100 text-amber-700'
                            : selectedAnalytics.actionTone === 'sky'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {selectedAnalytics.action}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] uppercase text-slate-400">On Hand</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                          {selectedAnalytics.onHand.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}
                        </div>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="text-[10px] uppercase text-amber-700">Reserved</div>
                        <div className="mt-1 text-lg font-bold text-amber-700">
                          {selectedAnalytics.reserved.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}
                        </div>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-[10px] uppercase text-emerald-700">Available</div>
                        <div className="mt-1 text-lg font-bold text-emerald-700">
                          {selectedAnalytics.available.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] uppercase text-slate-400">Min / Max</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">
                          {selectedAnalytics.minQty.toLocaleString('id-ID')} / {selectedAnalytics.maxQty.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Stock Posture</div>
                          <div className="text-xs text-slate-500">Perbandingan available, reserve, dan kapasitas kanban.</div>
                        </div>
                        <BarChart3 size={18} className="text-indigo-500" />
                      </div>
                      <div className="space-y-4">
                        {renderAnalyticsBar(
                          'Available vs Max',
                          selectedAnalytics.stockRatio,
                          `${Math.round(selectedAnalytics.stockRatio).toLocaleString('id-ID')}%`,
                          selectedAnalytics.excessQty > 0 ? 'bg-sky-500' : selectedAnalytics.available <= selectedAnalytics.minQty ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        {renderAnalyticsBar(
                          'Available vs Min',
                          selectedAnalytics.minRatio,
                          `${Math.round(selectedAnalytics.minRatio).toLocaleString('id-ID')}%`,
                          selectedAnalytics.available <= selectedAnalytics.minQty ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        {renderAnalyticsBar(
                          'Reserved Ratio',
                          selectedAnalytics.reserveRatio,
                          `${Math.round(selectedAnalytics.reserveRatio).toLocaleString('id-ID')}%`,
                          'bg-amber-500',
                        )}
                        {renderAnalyticsBar(
                          'Kanban Capacity vs Max',
                          selectedAnalytics.capacityRatio,
                          `${selectedAnalytics.noOfCards.toLocaleString('id-ID')} x ${selectedAnalytics.kanbanQty.toLocaleString('id-ID')}`,
                          'bg-indigo-500',
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Short to Min</div>
                        <div className="font-semibold text-slate-900">{selectedAnalytics.shortToMin.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Short to Max</div>
                        <div className="font-semibold text-slate-900">{selectedAnalytics.shortToMax.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Suggested Cards</div>
                        <div className="font-semibold text-slate-900">{selectedAnalytics.suggestedCards.toLocaleString('id-ID')} kartu</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Suggested Qty</div>
                        <div className="font-semibold text-slate-900">{selectedAnalytics.suggestedQty.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Kanban Capacity</div>
                        <div className="font-semibold text-slate-900">{selectedAnalytics.capacityQty.toLocaleString('id-ID')} {inventoryAnalyticsItem.uom}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500">Lead Time</div>
                        <div className="font-semibold text-slate-900">{Number(inventoryAnalyticsItem.leadTime || 0).toLocaleString('id-ID')} hari</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4">
                      <div className="text-sm font-semibold text-slate-900">Insight</div>
                      <div className="mt-3 space-y-2">
                        {selectedAnalytics.insights.map((insight, index) => (
                          <div key={`inventory-insight-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border p-4 text-xs text-slate-600">
                      <div className="font-semibold text-slate-900">Referensi</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>Supplier: <span className="font-semibold">{inventoryAnalyticsItem.supplierCode || inventoryAnalyticsItem.supplier || '-'}</span></div>
                        <div>Location: <span className="font-semibold">{inventoryAnalyticsItem.locationCode || inventoryAnalyticsItem.location || '-'}</span></div>
                        <div>Category: <span className="font-semibold">{inventoryAnalyticsItem.categoryCode || inventoryAnalyticsItem.category || '-'}</span></div>
                        <div>Cards: <span className="font-semibold">{selectedAnalytics.noOfCards.toLocaleString('id-ID')} kartu</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
    </>
  );
};

export default TabInventory;
