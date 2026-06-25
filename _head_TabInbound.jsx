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
    openBulkReceiveModal,
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
    handleSplitSchedule,
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
    bulkReceiveOpen,
    closeBulkReceiveModal,
    bulkReceiveDoNumber,
    setBulkReceiveDoNumber,
    bulkReceiveDate,
    setBulkReceiveDate,
    getRemainingQty,
    getSplitDecision,
    bulkReceiveQty,
    setBulkReceiveQty,
    bulkReceiveDocQty,
    setBulkReceiveDocQty,
    bulkReceiveAllowOver,
    setBulkReceiveAllowOver,
    handleBulkReceiveSubmit,
    handlePrintInboundCards,
    openInboundCardAdjustModal,
    inboundCardScanOpen,
    setInboundCardScanOpen,
    inboundCardScanValue,
    setInboundCardScanValue,
    handleInboundCardScanSubmit,
    inboundCardScanLoading,
    scheduleSupplierOptions,
    inboundCardAdjustOpen,
    setInboundCardAdjustOpen,
    inboundCardAdjustTarget,
    setInboundCardAdjustTarget,
    inboundCardAdjustSchedule,
    handleInboundCardAdjustSubmit,
    inboundCardAdjustLoading,
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

  const isAdmin = user?.role === 'admin';
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
  const [poSearch, setPoSearch] = useState('');
  const [poTotal, setPoTotal] = useState(0);
  const initialPoMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const [poFilterStart, setPoFilterStart] = useState(initialPoMonthRange.start);
  const [poFilterEnd, setPoFilterEnd] = useState(initialPoMonthRange.end);
  const [poPage, setPoPage] = useState(1);
  const [poPerPage, setPoPerPage] = useState(20);
  const [poTotalPages, setPoTotalPages] = useState(1);
  const poImportRef = useRef(null);
  const poSelectAllRef = useRef(null);
  const [inboundActionOpen, setInboundActionOpen] = useState(false);
  const inboundActionRef = useRef(null);
  const inboundImportRef = useRef(null);
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [listSize, setListSize] = useState({ height: 520, width: 0 });
  const [actionMenuId, setActionMenuId] = useState(null);
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
      setInboundActionOpen(false);
      setPoLookupOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActionMenuId(null);
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
      fetchPoList({ search: inboundNav.poSearch, page: 1 });
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
    setPoLineEditForm({
      poNumber: String(poNumber || '').trim(),
      lineId: String(line?.id || ''),
      itemCode: String(line?.item_code || line?.itemCode || '').trim(),
      itemName: String(line?.item_name || line?.itemName || '').trim(),
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
    const qtyOrder = Number(poLineEditForm.qtyOrder);
    if (!poNumber || !lineId) {
      setPoLineEditError('Line PO tidak valid.');
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
        body: JSON.stringify({ qtyOrder }),
      });
      if (showToastMessage) {
        showToastMessage(`Qty PO ${poNumber} - ${poLineEditForm.itemCode} berhasil diperbarui.`, '', null, 'info');
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
    if (Number.isFinite(linePackQty) && linePackQty > 0) {
      return Math.ceil(inputQtyValue / linePackQty) * linePackQty;
    }
    if (typeof normalizeQtyByNsp !== 'function') return inputQtyValue;
    const normalized = normalizeQtyByNsp(inputQtyValue, itemCode);
    return Number.isFinite(normalized) ? normalized : inputQtyValue;
  }, [inputQtyValue, newPlan.item, normalizeQtyByNsp, selectedLineForInput]);
  const isQtyRoundedUp = Number.isFinite(normalizedInputQty)
    && Number.isFinite(inputQtyValue)
    && normalizedInputQty > inputQtyValue;
  const isQtyOver = Number.isFinite(remainingForInput)
    && Number.isFinite(normalizedInputQty)
    && normalizedInputQty > 0
    && normalizedInputQty > remainingForInput;

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

  const resolvePoStatusMeta = (value) => {
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
  };

  const resolvePoScheduleStatusMeta = (row) => {
    const totalOrder = Number(row?.total_qty_order || 0);
    const totalReceived = Number(row?.total_qty_received || 0);
    const remaining = totalOrder - totalReceived;
    const scheduled = Number(row?.total_qty_scheduled ?? row?.scheduled_qty ?? 0);
    const scheduleCount = Number(row?.schedule_count ?? row?.scheduleCount ?? 0);
    const hasSchedule = scheduled > 0 || scheduleCount > 0;
    if (remaining <= 0) {
      return { label: 'FULL DIJADWALKAN', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    }
    if (!hasSchedule) {
      return { label: 'BELUM DIJADWALKAN', className: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
    }
    if (scheduled < remaining) {
      return { label: 'DIJADWALKAN SEBAGIAN', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
    }
    return { label: 'FULL DIJADWALKAN', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  };

  const resolveScheduleStatusMeta = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'on time') {
      return { label: 'ON TIME', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
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
                               className={`border p-2 rounded outline-none ${isQtyOver ? 'border-red-400 bg-red-50' : ''}`}
                               value={newPlan.requestQty}
                               onChange={e => setNewPlan({ ...newPlan, requestQty: e.target.value })}
                               readOnly={poLocked && !hasSingleSelectedPoLine}
                               disabled={poLocked && !hasSingleSelectedPoLine}
                             />
                             {isQtyRoundedUp && !isQtyOver && (
                               <div className="text-[11px] text-amber-600">
                                 Qty akan dibulatkan menjadi {formatNumber0 ? formatNumber0(normalizedInputQty) : normalizedInputQty} mengikuti pack item.
                               </div>
                             )}
                             {isQtyOver && Number.isFinite(remainingForInput) && (
                               <div className="text-[11px] text-red-600">
                                 Error: Qty setelah pembulatan pack menjadi {formatNumber0 ? formatNumber0(normalizedInputQty) : normalizedInputQty}, melebihi sisa PO ({formatNumber0 ? formatNumber0(remainingForInput) : remainingForInput})
                               </div>
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
                               {formatNumber0 ? formatNumber0(selectedLineSummary.totalQty) : selectedLineSummary.totalQty}
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
                               Tampilkan Sisa &gt; 0
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
                                         </td>
                                         <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(qtyOrder) : qtyOrder}</td>
                                         <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(qtyReceived) : qtyReceived}</td>
                                         <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(remaining) : remaining}</td>
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
                      <option value="Too Early">Too Early</option>
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
                        <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white shadow-xl z-[90] overflow-hidden text-sm">
                          {canImportSchedules && (
                            <button
                              type="button"
                              onClick={() => {
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
                                onClick={() => {
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
                                  openBulkReceiveModal();
                                  setInboundActionOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 disabled:opacity-60"
                                disabled={selectedScheduleIds.length === 0 || isStockOpnameLocked}
                              >
                                <PackagePlus size={16} /> Input Kedatangan (Batch)
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
                            </>
                          )}
                          {canImportSchedules && (
                            <>
                              <div className="border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={() => {
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
                          const splitDecision = getSplitDecision(item);
                          const noteValue = noteDrafts[item.id] ?? item.notes ?? '';
                          const poStatusMeta = resolvePoStatusMeta(item.poStatus);
                          const scheduleStatusMeta = resolveScheduleStatusMeta(item.status);
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
                                  <div className="text-xs">Order: <b>{getDisplayOrderQty(item)}</b></div>
                                  {(() => {
                                    const totalOrder = getTotalOrderQty(item);
                                    const displayQty = Number(getDisplayOrderQty(item));
                                    if (!Number.isFinite(totalOrder)) return null;
                                    if (Number.isFinite(displayQty) && totalOrder === displayQty) return null;
                                    return (
                                      <div className="text-[10px] text-slate-500">
                                        Total PO: <span className="font-semibold">{totalOrder}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 bg-emerald-50/40 pr-6 border-r border-b border-slate-200">
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs text-slate-600">
                                    <div className="flex items-center gap-1">
                                      <Truck size={12} className="text-teal-500" />
                                      <span>No. SJ:</span>
                                      <span className="font-semibold">{item.doNumber || '-'}</span>
                                    </div>
                                    <div>Tgl Tiba: <span className="font-semibold">{item.arrivalDate || '-'}</span></div>
                                    <div>Qty Tiba: <span className="font-semibold">{item.receivedQty || 0}</span></div>
                                  </div>
                                  {(canEditSchedules || splitDecision?.needsSplit || item.actualLocked) && (
                                    <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                                      {canEditSchedules && !item.actualLocked && (
                                        <button
                                          type="button"
                                          onClick={() => openBulkReceiveModal([item.id])}
                                          className="text-[10px] px-2 py-1 rounded-full border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-60"
                                          disabled={isStockOpnameLocked}
                                          title={isStockOpnameLocked ? 'Selesaikan dulu Stock Opname!' : 'Input kedatangan'}
                                        >
                                          Input
                                        </button>
                                      )}
                                      {(splitDecision?.needsSplit || item.actualLocked) && (
                                        <div className="flex items-center gap-2">
                                          {item.actualLocked ? (
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
                                          ) : (
                                            <span
                                              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-400"
                                              title="Data terbuka."
                                            >
                                              <Unlock size={12} />
                                            </span>
                                          )}
                                          {canEditSchedules && splitDecision?.needsSplit && !item.hasSplit && (
                                            <button
                                              type="button"
                                              onClick={() => handleSplitSchedule(item)}
                                              className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1 hover:bg-amber-100 transition"
                                              title="Split sisa barang"
                                            >
                                              <GitFork size={10} />
                                              {splitDecision.outstanding}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="h-full p-4 pt-3 text-center pl-4 border-r border-b border-slate-200">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-wide ${scheduleStatusMeta.className}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${scheduleStatusMeta.dot}`} />
                                  {scheduleStatusMeta.label}
                                </span>
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

            {bulkReceiveOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeBulkReceiveModal}>
                <div className="bg-white rounded-2xl shadow-xl border w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Input Kedatangan (Batch)</div>
                      <div className="text-xs text-slate-500">Isi No. SJ dan Tgl Tiba sekali untuk semua item terpilih.</div>
                    </div>
                    <button onClick={closeBulkReceiveModal} className="text-slate-500 hover:text-slate-700">
                      <XIcon size={18} />
                    </button>
                  </div>
                  {isStockOpnameLocked && (
                    <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Selesaikan dulu Stock Opname!
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">No. SJ / DO</label>
                      <input
                        className="border rounded px-3 py-2"
                        value={bulkReceiveDoNumber}
                        onChange={(e) => setBulkReceiveDoNumber(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Tgl Tiba</label>
                      <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={bulkReceiveDate}
                        onChange={(e) => setBulkReceiveDate(e.target.value)}
                      />
                    </div>
                  </div>
                  {isAdmin && (
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={bulkReceiveAllowOver}
                        onChange={(e) => setBulkReceiveAllowOver(e.target.checked)}
                      />
                      Izinkan Over-Receive
                    </label>
                  )}
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">Item Terpilih</div>
                    <div className="max-h-72 overflow-y-auto">
                      {filteredSchedules.filter((row) => selectedScheduleIds.includes(row.id)).map((row) => {
                        const remainingQty = getRemainingQty(row);
                        const inputQty = Number(bulkReceiveQty[row.id] || 0);
                        const inputDocQty = Number(bulkReceiveDocQty[row.id] || 0);
                        const itemName = row.itemName || row.item_name || '';
                        const showName = itemName && !String(row.item || '').toLowerCase().includes(String(itemName).toLowerCase());
                        return (
                          <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-t text-sm items-center">
                            <div>
                              <div className="font-semibold">{row.item}</div>
                              {showName && <div className="text-xs text-slate-500">{itemName}</div>}
                              <div className="text-xs text-slate-500">PO {row.poNumber} - {resolveSupplierLabel(row)}</div>
                            </div>
                            <div className="text-xs text-slate-600">
                              Sisa PO: <span className="font-semibold">{remainingQty}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500">Qty Dokumen</label>
                              <input
                                type="number"
                                className="border rounded px-3 py-2 text-sm"
                                value={bulkReceiveDocQty[row.id] ?? ''}
                                onChange={(e) => {
                                  const next = { ...bulkReceiveDocQty, [row.id]: e.target.value };
                                  setBulkReceiveDocQty(next);
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-slate-500">Qty Tiba</label>
                              <input
                                type="number"
                                className={`border rounded px-3 py-2 text-sm ${(inputQty > remainingQty || inputQty > inputDocQty) ? 'border-amber-400 bg-amber-50' : ''}`}
                                value={bulkReceiveQty[row.id] ?? ''}
                                onChange={(e) => {
                                  const next = { ...bulkReceiveQty, [row.id]: e.target.value };
                                  setBulkReceiveQty(next);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeBulkReceiveModal} className="px-4 py-2 rounded border text-sm">Batal</button>
                    <button
                      onClick={handleBulkReceiveSubmit}
                      className="px-4 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
                      disabled={isStockOpnameLocked}
                    >
                      Simpan Batch
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      <div>Plan Qty: <span className="font-semibold">{inboundCardAdjustSchedule.requestQty}</span></div>
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
                        <button
                          type="button"
                          onClick={handleDownloadPoTemplate}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Download size={16} />
                          Download Template
                        </button>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          ref={poImportRef}
                          onChange={handleImportPoExcel}
                        />
                        <button
                          type="button"
                          onClick={() => poImportRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                          disabled={poImporting}
                        >
                          <FileSpreadsheet size={16} />
                          {poImporting ? 'Mengimpor...' : 'Import Excel'}
                        </button>
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
                    <div className="text-xs text-slate-500">Total: {poTotal} PO • Default: bulan berjalan</div>
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
                        <th className="p-3 text-right">Qty Sisa</th>
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
                          const remaining = totalOrder - totalReceived;
                          const statusMeta = resolvePoStatusMeta(row.status);
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
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusMeta.className}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                                    {statusMeta.label}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold ${scheduleStatusMeta.className}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${scheduleStatusMeta.dot}`} />
                                    {scheduleStatusMeta.label}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-slate-600">{row.line_count ?? 0}</td>
                                <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(totalOrder) : totalOrder}</td>
                                <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(totalReceived) : totalReceived}</td>
                                <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(remaining) : remaining}</td>
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
                                          Tampilkan Sisa &gt; 0
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
                                                      <td colSpan={6} className="p-4 text-center text-slate-400">Tidak ada item dengan sisa.</td>
                                                    </tr>
                                                  );
                                                }
                                                return detailLines.map((line) => {
                                                  const qtyOrderLine = Number(line.qty_order || 0);
                                                  const qtyReceivedLine = Number(line.qty_received || 0);
                                                  const remainingLine = qtyOrderLine - qtyReceivedLine;
                                                  const lineStatus = resolvePoLineStatus(line);
                                                  const itemCode = line.item_code || line.itemCode || '-';
                                                  const itemName = line.item_name || line.itemName || '';
                                                  return (
                                                    <tr key={`${row.po_number}-${line.id || itemCode}`} className="border-t border-slate-200">
                                                      <td className="p-3 text-slate-700">
                                                        <div className="font-semibold">{itemCode}</div>
                                                        {itemName && <div className="text-[11px] text-slate-500">{itemName}</div>}
                                                      </td>
                                                      <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(qtyOrderLine) : qtyOrderLine}</td>
                                                      <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(qtyReceivedLine) : qtyReceivedLine}</td>
                                                      <td className="p-3 text-right text-slate-600">{formatNumber0 ? formatNumber0(remainingLine) : remainingLine}</td>
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
                  Format Excel: `No. PO`, `Tanggal PO (Format: DD-MM-YYYY)`, `Kode Supplier`, `Kode Item`, `Qty Order`.
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
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={scheduleEditForm.requestQty ?? ''}
                          onChange={(e) => setScheduleEditForm((prev) => ({ ...prev, requestQty: e.target.value }))}
                        />
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
                      <div className="text-lg font-semibold text-slate-900">Edit Qty PO</div>
                      <div className="text-xs text-slate-500">Perbarui qty order per item di master PO.</div>
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
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                          value={poLineEditForm.itemCode}
                          readOnly
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Nama Barang</label>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50"
                          value={poLineEditForm.itemName}
                          readOnly
                        />
                      </div>
                    </div>
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
                        <label className="text-xs font-semibold text-slate-600">Qty Sisa Saat Ini</label>
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
