import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

const DEFAULT_PLAN = {
  poNumber: '',
  supplier: '',
  item: '',
  requestDate: '',
  requestQty: '',
  dailyQty: '',
  leadTimeDays: '',
  cycleDays: '1',
  deliveryTime: '08:00 (Cycle 1)',
  selectedLines: [],
};

const DEFAULT_EDIT_FORM = {
  id: null,
  poNumber: '',
  supplier: '',
  supplierName: '',
  item: '',
  itemName: '',
  requestDate: '',
  requestQty: '',
  deliveryTime: '',
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toDateOnly = (value) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  return { start: toDateOnly(start), end: toDateOnly(end) };
};

const loadPdfModules = async () => {
  try {
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    return {
      jsPDF: jsPDFModule.jsPDF || jsPDFModule.default,
      autoTable: autoTableModule.default || autoTableModule,
    };
  } catch {
    return { jsPDF: null, autoTable: null };
  }
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    const commaIndex = result.indexOf(',');
    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
  };
  reader.onerror = () => reject(new Error('Gagal membaca file PDF.'));
  reader.readAsDataURL(blob);
});

const sanitizeFilenamePart = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, '_')
  .replace(/[^A-Za-z0-9_-]/g, '')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '')
  .toUpperCase() || 'SCHEDULE';

