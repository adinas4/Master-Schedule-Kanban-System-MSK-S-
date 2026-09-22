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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

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
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page });
  }
  if (end < total) {
    if (end < total - 1) items.push({ type: 'ellipsis' });
    items.push({ type: 'page', value: total });
  }
  return items;
};

const getPaginationMeta = (rows, pagination = {}) => {
  const total = rows.length;
  const pageSizeValue = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeValue) ? pageSizeValue : DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Number(pagination.page || 1)), totalPages);
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(total, page * pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
  };
};

const TabQuality = (props) => {
  const {
    apiFetch,
    canQuality,
    mainTab,
    masterItems = [],
    items = [],
    showToastMessage,
    qualityNav,
    setActiveQualityHelpTab,
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
  const [selectedMillsheetIds, setSelectedMillsheetIds] = useState([]);
  const [selectedIncomingKeys, setSelectedIncomingKeys] = useState([]);
  const [paginationByKey, setPaginationByKey] = useState({});
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

  useEffect(() => {
    if (qualityNav?.tab) {
      setActiveTab(qualityNav.tab);
    }
  }, [qualityNav?.nonce, qualityNav?.tab]);

  useEffect(() => {
    if (mainTab !== 'quality') return;
    if (setActiveQualityHelpTab) {
      setActiveQualityHelpTab(activeTab);
    }
  }, [activeTab, mainTab, setActiveQualityHelpTab]);

  const allItems = useMemo(() => {
    const source = masterItems.length ? masterItems : items;
    return source
      .map((item) => ({
        code: item.code || item.item_code || '',
        name: item.name || item.item_name || '',
        partNo: item.part_no || item.partNo || '',
        unit: item.unit || item.uom || item.itemUnit || '',
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
      row.doNumber,
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

  const buildRowKey = useCallback(
    (row) => `${row.sourceType}-${row.sourceId || 0}-${row.sourceLineId || 0}-${row.caseId || row.id || 0}`,
    [],
  );

  const selectedMaterialItem = itemLookup.get(String(materialForm.itemCode || '').trim().toLowerCase());
  const selectedBatch = batchOptions.find((batch) => String(batch.id) === String(materialForm.batchId));
  const selectableIncomingKeys = useMemo(() => (
    incomingRows
      .filter((row) => !isCorrectionReviewRow(row))
      .map((row) => buildRowKey(row))
  ), [buildRowKey, incomingRows, isCorrectionReviewRow]);
  const selectedIncomingRows = useMemo(() => {
    const selectable = new Set(selectableIncomingKeys);
    const selected = new Set(selectedIncomingKeys.filter((key) => selectable.has(key)));
    return incomingRows.filter((row) => selected.has(buildRowKey(row)));
  }, [buildRowKey, incomingRows, selectableIncomingKeys, selectedIncomingKeys]);
  const selectableMillsheetIds = useMemo(() => (
    millsheetRows
      .filter((row) => String(row.status || '').toLowerCase() === 'uploaded_waiting_qc')
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0)
  ), [millsheetRows]);
  const selectedMillsheetApproveIds = useMemo(() => {
    const selectable = new Set(selectableMillsheetIds);
    return selectedMillsheetIds.filter((id) => selectable.has(id));
  }, [selectableMillsheetIds, selectedMillsheetIds]);

  const updatePagination = useCallback((key, patch) => {
    setPaginationByKey((prev) => ({
      ...prev,
      [key]: {
        page: prev[key]?.page || 1,
        pageSize: prev[key]?.pageSize || DEFAULT_PAGE_SIZE,
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    setPaginationByKey((prev) => {
      let changed = false;
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        next[key] = { ...value, page: 1 };
        if (value?.page !== 1) changed = true;
      });
      return changed ? next : prev;
    });
  }, [search]);

  useEffect(() => {
    setSelectedMillsheetIds((prev) => {
      if (!prev.length) return prev;
      const selectable = new Set(selectableMillsheetIds);
      const next = prev.filter((id) => selectable.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [selectableMillsheetIds]);

  useEffect(() => {
    setSelectedIncomingKeys((prev) => {
      if (!prev.length) return prev;
      const selectable = new Set(selectableIncomingKeys);
      const next = prev.filter((key) => selectable.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, [selectableIncomingKeys]);

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

  const buildDispositionPayload = (row, disposition) => {
    const rowKey = buildRowKey(row);
    return {
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
    };
  };

  const submitDisposition = async (row, disposition) => {
    const rowKey = buildRowKey(row);
    setSavingKey(`${rowKey}-${disposition}`);
    setError('');
    try {
      await apiFetch('/api/quality/disposition', {
        method: 'POST',
        body: JSON.stringify(buildDispositionPayload(row, disposition)),
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

  const toggleIncomingSelection = (row, checked) => {
    if (!row || isCorrectionReviewRow(row)) return;
    const rowKey = buildRowKey(row);
    setSelectedIncomingKeys((prev) => {
      const exists = prev.includes(rowKey);
      if (checked && !exists) return [...prev, rowKey];
      if (!checked && exists) return prev.filter((key) => key !== rowKey);
      return prev;
    });
  };

  const toggleIncomingPageSelection = (rows, checked) => {
    const pageKeys = rows
      .filter((row) => !isCorrectionReviewRow(row))
      .map((row) => buildRowKey(row));
    setSelectedIncomingKeys((prev) => {
      if (checked) return Array.from(new Set([...prev, ...pageKeys]));
      const pageKeySet = new Set(pageKeys);
      return prev.filter((key) => !pageKeySet.has(key));
    });
  };

  const approveSelectedIncoming = async () => {
    if (!selectedIncomingRows.length) {
      setError('Pilih minimal satu Incoming RN yang bisa di-release.');
      return;
    }
    setSavingKey('incoming-bulk-approve');
    setError('');
    let successCount = 0;
    const failed = [];
    const successKeys = [];
    try {
      for (const row of selectedIncomingRows) {
        const rowKey = buildRowKey(row);
        try {
          await apiFetch('/api/quality/disposition', {
            method: 'POST',
            body: JSON.stringify(buildDispositionPayload(row, 'ok')),
          });
          successCount += 1;
          successKeys.push(rowKey);
        } catch (err) {
          failed.push(`${row.sourceDoc || rowKey}: ${err?.message || 'gagal release'}`);
        }
      }
      setSelectedIncomingKeys((prev) => prev.filter((key) => !successKeys.includes(key)));
      if (successKeys.length > 0) {
        setNotesByKey((prev) => {
          const next = { ...prev };
          successKeys.forEach((key) => {
            next[key] = '';
          });
          return next;
        });
      }
      if (successCount > 0) notify(`${successCount} Incoming RN berhasil di-release.`);
      if (failed.length > 0) {
        setError(`Sebagian Incoming RN gagal di-release: ${failed.slice(0, 3).join('; ')}${failed.length > 3 ? `; dan ${failed.length - 3} lainnya` : ''}`);
      }
      await loadQueue();
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

  const toggleMillsheetSelection = (rowId, checked) => {
    const id = Number(rowId);
    if (!Number.isFinite(id) || id <= 0) return;
    setSelectedMillsheetIds((prev) => {
      const exists = prev.includes(id);
      if (checked && !exists) return [...prev, id];
      if (!checked && exists) return prev.filter((value) => value !== id);
      return prev;
    });
  };

  const toggleMillsheetPageSelection = (rows, checked) => {
    const pageIds = rows
      .filter((row) => String(row.status || '').toLowerCase() === 'uploaded_waiting_qc')
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    setSelectedMillsheetIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...pageIds]));
      const pageIdSet = new Set(pageIds);
      return prev.filter((id) => !pageIdSet.has(id));
    });
  };

  const approveSelectedMillsheets = async () => {
    const ids = selectedMillsheetApproveIds;
    if (!ids.length) {
      setError('Pilih minimal satu Mill Sheet yang menunggu QC untuk bulk approve.');
      return;
    }
    setSavingKey('millsheet-bulk-approve');
    setError('');
    try {
      const result = await apiFetch('/api/quality/millsheets/bulk-review', {
        method: 'POST',
        body: JSON.stringify({
          ids,
          status: 'qc_approved',
          notes: 'Bulk approve QC',
        }),
      });
      setSelectedMillsheetIds([]);
      notify(`${Number(result?.reviewedCount || ids.length)} Mill Sheet berhasil di-approve.`);
      await loadMillsheets();
    } catch (err) {
      setError(err?.message || 'Gagal bulk approve Mill Sheet.');
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

  const renderPagination = (key, meta) => {
    if (meta.total === 0) return null;
    return (
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={meta.pageSize}
            onChange={(event) => updatePagination(key, { page: 1, pageSize: Number(event.target.value) || DEFAULT_PAGE_SIZE })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          >
            {PAGE_SIZE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <span className="text-slate-500">
            Showing {meta.startIndex} to {meta.endIndex} of {meta.total} entries
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => updatePagination(key, { page: Math.max(1, meta.page - 1) })}
            disabled={meta.page <= 1}
            className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {buildPageSequence(meta.page, meta.totalPages).map((entry, index) => (
            entry.type === 'ellipsis' ? (
              <span key={`ellipsis-${key}-${index}`} className="px-2 text-slate-400">...</span>
            ) : (
              <button
                key={`${key}-page-${entry.value}`}
                type="button"
                onClick={() => updatePagination(key, { page: entry.value })}
                className={`rounded border px-2 py-1 font-semibold ${meta.page === entry.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                {entry.value}
              </button>
            )
          ))}
          <button
            type="button"
            onClick={() => updatePagination(key, { page: Math.min(meta.totalPages, meta.page + 1) })}
            disabled={meta.page >= meta.totalPages}
            className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderMillsheetTable = () => {
    const pendingMeta = getPaginationMeta(millsheetPendingRows, paginationByKey.millsheetPending);
    const millsheetMeta = getPaginationMeta(millsheetRows, paginationByKey.millsheet);
    const selectedSet = new Set(selectedMillsheetApproveIds);
    const pageSelectableIds = millsheetMeta.rows
      .filter((row) => String(row.status || '').toLowerCase() === 'uploaded_waiting_qc')
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const allPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedSet.has(id));

    return (
    <div className="space-y-4">
      {millsheetPendingRows.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-amber-900">RN Belum Lengkap Mill Sheet</div>
            <div className="text-xs text-amber-800">
              Showing {pendingMeta.startIndex} to {pendingMeta.endIndex} of {pendingMeta.total}
            </div>
          </div>
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
                {pendingMeta.rows.map((row) => (
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
          {renderPagination('millsheetPending', pendingMeta)}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{selectedMillsheetApproveIds.length}</span> Mill Sheet dipilih
        </div>
        <button
          type="button"
          disabled={savingKey === 'millsheet-bulk-approve' || selectedMillsheetApproveIds.length === 0}
          onClick={approveSelectedMillsheets}
          className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingKey === 'millsheet-bulk-approve' ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Approve Selected
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 p-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  disabled={pageSelectableIds.length === 0 || Boolean(savingKey)}
                  onChange={(event) => toggleMillsheetPageSelection(millsheetMeta.rows, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                  aria-label="Pilih semua Mill Sheet di halaman ini"
                />
              </th>
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
                <td colSpan={8} className="p-6 text-center text-sm text-slate-400">
                  <RefreshCw size={14} className="mr-2 inline-block animate-spin" /> Memuat Mill Sheet...
                </td>
              </tr>
            )}
            {!millsheetLoading && millsheetRows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-slate-400">Belum ada file Mill Sheet untuk dicek.</td>
              </tr>
            )}
            {!millsheetLoading && millsheetMeta.rows.map((row) => {
              const isWaitingQc = String(row.status || '').toLowerCase() === 'uploaded_waiting_qc';
              const rowId = Number(row.id);
              return (
              <tr key={`millsheet-${row.id}`} className="border-t align-top">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(rowId)}
                    disabled={!isWaitingQc || Boolean(savingKey)}
                    onChange={(event) => toggleMillsheetSelection(row.id, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Pilih Mill Sheet ${row.fileName || row.id}`}
                  />
                </td>
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
                        disabled={Boolean(savingKey) || !isWaitingQc}
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
              );
            })}
          </tbody>
        </table>
        {renderPagination('millsheet', millsheetMeta)}
      </div>
    </div>
    );
  };

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

  const renderQueueTable = (rows, mode, paginationKey = mode) => {
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
    const meta = getPaginationMeta(rows, paginationByKey[paginationKey]);
    const isIncomingTable = paginationKey === 'incoming';
    const incomingSelectedSet = new Set(selectedIncomingKeys);
    const incomingPageSelectableKeys = isIncomingTable
      ? meta.rows.filter((row) => !isCorrectionReviewRow(row)).map((row) => buildRowKey(row))
      : [];
    const allIncomingPageSelected = incomingPageSelectableKeys.length > 0
      && incomingPageSelectableKeys.every((key) => incomingSelectedSet.has(key));

    return (
      <div className="space-y-3">
        {isIncomingTable && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{selectedIncomingRows.length}</span> Incoming RN dipilih
            </div>
            <button
              type="button"
              disabled={savingKey === 'incoming-bulk-approve' || selectedIncomingRows.length === 0}
              onClick={approveSelectedIncoming}
              className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingKey === 'incoming-bulk-approve' ? <RefreshCw size={14} className="animate-spin" /> : <PackageCheck size={14} />}
              Approve Selected
            </button>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {isIncomingTable && (
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allIncomingPageSelected}
                      disabled={incomingPageSelectableKeys.length === 0 || Boolean(savingKey)}
                      onChange={(event) => toggleIncomingPageSelection(meta.rows, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label="Pilih semua Incoming RN di halaman ini"
                    />
                  </th>
                )}
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
              {meta.rows.map((row) => {
                const rowKey = buildRowKey(row);
                const itemUnit = row.itemUnit || itemLookup.get(String(row.itemCode || '').toLowerCase())?.unit || '';
                const isIncomingSelectable = isIncomingTable && !isCorrectionReviewRow(row);
                return (
                <tr key={rowKey} className="border-t align-top">
                  {isIncomingTable && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={incomingSelectedSet.has(rowKey)}
                        disabled={!isIncomingSelectable || Boolean(savingKey)}
                        onChange={(event) => toggleIncomingSelection(row, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                        aria-label={`Pilih Incoming RN ${row.sourceDoc || rowKey}`}
                      />
                    </td>
                  )}
                  <td className="p-3 whitespace-nowrap text-xs font-medium text-slate-700">
                    {formatDateOnly(row.eventAt || row.createdAt || row.productionDate)}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{row.sourceDoc || '-'}</div>
                    {row.doNumber && (
                      <div className="text-xs font-semibold text-slate-600">SJ/DO: {row.doNumber}</div>
                    )}
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
                    {itemUnit && <div className="text-[11px] uppercase text-slate-500">{itemUnit}</div>}
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
                );
              })}
              {meta.total === 0 && (
                <tr>
                  <td colSpan={isIncomingTable ? 8 : 7} className="p-6 text-center text-sm text-slate-400">Tidak ada antrean QC.</td>
                </tr>
              )}
            </tbody>
          </table>
          {renderPagination(paginationKey, meta)}
        </div>
      </div>
    );
  };

  const renderCaseTable = () => {
    const meta = getPaginationMeta(caseRows, paginationByKey.cases);
    return (
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
            {meta.rows.map((row) => (
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
            {meta.total === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-slate-400">Belum ada log QC.</td>
              </tr>
            )}
          </tbody>
        </table>
        {renderPagination('cases', meta)}
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
          {renderQueueTable(openReturnRows, 'production', 'return')}
        </div>
      )}

      {activeTab === 'cases' && renderCaseTable()}
    </div>
  );
};

export default TabQuality;
