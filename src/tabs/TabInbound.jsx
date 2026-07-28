import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Edit,
  Filter,
  FileSpreadsheet,
  FileUp,
  GitFork,
  Lock,
  Mail,
  MoreVertical,
  Package,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Split,
  Trash2,
  Truck,
  Unlock,
  Wand2,
  X as XIcon,
} from 'lucide-react';

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

const createEmptyPoLine = () => ({
  itemCode: '',
  qty: '',
});

const normalizeActualReceiveText = (value) => String(value ?? '').trim();

const normalizeActualReceiveKey = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

const normalizeReceiveDoNumber = (value) => String(value ?? '').trim();

const parseActualReceiveBoolean = (value) => {
  const normalized = normalizeActualReceiveText(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'ya', 'on'].includes(normalized);
};

const getActualReceiveImportValue = (row, aliases = []) => {
  const entries = Object.entries(row || {});
  for (const alias of aliases) {
    const normalizedAlias = normalizeActualReceiveKey(alias);
    const match = entries.find(([key]) => normalizeActualReceiveKey(key) === normalizedAlias);
    if (match && match[1] !== undefined && match[1] !== null && String(match[1]).trim() !== '') {
      return match[1];
    }
  }
  return '';
};

const TabInbound = (props) => {
  const {
    mainTab,
    apiFetch,
    showForm,
    isEditing,
    canUseAI,
    canImportExport,
    canImportSchedules,
    canManageItems,
    canManageVendors,
    setParseModalOpen,
    setInputMode,
    inputMode,
    handleAddPlan,
    newPlan,
    setNewPlan,
    DELIVERY_CYCLES,
    handleCancelEdit,
    setShowForm,
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
    canEditSchedules,
    canDeleteRecords,
    isStockOpnameLocked,
    selectedScheduleIds,
    filteredSchedules,
    scheduleLoading,
    schedulePage,
    schedulePerPage,
    scheduleTotal,
    scheduleTotalPages,
    handleSchedulePageChange,
    handleSchedulePerPageChange,
    setSelectedScheduleIds,
    formatDateID,
    getNextBusinessDay,
    getDisplayOrderQty,
    getTotalOrderQty,
    normalizeQtyByNsp,
    user,
    ensureXlsx,
    formatExcelDate,
    formatNumber0,
    handleUnlockActual,
    handleUpdateActual,
    handleSendEmail,
    handleSendEmailReminder,
    getPoLineRemainingAfterSchedule,
    handleEdit,
    handleDelete,
    getRemainingQty,
    getKpiStatus,
    getTimingFlag,
    handlePrintInboundCards,
    refreshSchedules,
    openInboundCardAdjustModal,
    inboundCardScanOpen,
    setInboundCardScanOpen,
    inboundCardScanValue,
    setInboundCardScanValue,
    handleInboundCardScanSubmit,
    inboundCardScanLoading,
    incomingQuickAction,
    scheduleSupplierOptions,
    inboundCardAdjustOpen,
    setInboundCardAdjustOpen,
    inboundCardAdjustTarget,
    setInboundCardAdjustTarget,
    inboundCardAdjustSchedule,
    handleInboundCardAdjustSubmit,
    inboundCardAdjustLoading,
    openInboundScheduleFromToast,
    masterItems,
    masterVendors,
    showToastMessage,
    handleImportExcel,
    handleDownloadTemplate,
    handleGenerateReport,
    handlePrintPDF,
    handleExportExcel,
    inboundPrintOrientation,
    setInboundPrintOrientation,
    scheduleEditOpen,
    scheduleEditForm,
    setScheduleEditForm,
    scheduleEditSaving,
    scheduleEditError,
    closeScheduleEdit,
    handleScheduleEditSave,
    inboundNav,
    clearInboundNav,
  } = props;

  const formatQty = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const isWhole = Math.abs(num - Math.round(num)) < 1e-9;
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2,
    });
  };

  const [noteDrafts, setNoteDrafts] = useState({});
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');
  const [inboundSubTab, setInboundSubTab] = useState('schedule');
  const vendorNameMap = useMemo(() => {
    const map = new Map();
    (masterVendors || []).forEach((vendor) => {
      if (!vendor) return;
      const id = String(vendor.id || '').trim();
      const name = String(vendor.name || '').trim();
      if (id) map.set(id.toLowerCase(), name || id);
      if (name) map.set(name.toLowerCase(), name);
    });
    return map;
  }, [masterVendors]);

  const masterItemUnitMap = useMemo(() => {
    const map = new Map();
    (masterItems || []).forEach((item) => {
      if (!item) return;
      const code = String(item.code || item.itemCode || item.item_code || '').trim().toLowerCase();
      const unit = String(item.unit || item.uom || item.itemUnit || '').trim().toLowerCase();
      if (code && unit) {
        map.set(code, unit);
      }
    });
    return map;
  }, [masterItems]);

  const resolveItemUnit = useCallback((itemCode, fallbackUnit = '') => {
    const directUnit = String(fallbackUnit || '').trim().toLowerCase();
    if (directUnit) return directUnit;
    const code = String(itemCode || '').trim().toLowerCase();
    if (!code) return '';
    return masterItemUnitMap.get(code) || '';
  }, [masterItemUnitMap]);

  const canUseLooseScheduleQty = ['admin', 'ppic'].includes(String(user?.role || '').trim().toLowerCase());

  const [poFormVisible, setPoFormVisible] = useState(false);
  const [poForm, setPoForm] = useState({
    poNumber: '',
    poDate: '',
    supplier: '',
    lines: [createEmptyPoLine()],
  });
  const [poLookupQuery, setPoLookupQuery] = useState('');
  const [poLookupOpen, setPoLookupOpen] = useState(false);
  const [poLookupLoading, setPoLookupLoading] = useState(false);
  const [poLookupRows, setPoLookupRows] = useState([]);
  const [poLookupIncludePartial, setPoLookupIncludePartial] = useState(true);
  const [poSelectedMeta, setPoSelectedMeta] = useState(null);
  const [poLineOptions, setPoLineOptions] = useState([]);
  const [poSelectedLineId, setPoSelectedLineId] = useState(null);
  const [poSelectedLineIds, setPoSelectedLineIds] = useState([]);
  const [poLineRemainingOnly, setPoLineRemainingOnly] = useState(false);
  const [poRows, setPoRows] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poImporting, setPoImporting] = useState(false);
  const [poImportErrors, setPoImportErrors] = useState([]);
  const [poImportErrorOpen, setPoImportErrorOpen] = useState(false);
  const [poEditOpen, setPoEditOpen] = useState(false);
  const [poEditSaving, setPoEditSaving] = useState(false);
  const [poEditError, setPoEditError] = useState('');
  const [poEditForm, setPoEditForm] = useState({
    poNumber: '',
    poDate: '',
    supplier: '',
    remarks: '',
    status: 'open',
  });
  const [poLineEditOpen, setPoLineEditOpen] = useState(false);
  const [poLineEditSaving, setPoLineEditSaving] = useState(false);
  const [poLineEditError, setPoLineEditError] = useState('');
  const [poLineEditForm, setPoLineEditForm] = useState({
    poNumber: '',
    lineId: '',
    itemCode: '',
    itemName: '',
    qtyOrder: '',
    qtyReceived: 0,
    qtyRemaining: 0,
  });
  const [poDeleteLoading, setPoDeleteLoading] = useState(null);
  const [poExpanded, setPoExpanded] = useState({});
  const [poLineMap, setPoLineMap] = useState({});
  const [poLineLoading, setPoLineLoading] = useState({});
  const [poDetailRemainingOnly, setPoDetailRemainingOnly] = useState(false);
  const [poExportLoading, setPoExportLoading] = useState(false);
  const [poPrintLoading, setPoPrintLoading] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [poTotal, setPoTotal] = useState(0);
  const initialPoMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const [poFilterStart, setPoFilterStart] = useState(initialPoMonthRange.start);
  const [poFilterEnd, setPoFilterEnd] = useState(initialPoMonthRange.end);
  const [poPage, setPoPage] = useState(1);
  const [poPerPage, setPoPerPage] = useState(20);
  const [poTotalPages, setPoTotalPages] = useState(1);
  const poImportRef = useRef(null);
  const poActionRef = useRef(null);
  const poSelectAllRef = useRef(null);
  const [inboundActionOpen, setInboundActionOpen] = useState(false);
  const inboundActionRef = useRef(null);
  const inboundImportRef = useRef(null);
  const actualReceiveRowSeqRef = useRef(0);
  const actualReceiveQtyRefs = useRef({});
  const masterItemByCode = useMemo(() => {
    const map = new Map();
    (masterItems || []).forEach((item) => {
      const code = String(item?.code || item?.itemCode || item?.item_code || '').trim();
      if (!code) return;
      map.set(code.toLowerCase(), item);
    });
    return map;
  }, [masterItems]);
  const normalizePoItemCodeInput = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const direct = masterItemByCode.get(raw.toLowerCase());
    if (direct?.code) return String(direct.code).trim();
    const beforeSeparator = raw.split(/\s+-\s+/)[0]?.trim();
    if (beforeSeparator) {
      const matched = masterItemByCode.get(beforeSeparator.toLowerCase());
      if (matched?.code) return String(matched.code).trim();
    }
    return beforeSeparator || raw;
  }, [masterItemByCode]);
  const resolveMasterItemName = useCallback((itemCode) => {
    const code = normalizePoItemCodeInput(itemCode);
    if (!code) return '';
    const item = masterItemByCode.get(code.toLowerCase());
    return String(item?.name || item?.itemName || item?.item_name || '').trim();
  }, [masterItemByCode, normalizePoItemCodeInput]);
  const [showActualReceiveModal, setShowActualReceiveModal] = useState(false);
  const [actualReceiveSupplier, setActualReceiveSupplier] = useState('');
  const [actualReceivePoNumber, setActualReceivePoNumber] = useState('');
  const [actualReceiveDoNumber, setActualReceiveDoNumber] = useState('');
  const [actualReceiveArrivalDate, setActualReceiveArrivalDate] = useState('');
  const [actualReceiveTruckNo, setActualReceiveTruckNo] = useState('');
  const [actualReceiveDriverName, setActualReceiveDriverName] = useState('');
  const [actualReceiveRemarks, setActualReceiveRemarks] = useState('');
  const [actualReceiveRows, setActualReceiveRows] = useState([]);
  const [actualReceivePoDetail, setActualReceivePoDetail] = useState(null);
  const [actualReceivePoLines, setActualReceivePoLines] = useState([]);
  const [actualReceivePoAvailableLines, setActualReceivePoAvailableLines] = useState([]);
  const [actualReceivePoOptions, setActualReceivePoOptions] = useState([]);
  const [actualReceivePoSearch, setActualReceivePoSearch] = useState('');
  const [actualReceivePoLoading, setActualReceivePoLoading] = useState(false);
  const [actualReceivePoOptionsLoading, setActualReceivePoOptionsLoading] = useState(false);
  const [actualReceivePoError, setActualReceivePoError] = useState('');
  const [actualReceiveError, setActualReceiveError] = useState('');
  const [actualReceiveLabelScan, setActualReceiveLabelScan] = useState('');
  const [actualReceiveLabelLoading, setActualReceiveLabelLoading] = useState(false);
  const [actualReceiveLabelError, setActualReceiveLabelError] = useState('');
  const [actualReceiveLabelInfo, setActualReceiveLabelInfo] = useState(null);
  const [actualReceiveDoCheckStatus, setActualReceiveDoCheckStatus] = useState('idle');
  const [actualReceiveDoCheckMessage, setActualReceiveDoCheckMessage] = useState('');
  const [actualReceiveSubmitting, setActualReceiveSubmitting] = useState(false);
  const [actualReceiveAllowOver, setActualReceiveAllowOver] = useState(false);
  const actualReceiveImportRef = useRef(null);
  const actualReceivePoPickerRef = useRef(null);
  const actualReceiveDoCheckSeqRef = useRef(0);
  const incomingQuickActionNonceRef = useRef(null);
  const [actualReceiveImportLoading, setActualReceiveImportLoading] = useState(false);
  const [actualReceiveImportError, setActualReceiveImportError] = useState('');
  const [actualReceiveImportSummary, setActualReceiveImportSummary] = useState(null);
  const [actualReceivePoPickerOpen, setActualReceivePoPickerOpen] = useState(false);
  const [actualReceivePoActiveIndex, setActualReceivePoActiveIndex] = useState(-1);
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [listSize, setListSize] = useState({ height: 520, width: 0 });
  const [actionMenuId, setActionMenuId] = useState(null);
  const [poActionOpen, setPoActionOpen] = useState(false);
  const rowHeight = 120;
  const overscan = 6;
  const scheduleRowOptions = useMemo(() => [20, 50, 100], []);
  const poRowOptions = useMemo(() => [20, 50, 100], []);
  const gridTemplate = useMemo(
    () => '40px minmax(200px, 2fr) minmax(180px, 1.3fr) minmax(170px, 1.2fr) minmax(280px, 1.9fr) 120px minmax(140px, 0.9fr) 90px',
    [],
  );
  const scheduleStartIndex = scheduleTotal === 0 ? 0 : (schedulePage - 1) * schedulePerPage + 1;
  const scheduleEndIndex = Math.min(scheduleTotal, schedulePage * schedulePerPage);
  const poStartIndex = poTotal === 0 ? 0 : (poPage - 1) * poPerPage + 1;
  const poEndIndex = Math.min(poTotal, poPage * poPerPage);

  const createActualReceiveRow = useCallback((overrides = {}) => ({
    key: overrides.key || `actual-${Date.now()}-${actualReceiveRowSeqRef.current += 1}`,
    poLineId: overrides.poLineId || '',
    scheduleId: overrides.scheduleId || '',
    itemCode: overrides.itemCode || '',
    unit: overrides.unit || '',
    qty: overrides.qty ?? '',
  }), []);

  const getActualReceiveRemainingQty = useCallback((line) => {
    if (!line) return 0;
    const qtyOrder = Number(line.qty_order ?? line.qtyOrder ?? 0);
    const qtyReceived = Number(line.qty_received ?? line.qtyReceived ?? 0);
    return Number(line.qty_remaining ?? line.qtyRemaining ?? (qtyOrder - qtyReceived));
  }, []);

  const updateActualReceiveRow = useCallback((rowKey, patch) => {
    setActualReceiveRows((prev) => prev.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)));
  }, []);

  const addActualReceiveRow = useCallback(() => {
    setActualReceiveRows((prev) => [...prev, createActualReceiveRow()]);
  }, [createActualReceiveRow]);

  const removeActualReceiveRow = useCallback((rowKey) => {
    setActualReceiveRows((prev) => {
      const nextRows = prev.filter((row) => row.key !== rowKey);
      return nextRows.length > 0 ? nextRows : [createActualReceiveRow()];
    });
  }, [createActualReceiveRow]);

  const focusActualReceiveQty = useCallback((rowKey) => {
    if (!rowKey) return;
    window.requestAnimationFrame(() => {
      actualReceiveQtyRefs.current[rowKey]?.focus?.();
    });
  }, []);

  const resetActualReceiveForm = useCallback(() => {
    setActualReceiveSupplier('');
    setActualReceivePoNumber('');
    setActualReceiveDoNumber('');
    setActualReceiveArrivalDate('');
    setActualReceiveTruckNo('');
    setActualReceiveDriverName('');
    setActualReceiveRemarks('');
    setActualReceiveRows([createActualReceiveRow()]);
    setActualReceivePoDetail(null);
    setActualReceivePoLines([]);
    setActualReceivePoAvailableLines([]);
    setActualReceivePoOptions([]);
    setActualReceivePoSearch('');
    setActualReceivePoPickerOpen(false);
    setActualReceivePoActiveIndex(-1);
    setActualReceivePoLoading(false);
    setActualReceivePoOptionsLoading(false);
    setActualReceivePoError('');
    setActualReceiveError('');
    setActualReceiveLabelScan('');
    setActualReceiveLabelLoading(false);
    setActualReceiveLabelError('');
    setActualReceiveLabelInfo(null);
    setActualReceiveDoCheckStatus('idle');
    setActualReceiveDoCheckMessage('');
    setActualReceiveSubmitting(false);
    setActualReceiveAllowOver(false);
    actualReceiveDoCheckSeqRef.current += 1;
    actualReceiveQtyRefs.current = {};
  }, [createActualReceiveRow]);

  const closeActualReceiveModal = useCallback(() => {
    setShowActualReceiveModal(false);
    resetActualReceiveForm();
  }, [resetActualReceiveForm]);

  useEffect(() => {
    setLocalSearchQuery(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        setSearchQuery(localSearchQuery);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [localSearchQuery, searchQuery, setSearchQuery]);


  const updateScrollbarWidth = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const gutter = Math.max(0, node.offsetWidth - node.clientWidth);
    setScrollbarWidth((prev) => (prev === gutter ? prev : gutter));
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setListSize((prev) => {
        const next = { height: rect.height, width: rect.width };
        if (prev.height === next.height && prev.width === next.width) return prev;
        return next;
      });
      updateScrollbarWidth();
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateScrollbarWidth]);

  useEffect(() => {
    updateScrollbarWidth();
  }, [filteredSchedules.length, scheduleLoading, updateScrollbarWidth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-action-menu]')) return;
      if (event.target.closest('[data-po-lookup]')) return;
      setActionMenuId(null);
      setPoActionOpen(false);
      setInboundActionOpen(false);
      setPoLookupOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActionMenuId(null);
        setPoActionOpen(false);
        setInboundActionOpen(false);
        setPoLookupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const visibleWindow = useMemo(() => {
    const total = filteredSchedules.length;
    const viewportHeight = Math.max(0, listSize.height);
    const visibleCount = viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) : 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(total, startIndex + visibleCount + overscan * 2);
    return { total, startIndex, endIndex };
  }, [filteredSchedules.length, listSize.height, rowHeight, scrollTop, overscan]);

  const visibleRows = useMemo(
    () => filteredSchedules.slice(visibleWindow.startIndex, visibleWindow.endIndex),
    [filteredSchedules, visibleWindow.startIndex, visibleWindow.endIndex],
  );
  const selectableIds = useMemo(
    () => filteredSchedules.filter((row) => !row.actualLocked).map((row) => row.id),
    [filteredSchedules],
  );
  const isAllSelected = useMemo(
    () => selectableIds.length > 0 && selectableIds.every((id) => selectedScheduleIds.includes(id)),
    [selectableIds, selectedScheduleIds],
  );

  const resizeNoteTextarea = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 64;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(nextHeight, 28)}px`;
  };

  const fetchActualReceivePoOptions = useCallback(async () => {
    setActualReceivePoOptionsLoading(true);
    try {
      const payload = await apiFetch('/api/po?status=open,partial&includeTotal=1');
      const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
      setActualReceivePoOptions(rows);
    } catch (error) {
      setActualReceivePoOptions([]);
      setActualReceivePoError(error.message || 'Gagal memuat daftar PO.');
    } finally {
      setActualReceivePoOptionsLoading(false);
    }
  }, [apiFetch]);

  const loadActualReceivePo = useCallback(async (poNumberOverride = null) => {
    const poNumber = String(poNumberOverride || actualReceivePoNumber || '').trim();
    if (!poNumber) {
      setActualReceivePoError('No PO wajib diisi.');
      return;
    }
    setActualReceivePoLoading(true);
    setActualReceivePoError('');
    setActualReceiveSupplier('');
    try {
      const response = await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`);
      const detailLines = Array.isArray(response?.lines)
        ? response.lines
        : Array.isArray(response?.items)
          ? response.items
          : [];
      setActualReceiveSupplier(response?.header?.supplier_id || response?.header?.supplier_name || '');
      setActualReceivePoDetail(response || null);
      const availablePoLines = detailLines.filter((line) => Number(
        line?.qty_remaining
        ?? line?.qtyRemaining
        ?? (Number(line?.qty_order || 0) - Number(line?.qty_received || 0)),
      ) > 0);
      setActualReceivePoLines(detailLines);
      setActualReceivePoAvailableLines(availablePoLines);
      setActualReceiveRows(
        availablePoLines.length > 0
          ? availablePoLines.map((line) => createActualReceiveRow({
            poLineId: line.id,
            itemCode: line.item_code || '',
            unit: line.unit || '',
          }))
          : [createActualReceiveRow()],
      );
    } catch (error) {
      setActualReceivePoDetail(null);
      setActualReceivePoLines([]);
      setActualReceivePoAvailableLines([]);
      setActualReceivePoError(error.message || 'Gagal memuat PO.');
    } finally {
      setActualReceivePoLoading(false);
    }
  }, [actualReceivePoNumber, apiFetch, createActualReceiveRow]);

  const openActualReceiveModal = useCallback((prefillPoNumber = '') => {
    resetActualReceiveForm();
    setInboundActionOpen(false);
    setShowActualReceiveModal(true);
    const nextPoNumber = String(prefillPoNumber || '').trim();
    if (nextPoNumber) {
      setActualReceivePoNumber(nextPoNumber);
      setActualReceivePoSearch(nextPoNumber);
      setActualReceivePoPickerOpen(false);
      setActualReceivePoActiveIndex(-1);
      void loadActualReceivePo(nextPoNumber);
    }
  }, [loadActualReceivePo, resetActualReceiveForm]);

  useEffect(() => {
    if (mainTab !== 'monitoring') return;
    if (incomingQuickAction?.type !== 'schedule') return;
    if (!incomingQuickAction?.nonce || incomingQuickActionNonceRef.current === incomingQuickAction.nonce) return;
    incomingQuickActionNonceRef.current = incomingQuickAction.nonce;
    openActualReceiveModal();
  }, [incomingQuickAction?.nonce, incomingQuickAction?.type, mainTab, openActualReceiveModal]);

  const handleDownloadActualReceiveTemplate = useCallback(async () => {
    if (!canEditSchedules) {
      if (showToastMessage) showToastMessage('Anda tidak memiliki akses untuk download template.', '', null, 'error');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = [
      {
        'No PO': 'PO-EXAMPLE-001',
        UNIQ: 'DT17',
        'Qty Aktual': 10,
        'No SJ / DO': 'DN-EXAMPLE-001',
        'Tgl Kedatangan': '',
        'Izin Over Qty': 'N',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penerimaan Aktual');
    XLSX.writeFile(wb, 'Template_Penerimaan_Aktual_Sederhana.xlsx');
  }, [canEditSchedules, ensureXlsx, showToastMessage]);

  const handleImportActualReceiveExcel = useCallback((event) => {
    if (!canEditSchedules) {
      setActualReceiveImportError('Anda tidak memiliki akses import penerimaan aktual.');
      if (actualReceiveImportRef.current) actualReceiveImportRef.current.value = '';
      return;
    }
    if (isStockOpnameLocked) {
      setActualReceiveImportError('Selesaikan dulu Stock Opname!');
      if (actualReceiveImportRef.current) actualReceiveImportRef.current.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const fileName = file.name || '';
    setActualReceiveImportLoading(true);
    setActualReceiveImportError('');
    setActualReceiveImportSummary(null);
    const finish = () => {
      setActualReceiveImportLoading(false);
      if (actualReceiveImportRef.current) actualReceiveImportRef.current.value = '';
    };
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await ensureXlsx();
        if (!XLSX) {
          setActualReceiveImportError('Library XLSX belum tersedia.');
          finish();
          return;
        }
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!Array.isArray(rows) || rows.length === 0) {
          setActualReceiveImportError('File kosong.');
          finish();
          return;
        }

        const groupedDocs = new Map();
        const invalidRows = [];
        rows.forEach((row, idx) => {
          const poNumber = normalizeActualReceiveText(getActualReceiveImportValue(row, ['No PO', 'PO Number', 'PO', 'No. PO']));
          const doNumber = normalizeReceiveDoNumber(getActualReceiveImportValue(row, ['No SJ / DO', 'DO Number', 'No DO', 'DN Number']));
          const arrivalDate = formatExcelDate?.(getActualReceiveImportValue(row, ['Tgl Kedatangan', 'Tanggal Kedatangan', 'Tanggal Terima', 'Arrival Date', 'Received Date', 'Date'])) || '';
          const allowOverReceive = parseActualReceiveBoolean(getActualReceiveImportValue(row, ['Izin Over Qty', 'Allow Over Qty', 'Allow Over Receive', 'Over Receive', 'Boleh Over']));
          const itemCode = normalizeActualReceiveText(getActualReceiveImportValue(row, ['UNIQ', 'Kode Item', 'Item Code', 'Item', 'Part No', 'Part Number']));
          const qty = Number(getActualReceiveImportValue(row, ['Qty Aktual', 'Qty', 'Actual Qty', 'Received Qty', 'Qty Receive']));
          const notes = normalizeActualReceiveText(getActualReceiveImportValue(row, ['Remarks', 'Remark', 'Catatan', 'Notes']));
          const sisaPo = Number(getActualReceiveImportValue(row, ['Sisa PO', 'Sisa Qty', 'Remaining Qty', 'Qty Remaining']));
          const errors = [];
          if (!poNumber) errors.push('No PO kosong');
          if (!doNumber) errors.push('No SJ / DO kosong');
          if (!arrivalDate) errors.push('Tanggal kedatangan tidak valid');
          if (!itemCode) errors.push('UNIQ kosong');
          if (!Number.isFinite(qty) || qty <= 0) errors.push('Qty aktual tidak valid');
          if (errors.length > 0) {
            invalidRows.push({ no: idx + 2, errors: errors.join(', ') });
            return;
          }
          const groupKey = [poNumber, arrivalDate, doNumber || '', allowOverReceive ? '1' : '0'].join('|');
          const current = groupedDocs.get(groupKey) || {
            poNumber,
            doNumber,
            arrivalDate,
            allowOverReceive,
            remarks: notes,
            items: [],
          };
          if (!current.doNumber && doNumber) {
            current.doNumber = doNumber;
          }
          if (!current.remarks && notes) {
            current.remarks = notes;
          }
          const itemKey = itemCode.toLowerCase();
          const existingItem = current.items.find((item) => item.key === itemKey);
          if (existingItem) {
            existingItem.qty += qty;
            if (!existingItem.notes && notes) {
              existingItem.notes = notes;
            }
            if (Number.isFinite(sisaPo) && sisaPo >= 0 && existingItem.sisaPo === null) {
              existingItem.sisaPo = sisaPo;
            }
          } else {
            current.items.push({
              key: itemKey,
              itemCode,
              qty,
              notes: notes || null,
              sisaPo: Number.isFinite(sisaPo) && sisaPo >= 0 ? sisaPo : null,
            });
          }
          groupedDocs.set(groupKey, current);
        });

        if (invalidRows.length > 0) {
          const firstInvalid = invalidRows[0];
          const message = `Import dibatalkan. Gagal di baris ${firstInvalid.no}: ${firstInvalid.errors}`;
          setActualReceiveImportError(message);
          setActualReceiveImportSummary({
            fileName,
            totalGroups: groupedDocs.size,
            successGroups: 0,
            failedGroups: invalidRows.length,
            totalItems: rows.length,
            totalLines: 0,
            totalQty: 0,
            validationRows: invalidRows,
            results: [],
          });
          finish();
          return;
        }
        if (groupedDocs.size === 0) {
          setActualReceiveImportError('Tidak ada data valid untuk di-import.');
          finish();
          return;
        }

        const groups = Array.from(groupedDocs.values());
        const poDetailCache = new Map();
        const resolvePoDetail = async (poNumber) => {
          const cacheKey = String(poNumber || '').trim().toLowerCase();
          if (!cacheKey) return null;
          if (!poDetailCache.has(cacheKey)) {
            poDetailCache.set(
              cacheKey,
              apiFetch(`/api/po/${encodeURIComponent(poNumber)}`).catch((error) => ({ error })),
            );
          }
          const result = await poDetailCache.get(cacheKey);
          if (result?.error) throw result.error;
          return result;
        };
        let successGroups = 0;
        let failedGroups = 0;
        let totalImportedLines = 0;
        let totalImportedQty = 0;
        const importErrors = [];
        const importResults = [];

        for (const group of groups) {
          try {
            const poDetail = await resolvePoDetail(group.poNumber);
            const supplierValue = String(poDetail?.header?.supplier_id || poDetail?.header?.supplier_name || '').trim();
            if (!supplierValue) {
              throw new Error(`Supplier PO ${group.poNumber} tidak ditemukan.`);
            }
            const doNumber = normalizeReceiveDoNumber(group.doNumber);
            if (!doNumber) {
              throw new Error(`No SJ / DO wajib diisi untuk PO ${group.poNumber}.`);
            }
            const response = await apiFetch('/api/receive-notes/actual', {
              method: 'POST',
              body: JSON.stringify({
                supplier: supplierValue,
                poNumber: group.poNumber,
                doNumber,
                arrivalDate: group.arrivalDate,
                allowOverReceive: group.allowOverReceive,
                remarks: group.remarks || '',
                items: group.items.map((item) => ({
                  itemCode: item.itemCode,
                  qty: item.qty,
                  notes: item.notes || group.remarks || '',
                })),
              }),
            });
            const groupTotalQty = group.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
            successGroups += 1;
            totalImportedLines += group.items.length;
            totalImportedQty += groupTotalQty;
            importResults.push({
              status: 'success',
              poNumber: group.poNumber,
              doNumber,
              supplier: supplierValue,
              arrivalDate: group.arrivalDate,
              totalQty: groupTotalQty,
              itemCount: group.items.length,
              rnNumber: response?.rnNumber || '',
              message: `Tersimpan${response?.rnNumber ? ` sebagai ${response.rnNumber}` : ''}.`,
            });
            if (response?.rnNumber) {
              importErrors.push(`Sukses ${doNumber}: ${response.rnNumber}`);
            }
          } catch (error) {
            failedGroups += 1;
            const groupTotalQty = group.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
            const message = error.message || 'Gagal import.';
            importResults.push({
              status: 'error',
              poNumber: group.poNumber,
              doNumber: normalizeReceiveDoNumber(group.doNumber),
              supplier: '',
              arrivalDate: group.arrivalDate,
              totalQty: groupTotalQty,
              itemCount: group.items.length,
              rnNumber: '',
              message,
            });
            importErrors.push(`${group.doNumber || group.poNumber || 'Baris'}: ${message}`);
          }
        }

        setActualReceiveImportSummary({
          fileName,
          totalGroups: groups.length,
          successGroups,
          failedGroups,
          totalLines: totalImportedLines,
          totalQty: totalImportedQty,
          validationRows: [],
          results: importResults,
        });
        if (failedGroups === 0) {
          setActualReceiveImportError('');
          if (showToastMessage) showToastMessage(`Import penerimaan aktual selesai: ${successGroups} dokumen berhasil.`, '', null, 'info');
        } else {
          const firstError = importErrors.find((msg) => !msg.startsWith('Sukses ')) || 'Ada dokumen yang gagal di-import.';
          setActualReceiveImportError(firstError);
          if (showToastMessage) showToastMessage(`Import selesai dengan ${failedGroups} gagal.`, '', null, 'error');
        }
        await refreshSchedules?.();
      } catch (error) {
        setActualReceiveImportError(error.message || 'Import penerimaan aktual gagal.');
        if (showToastMessage) showToastMessage(error.message || 'Import penerimaan aktual gagal.', '', null, 'error');
      } finally {
        finish();
      }
    };
    reader.onerror = () => {
      setActualReceiveImportError('Gagal membaca file.');
      setActualReceiveImportLoading(false);
      if (actualReceiveImportRef.current) actualReceiveImportRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  }, [
    actualReceiveImportRef,
    apiFetch,
    canEditSchedules,
    ensureXlsx,
    formatExcelDate,
    isStockOpnameLocked,
    refreshSchedules,
    showToastMessage,
  ]);

  const actualReceivePoVisibleOptions = useMemo(() => {
    const searchKey = String(actualReceivePoSearch || '').trim().toLowerCase();
    const mergedMap = new Map();
    const isReceivablePoRow = (row) => {
      const statusKey = String(row?.status || '').trim().toLowerCase();
      return ['open', 'partial'].includes(statusKey);
    };
    const mergeRow = (row) => {
      if (!row) return;
      const poNumber = String(row.po_number || '').trim();
      if (!poNumber) return;
      if (!isReceivablePoRow(row)) return;
      const key = poNumber.toLowerCase();
      const current = mergedMap.get(key) || {
        ...row,
        po_number: poNumber,
        total_qty_remaining: 0,
      };
      const nextRemaining = Number(row.total_qty_remaining || 0);
      current.po_number = current.po_number || poNumber;
      current.po_date = current.po_date || row.po_date || '';
      current.supplier_code = current.supplier_code || row.supplier_code || '';
      current.supplier_name = current.supplier_name || row.supplier_name || '';
      current.status = current.status || row.status || '';
      current.total_qty_order = Math.max(Number(current.total_qty_order || 0), Number(row.total_qty_order || 0));
      current.total_qty_received = Math.max(Number(current.total_qty_received || 0), Number(row.total_qty_received || 0));
      current.total_qty_scheduled = Math.max(Number(current.total_qty_scheduled || 0), Number(row.total_qty_scheduled || 0));
      current.schedule_count = Math.max(Number(current.schedule_count || 0), Number(row.schedule_count || 0));
      current.line_count = Math.max(Number(current.line_count || 0), Number(row.line_count || 0));
      current.total_qty_remaining = Math.max(Number(current.total_qty_remaining || 0), nextRemaining);
      mergedMap.set(key, current);
    };

    (Array.isArray(actualReceivePoOptions) ? actualReceivePoOptions : [])
      .map((row) => {
        const totalOrder = Number(row.total_qty_order || 0);
        const totalReceived = Number(row.total_qty_received || 0);
        const actualPoRemaining = totalOrder - totalReceived;
        return {
          ...row,
          po_number: String(row.po_number || '').trim(),
          total_qty_remaining: Math.max(0, Number.isFinite(actualPoRemaining) ? actualPoRemaining : Number(row.total_qty_remaining || 0)),
        };
      })
      .forEach(mergeRow);

    (() => {
      const map = new Map();
      (Array.isArray(filteredSchedules) ? filteredSchedules : []).forEach((schedule) => {
        const poNumber = String(schedule.poNumber || schedule.po_number || '').trim();
        if (!poNumber) return;
        const scheduleStatus = String(schedule.status || schedule.scheduleStatus || '').trim().toLowerCase();
        const remainingQty = Number(getRemainingQty(schedule) || 0);
        if (remainingQty <= 0) return;
        if (!['open', 'partial'].includes(scheduleStatus)) return;
        const current = map.get(poNumber) || {
          po_number: poNumber,
          po_date: schedule.poDate || schedule.po_date || '',
          supplier_code: schedule.supplier_code || schedule.supplier_id || '',
          supplier_name: schedule.supplier_name || '',
          total_qty_remaining: 0,
        };
        current.total_qty_remaining += remainingQty;
        if (!current.supplier_code && (schedule.supplier_code || schedule.supplier_id)) {
          current.supplier_code = schedule.supplier_code || schedule.supplier_id;
        }
        if (!current.supplier_name && schedule.supplier_name) {
          current.supplier_name = schedule.supplier_name;
        }
        if (!current.po_date && (schedule.poDate || schedule.po_date)) {
          current.po_date = schedule.poDate || schedule.po_date;
        }
        map.set(poNumber, current);
      });
      Array.from(map.values()).forEach((row) => {
        mergeRow({
          ...row,
          total_qty_remaining: row.total_qty_remaining,
        });
      });
    })();

    const rows = Array.from(mergedMap.values())
      .sort((left, right) => {
        const leftDate = String(left.po_date || '');
        const rightDate = String(right.po_date || '');
        if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
        return String(right.po_number || '').localeCompare(String(left.po_number || ''));
      });

    if (!searchKey) return rows;
    return rows.filter((row) => {
      const searchable = [
        row.po_number,
        row.supplier_code,
        row.supplier_name,
      ]
        .map((value) => String(value || '').trim().toLowerCase())
        .join(' ');
      return searchable.includes(searchKey);
      });
  }, [actualReceivePoOptions, actualReceivePoSearch, filteredSchedules, getRemainingQty]);
  const actualReceivePoMenuOptions = useMemo(
    () => actualReceivePoVisibleOptions.slice(0, 80),
    [actualReceivePoVisibleOptions],
  );

  useEffect(() => {
    if (!showActualReceiveModal) {
      setActualReceivePoPickerOpen(false);
      setActualReceivePoActiveIndex(-1);
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (!actualReceivePoPickerRef.current) return;
      if (actualReceivePoPickerRef.current.contains(event.target)) return;
      setActualReceivePoPickerOpen(false);
      setActualReceivePoActiveIndex(-1);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showActualReceiveModal]);

  useEffect(() => {
    if (!actualReceivePoPickerOpen) {
      setActualReceivePoActiveIndex(-1);
      return;
    }
    if (actualReceivePoMenuOptions.length === 0) {
      setActualReceivePoActiveIndex(-1);
      return;
    }
    setActualReceivePoActiveIndex((prev) => {
      if (prev < 0) return 0;
      return Math.min(prev, actualReceivePoMenuOptions.length - 1);
    });
  }, [actualReceivePoPickerOpen, actualReceivePoMenuOptions.length, actualReceivePoSearch]);

  const handleActualReceivePoSearchChange = useCallback((value) => {
    setActualReceivePoSearch(value);
    setActualReceivePoPickerOpen(true);
    setActualReceivePoActiveIndex(0);
  }, []);

  const handleActualReceivePoPick = useCallback((row) => {
    const poNumber = String(row?.po_number || '').trim();
    if (!poNumber) return;
    setActualReceivePoNumber(poNumber);
    setActualReceivePoSearch(poNumber);
    setActualReceivePoPickerOpen(false);
    setActualReceivePoActiveIndex(-1);
    setActualReceivePoError('');
    setActualReceivePoDetail(null);
    setActualReceivePoLines([]);
    setActualReceivePoAvailableLines([]);
    setActualReceiveSupplier('');
    setActualReceiveRows([createActualReceiveRow()]);
    setActualReceiveDoCheckStatus('idle');
    setActualReceiveDoCheckMessage('');
    void loadActualReceivePo(poNumber);
  }, [createActualReceiveRow, loadActualReceivePo]);

  const handleActualReceivePoClear = useCallback(() => {
    setActualReceivePoNumber('');
    setActualReceivePoSearch('');
    setActualReceivePoPickerOpen(true);
    setActualReceivePoActiveIndex(0);
    setActualReceivePoError('');
    setActualReceivePoDetail(null);
    setActualReceivePoLines([]);
    setActualReceivePoAvailableLines([]);
    setActualReceiveSupplier('');
    setActualReceiveRows([createActualReceiveRow()]);
    setActualReceiveDoCheckStatus('idle');
    setActualReceiveDoCheckMessage('');
  }, [createActualReceiveRow]);

  const handleActualReceivePoKeyDown = useCallback((event) => {
    const optionCount = actualReceivePoMenuOptions.length;
    if (event.key === 'Escape') {
      setActualReceivePoPickerOpen(false);
      setActualReceivePoActiveIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!actualReceivePoPickerOpen) setActualReceivePoPickerOpen(true);
      if (!optionCount) return;
      setActualReceivePoActiveIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, optionCount - 1);
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!actualReceivePoPickerOpen) setActualReceivePoPickerOpen(true);
      if (!optionCount) return;
      setActualReceivePoActiveIndex((prev) => {
        if (prev < 0) return optionCount - 1;
        return Math.max(prev - 1, 0);
      });
      return;
    }
    if (event.key === 'Home') {
      if (!optionCount) return;
      event.preventDefault();
      setActualReceivePoPickerOpen(true);
      setActualReceivePoActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      if (!optionCount) return;
      event.preventDefault();
      setActualReceivePoPickerOpen(true);
      setActualReceivePoActiveIndex(optionCount - 1);
      return;
    }
    if (event.key !== 'Enter') return;
    const activeRow = actualReceivePoMenuOptions[Math.max(0, actualReceivePoActiveIndex)];
    const firstMatch = activeRow || actualReceivePoMenuOptions[0];
    if (!firstMatch) return;
    event.preventDefault();
    handleActualReceivePoPick(firstMatch);
  }, [actualReceivePoActiveIndex, actualReceivePoPickerOpen, actualReceivePoMenuOptions, handleActualReceivePoPick]);

  const handleResolveActualReceiveLabel = useCallback(async () => {
    const scanValue = String(actualReceiveLabelScan || '').trim();
    if (!scanValue) {
      setActualReceiveLabelError('Scan atau ketik QR label schedule terlebih dahulu.');
      return;
    }
    setActualReceiveLabelLoading(true);
    setActualReceiveLabelError('');
    try {
      const label = await apiFetch(`/api/receiving-labels/resolve?token=${encodeURIComponent(scanValue)}`);
      const poNumber = String(label?.schedule?.poNumber || '').trim();
      const scheduleId = Number(label?.schedule?.id || 0);
      const poLineId = Number(label?.poLine?.id || 0);
      const itemCode = String(label?.item?.code || '').trim();
      if (!poNumber || !itemCode) {
        throw new Error('Label tidak memiliki data PO/item yang valid.');
      }

      const response = await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`);
      const detailLines = Array.isArray(response?.lines)
        ? response.lines
        : Array.isArray(response?.items)
          ? response.items
          : [];
      const availablePoLines = detailLines.filter((line) => Number(
        line?.qty_remaining
        ?? line?.qtyRemaining
        ?? (Number(line?.qty_order || 0) - Number(line?.qty_received || 0)),
      ) > 0);
      const selectedLine = detailLines.find((line) => Number(line.id) === poLineId)
        || detailLines.find((line) => String(line.item_code || '').trim().toLowerCase() === itemCode.toLowerCase());
      if (!selectedLine) {
        throw new Error(`Item ${itemCode} dari label tidak ditemukan di PO ${poNumber}.`);
      }
      const scheduleRemaining = Number(label?.schedule?.remainingQty ?? label?.suggestedQty ?? 0);
      const suggestedQty = scheduleRemaining > 0 ? scheduleRemaining : '';
      const effectiveAvailablePoLines = availablePoLines.some((line) => Number(line.id) === Number(selectedLine.id))
        ? availablePoLines
        : (scheduleRemaining > 0 ? [...availablePoLines, selectedLine] : availablePoLines);
      const supplierValue = label?.supplier?.id || response?.header?.supplier_id || response?.header?.supplier_name || '';

      const nextRow = createActualReceiveRow({
        poLineId: selectedLine.id,
        scheduleId,
        itemCode: selectedLine.item_code || itemCode,
        unit: selectedLine.unit || label?.item?.unit || '',
        qty: suggestedQty,
      });

      setActualReceivePoNumber(poNumber);
      setActualReceivePoSearch(poNumber);
      setActualReceivePoPickerOpen(false);
      setActualReceivePoActiveIndex(-1);
      setActualReceiveSupplier(supplierValue);
      setActualReceivePoDetail(response || null);
      setActualReceivePoLines(detailLines);
      setActualReceivePoAvailableLines(effectiveAvailablePoLines);
      setActualReceiveRows([nextRow]);
      setActualReceivePoError('');
      setActualReceiveError('');
      setActualReceiveLabelInfo(label);
      focusActualReceiveQty(nextRow.key);
    } catch (error) {
      setActualReceiveLabelInfo(null);
      setActualReceiveLabelError(error.message || 'Gagal membaca label schedule.');
    } finally {
      setActualReceiveLabelLoading(false);
    }
  }, [actualReceiveLabelScan, apiFetch, createActualReceiveRow, focusActualReceiveQty]);

  const performActualReceiveDoCheck = useCallback(async (supplierValue, doNumberValue) => {
    const supplier = String(supplierValue || '').trim();
    const doNumber = normalizeReceiveDoNumber(doNumberValue);
    if (!doNumber) {
      setActualReceiveDoCheckStatus('idle');
      setActualReceiveDoCheckMessage('');
      return { ok: true, duplicate: false, unavailable: false };
    }

    const requestId = actualReceiveDoCheckSeqRef.current + 1;
    actualReceiveDoCheckSeqRef.current = requestId;
    setActualReceiveDoCheckStatus('checking');
    setActualReceiveDoCheckMessage('Memeriksa duplikasi No. SJ / DO...');

    try {
      const payloadItems = (actualReceiveRows || [])
        .map((row) => {
          const poLineId = Number(row.poLineId || 0);
          const matchedLine = poLineId > 0
            ? (actualReceivePoLines || []).find((line) => Number(line.id) === poLineId)
            : null;
          return {
            supplier,
            poNumber: String(actualReceivePoNumber || '').trim(),
            poLineId: poLineId > 0 ? poLineId : null,
            itemCode: matchedLine?.item_code || row.itemCode || '',
          };
        })
        .filter((item) => item.poNumber && item.itemCode);
      const result = await apiFetch('/api/schedules/check-sj', {
        method: 'POST',
        body: JSON.stringify({
          doNumber,
          supplier: supplier || undefined,
          poNumber: String(actualReceivePoNumber || '').trim() || undefined,
          items: payloadItems,
        }),
      });
      if (actualReceiveDoCheckSeqRef.current !== requestId) return { ok: true, duplicate: false, unavailable: false };
      const matches = Array.isArray(result?.matches) ? result.matches : [];
      if (result?.status === 'block' || result?.duplicate) {
        setActualReceiveDoCheckStatus('block');
        const first = matches[0] || {};
        setActualReceiveDoCheckMessage(first.rnNumber
          ? `Nomor surat jalan/DO sudah ada di ${first.rnNumber}.`
          : 'Nomor surat jalan/DO sudah ada!');
        return { ok: false, duplicate: true, unavailable: false };
      }
      if (result?.status === 'warn') {
        const explicitMessage = matches
          .map((row) => String(row?.message || '').trim())
          .filter(Boolean)[0];
        const preview = matches.slice(0, 2)
          .map((row) => row?.rnNumber || row?.poNumber || row?.itemName || row?.itemCode || '-')
          .join(', ');
        const suffix = matches.length > 2 ? ` dan ${matches.length - 2} lainnya` : '';
        setActualReceiveDoCheckStatus('warn');
        setActualReceiveDoCheckMessage(explicitMessage || (preview
          ? `Nomor SJ/DO ini sudah pernah muncul: ${preview}${suffix}. Pastikan bukan input ulang.`
          : 'Nomor SJ/DO ini sudah pernah muncul. Pastikan bukan input ulang.'));
        return { ok: true, duplicate: false, unavailable: false, warning: true };
      }
      setActualReceiveDoCheckStatus('ok');
      setActualReceiveDoCheckMessage('Nomor SJ / DO siap digunakan.');
      return { ok: true, duplicate: false, unavailable: false };
    } catch (error) {
      if (actualReceiveDoCheckSeqRef.current !== requestId) return { ok: true, duplicate: false, unavailable: false };
      setActualReceiveDoCheckStatus('error');
      const rawMessage = String(error?.message || '').trim();
      const isRouteError = error?.status === 404
        || /^cannot (get|post|put|patch|delete)\s+/i.test(rawMessage)
        || /<!doctype html>|<html[\s>]/i.test(rawMessage);
      setActualReceiveDoCheckMessage(
        isRouteError
          ? 'Validasi duplikasi No. SJ belum tersedia. Anda masih bisa lanjut simpan.'
          : (rawMessage || 'Gagal memeriksa No. SJ / DO.'),
      );
      return { ok: true, duplicate: false, unavailable: true };
    }
  }, [actualReceivePoLines, actualReceivePoNumber, actualReceiveRows, apiFetch]);

  const actualReceiveSelectableLines = useMemo(() => (
    actualReceiveAllowOver ? actualReceivePoLines : actualReceivePoAvailableLines
  ), [actualReceiveAllowOver, actualReceivePoAvailableLines, actualReceivePoLines]);

  const handleActualReceiveSubmit = useCallback(async () => {
    if (actualReceiveSubmitting) return;
    const supplier = String(actualReceiveSupplier || actualReceivePoDetail?.header?.supplier_id || actualReceivePoDetail?.header?.supplier_name || '').trim();
    const poNumber = String(actualReceivePoNumber || '').trim();
    const doNumberInput = String(actualReceiveDoNumber || '').trim();
    const arrivalDate = String(actualReceiveArrivalDate || '').trim();
    const remarks = String(actualReceiveRemarks || '').trim();
    const poLines = Array.isArray(actualReceivePoLines) ? actualReceivePoLines : [];
    const availablePoLines = Array.isArray(actualReceivePoAvailableLines) ? actualReceivePoAvailableLines : [];
    const allowOverReceive = Boolean(actualReceiveAllowOver) && Boolean(canEditSchedules);

    if (!poNumber) {
      setActualReceiveError('No PO wajib diisi.');
      return;
    }
    if (!supplier) {
      setActualReceiveError('Supplier wajib diisi.');
      return;
    }
    if (!arrivalDate) {
      setActualReceiveError('Tanggal kedatangan wajib diisi.');
      return;
    }
    if (!doNumberInput) {
      setActualReceiveError('No. SJ / DO wajib diisi.');
      return;
    }
    const duplicateCheck = await performActualReceiveDoCheck(supplier, doNumberInput);
    if (duplicateCheck?.duplicate) {
      setActualReceiveError('Nomor surat jalan/DO sudah ada!');
      return;
    }
    if (poLines.length === 0) {
      setActualReceiveError('Load PO terlebih dahulu.');
      return;
    }
    if (allowOverReceive ? poLines.length === 0 : availablePoLines.length === 0) {
      setActualReceiveError('Tidak ada sisa item kontrak yang bisa menerima incoming.');
      return;
    }

    const items = [];
    const selectableLines = allowOverReceive ? poLines : availablePoLines;
    const doNumber = doNumberInput;
    for (const row of (Array.isArray(actualReceiveRows) ? actualReceiveRows : [])) {
      const poLineId = Number(row.poLineId || 0);
      if (!(poLineId > 0)) continue;
      const matchedLine = selectableLines.find((line) => Number(line.id) === poLineId);
      if (!matchedLine) {
        setActualReceiveError(`Item ${row.itemCode || poLineId} tidak valid atau sisa 0.`);
        return;
      }
      items.push({
        poLineId,
        scheduleId: Number(row.scheduleId || 0) > 0 ? Number(row.scheduleId) : null,
        itemCode: matchedLine?.item_code || String(row.itemCode || '').trim(),
        qty: Number(row.qty || 0),
        itemName: matchedLine?.item_name || '',
        partNo: matchedLine?.part_no || '',
        unit: String(row.unit || matchedLine?.unit || '').trim(),
      });
    }

    if (items.length === 0) {
      setActualReceiveError('Minimal pilih 1 item kontrak PO.');
      return;
    }
    for (const row of items) {
      if (!(Number(row.qty) > 0)) {
        setActualReceiveError(`Qty aktual tidak valid untuk ${row.itemCode || row.poLineId}.`);
        return;
      }
      if (!row.itemCode) {
        setActualReceiveError('Item kontrak PO tidak valid.');
        return;
      }
    }

    setActualReceiveSubmitting(true);
    setActualReceiveError('');
    try {
      const response = await apiFetch('/api/receive-notes/actual', {
        method: 'POST',
        body: JSON.stringify({
          supplier,
          poNumber,
          doNumber,
          arrivalDate,
          truckNo: String(actualReceiveTruckNo || '').trim(),
          driverName: String(actualReceiveDriverName || '').trim(),
          remarks,
          allowOverReceive,
          items,
        }),
      });
      await refreshSchedules?.();
      showToastMessage?.(
        `Penerimaan aktual ${response?.rnNumber || doNumber} tersimpan.`,
        'Buka',
        () => openInboundScheduleFromToast?.(doNumber || poNumber),
        'success',
      );
      closeActualReceiveModal();
    } catch (error) {
      setActualReceiveError(error.message || 'Gagal menyimpan penerimaan aktual.');
    } finally {
      setActualReceiveSubmitting(false);
    }
  }, [
    actualReceiveArrivalDate,
    actualReceiveDoNumber,
    actualReceiveDriverName,
    actualReceivePoDetail,
    actualReceivePoNumber,
    actualReceiveRemarks,
    actualReceiveRows,
    actualReceiveSubmitting,
    actualReceiveSupplier,
    actualReceiveTruckNo,
    actualReceivePoAvailableLines,
    actualReceiveAllowOver,
    canEditSchedules,
    apiFetch,
    closeActualReceiveModal,
    openInboundScheduleFromToast,
    refreshSchedules,
    performActualReceiveDoCheck,
    showToastMessage,
  ]);

  useEffect(() => {
    if (!showActualReceiveModal) return;
    fetchActualReceivePoOptions();
  }, [fetchActualReceivePoOptions, showActualReceiveModal]);

  useEffect(() => {
    if (!showActualReceiveModal || !actualReceivePoNumber || actualReceivePoLoading) return;
    const loadedPoNumber = String(actualReceivePoDetail?.header?.po_number || '').trim();
    if (loadedPoNumber === String(actualReceivePoNumber || '').trim()) return;
    loadActualReceivePo(actualReceivePoNumber);
  }, [
    actualReceivePoDetail?.header?.po_number,
    actualReceivePoLoading,
    actualReceivePoNumber,
    loadActualReceivePo,
    showActualReceiveModal,
  ]);

  useEffect(() => {
    if (!showActualReceiveModal) return undefined;
    const supplier = String(actualReceiveSupplier || actualReceivePoDetail?.header?.supplier_id || actualReceivePoDetail?.header?.supplier_name || '').trim();
    const doNumber = normalizeReceiveDoNumber(actualReceiveDoNumber);
    if (!doNumber) {
      setActualReceiveDoCheckStatus('idle');
      setActualReceiveDoCheckMessage('');
      return undefined;
    }
    const handle = window.setTimeout(() => {
      void performActualReceiveDoCheck(supplier, doNumber);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [
    actualReceiveDoNumber,
    actualReceivePoDetail?.header?.supplier_id,
    actualReceivePoDetail?.header?.supplier_name,
    actualReceiveSupplier,
    performActualReceiveDoCheck,
    showActualReceiveModal,
  ]);

  useEffect(() => {
    if (inboundSubTab !== 'schedule' && showActualReceiveModal) {
      closeActualReceiveModal();
    }
  }, [closeActualReceiveModal, inboundSubTab, showActualReceiveModal]);

  const canManagePo = canImportExport || canManageItems || canManageVendors || canEditSchedules;
  const poLocked = Boolean(poSelectedMeta?.poNumber);

  const vendorById = useMemo(() => {
    const map = new Map();
    (masterVendors || []).forEach((vendor) => {
      const key = String(vendor.id || '').trim().toLowerCase();
      if (key) map.set(key, vendor);
    });
    return map;
  }, [masterVendors]);

  const vendorByName = useMemo(() => {
    const map = new Map();
    (masterVendors || []).forEach((vendor) => {
      const key = String(vendor.name || '').trim().toLowerCase();
      if (key) map.set(key, vendor);
    });
    return map;
  }, [masterVendors]);

  const resolveVendorFromSupplierValue = useCallback((value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!key) return null;
    return vendorById.get(key) || vendorByName.get(key) || null;
  }, [vendorById, vendorByName]);

  const resolveSupplierMeta = useCallback((rowOrValue) => {
    if (!rowOrValue) return { id: '', name: '' };
    if (typeof rowOrValue === 'string') {
      const vendor = resolveVendorFromSupplierValue(rowOrValue);
      return {
        id: vendor?.id || String(rowOrValue).trim(),
        name: vendor?.name || String(rowOrValue).trim(),
      };
    }
    const supplierId = String(
      rowOrValue?.supplierId
        || rowOrValue?.supplier_id
        || rowOrValue?.supplierCode
        || rowOrValue?.supplier_code
        || rowOrValue?.supplier
        || '',
    ).trim();
    const directName = String(rowOrValue?.supplierName || rowOrValue?.supplier_name || '').trim();
    const vendor = resolveVendorFromSupplierValue(supplierId || directName);
    return {
      id: vendor?.id || supplierId,
      name: directName || vendor?.name || supplierId,
    };
  }, [resolveVendorFromSupplierValue]);

  const resolveSupplierLabel = useCallback((row) => {
    const meta = resolveSupplierMeta(row);
    if (meta.name) return meta.name;
    const raw = String(row?.supplier || '').trim();
    if (!raw) return '-';
    const match = vendorNameMap.get(raw.toLowerCase());
    return match || raw;
  }, [resolveSupplierMeta, vendorNameMap]);

  const computeLeadStartDate = useCallback((poDateValue, leadDaysValue) => {
    if (!poDateValue) return '';
    const baseText = String(poDateValue).trim();
    const baseDate = new Date(baseText);
    if (Number.isNaN(baseDate.getTime())) return '';
    let current = new Date(baseDate.getTime());
    const totalDays = Math.max(0, Number(leadDaysValue) || 0);
    for (let i = 0; i < totalDays; i += 1) {
      current.setDate(current.getDate() + 1);
      if (typeof getNextBusinessDay === 'function') {
        current = getNextBusinessDay(current);
      }
    }
    if (typeof getNextBusinessDay === 'function') {
      current = getNextBusinessDay(current);
    }
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [getNextBusinessDay]);

  const resolvePoLineStatus = (line) => {
    const qtyOrder = Number(line?.qty_order || line?.qtyOrder || 0);
    const qtyReceived = Number(line?.qty_received || line?.qtyReceived || 0);
    const remaining = qtyOrder - qtyReceived;
    if (remaining <= 0) return { label: 'Closed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    if (qtyReceived > 0) return { label: 'Partial', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    return { label: 'Open', className: 'border-slate-200 bg-white text-slate-600', dot: 'bg-slate-400' };
  };

  const resetPoForm = () => {
    setPoForm({
      poNumber: '',
      poDate: '',
      supplier: '',
      lines: [createEmptyPoLine()],
    });
  };

  const handlePoFormLineChange = (index, field, value) => {
    setPoForm((prev) => ({
      ...prev,
      lines: (prev.lines || []).map((line, lineIndex) => (
        lineIndex === index ? { ...line, [field]: value } : line
      )),
    }));
  };

  const handleAddPoFormLine = () => {
    setPoForm((prev) => ({
      ...prev,
      lines: [...(prev.lines || []), createEmptyPoLine()],
    }));
  };

  const handleRemovePoFormLine = (index) => {
    setPoForm((prev) => {
      const currentLines = prev.lines || [];
      if (currentLines.length <= 1) {
        return {
          ...prev,
          lines: [createEmptyPoLine()],
        };
      }
      return {
        ...prev,
        lines: currentLines.filter((_, lineIndex) => lineIndex !== index),
      };
    });
  };

  const fetchPoList = useCallback(async ({
    search = poSearch,
    page = poPage,
    perPage = poPerPage,
    start = poFilterStart,
    end = poFilterEnd,
  } = {}) => {
    if (!apiFetch) return;
    setPoLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (start) params.set('start_date', start);
      if (end) params.set('end_date', end);
      params.set('limit', String(perPage));
      params.set('offset', String(Math.max(0, (page - 1) * perPage)));
      params.set('includeTotal', '1');
      const payload = await apiFetch(`/api/po?${params.toString()}`);
      const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
      const total = Number(payload?.total ?? rows.length);
      const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
      if (page > totalPages) {
        setPoPage(totalPages);
        return;
      }
      setPoRows(rows);
      setPoTotal(total);
      setPoTotalPages(totalPages);
    } catch (error) {
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal memuat data PO.', '', null, 'error');
      }
    } finally {
      setPoLoading(false);
    }
  }, [apiFetch, poFilterEnd, poFilterStart, poPage, poPerPage, poSearch, showToastMessage]);

  const fetchPoLines = useCallback(async (poNumber, { force = false } = {}) => {
    if (!poNumber || (!force && (poLineMap[poNumber] || poLineLoading[poNumber]))) return;
    setPoLineLoading((prev) => ({ ...prev, [poNumber]: true }));
    try {
      const detail = await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`);
      const lines = detail?.lines ?? detail?.items ?? [];
      setPoLineMap((prev) => ({ ...prev, [poNumber]: Array.isArray(lines) ? lines : [] }));
    } catch (error) {
      console.error('Gagal memuat detail PO:', error);
      if (showToastMessage) showToastMessage(error.message || 'Gagal memuat detail PO.', '', null, 'error');
      setPoLineMap((prev) => ({ ...prev, [poNumber]: [] }));
    } finally {
      setPoLineLoading((prev) => ({ ...prev, [poNumber]: false }));
    }
  }, [apiFetch, poLineMap, poLineLoading, showToastMessage]);

  useEffect(() => {
    if (inboundSubTab !== 'master-po') return;
    const handle = setTimeout(() => {
      fetchPoList({ search: poSearch, page: poPage, perPage: poPerPage, start: poFilterStart, end: poFilterEnd });
    }, 350);
    return () => clearTimeout(handle);
  }, [fetchPoList, inboundSubTab, poFilterEnd, poFilterStart, poPage, poPerPage, poSearch]);

  useEffect(() => {
    if (!inboundNav) return;
    if (inboundNav.tab) {
      setInboundSubTab(inboundNav.tab);
    }
    if (inboundNav.tab === 'master-po' && typeof inboundNav.poSearch === 'string') {
      setPoSearch(inboundNav.poSearch);
      setPoPage(1);
      fetchPoList({ search: inboundNav.poSearch, page: 1, start: poFilterStart, end: poFilterEnd });
    }
    if (inboundNav.tab === 'master-po' && inboundNav.expandPo) {
      const poNumber = String(inboundNav.expandPo || '').trim();
      if (poNumber) {
        setPoExpanded((prev) => ({ ...prev, [poNumber]: true }));
        fetchPoLines(poNumber);
      }
    }
    if (inboundNav.tab === 'schedule' && typeof inboundNav.scheduleQuery === 'string') {
      setLocalSearchQuery(inboundNav.scheduleQuery);
      setSearchQuery(inboundNav.scheduleQuery);
    }
    if (typeof clearInboundNav === 'function') {
      clearInboundNav();
    }
  }, [clearInboundNav, fetchPoLines, fetchPoList, inboundNav, setLocalSearchQuery, setSearchQuery]);

  useEffect(() => {
    if (inboundSubTab !== 'master-po') return;
    setPoPage(1);
  }, [inboundSubTab, poFilterEnd, poFilterStart, poPerPage, poSearch]);

  const handlePoPageChange = (nextPage) => {
    const safeTotal = Math.max(1, poTotalPages);
    const safePage = Math.min(Math.max(1, Number(nextPage) || 1), safeTotal);
    setPoPage(safePage);
  };

  const handlePoPerPageChange = (nextPerPage) => {
    const safePerPage = Math.max(1, Number(nextPerPage) || poPerPage);
    if (safePerPage === poPerPage) return;
    setPoPerPage(safePerPage);
    setPoPage(1);
  };

  const openPoEdit = (row) => {
    if (!row) return;
    setPoEditForm({
      poNumber: row.po_number || '',
      poDate: row.po_date || '',
      supplier: row.supplier_code || '',
      remarks: row.remarks || '',
      status: row.force_closed ? 'close' : 'open',
    });
    setPoEditError('');
    setPoEditOpen(true);
  };

  const closePoEdit = () => {
    setPoEditOpen(false);
    setPoEditSaving(false);
    setPoEditError('');
  };

  const openPoLineEdit = (poNumber, line) => {
    if (!poNumber || !line) return;
    const qtyOrder = Number(line?.qty_order ?? line?.qtyOrder ?? 0);
    const qtyReceived = Number(line?.qty_received ?? line?.qtyReceived ?? 0);
    const qtyRemaining = Number(line?.qty_remaining ?? line?.qtyRemaining ?? (qtyOrder - qtyReceived));
    const itemCode = String(line?.item_code || line?.itemCode || '').trim();
    setPoLineEditForm({
      poNumber: String(poNumber || '').trim(),
      lineId: String(line?.id || ''),
      itemCode,
      itemName: String(line?.item_name || line?.itemName || resolveMasterItemName(itemCode)).trim(),
      qtyOrder: String(Number.isFinite(qtyOrder) ? qtyOrder : ''),
      qtyReceived,
      qtyRemaining,
    });
    setPoLineEditError('');
    setPoLineEditOpen(true);
  };

  const closePoLineEdit = () => {
    setPoLineEditOpen(false);
    setPoLineEditSaving(false);
    setPoLineEditError('');
  };

  const handleScheduleShortcut = (row) => {
    if (!row) return;
    const poNumber = String(row.po_number || '').trim();
    if (!poNumber) return;
    handleCancelEdit();
    setInboundSubTab('schedule');
    setLocalSearchQuery(poNumber);
    setSearchQuery(poNumber);
    setInputMode('single');
    setShowForm(true);
    setNewPlan((prev) => ({
      ...prev,
      poNumber,
      supplier: row.supplier_code || prev.supplier || '',
      item: '',
      requestDate: '',
      requestQty: '',
      dailyQty: '',
      leadTimeDays: '',
      cycleDays: '1',
      deliveryTime: prev.deliveryTime || '08:00 (Cycle 1)',
      selectedLines: [],
    }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSavePoEdit = async () => {
    if (!apiFetch) return;
    const poNumber = String(poEditForm.poNumber || '').trim();
    if (!poNumber) {
      setPoEditError('Nomor PO tidak valid.');
      return;
    }
    const poDate = String(poEditForm.poDate || '').trim();
    const supplier = String(poEditForm.supplier || '').trim();
    if (!poDate) {
      setPoEditError('Tanggal PO wajib diisi.');
      return;
    }
    if (!supplier) {
      setPoEditError('Supplier wajib diisi.');
      return;
    }
    setPoEditSaving(true);
    setPoEditError('');
    try {
      await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`, {
        method: 'PUT',
        body: JSON.stringify({
          poDate,
          supplierId: supplier,
          status: poEditForm.status || 'open',
          forceClosed: String(poEditForm.status || '').trim().toLowerCase() === 'close',
          remarks: poEditForm.remarks || null,
        }),
      });
      if (showToastMessage) {
        showToastMessage(`PO ${poNumber} berhasil diperbarui.`, '', null, 'info');
      }
      closePoEdit();
      fetchPoList({ search: poSearch });
    } catch (error) {
      const message = error.message || 'Gagal memperbarui PO.';
      setPoEditError(message);
      if (showToastMessage) showToastMessage(message, '', null, 'error');
    } finally {
      setPoEditSaving(false);
    }
  };

  const handleDeletePo = async (row) => {
    if (!apiFetch || !row) return;
    const poNumber = String(row.po_number || '').trim();
    if (!poNumber) return;
    const confirmed = window.confirm(`Hapus PO ${poNumber}? Data yang dihapus tidak bisa dikembalikan.`);
    if (!confirmed) return;
    setPoDeleteLoading(poNumber);
    try {
      await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`, { method: 'DELETE' });
      if (showToastMessage) {
        showToastMessage(`PO ${poNumber} berhasil dihapus.`, '', null, 'info');
      }
      setPoExpanded((prev) => {
        const next = { ...prev };
        delete next[poNumber];
        return next;
      });
      setPoLineMap((prev) => {
        const next = { ...prev };
        delete next[poNumber];
        return next;
      });
      fetchPoList({ search: poSearch });
    } catch (error) {
      const message = error.message || 'Gagal menghapus PO.';
      if (showToastMessage) showToastMessage(message, '', null, 'error');
    } finally {
      setPoDeleteLoading(null);
    }
  };

  const handleSavePoLineEdit = async () => {
    if (!apiFetch) return;
    const poNumber = String(poLineEditForm.poNumber || '').trim();
    const lineId = String(poLineEditForm.lineId || '').trim();
    const itemCode = normalizePoItemCodeInput(poLineEditForm.itemCode);
    const qtyOrder = Number(poLineEditForm.qtyOrder);
    if (!poNumber || !lineId) {
      setPoLineEditError('Line PO tidak valid.');
      return;
    }
    if (!itemCode) {
      setPoLineEditError('Kode item wajib diisi.');
      return;
    }
    if (!masterItemByCode.has(itemCode.toLowerCase())) {
      setPoLineEditError(`Item ${itemCode} tidak ditemukan di master item.`);
      return;
    }
    if (!Number.isFinite(qtyOrder) || qtyOrder <= 0) {
      setPoLineEditError('Qty order wajib diisi dan lebih besar dari 0.');
      return;
    }

    setPoLineEditSaving(true);
    setPoLineEditError('');
    try {
      await apiFetch(`/api/po/${encodeURIComponent(poNumber)}/lines/${encodeURIComponent(lineId)}`, {
        method: 'PUT',
        body: JSON.stringify({ itemCode, qtyOrder }),
      });
      if (showToastMessage) {
        showToastMessage(`PO ${poNumber} - ${itemCode} berhasil diperbarui. Schedule terkait ikut disinkronkan.`, '', null, 'info');
      }
      await Promise.all([
        fetchPoList({ search: poSearch, page: poPage, perPage: poPerPage, start: poFilterStart, end: poFilterEnd }),
        fetchPoLines(poNumber, { force: true }),
      ]);
      closePoLineEdit();
    } catch (error) {
      const message = error.message || 'Gagal memperbarui qty PO.';
      setPoLineEditError(message);
      if (showToastMessage) showToastMessage(message, '', null, 'error');
    } finally {
      setPoLineEditSaving(false);
    }
  };

  const handleCreatePo = async (event) => {
    event.preventDefault();
    if (!apiFetch) return;
    const poNumber = String(poForm.poNumber || '').trim();
    const poDate = String(poForm.poDate || '').trim();
    const supplierCode = String(poForm.supplier || '').trim();
    const rawLines = Array.isArray(poForm.lines) ? poForm.lines : [];
    const activeLines = rawLines
      .map((line) => ({
        itemCode: String(line?.itemCode || '').trim(),
        qtyOrder: Number(line?.qty || 0),
      }))
      .filter((line) => line.itemCode || Number(line.qtyOrder || 0) > 0);
    if (!poNumber || !poDate || !supplierCode || activeLines.length === 0) {
      if (showToastMessage) {
        showToastMessage('Lengkapi data PO, item, dan qty terlebih dahulu.', '', null, 'error');
      }
      return;
    }
    const invalidLine = activeLines.find((line) => !line.itemCode || !Number.isFinite(line.qtyOrder) || line.qtyOrder <= 0);
    if (invalidLine) {
      if (showToastMessage) {
        showToastMessage('Semua baris item harus berisi kode item dan qty yang valid.', '', null, 'error');
      }
      return;
    }
    try {
      await apiFetch('/api/po', {
        method: 'POST',
        body: JSON.stringify({
          poNumber,
          poDate,
          supplierId: supplierCode,
          status: 'Open',
          lines: activeLines,
        }),
      });
      if (showToastMessage) {
        showToastMessage(`PO ${poNumber} berhasil dibuat.`, '', null, 'info');
      }
      resetPoForm();
      setPoFormVisible(false);
      fetchPoList({ search: poSearch });
    } catch (error) {
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal membuat PO.', '', null, 'error');
      }
    }
  };

  const handleImportPoExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ensureXlsx) {
      if (showToastMessage) {
        showToastMessage('Library XLSX belum tersedia.', '', null, 'error');
      }
      return;
    }
    setPoImporting(true);
    setPoImportErrors([]);
    setPoImportErrorOpen(false);
    try {
      const XLSX = await ensureXlsx();
      if (!XLSX) return;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
      if (!rows.length) {
        if (showToastMessage) showToastMessage('File kosong.', '', null, 'error');
        return;
      }

      const localErrors = [];
      const payloadRows = [];
      const normalizeKey = (value) => String(value || '').trim().toLowerCase();
      const pickValue = (bucket, keys = [], contains = []) => {
        for (const key of keys) {
          if (key in bucket) return bucket[key];
        }
        for (const part of contains) {
          const found = Object.keys(bucket).find((key) => key.includes(part));
          if (found) return bucket[found];
        }
        return '';
      };
      const parsePoDate = (value) => {
        const base = formatExcelDate ? formatExcelDate(value) : value;
        if (!base) return '';
        const str = String(base).trim();
        const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (match) {
          const dd = match[1].padStart(2, '0');
          const mm = match[2].padStart(2, '0');
          const yyyy = match[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        return str;
      };

      rows.forEach((row, index) => {
        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeKey(key)] = value;
        });
        const poNumber = String(
          pickValue(
            normalized,
            ['nomor po', 'no po', 'no. po', 'po number', 'po'],
            ['no. po', 'nomor po'],
          ),
        ).trim();
        const supplierCode = String(
          pickValue(
            normalized,
            ['supplier', 'supplier code', 'kode supplier'],
            ['kode supplier'],
          ),
        ).trim();
        const itemCode = String(
          pickValue(
            normalized,
            ['item', 'kode item', 'item code'],
            ['kode item'],
          ),
        ).trim();
        const qtyRaw = pickValue(
          normalized,
          ['qty', 'qty order', 'quantity'],
          ['qty order'],
        );
        const qtyOrder = Number(qtyRaw || 0);
        const dateRaw = pickValue(
          normalized,
          ['tanggal po', 'po date', 'tanggal'],
          ['tanggal po'],
        );
        const poDate = parsePoDate(dateRaw);

        const rowNumber = index + 2;
        const missing = [];
        if (!poNumber) missing.push('No. PO');
        if (!supplierCode) missing.push('Kode Supplier');
        if (!itemCode) missing.push('Kode Item');
        if (!poDate) missing.push('Tanggal PO');
        if (!Number.isFinite(qtyOrder) || qtyOrder <= 0) missing.push('Qty Order');
        if (missing.length) {
          localErrors.push({ row: rowNumber, no_po: poNumber || '-', error: `${missing.join(', ')} tidak valid.` });
          return;
        }

        payloadRows.push({
          rowNumber,
          poNumber,
          poDate,
          supplierCode,
          itemCode,
          qtyOrder,
        });
      });

      if (!payloadRows.length) {
        if (showToastMessage) showToastMessage('Tidak ada data valid untuk diimport.', '', null, 'error');
        if (localErrors.length) {
          setPoImportErrors(localErrors);
          setPoImportErrorOpen(true);
        }
        return;
      }

      let inserted = 0;
      let apiErrors = [];
      try {
        const result = await apiFetch('/api/po/import', {
          method: 'POST',
          body: JSON.stringify({ rows: payloadRows }),
        });
        inserted = Number(result?.inserted || 0);
        apiErrors = Array.isArray(result?.errors) ? result.errors : [];
      } catch (error) {
        if (showToastMessage) showToastMessage(error.message || 'Gagal import PO.', '', null, 'error');
        return;
      }

      const allErrors = [...localErrors, ...apiErrors];
      if (allErrors.length) {
        setPoImportErrors(allErrors);
        setPoImportErrorOpen(true);
      }
      if (showToastMessage) {
        const summary = `Import selesai. Berhasil: ${inserted}, Gagal: ${allErrors.length}.`;
        showToastMessage(summary, '', null, allErrors.length ? 'error' : 'info');
      }
      fetchPoList({ search: poSearch });
    } catch (error) {
      if (showToastMessage) showToastMessage(error.message || 'Gagal import PO.', '', null, 'error');
    } finally {
      setPoImporting(false);
      if (poImportRef.current) poImportRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!poLookupOpen) return;
    const handle = setTimeout(async () => {
      if (!apiFetch) return;
      setPoLookupLoading(true);
      try {
        const params = new URLSearchParams();
        if (poLookupQuery) params.set('q', poLookupQuery);
        params.set('limit', '20');
        params.set('includeTotal', '1');
        const payload = await apiFetch(`/api/po?${params.toString()}`);
        const rows = Array.isArray(payload) ? payload : (payload?.rows || []);
        const filteredRows = rows.filter((row) => {
          const scheduleStatus = resolvePoScheduleStatusMeta(row)?.label;
          if (scheduleStatus === 'FULL DIJADWALKAN') return false;
          if (poLookupIncludePartial) {
            return scheduleStatus === 'BELUM DIJADWALKAN' || scheduleStatus === 'DIJADWALKAN SEBAGIAN';
          }
          return scheduleStatus === 'BELUM DIJADWALKAN';
        });
        setPoLookupRows(filteredRows);
      } catch (error) {
        if (showToastMessage) showToastMessage(error.message || 'Gagal memuat daftar PO.', '', null, 'error');
      } finally {
        setPoLookupLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [apiFetch, poLookupIncludePartial, poLookupOpen, poLookupQuery, showToastMessage]);

  useEffect(() => {
    if (poLookupOpen) return;
    if (newPlan.poNumber && newPlan.poNumber !== poLookupQuery) {
      setPoLookupQuery(newPlan.poNumber);
    }
    if (!newPlan.poNumber && poLookupQuery) {
      setPoLookupQuery('');
    }
  }, [newPlan.poNumber, poLookupOpen, poLookupQuery]);

  const handleSelectPo = async (row) => {
    const poNumber = row?.po_number || row?.poNumber || '';
    if (!poNumber) return;
    setPoLookupQuery(poNumber);
    setPoLookupOpen(false);
    const initialSupplier = row?.supplier_code || row?.supplier_id || '';
    setPoSelectedMeta({ poNumber, poDate: null, supplier: initialSupplier || '', autoFromVendor: false });
    setPoLineOptions([]);
    setPoSelectedLineId(null);
    setNewPlan((prev) => ({
      ...prev,
      poNumber,
      supplier: initialSupplier || prev.supplier || '',
      item: '',
      requestQty: '',
    }));
    try {
      const detail = await apiFetch(`/api/po/${encodeURIComponent(poNumber)}`);
      const header = detail?.header || {};
      const lines = Array.isArray(detail?.lines) ? detail.lines : [];
      if (lines.length === 0) {
        if (showToastMessage) showToastMessage('PO belum memiliki detail item.', '', null, 'error');
        return;
      }
      setPoLineOptions(lines);
      const poDateValue = header?.po_date || header?.poDate || '';
      const supplierValue = header?.supplier_id || row?.supplier_code || row?.supplier_id || '';
      const vendorMatch = resolveVendorFromSupplierValue(supplierValue);
      const leadTimeValue = vendorMatch ? Number(vendorMatch.lead_time_days ?? vendorMatch.leadTimeDays ?? 0) : 0;
      const dailyCapacityValue = vendorMatch ? Number(vendorMatch.daily_capacity_qty ?? vendorMatch.dailyCapacityQty ?? 0) : 0;
      const computedStartDate = computeLeadStartDate(poDateValue, leadTimeValue);
      setPoSelectedMeta({ poNumber, poDate: poDateValue || null, supplier: supplierValue || '', autoFromVendor: Boolean(vendorMatch) });
      const line = lines[0];
      const itemCode = line.item_code || line.itemCode || '';
      const qtyOrder = typeof getPoLineRemainingAfterSchedule === 'function'
        ? getPoLineRemainingAfterSchedule(line)
        : (line.qty_remaining ?? line.qtyRemaining ?? line.qty_order ?? line.qtyOrder ?? '');
      const firstLineId = line.id ?? itemCode;
      setPoSelectedLineId(firstLineId);
      setPoSelectedLineIds(firstLineId ? [firstLineId] : []);
      setNewPlan((prev) => ({
        ...prev,
        supplier: header?.supplier_id || row?.supplier_code || row?.supplier_id || prev.supplier || '',
        item: itemCode,
        requestQty: String(qtyOrder ?? ''),
        leadTimeDays: Number.isFinite(leadTimeValue) ? String(leadTimeValue) : (prev.leadTimeDays || ''),
        dailyQty: Number.isFinite(dailyCapacityValue) && dailyCapacityValue > 0 ? String(dailyCapacityValue) : '',
        requestDate: computedStartDate || prev.requestDate,
      }));
      if (lines.length > 1 && showToastMessage) {
        showToastMessage(`PO ${poNumber} punya ${lines.length} item. Pilih item yang akan dijadwalkan.`, '', null, 'info');
      }
    } catch (error) {
      if (showToastMessage) showToastMessage(error.message || 'Gagal memuat detail PO.', '', null, 'error');
    }
  };

  const handleSelectPoLine = (line) => {
    if (!line) return;
    const lineId = line.id ?? line.item_code ?? line.itemCode;
    if (!lineId) return;
    setPoSelectedLineIds((prev) => {
      const next = prev.includes(lineId)
        ? prev.filter((id) => id !== lineId)
        : [...prev, lineId];
      return next;
    });
  };

  const resolveLineQty = useCallback((line) => {
    if (typeof getPoLineRemainingAfterSchedule === 'function') {
      const remainingAfterSchedule = getPoLineRemainingAfterSchedule(line);
      if (Number.isFinite(remainingAfterSchedule)) return remainingAfterSchedule;
    }
    const qtyOrder = Number(line?.qty_order ?? line?.qtyOrder ?? 0);
    const qtyReceived = Number(line?.qty_received ?? line?.qtyReceived ?? 0);
    const remaining = Number(line?.qty_remaining ?? line?.qtyRemaining ?? (qtyOrder - qtyReceived));
    return remaining;
  }, [getPoLineRemainingAfterSchedule]);

  const filteredPoLines = useMemo(() => (
    poLineOptions.filter((line) => {
      if (!poLineRemainingOnly) return true;
      return resolveLineQty(line) > 0;
    })
  ), [poLineOptions, poLineRemainingOnly, resolveLineQty]);

  const selectablePoLineIds = useMemo(() => (
    filteredPoLines
      .filter((line) => resolveLineQty(line) > 0)
      .map((line) => line.id ?? line.item_code ?? line.itemCode)
      .filter(Boolean)
  ), [filteredPoLines, resolveLineQty]);

  const allPoLinesSelected = selectablePoLineIds.length > 0
    && selectablePoLineIds.every((id) => poSelectedLineIds.includes(id));
  const somePoLinesSelected = selectablePoLineIds.some((id) => poSelectedLineIds.includes(id));

  const selectedLineSummary = useMemo(() => {
    const selected = poLineOptions.filter((line) => {
      const id = line.id ?? line.item_code ?? line.itemCode;
      return id && poSelectedLineIds.includes(id);
    });
    const totalQty = selected.reduce((sum, line) => sum + resolveLineQty(line), 0);
    return { count: selected.length, totalQty };
  }, [poLineOptions, poSelectedLineIds, resolveLineQty]);
  const hasSingleSelectedPoLine = poLocked && poLineOptions.length > 0 && selectedLineSummary.count === 1;
  const showPoLineSummaryOnly = poLocked && poLineOptions.length > 0 && selectedLineSummary.count !== 1;

  const selectedLineForInput = useMemo(() => {
    if (!poLineOptions.length) return null;
    const ids = poSelectedLineIds.length > 0 ? poSelectedLineIds : (poSelectedLineId ? [poSelectedLineId] : []);
    if (!ids.length) return null;
    const idSet = new Set(ids);
    return poLineOptions.find((line) => {
      const id = line.id ?? line.item_code ?? line.itemCode;
      return id && idSet.has(id);
    }) || null;
  }, [poLineOptions, poSelectedLineIds, poSelectedLineId]);

  const remainingForInput = useMemo(() => {
    if (!selectedLineForInput) return null;
    const remaining = resolveLineQty(selectedLineForInput);
    return Number.isFinite(remaining) ? remaining : null;
  }, [selectedLineForInput, resolveLineQty]);

  const inputQtyValue = Number(newPlan.requestQty || 0);
  const normalizedInputQty = useMemo(() => {
    const itemCode = selectedLineForInput?.item_code || selectedLineForInput?.itemCode || newPlan.item;
    const linePackQty = Number(selectedLineForInput?.pack_qty ?? selectedLineForInput?.packQty ?? 0);
    if (newPlan.allowLooseQty) {
      return inputQtyValue;
    }
    if (Number.isFinite(linePackQty) && linePackQty > 0) {
      return Math.ceil(inputQtyValue / linePackQty) * linePackQty;
    }
    if (typeof normalizeQtyByNsp !== 'function') return inputQtyValue;
    const normalized = normalizeQtyByNsp(inputQtyValue, itemCode);
    return Number.isFinite(normalized) ? normalized : inputQtyValue;
  }, [inputQtyValue, newPlan.allowLooseQty, newPlan.item, normalizeQtyByNsp, selectedLineForInput]);
  const isQtyRoundedUp = Number.isFinite(normalizedInputQty)
    && Number.isFinite(inputQtyValue)
    && !newPlan.allowLooseQty
    && normalizedInputQty > inputQtyValue;
  const isQtyOver = Number.isFinite(remainingForInput)
    && Number.isFinite(normalizedInputQty)
    && !newPlan.allowLooseQty
    && normalizedInputQty > 0
    && normalizedInputQty > remainingForInput;

  useEffect(() => {
    if (canUseLooseScheduleQty) return;
    if (!newPlan.allowLooseQty) return;
    setNewPlan((prev) => (prev.allowLooseQty ? { ...prev, allowLooseQty: false } : prev));
  }, [canUseLooseScheduleQty, newPlan.allowLooseQty, setNewPlan]);

  useEffect(() => {
    if (canUseLooseScheduleQty) return;
    if (!scheduleEditForm.allowLooseQty) return;
    setScheduleEditForm((prev) => (prev.allowLooseQty ? { ...prev, allowLooseQty: false } : prev));
  }, [canUseLooseScheduleQty, scheduleEditForm.allowLooseQty, setScheduleEditForm]);

  useEffect(() => {
    if (!poSelectAllRef.current) return;
    poSelectAllRef.current.indeterminate = !allPoLinesSelected && somePoLinesSelected;
  }, [allPoLinesSelected, somePoLinesSelected]);

  useEffect(() => {
    if (!poLocked) return;
    const selectedLines = poLineOptions
      .filter((line) => {
        const id = line.id ?? line.item_code ?? line.itemCode;
        return id && poSelectedLineIds.includes(id);
      })
      .map((line) => ({
        lineId: line.id ?? line.item_code ?? line.itemCode,
        item: line.item_code || line.itemCode || '',
        qty: resolveLineQty(line),
        packQty: Number(line.pack_qty ?? line.packQty ?? 0),
      }))
      .filter((line) => line.item);
    const first = selectedLines[0] || null;
    setNewPlan((prev) => {
      const nextItem = first?.item || prev.item || '';
      const nextRequestQty = first ? String(first.qty ?? '') : String(prev.requestQty ?? '');
      const prevSelectedLines = Array.isArray(prev.selectedLines) ? prev.selectedLines : [];
      const isSameLines = prevSelectedLines.length === selectedLines.length
        && prevSelectedLines.every((line, index) => {
          const nextLine = selectedLines[index];
          if (!nextLine) return false;
          return String(line?.lineId ?? '') === String(nextLine.lineId ?? '')
            && String(line?.item ?? '') === String(nextLine.item ?? '')
            && Number(line?.qty ?? 0) === Number(nextLine.qty ?? 0);
        });
      if (
        isSameLines
        && String(prev.item ?? '') === String(nextItem ?? '')
        && String(prev.requestQty ?? '') === String(nextRequestQty ?? '')
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedLines,
        item: nextItem,
        requestQty: nextRequestQty,
      };
    });
  }, [poLocked, poLineOptions, poSelectedLineIds, resolveLineQty, setNewPlan]);

  const handleClearPoSelection = () => {
    setPoSelectedMeta(null);
    setPoLookupQuery('');
    setPoLineOptions([]);
    setPoSelectedLineId(null);
    setPoSelectedLineIds([]);
    setPoLineRemainingOnly(false);
    setNewPlan((prev) => ({
      ...prev,
      poNumber: '',
      supplier: '',
      item: '',
      requestQty: '',
      leadTimeDays: '',
      dailyQty: '',
      selectedLines: [],
    }));
  };

  const handleDownloadPoTemplate = async () => {
    if (!canManagePo) {
      if (showToastMessage) showToastMessage('Anda tidak memiliki akses untuk download template.', '', null, 'error');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const templateData = [
      {
        'No. PO': 'PO-0001',
        'Tanggal PO (Format: DD-MM-YYYY)': '05-03-2026',
        'Kode Supplier': 'SUP-001',
        'Kode Item': 'RM-0001',
        'Qty Order': 1200,
      },
      {
        'No. PO': 'PO-0002',
        'Tanggal PO (Format: DD-MM-YYYY)': '06-03-2026',
        'Kode Supplier': 'SUP-002',
        'Kode Item': 'RM-0002',
        'Qty Order': 500,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master PO');
    XLSX.writeFile(wb, 'Template_Master_PO.xlsx');
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const buildMasterPoExportRows = useCallback(async () => {
    const summaryRows = Array.isArray(poRows) ? poRows : [];
    const detailCache = new Map();
    const getPoDetailLines = async (poNumber) => {
      const normalized = String(poNumber || '').trim();
      if (!normalized) return [];
      if (detailCache.has(normalized)) return detailCache.get(normalized);
      const cachedLines = Array.isArray(poLineMap?.[normalized]) ? poLineMap[normalized] : null;
      if (cachedLines) {
        detailCache.set(normalized, cachedLines);
        return cachedLines;
      }
      const response = await apiFetch(`/api/po/${encodeURIComponent(normalized)}`);
      const lines = Array.isArray(response?.lines)
        ? response.lines
        : Array.isArray(response?.items)
          ? response.items
          : [];
      detailCache.set(normalized, lines);
      return lines;
    };

    const rows = [];
    for (const summaryRow of summaryRows) {
      const poNumber = String(summaryRow.po_number || '').trim();
      const detailLines = await getPoDetailLines(poNumber);
      const scheduleStatusMeta = resolvePoScheduleStatusMeta(summaryRow);
      const statusMeta = resolvePoStatusMeta(summaryRow.status);
      const totalOrder = Number(summaryRow.total_qty_order || 0);
      const totalReceived = Number(summaryRow.total_qty_received || 0);
      const totalRemaining = Math.max(0, totalOrder - totalReceived);
      if (detailLines.length === 0) {
        rows.push({
          'No': rows.length + 1,
          'PO Number': poNumber,
          'Tanggal PO': summaryRow.po_date ? formatDateID(summaryRow.po_date) : '',
          'Supplier': resolveSupplierLabel(summaryRow),
          'Status PO': statusMeta.label,
          'Status Jadwal': scheduleStatusMeta.label,
          'Kode Item': '',
          'Nama Barang': '',
          'Qty/Kanban': '',
          'Qty Order': '',
          'Qty Received': '',
          'Sisa': '',
          'Status Item': '',
        });
        continue;
      }
      detailLines.forEach((line) => {
        const qtyOrderLine = Number(line.qty_order || 0);
        const qtyReceivedLine = Number(line.qty_received || 0);
        const remainingLine = Number.isFinite(Number(line.qty_remaining))
          ? Number(line.qty_remaining)
          : Math.max(0, qtyOrderLine - qtyReceivedLine);
        rows.push({
          'No': rows.length + 1,
          'PO Number': poNumber,
          'Tanggal PO': summaryRow.po_date ? formatDateID(summaryRow.po_date) : '',
          'Supplier': resolveSupplierLabel(summaryRow),
          'Status PO': statusMeta.label,
          'Status Jadwal': scheduleStatusMeta.label,
          'Kode Item': line.item_code || line.itemCode || '',
          'Nama Barang': line.item_name || line.itemName || '',
          'Qty/Kanban': Number(line.qty_per_kanban ?? line.qtyPerKanban ?? line.pack_qty ?? 0),
          'Qty Order': qtyOrderLine,
          'Qty Received': qtyReceivedLine,
          'Sisa': remainingLine,
          'Status Item': resolvePoLineStatus(line).label,
        });
      });
      rows.push({
        'No': '',
        'PO Number': `${poNumber} TOTAL`,
        'Tanggal PO': '',
        'Supplier': '',
        'Status PO': '',
        'Status Jadwal': '',
        'Kode Item': '',
        'Nama Barang': '',
        'Qty/Kanban': '',
        'Qty Order': totalOrder,
        'Qty Received': totalReceived,
        'Sisa': totalRemaining,
        'Status Item': '',
      });
    }
    return rows;
  }, [apiFetch, formatDateID, poLineMap, poRows, resolvePoLineStatus, resolvePoScheduleStatusMeta, resolvePoStatusMeta, resolveSupplierLabel]);

  const handleExportMasterPoExcel = async () => {
    if (!canManagePo) {
      if (showToastMessage) showToastMessage('Anda tidak memiliki akses export Master PO.', '', null, 'error');
      return;
    }
    setPoExportLoading(true);
    try {
      const XLSX = await ensureXlsx();
      if (!XLSX) return;
      const rows = await buildMasterPoExportRows();
      if (rows.length === 0) {
        alert('Data kosong!');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Master PO');
      XLSX.writeFile(wb, `Master_PO_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      alert(`Gagal export Master PO: ${error.message || 'Unknown error'}`);
    } finally {
      setPoExportLoading(false);
    }
  };

  const handlePrintMasterPo = async () => {
    if (!canManagePo) {
      if (showToastMessage) showToastMessage('Anda tidak memiliki akses print Master PO.', '', null, 'error');
      return;
    }
    setPoPrintLoading(true);
    try {
      const rows = await buildMasterPoExportRows();
      if (rows.length === 0) {
        alert('Data kosong!');
        return;
      }
      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
      if (!printWindow) {
        alert('Popup print diblokir browser.');
        return;
      }
      const nowLabel = new Date().toLocaleString('id-ID');
      const tableRows = rows.map((row) => `
        <tr class="${String(row['PO Number'] || '').endsWith(' TOTAL') ? 'total-row' : ''}">
          <td>${escapeHtml(row.No)}</td>
          <td>${escapeHtml(row['PO Number'])}</td>
          <td>${escapeHtml(row['Tanggal PO'])}</td>
          <td>${escapeHtml(row.Supplier)}</td>
          <td>${escapeHtml(row['Status PO'])}</td>
          <td>${escapeHtml(row['Status Jadwal'])}</td>
          <td>${escapeHtml(row['Kode Item'])}</td>
          <td>${escapeHtml(row['Nama Barang'])}</td>
          <td class="num">${escapeHtml(formatQty(row['Qty/Kanban']))}</td>
          <td class="num">${escapeHtml(formatQty(row['Qty Order']))}</td>
          <td class="num">${escapeHtml(formatQty(row['Qty Received']))}</td>
          <td class="num">${escapeHtml(formatQty(row['Sisa']))}</td>
          <td>${escapeHtml(row['Status Item'])}</td>
        </tr>
      `).join('');
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Master PO</title>
            <style>
              @page { size: landscape; margin: 12mm; }
              body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
              h1 { margin: 0 0 6px; font-size: 20px; }
              .meta { margin-bottom: 14px; color: #475569; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
              th { background: #f8fafc; text-align: left; }
              td.num, th.num { text-align: right; }
              .total-row td { background: #eff6ff; font-weight: 700; }
            </style>
          </head>
          <body>
            <h1>Master PO</h1>
            <div class="meta">Dicetak: ${escapeHtml(nowLabel)} | Total baris: ${rows.length}</div>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>PO Number</th>
                  <th>Tanggal PO</th>
                  <th>Supplier</th>
                  <th>Status PO</th>
                  <th>Status Jadwal</th>
                  <th>Kode Item</th>
                  <th>Nama Barang</th>
                  <th class="num">Qty/Kanban</th>
                  <th class="num">Qty Order</th>
                  <th class="num">Qty Received</th>
                  <th class="num">Sisa</th>
                  <th>Status Item</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      alert(`Gagal print Master PO: ${error.message || 'Unknown error'}`);
    } finally {
      setPoPrintLoading(false);
    }
  };

  function resolvePoStatusMeta(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'closed') {
      return { label: 'PO CLOSED', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    }
    if (normalized === 'partial') {
      return { label: 'PO PARTIAL', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    }
    if (normalized === 'open') {
      return { label: 'PO OPEN', className: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' };
    }
    return { label: 'PO UNKNOWN', className: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  }

  function resolvePoLifecycleMeta(row) {
    const status = String(row?.status || '').trim().toLowerCase();
    const remainingRaw = Number(row?.total_qty_remaining);
    const hasRemaining = Number.isFinite(remainingRaw);
    const isClosedLike = ['closed', 'rejected', 'cancelled', 'canceled', 'close'].includes(status)
      || (hasRemaining ? remainingRaw <= 0 : false);
    if (isClosedLike) {
      return { label: 'CLOSED', className: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
    }
    return { label: 'OPEN', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  }

  function resolvePoScheduleStatusMeta(row) {
    const totalOrder = Number(row?.total_qty_order || 0);
    const totalReceived = Number(row?.total_qty_received || 0);
    const rawAvailableRemaining = Number(row?.total_qty_remaining);
    const remaining = Number.isFinite(rawAvailableRemaining)
      ? rawAvailableRemaining
      : totalOrder - totalReceived;
    const scheduled = Number(row?.total_qty_scheduled ?? row?.scheduled_qty ?? 0);
    const scheduleCount = Number(row?.schedule_count ?? row?.scheduleCount ?? 0);
    const hasSchedule = scheduled > 0 || scheduleCount > 0;
    if (remaining <= 0) {
      return { label: 'FULL DIJADWALKAN', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    }
    if (!hasSchedule) {
      return { label: 'BELUM DIJADWALKAN', className: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
    }
    return { label: 'DIJADWALKAN SEBAGIAN', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  }

  const resolveScheduleStatusMeta = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'on time') {
      return { label: 'ON TIME', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    }
    if (normalized === 'late completion') {
      return { label: 'LATE COMPLETION', className: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' };
    }
    if (normalized === 'partial on time') {
      return { label: 'PARTIAL ON TIME', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    }
    if (normalized === 'partial late') {
      return { label: 'PARTIAL LATE', className: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' };
    }
    if (normalized === 'partial too early') {
      return { label: 'PARTIAL TOO EARLY', className: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' };
    }
    if (normalized === 'partial') {
      return { label: 'PARTIAL', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    }
    if (normalized === 'late') {
      return { label: 'LATE', className: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
    }
    if (normalized === 'too early') {
      return { label: 'TOO EARLY', className: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' };
    }
    return { label: 'PENDING', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  };

  return (
    <>
            {/* Monitoring Supplier */}
            {mainTab === 'monitoring' && (
            <div className="space-y-6 inbound-apple">
            <div className="bg-white/90 rounded-2xl border border-slate-200/70 px-4 shadow-sm print:hidden">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {[
                  { key: 'schedule', label: 'Inbound Schedule' },
                  { key: 'master-po', label: 'Master PO' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setInboundSubTab(tab.key)}
                    className={`relative py-3 text-sm transition ${
                      inboundSubTab === tab.key
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    {inboundSubTab === tab.key && (
                      <span className="absolute left-0 -bottom-[1px] h-[2px] w-full rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {inboundSubTab === 'schedule' && (
            <>
            {showForm && (
               <div className="bg-white/90 p-6 rounded-3xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] mb-8 border border-slate-200/70 animate-fade-in-down print:hidden">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                        <div><h3 className="font-semibold text-xl text-slate-900">{isEditing ? 'Edit Jadwal' : 'Buat Jadwal Kedatangan'}</h3><p className="text-sm text-slate-500">{isEditing ? 'Perbarui data yang salah' : 'Input manual atau gunakan AI'}</p></div>
                        {!isEditing && (
                        <div className="flex flex-wrap gap-2">
                          {canUseAI && (
                            <button onClick={() => setParseModalOpen(true)} className="px-3 py-1.5 text-xs font-semibold rounded-full transition flex items-center gap-2 bg-slate-900 text-white shadow hover:shadow-lg"><Wand2 size={14} className="text-slate-100" /> Isi Otomatis (AI)</button>
                          )}
                          <div className="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setInputMode('single')} className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${inputMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><CalendarDays size={14} /> Single</button>
                            <button onClick={() => setInputMode('bulk')} className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${inputMode === 'bulk' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}><Split size={14} /> Split PO</button>
                          </div>
                        </div>
                        )}
                   </div>
                   <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="flex flex-col gap-1" data-po-lookup>
                       <label className="text-xs font-semibold text-gray-500">No. PO</label>
                       <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                         <input
                           type="checkbox"
                           checked={poLookupIncludePartial}
                           onChange={(e) => setPoLookupIncludePartial(e.target.checked)}
                         />
                         Tampilkan PO dijadwalkan sebagian
                       </label>
                       <div className="relative">
                         <input
                           required
                           className="border p-2 rounded outline-none w-full"
                           value={poLookupQuery}
                           onFocus={() => setPoLookupOpen(true)}
                           onChange={(e) => {
                             const next = e.target.value;
                             setPoLookupQuery(next);
                             setNewPlan((prev) => ({ ...prev, poNumber: next }));
                             if (poSelectedMeta && next !== poSelectedMeta.poNumber) {
                               setPoSelectedMeta(null);
                               setNewPlan((prev) => ({ ...prev, supplier: '', item: '', requestQty: '', leadTimeDays: '', dailyQty: '', selectedLines: [] }));
                             }
                           }}
                           placeholder="Cari No. PO"
                         />
                         {poLocked && (
                           <button
                             type="button"
                             onClick={handleClearPoSelection}
                             className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                             title="Hapus pilihan PO"
                           >
                             <XIcon size={14} />
                           </button>
                         )}
                         {poLookupOpen && (
                           <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-[60]">
                             {poLookupLoading ? (
                               <div className="p-3 text-xs text-slate-500">Memuat daftar PO...</div>
                             ) : poLookupRows.length === 0 ? (
                               <div className="p-3 text-xs text-slate-500">PO tidak ditemukan.</div>
                             ) : (
                               poLookupRows.map((row) => (
                                 <button
                                   key={row.po_number}
                                   type="button"
                                   onClick={() => handleSelectPo(row)}
                                   className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                >
                                  <div className="mb-1">
                                    {(() => {
                                      const scheduleStatusMeta = resolvePoScheduleStatusMeta(row);
                                      return (
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${scheduleStatusMeta.className}`}>
                                          <span className={`h-1.5 w-1.5 rounded-full ${scheduleStatusMeta.dot}`} />
                                          {scheduleStatusMeta.label}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <div className="font-semibold text-slate-800">{row.po_number}</div>
                                   <div className="text-[11px] text-slate-500">
                                     {resolveSupplierLabel(row)} ({resolveSupplierMeta(row).id || '-'}) • {row.status || '-'} • Line {row.line_count ?? 0}
                                   </div>
                                 </button>
                               ))
                             )}
                           </div>
                         )}
                       </div>
                     </div>
                       <div className="flex flex-col gap-1">
                         <label className="text-xs font-semibold text-gray-500">Supplier</label>
                         <input required className="border p-2 rounded outline-none" value={newPlan.supplier} onChange={e => setNewPlan({...newPlan, supplier: e.target.value})} readOnly={poLocked} disabled={poLocked} />
                         {newPlan.supplier && resolveVendorFromSupplierValue(newPlan.supplier) && (
                           <div className="text-[11px] text-slate-500">
                             {resolveVendorFromSupplierValue(newPlan.supplier)?.name}
                           </div>
                         )}
                       </div>
                       {(!poLocked || poLineOptions.length === 0 || hasSingleSelectedPoLine) ? (
                         <>
                           <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-500">Item / Barang</label><input required className="border p-2 rounded outline-none" value={newPlan.item} onChange={e => setNewPlan({...newPlan, item: e.target.value})} readOnly={poLocked} disabled={poLocked} /></div>
                           <div className="flex flex-col gap-1">
                             <label className="text-xs font-semibold text-gray-500">{inputMode === 'bulk' && !isEditing ? 'Total Qty' : 'Qty Order'}</label>
                              <input
                                required
                                type="number"
                                step={canUseLooseScheduleQty ? 'any' : '1'}
                                className={`border p-2 rounded outline-none ${isQtyOver ? 'border-red-400 bg-red-50' : ''}`}
                                value={newPlan.requestQty}
                                onChange={e => setNewPlan({ ...newPlan, requestQty: e.target.value })}
                                readOnly={poLocked && !hasSingleSelectedPoLine}
                                disabled={poLocked && !hasSingleSelectedPoLine}
                             />
                             {isQtyRoundedUp && !isQtyOver && (
                               <div className="text-[11px] text-amber-600">
                                 Qty akan dibulatkan menjadi {formatQty(normalizedInputQty)} mengikuti pack item.
                               </div>
                             )}
                             {isQtyOver && Number.isFinite(remainingForInput) && (
                               <div className="text-[11px] text-red-600">
                                 Error: Qty setelah pembulatan pack menjadi {formatQty(normalizedInputQty)}, melebihi sisa PO ({formatQty(remainingForInput)})
                               </div>
                             )}
                             {canUseLooseScheduleQty && (
                               <label className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                                 <input
                                   type="checkbox"
                                   checked={Boolean(newPlan.allowLooseQty)}
                                   onChange={(e) => setNewPlan({ ...newPlan, allowLooseQty: e.target.checked })}
                                 />
                                 Izinkan plus/minus (khusus admin & PPIC)
                               </label>
                             )}
                           </div>
                         </>
                       ) : (
                         <>
                           <div className="flex flex-col gap-1">
                             <label className="text-xs font-semibold text-gray-500">Item / Barang</label>
                             <div className="border p-2 rounded bg-slate-50 text-sm text-slate-600">
                               {selectedLineSummary.count} item dipilih
                             </div>
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className="text-xs font-semibold text-gray-500">Total Qty Dipilih</label>
                             <div className="border p-2 rounded bg-slate-50 text-sm text-slate-600">
                               {formatQty(selectedLineSummary.totalQty)}
                             </div>
                           </div>
                         </>
                       )}
                       {poLocked && poLineOptions.length > 0 && (
                         <div className="md:col-span-3">
                           <div className="flex items-center justify-between gap-2 mb-2">
                             <div className="text-xs font-semibold text-slate-600">Daftar Item PO</div>
                             <label className="flex items-center gap-2 text-[11px] text-slate-500">
                               <input
                                 type="checkbox"
                                 checked={poLineRemainingOnly}
                                 onChange={(e) => setPoLineRemainingOnly(e.target.checked)}
                               />
                               Tampilkan Sisa Tersedia untuk Incoming &gt; 0
                             </label>
                           </div>
                           <div className="rounded-2xl border border-slate-200 bg-white/90 overflow-x-auto">
                             <table className="min-w-full text-xs">
                               <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                                 <tr>
                                   <th className="p-3 text-left w-8">
                                     <input
                                       ref={poSelectAllRef}
                                       type="checkbox"
                                       checked={allPoLinesSelected}
                                       onChange={() => {
                                         if (allPoLinesSelected) {
                                           setPoSelectedLineIds((prev) => prev.filter((id) => !selectablePoLineIds.includes(id)));
                                         } else {
                                           setPoSelectedLineIds((prev) => Array.from(new Set([...prev, ...selectablePoLineIds])));
                                         }
                                       }}
                                     />
                                   </th>
                                   <th className="p-3 text-left">Item</th>
                                   <th className="p-3 text-right">Qty/Kbn</th>
                                   <th className="p-3 text-right">Qty Order</th>
                                   <th className="p-3 text-right">Qty Received</th>
                                   <th className="p-3 text-right">Sisa</th>
                                   <th className="p-3 text-left">Status</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {filteredPoLines.map((line) => {
                                     const qtyOrder = Number(line.qty_order || line.qtyOrder || 0);
                                     const qtyReceived = Number(line.qty_received || line.qtyReceived || 0);
                                     const remaining = resolveLineQty(line);
                                     const qtyPerKanban = Number(line.qty_per_kanban ?? line.qtyPerKanban ?? line.pack_qty ?? 0);
                                     const statusMeta = resolvePoLineStatus(line);
                                     const itemCode = line.item_code || line.itemCode || '-';
                                     const itemName = line.item_name || line.itemName || '';
                                     const lineId = line.id ?? itemCode;
                                     const isSelected = poSelectedLineIds.includes(lineId);
                                     return (
                                       <tr
                                         key={lineId}
                                         onClick={() => handleSelectPoLine(line)}
                                         className={`border-t border-slate-200 cursor-pointer ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                                       >
                                         <td className="p-3">
                                           <input
                                             type="checkbox"
                                             checked={isSelected}
                                             disabled={remaining <= 0}
                                             onClick={(e) => e.stopPropagation()}
                                             onChange={() => handleSelectPoLine(line)}
                                           />
                                         </td>
                                         <td className="p-3 text-slate-700">
                                           <div className="font-semibold">{itemCode}</div>
                                           {itemName && <div className="text-[11px] text-slate-500">{itemName}</div>}
                                           <div className="mt-1 text-[11px] text-slate-500">Qty/Kbn: {formatQty(qtyPerKanban)}</div>
                                         </td>
                                         <td className="p-3 text-right text-slate-600">{formatQty(qtyPerKanban)}</td>
                                         <td className="p-3 text-right text-slate-600">{formatQty(qtyOrder)}</td>
                                         <td className="p-3 text-right text-slate-600">{formatQty(qtyReceived)}</td>
                                         <td className="p-3 text-right text-slate-600">{formatQty(remaining)}</td>
                                         <td className="p-3">
                                           <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusMeta.className}`}>
                                             <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                                             {statusMeta.label}
                                           </span>
                                         </td>
                                       </tr>
                                     );
                                   })}
                               </tbody>
                             </table>
                           </div>
                           <div className="mt-2 text-[11px] text-slate-500">
                             Klik baris item untuk memilih item yang akan dijadwalkan. Pilih 1 item jika ingin mengubah qty manual.
                           </div>
                         </div>
                       )}
                       <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-500">Lead Time (Hari)</label><input type="number" min="0" className="border p-2 rounded outline-none" value={newPlan.leadTimeDays || ''} onChange={e => {
                         const nextValue = e.target.value;
                         setNewPlan((prev) => {
                           const computedDate = poSelectedMeta?.poDate ? computeLeadStartDate(poSelectedMeta.poDate, nextValue) : prev.requestDate;
                           return { ...prev, leadTimeDays: nextValue, requestDate: computedDate || prev.requestDate };
                         });
                       }} />{poSelectedMeta?.autoFromVendor && (
                         <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Auto-filled from Master Vendor</div>
                       )}</div>
                       <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-500">{inputMode === 'bulk' && !isEditing ? 'Mulai Tanggal' : 'Jadwal Diminta'}</label><input required type="date" className="border p-2 rounded outline-none" value={newPlan.requestDate} onChange={e => setNewPlan({...newPlan, requestDate: e.target.value})} /></div>
                       <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-500">Jam Kirim (Cycle)</label><select className="border p-2 rounded outline-none bg-white" value={newPlan.deliveryTime} onChange={e => setNewPlan({...newPlan, deliveryTime: e.target.value})}>{DELIVERY_CYCLES.map((c, i) => <option key={i} value={c.value}>{c.label}</option>)}</select></div>
                       {inputMode === 'bulk' && !isEditing && (<><div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Package size={12}/> Kapasitas Kirim Harian</label><input required type="number" className="border border-slate-200 bg-white p-2 rounded outline-none" value={newPlan.dailyQty} onChange={e => setNewPlan({...newPlan, dailyQty: e.target.value})} /></div><div className="flex flex-col gap-1"><label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><CalendarOff size={12}/> Siklus Kirim (Hari)</label><input required type="number" min="1" className="border border-slate-200 bg-white p-2 rounded outline-none" value={newPlan.cycleDays} onChange={e => setNewPlan({...newPlan, cycleDays: e.target.value})} /></div></>)}
                       <div className="md:col-span-3 flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
                         <button type="button" onClick={() => { handleCancelEdit(); setShowForm(false); }} className="px-4 py-2 text-slate-600 bg-slate-100 rounded">Batal</button>
                         <button
                           type="submit"
                           className="bg-slate-900 text-white px-6 py-2 rounded shadow disabled:opacity-60 disabled:cursor-not-allowed"
                           disabled={isQtyOver || showPoLineSummaryOnly && selectedLineSummary.count === 0}
                         >
                           Simpan
                         </button>
                       </div>
                   </form>
               </div>
            )}

            {/* Search & Filter */}
            <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200/70 bg-white/85 shadow-[0_14px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur print:hidden">
              <div className="pointer-events-none absolute -right-24 -top-24 h-44 w-44 rounded-full bg-gradient-to-br from-sky-200/40 to-transparent blur-2xl" />
              <div className="pointer-events-none absolute left-8 -bottom-24 h-44 w-44 rounded-full bg-gradient-to-tr from-emerald-200/35 to-transparent blur-2xl" />
              <div className="relative z-10 flex flex-col gap-3 p-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-slate-400">
                  <span>PO Inbound</span>
                  <span className="text-[11px] normal-case tracking-normal text-slate-500">Cari PO cepat</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="No. PO / Supplier / Item"
                      className="h-9 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative min-w-[150px]">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      className="h-9 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={filterStart}
                      onChange={(e) => setFilterStart(e.target.value)}
                      title="Filter Tanggal Mulai"
                    />
                  </div>
                  <div className="relative min-w-[150px]">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      className="h-9 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={filterEnd}
                      onChange={(e) => setFilterEnd(e.target.value)}
                      title="Filter Tanggal Akhir"
                    />
                  </div>
                  <div className="inline-flex min-w-[160px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 shadow-sm">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      className="h-7 bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="All">Semua Status</option>
                      <option value="On Time">On Time</option>
                      <option value="Late">Late</option>
                      <option value="Too Early">Too Early &gt; H-1</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="inline-flex min-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 shadow-sm">
                    <Truck size={14} className="text-slate-400" />
                    <select
                      className="h-7 min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                    >
                      <option value="All">Semua Supplier</option>
                      {scheduleSupplierOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(canEditSchedules || canImportSchedules || canUseAI) && (
                    <div className="relative" data-action-menu>
                      {(canImportSchedules || canEditSchedules) && (
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          ref={inboundImportRef}
                          onChange={handleImportExcel}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setInboundActionOpen((prev) => !prev)}
                        ref={inboundActionRef}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        title="Aksi Inbound"
                      >
                        <MoreVertical size={16} />
                        Aksi
                      </button>
                      {inboundActionOpen && (
                        <div
                          className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white shadow-xl z-[90] overflow-hidden text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canImportSchedules && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                inboundImportRef.current?.click();
                                setInboundActionOpen(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                            >
                              <FileSpreadsheet size={16} /> Import / Template XLS
                            </button>
                          )}
                          <div className="border-t border-slate-100" />
                          {canEditSchedules && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCancelEdit();
                                  setShowForm(true);
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Plus size={16} /> Tambah Manual
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  inboundImportRef.current?.click();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <FileSpreadsheet size={16} /> Import Schedule (XLS)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadTemplate?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Download size={16} /> Download Template Schedule
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePrintPDF?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Printer size={16} /> Print
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInboundCardScanOpen(true);
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <QrCode size={16} /> Scan Inbound Card
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePrintInboundCards(selectedScheduleIds);
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-60"
                                disabled={selectedScheduleIds.length === 0}
                              >
                                <Printer size={16} /> Print Kanban Cards
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openActualReceiveModal();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-60"
                                disabled={isStockOpnameLocked}
                                title={isStockOpnameLocked ? 'Selesaikan dulu Stock Opname!' : 'Penerimaan aktual'}
                              >
                                <PackagePlus size={16} /> Penerimaan Aktual Baru
                              </button>
                            </>
                          )}
                          {canImportSchedules && (
                            <>
                              <div className="border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  inboundImportRef.current?.click();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <FileSpreadsheet size={16} /> Import Jadwal (Excel)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadTemplate?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Download size={16} /> Download Template Jadwal
                              </button>
                              <div className="border-t border-slate-100" />
                              <div className="px-4 py-3 text-xs text-slate-500">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Orientasi Cetak</div>
                                <div className="mt-2 flex items-center gap-3">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="inbound-print-orientation-compact"
                                      value="portrait"
                                      checked={inboundPrintOrientation === 'portrait'}
                                      onChange={() => setInboundPrintOrientation?.('portrait')}
                                    />
                                    Portrait
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="inbound-print-orientation-compact"
                                      value="landscape"
                                      checked={inboundPrintOrientation === 'landscape'}
                                      onChange={() => setInboundPrintOrientation?.('landscape')}
                                    />
                                    Landscape
                                  </label>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleGenerateReport?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <FileText size={16} /> Buat Laporan Narasi
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePrintPDF?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Printer size={16} /> Cetak PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleExportExcel?.();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Download size={16} /> Download Excel
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Table */}
            <div className="relative z-0 bg-white/90 rounded-3xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] border border-slate-200/70 inbound-schedule-table-wrapper print:hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[1120px] text-sm text-left inbound-schedule-print-table">
                  <div
                    className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] tracking-[0.18em] grid items-center box-border"
                    style={{ gridTemplateColumns: gridTemplate, paddingRight: scrollbarWidth }}
                  >
                    <div className="h-full p-4 text-center border-r border-b border-slate-200">
                      {canEditSchedules && (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScheduleIds(selectableIds);
                            } else {
                              setSelectedScheduleIds([]);
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="h-full p-4 border-r border-b border-slate-200">Info PO & Supplier</div>
                    <div className="h-full p-4 border-r border-b border-slate-200">Barang</div>
                    <div className="h-full p-4 bg-sky-50 text-sky-700 border-r border-b border-slate-200">PLAN</div>
                    <div className="h-full p-4 bg-emerald-50 text-emerald-700 pr-6 border-r border-b border-slate-200">ACTUAL</div>
                    <div className="h-full p-4 text-center pl-4 border-r border-b border-slate-200">Status</div>
                    <div className="h-full p-4 border-r border-b border-slate-200">Catatan</div>
                    <div className="h-full p-4 text-center border-b border-slate-200">Aksi</div>
                  </div>
                  {scheduleLoading ? (
                    <div className="p-8 text-center text-gray-400 italic">Memuat data...</div>
                  ) : filteredSchedules.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic">Data tidak ditemukan.</div>
                  ) : (
                    <div
                      ref={scrollRef}
                      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                      className="h-[70vh] overflow-y-auto"
                      style={{ scrollbarGutter: 'stable' }}
                    >
                      <div className="relative" style={{ height: visibleWindow.total * rowHeight }}>
                        {visibleRows.map((item, idx) => {
                          const rowIndex = visibleWindow.startIndex + idx;
                          const noteValue = noteDrafts[item.id] ?? item.notes ?? '';
                          const poStatusMeta = resolvePoStatusMeta(item.poStatus);
                          const displayStatus = typeof getKpiStatus === 'function' ? getKpiStatus(item) : item.status;
                          const scheduleStatusMeta = resolveScheduleStatusMeta(displayStatus);
                          const timingFlag = typeof getTimingFlag === 'function' ? getTimingFlag(item.requestDate, item.arrivalDate) : '';
                          return (
                            <div
                              key={item.id}
                              className="grid items-stretch bg-white/90 transition hover:bg-white"
                              style={{ gridTemplateColumns: gridTemplate, position: 'absolute', top: rowIndex * rowHeight, height: rowHeight, width: '100%' }}
                            >
                              <div className="h-full p-4 pt-3 text-center border-r border-b border-slate-200">
                                {canEditSchedules && (
                                  <input
                                    type="checkbox"
                                    checked={selectedScheduleIds.includes(item.id)}
                                    disabled={item.actualLocked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedScheduleIds((prev) => Array.from(new Set([...prev, item.id])));
                                      } else {
                                        setSelectedScheduleIds((prev) => prev.filter((id) => id !== item.id));
                                      }
                                    }}
                                  />
                                )}
                              </div>
                              <div className="h-full p-4 pt-3 border-r border-b border-slate-200">
                                <div className="font-semibold text-slate-900">{item.poNumber}</div>
                                <div className="text-sm text-slate-500">{resolveSupplierLabel(item)}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${poStatusMeta.className}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${poStatusMeta.dot}`} />
                                    {poStatusMeta.label}
                                  </span>
                                  {item.isSplitResult && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                                      <GitFork size={9} /> Pecahan Split
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 border-r border-b border-slate-200">
                                {(() => {
                                  const rawItem = String(item.item || '').trim();
                                  const [itemCode, ...restParts] = rawItem.split(/\s+/);
                                  const spec = restParts.join(' ');
                                  const itemName = item.itemName || item.item_name;
                                  const showName = itemName && !rawItem.toLowerCase().includes(String(itemName).toLowerCase());
                                  return (
                                    <div className="flex items-start gap-2">
                                      <Package size={14} className="mt-0.5" />
                                      <div>
                                        <div className="font-semibold text-slate-800">{itemCode || rawItem}</div>
                                        {spec && <div className="text-[11px] text-slate-500">{spec}</div>}
                                        {!spec && showName && <div className="text-[11px] text-slate-500">{itemName}</div>}
                                        {spec && showName && <div className="text-[11px] text-slate-500">{itemName}</div>}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="h-full p-4 pt-3 bg-sky-50/40 border-r border-b border-slate-200">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold">{formatDateID(item.requestDate)}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded w-fit">{item.deliveryTime}</span>
                                  <div className="text-xs">Order: <b>{formatQty(getDisplayOrderQty(item))}</b></div>
                                  {(() => {
                                    const totalOrder = getTotalOrderQty(item);
                                    const displayQty = Number(getDisplayOrderQty(item));
                                    if (!Number.isFinite(totalOrder)) return null;
                                    if (Number.isFinite(displayQty) && totalOrder === displayQty) return null;
                                    return (
                                      <div className="text-[10px] text-slate-500">
                                        Total PO: <span className="font-semibold">{formatQty(totalOrder)}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 bg-emerald-50/40 pr-6 border-r border-b border-slate-200">
                                <div className="flex flex-col gap-2">
                                  {(() => {
                                    const actualReceipts = Array.isArray(item.relatedReceipts)
                                      ? item.relatedReceipts.filter((receipt) => receipt?.doNumber || Number(receipt?.receivedQty || 0) > 0)
                                      : [];
                                    if (actualReceipts.length > 0) {
                                      return (
                                        <div className="space-y-1 text-xs text-slate-600">
                                          {actualReceipts.map((receipt, index) => (
                                            <div key={`${receipt.doNumber || 'SJ'}-${index}`} className="rounded border border-emerald-100 bg-white/70 px-2 py-1">
                                              <div className="flex items-center gap-1">
                                                <Truck size={12} className="text-teal-500" />
                                                <span>No. SJ:</span>
                                                <span className="font-semibold">{receipt.doNumber || '-'}</span>
                                              </div>
                                              <div>Tgl Tiba: <span className="font-semibold">{receipt.arrivalDate || '-'}</span></div>
                                              <div>Qty Tiba: <span className="font-semibold">{formatQty(receipt.receivedQty || 0)}</span></div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="text-xs text-slate-600">
                                        <div className="flex items-center gap-1">
                                          <Truck size={12} className="text-teal-500" />
                                          <span>No. SJ:</span>
                                          <span className="font-semibold">{item.doNumber || '-'}</span>
                                        </div>
                                        <div>Tgl Tiba: <span className="font-semibold">{item.arrivalDate || '-'}</span></div>
                                        <div>Qty Tiba: <span className="font-semibold">{formatQty(item.receivedQty || 0)}</span></div>
                                      </div>
                                    );
                                  })()}
                                  {item.actualLocked ? (
                                    <div className="flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => user?.role === 'admin' && handleUnlockActual(item)}
                                        className={`p-1.5 rounded-full border ${
                                          user?.role === 'admin'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                            : 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                        }`}
                                        title={user?.role === 'admin' ? 'Data terkunci. Klik untuk membuka.' : 'Data terkunci.'}
                                      >
                                        <Lock size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <span
                                        className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-400"
                                        title="Data terbuka."
                                      >
                                        <Unlock size={12} />
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 text-center pl-4 border-r border-b border-slate-200">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-wide ${scheduleStatusMeta.className}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${scheduleStatusMeta.dot}`} />
                                    {scheduleStatusMeta.label}
                                  </span>
                                  {timingFlag && (
                                    <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-cyan-700">
                                      {timingFlag}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 w-full min-w-0 border-r border-b border-slate-200">
                                <textarea
                                  rows={2}
                                  ref={resizeNoteTextarea}
                                  className="w-full bg-transparent text-xs px-2 py-1 border-b border-gray-200 focus:border-slate-400 focus:ring-0 outline-none transition-all resize-y whitespace-pre-wrap break-words overflow-y-auto"
                                  placeholder="Tulis catatan..."
                                  value={noteValue}
                                  onChange={(e) => {
                                    setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }));
                                    resizeNoteTextarea(e.target);
                                  }}
                                  onInput={(e) => resizeNoteTextarea(e.target)}
                                  onBlur={() => {
                                    if (noteValue !== (item.notes ?? '')) {
                                      handleUpdateActual(item.id, 'notes', noteValue);
                                    }
                                    setNoteDrafts((prev) => {
                                      if (!(item.id in prev)) return prev;
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }}
                                  disabled={!canEditSchedules || item.actualLocked}
                                />
                              </div>
                              <div className="h-full p-4 pt-3 text-center border-b border-slate-200">
                                <div className="relative inline-flex" data-action-menu>
                                  <button
                                    type="button"
                                    onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                                    className="w-8 h-8 rounded-full text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center"
                                    title="Aksi"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {actionMenuId === item.id && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-20 text-left text-sm overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleSendEmail(item);
                                          setActionMenuId(null);
                                        }}
                                        className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                      >
                                        <Mail size={14} /> Kirim PDF Langsung
                                      </button>
                                      {canEditSchedules && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleSendEmailReminder(item);
                                              setActionMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                          >
                                            <Bell size={14} /> Kirim Reminder
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handlePrintInboundCards([item.id]);
                                              setActionMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                          >
                                            <Printer size={14} /> Print Kanban Cards
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              openInboundCardAdjustModal(item);
                                              setActionMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                          >
                                            <RefreshCw size={14} /> Adjust / Reprint Cards
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleEdit(item);
                                              setActionMenuId(null);
                                            }}
                                            className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                          >
                                            <Edit size={14} /> Edit
                                          </button>
                                        </>
                                      )}
                                      {canDeleteRecords && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleDelete(item.id);
                                            setActionMenuId(null);
                                          }}
                                          className="w-full px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                                        >
                                          <Trash2 size={14} /> Hapus
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showActualReceiveModal && inboundSubTab === 'schedule' && (
              <div className="fixed inset-0 z-[280] flex items-stretch justify-center bg-slate-900/90 p-0">
                <div className="flex h-screen w-full max-w-6xl flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="z-30 flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">FORM: PENERIMAAN AKTUAL</div>
                      <div className="text-[11px] text-slate-500">Pilih PO lalu supplier dan item terisi otomatis.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadActualReceiveTemplate}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        disabled={!canEditSchedules}
                        title={!canEditSchedules ? 'Anda tidak memiliki akses untuk download template.' : 'Download Template Excel'}
                      >
                        <FileSpreadsheet size={13} />
                        <span>Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => actualReceiveImportRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        disabled={!canEditSchedules || actualReceiveImportLoading}
                        title={!canEditSchedules ? 'Anda tidak memiliki akses import penerimaan aktual.' : 'Import penerimaan aktual dari Excel'}
                      >
                        <FileUp size={13} />
                        <span>{actualReceiveImportLoading ? 'Mengimpor...' : 'Import Excel'}</span>
                      </button>
                      <button onClick={closeActualReceiveModal} className="text-slate-500 hover:text-slate-700">
                        <XIcon size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-4">
                  {isStockOpnameLocked && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Selesaikan dulu Stock Opname!
                    </div>
                  )}

                  <input
                    ref={actualReceiveImportRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportActualReceiveExcel}
                  />

                  {(actualReceiveImportError || actualReceiveImportSummary) && (
                    <div className="mt-3 space-y-2 text-xs">
                      {actualReceiveImportError && (
                        <div className={`rounded-lg border px-3 py-2 whitespace-pre-wrap ${actualReceiveImportSummary ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                          {actualReceiveImportError}
                        </div>
                      )}

                      {actualReceiveImportSummary && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-800">Hasil Import</div>
                              <div className="text-slate-500 break-words">{actualReceiveImportSummary.fileName || '-'}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                                Dokumen: {actualReceiveImportSummary.totalGroups || 0}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                                Berhasil: {actualReceiveImportSummary.successGroups || 0}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                                Gagal: {actualReceiveImportSummary.failedGroups || 0}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                                Item: {actualReceiveImportSummary.totalLines || 0}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                                Qty: {formatQty(actualReceiveImportSummary.totalQty || 0)}
                              </span>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${actualReceiveImportSummary.failedGroups ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                {actualReceiveImportSummary.failedGroups ? 'Perlu dicek' : 'Siap dipakai'}
                              </span>
                            </div>
                          </div>

                          {Array.isArray(actualReceiveImportSummary.validationRows) && actualReceiveImportSummary.validationRows.length > 0 && (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                              <div className="font-semibold">Baris validasi ditolak: {actualReceiveImportSummary.validationRows.length}</div>
                              <div className="mt-1 max-h-20 space-y-1 overflow-auto">
                                {actualReceiveImportSummary.validationRows.map((row) => (
                                  <div key={`validation-${row.no}-${row.errors}`} className="rounded border border-amber-200 bg-white px-2 py-1">
                                    <span className="font-semibold">Baris {row.no}:</span> {row.errors}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
                            <QrCode size={15} /> Scan Label Schedule
                          </div>
                          <div className="mt-1 text-[11px] text-emerald-700">
                            Scan QR dari label supplier untuk auto-pilih PO, item, schedule, dan qty sisa. Input manual tetap bisa dipakai jika label belum tersedia.
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                        <input
                          className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          value={actualReceiveLabelScan}
                          onChange={(e) => {
                            setActualReceiveLabelScan(e.target.value);
                            setActualReceiveLabelError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleResolveActualReceiveLabel();
                            }
                          }}
                          placeholder="Scan / ketik QR label: MSKS|LBL|TOKEN"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={handleResolveActualReceiveLabel}
                          disabled={actualReceiveLabelLoading}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {actualReceiveLabelLoading ? <RefreshCw size={14} className="animate-spin" /> : <QrCode size={14} />}
                          Pakai Label
                        </button>
                      </div>
                      {actualReceiveLabelError && (
                        <div className="mt-2 rounded border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600">
                          {actualReceiveLabelError}
                        </div>
                      )}
                      {actualReceiveLabelInfo && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded border border-emerald-200 bg-white px-3 py-2 text-[11px] text-slate-700">
                          <span className="font-semibold text-emerald-700">Label OK</span>
                          <span>PO: {actualReceiveLabelInfo.schedule?.poNumber || '-'}</span>
                          <span>Schedule: {actualReceiveLabelInfo.schedule?.id || '-'}</span>
                          <span>Item: {actualReceiveLabelInfo.item?.code || '-'}</span>
                          <span>Qty Sisa: {formatNumber0(actualReceiveLabelInfo.schedule?.remainingQty || 0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-sky-50/60 p-4">
                      <div className="mb-2 rounded bg-sky-200/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        BARIS 1 & 2: DATA PENERIMAAN
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div ref={actualReceivePoPickerRef} className="relative flex flex-col gap-1 md:col-span-5">
                          <label className="text-xs font-semibold text-slate-600">No PO</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1 rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
                              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                className="h-[42px] w-full rounded-xl border-0 bg-transparent py-2 pl-8 pr-20 text-sm outline-none placeholder:text-slate-400"
                                value={actualReceivePoSearch}
                                onChange={(e) => handleActualReceivePoSearchChange(e.target.value)}
                                onFocus={() => setActualReceivePoPickerOpen(true)}
                                onKeyDown={handleActualReceivePoKeyDown}
                                placeholder="Ketik No PO / supplier untuk cari"
                                aria-expanded={actualReceivePoPickerOpen}
                                aria-controls="actual-receive-po-listbox"
                                aria-autocomplete="list"
                                autoComplete="off"
                              />
                              <div className="absolute right-1 top-1 flex items-center gap-1">
                                {(actualReceivePoSearch || actualReceivePoNumber) && (
                                  <button
                                    type="button"
                                    onClick={handleActualReceivePoClear}
                                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                    title="Hapus pilihan"
                                  >
                                    <XIcon size={13} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setActualReceivePoPickerOpen((prev) => !prev)}
                                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                  title="Lihat daftar PO"
                                >
                                  <ChevronDown size={14} className={`transition-transform ${actualReceivePoPickerOpen ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              {actualReceivePoPickerOpen && (
                                <div
                                  id="actual-receive-po-listbox"
                                  role="listbox"
                                  aria-label="Daftar No PO"
                                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                                    <span>{actualReceivePoMenuOptions.length ? `${actualReceivePoVisibleOptions.length} PO ditemukan` : 'Tidak ada PO yang sesuai'}</span>
                                    <span>↑↓ Enter Esc</span>
                                  </div>
                                  {actualReceivePoOptionsLoading ? (
                                    <div className="px-3 py-3 text-xs text-slate-500">Memuat daftar PO...</div>
                                  ) : actualReceivePoMenuOptions.length > 0 ? (
                                    actualReceivePoMenuOptions.map((row, index) => {
                                      const isSelected = String(row.po_number || '').trim() === String(actualReceivePoNumber || '').trim();
                                      const isActive = index === actualReceivePoActiveIndex;
                                      return (
                                        <button
                                          key={row.po_number}
                                          type="button"
                                          role="option"
                                          aria-selected={isSelected}
                                          onMouseEnter={() => setActualReceivePoActiveIndex(index)}
                                          onClick={() => handleActualReceivePoPick(row)}
                                          className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-xs last:border-b-0 transition ${
                                            isActive ? 'bg-sky-50' : 'hover:bg-slate-50'
                                          } ${isSelected ? 'ring-inset ring-1 ring-sky-200' : ''}`}
                                        >
                                          <div className="min-w-0">
                                            <div className="truncate font-semibold text-slate-800">{row.po_number}</div>
                                            <div className="truncate text-slate-500">
                                              {resolveSupplierLabel(row) || row.supplier_name || row.supplier_code || '-'}
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className={`rounded-full px-2 py-0.5 font-semibold ${isSelected ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                                              {String(row.status || '').toUpperCase() || 'OPEN'}
                                            </span>
                                            <span className="text-slate-500">Sisa {formatNumber0(row.total_qty_remaining || 0)}</span>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3 py-3 text-xs text-slate-500">Tidak ada PO open yang cocok dengan pencarian.</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={fetchActualReceivePoOptions}
                              className="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                              disabled={actualReceivePoOptionsLoading}
                              title="Refresh daftar PO"
                            >
                              <RefreshCw size={14} className={actualReceivePoOptionsLoading ? 'animate-spin' : ''} />
                            </button>
                          </div>
                          {actualReceivePoNumber && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                                Terpilih: {actualReceivePoNumber}
                              </span>
                              <span>Ketik untuk cari, panah atas/bawah lalu Enter untuk pilih.</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-4">
                          <label className="text-xs font-semibold text-slate-600">Supplier (otomatis dari PO)</label>
                          <div className="flex h-[42px] items-center rounded border border-slate-200 bg-white px-3 text-slate-700">
                            {actualReceivePoDetail?.header
                              ? resolveSupplierLabel(actualReceivePoDetail.header)
                              : 'Pilih PO untuk memuat supplier'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-3">
                          <label className="text-xs font-semibold text-slate-600">Tgl Kedatangan *</label>
                          <input
                            type="date"
                            className={`h-[42px] rounded border bg-white px-3 py-2 ${actualReceiveArrivalDate ? 'border-slate-200' : 'border-amber-300 ring-1 ring-amber-100'}`}
                            value={actualReceiveArrivalDate}
                            onChange={(e) => setActualReceiveArrivalDate(e.target.value)}
                            required
                          />
                          {!actualReceiveArrivalDate && (
                            <div className="text-[10px] font-semibold text-amber-600">Pilih tanggal sesuai surat jalan aktual.</div>
                          )}
                        </div>
                        <div className="md:col-span-12 flex items-center gap-2 rounded border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
                          <input
                            id="allow-over-receive"
                            type="checkbox"
                            checked={actualReceiveAllowOver}
                            onChange={(e) => setActualReceiveAllowOver(e.target.checked)}
                            disabled={!canEditSchedules}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600"
                          />
                          <label htmlFor="allow-over-receive" className="font-semibold text-slate-700">
                            Izin Over Qty
                          </label>
                          <span className="text-slate-500">
                            {canEditSchedules ? 'Aktifkan untuk menerima qty melebihi sisa PO pada line terpilih.' : 'Hanya user dengan akses inbound schedule yang dapat mengaktifkan mode ini.'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-3">
                          <label className="text-xs font-semibold text-slate-600">No. SJ / DO *</label>
                          <input
                            className="h-[42px] rounded border border-slate-200 bg-white px-3 py-2"
                            value={actualReceiveDoNumber}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setActualReceiveDoNumber(nextValue);
                              const trimmed = normalizeReceiveDoNumber(nextValue);
                              if (!trimmed) {
                                setActualReceiveDoCheckStatus('idle');
                                setActualReceiveDoCheckMessage('');
                                return;
                              }
                              setActualReceiveDoCheckStatus('checking');
                              setActualReceiveDoCheckMessage('Memeriksa duplikasi No. SJ / DO...');
                            }}
                            onBlur={() => {
                              const supplier = String(actualReceiveSupplier || actualReceivePoDetail?.header?.supplier_id || actualReceivePoDetail?.header?.supplier_name || '').trim();
                              const doNumber = normalizeReceiveDoNumber(actualReceiveDoNumber);
                              if (doNumber) {
                                void performActualReceiveDoCheck(supplier, doNumber);
                              }
                            }}
                            placeholder="Wajib diisi"
                          />
                          {actualReceiveDoCheckStatus === 'checking' && (
                            <div className="text-[10px] text-slate-500">{actualReceiveDoCheckMessage || 'Memeriksa duplikasi No. SJ / DO...'}</div>
                          )}
                          {actualReceiveDoCheckStatus === 'block' && (
                            <div className="text-[10px] font-semibold text-rose-600">
                              {actualReceiveDoCheckMessage || 'Nomor surat jalan/DO sudah ada!'}
                            </div>
                          )}
                          {actualReceiveDoCheckStatus === 'warn' && (
                            <div className="text-[10px] font-semibold text-amber-600">
                              {actualReceiveDoCheckMessage || 'Nomor SJ/DO ini sudah pernah muncul.'}
                            </div>
                          )}
                          {actualReceiveDoCheckStatus === 'ok' && actualReceiveDoCheckMessage && (
                            <div className="text-[10px] font-semibold text-emerald-600">{actualReceiveDoCheckMessage}</div>
                          )}
                          {actualReceiveDoCheckStatus === 'error' && actualReceiveDoCheckMessage && (
                            <div className="text-[10px] text-amber-600">{actualReceiveDoCheckMessage}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-3">
                          <label className="text-xs font-semibold text-slate-600">No Polisi (opsional)</label>
                          <input
                            className="h-[42px] rounded border border-slate-200 bg-white px-3 py-2"
                            value={actualReceiveTruckNo}
                            onChange={(e) => setActualReceiveTruckNo(e.target.value)}
                            placeholder="Contoh: B 1234 CD"
                          />
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-3">
                          <label className="text-xs font-semibold text-slate-600">Nama Sopir (opsional)</label>
                          <input
                            className="h-[42px] rounded border border-slate-200 bg-white px-3 py-2"
                            value={actualReceiveDriverName}
                            onChange={(e) => setActualReceiveDriverName(e.target.value)}
                            placeholder="Nama sopir"
                          />
                        </div>
                        <div className="flex flex-col gap-1 md:col-span-3">
                          <label className="text-xs font-semibold text-slate-600">Remarks</label>
                          <input
                            className="h-[42px] rounded border border-slate-200 bg-white px-3 py-2"
                            value={actualReceiveRemarks}
                            onChange={(e) => setActualReceiveRemarks(e.target.value)}
                            placeholder="Catatan tambahan"
                          />
                        </div>
                      </div>
                    </div>

                    {actualReceivePoDetail?.header && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-slate-700">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white text-[11px]">i</span>
                        <span className="font-semibold">No PO:</span>
                        <span>{actualReceivePoDetail.header.po_number}</span>
                        <span className="font-semibold">| Supplier:</span>
                        <span>{actualReceivePoDetail.header.supplier_name || actualReceivePoDetail.header.supplier_id || '-'}</span>
                        <span className="font-semibold">| Status:</span>
                        <span>{String(actualReceivePoDetail.header.status || '').toUpperCase()}</span>
                        <span className="font-semibold">| Lines:</span>
                        <span>{actualReceivePoLines.length} Item Kontrak — Sisa Tersedia untuk Incoming</span>
                      </div>
                    )}

                    {actualReceivePoError && <div className="text-xs text-rose-600">{actualReceivePoError}</div>}
                    {actualReceivePoLines.length > 0 && actualReceivePoAvailableLines.length === 0 && !actualReceiveAllowOver && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Semua item kontrak pada PO ini sudah habis teralokasi ke schedule. Incoming tidak bisa dilanjutkan.
                      </div>
                    )}
                    {actualReceiveAllowOver && actualReceivePoLines.length > 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        Mode over aktif. Line dengan sisa 0 tetap bisa dipilih untuk incoming tambahan.
                      </div>
                    )}

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
                        <span>BARIS 3: ITEM YANG DITERIMA</span>
                        <button type="button" onClick={addActualReceiveRow} className="text-xs font-semibold text-slate-900" disabled={actualReceiveSelectableLines.length === 0}>
                          + Tambah Baris Baru
                        </button>
                      </div>
                      <div className="max-h-[46vh] overflow-auto [scrollbar-gutter:stable]">
                        <table className="min-w-[1040px] table-fixed border-collapse text-xs">
                          <thead className="sticky top-0 z-20 bg-slate-100 shadow-[0_1px_0_#e2e8f0]">
                            <tr className="text-left">
                              <th className="w-[460px] border border-slate-200 p-2">Item</th>
                              <th className="w-[180px] border border-slate-200 p-2 text-right">Qty Aktual Datang</th>
                              <th className="w-[300px] border border-slate-200 p-2">Detail</th>
                              <th className="w-[100px] border border-slate-200 p-2 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(actualReceiveRows || []).map((row, index) => {
                              const poLines = actualReceiveSelectableLines;
                              const matchedLine = poLines.find((line) => Number(line.id) === Number(row.poLineId));
                              return (
                                <tr key={row.key} className="align-top">
                                  <td className="border border-slate-200 p-2">
                                    <select
                                      className="h-10 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                                      value={row.poLineId || ''}
                                      onChange={(e) => {
                                        const selectedLine = poLines.find((line) => Number(line.id) === Number(e.target.value));
                                        const remainingQty = getActualReceiveRemainingQty(selectedLine);
                                        if (!selectedLine || (!actualReceiveAllowOver && !(remainingQty > 0))) {
                                          setActualReceiveError('Item dengan sisa 0 tidak bisa dipilih.');
                                          updateActualReceiveRow(row.key, {
                                            poLineId: '',
                                            scheduleId: '',
                                            itemCode: '',
                                            unit: '',
                                          });
                                          return;
                                        }
                                        updateActualReceiveRow(row.key, {
                                          poLineId: selectedLine?.id || '',
                                          scheduleId: '',
                                          itemCode: selectedLine?.item_code || '',
                                          unit: selectedLine?.unit || '',
                                        });
                                        focusActualReceiveQty(row.key);
                                      }}
                                      disabled={poLines.length === 0}
                                    >
                                      <option value="">[Pilih item dari PO]</option>
                                      {poLines.map((line) => (
                                        <option
                                          key={line.id}
                                          value={line.id}
                                          disabled={!actualReceiveAllowOver && getActualReceiveRemainingQty(line) <= 0}
                                        >
                                          {line.line_no}. {line.item_code} - {line.item_name || '-'}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="mt-1 text-[10px] text-slate-400">Baris {index + 1}</div>
                                  </td>
                                  <td className="border border-slate-200 p-2">
                                    <div className="flex h-10 overflow-hidden rounded border border-slate-200 bg-white focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
                                      <input
                                        ref={(el) => {
                                          if (el) actualReceiveQtyRefs.current[row.key] = el;
                                          else delete actualReceiveQtyRefs.current[row.key];
                                        }}
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-right text-sm outline-none"
                                        value={row.qty}
                                        onChange={(e) => updateActualReceiveRow(row.key, { qty: e.target.value })}
                                      />
                                      <input
                                        type="text"
                                        className="w-[58px] border-0 border-l border-slate-200 bg-slate-50 px-2 text-center text-[11px] font-semibold uppercase text-slate-600 outline-none"
                                        value={row.unit || matchedLine?.unit || ''}
                                        placeholder="-"
                                        onChange={(e) => updateActualReceiveRow(row.key, { unit: e.target.value.toUpperCase() })}
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-slate-200 p-2 text-xs text-slate-600">
                                    <div className="font-semibold text-slate-900">{matchedLine?.item_name || '-'}</div>
                                    <div>Part Code: {matchedLine?.item_code || '-'}</div>
                                    <div>Sisa Tersedia untuk Incoming: {formatNumber0(getActualReceiveRemainingQty(matchedLine))}</div>
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeActualReceiveRow(row.key)}
                                      className="rounded border px-3 py-1.5 text-xs"
                                    >
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {actualReceiveError && <div className="text-xs text-rose-600">{actualReceiveError}</div>}
                  </div>
                  </div>

                  <div className="z-30 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 pb-6 pt-3 shadow-[0_-8px_16px_rgba(15,23,42,0.08)]">
                      <button onClick={closeActualReceiveModal} className="h-10 rounded border px-5 text-sm">
                        Batal
                      </button>
                      <button
                        onClick={handleActualReceiveSubmit}
                        className="h-10 rounded bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={
                          actualReceiveSubmitting
                          || isStockOpnameLocked
                          || actualReceiveSelectableLines.length === 0
                          || !String(actualReceiveArrivalDate || '').trim()
                          || !String(actualReceiveDoNumber || '').trim()
                          || actualReceiveDoCheckStatus === 'checking'
                          || actualReceiveDoCheckStatus === 'block'
                        }
                      >
                        {actualReceiveSubmitting ? 'Menyimpan...' : 'Simpan Inbound'}
                      </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs text-slate-500 print:hidden">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  className="border rounded px-2 py-1 bg-white text-xs"
                  value={schedulePerPage}
                  onChange={(e) => handleSchedulePerPageChange(Number(e.target.value))}
                  disabled={scheduleLoading}
                >
                  {scheduleRowOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span>baris per halaman</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSchedulePageChange(schedulePage - 1)}
                  disabled={schedulePage <= 1 || scheduleLoading}
                  className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
                >
                  Previous
                </button>
                <span>
                  Halaman {schedulePage} dari {scheduleTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handleSchedulePageChange(schedulePage + 1)}
                  disabled={schedulePage >= scheduleTotalPages || scheduleLoading}
                  className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
                >
                  Next
                </button>
              </div>
              <div>
                Menampilkan {scheduleStartIndex}-{scheduleEndIndex} dari {scheduleTotal} entri
              </div>
            </div>

            {inboundCardScanOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setInboundCardScanOpen(false)}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Scan Inbound Card</div>
                      <div className="text-xs text-slate-500">Scan QR atau tempel ID kartu inbound.</div>
                    </div>
                    <button onClick={() => setInboundCardScanOpen(false)} className="text-slate-500 hover:text-slate-700">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Inbound Card ID</label>
                      <input
                        className="border rounded px-3 py-2"
                        value={inboundCardScanValue}
                        onChange={(e) => setInboundCardScanValue(e.target.value)}
                        placeholder="INB-xxx-..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInboundCardScanSubmit();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setInboundCardScanOpen(false)} className="px-4 py-2 rounded border text-sm">Tutup</button>
                    <button
                      onClick={handleInboundCardScanSubmit}
                      className="px-4 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
                      disabled={inboundCardScanLoading}
                    >
                      {inboundCardScanLoading ? 'Memproses...' : 'Terima'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {inboundCardAdjustOpen && inboundCardAdjustSchedule && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setInboundCardAdjustOpen(false)}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Adjust / Reprint Cards</div>
                      <div className="text-xs text-slate-500">Sesuaikan jumlah kartu inbound dengan aktual.</div>
                    </div>
                    <button onClick={() => setInboundCardAdjustOpen(false)} className="text-slate-500 hover:text-slate-700">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
                      <div>PO: <span className="font-semibold">{inboundCardAdjustSchedule.poNumber}</span></div>
                      <div>Item: <span className="font-semibold">{inboundCardAdjustSchedule.item}</span></div>
                      <div>Plan Qty: <span className="font-semibold">{formatQty(inboundCardAdjustSchedule.requestQty)}</span></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Target Qty Baru</label>
                      <input
                        type="number"
                        className="border rounded px-3 py-2"
                        value={inboundCardAdjustTarget}
                        onChange={(e) => setInboundCardAdjustTarget(e.target.value)}
                        placeholder="Qty aktual"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setInboundCardAdjustOpen(false)} className="px-4 py-2 rounded border text-sm">Batal</button>
                    <button
                      onClick={handleInboundCardAdjustSubmit}
                      className="px-4 py-2 rounded bg-amber-600 text-white text-sm disabled:opacity-60"
                      disabled={inboundCardAdjustLoading}
                    >
                      {inboundCardAdjustLoading ? 'Memproses...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
            )}

            {inboundSubTab === 'master-po' && (
            <div className="space-y-4">
              <div className="bg-white/90 rounded-3xl border border-slate-200/70 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Master Purchase Order</p>
                    <h3 className="text-xl font-semibold text-slate-900">Data Master PO</h3>
                    <p className="text-sm text-slate-500">Input manual atau import Excel untuk menyiapkan jadwal inbound.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canManagePo && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPoFormVisible((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Plus size={16} />
                          Tambah PO Manual
                        </button>
                        <div className="relative" data-action-menu ref={poActionRef}>
                          <button
                            type="button"
                            onClick={() => setPoActionOpen((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            aria-expanded={poActionOpen}
                          >
                            <MoreVertical size={16} />
                            Aksi Master PO
                            <ChevronDown size={14} />
                          </button>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            ref={poImportRef}
                            onChange={handleImportPoExcel}
                          />
                          {poActionOpen && (
                            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50 text-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadPoTemplate();
                                  setPoActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Download size={16} />
                                Download Template
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  poImportRef.current?.click();
                                  setPoActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                disabled={poImporting}
                              >
                                <FileSpreadsheet size={16} />
                                {poImporting ? 'Mengimpor...' : 'Import Excel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePrintMasterPo();
                                  setPoActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-60"
                                disabled={poPrintLoading}
                              >
                                <Printer size={16} />
                                {poPrintLoading ? 'Mencetak...' : 'Print Master PO'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleExportMasterPoExcel();
                                  setPoActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-60"
                                disabled={poExportLoading}
                              >
                                <Download size={16} />
                                {poExportLoading ? 'Mengekspor...' : 'Export Master PO'}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {poFormVisible && canManagePo && (
                  <form onSubmit={handleCreatePo} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Nomor PO</label>
                        <input
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={poForm.poNumber}
                          onChange={(e) => setPoForm((prev) => ({ ...prev, poNumber: e.target.value }))}
                          placeholder="PO-0001"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Tanggal PO</label>
                        <input
                          type="date"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={poForm.poDate}
                          onChange={(e) => setPoForm((prev) => ({ ...prev, poDate: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Supplier</label>
                        <input
                          list="po-create-supplier-options"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={poForm.supplier}
                          onChange={(e) => setPoForm((prev) => ({ ...prev, supplier: e.target.value }))}
                          placeholder="Kode atau nama supplier"
                          required
                        />
                        <datalist id="po-create-supplier-options">
                          {(masterVendors || []).map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name || vendor.id}</option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Item PO</div>
                          <div className="text-xs text-slate-500">Tambahkan item sebanyak yang dibutuhkan dalam satu nomor PO.</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddPoFormLine}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          <Plus size={16} />
                          Tambah Item
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {(poForm.lines || []).map((line, index) => (
                          <div key={`po-line-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[72px_minmax(0,1fr)_180px_44px]">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-600">Baris</label>
                              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-600">Item</label>
                              <input
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={line.itemCode || ''}
                                onChange={(e) => handlePoFormLineChange(index, 'itemCode', e.target.value)}
                                list="po-item-list"
                                placeholder="RM-XXXX"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-semibold text-slate-600">Qty</label>
                              <input
                                type="number"
                                min="1"
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                value={line.qty || ''}
                                onChange={(e) => handlePoFormLineChange(index, 'qty', e.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => handleRemovePoFormLine(index)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600"
                                title="Hapus baris"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <datalist id="po-item-list">
                          {(masterItems || []).map((item) => (
                            <option key={item.code} value={item.code}>{item.name ? `${item.code} - ${item.name}` : item.code}</option>
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetPoForm();
                          setPoFormVisible(false);
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Simpan PO
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="bg-white/90 rounded-3xl border border-slate-200/70 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-slate-900">Daftar PO</div>
                    <div className="text-xs text-slate-500">
                      Total: {poTotal} PO • Rentang aktif: {poFilterStart ? formatDateID(poFilterStart) : '-'} s/d {poFilterEnd ? formatDateID(poFilterEnd) : '-'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="h-10 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={poFilterStart}
                      onChange={(e) => setPoFilterStart(e.target.value)}
                    />
                    <input
                      type="date"
                      className="h-10 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      value={poFilterEnd}
                      onChange={(e) => setPoFilterEnd(e.target.value)}
                    />
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        className="h-10 rounded-2xl border border-slate-200/80 bg-white/80 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        placeholder="Cari PO / Supplier"
                        value={poSearch}
                        onChange={(e) => setPoSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchPoList({ search: poSearch, page: poPage, perPage: poPerPage, start: poFilterStart, end: poFilterEnd })}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
                      disabled={poLoading}
                    >
                      <RefreshCw size={16} className={poLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                      <tr>
                        <th className="p-3 text-left">Nomor PO</th>
                        <th className="p-3 text-left">Tanggal</th>
                        <th className="p-3 text-left">Supplier</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Status Jadwal</th>
                        <th className="p-3 text-right">Line</th>
                        <th className="p-3 text-right">Qty Order</th>
                        <th className="p-3 text-right">Qty Received</th>
                        <th className="p-3 text-right">Sisa Tersedia untuk Incoming</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poLoading ? (
                        <tr>
                          <td colSpan={10} className="p-4 text-center text-slate-400">Memuat data...</td>
                        </tr>
                      ) : poRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-4 text-center text-slate-400">Belum ada data PO.</td>
                        </tr>
                      ) : (
                        poRows.map((row) => {
                          const totalOrder = Number(row.total_qty_order || 0);
                          const totalReceived = Number(row.total_qty_received || 0);
                          const rawAvailableRemaining = Number(row.total_qty_remaining);
                          const remaining = Number.isFinite(rawAvailableRemaining)
                            ? rawAvailableRemaining
                            : totalOrder - totalReceived;
                          const statusMeta = resolvePoStatusMeta(row.status);
                          const lifecycleMeta = resolvePoLifecycleMeta(row);
                          const scheduleStatusMeta = resolvePoScheduleStatusMeta(row);
                          const canQuickSchedule = ['BELUM DIJADWALKAN', 'DIJADWALKAN SEBAGIAN'].includes(scheduleStatusMeta.label);
                          const isExpanded = Boolean(poExpanded[row.po_number]);
                          return (
                            <React.Fragment key={row.po_number}>
                              <tr
                                className="border-t border-slate-200 cursor-pointer hover:bg-slate-50/80"
                                onClick={() => {
                                  const nextValue = !isExpanded;
                                  setPoExpanded((prev) => ({ ...prev, [row.po_number]: nextValue }));
                                  if (nextValue) fetchPoLines(row.po_number);
                                }}
                              >
                                <td className="p-3 font-semibold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400">
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </span>
                                    <span>{row.po_number}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-600">{row.po_date ? formatDateID(row.po_date) : '-'}</td>
                                <td className="p-3 text-slate-600">
                                  <div>{resolveSupplierLabel(row) || '-'}</div>
                                  <div className="text-[11px] text-slate-400">{resolveSupplierMeta(row).id || '-'}</div>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col gap-1">
                                    <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusMeta.className}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                                      {statusMeta.label}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${lifecycleMeta.className}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${lifecycleMeta.dot}`} />
                                      {lifecycleMeta.label}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${scheduleStatusMeta.className}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${scheduleStatusMeta.dot}`} />
                                    {scheduleStatusMeta.label}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-slate-600">{row.line_count ?? 0}</td>
                                <td className="p-3 text-right text-slate-600">{formatQty(totalOrder)}</td>
                                <td className="p-3 text-right text-slate-600">{formatQty(totalReceived)}</td>
                                <td className="p-3 text-right text-slate-600">{formatQty(remaining)}</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {canQuickSchedule && (
                                      <button
                                        type="button"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScheduleShortcut(row);
                                        }}
                                        title="Jadwalkan PO"
                                        aria-label="Jadwalkan PO"
                                      >
                                        <CalendarPlus size={16} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={(e) => { e.stopPropagation(); openPoEdit(row); }}
                                      disabled={!canManagePo}
                                      title="Edit PO"
                                      aria-label="Edit PO"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={(e) => { e.stopPropagation(); handleDeletePo(row); }}
                                      disabled={!canManagePo || poDeleteLoading === row.po_number}
                                      title={poDeleteLoading === row.po_number ? 'Menghapus...' : 'Hapus PO'}
                                      aria-label="Hapus PO"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="border-t border-slate-200 bg-slate-50/60">
                                  <td colSpan={10} className="p-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs font-semibold text-slate-600">Rincian Item</div>
                                        <label className="flex items-center gap-2 text-[11px] text-slate-500">
                                          <input
                                            type="checkbox"
                                            checked={poDetailRemainingOnly}
                                            onChange={(e) => setPoDetailRemainingOnly(e.target.checked)}
                                          />
                                          Tampilkan Sisa Tersedia untuk Incoming &gt; 0
                                        </label>
                                      </div>
                                       {poLineLoading[row.po_number] ? (
                                        <div className="mt-3 text-xs text-slate-500">Memuat rincian item...</div>
                                      ) : (poLineMap[row.po_number] || []).length === 0 ? (
                                        <div className="mt-3 text-xs text-slate-500">Tidak ada item untuk PO ini.</div>
                                      ) : (
                                        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                                          <table className="min-w-full text-xs">
                                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                                              <tr>
                                                <th className="p-3 text-left">Kode Item / Nama Barang</th>
                                                <th className="p-3 text-right">Qty/Kanban</th>
                                                <th className="p-3 text-right">Qty Order</th>
                                                <th className="p-3 text-right">Qty Received</th>
                                                <th className="p-3 text-right">Sisa</th>
                                                <th className="p-3 text-left">Status Item</th>
                                                <th className="p-3 text-right">Aksi</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(() => {
                                                const detailLines = (poLineMap[row.po_number] || []).filter((line) => {
                                                  if (!poDetailRemainingOnly) return true;
                                                  const remaining = Number(line.qty_remaining ?? (Number(line.qty_order || 0) - Number(line.qty_received || 0)));
                                                  return remaining > 0;
                                                });
                                                if (detailLines.length === 0) {
                                                  return (
                                                    <tr>
                                                      <td colSpan={7} className="p-4 text-center text-slate-400">Tidak ada item dengan sisa.</td>
                                                    </tr>
                                                  );
                                                }
                                                return detailLines.map((line) => {
                                                  const qtyOrderLine = Number(line.qty_order || 0);
                                                  const qtyReceivedLine = Number(line.qty_received || 0);
                                                  const remainingLine = qtyOrderLine - qtyReceivedLine;
                                                  const qtyPerKanbanLine = Number(line.qty_per_kanban ?? line.qtyPerKanban ?? line.pack_qty ?? 0);
                                                  const lineStatus = resolvePoLineStatus(line);
                                                  const itemCode = line.item_code || line.itemCode || '-';
                                                  const itemName = line.item_name || line.itemName || '';
                                                  return (
                                                    <tr key={`${row.po_number}-${line.id || itemCode}`} className="border-t border-slate-200">
                                                      <td className="p-3 text-slate-700">
                                                        <div className="font-semibold">{itemCode}</div>
                                                        {itemName && <div className="text-[11px] text-slate-500">{itemName}</div>}
                                                      </td>
                                                      <td className="p-3 text-right text-slate-600">{formatQty(qtyPerKanbanLine)}</td>
                                                      <td className="p-3 text-right text-slate-600">{formatQty(qtyOrderLine)}</td>
                                                      <td className="p-3 text-right text-slate-600">{formatQty(qtyReceivedLine)}</td>
                                                      <td className="p-3 text-right text-slate-600">{formatQty(remainingLine)}</td>
                                                      <td className="p-3">
                                                        <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${lineStatus.className}`}>
                                                          <span className={`h-1.5 w-1.5 rounded-full ${lineStatus.dot}`} />
                                                          {lineStatus.label}
                                                        </span>
                                                      </td>
                                                      <td className="p-3 text-right">
                                                        <button
                                                          type="button"
                                                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                          onClick={() => openPoLineEdit(row.po_number, line)}
                                                          disabled={!canManagePo || !line?.id}
                                                          title="Edit qty PO"
                                                          aria-label="Edit qty PO"
                                                        >
                                                          <Edit size={16} />
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                });
                                              })()}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  Export Master PO menampilkan detail item termasuk `Qty/Kanban`.
                </div>
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Tampilkan</span>
                    <select
                      value={poPerPage}
                      onChange={(e) => handlePoPerPageChange(e.target.value)}
                      disabled={poLoading}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      {poRowOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <span>baris</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePoPageChange(poPage - 1)}
                      disabled={poPage <= 1 || poLoading}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>Halaman {poPage} dari {poTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => handlePoPageChange(poPage + 1)}
                      disabled={poPage >= poTotalPages || poLoading}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    Menampilkan {poStartIndex}-{poEndIndex} dari {poTotal} entri
                  </div>
                </div>
              </div>
            </div>
            )}

            {poImportErrorOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPoImportErrorOpen(false)}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Detail Error Import PO</div>
                      <div className="text-xs text-slate-500">Total gagal: {poImportErrors.length} baris</div>
                    </div>
                    <button onClick={() => setPoImportErrorOpen(false)} className="text-slate-500 hover:text-slate-700" title="Tutup">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                        <tr>
                          <th className="p-3 text-left">Baris</th>
                          <th className="p-3 text-left">No. PO</th>
                          <th className="p-3 text-left">Pesan Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poImportErrors.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400">Tidak ada error.</td>
                          </tr>
                        ) : (
                          poImportErrors.map((err, idx) => (
                            <tr key={`${err.row}-${err.no_po}-${idx}`} className="border-t border-slate-200">
                              <td className="p-3 text-slate-700">{err.row ?? '-'}</td>
                              <td className="p-3 text-slate-700">{err.no_po ?? '-'}</td>
                              <td className="p-3 text-rose-700">{err.error || 'Error tidak diketahui.'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => setPoImportErrorOpen(false)} className="px-4 py-2 rounded border text-sm">Tutup</button>
                  </div>
                </div>
              </div>
            )}

            {scheduleEditOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeScheduleEdit}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Edit Jadwal</div>
                      <div className="text-xs text-slate-500">Ubah qty plan atau tanggal tanpa memilih ulang PO/Item.</div>
                    </div>
                    <button onClick={closeScheduleEdit} className="text-slate-500 hover:text-slate-700" title="Tutup">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Nomor PO</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                        value={scheduleEditForm.poNumber || ''}
                        readOnly
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Supplier</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                        value={scheduleEditForm.supplierName || scheduleEditForm.supplier || ''}
                        readOnly
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Item</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                        value={scheduleEditForm.itemName ? `${scheduleEditForm.item || ''} - ${scheduleEditForm.itemName}` : (scheduleEditForm.item || '')}
                        readOnly
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Tanggal Jadwal</label>
                        <input
                          type="date"
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={scheduleEditForm.requestDate || ''}
                          onChange={(e) => setScheduleEditForm((prev) => ({ ...prev, requestDate: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Qty Plan</label>
                        <input
                          type="number"
                          step={canUseLooseScheduleQty ? 'any' : '1'}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={scheduleEditForm.requestQty ?? ''}
                          onChange={(e) => setScheduleEditForm((prev) => ({ ...prev, requestQty: e.target.value }))}
                        />
                        {canUseLooseScheduleQty && (
                          <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(scheduleEditForm.allowLooseQty)}
                              onChange={(e) => setScheduleEditForm((prev) => ({ ...prev, allowLooseQty: e.target.checked }))}
                            />
                            Izinkan plus/minus (khusus admin & PPIC)
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Jam Kirim</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={scheduleEditForm.deliveryTime || ''}
                        onChange={(e) => setScheduleEditForm((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                        placeholder="Contoh: 08:00 (Cycle 1)"
                      />
                    </div>
                    {scheduleEditError && (
                      <div className="text-xs text-rose-600">{scheduleEditError}</div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={closeScheduleEdit}
                        className="px-4 py-2 rounded border text-sm"
                        disabled={scheduleEditSaving}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleScheduleEditSave}
                        className="px-4 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
                        disabled={scheduleEditSaving}
                      >
                        {scheduleEditSaving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {poEditOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closePoEdit}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Edit PO</div>
                      <div className="text-xs text-slate-500">Perbarui tanggal dan supplier PO.</div>
                    </div>
                    <button onClick={closePoEdit} className="text-slate-500 hover:text-slate-700" title="Tutup">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Nomor PO</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                        value={poEditForm.poNumber}
                        readOnly
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Tanggal PO</label>
                      <input
                        type="date"
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={poEditForm.poDate}
                        onChange={(e) => setPoEditForm((prev) => ({ ...prev, poDate: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Supplier</label>
                      <input
                        list="po-supplier-options"
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={poEditForm.supplier}
                        onChange={(e) => setPoEditForm((prev) => ({ ...prev, supplier: e.target.value }))}
                        placeholder="Kode atau nama supplier"
                      />
                      <datalist id="po-supplier-options">
                        {(masterVendors || []).map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name || vendor.id}</option>
                        ))}
                      </datalist>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Status Manual</label>
                      <select
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={poEditForm.status || 'open'}
                        onChange={(e) => setPoEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="open">Open</option>
                        <option value="close">Close</option>
                      </select>
                      <div className="text-[11px] text-slate-500">
                        Close akan memaksa PO keluar dari daftar penerimaan, meski sisa qty masih ada.
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Catatan</label>
                      <textarea
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        rows={3}
                        value={poEditForm.remarks || ''}
                        onChange={(e) => setPoEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Opsional"
                      />
                    </div>
                    {poEditError && (
                      <div className="text-xs text-rose-600">{poEditError}</div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={closePoEdit}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                        disabled={poEditSaving}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePoEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={poEditSaving}
                      >
                        {poEditSaving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {poLineEditOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closePoLineEdit}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Edit Item / Qty PO</div>
                      <div className="text-xs text-slate-500">Perbarui item dan qty order; schedule terkait line PO ini ikut berubah.</div>
                    </div>
                    <button onClick={closePoLineEdit} className="text-slate-500 hover:text-slate-700" title="Tutup">
                      <XIcon size={18} />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Nomor PO</label>
                      <input
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                        value={poLineEditForm.poNumber}
                        readOnly
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Kode Item</label>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
                          value={poLineEditForm.itemCode}
                          list="po-line-edit-item-list"
                          placeholder="Ketik kode item"
                          onChange={(e) => {
                            const nextCode = e.target.value;
                            setPoLineEditForm((prev) => ({
                              ...prev,
                              itemCode: nextCode,
                              itemName: resolveMasterItemName(nextCode),
                            }));
                          }}
                          onBlur={() => {
                            const normalizedCode = normalizePoItemCodeInput(poLineEditForm.itemCode);
                            setPoLineEditForm((prev) => ({
                              ...prev,
                              itemCode: normalizedCode,
                              itemName: resolveMasterItemName(normalizedCode),
                            }));
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Nama Barang</label>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                          value={poLineEditForm.itemName}
                          readOnly
                          placeholder="Otomatis dari master item"
                        />
                      </div>
                    </div>
                    <datalist id="po-line-edit-item-list">
                      {(masterItems || []).map((item) => {
                        const code = String(item?.code || item?.itemCode || item?.item_code || '').trim();
                        if (!code) return null;
                        const name = String(item?.name || item?.itemName || item?.item_name || '').trim();
                        return (
                          <option key={`po-line-edit-${code}`} value={code}>
                            {name ? `${code} - ${name}` : code}
                          </option>
                        );
                      })}
                    </datalist>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Qty Received</label>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                          value={formatNumber0 ? formatNumber0(poLineEditForm.qtyReceived || 0) : (poLineEditForm.qtyReceived || 0)}
                          readOnly
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Sisa Tersedia untuk Incoming Saat Ini</label>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                          value={formatNumber0 ? formatNumber0(poLineEditForm.qtyRemaining || 0) : (poLineEditForm.qtyRemaining || 0)}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Qty Order Baru</label>
                      <input
                        type="number"
                        min="1"
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={poLineEditForm.qtyOrder}
                        onChange={(e) => setPoLineEditForm((prev) => ({ ...prev, qtyOrder: e.target.value }))}
                      />
                    </div>
                    {poLineEditError && (
                      <div className="text-xs text-rose-600">{poLineEditError}</div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={closePoLineEdit}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                        disabled={poLineEditSaving}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePoLineEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={poLineEditSaving}
                      >
                        {poLineEditSaving ? 'Menyimpan...' : 'Simpan'}
                      </button>
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

export default TabInbound;