export const useScheduleStore = ({
  apiFetch,
  onLogout,
  user,
  canEditSchedules,
  canImportSchedules,
  canImportExport,
  canResetAll,
  isStockOpnameLocked,
  parseDateOnly,
  formatDateID,
  getNextBusinessDay,
  formatExcelDate,
  ensureXlsx,
  showToastMessage,
  createSchedule,
  createSchedulesBulk,
  updateSchedule,
  deleteSchedule,
  deleteAllSchedules,
  unlockSchedule,
  normalizeQtyByNsp,
  resolveNspForItem,
  prefetchAllSchedules,
  isInboundActive,
}) => {
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePerPage, setSchedulePerPage] = useState(50);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [scheduleTotalPages, setScheduleTotalPages] = useState(1);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const scheduleFetchRef = useRef(null);
  const schedulesLoadRef = useRef(null);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const inboundActive = isInboundActive !== false;
  const shouldPrefetchSchedules = prefetchAllSchedules !== false;
  const scheduleUpdateTimers = useRef(new Map());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inputMode, setInputMode] = useState('single');
  const [newPlan, setNewPlan] = useState(DEFAULT_PLAN);
  const [searchQuery, setSearchQuery] = useState('');
  const initialMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const [filterStart, setFilterStart] = useState(initialMonthRange.start);
  const [filterEnd, setFilterEnd] = useState(initialMonthRange.end);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [showInboundPrint, setShowInboundPrint] = useState(false);
  const [inboundPrintOrientation, setInboundPrintOrientation] = useState('landscape');
  const [printSnapshot, setPrintSnapshot] = useState(null);
  const [scheduleEditOpen, setScheduleEditOpen] = useState(false);
  const [scheduleEditForm, setScheduleEditForm] = useState(DEFAULT_EDIT_FORM);
  const [scheduleEditSaving, setScheduleEditSaving] = useState(false);
  const [scheduleEditError, setScheduleEditError] = useState('');

  const refreshAllSchedules = async () => {
    if (schedulesLoadRef.current) return schedulesLoadRef.current;
    const task = (async () => {
      setSchedulesLoading(true);
      try {
        const data = await apiFetch('/api/schedules');
        const rows = Array.isArray(data) ? data : (data?.rows || []);
        setSchedules(rows);
        setSchedulesLoaded(true);
        return rows;
      } catch (error) {
        console.error('Gagal memuat data dari API:', error);
        if (String(error).includes('unauthorized') || String(error).includes('401')) {
          if (onLogout) onLogout();
          return [];
        }
        setSchedules([]);
        setSchedulesLoaded(false);
        if (showToastMessage) showToastMessage('Gagal memuat data jadwal dari API.');
        return [];
      } finally {
        setSchedulesLoading(false);
      }
    })();
    schedulesLoadRef.current = task.finally(() => {
      schedulesLoadRef.current = null;
    });
    return schedulesLoadRef.current;
  };

  const ensureSchedulesLoaded = async () => {
    if (schedulesLoaded) return schedules;
    return refreshAllSchedules();
  };

  const buildScheduleQuery = (pageValue, perPageValue) => {
    const params = new URLSearchParams();
    const query = String(searchQuery || '').trim();
    const start = String(filterStart || '').trim();
    const end = String(filterEnd || '').trim();
    const status = String(filterStatus || '').trim();
    const supplier = String(filterSupplier || '').trim();
    if (query) params.set('q', query);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (status && status !== 'All') params.set('status', status);
    if (supplier && supplier !== 'All') params.set('supplier', supplier);
    if (Number.isFinite(perPageValue) && perPageValue > 0) {
      params.set('limit', String(perPageValue));
    }
    if (Number.isFinite(pageValue) && pageValue > 0 && Number.isFinite(perPageValue) && perPageValue > 0) {
      params.set('offset', String((pageValue - 1) * perPageValue));
    }
    params.set('includeTotal', '1');
    return params.toString();
  };

  const refreshSchedules = async ({ page = schedulePage, perPage = schedulePerPage, silent = false } = {}) => {
    if (!silent) setScheduleLoading(true);
    const current = scheduleFetchRef.current;
    if (current?.abort) current.abort.abort();
    const controller = new AbortController();
    scheduleFetchRef.current = { abort: controller };
    try {
      const query = buildScheduleQuery(page, perPage);
      const data = await apiFetch(`/api/schedules?${query}`, { signal: controller.signal });
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      const total = Number(data?.total ?? rows.length ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / (perPage || 1)));
      if (page > totalPages) {
        setSchedulePage(totalPages);
        return;
      }
      setFilteredSchedules(rows);
      setScheduleTotal(total);
      setScheduleTotalPages(totalPages);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Gagal memuat data jadwal (pagination):', error);
      if (String(error).includes('unauthorized') || String(error).includes('401')) {
        if (onLogout) onLogout();
        return;
      }
      setFilteredSchedules([]);
      setScheduleTotal(0);
      setScheduleTotalPages(1);
      if (showToastMessage) showToastMessage('Gagal memuat data jadwal dari API.');
    } finally {
      if (!silent) setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (!shouldPrefetchSchedules) return undefined;
    let isMounted = true;
    const loadSchedules = async () => {
      if (!isMounted) return;
      await refreshAllSchedules();
    };
    loadSchedules();
    return () => { isMounted = false; };
  }, [apiFetch, onLogout, showToastMessage, shouldPrefetchSchedules]);

  const scheduleFilterKey = useMemo(
    () => JSON.stringify({
      q: String(searchQuery || '').trim(),
      start: String(filterStart || '').trim(),
      end: String(filterEnd || '').trim(),
      status: String(filterStatus || '').trim(),
      supplier: String(filterSupplier || '').trim(),
    }),
    [searchQuery, filterStart, filterEnd, filterStatus, filterSupplier],
  );
  const scheduleFilterRef = useRef(scheduleFilterKey);

  const handleSchedulePageChange = (nextPage) => {
    const safeTotal = Math.max(1, scheduleTotalPages);
    const safePage = Math.min(Math.max(1, Number(nextPage) || 1), safeTotal);
    setSchedulePage(safePage);
  };

  const handleSchedulePerPageChange = (nextPerPage) => {
    const safePerPage = Math.max(1, Number(nextPerPage) || schedulePerPage);
    if (safePerPage === schedulePerPage) return;
    setSchedulePerPage(safePerPage);
    setSchedulePage(1);
  };

  useEffect(() => {
    if (!inboundActive) return;
    if (scheduleFilterRef.current !== scheduleFilterKey) {
      scheduleFilterRef.current = scheduleFilterKey;
      if (schedulePage !== 1) {
        setSchedulePage(1);
        return;
      }
    }
    refreshSchedules({ page: schedulePage, perPage: schedulePerPage });
  }, [scheduleFilterKey, schedulePage, schedulePerPage, apiFetch, inboundActive]);

  useEffect(() => {
    if (!inboundActive) return;
    setSelectedScheduleIds([]);
  }, [schedulePage, schedulePerPage, scheduleFilterKey, inboundActive]);

  const postSequential = async (items, handler) => {
    const results = [];
    for (const item of items) {
      const res = await handler(item);
      results.push(res);
    }
    return results;
  };

  const getTodayValue = () => new Date().toISOString().slice(0, 10);

  const getScheduleKey = (row) => {
    const po = String(row?.poNumber || '').trim().toLowerCase();
    const item = String(row?.item || '').trim().toLowerCase();
    return `${po}||${item}`;
  };

  const getPoItemKey = (poNumber, item) => {
    const po = String(poNumber || '').trim().toLowerCase();
    const itemCode = String(item || '').trim().toLowerCase();
    if (!po || !itemCode) return null;
    return `${po}||${itemCode}`;
  };

  const getScheduleUniqueKey = (row) => {
    const po = String(row?.poNumber || '').trim().toLowerCase();
    const supplier = String(row?.supplier || '').trim().toLowerCase();
    const item = String(row?.item || '').trim().toLowerCase();
    const date = String(row?.requestDate || '').trim();
    const time = String(row?.deliveryTime || '').trim().toLowerCase();
    return `${po}||${supplier}||${item}||${date}||${time}`;
  };

  const mergeScheduleRow = (prevRow, nextRow) => {
    if (!prevRow) return nextRow;
    if (!nextRow) return prevRow;
    const merged = { ...nextRow };
    if (!merged.supplierName && prevRow.supplierName) {
      merged.supplierName = prevRow.supplierName;
    }
    if (!merged.itemName && prevRow.itemName) {
      merged.itemName = prevRow.itemName;
    }
    if (!merged.item_name && prevRow.item_name) {
      merged.item_name = prevRow.item_name;
    }
    if (!merged.poStatus && prevRow.poStatus) {
      merged.poStatus = prevRow.poStatus;
    }
    if (!merged.po_status && prevRow.po_status) {
      merged.po_status = prevRow.po_status;
    }
    return merged;
  };

  const normalizeQtyWithNsp = (qty, itemCode, explicitNsp = null) => {
    const raw = Number(qty) || 0;
    const explicit = Number(explicitNsp || 0);
    const nsp = Number.isFinite(explicit) && explicit > 0
      ? explicit
      : (typeof resolveNspForItem === 'function' ? resolveNspForItem(itemCode) : 0);
    const normalized = Number.isFinite(nsp) && nsp > 0
      ? Math.ceil(raw / nsp) * nsp
      : (typeof normalizeQtyByNsp === 'function' ? normalizeQtyByNsp(raw, itemCode) : raw);
    return { raw, normalized, nsp };
  };

  const normalizeQtyDownWithNsp = (qty, itemCode, explicitNsp = null) => {
    const raw = Number(qty) || 0;
    const explicit = Number(explicitNsp || 0);
    const nsp = Number.isFinite(explicit) && explicit > 0
      ? explicit
      : (typeof resolveNspForItem === 'function' ? resolveNspForItem(itemCode) : 0);
    if (!Number.isFinite(raw) || raw <= 0) return { raw, normalized: raw, nsp };
    if (!Number.isFinite(nsp) || nsp <= 0) return { raw, normalized: raw, nsp };
    return { raw, normalized: Math.floor(raw / nsp) * nsp, nsp };
  };

  const handleCreateScheduleError = async (error, label) => {
    const message = error?.message || 'Gagal menyimpan data ke database.';
    if (!/melebihi sisa po|duplikat|tidak ditemukan|wajib diisi/i.test(message)) {
      console.error(label, error);
    }
    await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
    alert(message);
  };

  const resolvePoLineIdValue = (line) => {
    const raw = line?.poLineId ?? line?.lineId ?? line?.id ?? null;
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return null;
    return Math.trunc(num);
  };

  const isDuplicateSchedule = (candidate, ignoreId = null) => {
    const key = getScheduleUniqueKey(candidate);
    return schedules.some((row) => {
      if (row.isSplitResult) return false;
      if (ignoreId != null && row.id === ignoreId) return false;
      return getScheduleUniqueKey(row) === key;
    });
  };

  const scheduleSourceRows = schedulesLoaded ? schedules : filteredSchedules;

  const scheduleOutstandingMaps = useMemo(() => {
    const byLine = new Map();
    const byPoItem = new Map();
    const byId = new Map();
    scheduleSourceRows.forEach((row) => {
      if (!row) return;
      byId.set(row.id, row);
      const outstanding = Math.max(0, Number(row.requestQty || 0) - Number(row.receivedQty || 0));
      if (!Number.isFinite(outstanding) || outstanding <= 0) return;
      const poLineId = row.poLineId;
      if (poLineId) {
        byLine.set(poLineId, (byLine.get(poLineId) || 0) + outstanding);
        return;
      }
      const key = getPoItemKey(row.poNumber, row.item);
      if (key) byPoItem.set(key, (byPoItem.get(key) || 0) + outstanding);
    });
    return { byLine, byPoItem, byId };
  }, [scheduleSourceRows, getPoItemKey]);

  const getPoLineRemainingAfterSchedule = useCallback((line) => {
    if (!line) return null;
    const serverRemaining = Number(
      line?.remaining_after_schedule
      ?? line?.remainingAfterSchedule
      ?? line?.qty_remaining_after_schedule
      ?? line?.qtyRemainingAfterSchedule,
    );
    if (Number.isFinite(serverRemaining)) {
      return Math.max(0, serverRemaining);
    }
    const qtyOrder = Number(line?.qty_order ?? line?.qtyOrder ?? 0);
    const qtyReceived = Number(line?.qty_received ?? line?.qtyReceived ?? 0);
    if (!Number.isFinite(qtyOrder) || !Number.isFinite(qtyReceived)) return null;
    const baseRemaining = Number(line?.qty_remaining ?? line?.qtyRemaining ?? (qtyOrder - qtyReceived));
    if (!Number.isFinite(baseRemaining)) return null;

    const lineId = line?.id ?? line?.poLineId ?? line?.lineId;
    const poNumber = line?.po_number ?? line?.poNumber;
    const itemCode = line?.item_code ?? line?.itemCode ?? line?.item;
    let scheduledOutstanding = 0;

    if (lineId && scheduleOutstandingMaps.byLine.has(lineId)) {
      scheduledOutstanding = scheduleOutstandingMaps.byLine.get(lineId);
    } else {
      const key = getPoItemKey(poNumber, itemCode);
      if (key && scheduleOutstandingMaps.byPoItem.has(key)) {
        scheduledOutstanding = scheduleOutstandingMaps.byPoItem.get(key);
      }
    }

    if (isEditing && editingId) {
      const editingRow = scheduleOutstandingMaps.byId.get(editingId);
      if (editingRow) {
        const editingOutstanding = Math.max(0, Number(editingRow.requestQty || 0) - Number(editingRow.receivedQty || 0));
        const matchesLine = lineId
          ? (editingRow.poLineId && editingRow.poLineId === lineId)
          : (() => {
            const key = getPoItemKey(poNumber, itemCode);
            const editingKey = getPoItemKey(editingRow.poNumber, editingRow.item);
            return Boolean(key && editingKey && key === editingKey);
          })();
        if (matchesLine) {
          scheduledOutstanding = Math.max(0, scheduledOutstanding - editingOutstanding);
        }
      }
    }

    const remaining = baseRemaining - scheduledOutstanding;
    return Number.isFinite(remaining) ? Math.max(0, remaining) : null;
  }, [scheduleOutstandingMaps, getPoItemKey, isEditing, editingId]);

  const scheduleTotalsByKey = useMemo(() => {
    const totals = new Map();
    scheduleSourceRows.forEach((row) => {
      const key = getScheduleKey(row);
      const requestQty = Number(row.requestQty || 0);
      const current = totals.get(key) || { totalOrder: 0, count: 0 };
      current.totalOrder += requestQty;
      current.count += 1;
      totals.set(key, current);
    });
    return totals;
  }, [scheduleSourceRows, getScheduleKey]);

  const getDisplayOrderQty = (row) => row?.requestQty ?? '-';

  const getTotalOrderQty = (row) => {
    const totals = scheduleTotalsByKey.get(getScheduleKey(row));
    if (!totals) return null;
    return Number.isFinite(totals.totalOrder) ? totals.totalOrder : null;
  };

  const padDatePart = (value) => String(value).padStart(2, '0');
  const toDateKey = (date) => (
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
  );
  const resolveTimingStatus = (requestDate, arrivalDate) => {
    const arrDate = parseDateOnly(arrivalDate);
    if (!arrDate) return 'Pending';
    const reqDate = parseDateOnly(requestDate);
    if (!reqDate) return 'Pending';
    const reqKey = toDateKey(reqDate);
    const arrKey = toDateKey(arrDate);
    if (arrKey === reqKey) return 'On Time';
    return arrDate > reqDate ? 'Late' : 'Too Early';
  };

  const getRemainingQty = (item) => {
    const request = Number(item?.requestQty || 0);
    const received = Number(item?.receivedQty || 0);
    return Math.max(0, request - received);
  };

  const getTimeStatus = (row) => resolveTimingStatus(row?.requestDate, row?.arrivalDate);

  const getKpiStatus = (row) => getTimeStatus(row);

  const getSupplierMeta = useCallback((row) => {
    const supplierId = String(
      row?.supplierId
      || row?.supplier_id
      || row?.po_supplier_id
      || row?.supplier
      || '',
    ).trim();
    const supplierName = String(row?.supplierName || row?.supplier_name || row?.supplier || supplierId || '').trim();
    return {
      key: supplierId || supplierName || 'UNKNOWN',
      label: supplierName || supplierId || '-',
    };
  }, []);

  const matchesScheduleFiltersWithoutSupplier = useCallback((row) => {
    if (!row) return false;
    const query = String(searchQuery || '').trim().toLowerCase();
    const start = String(filterStart || '').trim();
    const end = String(filterEnd || '').trim();
    const status = String(filterStatus || '').trim().toLowerCase();
    const requestDate = String(row?.requestDate || '').trim();
    if (start && requestDate && requestDate < start) return false;
    if (end && requestDate && requestDate > end) return false;
    if (status && status !== 'all') {
      const kpiStatus = String(getKpiStatus(row) || '').trim().toLowerCase();
      if (status !== kpiStatus) return false;
    }
    if (!query) return true;
    const haystacks = [
      row?.poNumber,
      row?.supplier,
      row?.supplierName,
      row?.supplier_name,
      row?.item,
      row?.itemCode,
      row?.item_code,
      row?.itemName,
      row?.item_name,
      row?.partNo,
      row?.part_no,
      row?.doNumber,
      row?.do_number,
    ];
    return haystacks.some((value) => String(value || '').toLowerCase().includes(query));
  }, [filterEnd, filterStart, filterStatus, getKpiStatus, searchQuery]);

  const printableSchedules = useMemo(() => {
    if (showInboundPrint && Array.isArray(printSnapshot)) return printSnapshot;
    return filteredSchedules;
  }, [showInboundPrint, printSnapshot, filteredSchedules]);

  const buildPrintStats = useCallback((rows) => {
    const uniquePOs = new Set(rows.map((item) => String(item?.poNumber || '').trim()).filter(Boolean));
    let onTime = 0;
    let late = 0;
    let pending = 0;
    let tooEarly = 0;
    rows.forEach((row) => {
      const kpiStatus = getKpiStatus(row);
      if (kpiStatus === 'On Time') onTime += 1;
      else if (kpiStatus === 'Late') late += 1;
      else if (kpiStatus === 'Too Early') tooEarly += 1;
      else pending += 1;
    });
    const uniqueDates = new Set(rows.map((item) => item?.requestDate).filter(Boolean));
    return {
      totalPO: uniquePOs.size,
      totalSchedules: rows.length,
      totalScheduleDates: uniqueDates.size,
      onTime,
      late,
      pending,
      tooEarly,
    };
  }, [getKpiStatus]);

  const buildSchedulesByDate = useCallback((rows) => (
    Array.from(
      rows.reduce((map, row) => {
        const key = row?.requestDate || 'no-date';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
        return map;
      }, new Map()),
    )
      .sort(([a], [b]) => {
        if (a === 'no-date' && b === 'no-date') return 0;
        if (a === 'no-date') return 1;
        if (b === 'no-date') return -1;
        const dateA = parseDateOnly(a);
        const dateB = parseDateOnly(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      })
      .map(([date, groupRows]) => ({
        date: date === 'no-date' ? null : date,
        rows: groupRows,
      }))
  ), [parseDateOnly]);

  const scheduleSupplierOptions = useMemo(() => {
    const baseRows = schedulesLoaded ? schedules : filteredSchedules;
    const optionsMap = new Map();
    baseRows
      .filter(matchesScheduleFiltersWithoutSupplier)
      .forEach((row) => {
        const meta = getSupplierMeta(row);
        if (!meta.key || optionsMap.has(meta.key)) return;
        optionsMap.set(meta.key, { value: meta.key, label: meta.label || meta.key });
      });
    return Array.from(optionsMap.values()).sort((left, right) => (
      String(left.label || '').localeCompare(String(right.label || ''), 'id')
    ));
  }, [filteredSchedules, getSupplierMeta, matchesScheduleFiltersWithoutSupplier, schedules, schedulesLoaded]);

  const stats = useMemo(() => {
    return buildPrintStats(printableSchedules);
  }, [buildPrintStats, printableSchedules]);

  const schedulesByDate = useMemo(() => {
    return buildSchedulesByDate(printableSchedules);
  }, [buildSchedulesByDate, printableSchedules]);

  const printSupplierGroups = useMemo(() => {
    const grouped = new Map();
    printableSchedules.forEach((row) => {
      const supplierMeta = getSupplierMeta(row);
      const key = supplierMeta.key || 'UNKNOWN';
      if (!grouped.has(key)) {
        grouped.set(key, {
          supplierKey: key,
          supplierLabel: supplierMeta.label || key || '-',
          rows: [],
        });
      }
      grouped.get(key).rows.push(row);
    });
    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        stats: buildPrintStats(group.rows),
        schedulesByDate: buildSchedulesByDate(group.rows),
      }))
      .sort((left, right) => String(left.supplierLabel || '').localeCompare(String(right.supplierLabel || ''), 'id'));
  }, [buildPrintStats, buildSchedulesByDate, getSupplierMeta, printableSchedules]);

  const getPrintStatusClass = (status) => {
    if (status === 'On Time') return 'print-status--ontime';
    if (status === 'Late') return 'print-status--late';
    if (status === 'Too Early') return 'print-status--early';
    if (status === 'Pending') return 'print-status--pending';
    return 'print-status--pending';
  };

  const isDuplicateDoNumber = (item) => {
    const doNumber = String(item.doNumber || '').trim().toLowerCase();
    if (!doNumber) return false;
    const baseRows = schedulesLoaded ? schedules : filteredSchedules;
    const itemCode = item.itemCode || item.item_code || item.item;
    const poLineId = Number(item.poLineId || item.po_line_id || 0) || null;
    return baseRows.some((other) => (
      other.id !== item.id &&
      String(other.doNumber || '').trim().toLowerCase() === doNumber &&
      (
        (poLineId && Number(other.poLineId || other.po_line_id || 0) === poLineId) ||
        (!poLineId && other.poNumber === item.poNumber && (other.itemCode || other.item_code || other.item) === itemCode)
      )
    ));
  };

  const handleEdit = (item) => {
    if (!item) return;
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
    setNewPlan(DEFAULT_PLAN);
    setScheduleEditForm({
      id: item.id,
      poNumber: item.poNumber || '',
      supplier: item.supplier || '',
      supplierName: item.supplierName || item.supplier_name || '',
      item: item.item || item.itemCode || '',
      itemName: item.itemName || item.item_name || '',
      requestDate: item.requestDate || '',
      requestQty: item.requestQty ?? '',
      deliveryTime: item.deliveryTime || '',
    });
    setScheduleEditError('');
    setScheduleEditOpen(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
    setNewPlan(DEFAULT_PLAN);
  };

  const handleAddPlan = async (e) => {
    if (!canEditSchedules) { alert("Anda tidak memiliki akses edit."); return; }
    e.preventDefault();
    if (!schedulesLoaded) {
      await ensureSchedulesLoaded();
    }
    const selectedLines = Array.isArray(newPlan.selectedLines) ? newPlan.selectedLines.filter((line) => line && line.item) : [];
    const hasMultiLines = selectedLines.length > 1;
    if (!newPlan.poNumber || !newPlan.supplier || !newPlan.requestDate || (!hasMultiLines && (!newPlan.item || !newPlan.requestQty))) { alert("Mohon lengkapi data!"); return; }
    const selectedLineNsp = Number(selectedLines[0]?.packQty || 0);
    const qtyInfo = normalizeQtyWithNsp(newPlan.requestQty, newPlan.item, selectedLineNsp);
    const normalizedRequestQty = qtyInfo.normalized;
    if (qtyInfo.nsp > 0 && qtyInfo.normalized !== qtyInfo.raw && showToastMessage) {
      showToastMessage(`Qty dibulatkan ke kelipatan NSP ${qtyInfo.nsp}: ${qtyInfo.raw} → ${qtyInfo.normalized}.`);
    }
    const dailyInfo = normalizeQtyWithNsp(newPlan.dailyQty, newPlan.item);
    const normalizedDailyQty = dailyInfo.normalized;
    if (dailyInfo.nsp > 0 && dailyInfo.raw > 0 && dailyInfo.normalized !== dailyInfo.raw && showToastMessage) {
      showToastMessage(`Kapasitas harian dibulatkan ke kelipatan NSP ${dailyInfo.nsp}: ${dailyInfo.raw} → ${dailyInfo.normalized}.`);
    }
    if (isEditing) {
      try {
        const existing = schedules.find(item => item.id === editingId);
        if (!existing) { alert("Data tidak ditemukan."); return; }
        const candidate = {
          ...existing,
          poNumber: newPlan.poNumber,
          supplier: newPlan.supplier,
          item: newPlan.item,
          requestDate: newPlan.requestDate,
          deliveryTime: newPlan.deliveryTime,
        };
        if (isDuplicateSchedule(candidate, editingId)) {
          alert("Jadwal duplikat terdeteksi (PO, Supplier, Item, Tanggal, Jam).");
          return;
        }
        let newStatus = existing.status;
        if (existing.arrivalDate) {
          newStatus = resolveTimingStatus(newPlan.requestDate, existing.arrivalDate);
        }
        const selectedLineId = resolvePoLineIdValue(selectedLines[0]);
        const updatedPayload = {
          ...existing,
          poNumber: newPlan.poNumber,
          supplier: newPlan.supplier,
          item: newPlan.item,
          itemCode: newPlan.item || existing.itemCode,
          poLineId: selectedLineId || existing.poLineId,
          requestDate: newPlan.requestDate,
          requestQty: normalizedRequestQty,
          deliveryTime: newPlan.deliveryTime,
          status: newStatus,
        };
        const updatedRow = await updateSchedule(editingId, updatedPayload);
        const mergedRow = mergeScheduleRow(existing, updatedRow);
        setSchedules(schedules.map(item => (item.id === editingId ? mergedRow : item)));
        setFilteredSchedules((prev) => prev.map((item) => (item.id === editingId ? mergeScheduleRow(item, updatedRow) : item)));
        alert("Update Berhasil!");
        handleCancelEdit();
      } catch (error) {
        console.error("Update Error:", error);
        alert(`Gagal update data ke database: ${error.message || 'Unknown error'}`);
      }
    } else {
      if (hasMultiLines) {
        let payloadLines = [];
        const adjustedLines = [];
        const skippedLines = [];
        if (inputMode === 'bulk') {
          const dailyCap = normalizedDailyQty;
          const cycle = parseInt(newPlan.cycleDays, 10) || 1;
          if (!dailyCap || dailyCap <= 0) { alert("Kapasitas kirim tidak valid!"); return; }
          selectedLines.forEach((line) => {
            const lineQtyRaw = Number(line.qty ?? line.requestQty ?? 0);
            const qtyInfoLine = normalizeQtyDownWithNsp(lineQtyRaw, line.item, line.packQty);
            if (qtyInfoLine.nsp > 0 && qtyInfoLine.normalized !== qtyInfoLine.raw) {
              adjustedLines.push(line.item);
            }
            let remaining = qtyInfoLine.normalized;
            if (!Number.isFinite(remaining) || remaining <= 0) {
              skippedLines.push(line.item);
              return;
            }
            let currentDate = new Date(newPlan.requestDate);
            currentDate = getNextBusinessDay(currentDate);
            let counter = 1;
            while (remaining > 0) {
              const qtyToSend = Math.min(dailyCap, remaining);
              const yyyy = currentDate.getFullYear();
              const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
              const dd = String(currentDate.getDate()).padStart(2, '0');
              const poLineId = resolvePoLineIdValue(line);
              payloadLines.push({
                ...newPlan,
                item: line.item,
                itemCode: line.item,
                poLineId,
                requestDate: `${yyyy}-${mm}-${dd}`,
                requestQty: qtyToSend,
                arrivalDate: '',
                receivedQty: 0,
                status: 'Pending',
                notes: `Pengiriman ke-${counter} (Split PO)`,
                hasSplit: false,
                isSplitResult: false,
                actualLocked: false,
              });
              remaining -= qtyToSend;
              counter++;
              currentDate.setDate(currentDate.getDate() + cycle);
              currentDate = getNextBusinessDay(currentDate);
            }
          });
        } else {
          payloadLines = selectedLines.map((line) => {
            const lineQtyRaw = Number(line.qty ?? line.requestQty ?? 0);
            const qtyInfoLine = normalizeQtyDownWithNsp(lineQtyRaw, line.item, line.packQty);
            if (qtyInfoLine.nsp > 0 && qtyInfoLine.normalized !== qtyInfoLine.raw) {
              adjustedLines.push(line.item);
            }
            return {
              ...newPlan,
              item: line.item,
              itemCode: line.item,
              poLineId: resolvePoLineIdValue(line),
              requestQty: qtyInfoLine.normalized,
              arrivalDate: '',
              receivedQty: 0,
              status: 'Pending',
              notes: '',
              hasSplit: false,
              isSplitResult: false,
              actualLocked: false,
            };
          }).filter((row) => {
            if (Number(row.requestQty) > 0) return true;
            skippedLines.push(row.item);
            return false;
          });
        }
        if (adjustedLines.length > 0 && showToastMessage) {
          showToastMessage(`${adjustedLines.length} item disesuaikan ke kelipatan pack agar tidak melebihi sisa PO.`);
        }
        if (skippedLines.length > 0 && showToastMessage) {
          showToastMessage(`${skippedLines.length} item dilewati karena sisa PO lebih kecil dari kelipatan pack.`, '', null, 'error');
        }
        if (payloadLines.length === 0) {
          alert("Tidak ada item valid untuk dijadwalkan.");
          return;
        }
        const existingKeys = new Set(schedules.filter((row) => !row.isSplitResult).map(getScheduleUniqueKey));
        const batchKeys = new Set();
        const hasDuplicate = payloadLines.some((item) => {
          const key = getScheduleUniqueKey(item);
          if (existingKeys.has(key) || batchKeys.has(key)) return true;
          batchKeys.add(key);
          return false;
        });
        if (hasDuplicate) {
          alert("Jadwal duplikat terdeteksi (PO, Supplier, Item, Tanggal, Jam).");
          return;
        }
        try {
          const createdItems = await createSchedulesBulk(payloadLines);
          setSchedules([...schedules, ...createdItems]);
          await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
          alert(`Berhasil membuat ${createdItems.length} jadwal!`);
        } catch (error) {
          await handleCreateScheduleError(error, "Create Multi Error:");
          return;
        }
      } else if (inputMode === 'bulk') {
        const totalQty = normalizedRequestQty;
        const dailyCap = normalizedDailyQty;
        const cycle = parseInt(newPlan.cycleDays, 10) || 1;
        if (!dailyCap || dailyCap <= 0) { alert("Kapasitas kirim tidak valid!"); return; }
        const newItems = [];
        let remaining = totalQty;
        let currentDate = new Date(newPlan.requestDate);
        currentDate = getNextBusinessDay(currentDate);
        let counter = 1;
        const singleLineId = resolvePoLineIdValue(selectedLines[0]);
        while (remaining > 0) {
          const qtyToSend = Math.min(dailyCap, remaining);
          const yyyy = currentDate.getFullYear();
          const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
          const dd = String(currentDate.getDate()).padStart(2, '0');
          newItems.push({
            id: Date.now() + Math.random(),
            ...newPlan,
            itemCode: newPlan.item,
            poLineId: singleLineId,
            requestDate: `${yyyy}-${mm}-${dd}`,
            requestQty: qtyToSend,
            arrivalDate: '',
            receivedQty: 0,
            status: 'Pending',
            notes: `Pengiriman ke-${counter} (Split PO)`,
            hasSplit: false,
            isSplitResult: false,
            actualLocked: false,
          });
          remaining -= qtyToSend;
          counter++;
          currentDate.setDate(currentDate.getDate() + cycle);
          currentDate = getNextBusinessDay(currentDate);
        }
        const existingKeys = new Set(schedules.filter((row) => !row.isSplitResult).map(getScheduleUniqueKey));
        const batchKeys = new Set();
        const hasDuplicate = newItems.some((item) => {
          const key = getScheduleUniqueKey(item);
          if (existingKeys.has(key) || batchKeys.has(key)) return true;
          batchKeys.add(key);
          return false;
        });
        if (hasDuplicate) {
          alert("Jadwal duplikat terdeteksi (PO, Supplier, Item, Tanggal, Jam).");
          return;
        }
        try {
          const createdItems = await createSchedulesBulk(newItems);
          setSchedules([...schedules, ...createdItems]);
          await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
          alert(`Berhasil membuat ${createdItems.length} jadwal!`);
        } catch (error) {
          await handleCreateScheduleError(error, "Create Bulk Error:");
          return;
        }
      } else {
        try {
          const singleLineId = resolvePoLineIdValue(selectedLines[0]);
          const candidate = {
            ...newPlan,
            itemCode: newPlan.item,
            poLineId: singleLineId,
            requestQty: normalizedRequestQty,
            arrivalDate: '',
            receivedQty: 0,
            status: 'Pending',
            notes: '',
            hasSplit: false,
            isSplitResult: false,
            actualLocked: false,
          };
          if (isDuplicateSchedule(candidate)) {
            alert("Jadwal duplikat terdeteksi (PO, Supplier, Item, Tanggal, Jam).");
            return;
          }
          const createdItem = await createSchedule(candidate);
          setSchedules([...schedules, createdItem]);
          await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
        } catch (error) {
          await handleCreateScheduleError(error, "Create Error:");
          return;
        }
      }
      setShowForm(false);
    }
  };

  const handlePrintPDF = async () => {
    if (typeof window === 'undefined') return;
    const rows = Array.isArray(filteredSchedules) ? filteredSchedules : [];
    if (rows.length === 0) {
      alert('Data kosong!');
      return;
    }
    setPrintSnapshot([...rows]);
    setShowInboundPrint(true);
  };

  useEffect(() => {
    if (!showInboundPrint && printSnapshot) {
      setPrintSnapshot(null);
    }
  }, [showInboundPrint, printSnapshot]);

  const handleResetData = async () => {
    if (!canResetAll) { alert("Anda tidak memiliki akses hapus semua."); return; }
    if (!window.confirm('Hapus SEMUA data?')) return;
    try {
      await deleteAllSchedules();
      setSchedules([]);
      setFilteredSchedules([]);
      setScheduleTotal(0);
      setScheduleTotalPages(1);
    } catch (error) {
      console.error("Reset Error:", error);
      alert("Gagal menghapus data di database.");
    }
  };

  const handleDelete = async (id) => {
    if (!canEditSchedules) { alert("Anda tidak memiliki akses edit."); return; }
    if (!window.confirm('Hapus baris ini?')) return;
    try {
      await deleteSchedule(id);
      setSchedules(schedules.filter(i => i.id !== id));
      await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Gagal menghapus data di database.");
    }
  };

  const handleUpdateActual = (id, field, value) => {
    if (isStockOpnameLocked) { return; }
    if (!canEditSchedules) { return; }
    const applyUpdate = (items) => items.map((item) => {
      if (item.id === id) {
        if (item.actualLocked) { return item; }
        const updatedItem = { ...item, [field]: value };
        if (field === 'arrivalDate') {
          updatedItem.status = resolveTimingStatus(updatedItem.requestDate, value);
        }
        const timers = scheduleUpdateTimers.current;
        if (timers.has(id)) clearTimeout(timers.get(id));
        const timeoutId = setTimeout(async () => {
          timers.delete(id);
          try {
            await updateSchedule(id, updatedItem);
          } catch (error) {
            console.error("Update Actual Error:", error);
          }
        }, 600);
        timers.set(id, timeoutId);
        return updatedItem;
      }
      return item;
    });
    setSchedules(applyUpdate);
    setFilteredSchedules(applyUpdate);
  };

  const handleSaveActual = async (item) => {
    if (isStockOpnameLocked) { alert('Selesaikan dulu Stock Opname!'); return; }
    if (!canEditSchedules) { alert("Anda tidak memiliki akses edit."); return; }
    if (item.actualLocked) { alert("Data aktual sudah dikunci."); return; }
    if (isDuplicateDoNumber(item)) { alert("Nomor SJ duplikat untuk PO/Item yang sama."); return; }
    if (!item.doNumber || !String(item.doNumber).trim()) { alert("Nomor Surat Jalan wajib diisi."); return; }
    if (!item.arrivalDate) { alert("Tanggal tiba wajib diisi."); return; }
    if (!item.receivedQty || Number(item.receivedQty) <= 0) { alert("Qty tiba harus diisi."); return; }
    try {
      const sjCheck = await apiFetch('/api/schedules/check-sj', {
        method: 'POST',
        body: JSON.stringify({
          doNumber: item.doNumber,
          ignoreIds: [item.id],
          items: [{
            poNumber: item.poNumber,
            itemCode: item.itemCode || item.item_code || item.item,
            poLineId: item.poLineId || item.po_line_id,
          }],
        }),
      });
      if (sjCheck?.status === 'block') {
        alert(`Nomor SJ "${item.doNumber}" sudah pernah dipakai untuk PO/Item yang sama. Input dibatalkan.`);
        return;
      }
      if (sjCheck?.status === 'warn') {
        const matches = Array.isArray(sjCheck.matches) ? sjCheck.matches : [];
        const preview = matches.slice(0, 3)
          .map((row) => `${row.itemName || row.itemCode || '-'} / ${row.poNumber || '-'}`)
          .join(', ');
        const suffix = matches.length > 3 ? ` dan ${matches.length - 3} lainnya` : '';
        const message = matches.length > 0
          ? `Peringatan: Nomor SJ "${item.doNumber}" sudah pernah diinput sebelumnya untuk barang ${preview}${suffix}. Apakah ini adalah pengiriman gabungan?`
          : `Peringatan: Nomor SJ "${item.doNumber}" sudah pernah dipakai sebelumnya. Apakah ini pengiriman gabungan?`;
        const ok = window.confirm(message);
        if (!ok) return;
      }
    } catch (error) {
      console.error('SJ Check Error:', error);
      alert('Gagal memeriksa duplikasi Nomor SJ. Silakan coba lagi.');
      return;
    }
    const receivedQty = Number(item.receivedQty || 0);
    const nsp = typeof resolveNspForItem === 'function' ? resolveNspForItem(item.item) : 0;
    if (nsp > 0 && receivedQty > 0 && receivedQty % nsp !== 0) {
      const ok = window.confirm(`Qty yang diterima (${receivedQty}) tidak sesuai Standar Packing (${nsp}). Apakah Anda yakin melanjutkan penerimaan Loose Item?`);
      if (!ok) return;
    }
    const confirmed = window.confirm("Simpan data aktual? Setelah disimpan, data aktual tidak bisa diubah.");
    if (!confirmed) return;
    const timers = scheduleUpdateTimers.current;
    if (timers.has(item.id)) {
      clearTimeout(timers.get(item.id));
      timers.delete(item.id);
    }
    try {
      const newStatus = resolveTimingStatus(item.requestDate, item.arrivalDate);
      const payload = { ...item, receivedQty, status: newStatus, actualLocked: true };
      const updated = await updateSchedule(item.id, payload);
      setSchedules(prev => prev.map(s => (s.id === item.id ? mergeScheduleRow(s, updated) : s)));
      setFilteredSchedules(prev => prev.map(s => (s.id === item.id ? mergeScheduleRow(s, updated) : s)));
      alert("Data aktual tersimpan.");
    } catch (error) {
      console.error("Save Actual Error:", error);
      alert("Gagal menyimpan data aktual.");
    }
  };

  const handleUnlockActual = async (item) => {
    if (user?.role !== 'admin') { alert("Hanya admin yang bisa membuka kunci."); return; }
    const confirmed = window.confirm("Buka kunci data aktual? Setelah dibuka, data aktual bisa diubah.");
    if (!confirmed) return;
    try {
      const updated = await unlockSchedule(item.id);
      setSchedules(prev => prev.map(s => (s.id === item.id ? mergeScheduleRow(s, updated) : s)));
      setFilteredSchedules(prev => prev.map(s => (s.id === item.id ? mergeScheduleRow(s, updated) : s)));
      alert("Kunci dibuka.");
    } catch (error) {
      console.error("Unlock Actual Error:", error);
      alert(`Gagal membuka kunci: ${error.message || 'Unknown error'}`);
    }
  };

  const handleExportExcel = async () => {
    if (!canImportExport) { alert("Anda tidak memiliki akses export."); return; }
    const rows = Array.isArray(filteredSchedules) ? filteredSchedules : [];
    if (rows.length === 0) {
      alert('Data kosong!');
      return;
    }
    const resolveDisplayQty = (row) => row?.requestQty ?? '-';
    const tableContent = `<html><head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table border="1"><thead><tr style="background-color:#4f46e5;color:white;"><th>No PO</th><th>Supplier</th><th>Item</th><th>Tgl Rencana</th><th>Jam Kirim</th><th>Qty Rencana</th><th>Tgl Tiba</th><th>Qty Tiba</th><th>Status</th><th>Catatan</th></tr></thead><tbody>${rows.map(i => `<tr><td>${i.poNumber}</td><td>${i.supplierName || i.supplier}</td><td>${i.item}</td><td>${i.requestDate}</td><td>${i.deliveryTime}</td><td>${resolveDisplayQty(i)}</td><td>${i.arrivalDate||"-"}</td><td>${i.receivedQty||0}</td><td>${i.status}</td><td>${i.notes}</td></tr>`).join('')}</tbody></table></body></html>`;
    const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = async () => {
    if (!canImportSchedules) { alert("Anda tidak memiliki akses import jadwal."); return; }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const templateData = [
      { "No PO": "PO-SPLIT-01", "Supplier (Opsional)": "SUP-001", "Kode Barang": "RM-0001", "Nama Barang (Opsional)": "Semen 500 Zak", "Tanggal Rencana (YYYY-MM-DD)": "2025-12-01", "Jam Kirim": "08:00", "No SJ/DO (Opsional)": "", "Qty Order": 1000, "Kapasitas Harian (Untuk Split)": 200, "Siklus (Hari)": 1 },
      { "No PO": "PO-SINGLE-02", "Supplier (Opsional)": "SUP-002", "Kode Barang": "RM-0002", "Nama Barang (Opsional)": "Besi", "Tanggal Rencana (YYYY-MM-DD)": "2025-12-02", "Jam Kirim": "13:30", "No SJ/DO (Opsional)": "SJ-0001", "Qty Order": 500, "Kapasitas Harian (Untuk Split)": "", "Siklus (Hari)": "" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Import");
    XLSX.writeFile(wb, "Template_Import_Jadwal.xlsx");
  };

  const handleImportExcel = async (e) => {
    const fileInput = e?.target;
    if (!canImportSchedules) {
      if (showToastMessage) {
        showToastMessage("Anda tidak memiliki akses import jadwal.", "", null, "error");
      } else {
        alert("Anda tidak memiliki akses import jadwal.");
      }
      if (fileInput) fileInput.value = "";
      return;
    }
    const file = fileInput?.files?.[0];
    if (!file) return;
    const XLSX = await ensureXlsx();
    if (!XLSX) {
      if (showToastMessage) {
        showToastMessage("Library XLSX belum siap. Coba reload halaman.", "", null, "error");
      } else {
        alert("Library XLSX belum siap. Coba reload halaman.");
      }
      if (fileInput) fileInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      if (showToastMessage) {
        showToastMessage("Gagal membaca file Excel.", "", null, "error");
      } else {
        alert("Gagal membaca file Excel.");
      }
      if (fileInput) fileInput.value = "";
    };
    reader.onload = async (evt) => {
      try {
        if (showToastMessage) {
          showToastMessage("Memproses file Excel...", "", null, "info");
        }
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          if (showToastMessage) {
            showToastMessage("File Excel kosong!", "", null, "error");
          } else {
            alert("File Excel kosong!");
          }
          if (fileInput) fileInput.value = "";
          return;
        }
        const normalizeKey = (value) => String(value || '').trim().toLowerCase();
        const pickRowValue = (row, keys = [], contains = []) => {
          const keyMap = new Map();
          Object.keys(row || {}).forEach((key) => {
            keyMap.set(normalizeKey(key), row[key]);
          });
          for (const key of keys) {
            const normalized = normalizeKey(key);
            if (keyMap.has(normalized)) return keyMap.get(normalized);
          }
          for (const part of contains) {
            const normalizedPart = normalizeKey(part);
            for (const [k, v] of keyMap.entries()) {
              if (k.includes(normalizedPart)) return v;
            }
          }
          return '';
        };

        const poDetailCache = new Map();
        const getPoDetail = async (poNumber) => {
          const normalized = String(poNumber || '').trim();
          if (!normalized) return { header: null, lines: [] };
          if (poDetailCache.has(normalized)) return poDetailCache.get(normalized);
          const detail = await apiFetch(`/api/po/${encodeURIComponent(normalized)}`);
          const lines = Array.isArray(detail?.lines) ? detail.lines : [];
          const payload = { header: detail?.header || null, lines };
          poDetailCache.set(normalized, payload);
          return payload;
        };

        const errors = [];
        let newSchedules = [];
        for (let rowIndex = 0; rowIndex < data.length; rowIndex += 1) {
          const row = data[rowIndex];
          const poNumberRaw = pickRowValue(row, ["No PO", "PO", "PO Number", "Nomor PO", "PO No"], ["po"]);
          const poNumber = String(poNumberRaw || '').trim();
          if (!poNumber) {
            errors.push({ row: rowIndex + 2, error: "No PO kosong." });
            continue;
          }
          const itemCodeRaw = pickRowValue(row, ["Kode Barang", "Kode Item", "Item Code", "Item", "Kode"], ["kode", "item code"]);
          const itemNameRaw = pickRowValue(row, ["Nama Barang", "Nama Item", "Deskripsi", "Item Name", "Nama Barang (Opsional)"], ["nama", "deskripsi"]);
          const itemCode = String(itemCodeRaw || '').trim();
          const itemName = String(itemNameRaw || '').trim();
          const poDetail = await getPoDetail(poNumber);
          const lines = Array.isArray(poDetail?.lines) ? poDetail.lines : [];
          if (!Array.isArray(lines) || lines.length === 0) {
            errors.push({ row: rowIndex + 2, error: `PO ${poNumber} tidak ditemukan atau tidak memiliki item.` });
            continue;
          }
          let resolvedItemCode = '';
          let resolvedLineId = null;
          if (itemCode) {
            const match = lines.find((line) => String(line.item_code || '').trim().toLowerCase() === itemCode.toLowerCase());
            if (!match) {
              errors.push({ row: rowIndex + 2, error: `Item ${itemCode} tidak ada di PO ${poNumber}.` });
              continue;
            }
            resolvedItemCode = String(match.item_code || '').trim();
            resolvedLineId = resolvePoLineIdValue(match);
          } else if (itemName) {
            const nameMatches = lines.filter((line) => String(line.item_name || '').trim().toLowerCase() === itemName.toLowerCase());
            if (nameMatches.length === 1) {
              resolvedItemCode = String(nameMatches[0].item_code || '').trim();
              resolvedLineId = resolvePoLineIdValue(nameMatches[0]);
            } else if (nameMatches.length > 1) {
              errors.push({ row: rowIndex + 2, error: `Nama barang "${itemName}" ambigu di PO ${poNumber}. Gunakan Kode Barang.` });
              continue;
            } else {
              errors.push({ row: rowIndex + 2, error: `Nama barang "${itemName}" tidak ada di PO ${poNumber}.` });
              continue;
            }
          } else {
            errors.push({ row: rowIndex + 2, error: `Kode Barang kosong untuk PO ${poNumber}.` });
            continue;
          }

          let timeStr = String(pickRowValue(row, ["Jam Kirim", "Jam", "Jam Kirim (Cycle)"], ["jam"]) || "08:00");
          let cycleTime = '08:00 (Cycle 1)';
          if (timeStr.includes('13')) cycleTime = '13:30 (Cycle 2)';
          else if (timeStr.includes('20')) cycleTime = '20:30 (Cycle 3)';
          else if (timeStr.includes('01')) cycleTime = '01:30 (Cycle 4)';
          const arrivalDateRaw = pickRowValue(row, ["Tanggal Tiba (Opsional)", "Tanggal Tiba", "Tgl Tiba"], ["tiba"]);
          const receivedQtyRaw = pickRowValue(row, ["Qty Terima (Opsional)", "Qty Terima", "Qty Tiba"], ["terima", "tiba"]);
          const arrivalDateStr = String(formatExcelDate(arrivalDateRaw) || '').trim();
          const receivedQtyNum = Number(receivedQtyRaw || 0);
          if (arrivalDateStr || (Number.isFinite(receivedQtyNum) && receivedQtyNum > 0)) {
            errors.push({
              row: rowIndex + 2,
              error: `Kolom actual (Tanggal Tiba/Qty Terima) tidak diperbolehkan saat import jadwal. Gunakan proses Receive.`,
            });
            continue;
          }
          const doNumberRaw = pickRowValue(row, ["No SJ/DO (Opsional)", "No SJ/DO", "No SJ", "No SJ/DO (Optional)", "DO", "SJ"], ["sj", "do"]);
          const doNumber = doNumberRaw ? String(doNumberRaw).trim() : "";
          const requestDateStr = formatExcelDate(pickRowValue(row, ["Tanggal Rencana (YYYY-MM-DD)", "Tanggal Rencana", "Tgl Rencana"], ["rencana"]) || new Date());
          const qtyOrder = parseInt(pickRowValue(row, ["Qty Order", "Qty Rencana", "Qty"], ["qty"]), 10) || 0;
          if (!qtyOrder || qtyOrder <= 0) {
            errors.push({ row: rowIndex + 2, error: `Qty Order tidak valid untuk PO ${poNumber}.` });
            continue;
          }
          const baseObj = {
            id: Date.now() + Math.random(),
            poNumber,
            supplier: "",
            item: resolvedItemCode,
            itemCode: resolvedItemCode,
            poLineId: resolvedLineId,
            requestDate: requestDateStr,
            requestQty: qtyOrder,
            deliveryTime: cycleTime,
            doNumber,
            arrivalDate: '',
            receivedQty: 0,
            status: 'Pending',
            notes: 'Imported',
            hasSplit: false,
            actualLocked: false,
          };
          const dailyCap = parseInt(pickRowValue(row, ["Kapasitas Harian (Untuk Split)", "Kapasitas Harian"], ["kapasitas"]), 10);
          const totalQty = qtyOrder;
          const cycleDays = parseInt(pickRowValue(row, ["Siklus (Hari)", "Siklus"], ["siklus"]), 10) || 1;
          if (dailyCap && dailyCap > 0 && dailyCap < totalQty) {
            let remaining = totalQty; let currentDate = new Date(baseObj.requestDate); currentDate = getNextBusinessDay(currentDate); let counter = 1;
            while (remaining > 0) {
              const qtyToSend = Math.min(dailyCap, remaining); const yyyy = currentDate.getFullYear(); const mm = String(currentDate.getMonth() + 1).padStart(2, '0'); const dd = String(currentDate.getDate()).padStart(2, '0');
              newSchedules.push({ ...baseObj, id: Date.now() + Math.random(), requestDate: `${yyyy}-${mm}-${dd}`, requestQty: qtyToSend, arrivalDate: '', receivedQty: 0, status: 'Pending', notes: `Imported (Split ${counter})`, actualLocked: false });
              remaining -= qtyToSend; counter++; currentDate.setDate(currentDate.getDate() + cycleDays); currentDate = getNextBusinessDay(currentDate);
            }
          } else { newSchedules.push(baseObj); }
        }
        if (errors.length > 0) {
          console.error("Import validation errors:", errors);
          const preview = errors.slice(0, 5).map((err) => `Baris ${err.row}: ${err.error}`).join('\n');
          if (showToastMessage) {
            showToastMessage(`Import dibatalkan. ${errors.length} baris tidak valid.`, "", null, "error");
          } else {
            alert(`Import dibatalkan. ${errors.length} baris tidak valid.`);
          }
          if (preview) {
            alert(preview + (errors.length > 5 ? `\n...dan ${errors.length - 5} baris lainnya.` : ""));
          }
          if (fileInput) fileInput.value = "";
          return;
        }
        const sanitizeSchedule = (item) => ({
          poNumber: item.poNumber,
          supplier: item.supplier,
          item: item.item,
          itemCode: item.itemCode || item.item,
          poLineId: item.poLineId,
          requestDate: item.requestDate,
          deliveryTime: item.deliveryTime,
          requestQty: item.requestQty,
          doNumber: item.doNumber,
          arrivalDate: item.arrivalDate,
          receivedQty: item.receivedQty,
          status: item.status,
          notes: item.notes,
          hasSplit: item.hasSplit,
          isSplitResult: item.isSplitResult,
          actualLocked: item.actualLocked,
        });
        const batchSize = 100;
        let totalCreated = 0;
        for (let i = 0; i < newSchedules.length; i += batchSize) {
          const batch = newSchedules.slice(i, i + batchSize).map(sanitizeSchedule);
          const createdBatch = await createSchedulesBulk(batch);
          if (!Array.isArray(createdBatch)) {
            throw new Error("Response import tidak valid.");
          }
          totalCreated += createdBatch.length;
          if (createdBatch.length > 0) {
            setSchedules((prev) => [...prev, ...createdBatch]);
          }
        }
        await refreshSchedules({ page: schedulePage, perPage: schedulePerPage, silent: true });
        if (totalCreated === 0) {
          if (showToastMessage) {
            showToastMessage("Import selesai, tapi tidak ada data yang masuk. Periksa format/isi file.", "", null, "error");
          } else {
            alert("Import selesai, tapi tidak ada data yang masuk. Periksa format/isi file.");
          }
        } else if (showToastMessage) {
          showToastMessage(`Berhasil mengimport ${totalCreated} jadwal!`, "", null, "success");
        } else {
          alert(`Berhasil mengimport ${totalCreated} jadwal!`);
        }
        if (fileInput) fileInput.value = "";
      } catch (error) {
        console.error("Import Error:", error);
        if (showToastMessage) {
          showToastMessage(`Gagal import: ${error.message || 'Unknown error'}`, "", null, "error");
        } else {
          alert(`Gagal menyimpan data import ke database: ${error.message || 'Unknown error'}`);
        }
        if (fileInput) fileInput.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const closeScheduleEdit = () => {
    setScheduleEditOpen(false);
    setScheduleEditForm(DEFAULT_EDIT_FORM);
    setScheduleEditError('');
    setScheduleEditSaving(false);
  };

  const handleScheduleEditSave = async () => {
    if (!canEditSchedules) { alert("Anda tidak memiliki akses edit."); return; }
    const id = scheduleEditForm.id;
    const existing = schedules.find((row) => row.id === id)
      || filteredSchedules.find((row) => row.id === id);
    if (!existing) {
      setScheduleEditError('Data tidak ditemukan.');
      return;
    }
    const requestDate = String(scheduleEditForm.requestDate || '').trim();
    if (!requestDate) {
      setScheduleEditError('Tanggal jadwal wajib diisi.');
      return;
    }
    const qtyInfo = normalizeQtyWithNsp(scheduleEditForm.requestQty, existing.item || existing.itemCode);
    if (qtyInfo.raw <= 0) {
      setScheduleEditError('Qty plan wajib diisi.');
      return;
    }
    if (qtyInfo.nsp > 0 && qtyInfo.normalized !== qtyInfo.raw && showToastMessage) {
      showToastMessage(`Qty dibulatkan ke kelipatan NSP ${qtyInfo.nsp}: ${qtyInfo.raw} -> ${qtyInfo.normalized}.`);
    }
    const deliveryTime = String(scheduleEditForm.deliveryTime || existing.deliveryTime || '08:00 (Cycle 1)').trim();
    const candidate = { ...existing, requestDate, deliveryTime };
    if (isDuplicateSchedule(candidate, existing.id)) {
      setScheduleEditError('Jadwal duplikat terdeteksi (PO, Supplier, Item, Tanggal, Jam).');
      return;
    }
    let newStatus = existing.status;
    if (existing.arrivalDate) {
      newStatus = resolveTimingStatus(requestDate, existing.arrivalDate);
    }
    const payload = {
      ...existing,
      requestDate,
      requestQty: qtyInfo.normalized,
      deliveryTime,
      status: newStatus,
    };
    setScheduleEditSaving(true);
    setScheduleEditError('');
    try {
      const updatedRow = await updateSchedule(existing.id, payload);
      const mergedRow = mergeScheduleRow(existing, updatedRow);
      setSchedules((prev) => prev.map((row) => (row.id === existing.id ? mergedRow : row)));
      setFilteredSchedules((prev) => prev.map((row) => (row.id === existing.id ? mergeScheduleRow(row, updatedRow) : row)));
      if (showToastMessage) {
        showToastMessage('Jadwal berhasil diperbarui.');
      } else {
        alert('Update Berhasil!');
      }
      closeScheduleEdit();
    } catch (error) {
      setScheduleEditError(`Gagal update data: ${error.message || 'Unknown error'}`);
    } finally {
      setScheduleEditSaving(false);
    }
  };

  const handleSendEmail = async (item) => {
    if (!item?.supplier || !item?.requestDate) {
      alert('Supplier dan tanggal jadwal wajib diisi.');
      return;
    }
    const targetSupplier = item.supplier;
    const targetDate = item.requestDate;
    const exportRows = await ensureSchedulesLoaded();
    const rows = Array.isArray(exportRows) ? exportRows : schedules;
    const dailyItems = rows.filter((row) => row.supplier === targetSupplier && row.requestDate === targetDate);
    if (dailyItems.length === 0) {
      alert('Tidak ada data schedule untuk dikirim.');
      return;
    }

    const { jsPDF, autoTable } = await loadPdfModules();
    if (!jsPDF || !autoTable) {
      alert('Modul PDF belum siap. Jalankan: npm install jspdf jspdf-autotable');
      return;
    }

    if (showToastMessage) {
      showToastMessage('Menyiapkan PDF inbound schedule...', '', null, 'info');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const supplierLabel = String(targetSupplier || '-').trim();
    const dateLabel = formatDateID(targetDate);
    const summary = dailyItems.reduce((acc, row) => {
      const planQty = Number(row.requestQty || 0);
      const actualQty = Number(row.receivedQty || 0);
      acc.plan += planQty;
      acc.actual += actualQty;
      if (String(row.status || '').toLowerCase() === 'pending') acc.pending += 1;
      if (actualQty > 0 && actualQty < planQty) acc.partial += 1;
      return acc;
    }, { plan: 0, actual: 0, pending: 0, partial: 0 });

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Inbound Schedule Supplier', margin, 44);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Supplier: ${supplierLabel}`, margin, 64);
    doc.text(`Tanggal Schedule: ${dateLabel}`, margin, 80);
    doc.text(`Total Baris: ${dailyItems.length}`, margin, 96);
    doc.text(
      `Plan Qty: ${summary.plan.toLocaleString('id-ID')} | Actual Qty: ${summary.actual.toLocaleString('id-ID')} | Pending: ${summary.pending} | Partial: ${summary.partial}`,
      margin,
      112,
    );
    doc.text(`Print Date: ${new Date().toLocaleDateString('id-ID')}`, pageWidth - margin, 64, { align: 'right' });

    autoTable(doc, {
      startY: 132,
      margin: { left: margin, right: margin, bottom: 36 },
      theme: 'grid',
      head: [[
        'No',
        'No PO',
        'Item',
        'Jam Kirim',
        'No SJ',
        'Qty Plan',
        'Qty Actual',
        'Status',
        'Catatan',
      ]],
      body: dailyItems.map((row, index) => ([
        index + 1,
        row.poNumber || '-',
        row.item || '-',
        row.deliveryTime || '-',
        row.doNumber || '-',
        Number(row.requestQty || 0).toLocaleString('id-ID'),
        Number(row.receivedQty || 0).toLocaleString('id-ID'),
        row.status || 'Pending',
        row.notes || '-',
      ])),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        lineWidth: 0.2,
        lineColor: [203, 213, 225],
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 92 },
        2: { cellWidth: 176 },
        3: { cellWidth: 72, halign: 'center' },
        4: { cellWidth: 84 },
        5: { cellWidth: 66, halign: 'right' },
        6: { cellWidth: 66, halign: 'right' },
        7: { cellWidth: 70, halign: 'center' },
        8: { cellWidth: 'auto' },
      },
    });

    const pdfBlob = doc.output('blob');
    const pdfBase64 = await blobToBase64(pdfBlob);
    const fileName = `INBOUND_SCHEDULE_${sanitizeFilenamePart(supplierLabel)}_${sanitizeFilenamePart(targetDate)}.pdf`;

    try {
      const result = await apiFetch('/api/schedules/send-pdf-email', {
        method: 'POST',
        body: JSON.stringify({
          supplier: targetSupplier,
          requestDate: targetDate,
          fileName,
          pdfBase64,
          summary: {
            totalRows: dailyItems.length,
            planQty: summary.plan,
            actualQty: summary.actual,
            pendingCount: summary.pending,
            partialCount: summary.partial,
          },
        }),
      });
      const successMessage = result?.to
        ? `PDF schedule berhasil dikirim ke ${result.to}.`
        : 'PDF schedule berhasil dikirim.';
      if (showToastMessage) {
        showToastMessage(successMessage, '', null, 'success');
      } else {
        alert(successMessage);
      }
    } catch (error) {
      alert(`Gagal mengirim PDF schedule: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSendEmailReminder = async (item) => {
    if (!item?.supplier || !item?.requestDate) {
      alert("Supplier dan tanggal jadwal wajib diisi.");
      return;
    }
    try {
      const result = await apiFetch('/api/schedules/reminder-email', {
        method: 'POST',
        body: JSON.stringify({ supplier: item.supplier, requestDate: item.requestDate }),
      });
      if (result?.sent) {
        alert(`Email reminder terkirim ke ${result.to || item.supplier}.`);
        return;
      }
      if (result?.html) {
        const preview = window.open('', '_blank', 'noopener');
        if (preview) {
          preview.document.open();
          preview.document.write(result.html);
          preview.document.close();
        }
        alert(result.notice || 'Email reminder siap dikirim.');
      }
    } catch (error) {
      alert(`Gagal kirim reminder: ${error.message || 'Unknown error'}`);
    }
  };
  return {
    schedulesLoaded,
    schedulesLoading,
    schedules,
    selectedScheduleIds,
    setSelectedScheduleIds,
    showForm,
    setShowForm,
    isEditing,
    inputMode,
    setInputMode,
    newPlan,
    setNewPlan,
    searchQuery,
    setSearchQuery,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    filterStatus,
    setFilterStatus,
    filterSupplier,
    setFilterSupplier,
    scheduleSupplierOptions,
    filteredSchedules,
    schedulePage,
    schedulePerPage,
    scheduleTotal,
    scheduleTotalPages,
    scheduleLoading,
    handleSchedulePageChange,
    handleSchedulePerPageChange,
    stats,
    schedulesByDate,
    printSupplierGroups,
    showInboundPrint,
    setShowInboundPrint,
    inboundPrintOrientation,
    setInboundPrintOrientation,
    scheduleEditOpen,
    scheduleEditForm,
    setScheduleEditForm,
    scheduleEditSaving,
    scheduleEditError,
    closeScheduleEdit,
    handleScheduleEditSave,
    refreshSchedules,
    refreshAllSchedules,
    ensureSchedulesLoaded,
    getDisplayOrderQty,
    getTotalOrderQty,
    getRemainingQty,
    getPoLineRemainingAfterSchedule,
    getKpiStatus,
    getPrintStatusClass,
    handleAddPlan,
    handleCancelEdit,
    handleEdit,
    handleUpdateActual,
    handleSaveActual,
    handleUnlockActual,
    handleDelete,
    handleResetData,
    handlePrintPDF,
    handleDownloadTemplate,
    handleImportExcel,
    handleExportExcel,
    handleSendEmail,
    handleSendEmailReminder,
  };
};
