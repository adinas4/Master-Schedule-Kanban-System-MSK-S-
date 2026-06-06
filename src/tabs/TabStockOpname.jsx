import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, FileSpreadsheet, Play, Printer, Sparkles, Upload } from 'lucide-react';

const buildDefaultPeriod = () => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = months[now.getMonth()] || 'Jan';
  return `${label}-${now.getFullYear()}`;
};

const TabStockOpname = (props) => {
  const {
    apiFetch,
    ensureXlsx,
    formatNumber0,
    formatRupiah,
    soOpenSession,
    fetchSoOpenSession,
    ensureAiConfigured,
    canUseAI,
    showToastMessage,
  } = props;

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [periodInput, setPeriodInput] = useState(buildDefaultPeriod());

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [showSystemQty, setShowSystemQty] = useState(true);
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printMode, setPrintMode] = useState('report');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionError('');
    try {
      const data = await apiFetch('/api/so-sessions');
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      setSessionError(error.message || 'Gagal memuat session.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal memuat session.');
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadItems = async (sessionId) => {
    if (!sessionId) return;
    setItemsLoading(true);
    setItemsError('');
    try {
      const data = await apiFetch(`/api/so-sessions/${sessionId}/items`);
      const mapped = (Array.isArray(data) ? data : []).map((row) => ({
        id: row.id,
        itemCode: row.item_code,
        itemName: row.item_name || '',
        partNo: row.part_no || '-',
        locationName: row.location_name || row.line_production || row.location_id || '',
        unit: row.unit || '',
        snp: Number(row.snp || 0),
        price: Number(row.price || 0),
        bookQty: Number(row.book_qty || 0),
        inputBox: Number(row.input_box || 0),
        inputLoose: Number(row.input_loose || 0),
        reason: row.reason || '',
        hidden: false,
      }));
      setRows(mapped);
    } catch (error) {
      setRows([]);
      setItemsError(error.message || 'Gagal memuat item.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal memuat item.');
      }
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setRows([]);
      return;
    }
    const session = sessions.find((item) => item.id === selectedSessionId) || null;
    setSelectedSession(session);
    loadItems(selectedSessionId);
  }, [selectedSessionId, sessions]);

  const visibleRows = useMemo(() => rows.filter((row) => !row.hidden), [rows]);

  const computedRows = useMemo(() => visibleRows.map((row) => {
    const snpValue = Number(row.snp || 0);
    const inputBox = Number(row.inputBox || 0);
    const inputLoose = Number(row.inputLoose || 0);
    const actualQty = inputBox * snpValue + inputLoose;
    const difference = actualQty - Number(row.bookQty || 0);
    return { ...row, actualQty, difference };
  }), [visibleRows]);

  const varianceCount = useMemo(
    () => computedRows.filter((row) => row.difference !== 0).length,
    [computedRows],
  );

  const totalDiffValue = useMemo(() => {
    return computedRows.reduce((sum, row) => {
      if (!row.price) return sum;
      return sum + row.difference * Number(row.price || 0);
    }, 0);
  }, [computedRows]);
  const totalActualQty = useMemo(
    () => computedRows.reduce((sum, row) => sum + Number(row.actualQty || 0), 0),
    [computedRows],
  );
  const totalDiffQty = useMemo(
    () => computedRows.reduce((sum, row) => sum + Number(row.difference || 0), 0),
    [computedRows],
  );

  const handleStartSession = async () => {
    const period = String(periodInput || '').trim();
    if (!period) {
      setSessionError('Period wajib diisi.');
      return;
    }
    setSessionError('');
    try {
      const result = await apiFetch('/api/so-sessions/start', {
        method: 'POST',
        body: JSON.stringify({ period }),
      });
      await loadSessions();
      setSelectedSessionId(result?.id || null);
      await fetchSoOpenSession?.();
    } catch (error) {
      setSessionError(error.message || 'Gagal start session.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal start session.');
      }
    }
  };

  const handleUploadBatch = async () => {
    if (!selectedSessionId) return;
    if (uploading) return;
    if (computedRows.length === 0) {
      setItemsError('Tidak ada item untuk diupload.');
      if (showToastMessage) {
        showToastMessage('Tidak ada item untuk diupload.');
      }
      return;
    }
    const invalid = computedRows.find((row) => row.difference !== 0 && !String(row.reason || '').trim());
    if (invalid) {
      setItemsError(`Reason wajib diisi untuk item ${invalid.itemCode}.`);
      if (showToastMessage) {
        showToastMessage(`Reason wajib diisi untuk item ${invalid.itemCode}.`);
      }
      return;
    }
    setUploading(true);
    setItemsError('');
    try {
      const payload = computedRows.map((row) => ({
        itemCode: row.itemCode,
        inputBox: Number(row.inputBox || 0),
        inputLoose: Number(row.inputLoose || 0),
        snp: Number(row.snp || 0),
        reason: row.reason || '',
      }));
      await apiFetch(`/api/so-sessions/${selectedSessionId}/upload`, {
        method: 'POST',
        body: JSON.stringify({ items: payload }),
      });
      await loadSessions();
      await loadItems(selectedSessionId);
      alert('Upload batch SO berhasil.');
    } catch (error) {
      setItemsError(error.message || 'Gagal upload SO.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal upload SO.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedSessionId) return;
    if (finalizing) return;
    const ok = window.confirm('Finalize & Post? Stok akan disesuaikan.');
    if (!ok) return;
    setFinalizing(true);
    setItemsError('');
    try {
      await apiFetch(`/api/so-sessions/${selectedSessionId}/finalize`, { method: 'POST' });
      await loadSessions();
      await loadItems(selectedSessionId);
      await fetchSoOpenSession?.();
      alert('Stock Opname POSTED.');
    } catch (error) {
      setItemsError(error.message || 'Gagal finalize SO.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal finalize SO.');
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleRowChange = (id, key, value) => {
    setRows((prev) => prev.map((row) => (
      row.id === id ? { ...row, [key]: value } : row
    )));
  };

  const normalizeAiList = (value) => {
    if (Array.isArray(value)) return value.filter((item) => String(item || '').trim());
    if (!value) return [];
    return [String(value)];
  };

  const handleAnalyzeVariance = async () => {
    if (!selectedSessionId || aiLoading) return;
    if (!canUseAI) {
      if (showToastMessage) {
        showToastMessage('Anda tidak memiliki akses AI.');
      }
      return;
    }
    const ready = await ensureAiConfigured?.();
    if (!ready) return;
    const varianceRows = computedRows.filter((row) => Number(row.difference || 0) !== 0);
    if (varianceRows.length === 0) {
      if (showToastMessage) {
        showToastMessage('Tidak ada selisih untuk dianalisis.');
      }
      return;
    }
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const payload = {
        pageKey: 'stock_opname_variance',
        title: `Stock Opname ${selectedSession?.period || ''}`,
        filters: {
          period: selectedSession?.period || '',
          status: selectedSession?.status || '',
        },
        columns: [
          { key: 'itemCode', label: 'Kode Item' },
          { key: 'itemName', label: 'Nama Item' },
          { key: 'location', label: 'Lokasi Virtual' },
          { key: 'bookQty', label: 'Stok Sistem' },
          { key: 'snp', label: 'SNP' },
          { key: 'inputBox', label: 'Input KBN/Box' },
          { key: 'inputLoose', label: 'Input Eceran/Remain' },
          { key: 'actualQty', label: 'Total Fisik' },
          { key: 'difference', label: 'Selisih' },
          { key: 'reason', label: 'Catatan' },
        ],
        rows: varianceRows.map((row) => ({
          itemCode: row.itemCode,
          itemName: row.itemName,
          location: row.locationName,
          bookQty: Number(row.bookQty || 0),
          snp: Number(row.snp || 0),
          inputBox: Number(row.inputBox || 0),
          inputLoose: Number(row.inputLoose || 0),
          actualQty: Number(row.actualQty || 0),
          difference: Number(row.difference || 0),
          reason: row.reason || '',
        })),
      };
      const data = await apiFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data?.error) throw new Error(data.error);
      setAiResult({
        anomalies: normalizeAiList(data?.anomalies),
        insights: normalizeAiList(data?.insights),
        actions: normalizeAiList(data?.actions),
      });
    } catch (error) {
      setAiError(error.message || 'Gagal menjalankan analisis AI.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal menjalankan analisis AI.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportBlankoExcel = async () => {
    if (!computedRows.length) {
      setItemsError('Tidak ada item untuk diexport.');
      if (showToastMessage) {
        showToastMessage('Tidak ada item untuk diexport.');
      }
      return;
    }
    const XLSX = await ensureXlsx?.();
    if (!XLSX) return;
    const exportRows = computedRows.map((row, index) => ({
      No: index + 1,
      'Kode Item': row.itemCode,
      'Nama Item': row.itemName || '',
      'Lokasi Virtual': row.locationName || '',
      'SNP (Qty/KBN)': Number(row.snp || 0),
      'Input KBN/Box': '',
      'Input Eceran/Remain': '',
      'Total Fisik': '',
      Selisih: '',
      Status: '',
      Catatan: '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blanko SO');
    const periodTag = selectedSession?.period ? String(selectedSession.period).replace(/\s+/g, '_') : 'SO';
    const dateTag = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Blanko_Stock_Opname_${periodTag}_${dateTag}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">Stock Opname</div>
          <div className="text-xs text-slate-500">Snapshot, tally, dan posting penyesuaian stok.</div>
        </div>
      </div>

      {soOpenSession && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Stock Opname sedang OPEN ({soOpenSession.period}). Hindari input produksi/receiving sampai selesai.
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="text-sm font-semibold">Start Session</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Period</label>
            <input
              className="border p-2 rounded w-full text-sm"
              placeholder="Feb-2026"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleStartSession}
            className="px-4 py-2 bg-slate-900 text-white rounded text-xs flex items-center gap-2"
          >
            <Play size={14} /> Start Stock Opname
          </button>
        </div>
        {sessionError && <div className="text-xs text-red-600">{sessionError}</div>}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">SO Sessions</div>
          <button
            type="button"
            onClick={loadSessions}
            className="px-3 py-1.5 text-xs border rounded"
          >
            Refresh
          </button>
        </div>
        {sessionsLoading && (
          <div className="text-xs text-slate-400">Memuat session...</div>
        )}
        {!sessionsLoading && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Items</th>
                  <th className="text-right p-2">Variance</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t">
                    <td className="p-2 font-semibold">{session.period}</td>
                    <td className="p-2">{session.status}</td>
                    <td className="p-2 text-right">{formatNumber0(session.item_count || 0)}</td>
                    <td className="p-2 text-right">{formatNumber0(session.variance_count || 0)}</td>
                    <td className="p-2">{session.created_at ? new Date(session.created_at).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="px-3 py-1.5 text-xs border rounded"
                      >
                        Pilih
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan="6" className="p-3 text-center text-slate-400">Belum ada session.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Tally Input</div>
            <div className="text-xs text-slate-500">
              {selectedSession ? `Session ${selectedSession.period} (${selectedSession.status})` : 'Pilih session terlebih dahulu.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSystemQty((prev) => !prev)}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
            >
              {showSystemQty ? <EyeOff size={12} /> : <Eye size={12} />}
              {showSystemQty ? 'Hide Stok Sistem' : 'Show Stok Sistem'}
            </button>
            <button
              type="button"
              onClick={handleUploadBatch}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded flex items-center gap-2"
              disabled={!selectedSessionId || uploading}
            >
              <Upload size={12} />
              {uploading ? 'Uploading...' : 'Upload Batch SO'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintMode('report');
                setShowPrint(true);
              }}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <Printer size={12} />
              Print Laporan
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintMode('blanko');
                setShowPrint(true);
              }}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <Printer size={12} />
              Print Blanko
            </button>
            <button
              type="button"
              onClick={handleExportBlankoExcel}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <FileSpreadsheet size={12} />
              Export Excel Blanko
            </button>
            <button
              type="button"
              onClick={handleAnalyzeVariance}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0 || aiLoading}
            >
              <Sparkles size={12} />
              {aiLoading ? 'Menganalisis...' : 'Analisis AI'}
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded flex items-center gap-2"
              disabled={!selectedSessionId || finalizing}
            >
              <CheckCircle size={12} />
              {finalizing ? 'Posting...' : 'Finalize & Post'}
            </button>
          </div>
        </div>

        {itemsError && <div className="text-xs text-red-600">{itemsError}</div>}

        {itemsLoading && <div className="text-xs text-slate-400">Memuat item...</div>}

        {!itemsLoading && selectedSessionId && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px] border">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left p-3 border">Kode Item</th>
                  <th className="text-left p-3 border w-[180px]">Lokasi Virtual (Proses)</th>
                  {showSystemQty && (
                    <th className="text-right p-3 border w-[130px]">Stok Sistem</th>
                  )}
                  <th className="text-right p-3 border w-[120px]">SNP (Qty/KBN)</th>
                  <th className="text-right p-3 border w-[130px]">Input KBN / Box</th>
                  <th className="text-right p-3 border w-[150px]">Input Eceran / Remain</th>
                  <th className="text-right p-3 border w-[140px]">Total Fisik</th>
                  <th className="text-right p-3 border w-[130px]">Selisih</th>
                  <th className="text-center p-3 border w-[130px]">Status</th>
                  <th className="text-left p-3 border w-[180px]">Catatan</th>
                  <th className="text-center p-3 border w-[70px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {computedRows.map((row) => {
                  const diff = row.difference;
                  const diffTone = diff === 0 ? '' : diff > 0 ? 'text-emerald-600' : 'text-rose-600';
                  const isDiff = diff !== 0;
                  const snpValue = Number(row.snp || 0);
                  const snpMissing = !Number.isFinite(snpValue) || snpValue <= 0;
                  return (
                    <tr key={row.id} className={`border-t ${isDiff ? 'bg-rose-50' : ''}`}>
                      <td className="p-3 border">
                        <div className="font-semibold">{row.itemCode}</div>
                        <div className="text-[10px] text-slate-500">{row.itemName}</div>
                        <div className="text-[10px] text-slate-400">{row.partNo}</div>
                      </td>
                      <td className="p-3 border text-[11px] text-slate-600">
                        {row.locationName || '-'}
                      </td>
                      {showSystemQty && (
                        <td className="p-3 border text-right">{formatNumber0(row.bookQty)}</td>
                      )}
                      <td className="p-3 border text-right">
                        {formatNumber0(row.snp)}
                      </td>
                      <td className="p-3 border text-right">
                        <input
                          type="number"
                          className={`border rounded px-2 py-2 w-full text-right text-[12px] ${snpMissing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                          value={row.inputBox}
                          min={0}
                          disabled={snpMissing}
                          onChange={(e) => handleRowChange(row.id, 'inputBox', Number(e.target.value || 0))}
                        />
                        {snpMissing && (
                          <div className="mt-1 text-[10px] text-rose-500">Master SNP 0</div>
                        )}
                      </td>
                      <td className="p-3 border text-right">
                        <input
                          type="number"
                          className="border rounded px-2 py-2 w-full text-right text-[12px]"
                          value={row.inputLoose}
                          min={0}
                          onChange={(e) => handleRowChange(row.id, 'inputLoose', Number(e.target.value || 0))}
                        />
                      </td>
                      <td className="p-3 border text-right text-[13px] font-semibold">{formatNumber0(row.actualQty)}</td>
                      <td className={`p-3 border text-right text-[13px] font-semibold ${diffTone}`}>
                        {diff > 0 ? `+${formatNumber0(diff)}` : formatNumber0(diff)}
                      </td>
                      <td className="p-3 border text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                            <CheckCircle size={12} /> Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-semibold">
                            <AlertTriangle size={12} /> Selisih
                          </span>
                        )}
                      </td>
                      <td className="p-3 border">
                        <input
                          className={`border rounded px-2 py-2 w-full text-[11px] ${isDiff && !row.reason ? 'border-rose-400' : ''}`}
                          value={row.reason}
                          onChange={(e) => handleRowChange(row.id, 'reason', e.target.value)}
                          placeholder={isDiff ? 'Wajib isi reason' : ''}
                        />
                      </td>
                      <td className="p-3 border text-center">
                        <button
                          type="button"
                          onClick={() => handleRowChange(row.id, 'hidden', true)}
                          className="px-2 py-1 text-[10px] border rounded"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {computedRows.length === 0 && (
                  <tr><td colSpan={showSystemQty ? 11 : 10} className="p-3 text-center text-slate-400">Belum ada item.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {computedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">Variance: {varianceCount} item</div>
            {Math.abs(totalDiffValue) > 0 && (
              <div className="font-semibold">Total Value Selisih: {formatRupiah(totalDiffValue)}</div>
            )}
          </div>
        )}
      </div>

      {showPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:static print:bg-white print:p-0 print:items-start print:justify-start">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none">
            <div className="p-4 border-b flex justify-between items-center print:hidden">
              <div className="text-sm font-semibold">
                {printMode === 'blanko' ? 'Blanko Stock Opname' : 'Laporan Hitungan Fisik'}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border rounded">
                  Print / PDF
                </button>
                <button onClick={() => setShowPrint(false)} className="text-slate-500">Tutup</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0">
              <div className="bg-white p-4 text-black">
                <div className="flex items-start justify-between border-b pb-3 mb-3">
                  <div>
                    <div className="text-lg font-bold">
                      {printMode === 'blanko' ? 'BLANKO STOCK OPNAME' : 'LAPORAN HITUNGAN FISIK'}
                    </div>
                    <div className="text-xs text-slate-600">Period: {selectedSession?.period || '-'}</div>
                    <div className="text-xs text-slate-600">Status: {selectedSession?.status || '-'}</div>
                  </div>
                  <div className="text-xs text-slate-600 text-right">
                    Print Date: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px] border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-2 border">No</th>
                        <th className="text-left p-2 border">Kode Item</th>
                        <th className="text-left p-2 border">Lokasi Virtual</th>
                        {printMode !== 'blanko' && (
                          <th className="text-right p-2 border">Stok Sistem</th>
                        )}
                        <th className="text-right p-2 border">SNP</th>
                        <th className="text-right p-2 border">KBN/Box</th>
                        <th className="text-right p-2 border">Remain</th>
                        <th className="text-right p-2 border">Total Fisik</th>
                        <th className="text-right p-2 border">Selisih</th>
                        <th className="text-center p-2 border">Status</th>
                        <th className="text-left p-2 border">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedRows.map((row, index) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2 border">{index + 1}</td>
                          <td className="p-2 border font-semibold">{row.itemCode}</td>
                          <td className="p-2 border">{row.locationName || '-'}</td>
                          {printMode !== 'blanko' && (
                            <td className="p-2 border text-right">{formatNumber0(row.bookQty)}</td>
                          )}
                          <td className="p-2 border text-right">{formatNumber0(row.snp)}</td>
                          <td className="p-2 border text-right">{printMode === 'blanko' ? '' : formatNumber0(row.inputBox)}</td>
                          <td className="p-2 border text-right">{printMode === 'blanko' ? '' : formatNumber0(row.inputLoose)}</td>
                          <td className="p-2 border text-right">{printMode === 'blanko' ? '' : formatNumber0(row.actualQty)}</td>
                          <td className="p-2 border text-right">{printMode === 'blanko' ? '' : (row.difference > 0 ? `+${formatNumber0(row.difference)}` : formatNumber0(row.difference))}</td>
                          <td className="p-2 border text-center">
                            {printMode === 'blanko'
                              ? ''
                              : (row.difference === 0 ? 'Cocok' : 'Selisih')}
                          </td>
                          <td className="p-2 border">{printMode === 'blanko' ? '' : (row.reason || '-')}</td>
                        </tr>
                      ))}
                      {computedRows.length === 0 && (
                        <tr><td colSpan={printMode !== 'blanko' ? 11 : 10} className="p-3 text-center text-slate-400">Belum ada data.</td></tr>
                      )}
                    </tbody>
                    {computedRows.length > 0 && printMode !== 'blanko' && (
                      <tfoot>
                        <tr className="bg-slate-50">
                          <td className="p-2 border text-right font-semibold" colSpan="7">Total</td>
                          <td className="p-2 border text-right font-semibold">{formatNumber0(totalActualQty)}</td>
                          <td className="p-2 border text-right font-semibold">{totalDiffQty > 0 ? `+${formatNumber0(totalDiffQty)}` : formatNumber0(totalDiffQty)}</td>
                          <td className="p-2 border" colSpan="2" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="text-sm font-semibold">Analisis AI - Stock Opname</div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-500">Tutup</button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto bg-slate-50">
              {aiLoading && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  AI sedang menganalisis pola selisih...
                </div>
              )}
              {aiError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {aiError}
                </div>
              )}
              {!aiLoading && !aiError && aiResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-rose-100 bg-white p-4">
                    <div className="text-xs font-semibold text-rose-600 mb-2">Anomali Utama</div>
                    {aiResult.anomalies.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.anomalies.map((item, idx) => (
                          <li key={`anom-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Tidak ada anomali.</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white p-4">
                    <div className="text-xs font-semibold text-amber-600 mb-2">Insight AI</div>
                    {aiResult.insights.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.insights.map((item, idx) => (
                          <li key={`ins-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Belum ada insight.</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-white p-4">
                    <div className="text-xs font-semibold text-emerald-600 mb-2">Rekomendasi Aksi</div>
                    {aiResult.actions.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.actions.map((item, idx) => (
                          <li key={`act-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Belum ada rekomendasi.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabStockOpname;
