
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';

const TabSupplierPortal = (props) => {
  const {
    apiFetch,
    ensureXlsx,
    formatDateID,
    formatNumber0,
  } = props;

  const [activeView, setActiveView] = useState('po');

  const [poDraft, setPoDraft] = useState({ q: '', status: '', start: '', end: '' });
  const [poFilters, setPoFilters] = useState({ q: '', status: '', start: '', end: '' });
  const [poRows, setPoRows] = useState([]);
  const [poTotal, setPoTotal] = useState(0);
  const [poLoading, setPoLoading] = useState(false);
  const [poError, setPoError] = useState('');
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(50);
  const [poDetails, setPoDetails] = useState({});

  const [scheduleDraft, setScheduleDraft] = useState({ q: '', status: '', start: '', end: '', order: 'asc' });
  const [scheduleFilters, setScheduleFilters] = useState({ q: '', status: '', start: '', end: '', order: 'asc' });
  const [scheduleRows, setScheduleRows] = useState([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(50);

  const [dnDraft, setDnDraft] = useState({ q: '', status: '', dnStatus: '', start: '', end: '' });
  const [dnFilters, setDnFilters] = useState({ q: '', status: '', dnStatus: '', start: '', end: '' });
  const [dnRows, setDnRows] = useState([]);
  const [dnTotal, setDnTotal] = useState(0);
  const [dnLoading, setDnLoading] = useState(false);
  const [dnError, setDnError] = useState('');
  const [dnPage, setDnPage] = useState(1);
  const [dnPageSize, setDnPageSize] = useState(50);
  const [dnDetails, setDnDetails] = useState({});

  const formatQty = useCallback((value) => {
    if (formatNumber0) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return formatNumber0(numeric);
    }
    if (value === null || value === undefined || value === '') return '-';
    return value;
  }, [formatNumber0]);

  const formatDate = useCallback((value) => {
    if (!value) return '-';
    if (formatDateID) return formatDateID(value);
    return value;
  }, [formatDateID]);

  const formatDateTime = useCallback((value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const buildQuery = useCallback((params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      searchParams.set(key, value);
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }, []);

  const resolveStatusBadge = useCallback((statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    if (!normalized) return 'bg-slate-100 text-slate-600';
    if (['open', 'pending'].includes(normalized)) return 'bg-amber-100 text-amber-700';
    if (['closed', 'fulfilled', 'complete'].includes(normalized)) return 'bg-emerald-100 text-emerald-700';
    if (['late', 'overdue'].includes(normalized)) return 'bg-rose-100 text-rose-700';
    if (['on time', 'ontime'].includes(normalized)) return 'bg-emerald-100 text-emerald-700';
    if (normalized.includes('early')) return 'bg-cyan-100 text-cyan-700';
    return 'bg-slate-100 text-slate-600';
  }, []);

  const resolveTrackingBadge = useCallback((statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    if (!normalized) return 'bg-slate-100 text-slate-600';
    if (normalized.includes('pending')) return 'bg-amber-100 text-amber-700';
    if (normalized.includes('selisih') || normalized.includes('reject')) return 'bg-rose-100 text-rose-700';
    if (normalized.includes('completed') || normalized.includes('complete')) return 'bg-emerald-100 text-emerald-700';
    if (normalized.includes('received')) return 'bg-sky-100 text-sky-700';
    return 'bg-slate-100 text-slate-600';
  }, []);

  const fetchPoList = useCallback(async () => {
    if (!apiFetch) return;
    setPoLoading(true);
    setPoError('');
    try {
      const query = buildQuery({
        ...poFilters,
        includeTotal: 1,
        limit: poPageSize,
        offset: (poPage - 1) * poPageSize,
      });
      const data = await apiFetch(`/api/supplier/po${query}`);
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      setPoRows(rows);
      setPoTotal(Number(data?.total ?? rows.length) || 0);
    } catch (error) {
      setPoError(error.message || 'Gagal memuat data PO.');
    } finally {
      setPoLoading(false);
    }
  }, [apiFetch, buildQuery, poFilters, poPage, poPageSize]);

  const fetchScheduleList = useCallback(async () => {
    if (!apiFetch) return;
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const query = buildQuery({
        ...scheduleFilters,
        includeTotal: 1,
        limit: schedulePageSize,
        offset: (schedulePage - 1) * schedulePageSize,
      });
      const data = await apiFetch(`/api/supplier/schedules${query}`);
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      setScheduleRows(rows);
      setScheduleTotal(Number(data?.total ?? rows.length) || 0);
    } catch (error) {
      setScheduleError(error.message || 'Gagal memuat data jadwal.');
    } finally {
      setScheduleLoading(false);
    }
  }, [apiFetch, buildQuery, scheduleFilters, schedulePage, schedulePageSize]);

  const fetchDnList = useCallback(async () => {
    if (!apiFetch) return;
    setDnLoading(true);
    setDnError('');
    try {
      const query = buildQuery({
        ...dnFilters,
        includeTotal: 1,
        limit: dnPageSize,
        offset: (dnPage - 1) * dnPageSize,
      });
      const data = await apiFetch(`/api/supplier/dn${query}`);
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      setDnRows(rows);
      setDnTotal(Number(data?.total ?? rows.length) || 0);
    } catch (error) {
      setDnError(error.message || 'Gagal memuat data DN.');
    } finally {
      setDnLoading(false);
    }
  }, [apiFetch, buildQuery, dnFilters, dnPage, dnPageSize]);

  useEffect(() => {
    if (activeView === 'po') {
      fetchPoList();
    }
  }, [activeView, fetchPoList]);

  useEffect(() => {
    if (activeView === 'schedule') {
      fetchScheduleList();
    }
  }, [activeView, fetchScheduleList]);

  useEffect(() => {
    if (activeView === 'dn') {
      fetchDnList();
    }
  }, [activeView, fetchDnList]);

  const applyPoFilters = () => {
    setPoFilters({ ...poDraft });
    setPoPage(1);
  };

  const resetPoFilters = () => {
    const next = { q: '', status: '', start: '', end: '' };
    setPoDraft(next);
    setPoFilters(next);
    setPoPage(1);
  };

  const applyScheduleFilters = () => {
    setScheduleFilters({ ...scheduleDraft });
    setSchedulePage(1);
  };

  const resetScheduleFilters = () => {
    const next = { q: '', status: '', start: '', end: '', order: 'asc' };
    setScheduleDraft(next);
    setScheduleFilters(next);
    setSchedulePage(1);
  };

  const applyDnFilters = () => {
    setDnFilters({ ...dnDraft });
    setDnPage(1);
  };

  const resetDnFilters = () => {
    const next = { q: '', status: '', dnStatus: '', start: '', end: '' };
    setDnDraft(next);
    setDnFilters(next);
    setDnPage(1);
  };

  const fetchDnDetail = async (dnNumber) => {
    if (!apiFetch || !dnNumber) return;
    setDnDetails((prev) => ({
      ...prev,
      [dnNumber]: { ...(prev[dnNumber] || {}), loading: true, error: '' },
    }));
    try {
      const data = await apiFetch(`/api/supplier/dn/${encodeURIComponent(dnNumber)}`);
      setDnDetails((prev) => ({
        ...prev,
        [dnNumber]: { ...(prev[dnNumber] || {}), loading: false, header: data?.header || null, items: data?.items || [] },
      }));
    } catch (error) {
      setDnDetails((prev) => ({
        ...prev,
        [dnNumber]: { ...(prev[dnNumber] || {}), loading: false, error: error.message || 'Gagal memuat detail DN.' },
      }));
    }
  };

  const toggleDnDetail = async (dnNumber) => {
    if (!dnNumber) return;
    const current = dnDetails[dnNumber];
    const nextOpen = !(current?.open);
    setDnDetails((prev) => ({
      ...prev,
      [dnNumber]: { ...(prev[dnNumber] || {}), open: nextOpen },
    }));
    if (nextOpen && !current?.items && !current?.loading) {
      await fetchDnDetail(dnNumber);
    }
  };

  const fetchPoLines = async (poNumber) => {
    if (!apiFetch || !poNumber) return;
    setPoDetails((prev) => ({
      ...prev,
      [poNumber]: { ...(prev[poNumber] || {}), loading: true, error: '' },
    }));
    try {
      const data = await apiFetch(`/api/supplier/po/${encodeURIComponent(poNumber)}/lines`);
      setPoDetails((prev) => ({
        ...prev,
        [poNumber]: { ...(prev[poNumber] || {}), loading: false, lines: data?.lines || [] },
      }));
    } catch (error) {
      setPoDetails((prev) => ({
        ...prev,
        [poNumber]: { ...(prev[poNumber] || {}), loading: false, error: error.message || 'Gagal memuat detail PO.' },
      }));
    }
  };

  const togglePoDetail = async (poNumber) => {
    if (!poNumber) return;
    const current = poDetails[poNumber];
    const nextOpen = !(current?.open);
    setPoDetails((prev) => ({
      ...prev,
      [poNumber]: { ...(prev[poNumber] || {}), open: nextOpen },
    }));
    if (nextOpen && !current?.lines && !current?.loading) {
      await fetchPoLines(poNumber);
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const downloadCsv = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escapeCsv = (value) => {
      const str = String(value ?? '');
      if (/[,\"\n]/.test(str)) {
        return `"${str.replace(/\"/g, '""')}"`;
      }
      return str;
    };
    const content = [headers.join(','), ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openPrintWindow = (title, headers, rows) => {
    if (typeof window === 'undefined') return;
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;
    const tableHeader = headers.map((header) => `<th>${escapeHtml(header.label)}</th>`).join('');
    const tableRows = rows.map((row) => {
      const cols = headers.map((header) => `<td>${escapeHtml(row[header.key])}</td>`).join('');
      return `<tr>${cols}</tr>`;
    }).join('');
    const html = `
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5f5; padding: 6px 8px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <table>
            <thead><tr>${tableHeader}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const poExportHeaders = useMemo(() => ([
    { key: 'no', label: 'No' },
    { key: 'po', label: 'No PO' },
    { key: 'date', label: 'Tanggal PO' },
    { key: 'status', label: 'Status' },
    { key: 'order', label: 'Qty Order' },
    { key: 'received', label: 'Qty Terima' },
    { key: 'remaining', label: 'Sisa PO' },
    { key: 'scheduled', label: 'Qty Terjadwal' },
    { key: 'scheduleCount', label: 'Jumlah Jadwal' },
    { key: 'lines', label: 'Jumlah Line' },
  ]), []);

  const scheduleExportHeaders = useMemo(() => ([
    { key: 'no', label: 'No' },
    { key: 'po', label: 'No PO' },
    { key: 'item', label: 'Item' },
    { key: 'itemName', label: 'Nama Item' },
    { key: 'requestDate', label: 'Tgl Rencana' },
    { key: 'deliveryTime', label: 'Jam Kirim' },
    { key: 'requestQty', label: 'Qty Rencana' },
    { key: 'arrivalDate', label: 'Tgl Tiba' },
    { key: 'receivedQty', label: 'Qty Tiba' },
    { key: 'status', label: 'Status' },
    { key: 'doNumber', label: 'No SJ/DO' },
  ]), []);

  const dnExportHeaders = useMemo(() => ([
    { key: 'no', label: 'No' },
    { key: 'dnNumber', label: 'No DN' },
    { key: 'plannedDate', label: 'Tanggal DN' },
    { key: 'trackingStatus', label: 'Status Tracking' },
    { key: 'dnStatus', label: 'Status DN' },
    { key: 'docQty', label: 'Qty Dokumen' },
    { key: 'receivedQty', label: 'Qty Diterima' },
    { key: 'diffQty', label: 'Selisih' },
    { key: 'itemCount', label: 'Jumlah Item' },
    { key: 'rnCount', label: 'Jumlah RN' },
    { key: 'lastReceivedAt', label: 'Tgl Terima Terakhir' },
  ]), []);

  const buildPoExportRows = (rows) => rows.map((row, index) => ({
    no: index + 1,
    po: row.po_number,
    date: row.po_date || '-',
    status: row.status || '-',
    order: formatQty(row.total_qty_order),
    received: formatQty(row.total_qty_received),
    remaining: formatQty(row.total_qty_remaining ?? (row.total_qty_order - row.total_qty_received)),
    scheduled: formatQty(row.total_qty_scheduled),
    scheduleCount: row.schedule_count ?? 0,
    lines: row.line_count ?? 0,
  }));

  const buildScheduleExportRows = (rows) => rows.map((row, index) => ({
    no: index + 1,
    po: row.poNumber || row.po_number || '-',
    item: row.itemCode || row.item || '-',
    itemName: row.itemName || row.item_name || '-',
    requestDate: row.requestDate || '-',
    deliveryTime: row.deliveryTime || '-',
    requestQty: formatQty(row.requestQty ?? row.request_qty),
    arrivalDate: row.arrivalDate || '-',
    receivedQty: formatQty(row.receivedQty ?? row.received_qty),
    status: row.status || '-',
    doNumber: row.doNumber || row.do_number || '-',
  }));

  const buildDnExportRows = (rows) => rows.map((row, index) => ({
    no: index + 1,
    dnNumber: row.dn_number || row.dnNumber || '-',
    plannedDate: row.planned_date || '-',
    trackingStatus: row.tracking_status || row.trackingStatus || '-',
    dnStatus: row.status || '-',
    docQty: formatQty(row.doc_qty_total ?? row.doc_qty ?? row.request_qty ?? row.requestQty),
    receivedQty: formatQty(row.received_qty_total ?? row.received_qty ?? row.receivedQty),
    diffQty: formatQty(row.diff_qty ?? row.diffQty),
    itemCount: row.item_count ?? row.itemCount ?? 0,
    rnCount: row.rn_count ?? row.rnCount ?? 0,
    lastReceivedAt: row.last_received_at ? formatDateTime(row.last_received_at) : '-',
  }));

  const fetchAllPoRows = async () => {
    if (!apiFetch) return [];
    const query = buildQuery({ ...poFilters, includeTotal: 0, limit: 5000, offset: 0 });
    const data = await apiFetch(`/api/supplier/po${query}`);
    return Array.isArray(data) ? data : (data?.rows || []);
  };

  const fetchAllScheduleRows = async () => {
    if (!apiFetch) return [];
    const query = buildQuery({ ...scheduleFilters, includeTotal: 0, limit: 5000, offset: 0 });
    const data = await apiFetch(`/api/supplier/schedules${query}`);
    return Array.isArray(data) ? data : (data?.rows || []);
  };

  const fetchAllDnRows = async () => {
    if (!apiFetch) return [];
    const query = buildQuery({ ...dnFilters, includeTotal: 0, limit: 5000, offset: 0 });
    const data = await apiFetch(`/api/supplier/dn${query}`);
    return Array.isArray(data) ? data : (data?.rows || []);
  };

  const handleExportPoExcel = async () => {
    if (!ensureXlsx) return;
    const rows = await fetchAllPoRows();
    if (!rows.length) {
      alert('Tidak ada data PO untuk diekspor.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const exportRows = buildPoExportRows(rows);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO Supplier');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `PO_Supplier_${today}.xlsx`);
  };

  const handleExportPoCsv = async () => {
    const rows = await fetchAllPoRows();
    if (!rows.length) {
      alert('Tidak ada data PO untuk diekspor.');
      return;
    }
    const exportRows = buildPoExportRows(rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(exportRows, `PO_Supplier_${today}.csv`);
  };

  const handlePrintPo = async () => {
    const rows = await fetchAllPoRows();
    if (!rows.length) {
      alert('Tidak ada data PO untuk dicetak.');
      return;
    }
    openPrintWindow('Rekap PO Supplier', poExportHeaders, buildPoExportRows(rows));
  };

  const handleExportScheduleExcel = async () => {
    if (!ensureXlsx) return;
    const rows = await fetchAllScheduleRows();
    if (!rows.length) {
      alert('Tidak ada data jadwal untuk diekspor.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const exportRows = buildScheduleExportRows(rows);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Supplier');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Jadwal_Supplier_${today}.xlsx`);
  };

  const handleExportScheduleCsv = async () => {
    const rows = await fetchAllScheduleRows();
    if (!rows.length) {
      alert('Tidak ada data jadwal untuk diekspor.');
      return;
    }
    const exportRows = buildScheduleExportRows(rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(exportRows, `Jadwal_Supplier_${today}.csv`);
  };

  const handlePrintSchedule = async () => {
    const rows = await fetchAllScheduleRows();
    if (!rows.length) {
      alert('Tidak ada data jadwal untuk dicetak.');
      return;
    }
    openPrintWindow('Rekap Jadwal Kedatangan', scheduleExportHeaders, buildScheduleExportRows(rows));
  };

  const handleExportDnExcel = async () => {
    if (!ensureXlsx) return;
    const rows = await fetchAllDnRows();
    if (!rows.length) {
      alert('Tidak ada data DN untuk diekspor.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const exportRows = buildDnExportRows(rows);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tracking DN');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Tracking_DN_${today}.xlsx`);
  };

  const handleExportDnCsv = async () => {
    const rows = await fetchAllDnRows();
    if (!rows.length) {
      alert('Tidak ada data DN untuk diekspor.');
      return;
    }
    const exportRows = buildDnExportRows(rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(exportRows, `Tracking_DN_${today}.csv`);
  };

  const handlePrintDn = async () => {
    const rows = await fetchAllDnRows();
    if (!rows.length) {
      alert('Tidak ada data DN untuk dicetak.');
      return;
    }
    openPrintWindow('Rekap Tracking DN', dnExportHeaders, buildDnExportRows(rows));
  };

  const poTotalPages = Math.max(1, Math.ceil(poTotal / poPageSize));
  const scheduleTotalPages = Math.max(1, Math.ceil(scheduleTotal / schedulePageSize));
  const dnTotalPages = Math.max(1, Math.ceil(dnTotal / dnPageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Supplier Portal</div>
          <div className="text-sm text-slate-500">Akses read-only untuk memantau PO & jadwal kedatangan.</div>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'po' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('po')}
            type="button"
          >
            Daftar PO
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'schedule' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('schedule')}
            type="button"
          >
            Jadwal Kedatangan
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'dn' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('dn')}
            type="button"
          >
            Tracking DN
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter size={16} /> Filter & Pencarian
        </div>

        {activeView === 'po' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Cari PO / Item</label>
              <div className="flex items-center gap-2 mt-1">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ketik nomor PO atau item..."
                  value={poDraft.q}
                  onChange={(event) => setPoDraft((prev) => ({ ...prev, q: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={poDraft.status}
                onChange={(event) => setPoDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Semua</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={poDraft.start}
                onChange={(event) => setPoDraft((prev) => ({ ...prev, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={poDraft.end}
                onChange={(event) => setPoDraft((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-2"
                onClick={applyPoFilters}
                type="button"
              >
                <Search size={14} /> Terapkan
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                onClick={resetPoFilters}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        ) : activeView === 'schedule' ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Cari PO / Item / SJ</label>
              <div className="flex items-center gap-2 mt-1">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ketik nomor PO / item / SJ..."
                  value={scheduleDraft.q}
                  onChange={(event) => setScheduleDraft((prev) => ({ ...prev, q: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={scheduleDraft.status}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="on time">On Time</option>
                <option value="late">Late</option>
                <option value="too early">Too Early</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={scheduleDraft.start}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={scheduleDraft.end}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Urutkan</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={scheduleDraft.order}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, order: event.target.value }))}
              >
                <option value="asc">Terlama</option>
                <option value="desc">Terbaru</option>
              </select>
            </div>
            <div className="md:col-span-6 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-2"
                onClick={applyScheduleFilters}
                type="button"
              >
                <Search size={14} /> Terapkan
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                onClick={resetScheduleFilters}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Cari DN / Item</label>
              <div className="flex items-center gap-2 mt-1">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ketik nomor DN / item..."
                  value={dnDraft.q}
                  onChange={(event) => setDnDraft((prev) => ({ ...prev, q: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Status Tracking</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={dnDraft.status}
                onChange={(event) => setDnDraft((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="selisih">Selisih/Reject</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Status DN</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={dnDraft.dnStatus}
                onChange={(event) => setDnDraft((prev) => ({ ...prev, dnStatus: event.target.value }))}
              >
                <option value="">Semua</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="sent">Sent</option>
                <option value="in_transit">In Transit</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={dnDraft.start}
                onChange={(event) => setDnDraft((prev) => ({ ...prev, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={dnDraft.end}
                onChange={(event) => setDnDraft((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
            <div className="md:col-span-6 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-2"
                onClick={applyDnFilters}
                type="button"
              >
                <Search size={14} /> Terapkan
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                onClick={resetDnFilters}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-slate-600">
            {activeView === 'po'
              ? `Total PO: ${poTotal}`
              : activeView === 'schedule'
                ? `Total Jadwal: ${scheduleTotal}`
                : `Total DN: ${dnTotal}`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={() => {
                if (activeView === 'po') fetchPoList();
                else if (activeView === 'schedule') fetchScheduleList();
                else fetchDnList();
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handlePrintPo : activeView === 'schedule' ? handlePrintSchedule : handlePrintDn}
            >
              <Printer size={14} /> Print
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handleExportPoCsv : activeView === 'schedule' ? handleExportScheduleCsv : handleExportDnCsv}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handleExportPoExcel : activeView === 'schedule' ? handleExportScheduleExcel : handleExportDnExcel}
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>

        {activeView === 'po' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Detail</th>
                  <th className="p-3 text-left">No PO</th>
                  <th className="p-3 text-left">Tanggal PO</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Qty Order</th>
                  <th className="p-3 text-right">Qty Terima</th>
                  <th className="p-3 text-right">Sisa PO</th>
                  <th className="p-3 text-right">Qty Terjadwal</th>
                  <th className="p-3 text-center">Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {poLoading && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat data...
                    </td>
                  </tr>
                )}
                {!poLoading && poError && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-rose-600">{poError}</td>
                  </tr>
                )}
                {!poLoading && !poError && poRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">Tidak ada data PO.</td>
                  </tr>
                )}
                {poRows.map((row) => {
                  const remaining = row.total_qty_remaining ?? (row.total_qty_order - row.total_qty_received);
                  const detail = poDetails[row.po_number];
                  return (
                    <React.Fragment key={row.po_number}>
                      <tr className="border-b border-slate-100">
                        <td className="p-3">
                          <button
                            className="text-slate-600 hover:text-slate-900"
                            type="button"
                            onClick={() => togglePoDetail(row.po_number)}
                          >
                            {detail?.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{row.po_number}</td>
                        <td className="p-3">{formatDate(row.po_date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resolveStatusBadge(row.status)}`}>
                            {row.status || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatQty(row.total_qty_order)}</td>
                        <td className="p-3 text-right">{formatQty(row.total_qty_received)}</td>
                        <td className="p-3 text-right">{formatQty(remaining)}</td>
                        <td className="p-3 text-right">{formatQty(row.total_qty_scheduled)}</td>
                        <td className="p-3 text-center">{row.schedule_count ?? 0}</td>
                      </tr>
                      {detail?.open && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/60 p-4">
                            <div className="text-xs font-semibold text-slate-500 mb-2">Detail Line PO</div>
                            {detail?.loading && (
                              <div className="text-sm text-slate-500"><Loader2 size={14} className="animate-spin inline-block mr-2" />Memuat detail...</div>
                            )}
                            {detail?.error && (
                              <div className="text-sm text-rose-600">{detail.error}</div>
                            )}
                            {!detail?.loading && !detail?.error && (!detail?.lines || detail?.lines.length === 0) && (
                              <div className="text-sm text-slate-500">Tidak ada detail line.</div>
                            )}
                            {!detail?.loading && detail?.lines && detail?.lines.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs bg-white border border-slate-200 rounded-lg">
                                  <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                      <th className="p-2 text-left">Line</th>
                                      <th className="p-2 text-left">Item</th>
                                      <th className="p-2 text-left">Nama Item</th>
                                      <th className="p-2 text-left">Part No</th>
                                      <th className="p-2 text-right">Qty Order</th>
                                      <th className="p-2 text-right">Qty Terima</th>
                                      <th className="p-2 text-right">Sisa</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.lines.map((line) => (
                                      <tr key={`${row.po_number}-${line.line_no}`} className="border-t border-slate-100">
                                        <td className="p-2">{line.line_no}</td>
                                        <td className="p-2 font-semibold text-slate-800">{line.item_code}</td>
                                        <td className="p-2">{line.item_name || '-'}</td>
                                        <td className="p-2">{line.part_no || '-'}</td>
                                        <td className="p-2 text-right">{formatQty(line.qty_order)}</td>
                                        <td className="p-2 text-right">{formatQty(line.qty_received)}</td>
                                        <td className="p-2 text-right">{formatQty(line.qty_remaining ?? (line.qty_order - line.qty_received))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : activeView === 'schedule' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">No PO</th>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Nama Item</th>
                  <th className="p-3 text-left">Tgl Rencana</th>
                  <th className="p-3 text-left">Jam</th>
                  <th className="p-3 text-right">Qty Rencana</th>
                  <th className="p-3 text-left">Tgl Tiba</th>
                  <th className="p-3 text-right">Qty Tiba</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">No SJ/DO</th>
                </tr>
              </thead>
              <tbody>
                {scheduleLoading && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat data...
                    </td>
                  </tr>
                )}
                {!scheduleLoading && scheduleError && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-rose-600">{scheduleError}</td>
                  </tr>
                )}
                {!scheduleLoading && !scheduleError && scheduleRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500">Tidak ada data jadwal.</td>
                  </tr>
                )}
                {scheduleRows.map((row) => (
                  <tr key={row.id || `${row.poNumber}-${row.item}-${row.requestDate}`} className="border-b border-slate-100">
                    <td className="p-3 font-semibold text-slate-800">{row.poNumber}</td>
                    <td className="p-3">{row.itemCode || row.item}</td>
                    <td className="p-3">{row.itemName || '-'}</td>
                    <td className="p-3">{formatDate(row.requestDate)}</td>
                    <td className="p-3">{row.deliveryTime || '-'}</td>
                    <td className="p-3 text-right">{formatQty(row.requestQty)}</td>
                    <td className="p-3">{row.arrivalDate ? formatDate(row.arrivalDate) : '-'}</td>
                    <td className="p-3 text-right">{formatQty(row.receivedQty)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resolveStatusBadge(row.status)}`}>
                        {row.status || '-'}
                      </span>
                    </td>
                    <td className="p-3">{row.doNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Detail</th>
                  <th className="p-3 text-left">No DN</th>
                  <th className="p-3 text-left">Tgl DN</th>
                  <th className="p-3 text-left">Status Tracking</th>
                  <th className="p-3 text-left">Status DN</th>
                  <th className="p-3 text-right">Qty Dokumen</th>
                  <th className="p-3 text-right">Qty Diterima</th>
                  <th className="p-3 text-right">Selisih</th>
                  <th className="p-3 text-center">Item</th>
                  <th className="p-3 text-center">RN</th>
                  <th className="p-3 text-left">Last Received</th>
                </tr>
              </thead>
              <tbody>
                {dnLoading && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat data...
                    </td>
                  </tr>
                )}
                {!dnLoading && dnError && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-rose-600">{dnError}</td>
                  </tr>
                )}
                {!dnLoading && !dnError && dnRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500">Tidak ada data DN.</td>
                  </tr>
                )}
                {dnRows.map((row) => {
                  const dnNumber = row.dn_number || row.dnNumber;
                  const detail = dnDetails[dnNumber];
                  return (
                    <React.Fragment key={dnNumber || row.id}>
                      <tr className="border-b border-slate-100">
                        <td className="p-3">
                          <button
                            className="text-slate-600 hover:text-slate-900"
                            type="button"
                            onClick={() => toggleDnDetail(dnNumber)}
                          >
                            {detail?.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{dnNumber}</td>
                        <td className="p-3">{formatDate(row.planned_date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resolveTrackingBadge(row.tracking_status)}`}>
                            {row.tracking_status || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resolveStatusBadge(row.status)}`}>
                            {row.status || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatQty(row.doc_qty_total ?? row.doc_qty ?? row.request_qty)}</td>
                        <td className="p-3 text-right">{formatQty(row.received_qty_total ?? row.received_qty)}</td>
                        <td className="p-3 text-right">{formatQty(row.diff_qty)}</td>
                        <td className="p-3 text-center">{row.item_count ?? 0}</td>
                        <td className="p-3 text-center">{row.rn_count ?? 0}</td>
                        <td className="p-3">{row.last_received_at ? formatDateTime(row.last_received_at) : '-'}</td>
                      </tr>
                      {detail?.open && (
                        <tr>
                          <td colSpan={11} className="bg-slate-50/60 p-4">
                            <div className="text-xs font-semibold text-slate-500 mb-2">Detail Item DN</div>
                            {detail?.loading && (
                              <div className="text-sm text-slate-500"><Loader2 size={14} className="animate-spin inline-block mr-2" />Memuat detail...</div>
                            )}
                            {detail?.error && (
                              <div className="text-sm text-rose-600">{detail.error}</div>
                            )}
                            {!detail?.loading && !detail?.error && (!detail?.items || detail?.items.length === 0) && (
                              <div className="text-sm text-slate-500">Tidak ada detail item.</div>
                            )}
                            {!detail?.loading && detail?.items && detail?.items.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs bg-white border border-slate-200 rounded-lg">
                                  <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                      <th className="p-2 text-left">Item</th>
                                      <th className="p-2 text-left">Nama Item</th>
                                      <th className="p-2 text-left">Part No</th>
                                      <th className="p-2 text-right">Qty Request</th>
                                      <th className="p-2 text-right">Qty Dokumen</th>
                                      <th className="p-2 text-right">Qty Diterima</th>
                                      <th className="p-2 text-right">Selisih</th>
                                      <th className="p-2 text-left">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.items.map((item) => {
                                      const itemCode = item.item_code || item.itemCode || '-';
                                      return (
                                      <tr key={`${dnNumber}-${itemCode}`} className="border-t border-slate-100">
                                        <td className="p-2 font-semibold text-slate-800">{itemCode}</td>
                                        <td className="p-2">{item.item_name || item.itemName || '-'}</td>
                                        <td className="p-2">{item.part_no || item.partNo || '-'}</td>
                                        <td className="p-2 text-right">{formatQty(item.request_qty ?? item.requestQty)}</td>
                                        <td className="p-2 text-right">{formatQty(item.doc_qty ?? item.docQty)}</td>
                                        <td className="p-2 text-right">{formatQty(item.received_qty ?? item.receivedQty)}</td>
                                        <td className="p-2 text-right">{formatQty((item.doc_qty ?? item.docQty ?? item.request_qty ?? item.requestQty ?? 0) - (item.received_qty ?? item.receivedQty ?? 0))}</td>
                                        <td className="p-2">
                                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${resolveTrackingBadge(item.item_status)}`}>
                                            {item.item_status || '-'}
                                          </span>
                                        </td>
                                      </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'po' ? (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
            <div>Halaman {poPage} dari {poTotalPages}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-slate-200 rounded-lg px-2 py-1"
                value={poPageSize}
                onChange={(event) => { setPoPageSize(Number(event.target.value)); setPoPage(1); }}
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>{size} / halaman</option>
                ))}
              </select>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setPoPage((prev) => Math.max(1, prev - 1))}
                disabled={poPage <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setPoPage((prev) => Math.min(poTotalPages, prev + 1))}
                disabled={poPage >= poTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        ) : activeView === 'schedule' ? (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
            <div>Halaman {schedulePage} dari {scheduleTotalPages}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-slate-200 rounded-lg px-2 py-1"
                value={schedulePageSize}
                onChange={(event) => { setSchedulePageSize(Number(event.target.value)); setSchedulePage(1); }}
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>{size} / halaman</option>
                ))}
              </select>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setSchedulePage((prev) => Math.max(1, prev - 1))}
                disabled={schedulePage <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setSchedulePage((prev) => Math.min(scheduleTotalPages, prev + 1))}
                disabled={schedulePage >= scheduleTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
            <div>Halaman {dnPage} dari {dnTotalPages}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-slate-200 rounded-lg px-2 py-1"
                value={dnPageSize}
                onChange={(event) => { setDnPageSize(Number(event.target.value)); setDnPage(1); }}
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>{size} / halaman</option>
                ))}
              </select>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setDnPage((prev) => Math.max(1, prev - 1))}
                disabled={dnPage <= 1}
              >
                Prev
              </button>
              <button
                className="px-3 py-1 rounded border border-slate-200"
                type="button"
                onClick={() => setDnPage((prev) => Math.min(dnTotalPages, prev + 1))}
                disabled={dnPage >= dnTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabSupplierPortal;
