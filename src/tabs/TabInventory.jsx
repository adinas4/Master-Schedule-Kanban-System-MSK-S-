import React, { useEffect, useMemo, useState, Suspense } from 'react';
import {
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  Pause,
  Play,
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
    renderPaginationControls,
    kanbanPaginationMeta,
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

  const normalizeStockCardCode = (value) => String(value || '').split(' - ')[0].trim();

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
      setLotBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      setLotBatches([]);
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
    if (mainTab === 'inventory') {
      setInventoryTab('overview');
    }
  }, [mainTab]);

  const filteredInventoryItems = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const kanbanId = String(item.kanbanId || '').toLowerCase();
      const itemCode = String(item.itemCode || '').toLowerCase();
      const itemName = String(item.itemName || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const supplier = String(item.supplier || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();
      const matchesSearch = !query
        || kanbanId.includes(query)
        || itemCode.includes(query)
        || itemName.includes(query)
        || category.includes(query)
        || supplier.includes(query)
        || location.includes(query);

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
                        <tr><td colSpan="7" className="p-3 text-center text-slate-400">Memuat...</td></tr>
                      )}
                      {!stockCardLoading && stockCardRows.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2 border">
                            {row.date ? new Date(row.date).toLocaleString('id-ID') : '-'}
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
                        <tr><td colSpan="7" className="p-3 text-center text-slate-400">Belum ada transaksi.</td></tr>
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
                          {batch.batch_no || batch.do_number || `Batch ${batch.id}`} | {batch.arrival_date || '-'} | Avl {formatNumber0(batch.available_qty || 0)}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
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
                  {filteredInventoryItems.map((item) => (
                    <div
                      key={item.id}
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
                          <button onClick={() => handleInventoryDelete(item.id)} className="text-red-600 hover:text-red-700" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                      <div className="mt-3">
                        <div className="font-medium text-sm">{item.itemName}</div>
                        <div className="text-xs text-slate-500">{item.category}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <div className="text-xs text-slate-500">Location</div>
                          <div className="font-medium">{item.location}</div>
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
                          <div>Supplier: {item.supplier}</div>
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
                          <button className="p-2 border rounded text-slate-600" title="QR">
                            <QrCode size={14} />
                          </button>
                          <button className="p-2 border rounded text-slate-600" title="Analytics">
                            <BarChart3 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {renderPaginationControls('kanbanRequests', kanbanPaginationMeta)}
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
                      <tr key={item.id} className="border-t">
                        <td className="p-2 font-medium">{item.kanbanId}</td>
                        <td className="p-2">
                          <div className="font-medium">{item.itemCode}</div>
                          <div className="text-[10px] text-slate-500">{item.itemName}</div>
                        </td>
                        <td className="p-2">{item.category}</td>
                        <td className="p-2">{item.location}</td>
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
                        <td className="p-2">{item.supplier}</td>
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
                            {canDeleteRecords && (
                              <button onClick={() => handleInventoryDelete(item.id)} className="text-red-600 hover:text-red-700" title="Delete">
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
                    className="bg-white w-full max-w-md h-full p-6 overflow-y-auto"
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
                        <div className="font-semibold">{inventoryDetailItem.location}</div>
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
                        <div className="font-semibold">{inventoryDetailItem.supplier}</div>
                      </div>
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
            </div>
            )}
    </>
  );
};

export default TabInventory;
