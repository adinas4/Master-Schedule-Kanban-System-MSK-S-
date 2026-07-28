import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  FileText,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';

const formatQty = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  const hasDecimal = Math.abs(num - Math.trunc(num)) > 1e-9;
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 0,
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const sourceLabel = {
  incoming_rn: 'Incoming RN',
  production_ng: 'Production NG',
  material_line_ng: 'Material NG Line',
  delivery_return: 'Delivery Return',
  manual: 'Manual',
};

const dispositionLabel = {
  ok: 'OK / Release',
  hold: 'Hold',
  sortir: 'Sortir',
  reject: 'Reject',
  rework: 'Rework',
  scrap: 'Scrap',
  return_supplier: 'Return Supplier',
  claim_customer: 'Claim Customer',
  use_as_is: 'Use As Is',
  correction_review: 'Close Review',
};

const severityClass = (severity) => {
  const key = String(severity || '').toLowerCase();
  if (key === 'critical') return 'bg-red-50 text-red-700 border-red-200';
  if (key === 'major') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

const millsheetStatusClass = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'qc_approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (key === 'uploaded_waiting_qc') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (key === 'qc_rejected' || key === 'overdue') return 'bg-red-50 text-red-700 border-red-200';
  if (key === 'required_pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

const millsheetStatusLabel = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'qc_approved') return 'QC Approved';
  if (key === 'uploaded_waiting_qc') return 'Menunggu QC';
  if (key === 'qc_rejected') return 'Ditolak QC';
  if (key === 'overdue') return 'Lewat Tenggang';
  if (key === 'required_pending') return 'Belum Lengkap';
  if (key === 'not_required') return 'Tidak Wajib';
  return status || '-';
};

