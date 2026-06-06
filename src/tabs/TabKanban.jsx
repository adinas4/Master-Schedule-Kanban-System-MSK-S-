import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  Filter,
  FileSpreadsheet,
  FileText,
  FileUp,
  Mail,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings,
  Trash2,
  Truck,
  ChevronDown,
  X,
  X as XIcon,
} from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import logoPrl from '../assets/kop-mrp.png';
import logoMatra from '../assets/logo-matra.png';

const normalizeReceiveDoNumber = (value) => String(value || '').trim();

const validateReceiveDoNumberFormat = (value) => {
  const normalized = normalizeReceiveDoNumber(value);
  if (!normalized) {
    return { valid: false, reason: 'Nomor SJ / DO wajib diisi.' };
  }
  if (normalized.length > 120) {
    return { valid: false, reason: 'Nomor SJ / DO terlalu panjang. Maksimal 120 karakter.' };
  }
  if (!/^[A-Za-z0-9./_\-\s]+$/.test(normalized)) {
    return { valid: false, reason: 'Nomor SJ / DO hanya boleh huruf, angka, spasi, titik, slash, underscore, atau dash.' };
  }
  return { valid: true, reason: '' };
};

const TabKanban = (props) => {
  const {
    apiFetch,
    batchForm,
    buildKanbanId,
    canImportExport,
    canEditSchedules,
    canDeleteRecords,
    canProduction,
    closeDnDetailModal,
    closeDnPrintModal,
    consumeQty,
    consumeStockFromScan,
    createRequestFromScan,
    deliveryNotesLoading,
    dnDetailEditable,
    dnDetailEdits,
    dnDetailLoading,
    dnDetailRows,
    dnForm,
    dnPrintLoading,
    dnPrintPayload,
    dnStatusFlowList,
    emptyKanbanForm,
    extractAreaNote,
    extractKanbanIdNote,
    fetchKanbanRequests,
    fetchKanbanSettings,
    fetchDeliveryNotes,
    fetchReceiveNotes,
    fifoTotalsByItemCode,
    filteredKanbanItems,
    formatNumber0,
    formatNumber2,
    formatScanTime,
    getCategoryLabel,
    getKanbanCardsLabel,
    getRequestIdLabel,
    handleApproveAndCreateDn,
    handleBatchSubmit,
    handleCreateDn,
    handleCreateSchedule,
    handleDeleteDn,
    handleDeleteKanbanRequest,
    handleDnDetailSave,
    handleForceCloseDn,
    handleDnEmail,
    handleDnPreview,
    handleDnPrintPdf,
    handleEmptyKanbanSubmit,
    handleLoadSampleScan,
    handleManualRequest,
    handleProcessScan,
    handleReceive,
    handleRejectKanban,
    handleRequestDnBatch,
    handleSaveKanbanSetting,
    items,
    kanbanCategory,
    kanbanCategoryFilter,
    kanbanDnPaginationMeta,
    kanbanEditMode,
    kanbanEmptyPaginationMeta,
    kanbanError,
    kanbanLoading,
    kanbanPaginationMeta,
    kanbanRequestStatusFilter,
    kanbanRequestQuickFilter,
    kanbanRequestFilters,
    kanbanReceivingPaginationMeta,
    kanbanRequests,
    getKanbanRequestHealth,
    kanbanSearch,
    kanbanSettings,
    kanbanSettingsByCode,
    kanbanSettingsForm,
    kanbanSubTab,
    kanbanView,
    isStockOpnameLocked,
    mainTab,
    manualRequestForm,
    masterAreas,
    masterDeliveries,
    masterItemsByCode,
    masterLocationsById,
    masterPlants,
    masterVendors,
    openDnDetailModal,
    openDnModal,
    openKanbanShortageInPrl,
    openQrModal,
    openReceiveModal,
    openScheduleModal,
    openVendorDetail,
    qcStatusOptions,
    qrPayload,
    qrTitle,
    receiveForm,
    receiveNotesLoading,
    rnDateEnd,
    rnDateStart,
    rnSearch,
    rnStatus,
    renderPaginationControls,
    resolveVendorFromSupplier,
    scanActiveResult,
    scanError,
    scanInput,
    scanMode,
    scanResults,
    scanVideoRef,
    scheduleForm,
    selectedDnDetail,
    selectedRequestIds,
    setBatchForm,
    setConsumeQty,
    setDnDetailEdits,
    setDnForm,
    setEmptyKanbanForm,
    setKanbanCategory,
    setKanbanCategoryFilter,
    setKanbanEditMode,
    setKanbanRequestStatusFilter,
    setKanbanRequestQuickFilter,
    setKanbanRequestFilters,
    setKanbanSearch,
    setKanbanSettingsForm,
    setKanbanSubTab,
    setKanbanView,
    setManualRequestForm,
    setReceiveForm,
    setRnDateEnd,
    setRnDateStart,
    setRnSearch,
    setRnStatus,
    setScanCameraEnabled,
    setScanError,
    setScanInput,
    setScanMode,
    setScheduleForm,
    setSelectedRequestIds,
    setShowBatchModal,
    setShowConsumeModal,
    setShowDnModal,
    setShowKanbanCardModal,
    setShowKanbanEdit,
    setShowManualRequestModal,
    setShowQrModal,
    setShowReceiveModal,
    setShowScheduleModal,
    setShowTriggerChoiceModal,
    showDnPrintModal,
    showBatchModal,
    showConsumeModal,
    showDnDetailModal,
    showDnModal,
    showKanbanEdit,
    showManualRequestModal,
    showQrModal,
    showReceiveModal,
    showScheduleModal,
    toggleRequestSelection,
    ensureXlsx,
    showToastMessage,
  } = props;

  const emptyLogRef = useRef(null);
  const [emptyScrollTop, setEmptyScrollTop] = useState(0);
  const [emptyListSize, setEmptyListSize] = useState({ height: 320, width: 0 });
  const emptyRowHeight = 44;
  const emptyOverscan = 6;
  const emptyLogGrid = useMemo(
    () => '160px 140px minmax(220px, 1.6fr) 140px 120px 120px 140px 120px',
    [],
  );
  const emptyLogRows = useMemo(() => kanbanEmptyPaginationMeta.rows || [], [kanbanEmptyPaginationMeta.rows]);
  const requestStatusOptions = useMemo(() => ([
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'dn_created', label: 'DN Created' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'receiving', label: 'Receiving/QC' },
    { value: 'fifo', label: 'FIFO' },
    { value: 'closed', label: 'Closed' },
  ]), []);
  const requestQuickFilterOptions = useMemo(() => ([
    { value: 'all', label: 'Semua' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'stock-gap', label: 'Stock Gap' },
  ]), []);
  const [localKanbanSearch, setLocalKanbanSearch] = useState(kanbanSearch || '');
  const [localRnSearch, setLocalRnSearch] = useState(rnSearch || '');
  const formatRequestAging = (ageHours) => {
    const safeHours = Number(ageHours || 0);
    if (safeHours >= 24) return `${Math.floor(safeHours / 24)}d ${safeHours % 24}h`;
    return `${safeHours}h`;
  };
  const kanbanRequestHealthSummary = useMemo(() => (
    kanbanRequests.reduce((acc, row) => {
      const health = getKanbanRequestHealth(row);
      if (health.isOverdue) acc.overdue += 1;
      if (health.isBlocked) acc.blocked += 1;
      if (health.hasStockGap) acc.stockGap += 1;
      return acc;
    }, { overdue: 0, blocked: 0, stockGap: 0 })
  ), [kanbanRequests, getKanbanRequestHealth]);
  const kanbanRequestHealthByItem = useMemo(() => (
    kanbanRequests.reduce((acc, row) => {
      const itemCode = String(row?.item_code || '').trim();
      if (!itemCode) return acc;
      const statusKey = String(row?.status || '').trim().toLowerCase();
      if (['closed', 'rejected', 'fifo'].includes(statusKey)) return acc;
      const health = getKanbanRequestHealth(row);
      if (!acc[itemCode]) {
        acc[itemCode] = { open: 0, overdue: 0, blocked: 0, stockGap: 0 };
      }
      acc[itemCode].open += 1;
      if (health.isOverdue) acc[itemCode].overdue += 1;
      if (health.isBlocked) acc[itemCode].blocked += 1;
      if (health.hasStockGap) acc[itemCode].stockGap += 1;
      return acc;
    }, {})
  ), [kanbanRequests, getKanbanRequestHealth]);
  const getKanbanItemAndon = (row) => {
    const itemCode = String(row?.item_code || '').trim();
    const metrics = kanbanRequestHealthByItem[itemCode] || { open: 0, overdue: 0, blocked: 0, stockGap: 0 };
    const masterItem = masterItemsByCode.get(itemCode);
    const stock = Number(fifoTotalsByItemCode.get(itemCode) ?? 0);
    const min = Number(masterItem?.safety_stock ?? 0);
    const lot = Math.max(0, Number(row?.lot_qty ?? 0));
    const yellowThreshold = min + (lot > 0 ? lot : Math.max(1, Math.ceil(min * 0.25)));
    if (metrics.overdue > 0 || metrics.stockGap > 0 || (min > 0 && stock < min)) {
      return {
        level: 'red',
        label: 'Andon Red',
        note: metrics.overdue > 0
          ? `${metrics.overdue} overdue request`
          : metrics.stockGap > 0
            ? `${metrics.stockGap} stock gap request`
            : 'Stock below minimum',
        tone: 'border-red-300 bg-gradient-to-br from-red-50 via-white to-red-100/60',
        pill: 'bg-red-600 text-white',
        stockTone: 'text-red-700',
      };
    }
    if (metrics.blocked > 0 || metrics.open > 0 || (min > 0 && stock <= yellowThreshold)) {
      return {
        level: 'yellow',
        label: 'Andon Yellow',
        note: metrics.blocked > 0
          ? `${metrics.blocked} blocked request`
          : metrics.open > 0
            ? `${metrics.open} open request`
            : 'Stock approaching minimum',
        tone: 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-100/60',
        pill: 'bg-amber-500 text-white',
        stockTone: 'text-amber-700',
      };
    }
    return {
      level: 'green',
      label: 'Andon Green',
      note: 'Supply normal',
      tone: 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-lime-100/60',
      pill: 'bg-emerald-600 text-white',
      stockTone: 'text-emerald-700',
    };
  };
  const kanbanItemAndonSummary = useMemo(() => (
    filteredKanbanItems.reduce((acc, row) => {
      const andon = getKanbanItemAndon(row);
      acc[andon.level] += 1;
      return acc;
    }, { red: 0, yellow: 0, green: 0 })
  ), [filteredKanbanItems, kanbanRequestHealthByItem, fifoTotalsByItemCode, masterItemsByCode]);

  const normalizeVendorScheduleRows = (input) => {
    let rows = input;
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const ritRaw = row?.rit ?? row?.RIT ?? row?.rit_no ?? row?.ritNo ?? '';
        const ritValue = ritRaw !== null && ritRaw !== undefined ? String(ritRaw).trim() : '';
        const timeValue = String(row?.time ?? row?.delivery_time ?? row?.deliveryTime ?? '').trim();
        const cycleValue = String(row?.cycle ?? '').trim();
        return {
          rit: ritValue,
          time: timeValue,
          cycle: cycleValue,
        };
      })
      .filter((row) => row.rit || row.time || row.cycle);
  };

  const buildVendorScheduleRows = (vendor) => {
    if (!vendor) return [];
    const schedule = normalizeVendorScheduleRows(vendor.delivery_schedule || vendor.deliverySchedule);
    if (schedule.length > 0) return schedule;
    const legacy = {
      rit: String(vendor.rit ?? '').trim(),
      time: String(vendor.delivery_time ?? vendor.deliveryTime ?? '').trim(),
      cycle: String(vendor.cycle ?? '').trim(),
    };
    return normalizeVendorScheduleRows([legacy]);
  };

  const resolveScheduleRowsForSupplier = (supplierValue) => {
    if (!supplierValue) return [];
    const vendor = resolveVendorFromSupplier?.(supplierValue);
    return buildVendorScheduleRows(vendor);
  };

  const dnScheduleRows = useMemo(
    () => resolveScheduleRowsForSupplier(dnForm?.supplier),
    [dnForm?.supplier, masterVendors],
  );

  const handleDnSupplierChange = (value) => {
    const scheduleRows = resolveScheduleRowsForSupplier(value);
    const firstSchedule = scheduleRows[0] || {};
    setDnForm((prev) => ({
      ...prev,
      supplier: value,
      scheduleIndex: scheduleRows.length > 0 ? '0' : '',
      cycle: firstSchedule.cycle || '',
      rit: firstSchedule.rit || '',
      deliveryTime: firstSchedule.time || '',
    }));
  };

  const handleDnScheduleChange = (value) => {
    if (value === '') {
      setDnForm((prev) => ({
        ...prev,
        scheduleIndex: '',
        cycle: '',
        rit: '',
        deliveryTime: '',
      }));
      return;
    }
    const index = Number(value);
    const selected = Number.isFinite(index) ? dnScheduleRows[index] || {} : {};
    setDnForm((prev) => ({
      ...prev,
      scheduleIndex: value,
      cycle: selected.cycle || '',
      rit: selected.rit || '',
      deliveryTime: selected.time || '',
    }));
  };
  const isRequestSelectable = (row) => {
    if (!row) return false;
    const statusKey = String(row?.status || 'requested').trim().toLowerCase();
    return ['triggered', 'requested', 'approved'].includes(statusKey) && !row?.dn_id;
  };
  const requestRows = kanbanPaginationMeta.rows || [];
  const [expandedRequestGroups, setExpandedRequestGroups] = useState(() => new Set());
  const toggleRequestGroup = (groupKey) => {
    setExpandedRequestGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };
  const toggleGroupSelection = (groupIds, shouldSelect) => {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      if (shouldSelect) {
        groupIds.forEach((id) => next.add(id));
      } else {
        groupIds.forEach((id) => next.delete(id));
      }
      return Array.from(next);
    });
  };
  const groupedKanbanRequests = useMemo(() => {
    const groups = new Map();
    requestRows.forEach((row) => {
      const groupKey = row.request_group || row.request_code || `KR-${row.id}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { key: groupKey, rows: [] });
      }
      groups.get(groupKey).rows.push(row);
    });
    return Array.from(groups.values()).map((group) => {
      const rows = [...group.rows].sort((a, b) => {
        const splitA = Number(a.split_index || 0);
        const splitB = Number(b.split_index || 0);
        if (splitA !== splitB) return splitA - splitB;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
      const itemCodes = Array.from(new Set(rows.map((row) => row.item_code).filter(Boolean)));
      const itemLabel = itemCodes.length === 1
        ? `${itemCodes[0]} - ${rows.find((row) => row.item_code === itemCodes[0])?.item_name || ''}`.trim()
        : `${itemCodes[0] || '-'} +${Math.max(itemCodes.length - 1, 0)}`;
      const totalQty = rows.reduce((acc, row) => acc + Number(row.request_qty || 0), 0);
      const statusKeys = rows.map((row) => String(row.status || '').toLowerCase());
      const deliveredCount = statusKeys.filter((key) => ['dn_created', 'scheduled', 'in_transit', 'receiving', 'fifo', 'closed'].includes(key)).length;
      const rejectedCount = statusKeys.filter((key) => key === 'rejected').length;
      const totalCount = rows.length;
      const progressLabel = rejectedCount > 0
        ? `Rejected ${rejectedCount}/${totalCount}`
        : `${deliveredCount}/${totalCount} Delivered`;
      return {
        ...group,
        rows,
        itemLabel: itemLabel || '-',
        totalQty,
        progressLabel,
        totalCount,
      };
    });
  }, [requestRows]);
  const requestSelectableIds = requestRows
    .filter((row) => isRequestSelectable(row))
    .map((row) => row.id);
  const emptyWindow = useMemo(() => {
    const total = emptyLogRows.length;
    const viewportHeight = Math.max(0, emptyListSize.height);
    const visibleCount = viewportHeight > 0 ? Math.ceil(viewportHeight / emptyRowHeight) : 0;
    const startIndex = Math.max(0, Math.floor(emptyScrollTop / emptyRowHeight) - emptyOverscan);
    const endIndex = Math.min(total, startIndex + visibleCount + emptyOverscan * 2);
    return { total, startIndex, endIndex };
  }, [emptyLogRows.length, emptyListSize.height, emptyRowHeight, emptyScrollTop, emptyOverscan]);
  const visibleEmptyRows = useMemo(
    () => emptyLogRows.slice(emptyWindow.startIndex, emptyWindow.endIndex),
    [emptyLogRows, emptyWindow.startIndex, emptyWindow.endIndex],
  );

  useEffect(() => {
    const node = emptyLogRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setEmptyListSize((prev) => {
        const next = { height: rect.height, width: rect.width };
        if (prev.height === next.height && prev.width === next.width) return prev;
        return next;
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSelectedRequestIds([]);
  }, [kanbanRequestStatusFilter, setSelectedRequestIds]);

  const formatDnQty = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return formatNumber2(num);
  };

  const formatDnQty0 = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (typeof formatNumber0 === 'function') return formatNumber0(num);
    return Math.round(num).toLocaleString('id-ID');
  };

  const formatPrintDateCode = (dateValue = new Date()) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}${month}`;
  };

  const buildPrintFileName = (prefix, refValue) => {
    const ref = String(refValue || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '')
      .replace(/-+/g, '-')
      .trim();
    const dateCode = formatPrintDateCode();
    return `${prefix}-${ref || 'DOC'}-${dateCode}`;
  };

  const triggerPrintWithTitle = (title) => {
    if (typeof window === 'undefined') return;
    const originalTitle = typeof document !== 'undefined' ? document.title : '';
    const nextTitle = title || originalTitle || 'Document';
    if (typeof document !== 'undefined') document.title = nextTitle;
    const cleanup = () => {
      if (typeof document !== 'undefined') document.title = originalTitle;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const formatProductionDateValue = (value) => {
    if (!value) return '-';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().slice(0, 10);
  };

  const formatReportDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const reportTodayLabel = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const renderProductionReportHeader = (title, periodStart, periodEnd, uniqCode) => (
    <div className="report-print-header print-only">
      <div className="report-header-left">
        <img src={logoMatra} alt="Logo" className="report-logo" />
        <div>
          <div className="report-company">PT. MATRA RODA PIRANTI</div>
          <div className="report-dept">Departemen Logistik (PPIC)</div>
        </div>
      </div>
      <div className="report-header-right">
        <div className="report-title">{title}</div>
        <div className="report-meta">
          <div>Periode: {periodStart || periodEnd ? `${formatReportDate(periodStart)} s/d ${formatReportDate(periodEnd)}` : '-'}</div>
          <div>Kode Uniq: {uniqCode || '-'}</div>
          <div>Print Date: {reportTodayLabel}</div>
        </div>
      </div>
    </div>
  );

  const renderProductionReportSignatures = () => (
    <div className="report-signatures print-only">
      <div className="report-sign-card">
        <div className="report-sign-title">Dibuat Oleh</div>
        <div className="report-sign-space" />
        <div className="report-sign-label">Admin</div>
      </div>
      <div className="report-sign-card">
        <div className="report-sign-title">Diperiksa Oleh</div>
        <div className="report-sign-space" />
        <div className="report-sign-label">SPV</div>
      </div>
      <div className="report-sign-card">
        <div className="report-sign-title">Disetujui Oleh</div>
        <div className="report-sign-space" />
        <div className="report-sign-label">Manager</div>
      </div>
    </div>
  );

  const [receiveSupplier, setReceiveSupplier] = useState('');
  const [receiveDnOptions, setReceiveDnOptions] = useState([]);
  const [receiveDnLoading, setReceiveDnLoading] = useState(false);
  const [receiveDnError, setReceiveDnError] = useState('');
  const [receiveSelectedDnIds, setReceiveSelectedDnIds] = useState([]);
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState('');
  const [receiveScanInput, setReceiveScanInput] = useState('');
  const [receiveScanError, setReceiveScanError] = useState('');
  const [receiveScanLogs, setReceiveScanLogs] = useState([]);
  const receiveScanSetRef = useRef(new Set());
  const [receiveFlashKey, setReceiveFlashKey] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveTruckNo, setReceiveTruckNo] = useState('');
  const [receiveDriverName, setReceiveDriverName] = useState('');
  const [receiveDoNumber, setReceiveDoNumber] = useState('');
  const [receiveDoCheck, setReceiveDoCheck] = useState({
    status: 'idle',
    message: '',
    matches: [],
  });
  const receiveDoCheckSeqRef = useRef(0);
  const productionImportRef = useRef(null);
  const wipImportRef = useRef(null);
  const [productionTab, setProductionTab] = useState('fg');
  const [productionImportRows, setProductionImportRows] = useState([]);
  const [productionImportLoading, setProductionImportLoading] = useState(false);
  const [productionImportError, setProductionImportError] = useState('');
  const [productionImportSummary, setProductionImportSummary] = useState(null);
  const [wipImportRows, setWipImportRows] = useState([]);
  const [wipImportLoading, setWipImportLoading] = useState(false);
  const [wipImportError, setWipImportError] = useState('');
  const [wipImportSummary, setWipImportSummary] = useState(null);
  const [wipImportHistoryRows, setWipImportHistoryRows] = useState([]);
  const [wipImportHistoryLoading, setWipImportHistoryLoading] = useState(false);
  const [wipImportHistoryError, setWipImportHistoryError] = useState('');
  const [productionHistoryLoading, setProductionHistoryLoading] = useState(false);
  const [productionHistoryError, setProductionHistoryError] = useState('');
  const [productionCompareRows, setProductionCompareRows] = useState([]);
  const [productionCompareLoading, setProductionCompareLoading] = useState(false);
  const [productionCompareError, setProductionCompareError] = useState('');
  const [productionCompareStart, setProductionCompareStart] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().slice(0, 10);
  });
  const [productionCompareEnd, setProductionCompareEnd] = useState(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().slice(0, 10);
  });
  const [productionCompareCode, setProductionCompareCode] = useState('');
  const [localProductionCompareCode, setLocalProductionCompareCode] = useState('');
  const [showReceiveFormModal, setShowReceiveFormModal] = useState(false);
  const [showRnDetailModal, setShowRnDetailModal] = useState(false);
  const [selectedRnDetail, setSelectedRnDetail] = useState(null);
  const [showRnPrintModal, setShowRnPrintModal] = useState(false);
  const [rnPrintPayload, setRnPrintPayload] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.toggle('rn-print-active', showRnPrintModal);
    return () => {
      document.body.classList.remove('rn-print-active');
    };
  }, [showRnPrintModal]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!showDnPrintModal && !showRnPrintModal) return undefined;
    const style = document.createElement('style');
    style.setAttribute('data-print-margin', 'dn-rn');
    style.innerHTML = `
      @media print {
        @page {
          size: A4;
          margin: 15mm;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [showDnPrintModal, showRnPrintModal]);

  useEffect(() => {
    setLocalProductionCompareCode(productionCompareCode || '');
  }, [productionCompareCode]);

  const buildProductionUniqLabel = (itemCode, partNo) => {
    const code = String(itemCode || '').trim();
    const part = String(partNo || '').trim();
    if (code && part && part !== code) return `${code} / ${part}`;
    return code || part || '-';
  };

  const productionReportRows = useMemo(() => {
    const rows = Array.isArray(productionCompareRows) ? productionCompareRows : [];
    const mapped = rows.map((row) => {
      const productionDateRaw = row.production_date ?? row.productionDate ?? row.date ?? row.productionDateLabel;
      const productionDate = formatProductionDateValue(productionDateRaw);
      const itemCode = row.item_code ?? row.itemCode ?? '-';
      const partNo = row.part_no ?? row.partNo ?? '';
      const itemName = row.item_name ?? row.itemName ?? '-';
      const productionQty = Number(row.production_qty ?? row.productionQty ?? 0);
      const kanbanQty = Number(row.kanban_qty ?? row.kanbanQty ?? 0);
      const diffQty = Number.isFinite(productionQty) && Number.isFinite(kanbanQty) ? productionQty - kanbanQty : 0;
      return {
        productionDate,
        productionDateRaw,
        itemCode,
        partNo,
        uniqLabel: buildProductionUniqLabel(itemCode, partNo),
        itemName,
        productionQty: Number.isFinite(productionQty) ? productionQty : 0,
        kanbanQty: Number.isFinite(kanbanQty) ? kanbanQty : 0,
        diffQty,
        status: diffQty === 0 ? 'MATCH' : 'UNMATCH',
      };
    });
    mapped.sort((a, b) => {
      const timeA = new Date(a.productionDateRaw || a.productionDate).getTime() || 0;
      const timeB = new Date(b.productionDateRaw || b.productionDate).getTime() || 0;
      return timeB - timeA;
    });
    return mapped.map((row, index) => ({ ...row, no: index + 1 }));
  }, [productionCompareRows]);

  const resetReceiveState = () => {
    setReceiveItems([]);
    setReceiveError('');
    setReceiveScanInput('');
    setReceiveScanError('');
    setReceiveScanLogs([]);
    receiveScanSetRef.current = new Set();
    setReceiveFlashKey('');
    setReceiveTruckNo('');
    setReceiveDriverName('');
    setReceiveDoNumber('');
    setReceiveDoCheck({ status: 'idle', message: '', matches: [] });
  };

  const formatExcelDate = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number') {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    }
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const readXlsRows = async (file, onRows, onError) => {
    const XLSX = await ensureXlsx();
    if (!XLSX) {
      if (onError) onError('Library XLSX belum tersedia.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        onRows(data);
      } catch {
        if (onError) onError('Gagal membaca file.');
      }
    };
    reader.onerror = () => {
      if (onError) onError('Gagal membaca file.');
    };
    reader.readAsBinaryString(file);
  };

  const notifyMessage = (message) => {
    if (showToastMessage) {
      showToastMessage(message);
      return;
    }
    alert(message);
  };

  const fetchOpenDns = async (supplierValue, options = {}) => {
    const preserveHeaderFields = Boolean(options.preserveHeaderFields);
    if (!supplierValue) {
      setReceiveDnOptions([]);
      setReceiveSelectedDnIds([]);
      return;
    }
    setReceiveDnLoading(true);
    setReceiveDnError('');
    try {
      const data = await apiFetch(`/api/delivery-notes/open?supplier=${encodeURIComponent(supplierValue)}`);
      setReceiveDnOptions(Array.isArray(data) ? data : []);
      setReceiveSelectedDnIds([]);
      if (preserveHeaderFields) {
        setReceiveItems([]);
        setReceiveError('');
        setReceiveScanInput('');
        setReceiveScanError('');
        setReceiveScanLogs([]);
        receiveScanSetRef.current = new Set();
        setReceiveFlashKey('');
      } else {
        resetReceiveState();
      }
    } catch (error) {
      setReceiveDnOptions([]);
      setReceiveSelectedDnIds([]);
      setReceiveDnError(error.message || 'Gagal memuat DN.');
    } finally {
      setReceiveDnLoading(false);
    }
  };

  useEffect(() => {
    if (receiveSupplier) {
      fetchOpenDns(receiveSupplier);
    } else {
      setReceiveDnOptions([]);
      setReceiveSelectedDnIds([]);
      resetReceiveState();
    }
  }, [receiveSupplier]);

  useEffect(() => {
    const formatCheck = validateReceiveDoNumberFormat(receiveDoNumber);
    const normalizedDoNumber = normalizeReceiveDoNumber(receiveDoNumber);
    if (!normalizedDoNumber) {
      setReceiveDoCheck({ status: 'idle', message: '', matches: [] });
      return undefined;
    }
    if (!formatCheck.valid) {
      setReceiveDoCheck({ status: 'invalid', message: formatCheck.reason, matches: [] });
      return undefined;
    }
    if (!String(receiveSupplier || '').trim()) {
      setReceiveDoCheck({ status: 'ready', message: 'Pilih supplier untuk memeriksa duplikasi SJ.', matches: [] });
      return undefined;
    }
    const seq = receiveDoCheckSeqRef.current + 1;
    receiveDoCheckSeqRef.current = seq;
    setReceiveDoCheck({ status: 'checking', message: 'Memeriksa duplikasi SJ...', matches: [] });
    const timer = setTimeout(async () => {
      try {
        const payloadItems = (receiveItems || [])
          .map((item) => ({
            supplier: receiveSupplier,
            poNumber: item.poNumber || item.po_number || item.dnNumber || item.dn_number || `DN-${item.originDnId || item.origin_dn_id || ''}`,
            itemCode: item.itemCode || item.item_code,
          }))
          .filter((item) => item.poNumber && item.itemCode);
        const result = await apiFetch('/api/schedules/check-sj', {
          method: 'POST',
          body: {
            doNumber: normalizedDoNumber,
            supplier: receiveSupplier,
            items: payloadItems,
          },
        });
        if (receiveDoCheckSeqRef.current !== seq) return;
        const matches = Array.isArray(result?.matches) ? result.matches : [];
        if (result?.status === 'block') {
          setReceiveDoCheck({
            status: 'block',
            message: `Nomor SJ "${normalizedDoNumber}" sudah aktif dipakai dan tidak boleh diinput ulang.`,
            matches,
          });
          return;
        }
        if (result?.status === 'warn') {
          const preview = matches.slice(0, 2)
            .map((row) => row?.itemName || row?.itemCode || row?.poNumber || '-')
            .join(', ');
          const suffix = matches.length > 2 ? ` dan ${matches.length - 2} lainnya` : '';
          setReceiveDoCheck({
            status: 'warn',
            message: preview
              ? `Nomor SJ ini sudah pernah muncul pada data lain: ${preview}${suffix}. Pastikan ini pengiriman gabungan yang valid.`
              : 'Nomor SJ ini sudah pernah muncul pada data lain. Pastikan ini pengiriman gabungan yang valid.',
            matches,
          });
          return;
        }
        setReceiveDoCheck({
          status: 'ok',
          message: 'Nomor SJ / DO siap digunakan.',
          matches: [],
        });
      } catch (error) {
        if (receiveDoCheckSeqRef.current !== seq) return;
        setReceiveDoCheck({
          status: 'error',
          message: error.message || 'Gagal memeriksa duplikasi SJ.',
          matches: [],
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [apiFetch, receiveDoNumber, receiveItems, receiveSupplier]);

  useEffect(() => {
    setLocalKanbanSearch(kanbanSearch || '');
  }, [kanbanSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localKanbanSearch !== kanbanSearch) {
        setKanbanSearch(localKanbanSearch);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [localKanbanSearch, kanbanSearch, setKanbanSearch]);

  useEffect(() => {
    setLocalRnSearch(rnSearch || '');
  }, [rnSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localRnSearch !== rnSearch) {
        setRnSearch(localRnSearch);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [localRnSearch, rnSearch, setRnSearch]);

  useEffect(() => {
    if (kanbanSubTab === 'production') {
      setProductionTab('fg');
    }
  }, [kanbanSubTab]);

  useEffect(() => {
    if (kanbanSubTab !== 'production') return;
    if (productionTab === 'fg') {
      fetchProductionImportHistory();
    } else if (productionTab === 'wip') {
      fetchWipImportHistory();
    } else if (productionTab === 'report') {
      fetchProductionCompare({ silent: true });
    }
  }, [kanbanSubTab, productionTab]);

  const fetchProductionImportHistory = async () => {
    if (!canProduction) return;
    setProductionHistoryLoading(true);
    setProductionHistoryError('');
    try {
      const data = await apiFetch('/api/production/imports');
      setProductionImportRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setProductionImportRows([]);
      setProductionHistoryError(error.message || 'Gagal memuat riwayat import.');
    } finally {
      setProductionHistoryLoading(false);
    }
  };

  const fetchWipImportHistory = async () => {
    if (!canProduction) return;
    setWipImportHistoryLoading(true);
    setWipImportHistoryError('');
    try {
      const data = await apiFetch('/api/wip/imports');
      if (!Array.isArray(data)) {
        const isHtml = typeof data === 'string' && /<!doctype html/i.test(data);
        throw new Error(isHtml
          ? 'Server mengembalikan HTML saat load riwayat import WIP. Cek endpoint /api/wip/imports.'
          : 'Response riwayat import WIP tidak valid.'
        );
      }
      setWipImportHistoryRows(data);
    } catch (error) {
      setWipImportHistoryRows([]);
      const message = error?.message || 'Gagal memuat riwayat import WIP.';
      const safeMessage = /<!doctype html/i.test(message)
        ? 'Gagal memuat riwayat import WIP. Server mengembalikan HTML.'
        : message;
      setWipImportHistoryError(safeMessage);
    } finally {
      setWipImportHistoryLoading(false);
    }
  };

  const fetchProductionCompare = async (options = {}) => {
    if (!canProduction) return;
    const start = options.start ?? productionCompareStart;
    const end = options.end ?? productionCompareEnd;
    const code = String(options.code ?? productionCompareCode ?? '').trim();
    if (!start || !end || !code) {
      if (!options.silent) {
        setProductionCompareError('Start date, end date, dan kode uniq wajib diisi.');
      }
      return;
    }
    setProductionCompareLoading(true);
    setProductionCompareError('');
    try {
      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);
      params.set('code', code);
      const query = params.toString();
      const data = await apiFetch(`/api/production/compare${query ? `?${query}` : ''}`);
      setProductionCompareRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setProductionCompareRows([]);
      setProductionCompareError(error.message || 'Gagal memuat komparasi produksi.');
    } finally {
      setProductionCompareLoading(false);
    }
  };

  const handleImportProductionFile = (e) => {
    if (isStockOpnameLocked) {
      notifyMessage('Selesaikan dulu Stock Opname!');
      if (productionImportRef.current) productionImportRef.current.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name || '';
    setProductionImportError('');
    setProductionImportSummary(null);
    readXlsRows(file, async (rows) => {
      if (!rows.length) {
        setProductionImportError('File kosong.');
        return;
      }
      try {
        const payloadRows = rows.map((row, idx) => {
          const dateRaw = row['Tanggal'] || row['Date'] || row['DATE'] || row['Tanggal Produksi'] || row['Production Date'];
          const uniqRaw = row['Uniq'] || row['UNIQ'] || row['Item'] || row['Item Code'] || row['Kode Item'] || row['Kode'];
          const qtyRaw = row['Qty'] || row['QTY'] || row['Quantity'] || row['Jumlah'];
          const date = formatExcelDate(dateRaw);
          const uniq = String(uniqRaw || '').trim();
          const qty = Number(qtyRaw);
          if (!date || !uniq || !Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Baris ${idx + 2} tidak lengkap atau qty tidak valid.`);
          }
          return { date, uniq, qty };
        });
        setProductionImportLoading(true);
        const result = await apiFetch('/api/production/import', {
          method: 'POST',
          body: JSON.stringify({ rows: payloadRows, fileName }),
        });
        setProductionImportSummary(result);
        notifyMessage('Import produksi selesai.');
        await fetchProductionImportHistory();
        await fetchProductionCompare({
          silent: true,
          start: productionCompareStart,
          end: productionCompareEnd,
          code: productionCompareCode,
        });
      } catch (error) {
        setProductionImportError(error.message || 'Import produksi gagal.');
        await fetchProductionImportHistory();
      } finally {
        setProductionImportLoading(false);
      }
    }, (message) => {
      setProductionImportError(message || 'Gagal membaca file.');
    });
    if (productionImportRef.current) productionImportRef.current.value = '';
  };

  const handleDownloadProductionTemplate = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = [
      { Tanggal: new Date().toISOString().slice(0, 10), Uniq: 'FG-EXAMPLE', Qty: 10 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produksi');
    XLSX.writeFile(wb, 'Template_Produksi.xlsx');
  };

  const handleDownloadWipTemplate = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = [
      {
        'Tanggal Produksi': new Date().toISOString().slice(0, 10),
        'Kode Barang': 'M08',
        'Lokasi Asal': 'Bending',
        'Lokasi Tujuan': 'Welding',
        'Qty Lulus': 120,
        'Qty Reject': 2,
        'No. Dokumen': 'TRV-001',
        'Shift': 'Shift 1',
        'PIC / Operator': 'Operator A',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi WIP');
    XLSX.writeFile(wb, 'Template_Mutasi_WIP.xlsx');
  };

  const handleImportWipFile = (e) => {
    if (isStockOpnameLocked) {
      notifyMessage('Selesaikan dulu Stock Opname!');
      if (wipImportRef.current) wipImportRef.current.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name || '';
    setWipImportError('');
    setWipImportSummary(null);
    setWipImportRows([]);
    readXlsRows(file, async (rows) => {
      if (!rows.length) {
        setWipImportError('File kosong.');
        return;
      }
      try {
        setWipImportLoading(true);
        const mapped = rows.map((row, idx) => {
          const dateRaw = row['Tanggal Produksi'] || row['Tanggal'] || row['Date'] || row['Production Date'];
          const itemRaw = row['Kode Barang'] || row['Item'] || row['Item Code'] || row['Kode'] || row['Code'];
          const fromRaw = row['Lokasi Asal'] || row['From'] || row['Asal'] || row['Process From'];
          const toRaw = row['Lokasi Tujuan'] || row['To'] || row['Tujuan'] || row['Process To'];
          const goodRaw = row['Qty Lulus'] || row['Qty Good'] || row['Good'] || row['Qty'];
          const rejectRaw = row['Qty Reject'] || row['Reject'] || row['Qty NG'];
          const docRaw = row['No. Dokumen'] || row['No Dokumen'] || row['Document No'] || row['Document'];
          const shiftRaw = row['Shift'] || row['Shift Label'];
          const operatorRaw = row['PIC / Operator'] || row['PIC'] || row['Operator'];
          const date = formatExcelDate(dateRaw);
          const itemCode = String(itemRaw || '').trim();
          const fromLocation = String(fromRaw || '').trim();
          const toLocation = String(toRaw || '').trim();
          const qtyGood = Number(goodRaw);
          const qtyReject = rejectRaw === undefined || rejectRaw === null || rejectRaw === '' ? null : Number(rejectRaw);
          const documentNo = String(docRaw || '').trim();
          const shiftLabel = String(shiftRaw || '').trim();
          const operatorName = String(operatorRaw || '').trim();
          const errors = [];
          if (!date) errors.push('Tanggal tidak valid');
          if (!itemCode) errors.push('Kode barang kosong');
          if (!fromLocation) errors.push('Lokasi asal kosong');
          if (!toLocation) errors.push('Lokasi tujuan kosong');
          if (!Number.isFinite(qtyGood) || qtyGood <= 0) errors.push('Qty lulus tidak valid');
          if (qtyReject !== null && (!Number.isFinite(qtyReject) || qtyReject < 0)) errors.push('Qty reject tidak valid');
          return {
            no: idx + 2,
            date,
            itemCode,
            fromLocation,
            toLocation,
            qtyGood: Number.isFinite(qtyGood) ? qtyGood : 0,
            qtyReject: qtyReject === null ? null : Number(qtyReject),
            documentNo,
            shiftLabel,
            operatorName,
            status: errors.length ? 'INVALID' : 'OK',
            errorMessage: errors.join(', '),
          };
        });
        const invalidRows = mapped.filter((row) => row.status !== 'OK');
        setWipImportRows(mapped);
        setWipImportSummary({
          fileName: file.name || '-',
          totalRows: mapped.length,
          successRows: mapped.length - invalidRows.length,
          failedRows: invalidRows.length,
        });

        if (invalidRows.length > 0) {
          const firstInvalid = invalidRows[0];
          const reason = firstInvalid.errorMessage || 'Data tidak valid.';
          const message = `Import dibatalkan. Gagal di baris ${firstInvalid.no}: ${reason}`;
          setWipImportError(message);
          notifyMessage(message);
          return;
        }

        const payloadRows = mapped.map((row) => ({
          rowNumber: row.no,
          date: row.date,
          itemCode: row.itemCode,
          fromLocation: row.fromLocation,
          toLocation: row.toLocation,
          qtyGood: row.qtyGood,
          qtyReject: row.qtyReject === null ? 0 : Number(row.qtyReject),
          documentNo: row.documentNo,
          shift: row.shiftLabel,
          operatorName: row.operatorName,
        }));
        const result = await apiFetch('/api/wip/import', {
          method: 'POST',
          body: JSON.stringify({ rows: payloadRows, fileName }),
        });
        setWipImportSummary({
          fileName: result?.fileName || fileName || '-',
          totalRows: result?.totalRows ?? payloadRows.length,
          successRows: result?.successRows ?? 0,
          failedRows: result?.failedRows ?? 0,
          totalQty: result?.totalQty ?? 0,
        });
        notifyMessage(`Import WIP selesai. ${result?.successRows ?? 0} baris berhasil di-import.`);
        await fetchWipImportHistory();
      } catch (error) {
        setWipImportError(error.message || 'Import WIP gagal.');
        notifyMessage(error.message || 'Import WIP gagal.');
        await fetchWipImportHistory();
      } finally {
        setWipImportLoading(false);
      }
    }, (message) => {
      setWipImportError(message || 'Gagal membaca file.');
    });
    if (wipImportRef.current) wipImportRef.current.value = '';
  };

  const resolveProductionCompareFilters = () => {
    const start = productionCompareStart;
    const end = productionCompareEnd;
    const code = String(localProductionCompareCode || productionCompareCode || '').trim();
    if (!start || !end || !code) {
      setProductionCompareError('Start date, end date, dan kode uniq wajib diisi.');
      return null;
    }
    return { start, end, code };
  };

  const handleApplyProductionCompare = async () => {
    const filters = resolveProductionCompareFilters();
    if (!filters) return;
    setProductionCompareCode(filters.code);
    await fetchProductionCompare(filters);
  };

  const handleExportProductionReport = async () => {
    const filters = resolveProductionCompareFilters();
    if (!filters) return;
    if (!productionReportRows.length) {
      notifyMessage('Tidak ada data komparasi untuk diekspor.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = productionReportRows.map((row) => ({
      No: row.no,
      'Tanggal Produksi': row.productionDate,
      'Uniq / Part Number': row.uniqLabel,
      'Part Name': row.itemName,
      'Qty Produksi': row.productionQty,
      'Qty Kanban Request': row.kanbanQty,
      Variance: row.diffQty,
      'Status / Keterangan': row.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Produksi');
    const safeCode = filters.code.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '');
    const filename = `Laporan_Produksi_${filters.start}_${filters.end}_${safeCode || 'ALL'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handlePrintProductionReport = () => {
    const filters = resolveProductionCompareFilters();
    if (!filters) return;
    if (!productionReportRows.length) {
      notifyMessage('Tidak ada data komparasi untuk dicetak.');
      return;
    }
    if (typeof document !== 'undefined') {
      const existingStyle = document.querySelector('style[data-report-page]');
      if (existingStyle) existingStyle.remove();
      const style = document.createElement('style');
      style.setAttribute('data-report-page', 'production');
      style.innerHTML = `
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
            margin-bottom: 25mm;
          }
        }
      `;
      document.head.appendChild(style);
    }
    if (typeof document !== 'undefined') {
      document.body.classList.add('report-print-active');
    }
    const cleanup = () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('report-print-active');
        const existingStyle = document.querySelector('style[data-report-page="production"]');
        if (existingStyle) existingStyle.remove();
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 800);
  };

  const parseReceiveScanPayload = (rawValue, itemList) => {
    const raw = String(rawValue || '').trim();
    if (!raw) return null;
    let parsed = {};
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
    }
    if (Object.keys(parsed).length === 0) {
      const tokens = raw.split(/[|;]/).map((part) => part.trim()).filter(Boolean);
      tokens.forEach((token) => {
        const splitIndex = token.indexOf(':') >= 0 ? token.indexOf(':') : token.indexOf('=');
        if (splitIndex === -1) return;
        const key = token.slice(0, splitIndex).trim().toLowerCase();
        const value = token.slice(splitIndex + 1).trim();
        if (key) parsed[key] = value;
      });
    }
    const resolveKey = (keys) => keys.find((key) => parsed[key] !== undefined && parsed[key] !== null);
    const itemKey = resolveKey(['item', 'item_code', 'code', 'uniq', 'part', 'part_no']);
    const dnKey = resolveKey(['dn', 'dn_number', 'order', 'order_number']);
    const qtyKey = resolveKey(['qty', 'snp', 'pack', 'quantity']);
    let itemCode = itemKey ? String(parsed[itemKey] || '').trim() : '';
    const dnNumber = dnKey ? String(parsed[dnKey] || '').trim() : '';
    let qty = qtyKey ? Number(parsed[qtyKey]) : NaN;

    if (!itemCode && Array.isArray(itemList)) {
      const direct = itemList.find((item) => String(item.itemCode || '') === raw);
      if (direct) itemCode = direct.itemCode;
      if (!itemCode) {
        const matches = itemList.filter((item) => raw.includes(String(item.itemCode || '')));
        if (matches.length === 1) itemCode = matches[0].itemCode;
      }
    }

    if (!Number.isFinite(qty)) qty = NaN;
    return { raw, itemCode, dnNumber, qty };
  };

  const handleToggleDnSelection = (id) => {
    setReceiveSelectedDnIds((prev) => (
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    ));
  };

  const handleLoadReceiveItems = async () => {
    if (!receiveSelectedDnIds.length) {
      setReceiveError('Pilih minimal satu DN.');
      return;
    }
    setReceiveLoading(true);
    setReceiveError('');
    setReceiveScanError('');
    try {
      const query = receiveSelectedDnIds.join(',');
      const rows = await apiFetch(`/api/delivery-notes/items?dnIds=${encodeURIComponent(query)}`);
      const mapped = (Array.isArray(rows) ? rows : []).map((row) => {
        const itemCode = row.item_code || '-';
        const masterItem = masterItemsByCode?.get(itemCode);
        const packQtyRaw = Number(row.pack_qty || 0);
        const lotQtyRaw = Number(kanbanSettingsByCode?.get(itemCode)?.lot_qty || 0);
        const packQty = Number.isFinite(packQtyRaw) && packQtyRaw > 0
          ? packQtyRaw
          : (Number.isFinite(lotQtyRaw) && lotQtyRaw > 0 ? lotQtyRaw : 0);
        const originalDocQty = Number(row.request_qty || 0);
        const alreadyReceived = Number(row.received_total || row.receivedTotal || 0);
        const docQty = Math.max(0, originalDocQty - alreadyReceived);
        return {
          key: `${row.dn_id}-${itemCode}`,
          originDnId: row.dn_id,
          dnNumber: row.dn_number || '-',
          itemCode,
          partNo: row.part_no || masterItem?.part_no || masterItem?.partNo || '-',
          partName: row.item_name || masterItem?.name || '-',
          docQty,
          originalDocQty,
          alreadyReceived,
          receivedQty: 0,
          snp: packQty,
          unit: row.unit || masterItem?.unit || '-',
        };
      }).filter((row) => Number(row.docQty || 0) > 0);
      setReceiveItems(mapped);
      setReceiveScanLogs([]);
      receiveScanSetRef.current = new Set();
    } catch (error) {
      setReceiveError(error.message || 'Gagal memuat item DN.');
      setReceiveItems([]);
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleReceiveScan = () => {
    if (!receiveItems.length) {
      setReceiveScanError('Load item DN terlebih dahulu.');
      return;
    }
    const lines = receiveScanInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    let latestError = '';
    const nextLogs = [...receiveScanLogs];
    let updatedItems = [...receiveItems];
    lines.forEach((raw) => {
      const parsed = parseReceiveScanPayload(raw, updatedItems);
      if (!parsed) return;
      if (!parsed.itemCode) {
        latestError = 'Item QR tidak ditemukan.';
        return;
      }
      let itemIndex = -1;
      if (parsed.dnNumber) {
        itemIndex = updatedItems.findIndex((item) => item.itemCode === parsed.itemCode && item.dnNumber === parsed.dnNumber);
        if (itemIndex === -1) {
          latestError = `DN ${parsed.dnNumber} / Item ${parsed.itemCode} tidak ditemukan.`;
          return;
        }
      } else {
        const matches = updatedItems.filter((item) => item.itemCode === parsed.itemCode);
        if (matches.length !== 1) {
          latestError = `Item ${parsed.itemCode} ada di beberapa DN. QR harus punya nomor DN.`;
          return;
        }
        itemIndex = updatedItems.findIndex((item) => item.itemCode === parsed.itemCode);
      }
      if (receiveScanSetRef.current.has(parsed.raw)) {
        latestError = 'QR sudah pernah discan.';
        return;
      }
      const item = updatedItems[itemIndex];
      const qtyValue = Number.isFinite(parsed.qty) && parsed.qty > 0 ? parsed.qty : Number(item.snp || 0);
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        latestError = `SNP tidak valid untuk ${parsed.itemCode}.`;
        return;
      }
      const nextQty = Number(item.receivedQty || 0) + qtyValue;
      updatedItems[itemIndex] = { ...item, receivedQty: nextQty };
      receiveScanSetRef.current.add(parsed.raw);
      nextLogs.push({
        qrValue: parsed.raw,
        itemCode: parsed.itemCode,
        originDnId: item.originDnId,
        dnNumber: item.dnNumber,
        qty: qtyValue,
      });
      setReceiveFlashKey(item.key || `${item.originDnId}-${item.itemCode}`);
      setTimeout(() => {
        setReceiveFlashKey('');
      }, 800);
    });
    setReceiveItems(updatedItems);
    setReceiveScanLogs(nextLogs);
    setReceiveScanInput('');
    setReceiveScanError(latestError);
  };

  const handleReceiveResetItem = (itemKey) => {
    setReceiveItems((prev) => prev.map((item) => (
      item.key === itemKey ? { ...item, receivedQty: 0 } : item
    )));
    setReceiveScanLogs((prev) => {
      const next = prev.filter((log) => `${log.originDnId}-${log.itemCode}` !== itemKey);
      receiveScanSetRef.current = new Set(next.map((log) => log.qrValue));
      return next;
    });
  };

  const receiveDoFormatValidation = validateReceiveDoNumberFormat(receiveDoNumber);
  const receiveDoSubmitBlocked = ['invalid', 'block', 'checking'].includes(receiveDoCheck.status)
    || !receiveDoFormatValidation.valid;
  const receiveDoBadge = (() => {
    if (!normalizeReceiveDoNumber(receiveDoNumber)) return null;
    if (receiveDoCheck.status === 'ok') {
      return {
        label: 'OK',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }
    if (receiveDoCheck.status === 'warn') {
      return {
        label: 'WARN',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    if (['block', 'invalid', 'error'].includes(receiveDoCheck.status)) {
      return {
        label: 'BLOCK',
        className: 'border-red-200 bg-red-50 text-red-700',
      };
    }
    if (receiveDoCheck.status === 'checking') {
      return {
        label: 'CHECK',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      };
    }
    return null;
  })();

  const handleConfirmReceive = async () => {
    if (!receiveItems.length) return;
    if (receiveSubmitting) return;
    if (isStockOpnameLocked) {
      setReceiveError('Selesaikan dulu Stock Opname!');
      return;
    }
    if (!receiveSupplier) {
      setReceiveError('Supplier wajib diisi.');
      return;
    }
    if (!String(receiveTruckNo || '').trim()) {
      setReceiveError('No Polisi wajib diisi.');
      return;
    }
    if (!receiveSelectedDnIds.length) {
      setReceiveError('DN belum dipilih.');
      return;
    }
    if (!receiveDoFormatValidation.valid) {
      setReceiveError(receiveDoFormatValidation.reason || 'Nomor SJ / DO wajib diisi.');
      return;
    }
    if (receiveDoCheck.status === 'checking') {
      setReceiveError('Pemeriksaan duplikasi SJ masih berjalan.');
      return;
    }
    if (receiveDoCheck.status === 'block') {
      setReceiveError(receiveDoCheck.message || 'Nomor SJ / DO sudah dipakai.');
      return;
    }
    const payloadItems = receiveItems.map((item) => ({
      originDnId: item.originDnId,
      itemCode: item.itemCode,
      receivedQty: Number(item.receivedQty || 0),
    }));
    const hasOver = receiveItems.some((item) => Number(item.receivedQty || 0) > Number(item.docQty || 0));
    const hasShort = receiveItems.some((item) => Number(item.receivedQty || 0) < Number(item.docQty || 0));
    const totalReceived = receiveItems.reduce((acc, item) => acc + Number(item.receivedQty || 0), 0);
    if (!totalReceived) {
      setReceiveError('Qty terima masih 0.');
      return;
    }
    if (hasOver) {
      const ok = window.confirm('Over Delivery! Qty terima melebihi DN. Lanjut?');
      if (!ok) return;
    }
    if (hasShort) {
      const ok = window.confirm('Penerimaan Partial (kurang). Lanjut?');
      if (!ok) return;
    }
    if (receiveDoCheck.status === 'warn') {
      const ok = window.confirm(receiveDoCheck.message || 'Nomor SJ ini sudah pernah muncul. Lanjutkan sebagai pengiriman gabungan?');
      if (!ok) return;
    }
    setReceiveSubmitting(true);
    setReceiveError('');
    try {
      await apiFetch('/api/receive-notes/merge', {
        method: 'POST',
        body: JSON.stringify({
          supplier: receiveSupplier,
          doNumber: normalizeReceiveDoNumber(receiveDoNumber),
          dnIds: receiveSelectedDnIds,
          items: payloadItems,
          scans: receiveScanLogs,
          truckNo: receiveTruckNo,
          driverName: receiveDriverName,
        }),
      });
      await fetchReceiveNotes?.();
      await fetchDeliveryNotes?.();
      await fetchOpenDns(receiveSupplier);
      resetReceiveState();
      setReceiveSelectedDnIds([]);
      alert('Receiving berhasil disimpan.');
    } catch (error) {
      setReceiveError(error.message || 'Gagal menyimpan receiving.');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleDeleteReceiveNote = async (rn) => {
    if (!rn) return;
    const label = rn.rn_number || rn.id || '';
    const ok = window.confirm(`Hapus RN ${label}?`);
    if (!ok) return;
    try {
      if (rn.rn_type === 'header' && rn.rn_header_id) {
        await apiFetch(`/api/receive-note-headers/${rn.rn_header_id}`, { method: 'DELETE' });
      } else {
        const ids = Array.isArray(rn.item_ids) && rn.item_ids.length > 0
          ? rn.item_ids
          : (rn.id ? [rn.id] : []);
        for (const id of ids) {
          await apiFetch(`/api/receive-notes/${id}`, { method: 'DELETE' });
        }
      }
      await fetchReceiveNotes?.();
      await fetchDeliveryNotes?.();
      alert('RN berhasil dihapus.');
    } catch (error) {
      alert(error.message || 'Gagal menghapus RN.');
    }
  };

  const openRnDetailModal = (rn) => {
    if (!rn) return;
    setSelectedRnDetail(rn);
    setShowRnDetailModal(true);
  };

  const closeRnDetailModal = () => {
    setShowRnDetailModal(false);
    setSelectedRnDetail(null);
  };

  const buildRnPrintPayload = (rn) => {
    if (!rn) return null;
    const receivedDate = rn.received_at ? new Date(rn.received_at) : null;
    const items = (rn.items || []).filter((row) => Number(row.received_qty ?? 0) > 0);
    const dnReference = rn.dn_reference || rn.dn_number || rn.dnNumber || '-';
    return {
      rnNumber: rn.rn_number || '-',
      receivedDateLabel: receivedDate ? receivedDate.toLocaleDateString('id-ID') : '-',
      supplierName: rn.supplier || '-',
      truckPlate: rn.truck_no || rn.truck_plate || rn.plate_no || '-',
      driverName: rn.driver_name || '-',
      dnReference,
      items,
    };
  };

  const openRnPrintModal = (rn) => {
    const payload = buildRnPrintPayload(rn);
    setRnPrintPayload(payload);
    setShowRnPrintModal(true);
  };

  const closeRnPrintModal = () => {
    setShowRnPrintModal(false);
    setRnPrintPayload(null);
  };

  const renderRnPrintDocument = () => {
    if (!rnPrintPayload) {
      return <div className="text-xs text-slate-400">Data tidak tersedia.</div>;
    }
    return (
      <div className="mx-auto bg-white text-black print-body rn-print-page" style={{ width: '100%', maxWidth: '210mm' }}>
        <div className="rn-header">
          <div className="rn-brand">
            <img src={logoPrl} alt="MRP" className="rn-logo" />
            <div>
              <div className="rn-company">PT. MATRA RODA PIRANTI</div>
              <div className="rn-dept">Department Logistik (PPIC)</div>
            </div>
          </div>
          <div className="rn-doc">
            <div className="rn-title">GOODS RECEIPT NOTE</div>
            <div className="rn-number">{rnPrintPayload.rnNumber}</div>
          </div>
        </div>

        <div className="rn-info-grid">
          <div className="rn-info-block">
            <div className="rn-info-row">
              <div className="rn-info-label">SUPPLIER</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.supplierName}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">NO POLISI</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.truckPlate}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">NAMA SOPIR</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.driverName}</div>
            </div>
          </div>
          <div className="rn-info-block">
            <div className="rn-info-row">
              <div className="rn-info-label">NO RN</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value rn-info-emphasis">{rnPrintPayload.rnNumber}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">TANGGAL TERIMA</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.receivedDateLabel}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">DN REFERENCE</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.dnReference || '-'}</div>
            </div>
          </div>
        </div>

        <table className="w-full rn-print-table">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '50%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>UNIQ</th>
              <th>PART NUMBER /<br />PART NAME</th>
              <th>Unit</th>
              <th>Actual Qty</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {rnPrintPayload.items.map((row, index) => {
              const partNo = row.part_no || row.item_code || row.partNo || '-';
              const partName = row.part_name || row.item_name || row.partName || '-';
              const unitLabel = row.unit || row.item_unit || row.uom || '-';
              const qtyValue = row.received_qty ?? row.actual_qty ?? 0;
              const uniqValue = row.item_code || row.uniq || partNo || '-';
              return (
                <tr key={`${row.id}-${index}`}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center rn-uniq">{uniqValue}</td>
                  <td className="rn-part-cell">
                    <div className="rn-part-no">{partNo}</div>
                    <div className="rn-part-name">{partName}</div>
                  </td>
                  <td className="text-center">{unitLabel}</td>
                  <td className="text-right">{formatDnQty0(qtyValue)}</td>
                  <td />
                </tr>
              );
            })}
            {rnPrintPayload.items.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-slate-400">Tidak ada item.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="rn-signature-grid">
          <div className="rn-signature-card">
            <div className="rn-signature-title">Diserahkan Oleh</div>
            <div className="rn-signature-space" />
            <div className="rn-signature-label">(Sopir / Ekspedisi)</div>
          </div>
          <div className="rn-signature-card">
            <div className="rn-signature-title">Dicek Oleh</div>
            <div className="rn-signature-space" />
            <div className="rn-signature-label">(QC / Checker)</div>
          </div>
          <div className="rn-signature-card">
            <div className="rn-signature-title">Diterima Oleh</div>
            <div className="rn-signature-space" />
            <div className="rn-signature-label">(Admin Gudang)</div>
          </div>
        </div>
        <div className="page-footer" />
      </div>
    );
  };

  const renderDnPrintDocument = () => {
    if (dnPrintLoading) {
      return <div className="text-xs text-slate-400">Memuat...</div>;
    }
    if (!dnPrintPayload) {
      return <div className="text-xs text-slate-400">Data tidak tersedia.</div>;
    }
    const {
      dnNumber,
      supplierName,
      dateLabel,
      deliveryDateLabel,
      deliveryAddress,
      recipientLabel,
      areaLabel,
      cycleLabel,
      timeLabel,
      ritLabel,
      companyName,
      supplierCode,
      qrValue,
      remarksText,
      items,
      totals,
    } = dnPrintPayload;

    const primaryDelivery = masterDeliveries?.[0] || null;
    const deliveryArea = masterAreas?.find((area) => area.id === primaryDelivery?.area_id) || null;
    const deliveryPlant = masterPlants?.find((plant) => plant.id === deliveryArea?.plant_id) || masterPlants?.[0] || null;
    const plantCode = deliveryPlant?.id || '-';
    const deliveryCode = primaryDelivery?.id || deliveryArea?.id || '-';
    const destinationPlant = [plantCode, deliveryCode].filter(Boolean).join(' ') || '-';
    const itemsByCode = new Map(items.map((item) => [item.uniq, item]));
    const cardRows = Array.isArray(dnPrintPayload.cards) ? dnPrintPayload.cards : [];
    const cardRowsSorted = [...cardRows].sort((a, b) => {
      const codeA = String(a.item_code || '');
      const codeB = String(b.item_code || '');
      if (codeA !== codeB) return codeA.localeCompare(codeB);
      const seqA = Number(a.card_seq || 0);
      const seqB = Number(b.card_seq || 0);
      if (seqA !== seqB) return seqA - seqB;
      return Number(a.id || 0) - Number(b.id || 0);
    });
    const cardTotalsByItem = new Map();
    cardRowsSorted.forEach((row) => {
      const itemCode = row.item_code || '';
      if (!itemCode) return;
      cardTotalsByItem.set(itemCode, (cardTotalsByItem.get(itemCode) || 0) + 1);
    });
    const cardSeqByItem = new Map();
    const cardPayloads = [];

    if (cardRowsSorted.length > 0) {
      cardRowsSorted.forEach((cardRow) => {
        const itemCode = cardRow.item_code;
        const itemRow = itemsByCode.get(itemCode) || {};
        const masterItem = masterItemsByCode?.get(itemCode);
        const masterLocation = masterLocationsById?.get(masterItem?.location_id);
        const categoryCode = masterItem?.type || masterItem?.item_type || masterItem?.category || '-';
        const slocLabel = masterLocation?.warehouse_id || masterLocation?.id || '-';
        const locationLabel = masterLocation?.fifo_lane || masterLocation?.id || '-';
        const qtyBox = Number(cardRow.card_qty || itemRow.qtyKbn || 0);
        const orderNumber = dnNumber || '-';
        const lotBatch = cardRow.lot_batch || itemRow.requestCode || dnNumber || '';
        const partNo = itemRow.partNo || masterItem?.part_no || itemCode || '-';
        const uniqueCode = itemCode || partNo || '-';
        const mainQrValue = `${partNo}|${qtyBox}|${orderNumber}|${supplierCode || ''}|${lotBatch || ''}`;
        const secondaryQrValue = cardRow.card_uid || `${dnNumber}-${uniqueCode}-${cardRow.card_seq}`;
        const nextSeq = (cardSeqByItem.get(itemCode) || 0) + 1;
        cardSeqByItem.set(itemCode, nextSeq);
        const totalCards = Number(cardRow.total_cards || 0) || cardTotalsByItem.get(itemCode) || 0;
        cardPayloads.push({
          key: `${itemCode}-${cardRow.card_seq}-${dnNumber}`,
          supplier: supplierName,
          supplierCode: supplierCode || '-',
          destinationPlant,
          dockCode: itemRow.dropZone || deliveryCode || '-',
          gateCode: deliveryCode || '-',
          categoryCode,
          itemName: itemRow.partName || masterItem?.name || itemCode || '',
          partNo,
          uniqueCode,
          qtyBox,
          areaId: itemRow.dropZone || '-',
          slocLabel,
          locationLabel,
          packing: itemRow.packing || '-',
          orderNumber,
          orderDate: dateLabel || '-',
          cycleLabel,
          deliveryDateLabel,
          timeLabel,
          ritLabel,
          seq: nextSeq,
          total: totalCards,
          lotBatch,
          mainQrValue,
          secondaryQrValue,
        });
      });
    } else {
      items.forEach((row) => {
        const perCard = Number(row.qtyKbn || 0);
        const orderUnit = Number(row.orderUnit || 0);
        if (!Number.isFinite(perCard) || perCard <= 0) return;
        const totalCards = Math.max(0, Math.ceil(orderUnit / perCard));
        const sidNumber = row.uniq || row.partNo || 'ITEM';
        const itemName = row.partName || row.partNo || '';
        const masterItem = masterItemsByCode?.get(row.uniq);
        const masterLocation = masterLocationsById?.get(masterItem?.location_id);
        const categoryCode = masterItem?.type || masterItem?.item_type || masterItem?.category || '-';
        const slocLabel = masterLocation?.warehouse_id || masterLocation?.id || '-';
        const locationLabel = masterLocation?.fifo_lane || masterLocation?.id || '-';
        Array.from({ length: totalCards }).forEach((_, idx) => {
          const seq = idx + 1;
          const remaining = orderUnit - perCard * (seq - 1);
          const qtyBox = seq === totalCards ? Math.max(remaining, 0) : perCard;
          const lotBatch = row.requestCode || dnNumber || '';
          const orderNumber = dnNumber || '-';
          const mainQrValue = `${row.partNo || sidNumber}|${qtyBox}|${orderNumber}|${supplierCode || ''}|${lotBatch || ''}`;
          const secondaryQrValue = `${dnNumber}-${sidNumber}-${String(seq).padStart(3, '0')}`;
          cardPayloads.push({
            key: `${sidNumber}-${seq}-${dnNumber}`,
            supplier: supplierName,
            supplierCode: supplierCode || '-',
            destinationPlant,
            dockCode: row.dropZone || deliveryCode || '-',
            gateCode: deliveryCode || '-',
            categoryCode,
            itemName,
            partNo: row.partNo || '-',
            uniqueCode: sidNumber,
            qtyBox,
            areaId: row.dropZone || '-',
            slocLabel,
            locationLabel,
            packing: row.packing || '-',
            orderNumber,
            orderDate: dateLabel || '-',
            cycleLabel,
            deliveryDateLabel,
            timeLabel,
            ritLabel,
            seq,
            total: totalCards,
            lotBatch,
            mainQrValue,
            secondaryQrValue,
          });
        });
      });
    }

    const cardsPerPage = 4;
    const cardPages = [];
    for (let i = 0; i < cardPayloads.length; i += cardsPerPage) {
      cardPages.push(cardPayloads.slice(i, i + cardsPerPage));
    }
    const dnStatus = String(dnPrintPayload?.sourceDn?.status || '').toLowerCase();
    const canPrintCards = ['open', 'in_transit', 'partial', 'published'].includes(dnStatus);
    const printDateLabel = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="mx-auto bg-white text-slate-900 print-body dn-print-page" style={{ width: '100%', maxWidth: '210mm' }}>
        <div style={{ padding: 0 }}>
        <table className="w-full border border-slate-900 dn-print-table">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={9} className="border-b border-slate-900 p-0">
                <div className="dn-header-container">
                  <div className="dn-header-top">
                    <div className="dn-brand">
                      <img src={logoPrl} alt="MRP Logo" className="dn-logo" />
                      <div className="dn-brand-text">
                        <div className="dn-company">PT. MATRA RODA PIRANTI</div>
                        <div className="dn-dept">Departement Logistik (PPIC)</div>
                      </div>
                    </div>
                    <div className="dn-doc">
                      <div className="dn-title">DELIVERY NOTE</div>
                      <div className="dn-number">{dnNumber}</div>
                      <div className="dn-print-date">PRINT DATE : {printDateLabel}</div>
                    </div>
                  </div>
                  <div className="dn-header-info">
                    <div className="dn-info-block">
                      <div className="dn-info-row">
                        <div className="dn-info-label">SUPPLIER</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value break-words">{supplierName}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">DATE</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value">{dateLabel}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">DEL. TO</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value break-words">{deliveryAddress}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">RECIPIENT</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value break-words">{recipientLabel || '-'}</div>
                      </div>
                    </div>
                    <div className="dn-qr-block">
                      <div className="dn-qr">
                        <QRCodeSVG value={qrValue || dnNumber || ''} size={86} />
                      </div>
                    </div>
                    <div className="dn-info-block">
                      <div className="dn-info-row">
                        <div className="dn-info-label">CYCLE</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value">{cycleLabel || '-'}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">DELIVERY</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value">{deliveryDateLabel || '-'}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">RIT/TIME</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value">{ritLabel || '-'} / {timeLabel || '-'}</div>
                      </div>
                      <div className="dn-info-row">
                        <div className="dn-info-label">AREA</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value break-words">{areaLabel || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-1 text-center">NO.</th>
              <th className="border border-slate-900 p-1 text-center">UNIQ</th>
              <th className="border border-slate-900 p-1 text-left dn-col-part">
                PART NUMBER /<br />PART NAME
              </th>
              <th className="border border-slate-900 p-1 text-center">PACKING</th>
              <th className="border border-slate-900 p-1 text-center">DROP ZONE</th>
              <th className="border border-slate-900 p-1 text-center">UNIT</th>
              <th className="border border-slate-900 p-1 text-right">SNP</th>
              <th className="border border-slate-900 p-1 text-right">ORDER KBN</th>
              <th className="border border-slate-900 p-1 text-right">ORDER UNIT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={`${row.uniq}-${row.no}`}>
                <td className="border border-slate-900 p-1 text-center">{row.no}</td>
                <td className="border border-slate-900 p-1 text-center font-semibold">{row.uniq}</td>
                <td className="border border-slate-900 p-1 dn-part-cell">
                  <div className="dn-part-no">{row.partNo}</div>
                  <div className="dn-part-name">{row.partName}</div>
                </td>
                <td className="border border-slate-900 p-1 text-center">{row.packing}</td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty(row.qtyKbn)}</td>
                <td className="border border-slate-900 p-1 text-center">{row.unit}</td>
                <td className="border border-slate-900 p-1 text-center">{row.dropZone || '-'}</td>
                <td className="border border-slate-900 p-1 text-right">
                  {row.qtyKbn ? formatDnQty(row.orderKbn) : '-'}
                </td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty0(row.orderUnit)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="9" className="border border-slate-900 p-2 text-center text-slate-500">
                  Tidak ada item.
                </td>
              </tr>
            )}
            {items.length > 0 && (
              <tr className="font-semibold">
                <td colSpan="7" className="border border-slate-900 p-1 text-right">Total</td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty(totals.orderKbn)}</td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty0(totals.orderUnit)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="page-footer" id="pageFooter" />

        <div className="border border-slate-900 border-t-0 p-2 text-[10px]" style={{ minHeight: '50px' }}>
          <div className="font-semibold mb-1">Remarks :</div>
          <div className="whitespace-pre-wrap break-words">{remarksText || ''}</div>
        </div>

        <div className="mt-3 text-center text-[10px] font-semibold">{companyName}</div>
        <div className="mt-2 grid grid-cols-[1fr_1.4fr_1fr] gap-3 text-[9px]">
          <div className="border border-slate-900">
            <div className="border-b border-slate-900 text-center font-semibold py-1">SECURITY</div>
            <div className="h-16 border-b border-slate-900" />
            <div className="px-2 py-1">Date:</div>
          </div>
          <div className="border border-slate-900">
            <div className="grid grid-cols-2 border-b border-slate-900 text-center font-semibold">
              <div className="border-r border-slate-900 py-1">CONTROL MAN</div>
              <div className="py-1">RECEIVED</div>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="h-16 border-r border-slate-900" />
              <div className="h-16" />
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r border-slate-900 px-2 py-1">Date:</div>
              <div className="px-2 py-1">Date:</div>
        </div>
      </div>
          <div className="border border-slate-900">
            <div className="text-center font-semibold py-1">SUPPLIER</div>
            <div className="grid grid-cols-2 border-t border-b border-slate-900 text-center font-semibold">
              <div className="border-r border-slate-900 py-1">APPROVED</div>
              <div className="py-1">PREPARED</div>
            </div>
            <div className="grid grid-cols-2 border-b border-slate-900">
              <div className="h-16 border-r border-slate-900" />
              <div className="h-16" />
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r border-slate-900 px-2 py-1">Date:</div>
              <div className="px-2 py-1">Date:</div>
            </div>
          </div>
        </div>
        </div>

        {canPrintCards && cardPages.map((page, pageIndex) => (
          <div
            key={`dn-cards-${pageIndex}`}
            style={{
              width: '297mm',
              minHeight: '210mm',
              padding: '6mm',
              pageBreakBefore: pageIndex === 0 ? 'always' : 'always',
            }}
          >
            <div className="text-xs font-semibold mb-2">KANBAN CARDS - {dnNumber}</div>
            <div className="grid grid-cols-2 grid-rows-2 gap-[4mm]">
              {page.map((card) => {
                const dockGateLabel = card.dockCode && card.gateCode && card.dockCode !== card.gateCode
                  ? `${card.dockCode} / ${card.gateCode}`
                  : (card.dockCode || card.gateCode || '-');
                const deliveryTimeLabel = [card.deliveryDateLabel, card.timeLabel].filter(Boolean).join(' ');
                const partNoSize = String(card.partNo || '').length > 16 ? '36pt' : '48pt';
                const qtySize = String(formatDnQty(card.qtyBox) || '').length > 4 ? '40pt' : '48pt';
                return (
                  <div
                    key={card.key}
                    className="bg-white text-black font-sans border-2 border-black"
                    style={{ width: '148mm', height: '105mm' }}
                  >
                    <div className="grid grid-rows-[18mm_1fr_8mm] h-full">
                      <div className="grid grid-cols-[1fr_1fr_32mm] border-b-2 border-black">
                        <div className="border-r-2 border-black flex items-center justify-center text-[12pt] font-bold">
                          {card.destinationPlant || '-'}
                        </div>
                        <div className="border-r-2 border-black flex flex-col items-center justify-center leading-tight">
                          <div className="text-[10pt] font-bold">E-KANBAN CARD</div>
                          <div className="text-[8pt] font-semibold">PT MRP</div>
                        </div>
                        <div className="flex items-center justify-center">
                          <QRCodeCanvas value={card.secondaryQrValue} size={48} />
                        </div>
                      </div>

                      <div className="grid grid-cols-[14mm_1fr_42mm] border-b-2 border-black">
                        <div className="border-r-2 border-black flex flex-col items-center justify-between py-1">
                          <div
                            className="text-[7pt] font-bold"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          >
                            SUPPLIER
                          </div>
                          <div
                            className="text-[7pt] font-bold"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          >
                            {card.supplier}
                          </div>
                        </div>

                        <div className="grid grid-rows-[1fr_1fr_1fr] border-r-2 border-black">
                          <div className="grid grid-cols-[1fr_42mm] border-b border-black">
                            <div className="p-1">
                              <div className="text-[7pt] font-semibold uppercase">PART NO</div>
                              <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: partNoSize }}>
                                {card.partNo}
                              </div>
                              <div className="text-[8pt] font-semibold">{card.itemName}</div>
                            </div>
                            <div className="border-l border-black p-1 text-center">
                              <div className="text-[7pt] font-semibold uppercase">UNIQUE</div>
                              <div className="text-[16pt] font-bold leading-tight">{card.uniqueCode}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-[1fr_1fr] border-b border-black">
                            <div className="p-1">
                              <div className="text-[7pt] font-semibold uppercase">QTY</div>
                              <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: qtySize }}>
                                {formatDnQty(card.qtyBox)}
                              </div>
                            </div>
                            <div className="border-l border-black p-1">
                              <div className="text-[7pt] font-semibold uppercase">ORDER NO</div>
                              <div className="text-[11pt] font-bold break-all">{card.orderNumber}</div>
                              <div className="text-[7pt] font-semibold uppercase mt-1">LOCATION</div>
                              <div className="text-[9pt] font-semibold">{card.slocLabel || card.locationLabel}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2">
                            <div className="border-r border-black p-1">
                              <div className="text-[7pt] font-semibold uppercase">DELIVERY TIME</div>
                              <div className="text-[9pt] font-bold">{deliveryTimeLabel || '-'}</div>
                            </div>
                            <div className="p-1">
                              <div className="text-[7pt] font-semibold uppercase">ORDER DATE</div>
                              <div className="text-[9pt] font-bold">{card.orderDate}</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-rows-[1fr_1fr_2fr]">
                          <div className="border-b border-black p-1 text-center">
                            <div className="text-[7pt] font-semibold uppercase">CYCLE</div>
                            <div className="text-[14pt] font-bold">{card.cycleLabel}</div>
                          </div>
                          <div className="border-b border-black p-1 text-center">
                            <div className="text-[7pt] font-semibold uppercase">DOCK/GATE</div>
                            <div className="text-[12pt] font-bold">{dockGateLabel}</div>
                          </div>
                          <div className="p-1 flex flex-col items-center justify-center">
                            <div className="text-[7pt] font-semibold uppercase">QR</div>
                            <QRCodeCanvas value={card.mainQrValue} size={90} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_1fr]">
                        <div className="border-r-2 border-black p-1 text-[9pt] font-bold">
                          CARD {String(card.seq).padStart(2, '0')} OF {card.total}
                        </div>
                        <div className="p-1 text-[8pt] font-semibold text-right">
                          LOT {card.lotBatch || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const [masterToolsOpen, setMasterToolsOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const masterToolsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!(event.target instanceof Element)) return;
      if (masterToolsRef.current && !masterToolsRef.current.contains(event.target)) {
        setMasterToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredKanbanSettings = useMemo(() => {
    const query = masterSearch.trim().toLowerCase();
    if (!query) return kanbanSettings;
    return kanbanSettings.filter((row) => {
      const itemCode = String(row.item_code || '').toLowerCase();
      const itemName = String(row.item_name || '').toLowerCase();
      const supplier = String(row.default_supplier || '').toLowerCase();
      const category = String(row.item_type || '').toLowerCase();
      const dropZone = String(row.drop_zone || '').toLowerCase();
      return itemCode.includes(query)
        || itemName.includes(query)
        || supplier.includes(query)
        || category.includes(query)
        || dropZone.includes(query);
    });
  }, [kanbanSettings, masterSearch]);

  const [requestFilterOpen, setRequestFilterOpen] = useState(null);
  const [requestFilterDrafts, setRequestFilterDrafts] = useState({
    requestId: '',
    date: '',
    kanbanId: '',
    item: '',
    trigger: '',
    onHand: '',
    suggested: '',
    status: '',
  });
  const [showDnBatchModal, setShowDnBatchModal] = useState(false);
  const [dnBatchGroups, setDnBatchGroups] = useState([]);
  const [dnBatchRemarks, setDnBatchRemarks] = useState({});
  const [dnBatchWarnings, setDnBatchWarnings] = useState({ missingSupplier: [], invalidRole: [] });

  const openRequestFilter = (key) => {
    setRequestFilterOpen((prev) => (prev === key ? null : key));
    setRequestFilterDrafts((prev) => ({
      ...prev,
      [key]: kanbanRequestFilters?.[key] || '',
    }));
  };

  const applyRequestFilter = (key) => {
    setKanbanRequestFilters((prev) => ({
      ...prev,
      [key]: requestFilterDrafts[key] || '',
    }));
    setRequestFilterOpen(null);
  };

  const clearRequestFilter = (key) => {
    setKanbanRequestFilters((prev) => ({ ...prev, [key]: '' }));
    setRequestFilterDrafts((prev) => ({ ...prev, [key]: '' }));
    setRequestFilterOpen(null);
  };

  const isRequestFilterActive = (key) => String(kanbanRequestFilters?.[key] || '').trim() !== '';

  const renderFilterHeader = (label, key, align = 'left') => (
    <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      <span>{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => openRequestFilter(key)}
          className="p-0.5 rounded hover:bg-slate-200"
          aria-label={`Filter ${label}`}
        >
          <Filter size={12} className={isRequestFilterActive(key) ? 'text-blue-600' : 'text-slate-400'} />
        </button>
        {requestFilterOpen === key && (
          <div className="absolute right-0 mt-1 w-44 bg-white border rounded shadow-lg p-2 z-20">
            <div className="text-[10px] text-slate-500 mb-1">{label}</div>
            <input
              className="w-full border rounded px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={`Filter ${label}`}
              value={requestFilterDrafts[key] || ''}
              onChange={(e) => setRequestFilterDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyRequestFilter(key);
                }
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => clearRequestFilter(key)}
                className="px-2 py-1 text-[10px] text-slate-600 border rounded hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => applyRequestFilter(key)}
                className="px-2 py-1 text-[10px] text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const buildDnBatchGroups = () => {
    const missingSupplier = [];
    const invalidRole = [];
    const groupMap = new Map();
    const eligibleRows = selectedRequestIds
      .map((id) => kanbanRequests.find((row) => row.id === id))
      .filter((row) => row && isRequestSelectable(row));
    eligibleRows.forEach((row) => {
      const setting = kanbanSettingsByCode.get(row.item_code);
      const supplierKey = String(setting?.default_supplier || '').trim();
      if (!supplierKey) {
        missingSupplier.push(row.item_code);
        return;
      }
      const vendor = masterVendors.find((v) =>
        String(v.id).toLowerCase() === supplierKey.toLowerCase()
        || String(v.name || '').toLowerCase() === supplierKey.toLowerCase(),
      );
      const vendorRole = String(vendor?.role || '').trim().toLowerCase();
      if (vendorRole && vendorRole !== 'delivery note') {
        invalidRole.push(row.item_code);
        return;
      }
      const supplierLabel = vendor?.name || supplierKey;
      if (!groupMap.has(supplierKey)) {
        groupMap.set(supplierKey, { supplierKey, supplierLabel, ids: [] });
      }
      groupMap.get(supplierKey).ids.push(row.id);
    });
    const groups = Array.from(groupMap.values()).map((group) => ({
      ...group,
      count: group.ids.length,
    }));
    return { groups, missingSupplier, invalidRole };
  };

  const openDnBatchModal = () => {
    const { groups, missingSupplier, invalidRole } = buildDnBatchGroups();
    if (groups.length === 0) {
      alert('Tidak ada request valid untuk dibuat DN. Pastikan status masih Pending/Approved dan supplier terisi.');
      return;
    }
    const initialRemarks = {};
    groups.forEach((group) => {
      initialRemarks[group.supplierKey] = dnBatchRemarks[group.supplierKey] || '';
    });
    setDnBatchWarnings({ missingSupplier, invalidRole });
    setDnBatchGroups(groups);
    setDnBatchRemarks(initialRemarks);
    setShowDnBatchModal(true);
  };

  return (
    <>
            {/* Kanban Board */}
            {mainTab === 'kanban' && (
              <>
                <div className={`space-y-4 ${(showDnPrintModal || showRnPrintModal) ? 'kanban-print-host' : ''}`}>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {kanbanView === 'master' ? 'Setup Master Kanban' : 'Kanban Board'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {kanbanView === 'master'
                      ? 'Konfigurasi parameter kanban untuk material dan layanan subcon.'
                      : 'Pantau alur request, DN, receiving, dan kanban kosong.'}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setKanbanView('master')}
                    className={`px-3 py-1.5 rounded border ${kanbanView === 'master' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600'}`}
                  >
                    Master Kanban
                  </button>
                  <button
                    onClick={() => setKanbanView('board')}
                    className={`px-3 py-1.5 rounded border ${kanbanView === 'board' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
                  >
                    Kanban Board
                  </button>
                </div>
              </div>

              {kanbanError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={16} /> {kanbanError}
                </div>
              )}

              {kanbanView === 'master' && (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="text-sm font-semibold">Konfigurasi Kanban</div>
                      <div className="text-xs text-slate-400">
                        Total: {filteredKanbanSettings.length} / {kanbanSettings.length} setup
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-white text-xs">
                        <Search size={14} className="text-slate-400" />
                        <input
                          className="outline-none text-xs w-56"
                          placeholder="Cari item, supplier, category..."
                          value={masterSearch}
                          onChange={(e) => setMasterSearch(e.target.value)}
                        />
                      </div>
                      <div className="relative" ref={masterToolsRef}>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
                          onClick={() => setMasterToolsOpen((prev) => !prev)}
                        >
                          <Download size={14} /> Ekspor / Template / Import <ChevronDown size={12} />
                        </button>
                        {masterToolsOpen && (
                          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-20 text-left text-xs overflow-hidden">
                            <button
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                              onClick={async () => {
                                if (!canImportExport) { alert("Anda tidak memiliki akses export/import."); return; }
                                const XLSX = await ensureXlsx();
                                if (!XLSX) return;
                                const rows = kanbanSettings.map((row) => ({
                                  "Item Code": row.item_code,
                                  "Item Name": row.item_name || '',
                                  "Category": row.item_type || '',
                                  "Min Qty": row.min_qty,
                                  "Max Qty": row.max_qty,
                                  "Lot Qty": row.lot_qty,
                                  "Lead Time Days": row.lead_time_days,
                                  "Default Supplier": row.default_supplier || '',
                                  "Drop Zone": row.drop_zone || '',
                                  "Active": row.active ? 'Yes' : 'No',
                                }));
                                const ws = XLSX.utils.json_to_sheet(rows);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "Kanban Settings");
                                XLSX.writeFile(wb, "Kanban_Settings.xlsx");
                                setMasterToolsOpen(false);
                              }}
                            >
                              <Download size={14} /> Ekspor
                            </button>
                            <button
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                              onClick={async () => {
                                if (!canImportExport) { alert("Anda tidak memiliki akses export/import."); return; }
                                const XLSX = await ensureXlsx();
                                if (!XLSX) return;
                                const ws = XLSX.utils.json_to_sheet([{
                                  "Item Code": "",
                                  "Item Name": "",
                                  "Category": "",
                                  "Min Qty": "",
                                  "Max Qty": "",
                                  "Lot Qty": "",
                                  "Lead Time Days": "",
                                  "Default Supplier": "",
                                  "Drop Zone": "",
                                  "Active": "Yes",
                                }]);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "Template");
                                XLSX.writeFile(wb, "Template_Kanban_Settings.xlsx");
                                setMasterToolsOpen(false);
                              }}
                            >
                              <FileSpreadsheet size={14} /> Template
                            </button>
                            <button
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                              onClick={async () => {
                                if (!canImportExport) { alert("Anda tidak memiliki akses export/import."); return; }
                                const XLSX = await ensureXlsx();
                                if (!XLSX) return;
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.xlsx,.xls';
                                input.onchange = async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const data = await file.arrayBuffer();
                                    const wb = XLSX.read(data, { type: 'array' });
                                    const sheetName = wb.SheetNames[0];
                                    const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
                                    if (!json.length) return;
                                    const payload = json.map((row) => ({
                                      itemCode: row["Item Code"] || row["item_code"] || row["itemCode"],
                                      name: row["Item Name"] || row["item_name"] || row["itemName"],
                                      category: row["Category"] || row["item_type"] || row["itemType"],
                                      minQty: row["Min Qty"] ?? row["min_qty"] ?? row["minQty"],
                                      maxQty: row["Max Qty"] ?? row["max_qty"] ?? row["maxQty"],
                                      lotQty: row["Lot Qty"] ?? row["lot_qty"] ?? row["lotQty"],
                                      leadTimeDays: row["Lead Time Days"] ?? row["lead_time_days"] ?? row["leadTimeDays"],
                                      defaultSupplier: row["Default Supplier"] || row["default_supplier"] || row["defaultSupplier"],
                                      dropZone: row["Drop Zone"] || row["drop_zone"] || row["dropZone"] || row["line_code"] || row["lineCode"],
                                      active: String(row["Active"] ?? row["active"] ?? "Yes").toLowerCase() !== 'no',
                                    })).filter((row) => row.itemCode);
                                    for (const row of payload) {
                                      await apiFetch('/api/kanban/settings', {
                                        method: 'POST',
                                        body: JSON.stringify(row),
                                      });
                                    }
                                    await fetchKanbanSettings();
                                    alert('Import kanban settings selesai.');
                                  } catch (error) {
                                    alert(`Import gagal: ${error.message || 'Unknown error'}`);
                                  }
                                };
                                input.click();
                                setMasterToolsOpen(false);
                              }}
                            >
                              <FileUp size={14} /> Impor
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded flex items-center gap-2"
                        onClick={() => {
                          setShowKanbanEdit(true);
                          setKanbanEditMode('new');
                          setKanbanCategory('raw');
                          setKanbanSettingsForm({
                            itemCode: '',
                            minQty: '',
                            maxQty: '',
                            lotQty: '',
                            leadTimeDays: '',
                            defaultSupplier: '',
                            dropZone: '',
                            active: true,
                          });
                        }}
                      >
                        <Plus size={14} /> Kanban Baru
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {filteredKanbanSettings.map((row) => (
                      <div key={row.item_code} className="border rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">{buildKanbanId(row.item_code, row.item_type)}</div>
                            <div className="text-xs text-slate-500">{row.item_code} - {row.item_name || '-'}</div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-full border ${row.active ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {row.active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200">
                              {getCategoryLabel(row.item_type)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Drop Zone</div>
                            <div className="font-semibold text-slate-700">{row.drop_zone || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Supplier</div>
                            <div className="font-semibold text-slate-700">{row.default_supplier || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Quantities</div>
                            <div className="font-semibold text-slate-700">
                              {row.lot_qty} / Min: {row.min_qty} / Max: {row.max_qty}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Cards</div>
                            <div className="font-semibold text-slate-700">{getKanbanCardsLabel(row)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                          onClick={() => {
                            setShowKanbanEdit(true);
                            setKanbanEditMode('edit');
                            setKanbanCategory('raw');
                            setKanbanSettingsForm({
                              itemCode: row.item_code,
                              minQty: String(row.min_qty ?? ''),
                              maxQty: String(row.max_qty ?? ''),
                              lotQty: String(row.lot_qty ?? ''),
                              leadTimeDays: String(row.lead_time_days ?? ''),
                              defaultSupplier: row.default_supplier || '',
                              dropZone: row.drop_zone || '',
                              active: Boolean(row.active),
                            });
                          }}
                            className="p-2 border rounded hover:bg-slate-50"
                          >
                            <Edit size={14} />
                          </button>
                          <button className="p-2 border rounded hover:bg-slate-50" title="Duplikasi (belum aktif)">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!kanbanLoading && filteredKanbanSettings.length === 0 && (
                      <div className="text-sm text-gray-400 text-center border border-dashed rounded p-6">
                        {masterSearch ? 'Tidak ada hasil pencarian.' : 'Belum ada konfigurasi kanban.'}
                      </div>
                    )}
                  </div>
                </div>
                {showKanbanEdit && (
                <div className="bg-white rounded-xl border p-4 h-fit">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Settings size={16} /> {kanbanEditMode === 'new' ? 'Setup Kanban Baru' : 'Edit Kanban'}
                    </div>
                    <button onClick={() => setShowKanbanEdit(false)} className="text-xs text-slate-500 hover:text-slate-700">Tutup</button>
                  </div>
                  <form onSubmit={handleSaveKanbanSetting} className="space-y-3 text-xs text-slate-600">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500">Informasi Dasar</div>
                      <label className="block text-[10px] uppercase text-slate-400">Category</label>
                      <select
                        className="border p-2 rounded w-full text-xs"
                        value={kanbanCategory}
                        onChange={(e) => setKanbanCategory(e.target.value)}
                      >
                        <option value="raw">Raw Material</option>
                        <option value="indirect">Indirect Material</option>
                        <option value="consumable">Consumable</option>
                        <option value="subcon">Subcon</option>
                      </select>
                      <label className="block text-[10px] uppercase text-slate-400">Item Code</label>
                      <select
                        className="border p-2 rounded w-full text-xs"
                        value={kanbanSettingsForm.itemCode}
                        onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, itemCode: e.target.value })}
                      >
                        <option value="">Pilih Item</option>
                        {items.map((it) => (
                          <option key={it.code} value={it.code}>{it.code} - {it.name}</option>
                        ))}
                      </select>
                      <label className="block text-[10px] uppercase text-slate-400">Item Name</label>
                      <input
                        className="border p-2 rounded w-full text-xs bg-slate-50"
                        value={items.find((it) => it.code === kanbanSettingsForm.itemCode)?.name || ''}
                        readOnly
                      />
                      <label className="block text-[10px] uppercase text-slate-400">Supplier/Subcon Default</label>
                      <input
                        className="border p-2 rounded w-full text-xs"
                        value={kanbanSettingsForm.defaultSupplier}
                        onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, defaultSupplier: e.target.value })}
                      />
                      <label className="block text-[10px] uppercase text-slate-400">Drop Zone / Line</label>
                      <input
                        className="border p-2 rounded w-full text-xs"
                        placeholder="Contoh: Dock 1 / Line A"
                        value={kanbanSettingsForm.dropZone}
                        onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, dropZone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500">Pengaturan Kuantitas</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Kanban Qty</label>
                          <input type="number" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.lotQty} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, lotQty: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Min Qty</label>
                          <input type="number" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.minQty} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, minQty: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Max Qty</label>
                          <input type="number" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.maxQty} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, maxQty: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">MOQ/Pack Size</label>
                          <input type="number" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.lotQty} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, lotQty: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Lead Time (days)</label>
                          <input type="number" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.leadTimeDays} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, leadTimeDays: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Status</label>
                          <select
                            className="border p-2 rounded w-full text-xs"
                            value={kanbanSettingsForm.active ? 'active' : 'inactive'}
                            onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, active: e.target.value === 'active' })}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <div className="bg-sky-50 text-sky-700 text-xs p-3 rounded-lg">
                        Perhitungan Otomatis: Jumlah Kartu = {getKanbanCardsLabel({
                          lot_qty: kanbanSettingsForm.lotQty,
                          max_qty: kanbanSettingsForm.maxQty,
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded text-xs">Simpan</button>
                      <button
                        type="button"
                        className="flex-1 border rounded text-xs"
                        onClick={() => {
                          setKanbanSettingsForm({
                            itemCode: '',
                            minQty: '',
                            maxQty: '',
                            lotQty: '',
                            leadTimeDays: '',
                            defaultSupplier: '',
                            dropZone: '',
                            active: true,
                          });
                          setKanbanCategory('raw');
                          setShowKanbanEdit(false);
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
                )}

              </div>
              )}

              {kanbanView === 'board' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 text-xs">
                  {[
                    { key: 'items', label: 'Kanban Items' },
                    { key: 'requests', label: 'Requests' },
                    { key: 'dn', label: 'DN Register' },
                    { key: 'receiving', label: 'Receiving Notes' },
                    { key: 'empty', label: 'Kanban Kosong' },
                    { key: 'scan', label: 'Scan QR' },
                    canProduction ? { key: 'production', label: 'Produksi' } : null,
                  ].filter(Boolean).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setKanbanSubTab(tab.key)}
                      className={`px-3 py-1.5 rounded ${kanbanSubTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {kanbanSubTab === 'items' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 border rounded px-3 py-2 bg-white text-xs">
                        <Search size={14} className="text-slate-400" />
                        <input
                          className="outline-none text-xs w-56"
                          placeholder="Search by item code or name..."
                          value={localKanbanSearch}
                          onChange={(e) => setLocalKanbanSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="border rounded px-3 py-2 text-xs bg-white"
                        value={kanbanCategoryFilter}
                        onChange={(e) => setKanbanCategoryFilter(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        <option value="raw">Raw Material</option>
                        <option value="indirect">Indirect Material</option>
                        <option value="consumable">Consumable</option>
                        <option value="subcon">Subcon</option>
                      </select>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => {
                            setShowKanbanEdit(true);
                            setKanbanEditMode('new');
                            setKanbanCategory('raw');
                            setKanbanSettingsForm({
                              itemCode: '',
                              minQty: '',
                              maxQty: '',
                              lotQty: '',
                              leadTimeDays: '',
                              defaultSupplier: '',
                              dropZone: '',
                              active: true,
                            });
                          }}
                          className="px-3 py-2 text-xs bg-slate-900 text-white rounded flex items-center gap-2"
                        >
                          <Plus size={14} /> New Item
                        </button>
                        <button
                          className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                          onClick={() => setShowTriggerChoiceModal(true)}
                        >
                          <ArrowDownUp size={14} /> Auto/Manual Request
                        </button>
                        <button
                          className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                          onClick={() => setShowKanbanCardModal(true)}
                        >
                          <Printer size={14} /> Print Cards
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-red-700">Andon Red</div>
                        <div className="mt-1 text-xl font-bold text-red-700">{kanbanItemAndonSummary.red}</div>
                        <div className="text-[11px] text-red-700">Overdue, stock gap, atau stock di bawah min</div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-amber-700">Andon Yellow</div>
                        <div className="mt-1 text-xl font-bold text-amber-700">{kanbanItemAndonSummary.yellow}</div>
                        <div className="text-[11px] text-amber-700">Open request atau stok mulai mepet</div>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-emerald-700">Andon Green</div>
                        <div className="mt-1 text-xl font-bold text-emerald-700">{kanbanItemAndonSummary.green}</div>
                        <div className="text-[11px] text-emerald-700">Supply aman dan request bersih</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredKanbanItems.map((row) => {
                        const masterItem = masterItemsByCode.get(row.item_code);
                        const masterLocation = masterLocationsById.get(masterItem?.location_id);
                        const stock = Number(fifoTotalsByItemCode.get(row.item_code) ?? 0);
                        const min = Number(masterItem?.safety_stock ?? 0);
                        const andon = getKanbanItemAndon(row);
                        const itemRequestHealth = kanbanRequestHealthByItem[String(row.item_code || '').trim()] || { open: 0, overdue: 0, blocked: 0, stockGap: 0 };
                        const thumbUrl = masterItem?.image_thumb_url || masterItem?.imageThumbUrl || masterItem?.image_url || masterItem?.imageUrl || '';
                        return (
                          <div key={row.item_code} className={`border rounded-xl p-4 shadow-sm ${andon.tone}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center text-[9px] text-slate-400">
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={row.item_name || row.item_code}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span>No Img</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{buildKanbanId(row.item_code, row.item_type)}</div>
                                  <div className="text-xs text-slate-500">{row.item_code}</div>
                                </div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${andon.pill}`}>
                                {andon.label}
                              </span>
                            </div>
                            <div className="mt-2 text-sm font-semibold">{row.item_name || '-'}</div>
                            <div className="text-[10px] text-slate-500">{getCategoryLabel(row.item_type)}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${andon.pill}`}>
                                {andon.note}
                              </span>
                              {itemRequestHealth.open > 0 && (
                                <span className="rounded-full border border-slate-300 bg-white/80 px-2 py-0.5 text-slate-700">
                                  Open {itemRequestHealth.open}
                                </span>
                              )}
                              {itemRequestHealth.overdue > 0 && (
                                <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-red-700">
                                  Overdue {itemRequestHealth.overdue}
                                </span>
                              )}
                              {itemRequestHealth.blocked > 0 && (
                                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-700">
                                  Blocked {itemRequestHealth.blocked}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                              <div>
                                <div className="text-[10px] uppercase text-slate-400">Location</div>
                                <div className="font-semibold text-slate-700">{masterLocation?.id || masterLocation?.name || '-'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-400">On Hand</div>
                                <div className={`font-semibold ${andon.stockTone}`}>
                                  {Number(stock).toFixed(0)} PCS
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-400">Min/Max</div>
                                <div className="font-semibold text-slate-700">{min} / {row.max_qty}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-400">Cards</div>
                                <div className="font-semibold text-slate-700">{getKanbanCardsLabel(row)}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                              <div>Supplier: {row.default_supplier || '-'}</div>
                              <div>Lead Time: {row.lead_time_days || 0} days</div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 justify-end">
                              <button onClick={() => openQrModal(row)} className="p-2 border rounded hover:bg-slate-50"><QrCode size={14} /></button>
                              <button className="p-2 border rounded hover:bg-slate-50"><BarChart3 size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                      {!kanbanLoading && filteredKanbanItems.length === 0 && (
                        <div className="text-sm text-gray-400">Tidak ada item.</div>
                      )}
                    </div>
                  </div>
                )}

                {kanbanSubTab === 'requests' && (
                  <div className="space-y-4">
                    {(() => {
                      const criticalCount = kanbanRequests.reduce((acc, row) => {
                        const minQty = Number(masterItemsByCode.get(row.item_code)?.safety_stock ?? 0);
                        const stock = Number(fifoTotalsByItemCode.get(row.item_code) ?? 0);
                        return stock < minQty ? acc + 1 : acc;
                      }, 0);
                      if (criticalCount === 0) return null;
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
                          <AlertTriangle size={18} />
                          <div>
                            <div className="font-semibold">Attention:</div>
                            <div className="text-xs">
                              {criticalCount} items have reached critical stock levels and require immediate action.
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex flex-col gap-3 mb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Kanban Request Log</div>
                            <div className="text-xs text-slate-500">Aging, overdue, dan blocked request dipantau langsung dari board.</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-3 py-1.5 text-xs border rounded bg-white"
                              value={kanbanRequestStatusFilter}
                              onChange={(e) => setKanbanRequestStatusFilter(e.target.value)}
                            >
                              {requestStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={openDnBatchModal}
                              className="px-3 py-1.5 text-xs border rounded hover:bg-slate-50 flex items-center gap-2"
                            >
                              <ArrowDownUp size={14} /> Buat DN (Batch)
                            </button>
                            <button onClick={() => setShowManualRequestModal(true)} className="px-3 py-1.5 text-xs bg-white border rounded hover:bg-slate-50 flex items-center gap-2">
                              <Plus size={14} /> Manual Request
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-wide text-amber-700">Overdue</div>
                            <div className="mt-1 text-xl font-bold text-amber-700">{kanbanRequestHealthSummary.overdue}</div>
                          </div>
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-wide text-rose-700">Blocked</div>
                            <div className="mt-1 text-xl font-bold text-rose-700">{kanbanRequestHealthSummary.blocked}</div>
                          </div>
                          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-wide text-orange-700">Stock Gap</div>
                            <div className="mt-1 text-xl font-bold text-orange-700">{kanbanRequestHealthSummary.stockGap}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {requestQuickFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setKanbanRequestQuickFilter(option.value)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                kanbanRequestQuickFilter === option.value
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                          <div className="text-xs text-slate-500">
                            Quick filter: <span className="font-semibold text-slate-700">{requestQuickFilterOptions.find((option) => option.value === kanbanRequestQuickFilter)?.label || 'Semua'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 text-slate-500">
                            <tr>
                              <th className="text-left p-2">
                                <input
                                  type="checkbox"
                                  checked={requestSelectableIds.length > 0 && requestSelectableIds.every((id) => selectedRequestIds.includes(id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRequestIds(requestSelectableIds);
                                    } else {
                                      setSelectedRequestIds([]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="text-left p-2">{renderFilterHeader('Request ID', 'requestId')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Date/Time', 'date')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Kanban ID', 'kanbanId')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Item', 'item')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Trigger', 'trigger')}</th>
                              <th className="text-right p-2">{renderFilterHeader('On Hand', 'onHand', 'right')}</th>
                              <th className="text-right p-2">{renderFilterHeader('Order Qty', 'suggested', 'right')}</th>
                              <th className="text-left p-2">Aging</th>
                              <th className="text-left p-2">Exception</th>
                              <th className="text-left p-2">{renderFilterHeader('Status', 'status')}</th>
                              <th className="text-left p-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedKanbanRequests.map((group) => {
                              const expanded = expandedRequestGroups.has(group.key);
                              const firstRow = group.rows[0];
                              const groupOnHand = Number(fifoTotalsByItemCode.get(firstRow?.item_code) ?? 0);
                              const groupTriggerLabel = firstRow?.trigger_type === 'manual' ? 'Manual' : 'Auto';
                              const groupDate = firstRow?.created_at ? new Date(firstRow.created_at).toLocaleString('id-ID') : '-';
                              const groupKanbanId = firstRow ? buildKanbanId(firstRow.item_code, firstRow.item_type) : '-';
                              const groupSelectableIds = group.rows.filter((row) => isRequestSelectable(row)).map((row) => row.id);
                              const groupSelectedCount = groupSelectableIds.filter((id) => selectedRequestIds.includes(id)).length;
                              const groupAllSelected = groupSelectableIds.length > 0 && groupSelectedCount === groupSelectableIds.length;
                              const groupSomeSelected = groupSelectedCount > 0 && !groupAllSelected;
                              const groupHasOverdue = group.rows.some((row) => getKanbanRequestHealth(row).isOverdue);
                              const groupHasBlocked = group.rows.some((row) => getKanbanRequestHealth(row).isBlocked);
                              const groupMaxAge = group.rows.reduce((maxAge, row) => Math.max(maxAge, getKanbanRequestHealth(row).ageHours), 0);
                              return (
                                <React.Fragment key={group.key}>
                                  <tr className="border-t bg-slate-50">
                                    <td className="p-2">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          className="p-1 rounded hover:bg-slate-200"
                                          onClick={() => toggleRequestGroup(group.key)}
                                          aria-label={expanded ? 'Collapse group' : 'Expand group'}
                                        >
                                          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        <input
                                          type="checkbox"
                                          checked={groupAllSelected}
                                          onChange={(e) => toggleGroupSelection(groupSelectableIds, e.target.checked)}
                                          disabled={groupSelectableIds.length === 0}
                                          className="disabled:opacity-40 disabled:cursor-not-allowed"
                                          ref={(el) => {
                                            if (el) el.indeterminate = groupSomeSelected;
                                          }}
                                        />
                                      </div>
                                    </td>
                                    <td className="p-2 font-semibold">{group.key}</td>
                                    <td className="p-2 text-slate-500">{groupDate}</td>
                                    <td className="p-2 text-slate-500">{groupKanbanId}</td>
                                    <td className="p-2">{group.itemLabel}</td>
                                    <td className="p-2">{groupTriggerLabel}</td>
                                    <td className="p-2 text-right">{groupOnHand}</td>
                                    <td className="p-2 text-right font-semibold">{formatNumber2(group.totalQty || 0)}</td>
                                    <td className="p-2">
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                        groupHasOverdue
                                          ? 'border-amber-200 bg-amber-100 text-amber-700'
                                          : 'border-slate-200 bg-slate-100 text-slate-700'
                                      }`}
                                      >
                                        {formatRequestAging(groupMaxAge)}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      {groupHasBlocked ? (
                                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                          Blocked
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                          Clear
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                                        {group.progressLabel}
                                      </span>
                                    </td>
                                    <td className="p-2 text-slate-400">—</td>
                                  </tr>
                                  {expanded && group.rows.map((row) => {
                                    const health = getKanbanRequestHealth(row);
                                    const onHand = health.onHand;
                                    const triggerLabel = row.trigger_type === 'manual' ? 'Manual' : 'Auto';
                                    const statusLabel = row.status === 'triggered' || row.status === 'requested' ? 'Pending' : row.status === 'approved' ? 'Approved' : row.status === 'rejected' ? 'Rejected' : row.status;
                                    const statusClass = statusLabel === 'Approved'
                                      ? 'bg-slate-900 text-white'
                                      : statusLabel === 'Rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-700';
                                    const allowApprove = dnStatusFlowList.length === 0 || dnStatusFlowList.includes('APPROVE') || dnStatusFlowList.includes('APPROVED');
                                    return (
                                      <tr key={row.id} className="border-t text-[11px] bg-white">
                                        <td className="p-2">
                                          <input
                                            type="checkbox"
                                            checked={selectedRequestIds.includes(row.id)}
                                            onChange={() => toggleRequestSelection(row.id)}
                                            disabled={!isRequestSelectable(row)}
                                          />
                                        </td>
                                        <td className="p-2 font-semibold pl-6">{getRequestIdLabel(row)}</td>
                                        <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                                        <td className="p-2">{buildKanbanId(row.item_code, row.item_type)}</td>
                                        <td className="p-2">{row.item_code} - {row.item_name || '-'}</td>
                                        <td className="p-2">{triggerLabel}</td>
                                        <td className="p-2 text-right">{onHand}</td>
                                        <td className="p-2 text-right font-semibold">{formatNumber2(row.request_qty || 0)}</td>
                                        <td className="p-2">
                                          <div className="flex flex-wrap gap-1">
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                              health.isOverdue
                                                ? 'border-amber-200 bg-amber-100 text-amber-700'
                                                : 'border-slate-200 bg-slate-100 text-slate-700'
                                            }`}
                                            >
                                              {formatRequestAging(health.ageHours)}
                                            </span>
                                            {row.sla_due_at && (
                                              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                                SLA
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2">
                                          <div className="flex flex-wrap gap-1">
                                            {health.hasStockGap && (
                                              <button
                                                type="button"
                                                onClick={() => openKanbanShortageInPrl(row)}
                                                className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 transition hover:bg-orange-200"
                                                title="Buka PRL auto draft untuk item ini"
                                                >
                                                  {'Stock Gap -> PRL'}
                                                </button>
                                            )}
                                            {row.exception_code && (
                                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                {row.exception_code}
                                              </span>
                                            )}
                                            {!health.hasStockGap && !row.exception_code && !row.exception_note && (
                                              <span className="text-[10px] text-slate-400">-</span>
                                            )}
                                          </div>
                                          {row.exception_note && (
                                            <div className="mt-1 text-[10px] text-rose-600">{row.exception_note}</div>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${statusClass}`}>
                                            {statusLabel}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          <div className="flex gap-1 flex-wrap items-center">
                                            {(row.status === 'triggered' || row.status === 'requested') && (
                                              <>
                                                {allowApprove && (
                                                  <button
                                                    onClick={() => handleApproveAndCreateDn(row)}
                                                    className="p-2 border rounded text-emerald-600 hover:text-emerald-700"
                                                    title="Approve + DN (Single)"
                                                    aria-label="Approve and create DN"
                                                  >
                                                    <Check size={12} />
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleRejectKanban(row)}
                                                  className="p-2 border rounded text-amber-600 hover:text-amber-700"
                                                  title="Reject"
                                                  aria-label="Reject request"
                                                >
                                                  <XIcon size={12} />
                                                </button>
                                                {canDeleteRecords && (
                                                  <button
                                                    onClick={() => handleDeleteKanbanRequest(row)}
                                                    className="p-2 border rounded text-red-600 hover:text-red-700"
                                                    title="Delete"
                                                    aria-label="Delete request"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                )}
                                              </>
                                            )}
                                            {canDeleteRecords && row.status === 'approved' && !row.dn_id && (
                                              <button
                                                onClick={() => handleDeleteKanbanRequest(row)}
                                                className="p-2 border rounded text-red-600 hover:text-red-700"
                                                title="Delete"
                                                aria-label="Delete request"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                            {canDeleteRecords && row.status === 'dn_created' && (
                                              <details className="relative">
                                                <summary className="list-none p-2 border rounded text-slate-600 hover:text-slate-900 cursor-pointer" title="Actions">
                                                  <ChevronDown size={12} />
                                                </summary>
                                                <div className="absolute right-0 mt-1 w-28 bg-white border rounded shadow-md z-10">
                                                  <button
                                                    onClick={() => handleDeleteKanbanRequest(row)}
                                                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                                  >
                                                    Hapus
                                                  </button>
                                                </div>
                                              </details>
                                            )}
                                            {row.status === 'approved' && row.dn_id && (
                                              <span className="text-[10px] text-indigo-600 font-semibold">DN-{row.dn_id}</span>
                                            )}
                                            {row.status === 'approved' && !row.dn_id && (
                                              <button
                                                onClick={() => openDnModal(row)}
                                                className="p-2 border rounded text-slate-600 hover:text-slate-900"
                                                title="Create DN"
                                                aria-label="Create DN"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            )}
                                            {row.status === 'dn_created' && row.dn_id && (
                                              <button
                                                onClick={() => openScheduleModal(row)}
                                                className="p-2 border rounded text-slate-600 hover:text-slate-900"
                                                title="Create Schedule"
                                                aria-label="Create schedule"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            )}
                                            {(row.status === 'scheduled' || row.status === 'in_transit') && row.schedule_id && (
                                              <button
                                                onClick={() => openReceiveModal(row)}
                                                className="p-2 border rounded text-slate-600 hover:text-slate-900"
                                                title="Receive/RN"
                                                aria-label="Receive or RN"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                            {groupedKanbanRequests.length === 0 && (
                              <tr><td colSpan="12" className="p-3 text-center text-gray-400">Belum ada request.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3">
                        {renderPaginationControls('kanbanRequests', kanbanPaginationMeta)}
                      </div>
                    </div>
                  </div>
                )}

                {kanbanSubTab === 'dn' && (
                  <div className="bg-white rounded-xl border p-4">
                    <div className="text-sm font-semibold mb-3">DN Register</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2">No DN</th>
                            <th className="text-left p-2">Supplier</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-right p-2">Qty</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryNotesLoading && (
                            <tr><td colSpan="6" className="p-3 text-center text-gray-400">Memuat...</td></tr>
                          )}
                          {!deliveryNotesLoading && kanbanDnPaginationMeta.rows.map((dn) => {
                            const supplierVendor = resolveVendorFromSupplier(dn.supplier);
                            const supplierLabel = supplierVendor?.name || dn.supplier || '-';
                            const supplierCode = supplierVendor?.id || '';
                            const plannedDate = dn.planned_date ? new Date(dn.planned_date).toLocaleDateString('id-ID') : '-';
                            const statusValue = String(dn.status || '').toLowerCase();
                            const statusLabel = statusValue ? statusValue.toUpperCase() : '-';
                            const isDraft = statusValue === 'draft';
                            return (
                            <tr key={dn.id} className="border-t">
                              <td className="p-2 font-semibold">{dn.dn_number}</td>
                              <td className="p-2">
                                {supplierVendor ? (
                                  <button
                                    type="button"
                                    onClick={() => openVendorDetail(supplierVendor)}
                                    className="text-indigo-600 hover:underline text-left"
                                    title="Buka detail supplier"
                                  >
                                    <div className="font-semibold">{supplierLabel}</div>
                                    {supplierCode && <div className="text-[10px] text-slate-400">{supplierCode}</div>}
                                  </button>
                                ) : (
                                  <span>{supplierLabel}</span>
                                )}
                              </td>
                              <td className="p-2">{plannedDate}</td>
                              <td className="p-2 text-right">{formatNumber0(dn.total_qty)}</td>
                              <td className="p-2">{statusLabel}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDnPreview(dn)}
                                    className="p-1.5 border rounded text-slate-600 hover:text-slate-900"
                                    title="Preview DN"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDnPrintPdf(dn)}
                                    className="p-1.5 border rounded text-slate-600 hover:text-slate-900"
                                    title="Send / Print DN"
                                  >
                                    <Printer size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDnEmail(dn)}
                                    className="p-1.5 border rounded text-slate-600 hover:text-slate-900"
                                    title="Email DN"
                                  >
                                    <Mail size={14} />
                                  </button>
                                  {isDraft && (
                                    <button
                                      type="button"
                                      onClick={() => openDnDetailModal(dn, true)}
                                      className="p-1.5 border rounded text-slate-600 hover:text-slate-900"
                                      title="Edit DN"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  )}
                                  {isDraft && canDeleteRecords && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDn(dn)}
                                      className="p-1.5 border rounded text-slate-600 hover:text-rose-600"
                                      title="Hapus DN"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openDnDetailModal(dn, false)}
                                    className="p-1.5 border rounded text-slate-600 hover:text-slate-900"
                                    title="Lihat Detail"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )})}
                          {!deliveryNotesLoading && kanbanDnPaginationMeta.total === 0 && (
                            <tr><td colSpan="6" className="p-3 text-center text-gray-400">Belum ada DN.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3">
                      {renderPaginationControls('kanbanDn', kanbanDnPaginationMeta)}
                    </div>
                  </div>
                )}

                {kanbanSubTab === 'receiving' && (
                  <div className="bg-white rounded-xl border p-4">
                    {showReceiveFormModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                          <div className="p-4 border-b flex justify-between items-center">
                            <div className="text-sm font-semibold">Receiving Form</div>
                            <button onClick={() => setShowReceiveFormModal(false)} className="text-slate-500">
                              <X size={18} />
                            </button>
                          </div>
                          <div className="p-4 overflow-y-auto bg-slate-50">
                            <div className="bg-white border rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Supplier</label>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="Pilih / ketik supplier"
                            list="receive-supplier-options"
                            value={receiveSupplier}
                            onChange={(e) => setReceiveSupplier(e.target.value)}
                          />
                          <datalist id="receive-supplier-options">
                            {(masterVendors || []).map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                            ))}
                          </datalist>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchOpenDns(receiveSupplier, { preserveHeaderFields: true })}
                          className="px-4 py-2 bg-slate-900 text-white rounded text-xs"
                          disabled={receiveDnLoading || !receiveSupplier}
                        >
                          {receiveDnLoading ? 'Memuat...' : 'Load DN'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="block text-[10px] uppercase text-slate-400">No SJ / DO *</label>
                            {receiveDoBadge && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${receiveDoBadge.className}`}>
                                {receiveDoBadge.label}
                              </span>
                            )}
                          </div>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="Masukkan nomor surat jalan"
                            value={receiveDoNumber}
                            onChange={(e) => setReceiveDoNumber(e.target.value)}
                          />
                          {receiveDoCheck.message && (
                            <div
                              className={`mt-1 text-[11px] ${
                                ['block', 'invalid', 'error'].includes(receiveDoCheck.status)
                                  ? 'text-red-600'
                                  : receiveDoCheck.status === 'warn'
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                              }`}
                            >
                              {receiveDoCheck.message}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">No Polisi Truk *</label>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="B 1234 XYZ"
                            value={receiveTruckNo}
                            onChange={(e) => setReceiveTruckNo(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Nama Sopir</label>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="Nama driver"
                            value={receiveDriverName}
                            onChange={(e) => setReceiveDriverName(e.target.value)}
                          />
                        </div>
                      </div>
                      {receiveDnError && (
                        <div className="mt-2 text-xs text-red-600">{receiveDnError}</div>
                      )}

                      <div className="mt-3">
                        <div className="text-[10px] uppercase text-slate-400 mb-2">Daftar DN Open / Incoming / Partial</div>
                        <div className="border rounded max-h-44 overflow-y-auto text-xs">
                          {receiveDnLoading && (
                            <div className="p-3 text-center text-slate-400">Memuat DN...</div>
                          )}
                          {!receiveDnLoading && receiveDnOptions.length === 0 && (
                            <div className="p-3 text-center text-slate-400">Tidak ada DN open/incoming/partial.</div>
                          )}
                          {!receiveDnLoading && receiveDnOptions.map((dn) => {
                            const rawStatus = String(dn.status || '');
                            const statusLabel = rawStatus.toLowerCase() === 'in_transit'
                              ? 'INCOMING'
                              : rawStatus.toUpperCase();
                            return (
                              <label key={dn.id} className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={receiveSelectedDnIds.includes(dn.id)}
                                  onChange={() => handleToggleDnSelection(dn.id)}
                                />
                                <div>
                                  <div className="font-semibold">{dn.dn_number}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {dn.planned_date ? new Date(dn.planned_date).toLocaleDateString('id-ID') : '-'} • {statusLabel}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-[10px] text-slate-600">
                                Qty: {formatNumber0(dn.total_qty || 0)}
                              </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">Pilih DN kemudian load item.</div>
                        <button
                          type="button"
                          onClick={handleLoadReceiveItems}
                          className="px-4 py-2 bg-indigo-600 text-white rounded text-xs"
                          disabled={receiveLoading || receiveSelectedDnIds.length === 0}
                        >
                          {receiveLoading ? 'Memuat...' : 'Load Items'}
                        </button>
                      </div>

                      {receiveError && (
                        <div className="mt-2 text-xs text-red-600">{receiveError}</div>
                      )}

                      {receiveItems.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                            <div>
                              <label className="block text-[10px] uppercase text-slate-400 mb-1">Scan QR Kanban Box</label>
                              <input
                                className="border p-2 rounded w-full text-sm"
                                placeholder="Scan QR kanban"
                                value={receiveScanInput}
                                onChange={(e) => setReceiveScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleReceiveScan();
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleReceiveScan}
                              className="px-4 py-2 bg-emerald-600 text-white rounded text-xs"
                            >
                              Tambah Scan
                            </button>
                          </div>
                          {receiveScanError && (
                            <div className="text-xs text-amber-700">{receiveScanError}</div>
                          )}

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="text-left p-2 border w-[120px]">DN</th>
                                  <th className="text-left p-2 border">Part Name / No</th>
                                  <th className="text-right p-2 border w-[120px]">Qty Dokumen</th>
                                  <th className="text-right p-2 border w-[140px]">Qty Terima</th>
                                  <th className="text-center p-2 border w-[120px]">Status</th>
                                  <th className="text-center p-2 border w-[90px]">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {receiveItems.map((item) => {
                                  const docQty = Number(item.docQty || 0);
                                  const receivedQty = Number(item.receivedQty || 0);
                                  const diff = receivedQty - docQty;
                                  const statusLabel = diff === 0 ? 'MATCH' : diff < 0 ? 'SHORT' : 'OVER';
                                  const statusTone = diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-amber-600' : 'text-rose-600';
                                  return (
                                    <tr key={item.key} className={`border-t ${receiveFlashKey === item.key ? 'bg-emerald-50' : ''}`}>
                                      <td className="p-2 border font-semibold">{item.dnNumber}</td>
                                      <td className="p-2 border">
                                        <div className="font-semibold">{item.partNo}</div>
                                        <div className="text-[10px] text-slate-500">{item.partName}</div>
                                        <div className="text-[10px] text-slate-400">{item.itemCode}</div>
                                      </td>
                                      <td className="p-2 border text-right">{formatNumber0(docQty)}</td>
                                      <td className="p-2 border text-right">
                                        <input
                                          type="number"
                                          className="border rounded px-2 py-1 w-full text-right"
                                          value={receivedQty}
                                          min={0}
                                          onChange={(e) => {
                                            const nextValue = Number(e.target.value || 0);
                                            setReceiveItems((prev) => prev.map((row) => (
                                              row.key === item.key ? { ...row, receivedQty: nextValue } : row
                                            )));
                                          }}
                                        />
                                      </td>
                                      <td className={`p-2 border text-center font-semibold ${statusTone}`}>{statusLabel}</td>
                                      <td className="p-2 border text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleReceiveResetItem(item.key)}
                                          className="px-2 py-1 text-[10px] border rounded"
                                        >
                                          Reset
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {isStockOpnameLocked && (
                            <div className="text-[10px] text-amber-700 mb-2">
                              Selesaikan dulu Stock Opname!
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleConfirmReceive}
                              className="px-4 py-2 bg-indigo-600 text-white rounded text-xs"
                              disabled={receiveSubmitting || isStockOpnameLocked || receiveDoSubmitBlocked}
                            >
                              {receiveSubmitting ? 'Menyimpan...' : 'Confirm Receiving'}
                            </button>
                          </div>
                        </div>
                      )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                      <div className="text-sm font-semibold">Receiving Notes</div>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowReceiveFormModal(true)}
                          className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded"
                        >
                          Terima Barang
                        </button>
                        <input
                          className="border rounded px-3 py-1.5 text-xs w-48"
                          placeholder="Search RN / Supplier / DN"
                          value={localRnSearch || ''}
                          onChange={(e) => setLocalRnSearch(e.target.value)}
                        />
                        <input
                          type="date"
                          className="border rounded px-2 py-1.5 text-xs"
                          value={rnDateStart || ''}
                          onChange={(e) => setRnDateStart(e.target.value)}
                        />
                        <span className="text-[10px] text-slate-400">s/d</span>
                        <input
                          type="date"
                          className="border rounded px-2 py-1.5 text-xs"
                          value={rnDateEnd || ''}
                          onChange={(e) => setRnDateEnd(e.target.value)}
                        />
                        <select
                          className="border rounded px-2 py-1.5 text-xs"
                          value={rnStatus || 'all'}
                          onChange={(e) => setRnStatus(e.target.value)}
                        >
                          <option value="all">All</option>
                          <option value="received">Complete (Received)</option>
                          <option value="partial">Partial (Open)</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2">RN Number</th>
                            <th className="text-left p-2">DN Reference</th>
                            <th className="text-left p-2">Supplier/Subcon</th>
                            <th className="text-left p-2">Received Date</th>
                            <th className="text-left p-2">QC Status</th>
                            <th className="text-right p-2">Expected</th>
                            <th className="text-right p-2">Actual</th>
                            <th className="text-right p-2">Variance</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiveNotesLoading && (
                            <tr><td colSpan="10" className="p-3 text-center text-gray-400">Memuat...</td></tr>
                          )}
                          {!receiveNotesLoading && kanbanReceivingPaginationMeta.rows.map((rn) => {
                            const expected = Number(rn.expected_total ?? rn.expected_qty ?? 0);
                            const actual = Number(rn.received_total ?? rn.received_qty ?? 0);
                            const variance = actual - expected;
                            const qcStatus = String(rn.qc_status || '').toUpperCase();
                            const isPartial = expected > 0 && actual < expected;
                            const statusLabel = isPartial ? 'PARTIAL' : 'RECEIVED';
                            const dnRef = rn.dn_reference || rn.dn_number || '-';
                            return (
                              <tr key={rn.id} className="border-t">
                                <td className="p-2 font-semibold">{rn.rn_number}</td>
                                <td className="p-2">{dnRef}</td>
                                <td className="p-2">{rn.supplier || '-'}</td>
                                <td className="p-2">{rn.received_at ? new Date(rn.received_at).toLocaleDateString('id-ID') : '-'}</td>
                                <td className="p-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] border bg-white text-slate-700">
                                    {qcStatus || 'OK'}
                                  </span>
                                </td>
                                <td className="p-2 text-right">{formatNumber2(expected)}</td>
                                <td className="p-2 text-right">{formatNumber2(actual)}</td>
                                <td className={`p-2 text-right ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {variance > 0 ? `+${formatNumber2(variance)}` : formatNumber2(variance)}
                                </td>
                                <td className="p-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-white">
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openRnDetailModal(rn)}
                                      className="p-1.5 border rounded"
                                      title="View Detail"
                                      aria-label="View RN Detail"
                                    >
                                      <Eye size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openRnPrintModal(rn)}
                                      className="px-2 py-1 text-[10px] border rounded flex items-center gap-1"
                                      title="Print / PDF"
                                      aria-label="Print RN"
                                    >
                                      <Printer size={12} />
                                      Print/PDF
                                    </button>
                                    <button className="p-1.5 border rounded"><Mail size={12} /></button>
                                    {canDeleteRecords && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReceiveNote(rn)}
                                        className="p-1.5 border rounded text-rose-600 hover:text-rose-700"
                                        title="Hapus RN"
                                        aria-label="Delete RN"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {!receiveNotesLoading && kanbanReceivingPaginationMeta.total === 0 && (
                            <tr><td colSpan="10" className="p-3 text-center text-gray-400">Belum ada receiving notes.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3">
                      {renderPaginationControls('kanbanReceiving', kanbanReceivingPaginationMeta)}
                    </div>
                  </div>
                )}

                {kanbanSubTab === 'empty' && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">Posting Kanban Kosong</div>
                      <div className="text-xs text-slate-500">Catat kanban kosong untuk potong stok dan memicu request.</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const pending = kanbanRequests.filter((row) => ['triggered', 'requested'].includes(row.status));
                        const today = new Date().toISOString().slice(0, 10);
                        const processedToday = kanbanRequests.filter((row) => row.dn_id && String(row.created_at || '').slice(0, 10) === today);
                        const totalEmpty = kanbanRequests.filter((row) => ['triggered', 'requested', 'approved', 'dn_created', 'scheduled', 'in_transit', 'receiving', 'fifo', 'closed'].includes(row.status));
                        return (
                          <>
                            <div className="bg-white rounded-xl border p-4">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-slate-600">Antrian Belum Diproses</div>
                                <Clock size={14} className="text-amber-500" />
                              </div>
                              <div className="text-2xl font-bold text-amber-600 mt-3">{pending.length}</div>
                              <div className="text-xs text-slate-400">Menunggu pembuatan DN</div>
                            </div>
                            <div className="bg-white rounded-xl border p-4">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-slate-600">Diproses Hari Ini</div>
                                <CheckCircle size={14} className="text-emerald-500" />
                              </div>
                              <div className="text-2xl font-bold text-emerald-600 mt-3">{processedToday.length}</div>
                              <div className="text-xs text-slate-400">Dikonversi ke DN</div>
                            </div>
                            <div className="bg-white rounded-xl border p-4">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-slate-600">Total Kosong</div>
                                <Package size={14} className="text-blue-500" />
                              </div>
                              <div className="text-2xl font-bold text-blue-600 mt-3">{totalEmpty.length}</div>
                              <div className="text-xs text-slate-400">Catatan sepanjang waktu</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold mb-1">Pemindaian Kanban Tunggal</div>
                        <div className="text-xs text-slate-500 mb-3">Pindai atau masukkan ID kanban untuk satu kartu kosong.</div>
                        <form onSubmit={handleEmptyKanbanSubmit} className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Area/Lini</label>
                            <select
                              className="border p-2 rounded w-full text-xs"
                              value={emptyKanbanForm.area}
                              onChange={(e) => setEmptyKanbanForm({ ...emptyKanbanForm, area: e.target.value })}
                            >
                              <option value="">Pilih area/lini</option>
                              {masterAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                  {area.id} - {area.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">ID Kanban</label>
                            <input
                              className="border p-2 rounded w-full text-xs"
                              placeholder="Pindai atau masukkan ID kanban (mis., KB-RM-000124)"
                              value={emptyKanbanForm.kanbanId}
                              onChange={(e) => setEmptyKanbanForm({ ...emptyKanbanForm, kanbanId: e.target.value })}
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                            disabled={isStockOpnameLocked}
                          >
                            <QrCode size={14} /> Catat Kanban Kosong
                          </button>
                        </form>
                      </div>

                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold mb-1 flex items-center gap-2"><Plus size={14} /> Input Batch</div>
                        <div className="text-xs text-slate-500 mb-3">Proses beberapa kanban kosong sekaligus.</div>
                        <button
                          onClick={() => setShowBatchModal(true)}
                          className="w-full bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                          disabled={isStockOpnameLocked}
                        >
                          <Plus size={14} /> Buka Input Batch
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                      <div className="text-sm font-semibold mb-1">Log Kanban Kosong</div>
                      <div className="text-xs text-slate-500 mb-3">Riwayat semua kartu kanban kosong.</div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[980px] text-xs">
                          <div className="bg-slate-100 grid items-center" style={{ gridTemplateColumns: emptyLogGrid }}>
                            <div className="text-left p-2">Waktu</div>
                            <div className="text-left p-2">ID Kanban</div>
                            <div className="text-left p-2">Item</div>
                            <div className="text-left p-2">Area/Lini</div>
                            <div className="text-left p-2">Kategori</div>
                            <div className="text-left p-2">Status</div>
                            <div className="text-left p-2">Referensi DN</div>
                            <div className="text-left p-2">Aksi</div>
                          </div>
                          {kanbanEmptyPaginationMeta.total === 0 ? (
                            <div className="p-3 text-center text-gray-400">Belum ada kanban kosong.</div>
                          ) : (
                            <div
                              ref={emptyLogRef}
                              onScroll={(e) => setEmptyScrollTop(e.currentTarget.scrollTop)}
                              className="max-h-80 overflow-y-auto"
                            >
                              <div className="relative" style={{ height: emptyWindow.total * emptyRowHeight }}>
                                {visibleEmptyRows.map((row, idx) => {
                                  const rowIndex = emptyWindow.startIndex + idx;
                                  const setting = kanbanSettingsByCode.get(row.item_code);
                                  return (
                                    <div
                                      key={row.id}
                                      className="grid items-center border-t"
                                      style={{ gridTemplateColumns: emptyLogGrid, position: 'absolute', top: rowIndex * emptyRowHeight, height: emptyRowHeight, width: '100%' }}
                                    >
                                      <div className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</div>
                                      <div className="p-2 font-semibold">{extractKanbanIdNote(row.notes) || buildKanbanId(row.item_code, row.item_type)}</div>
                                      <div className="p-2">{row.item_code} - {row.item_name || '-'}</div>
                                      <div className="p-2">{extractAreaNote(row.notes)}</div>
                                      <div className="p-2">{getCategoryLabel(setting?.item_type)}</div>
                                      <div className="p-2">{row.status}</div>
                                      <div className="p-2">{row.dn_id ? `DN-${row.dn_id}` : '-'}</div>
                                      <div className="p-2">
                                        {row.status === 'approved' && (
                                          <button onClick={() => openDnModal(row)} className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded">Buat DN</button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        {renderPaginationControls('kanbanEmpty', kanbanEmptyPaginationMeta)}
                      </div>
                    </div>
                  </div>
                )}

                {kanbanSubTab === 'production' && (
                  <div className="space-y-4">
                    <div className="bg-white/90 rounded-xl border px-4">
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        {[
                          { key: 'fg', label: 'Import Produksi (FG)' },
                          { key: 'wip', label: 'Import Mutasi WIP' },
                          { key: 'report', label: 'Laporan Produksi' },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setProductionTab(tab.key)}
                            className={`relative py-3 text-sm transition ${
                              productionTab === tab.key
                                ? 'text-slate-900 font-semibold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tab.label}
                            {productionTab === tab.key && (
                              <span className="absolute left-0 -bottom-[1px] h-[2px] w-full rounded-full bg-slate-900" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {productionTab === 'fg' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">Import Produksi</div>
                          <div className="text-xs text-slate-500">Format: Tanggal (YYYY-MM-DD), Uniq, Qty.</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadProductionTemplate}
                          className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                        >
                          <Download size={14} /> Template
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          ref={productionImportRef}
                          className="hidden"
                          onChange={handleImportProductionFile}
                        />
                        <button
                          type="button"
                          onClick={() => productionImportRef.current?.click()}
                          className="px-3 py-2 text-xs bg-slate-900 text-white rounded flex items-center gap-2"
                          disabled={productionImportLoading}
                        >
                          <FileUp size={14} /> {productionImportLoading ? 'Mengimpor...' : 'Upload File'}
                        </button>
                        <div className="text-[10px] text-slate-400">Hanya FG/Childpart/Sub-Assy yang diterima.</div>
                      </div>
                      {productionImportError && (
                        <div className="mt-2 text-xs text-red-600">{productionImportError}</div>
                      )}
                      {productionImportSummary && (
                        <div className="mt-2 text-xs text-emerald-700">
                          Import OK. File: {productionImportSummary.fileName || '-'} - Rows: {productionImportSummary.totalRows || productionImportSummary.created || 0} - Auto-trigger: {productionImportSummary.autoTriggered || 0}
                        </div>
                      )}
                    </div>
                    )}

                    {productionTab === 'wip' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">Import Mutasi WIP</div>
                          <div className="text-xs text-slate-500">
                            Kolom: Tanggal Produksi, Kode Barang, Lokasi Asal, Lokasi Tujuan, Qty Lulus, Qty Reject (opsional), No. Dokumen (opsional), Shift (opsional), PIC / Operator (opsional).
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadWipTemplate}
                          className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                        >
                          <Download size={14} /> Template
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          ref={wipImportRef}
                          className="hidden"
                          onChange={handleImportWipFile}
                        />
                        <button
                          type="button"
                          onClick={() => wipImportRef.current?.click()}
                          className="px-3 py-2 text-xs bg-slate-900 text-white rounded flex items-center gap-2"
                          disabled={wipImportLoading}
                        >
                          <FileUp size={14} /> {wipImportLoading ? 'Mengimpor...' : 'Upload File'}
                        </button>
                        <div className="text-[10px] text-slate-400">Stok lokasi asal wajib mencukupi.</div>
                      </div>
                      {wipImportError && (
                        <div className="mt-2 text-xs text-red-600">{wipImportError}</div>
                      )}
                      {wipImportSummary && (
                        <div className="mt-2 text-xs text-emerald-700">
                          File: {wipImportSummary.fileName || '-'} - Rows: {wipImportSummary.totalRows || 0} - OK: {wipImportSummary.successRows || 0} - Failed: {wipImportSummary.failedRows || 0}{Number.isFinite(Number(wipImportSummary.totalQty)) ? ` - Total Qty: ${formatNumber0(wipImportSummary.totalQty)}` : ''}
                        </div>
                      )}
                      {wipImportRows.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-[1200px] w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="p-2 text-left">Baris</th>
                                <th className="p-2 text-left">Tanggal</th>
                                <th className="p-2 text-left">Kode</th>
                                <th className="p-2 text-left">Asal</th>
                                <th className="p-2 text-left">Tujuan</th>
                                <th className="p-2 text-left">No. Dokumen</th>
                                <th className="p-2 text-left">Shift</th>
                                <th className="p-2 text-left">PIC / Operator</th>
                                <th className="p-2 text-right">Qty Lulus</th>
                                <th className="p-2 text-right">Qty Reject</th>
                                <th className="p-2 text-left">Status</th>
                                <th className="p-2 text-left">Catatan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wipImportRows.slice(0, 20).map((row) => (
                                <tr key={`${row.no}-${row.itemCode}`} className="border-t">
                                  <td className="p-2">{row.no}</td>
                                  <td className="p-2">{row.date || '-'}</td>
                                  <td className="p-2 font-semibold">{row.itemCode || '-'}</td>
                                  <td className="p-2">{row.fromLocation || '-'}</td>
                                  <td className="p-2">{row.toLocation || '-'}</td>
                                  <td className="p-2">{row.documentNo || '-'}</td>
                                  <td className="p-2">{row.shiftLabel || '-'}</td>
                                  <td className="p-2">{row.operatorName || '-'}</td>
                                  <td className="p-2 text-right">{formatNumber0(row.qtyGood || 0)}</td>
                                  <td className="p-2 text-right">{row.qtyReject === null ? '-' : formatNumber0(row.qtyReject || 0)}</td>
                                  <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                      row.status === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="p-2 text-red-600">{row.errorMessage || '-'}</td>
                                </tr>
                              ))}
                              {wipImportRows.length > 20 && (
                                <tr>
                                  <td colSpan={12} className="p-2 text-center text-slate-400">
                                    Menampilkan 20 baris pertama dari {wipImportRows.length} baris.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    )}

                    {productionTab === 'wip' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">Riwayat Import WIP</div>
                        <button
                          type="button"
                          onClick={fetchWipImportHistory}
                          className="px-3 py-2 text-xs border rounded"
                          disabled={wipImportHistoryLoading}
                        >
                          {wipImportHistoryLoading ? 'Memuat...' : 'Refresh'}
                        </button>
                      </div>
                      {wipImportHistoryError && (
                        <div className="mt-2 text-xs text-red-600">{wipImportHistoryError}</div>
                      )}
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[700px] w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">Upload</th>
                              <th className="p-2 text-left">File</th>
                              <th className="p-2 text-left">User</th>
                              <th className="p-2 text-right">Total Qty</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wipImportHistoryRows.length === 0 && !wipImportHistoryLoading && (
                              <tr>
                                <td colSpan={5} className="p-3 text-center text-slate-400">Belum ada data import.</td>
                              </tr>
                            )}
                            {wipImportHistoryRows.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                                <td className="p-2 font-semibold">{row.file_name || `Batch #${row.id}`}</td>
                                <td className="p-2">{row.created_by_name || '-'}</td>
                                <td className="p-2 text-right">{formatNumber0(row.total_qty || 0)}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    row.status === 'success'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : row.status === 'failed'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {String(row.status || '-').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}

                    {productionTab === 'fg' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">Riwayat Import Produksi</div>
                        <button
                          type="button"
                          onClick={fetchProductionImportHistory}
                          className="px-3 py-2 text-xs border rounded"
                          disabled={productionHistoryLoading}
                        >
                          {productionHistoryLoading ? 'Memuat...' : 'Refresh'}
                        </button>
                      </div>
                      {productionHistoryError && (
                        <div className="mt-2 text-xs text-red-600">{productionHistoryError}</div>
                      )}
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[820px] w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">File</th>
                              <th className="p-2 text-left">Upload</th>
                              <th className="p-2 text-right">Rows</th>
                              <th className="p-2 text-left">Status</th>
                              <th className="p-2 text-left">User</th>
                              <th className="p-2 text-left">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productionImportRows.length === 0 && !productionHistoryLoading && (
                              <tr>
                                <td colSpan={6} className="p-3 text-center text-slate-400">Belum ada data import.</td>
                              </tr>
                            )}
                            {productionImportRows.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="p-2 font-semibold">{row.file_name || `Batch #${row.id}`}</td>
                                <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                                <td className="p-2 text-right">{formatNumber0(row.success_rows || 0)}/{formatNumber0(row.total_rows || 0)}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    row.status === 'success'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : row.status === 'failed'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {String(row.status || '-').toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2">{row.created_by_name || '-'}</td>
                                <td className="p-2 text-red-600">{row.error_message || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}

                    {productionTab === 'report' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold">Laporan Produksi (Komparasi)</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportProductionReport}
                            className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                          >
                            <FileSpreadsheet size={14} /> Export Excel
                          </button>
                          <button
                            type="button"
                            onClick={handlePrintProductionReport}
                            className="px-3 py-2 text-xs border rounded flex items-center gap-2"
                          >
                            <Printer size={14} /> Print / PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => fetchProductionCompare({
                              start: productionCompareStart,
                              end: productionCompareEnd,
                              code: productionCompareCode || localProductionCompareCode,
                            })}
                            className="px-3 py-2 text-xs border rounded"
                            disabled={productionCompareLoading}
                          >
                            {productionCompareLoading ? 'Memuat...' : 'Refresh'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            className="border p-2 rounded w-full text-xs"
                            value={productionCompareStart}
                            onChange={(e) => setProductionCompareStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">End Date</label>
                          <input
                            type="date"
                            className="border p-2 rounded w-full text-xs"
                            value={productionCompareEnd}
                            onChange={(e) => setProductionCompareEnd(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Kode Uniq</label>
                          <input
                            type="text"
                            className="border p-2 rounded w-full text-xs"
                            placeholder="Kode FG / Childpart"
                            value={localProductionCompareCode}
                            onChange={(e) => setLocalProductionCompareCode(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleApplyProductionCompare}
                            className="px-3 py-2 text-xs bg-slate-900 text-white rounded w-full"
                          >
                            Tampilkan
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400">
                        Wajib isi start date, end date, dan kode uniq.
                      </div>
                      {productionCompareError && (
                        <div className="mt-2 text-xs text-red-600">{productionCompareError}</div>
                      )}
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[980px] w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">No</th>
                              <th className="p-2 text-left">Tanggal Produksi</th>
                              <th className="p-2 text-left">Uniq / Part Number</th>
                              <th className="p-2 text-left">Part Name</th>
                              <th className="p-2 text-right">Qty Produksi</th>
                              <th className="p-2 text-right">Qty Kanban Request</th>
                              <th className="p-2 text-right">Variance</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productionReportRows.length === 0 && !productionCompareLoading && (
                              <tr>
                                <td colSpan={8} className="p-3 text-center text-slate-400">Belum ada data komparasi.</td>
                              </tr>
                            )}
                            {productionReportRows.map((row) => {
                              const match = row.status === 'MATCH';
                              return (
                                <tr key={`${row.productionDate}-${row.itemCode}-${row.no}`} className={`border-t ${match ? '' : 'bg-red-50'}`}>
                                  <td className="p-2">{row.no}</td>
                                  <td className="p-2">{row.productionDate}</td>
                                  <td className="p-2">{row.uniqLabel}</td>
                                  <td className="p-2">{row.itemName}</td>
                                  <td className="p-2 text-right">{formatNumber0(row.productionQty)}</td>
                                  <td className="p-2 text-right">{formatNumber0(row.kanbanQty)}</td>
                                  <td className={`p-2 text-right ${match ? '' : 'text-red-600 font-semibold'}`}>{formatNumber0(row.diffQty)}</td>
                                  <td className={`p-2 ${match ? 'text-emerald-600' : 'text-red-600 font-semibold'}`}>{row.status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {kanbanSubTab === 'scan' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {[
                        { key: 'items', label: 'Kanban Items', icon: <Package size={16} /> },
                        { key: 'requests', label: 'Requests', icon: <FileSpreadsheet size={16} /> },
                        { key: 'dn', label: 'DN Register', icon: <FileText size={16} /> },
                        { key: 'receiving', label: 'Receiving Notes', icon: <Truck size={16} /> },
                      ].map((shortcut) => (
                        <button
                          key={shortcut.key}
                          onClick={() => setKanbanSubTab(shortcut.key)}
                          className="bg-white border rounded-xl p-3 flex items-center gap-2 text-xs hover:bg-slate-50"
                        >
                          <span className="p-2 rounded-lg bg-slate-100 text-slate-700">{shortcut.icon}</span>
                          <span className="font-semibold text-slate-700">{shortcut.label}</span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <div className="text-2xl font-bold text-slate-900">Pemindai QR/Barcode</div>
                      <div className="text-xs text-slate-500">Pindai kartu kanban untuk operasi material cepat.</div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                          <QrCode size={16} /> Pemindai
                        </div>
                        <div className="text-xs text-slate-500 mb-3">Pindai kode QR atau masukkan manual.</div>
                        <div className="flex gap-2 text-xs mb-3">
                          {[
                            { key: 'camera', label: 'Kamera' },
                            { key: 'manual', label: 'Manual' },
                            { key: 'simulasi', label: 'Simulasi' },
                          ].map((mode) => (
                            <button
                              key={mode.key}
                              onClick={() => setScanMode(mode.key)}
                              className={`px-3 py-1.5 rounded border ${scanMode === mode.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600'}`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                        {scanMode === 'camera' && (
                          <div className="space-y-3">
                            <div className="bg-slate-900 rounded-lg overflow-hidden">
                              <video ref={scanVideoRef} className="w-full h-52 object-cover" muted playsInline />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Pastikan izin kamera diaktifkan. Kamera di browser butuh HTTPS atau localhost.
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setScanCameraEnabled(true)}
                                className="flex-1 bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                              >
                                <QrCode size={14} /> Mulai Kamera
                              </button>
                              <button
                                onClick={() => setScanCameraEnabled(false)}
                                className="flex-1 border py-2 rounded text-xs"
                              >
                                Hentikan
                              </button>
                            </div>
                          </div>
                        )}

                        {scanMode !== 'camera' && (
                          <>
                            <label className="block text-[10px] uppercase text-slate-400 mb-2">Masukkan data QR (satu per baris untuk pemindaian multi)</label>
                            <textarea
                              className="border p-2 rounded w-full text-xs h-36"
                              placeholder="KANBAN_ID:KB-RM-000124|ITEM:RM-STKM11AH-22216|QTY:30"
                              value={scanInput}
                              onChange={(e) => setScanInput(e.target.value)}
                            />
                            <div className="text-[10px] text-slate-400 mt-2">Masukkan satu QR per baris. Banyak kode akan diproses batch.</div>
                            <div className="mt-3 space-y-2">
                              <button onClick={handleProcessScan} className="w-full bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2">
                                <Search size={14} /> Proses Data QR ({scanResults.length} item)
                              </button>
                              <button onClick={handleLoadSampleScan} className="w-full border py-2 rounded text-xs">Muat Data Contoh (3 item)</button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                          <Package size={16} /> Hasil Pemindaian
                        </div>
                        <div className="text-xs text-slate-500 mb-3">Informasi kanban dan aksi.</div>
                        {scanError && (
                          <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3 whitespace-pre-wrap">{scanError}</div>
                        )}
                        {scanResults.length === 0 && (
                          <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed rounded-lg">
                            <QrCode size={28} />
                            <div className="mt-2">Pindai kode QR untuk melihat detail kanban.</div>
                          </div>
                        )}
                        {scanActiveResult && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs">
                              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                <CheckCircle size={14} /> Pemindaian Berhasil
                              </div>
                              <div className="mt-2 text-emerald-700">
                                <div>ID Kanban: {scanActiveResult.kanbanId}</div>
                                <div>Kode Item: {scanActiveResult.itemCode}</div>
                                <div>Qty Kartu: {scanActiveResult.qty}</div>
                              </div>
                            </div>
                            <div className="border rounded-lg p-3 text-xs space-y-2">
                              <div className="font-semibold text-slate-700">{scanActiveResult.itemName}</div>
                              <div className="grid grid-cols-2 gap-2 text-slate-500">
                                <div>Lokasi: {scanActiveResult.location}</div>
                                <div>Stok Tersedia: <span className={scanActiveResult.status === 'Critical' ? 'text-red-600' : 'text-emerald-600'}>{scanActiveResult.stock} PCS</span></div>
                                <div>Min/Maks: {scanActiveResult.min} / {scanActiveResult.max}</div>
                                <div>Status: <span className={`px-2 py-0.5 rounded-full text-[10px] ${scanActiveResult.status === 'Critical' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>{scanActiveResult.status}</span></div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  setConsumeQty(String(scanActiveResult?.qty || ''));
                                  setShowConsumeModal(true);
                                }}
                                className="flex-1 border py-2 rounded text-xs"
                              >
                                Keluarkan Material
                              </button>
                              <button
                                onClick={async () => {
                                  const outcome = await createRequestFromScan(scanActiveResult);
                                  await fetchKanbanRequests();
                                  setScanError(outcome.ok ? '' : outcome.reason || 'Gagal membuat request.');
                                }}
                                className="flex-1 bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                              >
                                <Plus size={14} /> Minta Pemesanan
                              </button>
                            </div>
                          </div>
                        )}
                        {scanResults.length > 1 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-[10px] uppercase text-slate-400">Hasil Batch</div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {scanResults.map((result) => (
                                <div key={result.id} className="border rounded-lg p-2 text-xs">
                                  <div className="font-semibold text-slate-700">{result.kanbanId}</div>
                                  <div className="text-slate-500">Item: {result.itemName}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                        <Clock size={16} /> Pemindaian Terbaru
                      </div>
                      {scanResults.length === 0 ? (
                        <div className="text-xs text-slate-400">Belum ada pemindaian.</div>
                      ) : (
                        <div className="divide-y">
                          {scanResults.map((result) => (
                            <div key={result.id} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <div className="font-semibold text-slate-700">{result.kanbanId}</div>
                                <div className="text-slate-500">{result.itemCode} {result.itemName}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-slate-700">{result.qty || '-'} pcs</div>
                                <div className="text-slate-400">{formatScanTime(result.scannedAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}

              {showConsumeModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Keluarkan Material</div>
                      <button onClick={() => setShowConsumeModal(false)}><X size={16} /></button>
                    </div>
                    <div className="text-xs text-slate-500 mb-3">
                      Keluarkan material dari {scanActiveResult?.itemName || '-'}
                    </div>
                    <div className="bg-slate-50 border rounded-lg p-3 text-xs text-slate-700 mb-3">
                      Tersedia: {Number(scanActiveResult?.stock ?? 0)} PCS
                    </div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Qty Keluar</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full border p-2 rounded text-sm"
                      placeholder="Masukkan jumlah"
                      value={consumeQty}
                      onChange={(e) => setConsumeQty(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setShowConsumeModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                      <button
                        onClick={async () => {
                          const outcome = await consumeStockFromScan(scanActiveResult, consumeQty);
                          setScanError(outcome.ok ? '' : outcome.reason || 'Gagal keluarkan material.');
                          if (outcome.ok) {
                            setShowConsumeModal(false);
                          }
                        }}
                        className="px-3 py-2 text-sm bg-slate-900 text-white rounded disabled:opacity-60"
                        disabled={isStockOpnameLocked}
                      >
                        Keluarkan Material
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showDnModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Create Delivery Note</div>
                      <button onClick={() => setShowDnModal(false)}><X size={16} /></button>
                    </div>
                    <form onSubmit={handleCreateDn} className="space-y-3">
                      {dnScheduleRows.length > 0 && !String(dnForm.scheduleIndex || '').trim() && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                          Rit/Jam wajib dipilih untuk vendor ini.
                        </div>
                      )}
                      <input
                        className="border p-2 rounded text-sm w-full bg-slate-50 text-slate-500"
                        placeholder="DN Number (auto by config)"
                        value={dnForm.dnNumber}
                        onChange={(e) => setDnForm({ ...dnForm, dnNumber: e.target.value })}
                        readOnly
                        disabled
                      />
                      <input className="border p-2 rounded text-sm w-full" placeholder="Supplier" value={dnForm.supplier} onChange={(e) => handleDnSupplierChange(e.target.value)} />
                      <input type="date" className="border p-2 rounded text-sm w-full" value={dnForm.plannedDate} onChange={(e) => setDnForm({ ...dnForm, plannedDate: e.target.value })} />
                      <select
                        className="border p-2 rounded text-sm w-full"
                        value={dnForm.scheduleIndex ?? ''}
                        onChange={(e) => handleDnScheduleChange(e.target.value)}
                        disabled={dnScheduleRows.length === 0}
                      >
                        <option value="">{dnScheduleRows.length === 0 ? 'Tidak ada schedule' : 'Pilih Rit/Time'}</option>
                        {dnScheduleRows.map((row, idx) => (
                          <option key={`dn-schedule-${idx}`} value={String(idx)}>
                            Rit {row.rit || '-'} {row.time ? `(${row.time})` : ''}{row.cycle ? ` • ${row.cycle}` : ''}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="border p-2 rounded text-sm w-full min-h-[90px]"
                        placeholder="Remarks (optional)"
                        value={dnForm.remarks || ''}
                        onChange={(e) => setDnForm({ ...dnForm, remarks: e.target.value })}
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowDnModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-60"
                          disabled={dnScheduleRows.length > 0 && !String(dnForm.scheduleIndex || '').trim()}
                        >
                          Simpan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showDnDetailModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-3xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">Detail DN</div>
                        <div className="text-xs text-slate-500">{selectedDnDetail?.dn_number || '-'}</div>
                      </div>
                      <button onClick={closeDnDetailModal}><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 mb-4">
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Supplier</div>
                        <div className="font-semibold">
                          {(() => {
                            const vendor = resolveVendorFromSupplier(selectedDnDetail?.supplier);
                            return vendor?.name || selectedDnDetail?.supplier || '-';
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Planned Date</div>
                        <div className="font-semibold">
                          {selectedDnDetail?.planned_date
                            ? new Date(selectedDnDetail.planned_date).toLocaleDateString('id-ID')
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Status</div>
                        <div className="font-semibold">{String(selectedDnDetail?.status || '').toUpperCase() || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Cycle</div>
                        <div className="font-semibold">{selectedDnDetail?.cycle || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Rit/Time</div>
                        <div className="font-semibold">{selectedDnDetail?.rit || '-'} / {selectedDnDetail?.delivery_time || '-'}</div>
                      </div>
                    </div>

                    {dnDetailLoading ? (
                      <div className="text-xs text-slate-400">Memuat...</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[360px] border rounded">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left p-2">Request</th>
                              <th className="text-left p-2">Item</th>
                              <th className="text-right p-2">Qty</th>
                              <th className="text-left p-2">Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dnDetailRows.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="p-2 font-semibold">{getRequestIdLabel(row)}</td>
                                <td className="p-2">
                                  <div className="font-semibold">{row.item_code}</div>
                                  <div className="text-[10px] text-slate-400">{row.item_name || '-'}</div>
                                </td>
                                <td className="p-2 text-right">
                                  {dnDetailEditable ? (
                                    <input
                                      type="number"
                                      min="1"
                                      className="border rounded px-2 py-1 w-24 text-right"
                                      value={dnDetailEdits[row.id] ?? row.request_qty}
                                      onChange={(e) => setDnDetailEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                    />
                                  ) : (
                                    formatNumber0(row.request_qty)
                                  )}
                                </td>
                                <td className="p-2">{row.item_unit || '-'}</td>
                              </tr>
                            ))}
                            {dnDetailRows.length === 0 && (
                              <tr><td colSpan="4" className="p-3 text-center text-gray-400">Tidak ada item.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                      {canEditSchedules && String(selectedDnDetail?.status || '').toLowerCase() === 'partial' && (
                        <button
                          type="button"
                          onClick={() => handleForceCloseDn?.(selectedDnDetail)}
                          className="px-3 py-2 text-sm bg-amber-600 text-white rounded"
                        >
                          Force Close
                        </button>
                      )}
                      <button type="button" onClick={closeDnDetailModal} className="px-3 py-2 text-sm border rounded">Tutup</button>
                      {dnDetailEditable && (
                        <button type="button" onClick={handleDnDetailSave} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded">Simpan</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showRnDetailModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-3xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">Detail RN</div>
                        <div className="text-xs text-slate-500">{selectedRnDetail?.rn_number || '-'}</div>
                      </div>
                      <button onClick={closeRnDetailModal}><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 mb-4">
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Supplier</div>
                        <div className="font-semibold">{selectedRnDetail?.supplier || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Received Date</div>
                        <div className="font-semibold">
                          {selectedRnDetail?.received_at
                            ? new Date(selectedRnDetail.received_at).toLocaleDateString('id-ID')
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">DN Reference</div>
                        <div className="font-semibold">{selectedRnDetail?.dn_reference || '-'}</div>
                      </div>
                    </div>

                    {selectedRnDetail?.notes && (
                      <div className="mb-3 text-xs text-slate-600">
                        <div className="text-[10px] uppercase text-slate-400 mb-1">Remarks</div>
                        <div className="border rounded p-2 bg-slate-50">{selectedRnDetail.notes}</div>
                      </div>
                    )}

                    <div className="overflow-x-auto max-h-[360px] border rounded">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2">DN</th>
                            <th className="text-left p-2">Item</th>
                            <th className="text-right p-2">Expected</th>
                            <th className="text-right p-2">Received</th>
                            <th className="text-right p-2">Variance</th>
                            <th className="text-left p-2">QC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedRnDetail?.items || []).map((row) => {
                            const expected = Number(row.expected_qty ?? row.doc_qty ?? 0);
                            const actual = Number(row.received_qty ?? 0);
                            const variance = actual - expected;
                            return (
                              <tr key={`${selectedRnDetail.id}-${row.id}`} className="border-t">
                                <td className="p-2">{row.dn_number || '-'}</td>
                                <td className="p-2">
                                  <div className="font-semibold">{row.item_code || '-'}</div>
                                  <div className="text-[10px] text-slate-400">{row.item_name || '-'}</div>
                                </td>
                                <td className="p-2 text-right">{formatNumber2(expected)}</td>
                                <td className="p-2 text-right">{formatNumber2(actual)}</td>
                                <td className={`p-2 text-right ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {variance > 0 ? `+${formatNumber2(variance)}` : formatNumber2(variance)}
                                </td>
                                <td className="p-2">{String(row.qc_status || 'OK').toUpperCase()}</td>
                              </tr>
                            );
                          })}
                          {(selectedRnDetail?.items || []).length === 0 && (
                            <tr><td colSpan="6" className="p-3 text-center text-gray-400">Tidak ada item.</td></tr>
                          )}
                        </tbody>
                        {(selectedRnDetail?.items || []).length > 0 && (
                          <tfoot className="bg-slate-50 border-t">
                            <tr>
                              <td className="p-2 text-right font-semibold" colSpan="2">Total</td>
                              <td className="p-2 text-right font-semibold">{formatNumber2(selectedRnDetail?.expected_total ?? 0)}</td>
                              <td className="p-2 text-right font-semibold">{formatNumber2(selectedRnDetail?.received_total ?? 0)}</td>
                              <td className="p-2 text-right font-semibold">{formatNumber2(selectedRnDetail?.variance ?? 0)}</td>
                              <td className="p-2" />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button type="button" onClick={closeRnDetailModal} className="px-3 py-2 text-sm border rounded">Tutup</button>
                    </div>
                  </div>
                </div>
              )}

              {showRnPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none">
                    <div className="p-4 border-b flex justify-between items-center print:hidden">
                      <div className="text-sm font-semibold">Goods Receipt Note Preview</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const filename = buildPrintFileName('RN', rnPrintPayload?.dnReference || rnPrintPayload?.rnNumber);
                            triggerPrintWithTitle(filename);
                          }}
                          className="px-3 py-1.5 text-xs border rounded"
                        >
                          Print / PDF
                        </button>
                        <button onClick={closeRnPrintModal} className="text-slate-500"><X size={18} /></button>
                      </div>
                    </div>
                    <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0">
                      {renderRnPrintDocument()}
                    </div>
                  </div>
                </div>
              )}

              {showDnBatchModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">Generate Delivery Note</div>
                        <div className="text-xs text-slate-500">Batch process akan membuat DN per supplier.</div>
                      </div>
                      <button onClick={() => setShowDnBatchModal(false)}><X size={16} /></button>
                    </div>

                    {dnBatchWarnings.missingSupplier.length > 0 && (
                      <div className="mb-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Default supplier belum diisi untuk item: {Array.from(new Set(dnBatchWarnings.missingSupplier)).slice(0, 5).join(', ')}
                        {dnBatchWarnings.missingSupplier.length > 5 ? ' ...' : ''}
                      </div>
                    )}
                    {dnBatchWarnings.invalidRole.length > 0 && (
                      <div className="mb-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                        Supplier bukan role Delivery Note untuk item: {Array.from(new Set(dnBatchWarnings.invalidRole)).slice(0, 5).join(', ')}
                        {dnBatchWarnings.invalidRole.length > 5 ? ' ...' : ''}
                      </div>
                    )}

                    {dnBatchGroups.length === 1 && (
                      <div className="mb-3 text-xs text-slate-600">
                        Will generate DN for <span className="font-semibold">{dnBatchGroups[0].supplierLabel}</span> - {dnBatchGroups[0].count} items.
                      </div>
                    )}

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {dnBatchGroups.map((group) => (
                        <div key={group.supplierKey} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-sm">{group.supplierLabel}</div>
                            <div className="text-xs text-slate-500">{group.count} items</div>
                          </div>
                          <textarea
                            className="border p-2 rounded text-xs w-full min-h-[80px]"
                            placeholder="Remarks / Catatan (optional)"
                            value={dnBatchRemarks[group.supplierKey] || ''}
                            onChange={(e) => setDnBatchRemarks((prev) => ({
                              ...prev,
                              [group.supplierKey]: e.target.value,
                            }))}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button type="button" onClick={() => setShowDnBatchModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                      <button
                        type="button"
                        className="px-3 py-2 text-sm bg-indigo-600 text-white rounded"
                        onClick={async () => {
                          const remarksBySupplier = {};
                          dnBatchGroups.forEach((group) => {
                            const text = String(dnBatchRemarks[group.supplierKey] || '').trim();
                            if (text) remarksBySupplier[group.supplierKey] = text;
                          });
                          const ok = await handleRequestDnBatch({ remarksBySupplier });
                          if (ok) {
                            setShowDnBatchModal(false);
                            setDnBatchGroups([]);
                            setDnBatchRemarks({});
                          }
                        }}
                      >
                        Confirm &amp; Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showDnPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none kanban-print-page">
                    <div className="p-4 border-b flex justify-between items-center print:hidden">
                      <div className="text-sm font-semibold">Delivery Note Preview</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const filename = buildPrintFileName('DN', dnPrintPayload?.dnNumber);
                            triggerPrintWithTitle(filename);
                          }}
                          className="px-3 py-1.5 text-xs border rounded"
                        >
                          Print / PDF
                        </button>
                        <button onClick={closeDnPrintModal} className="text-slate-500"><X size={18} /></button>
                      </div>
                    </div>
                    <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0 kanban-print-scroll">
                      {renderDnPrintDocument()}
                    </div>
                  </div>
                </div>
              )}

              {showScheduleModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Create Schedule</div>
                      <button onClick={() => setShowScheduleModal(false)}><X size={16} /></button>
                    </div>
                    <form onSubmit={handleCreateSchedule} className="space-y-3">
                      <input className="border p-2 rounded text-sm w-full" placeholder="PO Number" value={scheduleForm.poNumber} onChange={(e) => setScheduleForm({ ...scheduleForm, poNumber: e.target.value })} />
                      <input type="date" className="border p-2 rounded text-sm w-full" value={scheduleForm.requestDate} onChange={(e) => setScheduleForm({ ...scheduleForm, requestDate: e.target.value })} />
                      <input className="border p-2 rounded text-sm w-full" placeholder="Delivery Time" value={scheduleForm.deliveryTime} onChange={(e) => setScheduleForm({ ...scheduleForm, deliveryTime: e.target.value })} />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowScheduleModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                        <button type="submit" className="px-3 py-2 text-sm bg-sky-600 text-white rounded">Simpan</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showReceiveModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Receive / RN</div>
                      <button onClick={() => setShowReceiveModal(false)}><X size={16} /></button>
                    </div>
                    <form onSubmit={handleReceive} className="space-y-3">
                      <input
                        className="border p-2 rounded text-sm w-full bg-slate-50 text-slate-500"
                        placeholder="RN Number (auto by config)"
                        value={receiveForm.rnNumber}
                        onChange={(e) => setReceiveForm({ ...receiveForm, rnNumber: e.target.value })}
                        readOnly
                        disabled
                      />
                      <input className="border p-2 rounded text-sm w-full" placeholder="DO Number" value={receiveForm.doNumber} onChange={(e) => setReceiveForm({ ...receiveForm, doNumber: e.target.value })} />
                      <input type="date" className="border p-2 rounded text-sm w-full" value={receiveForm.arrivalDate} onChange={(e) => setReceiveForm({ ...receiveForm, arrivalDate: e.target.value })} />
                      <input type="date" className="border p-2 rounded text-sm w-full" placeholder="Production Date" value={receiveForm.productionDate} onChange={(e) => setReceiveForm({ ...receiveForm, productionDate: e.target.value })} />
                      <input type="date" className="border p-2 rounded text-sm w-full" placeholder="Expired Date (optional)" value={receiveForm.expiredDate} onChange={(e) => setReceiveForm({ ...receiveForm, expiredDate: e.target.value })} />
                      <input type="number" className="border p-2 rounded text-sm w-full" placeholder="Qty Dokumen" value={receiveForm.docQty} onChange={(e) => setReceiveForm({ ...receiveForm, docQty: e.target.value })} />
                      <input type="number" className="border p-2 rounded text-sm w-full" placeholder="Qty Fisik" value={receiveForm.receivedQty} onChange={(e) => setReceiveForm({ ...receiveForm, receivedQty: e.target.value })} />
                      <select className="border p-2 rounded text-sm w-full" value={receiveForm.qcStatus} onChange={(e) => setReceiveForm({ ...receiveForm, qcStatus: e.target.value })}>
                        {(qcStatusOptions.length > 0 ? qcStatusOptions : ['OK', 'HOLD', 'REJECT']).map((status) => (
                          <option key={status} value={status.toLowerCase()}>
                            {status.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowReceiveModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-orange-600 text-white rounded disabled:opacity-60"
                          disabled={isStockOpnameLocked}
                        >
                          Simpan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showManualRequestModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-md p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">Create Manual Request</div>
                        <div className="text-xs text-slate-500">Create a manual kanban request</div>
                      </div>
                      <button onClick={() => setShowManualRequestModal(false)}><X size={16} /></button>
                    </div>
                    <form onSubmit={handleManualRequest} className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Kanban ID *</label>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="e.g., KB-RM-000124"
                            value={manualRequestForm.kanbanId}
                            onChange={(e) => setManualRequestForm({ ...manualRequestForm, kanbanId: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Item Code *</label>
                          <input
                            className="border p-2 rounded w-full text-sm"
                            placeholder="e.g., RM-STKM11AH-22216"
                            value={manualRequestForm.itemCode}
                            onChange={(e) => setManualRequestForm({ ...manualRequestForm, itemCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Trigger Type</label>
                          <select
                            className="border p-2 rounded w-full text-sm"
                            value={manualRequestForm.triggerType}
                            onChange={(e) => setManualRequestForm({ ...manualRequestForm, triggerType: e.target.value })}
                          >
                            <option value="manual">Manual</option>
                            <option value="scan">Scan Card</option>
                            <option value="auto">Stock &lt; Min</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">On Hand Trigger *</label>
                          <input
                            type="number"
                            className="border p-2 rounded w-full text-sm"
                            placeholder="e.g., 25"
                            value={manualRequestForm.onHand}
                            onChange={(e) => setManualRequestForm({ ...manualRequestForm, onHand: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Suggested Qty *</label>
                        <input
                          type="number"
                          className="border p-2 rounded w-full text-sm"
                          placeholder="e.g., 60"
                          value={manualRequestForm.requestQty}
                          onChange={(e) => setManualRequestForm({ ...manualRequestForm, requestQty: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="submit" className="flex-1 px-3 py-2 text-sm bg-slate-900 text-white rounded">Create Request</button>
                        <button type="button" onClick={() => setShowManualRequestModal(false)} className="px-3 py-2 text-sm border rounded">Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {showQrModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">QR Kanban</div>
                      <button onClick={() => setShowQrModal(false)}><X size={16} /></button>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-xs text-slate-500">{qrTitle}</div>
                      <QRCodeCanvas value={qrPayload || 'KANBAN'} size={180} />
                      <div className="text-[10px] text-slate-400">Payload: {qrPayload || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              {showBatchModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Input Batch Kanban Kosong</div>
                      <button onClick={() => setShowBatchModal(false)}><X size={16} /></button>
                    </div>
                    <form onSubmit={handleBatchSubmit} className="space-y-3 text-sm">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Area/Lini</label>
                        <select
                          className="border p-2 rounded w-full text-sm"
                          value={batchForm.area}
                          onChange={(e) => setBatchForm({ ...batchForm, area: e.target.value })}
                        >
                          <option value="">Pilih area/lini</option>
                          {masterAreas.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.id} - {area.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Daftar ID Kanban</label>
                        <textarea
                          className="border p-2 rounded w-full text-sm"
                          rows={6}
                          placeholder="KB-RM-000124&#10;KB-IM-000089&#10;KB-CS-000034"
                          value={batchForm.kanbanIds}
                          onChange={(e) => setBatchForm({ ...batchForm, kanbanIds: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowBatchModal(false)} className="px-3 py-2 text-sm border rounded">Batal</button>
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-slate-900 text-white rounded disabled:opacity-60"
                          disabled={isStockOpnameLocked}
                        >
                          Proses
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
            <div className="report-print-host print-only">
              <div className="bg-white rounded-xl border p-4 report-print-scope">
                {renderProductionReportHeader(
                  'Laporan Produksi',
                  productionCompareStart,
                  productionCompareEnd,
                  productionCompareCode || localProductionCompareCode,
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-2 text-left">No</th>
                        <th className="p-2 text-left">Tanggal Produksi</th>
                        <th className="p-2 text-left">Uniq / Part Number</th>
                        <th className="p-2 text-left">Part Name</th>
                        <th className="p-2 text-right">Qty Produksi</th>
                        <th className="p-2 text-right">Qty Kanban Request</th>
                        <th className="p-2 text-right">Variance</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionReportRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-3 text-center text-slate-400">Belum ada data komparasi.</td>
                        </tr>
                      )}
                      {productionReportRows.map((row) => {
                        const match = row.status === 'MATCH';
                        return (
                          <tr key={`print-${row.productionDate}-${row.itemCode}-${row.no}`} className={match ? '' : 'bg-red-50'}>
                            <td className="p-2">{row.no}</td>
                            <td className="p-2">{row.productionDate}</td>
                            <td className="p-2">{row.uniqLabel}</td>
                            <td className="p-2">{row.itemName}</td>
                            <td className="p-2 text-right">{formatNumber0(row.productionQty)}</td>
                            <td className="p-2 text-right">{formatNumber0(row.kanbanQty)}</td>
                            <td className={`p-2 text-right ${match ? '' : 'text-red-600 font-semibold'}`}>{formatNumber0(row.diffQty)}</td>
                            <td className={`p-2 ${match ? 'text-emerald-600' : 'text-red-600 font-semibold'}`}>{row.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderProductionReportSignatures()}
                <div className="report-page-footer print-only" />
              </div>
            </div>
              </>
            )}
    </>
  );
};

export default TabKanban;