const TabQuality = (props) => {
  const {
    apiFetch,
    canQuality,
    mainTab,
    masterItems = [],
    items = [],
    showToastMessage,
  } = props;

  const [activeTab, setActiveTab] = useState('incoming');
  const [queue, setQueue] = useState({ incoming: [], production: [], cases: [] });
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [notesByKey, setNotesByKey] = useState({});
  const [millsheets, setMillsheets] = useState({ documents: [], pendingReceipts: [] });
  const [millsheetLoading, setMillsheetLoading] = useState(false);
  const [millsheetNotesById, setMillsheetNotesById] = useState({});
  const [batchOptions, setBatchOptions] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    itemCode: '',
    batchId: '',
    qty: '',
    lineName: '',
    processName: '',
    operatorName: '',
    shiftName: '',
    defectCategory: '',
    defectDescription: '',
    severity: 'major',
  });
  const [returnForm, setReturnForm] = useState({
    sourceDoc: '',
    itemCode: '',
    qty: '',
    customer: '',
    supplier: '',
    defectCategory: '',
    defectDescription: '',
    severity: 'major',
  });

  const allItems = useMemo(() => {
    const source = masterItems.length ? masterItems : items;
    return source
      .map((item) => ({
        code: item.code || item.item_code || '',
        name: item.name || item.item_name || '',
        partNo: item.part_no || item.partNo || '',
      }))
      .filter((item) => item.code);
  }, [items, masterItems]);

  const itemLookup = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => map.set(String(item.code).toLowerCase(), item));
    return map;
  }, [allItems]);

  const notify = useCallback((message, type = 'success') => {
    if (showToastMessage) showToastMessage(message, type);
  }, [showToastMessage]);

  const loadQueue = useCallback(async () => {
    if (!apiFetch || mainTab !== 'quality') return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/quality/queue');
      setQueue({
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        production: Array.isArray(data?.production) ? data.production : [],
        cases: Array.isArray(data?.cases) ? data.cases : [],
      });
    } catch (err) {
      setError(err?.message || 'Gagal memuat data QC.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, mainTab]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const loadMillsheets = useCallback(async () => {
    if (!apiFetch || mainTab !== 'quality') return;
    setMillsheetLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/quality/millsheets');
      setMillsheets({
        documents: Array.isArray(data?.documents) ? data.documents : [],
        pendingReceipts: Array.isArray(data?.pendingReceipts) ? data.pendingReceipts : [],
      });
    } catch (err) {
      setError(err?.message || 'Gagal memuat Mill Sheet.');
    } finally {
      setMillsheetLoading(false);
    }
  }, [apiFetch, mainTab]);

  useEffect(() => {
    if (activeTab === 'millsheet') {
      loadMillsheets();
    }
  }, [activeTab, loadMillsheets]);

  const filterRows = useCallback((rows) => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => [
      row.caseNumber,
      row.sourceDoc,
      row.itemCode,
      row.itemName,
      row.partNo,
      row.supplier,
      row.customer,
      row.defectCategory,
      row.defectDescription,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [search]);

  const incomingRows = useMemo(() => filterRows(queue.incoming), [filterRows, queue.incoming]);
  const productionRows = useMemo(
    () => filterRows(queue.production.filter((row) => row.sourceType !== 'material_line_ng')),
    [filterRows, queue.production],
  );
  const materialRows = useMemo(
    () => filterRows(queue.production.filter((row) => row.sourceType === 'material_line_ng')),
    [filterRows, queue.production],
  );
  const caseRows = useMemo(() => filterRows(queue.cases), [filterRows, queue.cases]);
  const millsheetRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = Array.isArray(millsheets.documents) ? millsheets.documents : [];
    if (!term) return rows;
    return rows.filter((row) => [
      row.dnNumber,
      row.rnNumber,
      row.supplierId,
      row.supplierName,
      row.itemCode,
      row.itemName,
      row.lotSupplier,
      row.certificateNo,
      row.status,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [millsheets.documents, search]);
  const millsheetPendingRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = Array.isArray(millsheets.pendingReceipts) ? millsheets.pendingReceipts : [];
    if (!term) return rows;
    return rows.filter((row) => [
      row.rnNumber,
      row.doNumber,
      row.supplier,
      Array.isArray(row.dnNumbers) ? row.dnNumbers.join(' ') : '',
      row.millsheetStatus,
      row.millsheetNotes,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [millsheets.pendingReceipts, search]);
  const openReturnRows = useMemo(
    () => caseRows.filter((row) => row.sourceType === 'delivery_return' && row.status !== 'closed'),
    [caseRows],
  );

  const isCorrectionReviewRow = useCallback((row) => Boolean(
    row?.correctionReview
      || row?.reversalOf
      || row?.reversalOfItemId
      || String(row?.rnStatus || '').toLowerCase() === 'reversed'
      || String(row?.lineStatus || '').toLowerCase() === 'reversed'
      || String(row?.defectDescription || '').toLowerCase().includes('pembatalan rn')
      || String(row?.defectDescription || '').toLowerCase().includes('reversal'),
  ), []);

  const buildRowKey = (row) => `${row.sourceType}-${row.sourceId || 0}-${row.sourceLineId || 0}-${row.caseId || row.id || 0}`;

  const selectedMaterialItem = itemLookup.get(String(materialForm.itemCode || '').trim().toLowerCase());
  const selectedBatch = batchOptions.find((batch) => String(batch.id) === String(materialForm.batchId));

  useEffect(() => {
    const itemCode = String(materialForm.itemCode || '').trim();
    if (!apiFetch || mainTab !== 'quality' || activeTab !== 'material' || !itemCode) {
      setBatchOptions([]);
      return;
    }
    let cancelled = false;
    setBatchLoading(true);
    apiFetch(`/api/quality/stock-batches?itemCode=${encodeURIComponent(itemCode)}`)
      .then((data) => {
        if (!cancelled) setBatchOptions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setBatchOptions([]);
          setError(err?.message || 'Gagal memuat batch FIFO.');
        }
      })
      .finally(() => {
        if (!cancelled) setBatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiFetch, mainTab, materialForm.itemCode]);

  const submitDisposition = async (row, disposition) => {
    const rowKey = buildRowKey(row);
    setSavingKey(`${rowKey}-${disposition}`);
    setError('');
    try {
      await apiFetch('/api/quality/disposition', {
        method: 'POST',
        body: JSON.stringify({
          caseId: row.caseId || row.id || null,
          sourceType: row.sourceType,
          sourceId: row.sourceId || null,
          sourceLineId: row.sourceLineId || null,
          sourceDoc: row.sourceDoc,
          itemCode: row.itemCode,
          itemName: row.itemName,
          partNo: row.partNo,
          supplier: row.supplier,
          customer: row.customer,
          productionDate: row.productionDate,
          qty: row.qty,
          qtyOk: row.qtyOk,
          qtyNg: row.qtyNg || row.qty,
          defectCategory: row.defectCategory,
          defectDescription: row.defectDescription,
          severity: row.severity,
          disposition,
          dispositionQty: row.qtyNg || row.qty,
          notes: notesByKey[rowKey] || '',
        }),
      });
      setNotesByKey((prev) => ({ ...prev, [rowKey]: '' }));
      notify('Disposition QC tersimpan.');
      await loadQueue();
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan disposition QC.');
    } finally {
      setSavingKey('');
    }
  };

  const reviewMillsheet = async (row, status) => {
    if (!row?.id) return;
    const actionLabel = status === 'qc_approved' ? 'approve' : 'reject';
    setSavingKey(`millsheet-${row.id}-${status}`);
    setError('');
    try {
      await apiFetch(`/api/quality/millsheets/${row.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes: millsheetNotesById[row.id] || '',
        }),
      });
      setMillsheetNotesById((prev) => ({ ...prev, [row.id]: '' }));
      notify(`Mill Sheet berhasil di-${actionLabel}.`);
      await loadMillsheets();
    } catch (err) {
      setError(err?.message || 'Gagal review Mill Sheet.');
    } finally {
      setSavingKey('');
    }
  };

  const submitReturnCase = async (event) => {
    event.preventDefault();
    const itemCode = String(returnForm.itemCode || '').trim();
    const item = itemLookup.get(itemCode.toLowerCase());
    const qty = Number(returnForm.qty || 0);
    if (!itemCode || !item || !(qty > 0)) {
      setError('Return delivery harus memakai item dari Master Item dan qty > 0.');
      return;
    }
    setSavingKey('return-case');
    setError('');
    try {
      await apiFetch('/api/quality/cases', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'delivery_return',
          sourceDoc: returnForm.sourceDoc,
          itemCode,
          itemName: item.name,
          partNo: item.partNo,
          qty,
          qtyNg: qty,
          customer: returnForm.customer,
          supplier: returnForm.supplier,
          defectCategory: returnForm.defectCategory || 'DELIVERY_RETURN',
          defectDescription: returnForm.defectDescription,
          severity: returnForm.severity,
        }),
      });
      setReturnForm({
        sourceDoc: '',
        itemCode: '',
        qty: '',
        customer: '',
        supplier: '',
        defectCategory: '',
        defectDescription: '',
        severity: 'major',
      });
      notify('Kasus return delivery dibuat.');
      await loadQueue();
      setActiveTab('return');
    } catch (err) {
      setError(err?.message || 'Gagal membuat kasus return delivery.');
    } finally {
      setSavingKey('');
    }
  };

  const submitMaterialLineCase = async (event) => {
    event.preventDefault();
    const itemCode = String(materialForm.itemCode || '').trim();
    const item = itemLookup.get(itemCode.toLowerCase());
    const qty = Number(materialForm.qty || 0);
    if (!itemCode || !item || !(qty > 0) || !selectedBatch) {
      setError('Material NG Line wajib memilih item, batch FIFO/RN, dan qty NG > 0.');
      return;
    }
    setSavingKey('material-line-case');
    setError('');
    try {
      await apiFetch('/api/quality/cases', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'material_line_ng',
          sourceDoc: selectedBatch.doNumber || selectedBatch.batchNo || '',
          batchId: selectedBatch.id,
          itemCode,
          itemName: item.name,
          partNo: item.partNo,
          supplier: selectedBatch.supplierCode || '',
          qty,
          qtyNg: qty,
          lineName: materialForm.lineName,
          processName: materialForm.processName,
          operatorName: materialForm.operatorName,
          shiftName: materialForm.shiftName,
          defectCategory: materialForm.defectCategory || 'MATERIAL_LINE_NG',
          defectDescription: [
            materialForm.defectDescription,
            materialForm.lineName ? `Line: ${materialForm.lineName}` : '',
            materialForm.processName ? `Process: ${materialForm.processName}` : '',
            materialForm.shiftName ? `Shift: ${materialForm.shiftName}` : '',
          ].filter(Boolean).join(' | '),
          severity: materialForm.severity,
        }),
      });
      setMaterialForm({
        itemCode: '',
        batchId: '',
        qty: '',
        lineName: '',
        processName: '',
        operatorName: '',
        shiftName: '',
        defectCategory: '',
        defectDescription: '',
        severity: 'major',
      });
      setBatchOptions([]);
      notify('Material NG Line dibuat dan stok batch ditahan.');
      await loadQueue();
      setActiveTab('material');
    } catch (err) {
      setError(err?.message || 'Gagal membuat Material NG Line.');
    } finally {
      setSavingKey('');
    }
  };

  const renderMillsheetTable = () => (
    <div className="space-y-4">
      {millsheetPendingRows.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 text-sm font-semibold text-amber-900">RN Belum Lengkap Mill Sheet</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-amber-900">
                <tr>
                  <th className="p-2 text-left">RN</th>
                  <th className="p-2 text-left">DN</th>
                  <th className="p-2 text-left">Supplier</th>
                  <th className="p-2 text-left">Jawaban RN</th>
                  <th className="p-2 text-left">Due</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {millsheetPendingRows.map((row) => (
                  <tr key={`pending-ms-${row.id}`} className="border-t border-amber-200/70">
                    <td className="p-2 font-semibold text-slate-900">{row.rnNumber || '-'}</td>
                    <td className="p-2">{Array.isArray(row.dnNumbers) && row.dnNumbers.length ? row.dnNumbers.join(', ') : '-'}</td>
                    <td className="p-2">{row.supplier || '-'}</td>
                    <td className="p-2">{row.millsheetQuestion || '-'}</td>
                    <td className="p-2">{formatDateTime(row.millsheetDueAt)}</td>
                    <td className="p-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${millsheetStatusClass(row.millsheetStatus)}`}>
                        {millsheetStatusLabel(row.millsheetStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3 text-left">File</th>
              <th className="p-3 text-left">DN / RN</th>
              <th className="p-3 text-left">Item / Lot</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-left">Certificate</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action QC</th>
            </tr>
          </thead>
          <tbody>
            {millsheetLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-slate-400">
                  <RefreshCw size={14} className="mr-2 inline-block animate-spin" /> Memuat Mill Sheet...
                </td>
              </tr>
            )}
            {!millsheetLoading && millsheetRows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-slate-400">Belum ada file Mill Sheet untuk dicek.</td>
              </tr>
            )}
            {!millsheetLoading && millsheetRows.map((row) => (
              <tr key={`millsheet-${row.id}`} className="border-t align-top">
                <td className="p-3">
                  <a className="inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900" href={row.fileUrl} target="_blank" rel="noreferrer">
                    <FileText size={14} /> {row.fileName || 'Mill Sheet'}
                  </a>
                  <div className="mt-1 text-xs text-slate-400">Hash {String(row.fileHash || '').slice(0, 16)} | v{row.uploadVersion || 1}</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{row.dnNumber || '-'}</div>
                  <div className="text-xs text-slate-500">{row.rnNumber || '-'}</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{row.itemCode || 'Semua item'}</div>
                  <div className="text-xs text-slate-500">{row.lotSupplier || '-'}</div>
                </td>
                <td className="p-3">
                  <div>{row.supplierId || '-'}</div>
                  <div className="text-xs text-slate-500">{row.supplierName || '-'}</div>
                </td>
                <td className="p-3">
                  <div>{row.certificateNo || '-'}</div>
                  <div className="text-xs text-slate-500">{formatDateOnly(row.certificateDate)}</div>
                  <div className="text-xs text-slate-400">Upload {formatDateTime(row.uploadedAt)}</div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${millsheetStatusClass(row.status)}`}>
                    {millsheetStatusLabel(row.status)}
                  </span>
                  {row.qcNotes && <div className="mt-1 text-xs text-slate-500">{row.qcNotes}</div>}
                </td>
                <td className="p-3">
                  <div className="flex min-w-[240px] flex-col gap-2">
                    <input
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      value={millsheetNotesById[row.id] || ''}
                      onChange={(event) => setMillsheetNotesById((prev) => ({ ...prev, [row.id]: event.target.value }))}
                      placeholder="Catatan review QC"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={Boolean(savingKey)}
                        onClick={() => reviewMillsheet(row, 'qc_approved')}
                        className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                      >
                        {savingKey === `millsheet-${row.id}-qc_approved` ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(savingKey)}
                        onClick={() => reviewMillsheet(row, 'qc_rejected')}
                        className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                      >
                        {savingKey === `millsheet-${row.id}-qc_rejected` ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                        Reject
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderActions = (row, actions) => {
    const rowKey = buildRowKey(row);
    const rowActions = isCorrectionReviewRow(row)
      ? [
          {
            key: 'correction_review',
            label: 'Close Review',
            icon: <ClipboardCheck size={12} />,
            className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
          },
        ]
      : actions;
    return (
      <div className="flex min-w-[260px] flex-col gap-2">
        <input
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
          value={notesByKey[rowKey] || ''}
          onChange={(event) => setNotesByKey((prev) => ({ ...prev, [rowKey]: event.target.value }))}
          placeholder="Catatan QC"
        />
        <div className="flex flex-wrap gap-1.5">
          {rowActions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={Boolean(savingKey)}
              onClick={() => submitDisposition(row, action.key)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium ${action.className}`}
              title={dispositionLabel[action.key]}
            >
              {savingKey === `${rowKey}-${action.key}` ? <RefreshCw size={12} className="animate-spin" /> : action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderQueueTable = (rows, mode) => {
    const actions = mode === 'incoming'
      ? [
          { key: 'ok', label: 'Release', icon: <PackageCheck size={12} />, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
          { key: 'hold', label: 'Hold', icon: <ShieldCheck size={12} />, className: 'border-amber-200 bg-amber-50 text-amber-700' },
          { key: 'reject', label: 'Reject', icon: <XCircle size={12} />, className: 'border-red-200 bg-red-50 text-red-700' },
          { key: 'return_supplier', label: 'Return', icon: <RotateCcw size={12} />, className: 'border-slate-200 bg-white text-slate-700' },
        ]
      : mode === 'material'
        ? [
            { key: 'sortir', label: 'Sortir', icon: <ShieldCheck size={12} />, className: 'border-amber-200 bg-amber-50 text-amber-700' },
            { key: 'return_supplier', label: 'Return', icon: <RotateCcw size={12} />, className: 'border-slate-200 bg-white text-slate-700' },
            { key: 'scrap', label: 'Scrap', icon: <XCircle size={12} />, className: 'border-red-200 bg-red-50 text-red-700' },
            { key: 'rework', label: 'Rework', icon: <Wrench size={12} />, className: 'border-blue-200 bg-blue-50 text-blue-700' },
            { key: 'use_as_is', label: 'Use', icon: <CheckCircle size={12} />, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
          ]
      : [
          { key: 'rework', label: 'Rework', icon: <Wrench size={12} />, className: 'border-blue-200 bg-blue-50 text-blue-700' },
          { key: 'scrap', label: 'Scrap', icon: <XCircle size={12} />, className: 'border-red-200 bg-red-50 text-red-700' },
          { key: 'use_as_is', label: 'Use', icon: <CheckCircle size={12} />, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
          { key: 'hold', label: 'Hold', icon: <ShieldCheck size={12} />, className: 'border-amber-200 bg-amber-50 text-amber-700' },
        ];

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3 text-left">Tanggal</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Supplier Code</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-left">Defect</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={buildRowKey(row)} className="border-t align-top">
                <td className="p-3 whitespace-nowrap text-xs font-medium text-slate-700">
                  {formatDateOnly(row.eventAt || row.createdAt || row.productionDate)}
                </td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{row.sourceDoc || '-'}</div>
                  <div className="text-xs text-slate-500">{sourceLabel[row.sourceType] || row.sourceType}</div>
                  {isCorrectionReviewRow(row) && (
                    <div className="mt-1 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      RN Batal / Correction Review
                    </div>
                  )}
                  {row.caseNumber && <div className="text-xs text-slate-400">{row.caseNumber}</div>}
                  {row.batchId && <div className="text-xs text-slate-400">Batch ID {row.batchId}</div>}
                </td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{row.itemCode || '-'}</div>
                  <div className="text-xs text-slate-500">{row.itemName || row.partNo || '-'}</div>
                </td>
                <td className="p-3 text-xs text-slate-600">
                  <div>{row.supplier || row.customer || '-'}</div>
                  {row.productionDate && <div>{String(row.productionDate).slice(0, 10)}</div>}
                </td>
                <td className="p-3 text-right">
                  <div className="font-semibold text-slate-900">{formatQty(row.qtyNg || row.qty)}</div>
                  {mode === 'production' && <div className="text-xs text-slate-500">Good {formatQty(row.qtyOk)}</div>}
                </td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass(row.severity)}`}>
                    {row.severity || 'minor'}
                  </span>
                  <div className="mt-1 text-xs text-slate-600">{row.defectCategory || '-'}</div>
                  <div className="text-xs text-slate-400">{row.defectDescription || '-'}</div>
                  {(row.lineName || row.processName) && (
                    <div className="text-xs text-slate-500">{[row.lineName, row.processName].filter(Boolean).join(' / ')}</div>
                  )}
                </td>
                <td className="p-3">{renderActions(row, actions)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-slate-400">Tidak ada antrean QC.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!canQuality) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Anda tidak memiliki akses Quality Control.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Quality Control</h2>
          <p className="text-sm text-slate-500">Inspeksi incoming RN, NG produksi, dan return delivery.</p>
        </div>
        <button
          type="button"
          onClick={loadQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Incoming QC Open</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{queue.incoming.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Production NG</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{productionRows.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Material NG Line</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{materialRows.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Return Open</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{openReturnRows.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">QC Check Log</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{queue.cases.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Mill Sheet Open</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {millsheetRows.filter((row) => row.status !== 'qc_approved').length + millsheetPendingRows.length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'incoming', label: 'Incoming RN', icon: <ClipboardCheck size={14} /> },
          { key: 'production', label: 'Production NG', icon: <AlertTriangle size={14} /> },
          { key: 'material', label: 'Material NG Line', icon: <PackageCheck size={14} /> },
          { key: 'return', label: 'Delivery Return', icon: <RotateCcw size={14} /> },
          { key: 'millsheet', label: 'Mill Sheet', icon: <FileText size={14} /> },
          { key: 'cases', label: 'QC Check Log', icon: <ShieldCheck size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex min-w-[240px] items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari case / item / dokumen"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {activeTab === 'incoming' && renderQueueTable(incomingRows, 'incoming')}
      {activeTab === 'production' && renderQueueTable(productionRows, 'production')}
      {activeTab === 'millsheet' && renderMillsheetTable()}

      {activeTab === 'material' && (
        <div className="space-y-4">
          <form onSubmit={submitMaterialLineCase} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <PackageCheck size={16} />
              Input Material NG Line
            </div>
            <datalist id="quality-material-item-options">
              {allItems.slice(0, 2000).map((item) => (
                <option key={item.code} value={item.code}>{[item.name, item.partNo].filter(Boolean).join(' - ')}</option>
              ))}
            </datalist>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                list="quality-material-item-options"
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={materialForm.itemCode}
                onChange={(event) => setMaterialForm((prev) => ({ ...prev, itemCode: event.target.value, batchId: '' }))}
                placeholder="Item code raw material"
              />
              <SearchableSelectDropdown
                className="md:col-span-1"
                controlClassName="rounded border border-slate-200 px-3 py-2 text-sm shadow-none focus-within:border-slate-300 focus-within:ring-0"
                value={materialForm.batchId}
                onChange={(nextValue) => setMaterialForm((prev) => ({ ...prev, batchId: nextValue }))}
                disabled={!selectedMaterialItem || batchLoading}
                options={batchOptions}
                placeholder={batchLoading ? 'Memuat batch...' : '-- Pilih batch FIFO/RN --'}
                searchPlaceholder="Ketik DN/RN/batch/supplier..."
                emptyText={selectedMaterialItem ? 'Batch tidak ditemukan.' : 'Pilih item raw material dulu.'}
                getOptionValue={(batch) => String(batch?.id || '')}
                getOptionLabel={(batch) => [
                  batch?.doNumber || `Batch ${batch?.id}`,
                  batch?.batchNo,
                  batch?.supplierCode,
                  batch?.supplierName,
                  `Avail ${formatQty(batch?.availableQty)}`,
                ].filter(Boolean).join(' | ')}
              />
              <input
                type="number"
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={materialForm.qty}
                onChange={(event) => setMaterialForm((prev) => ({ ...prev, qty: event.target.value }))}
                placeholder="Qty NG"
              />
              <select className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.severity} onChange={(event) => setMaterialForm((prev) => ({ ...prev, severity: event.target.value }))}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.lineName} onChange={(event) => setMaterialForm((prev) => ({ ...prev, lineName: event.target.value }))} placeholder="Line" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.processName} onChange={(event) => setMaterialForm((prev) => ({ ...prev, processName: event.target.value }))} placeholder="Proses" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.operatorName} onChange={(event) => setMaterialForm((prev) => ({ ...prev, operatorName: event.target.value }))} placeholder="Operator" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.shiftName} onChange={(event) => setMaterialForm((prev) => ({ ...prev, shiftName: event.target.value }))} placeholder="Shift" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={materialForm.defectCategory} onChange={(event) => setMaterialForm((prev) => ({ ...prev, defectCategory: event.target.value }))} placeholder="Kategori defect" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm md:col-span-3" value={materialForm.defectDescription} onChange={(event) => setMaterialForm((prev) => ({ ...prev, defectDescription: event.target.value }))} placeholder="Detail defect" />
            </div>
            {selectedBatch && (
              <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Batch {selectedBatch.batchNo || selectedBatch.doNumber || selectedBatch.id} | Supplier {selectedBatch.supplierCode || '-'} | Available {formatQty(selectedBatch.availableQty)}
              </div>
            )}
            <div className="mt-3">
              <button type="submit" disabled={savingKey === 'material-line-case'} className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm text-white">
                {savingKey === 'material-line-case' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Material NG
              </button>
            </div>
          </form>
          {renderQueueTable(materialRows, 'material')}
        </div>
      )}

      {activeTab === 'return' && (
        <div className="space-y-4">
          <form onSubmit={submitReturnCase} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <RotateCcw size={16} />
              Input Return Delivery
            </div>
            <datalist id="quality-item-options">
              {allItems.slice(0, 2000).map((item) => (
                <option key={item.code} value={item.code}>{[item.name, item.partNo].filter(Boolean).join(' - ')}</option>
              ))}
            </datalist>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.sourceDoc} onChange={(e) => setReturnForm((prev) => ({ ...prev, sourceDoc: e.target.value }))} placeholder="No return / SJ" />
              <input list="quality-item-options" className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.itemCode} onChange={(e) => setReturnForm((prev) => ({ ...prev, itemCode: e.target.value }))} placeholder="Item code dari Master" />
              <input type="number" className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.qty} onChange={(e) => setReturnForm((prev) => ({ ...prev, qty: e.target.value }))} placeholder="Qty return" />
              <select className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.severity} onChange={(e) => setReturnForm((prev) => ({ ...prev, severity: e.target.value }))}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.customer} onChange={(e) => setReturnForm((prev) => ({ ...prev, customer: e.target.value }))} placeholder="Customer" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.supplier} onChange={(e) => setReturnForm((prev) => ({ ...prev, supplier: e.target.value }))} placeholder="Supplier terkait" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.defectCategory} onChange={(e) => setReturnForm((prev) => ({ ...prev, defectCategory: e.target.value }))} placeholder="Kategori defect" />
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" value={returnForm.defectDescription} onChange={(e) => setReturnForm((prev) => ({ ...prev, defectDescription: e.target.value }))} placeholder="Detail defect" />
            </div>
            <div className="mt-3">
              <button type="submit" disabled={savingKey === 'return-case'} className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm text-white">
                {savingKey === 'return-case' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Case Return
              </button>
            </div>
          </form>
          {renderQueueTable(openReturnRows, 'production')}
        </div>
      )}

      {activeTab === 'cases' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">Case</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Disposition</th>
                <th className="p-3 text-left">Dibuat</th>
                <th className="p-3 text-left">Dicek</th>
              </tr>
            </thead>
            <tbody>
              {caseRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 font-semibold text-slate-900">{row.caseNumber}</td>
                  <td className="p-3">
                    <div>{sourceLabel[row.sourceType] || row.sourceType}</div>
                    <div className="text-xs text-slate-500">{row.sourceDoc || '-'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{row.itemCode || '-'}</div>
                    <div className="text-xs text-slate-500">{row.itemName || row.partNo || '-'}</div>
                  </td>
                  <td className="p-3 text-right">{formatQty(row.qtyNg || row.qty)}</td>
                  <td className="p-3">{row.status || '-'}</td>
                  <td className="p-3">
                    <div>{dispositionLabel[row.disposition] || row.disposition || '-'}</div>
                    <div className="text-xs text-slate-500">{row.dispositionNotes || '-'}</div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    <div>{formatDateTime(row.createdAt)}</div>
                    <div className="text-slate-400">{row.createdByName || '-'}</div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    <div>{formatDateTime(row.decidedAt)}</div>
                    <div className="text-slate-400">{row.decidedByName || '-'}</div>
                  </td>
                </tr>
              ))}
              {caseRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-400">Belum ada log QC.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabQuality;
