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
  RotateCcw,
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
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';

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

const normalizeKanbanIdDisplay = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const payload = JSON.parse(trimmed);
      return normalizeKanbanIdDisplay(payload?.kanbanId || payload?.kanban_id || payload?.cardUid || payload?.card_uid || payload?.itemCode || payload?.item_code || payload?.uniq || trimmed);
    } catch (_error) {
      return trimmed;
    }
  }
  for (let len = 1; len <= Math.floor(trimmed.length / 2); len += 1) {
    if (trimmed.length % len !== 0) continue;
    const prefix = trimmed.slice(0, len);
    if (prefix.repeat(trimmed.length / len) === trimmed) return prefix;
  }
  return trimmed;
};

const TabKanban = (props) => {
  const {
    apiFetch,
    batchForm,
    buildKanbanId,
    buildKanbanDisplayId,
    canImportExport,
    canEditSchedules,
    canDeleteRecords,
    canProduction,
    closeDnDetailModal,
    closeDnPrintModal,
    consumeQty,
    consumeStockFromScan,
    createRequestFromScan,
    deliveryNotes,
    deliveryNotesLoading,
    dnDetailEditable,
    dnDetailEdits,
    dnHeaderEdits,
    dnDetailLoading,
    dnDetailRows,
    dnForm,
    dnPrintLoading,
    dnPrintPayload,
    dnPrintMode,
    dnEmailSendingId,
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
    handleApproveKanban,
    handleBatchApproveKanban,
    handleBatchApproveAndDn,
    handleApproveAndCreateDn,
    handleBatchSubmit,
    handleCreateDn,
    handleCreateSchedule,
    handleDeleteDn,
    handleDeleteKanbanRequest,
    handleDnDetailSave,
    handleForceCloseDn,
    handleDnEmail,
    isDnEmailSent,
    handleDnPreview,
    handleDnPrintPdf,
    handleEmptyKanbanScanValue,
    handleEmptyKanbanSubmit,
    handleManualRequest,
    queueManualRequestFromForm,
    closeManualRequestModal,
    updateManualRequestQueueRow,
    handleProcessScan,
    handleReceive,
    handleRejectKanban,
    handleRequestDnBatch,
    handleSaveKanbanSetting,
    handleGenerateKanbanFromMasterItems,
    handleKanbanProcessStart,
    handleKanbanProcessFinish,
    items,
    itemSupplierMap,
    kanbanCategory,
    kanbanCategoryFilter,
    kanbanDashboardCategoryFilter,
    kanbanDnFilters,
    kanbanDnPaginationMeta,
    kanbanDnStatusOptions,
    kanbanDnSupplierOptions,
    kanbanEditMode,
    kanbanEmptyPaginationMeta,
    kanbanError,
    kanbanLoading,
    kanbanPaginationMeta,
    kanbanRequestStatusFilter,
    kanbanRequestCategoryFilter,
    kanbanRequestFlowFilter,
    kanbanRequestQuickFilter,
    kanbanRequestFilters,
    kanbanReceivingPaginationMeta,
    kanbanRequests,
    getKanbanRequestHealth,
    getKanbanRequestCategoryMeta,
    getKanbanRequestFlowMeta,
    kanbanSearch,
    kanbanSettings,
    kanbanSettingsByCode,
    kanbanSettingsForm,
    kanbanSubTab,
    kanbanView,
    isStockOpnameLocked,
    incomingQuickAction,
    mainTab,
    manualRequestForm,
    manualRequestQueue,
    setManualRequestQueue,
    masterAreas,
    masterDeliveries,
    masterCategories,
    masterItems,
    masterItemsByCode,
    masterLocations,
    masterLocationsById,
    masterPlants,
    masterVendors,
    masterWarehouses,
    user,
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
    receiveNotes,
    receiveNotesLoading,
    rnDateEnd,
    rnDateStart,
    rnSearch,
    rnStatus,
    renderPaginationControls,
    resolveVendorFromSupplier,
    scanActiveResult,
    scanError,
    scanCameraStatus,
    scanHistory,
    scanInput,
    scanMode,
    scanResults,
    scanVideoRef,
    startScanner,
    stopScanner,
    scheduleForm,
    selectedKanban,
    selectedDnDetail,
    selectedRequestIds,
    setMainTab,
    setMasterRefTab,
    setBatchForm,
    setConsumeQty,
    setDnDetailEdits,
    setDnForm,
    setDnHeaderEdits,
    setEmptyKanbanForm,
    setKanbanCategory,
    setKanbanCategoryFilter,
    setKanbanDashboardCategoryFilter,
    setKanbanDnFilters,
    setKanbanEditMode,
    setKanbanRequestStatusFilter,
    setKanbanRequestCategoryFilter,
    setKanbanRequestFlowFilter,
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
    setReportTab,
    setScanCameraEnabled,
    setScanError,
    setScanInput,
    setScanMode,
    setScheduleForm,
    setTablePagination,
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

  const getDisplayPrlQty = (row) => row?.effective_prl_qty ?? row?.prl_month_qty;
  const updateKanbanDnFilter = (key, value) => {
    setKanbanDnFilters?.((prev) => ({
      ...(prev || {}),
      [key]: value,
    }));
    setTablePagination?.((prev) => ({
      ...prev,
      kanbanDn: { ...(prev.kanbanDn || {}), page: 1 },
    }));
  };
  const resetKanbanDnFilters = () => {
    setKanbanDnFilters?.({ search: '', supplier: 'all', status: 'all' });
    setTablePagination?.((prev) => ({
      ...prev,
      kanbanDn: { ...(prev.kanbanDn || {}), page: 1 },
    }));
  };
  const parseDnDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };
  const formatDnDate = (value) => {
    const date = parseDnDateOnly(value);
    return date ? date.toLocaleDateString('id-ID') : '-';
  };
  const getDnDateInputValue = (value) => String(value || '').slice(0, 10);
  const getTodayDnDateInput = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const compareDnDateInput = (left, right) => {
    const a = getDnDateInputValue(left);
    const b = getDnDateInputValue(right);
    if (!a || !b) return null;
    return a.localeCompare(b);
  };
  const normalizeDnDeliveryType = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'urgent') return 'urgent';
    if (raw === 'additional') return 'additional';
    return 'normal';
  };
  const getDnDeliveryTypeForDisplay = (dn) => {
    const type = normalizeDnDeliveryType(dn?.delivery_type || dn?.deliveryType);
    if (type !== 'normal') return type;
    const remarksText = String(dn?.remarks || '').toLowerCase();
    if (remarksText.includes('urgent')) return 'urgent';
    if (remarksText.includes('additional')) return 'additional';
    return compareDnDateInput(dn?.planned_date || dn?.plannedDate, dn?.created_at || dn?.createdAt) === 0 ? 'additional' : 'normal';
  };
  const getDnArrivalWarning = (dn) => {
    const status = String(dn?.status || '').trim().toLowerCase();
    const doneStatuses = new Set(['closed', 'received', 'done', 'cancelled']);
    if (doneStatuses.has(status)) return null;
    const hasEmailBeenSent = typeof isDnEmailSent === 'function'
      ? isDnEmailSent(dn)
      : Boolean(dn?.email_sent_at || dn?.emailSentAt || Number(dn?.email_send_count || dn?.emailSendCount || 0) > 0 || status === 'sent');
    if (!hasEmailBeenSent && !['sent', 'in_transit', 'partial'].includes(status)) {
      return { label: 'DN has not been emailed to supplier', className: 'border-sky-200 bg-sky-50 text-sky-700' };
    }
    const planned = parseDnDateOnly(dn?.planned_date || dn?.plannedDate);
    if (!planned) {
      return { label: 'Planned delivery date is not set', className: 'border-slate-200 bg-slate-50 text-slate-600' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    planned.setHours(0, 0, 0, 0);
    const diffDays = Math.round((planned.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      return { label: `Delivery overdue by ${Math.abs(diffDays)} day(s)`, className: 'border-rose-200 bg-rose-50 text-rose-700' };
    }
    if (diffDays === 0) {
      return { label: 'Delivery scheduled for today', className: 'border-amber-200 bg-amber-50 text-amber-700' };
    }
    if (diffDays === 1) {
      return { label: 'Delivery scheduled for tomorrow', className: 'border-orange-200 bg-orange-50 text-orange-700' };
    }
    return null;
  };
  const masterVendorById = useMemo(() => {
    const map = new Map();
    (masterVendors || []).forEach((vendor) => {
      const id = String(vendor?.id || '').trim();
      if (id) map.set(id, vendor);
    });
    return map;
  }, [masterVendors]);
  const resolveMasterItemSupplier = (itemCode) => {
    const code = String(itemCode || '').trim();
    const relations = itemSupplierMap?.get(code) || [];
    const primaryRelation = [...relations].sort((left, right) => Number(right.sharePercent || 0) - Number(left.sharePercent || 0))[0] || null;
    const item = masterItemsByCode.get(code);
    const supplierRaw = String(primaryRelation?.vendorId || item?.vendor_id || '').trim();
    const vendor = (supplierRaw && masterVendorById.get(supplierRaw))
      || (masterVendors || []).find((row) => String(row?.name || '').trim().toLowerCase() === String(primaryRelation?.vendorName || item?.supplier_name || '').trim().toLowerCase())
      || null;
    const supplierCode = String(vendor?.id || primaryRelation?.vendorId || supplierRaw || '').trim();
    const supplierName = String(vendor?.name || primaryRelation?.vendorName || item?.supplier_name || '').trim();
    return {
      supplierCode,
      supplierName,
      supplier: supplierCode || supplierName || '',
      label: supplierName && supplierCode && supplierName !== supplierCode ? `${supplierName} (${supplierCode})` : supplierName || supplierCode || '-',
      role: vendor?.role || '',
      vendor,
    };
  };
  const isScheduleVendorRole = (role) => String(role || '').trim().toLowerCase() === 'schedule';
  const resolveRequestVendor = (row = {}) => {
    const directSupplier = row.supplier_id
      || row.supplier
      || row.supplier_name
      || row.supplierName
      || row.default_supplier
      || '';
    const directVendor = resolveVendorFromSupplier?.(directSupplier);
    if (directVendor) return directVendor;
    return resolveMasterItemSupplier(row.item_code || row.itemCode || row.item || '').vendor || null;
  };
  const getRequestSupplierMeta = (row = {}) => {
    const itemCode = row.item_code || row.itemCode || row.item || '';
    const supplierMeta = resolveMasterItemSupplier(itemCode);
    const vendor = resolveRequestVendor(row) || supplierMeta.vendor || null;
    const supplierCode = String(vendor?.id || supplierMeta.supplierCode || '').trim();
    const supplierName = String(vendor?.name || supplierMeta.supplierName || '').trim();
    return {
      vendor,
      supplierCode,
      supplierName,
      codeLabel: supplierCode || supplierName || '-',
      label: supplierName && supplierCode && supplierName !== supplierCode
        ? `${supplierCode} - ${supplierName}`
        : supplierCode || supplierName || '-',
    };
  };
  const [schedulePoRows, setSchedulePoRows] = useState([]);
  const [schedulePoLoading, setSchedulePoLoading] = useState(false);
  const [schedulePoError, setSchedulePoError] = useState('');
  const scheduleRequestSupplier = getRequestSupplierMeta(selectedKanban || {});
  const schedulePoOptions = useMemo(() => (
    (schedulePoRows || []).map((row) => {
      const poNumber = row.po_number || row.poNumber || '';
      const supplierCode = row.supplier_code || row.supplierCode || '';
      const supplierName = row.supplier_name || row.supplierName || '';
      const poDate = row.po_date ? new Date(row.po_date).toLocaleDateString('id-ID') : '-';
      const remaining = row.total_qty_remaining ?? row.totalQtyRemaining;
      const remainingText = Number.isFinite(Number(remaining)) ? ` | Sisa ${formatNumber2(remaining)}` : '';
      return {
        ...row,
        value: poNumber,
        label: `${poNumber} | ${supplierCode}${supplierName ? ` - ${supplierName}` : ''} | ${poDate}${remainingText}`,
      };
    }).filter((row) => row.value)
  ), [schedulePoRows, formatNumber2]);
  useEffect(() => {
    if (!showScheduleModal) {
      setSchedulePoRows([]);
      setSchedulePoError('');
      setSchedulePoLoading(false);
      return undefined;
    }
    const itemCode = String(selectedKanban?.item_code || selectedKanban?.itemCode || selectedKanban?.item || '').trim();
    const supplierCode = scheduleRequestSupplier.supplierCode;
    if (!itemCode || !supplierCode) {
      setSchedulePoRows([]);
      setSchedulePoError('Item atau supplier request belum lengkap.');
      return undefined;
    }
    let cancelled = false;
    const loadSchedulePoRows = async () => {
      setSchedulePoLoading(true);
      setSchedulePoError('');
      try {
        const params = new URLSearchParams({
          status: 'open,partial',
          openOnly: '1',
          includeTotal: '1',
          limit: '500',
          itemCode,
          supplierId: supplierCode,
        });
        const payload = await apiFetch(`/api/po?${params.toString()}`);
        const rows = Array.isArray(payload?.rows) ? payload.rows : (Array.isArray(payload) ? payload : []);
        if (cancelled) return;
        setSchedulePoRows(rows);
        setScheduleForm((prev) => {
          const options = rows.map((row) => String(row.po_number || row.poNumber || '').trim()).filter(Boolean);
          if (prev.poNumber && options.includes(prev.poNumber)) return prev;
          return { ...prev, poNumber: options.length === 1 ? options[0] : '' };
        });
      } catch (error) {
        if (cancelled) return;
        setSchedulePoRows([]);
        setSchedulePoError(error.message || 'Gagal memuat PO aktif.');
      } finally {
        if (!cancelled) setSchedulePoLoading(false);
      }
    };
    loadSchedulePoRows();
    return () => {
      cancelled = true;
    };
  }, [
    apiFetch,
    scheduleRequestSupplier.supplierCode,
    selectedKanban?.id,
    selectedKanban?.item_code,
    selectedKanban?.itemCode,
    selectedKanban?.item,
    setScheduleForm,
    showScheduleModal,
  ]);
  const isProductionUser = String(user?.role || '').trim().toLowerCase() === 'production';
  const canOpenDeliveryTab = canEditSchedules;
  const getLockedActionTitle = (allowed, label) => (allowed ? label : `${label} - tidak tersedia untuk role ini`);
  const getLockedButtonClassName = (baseClassName, disabled) => `${baseClassName}${disabled ? ' opacity-50 cursor-not-allowed' : ''}`;
  const planningTabs = [
    { key: 'delivery', label: 'Delivery', disabled: !canOpenDeliveryTab, disabledTitle: 'Delivery hanya tersedia untuk role schedule.' },
    { key: 'production', label: 'Produksi', disabled: !canProduction, disabledTitle: 'Produksi hanya tersedia untuk role produksi.' },
  ];
  const planningDefaultTab = planningTabs.find((tab) => !tab.disabled)?.key || 'delivery';
  const kanbanBoardTabs = isProductionUser
    ? [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'empty', label: 'Kanban Kosong' },
      { key: 'production', label: 'Produksi' },
      { key: 'scan', label: 'Scan QR' },
    ]
    : [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'items', label: 'Kanban Items' },
      { key: 'requests', label: 'Requests' },
      { key: 'dn', label: 'DN Register' },
      { key: 'receiving', label: 'Receiving Notes' },
      { key: 'empty', label: 'Kanban Kosong' },
      { key: 'scan', label: 'Scan QR' },
    ];
  const emptyLogRef = useRef(null);
  const emptyKanbanInputRef = useRef(null);
  const scanManualInputRef = useRef(null);
  const [emptyScrollTop, setEmptyScrollTop] = useState(0);
  const [emptyListSize, setEmptyListSize] = useState({ height: 320, width: 0 });
  const emptyRowHeight = 44;
  const emptyOverscan = 6;
  const emptyLogGrid = useMemo(
    () => '160px 180px minmax(220px, 1.4fr) 150px 90px minmax(220px, 1.2fr) 140px 120px 120px 140px 180px',
    [],
  );
  const emptyLogRows = useMemo(() => kanbanEmptyPaginationMeta.rows || [], [kanbanEmptyPaginationMeta.rows]);
  const requestStatusOptions = useMemo(() => ([
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'production_ready', label: 'WO Released' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'dn_created', label: 'DN Created' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'receiving', label: 'Receiving/QC' },
    { value: 'fifo', label: 'FIFO' },
    { value: 'closed', label: 'Closed' },
  ]), []);
  const requestQuickFilterOptions = useMemo(() => ([
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'blocked', label: 'Over PRL' },
    { value: 'stock-gap', label: 'Stock Gap' },
  ]), []);
  const requestCategoryFilterOptions = useMemo(() => ([
    { value: 'all', label: 'All Category' },
    { value: 'rm', label: 'RM' },
    { value: 'child', label: 'Child Part' },
    { value: 'subassy', label: 'Subassy' },
    { value: 'fg', label: 'FG' },
  ]), []);
  const requestFlowFilterOptions = useMemo(() => ([
    { value: 'all', label: 'All Flow' },
    { value: 'supplier-dn', label: 'Supplier DN' },
    { value: 'production', label: 'Production' },
    { value: 'subcon', label: 'Subcon' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'blocked', label: 'Blocked' },
  ]), []);
  const resolveRequestFlowMeta = (row) => {
    if (typeof getKanbanRequestFlowMeta === 'function') return getKanbanRequestFlowMeta(row);
    const category = typeof getKanbanRequestCategoryMeta === 'function'
      ? getKanbanRequestCategoryMeta(row)
      : { key: 'other', label: row?.item_type || 'Unmapped' };
    return {
      key: 'blocked',
      label: 'Review Master',
      actionLabel: 'Review Master',
      category,
      canCreateDn: false,
      reason: 'Request flow is not available.',
    };
  };
  const getRequestFlowBadgeClass = (key) => {
    if (key === 'supplier-dn') return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    if (key === 'production') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (key === 'subcon') return 'border-violet-200 bg-violet-50 text-violet-700';
    if (key === 'schedule') return 'border-sky-200 bg-sky-50 text-sky-700';
    return 'border-amber-200 bg-amber-50 text-amber-700';
  };
  const [localKanbanSearch, setLocalKanbanSearch] = useState(kanbanSearch || '');
  const [localRnSearch, setLocalRnSearch] = useState(rnSearch || '');
  const [kanbanAnalysisRow, setKanbanAnalysisRow] = useState(null);
  const deliveryUploadInputRef = useRef(null);
  const [deliveryUploads, setDeliveryUploads] = useState([]);
  const [deliveryUploadsLoading, setDeliveryUploadsLoading] = useState(false);
  const [deliveryUploadsError, setDeliveryUploadsError] = useState('');
  const [deliveryUploadLoading, setDeliveryUploadLoading] = useState(false);
  const [deliveryUploadError, setDeliveryUploadError] = useState('');
  const [deliveryUploadResult, setDeliveryUploadResult] = useState(null);
  const [deliveryWorkflowTab, setDeliveryWorkflowTab] = useState('upload-dn');
  const [selectedDeliveryUploadId, setSelectedDeliveryUploadId] = useState(null);
  const [customerShipments, setCustomerShipments] = useState([]);
  const [customerShipmentsLoading, setCustomerShipmentsLoading] = useState(false);
  const [customerShipmentsError, setCustomerShipmentsError] = useState('');
  const [customerShipmentCreatingId, setCustomerShipmentCreatingId] = useState(null);
  const [selectedCustomerShipmentId, setSelectedCustomerShipmentId] = useState(null);
  const [customerShipmentScanValue, setCustomerShipmentScanValue] = useState('');
  const [customerShipmentScanLoading, setCustomerShipmentScanLoading] = useState(false);
  const [customerShipmentConfirmingId, setCustomerShipmentConfirmingId] = useState(null);
  const [dnActionMenuOpen, setDnActionMenuOpen] = useState(null);
  const kanbanActiveStatusMeta = useMemo(() => ([
    {
      key: 'triggered',
      label: 'Triggered',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      shortLabel: 'Menunggu action',
      nextAction: 'Review request',
    },
    {
      key: 'requested',
      label: 'Requested',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      shortLabel: 'Antrian request',
      nextAction: 'Approve / reject',
    },
    {
      key: 'approved',
      label: 'Approved',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      shortLabel: 'Siap DN',
      nextAction: 'Create DN',
    },
    {
      key: 'production_ready',
      label: 'WO Released',
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      shortLabel: 'Menunggu aktual',
      nextAction: 'Konfirmasi aktual',
    },
    {
      key: 'dn_created',
      label: 'DN Issued',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      shortLabel: 'DN terbit',
      nextAction: 'Create schedule',
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      shortLabel: 'Jadwal jalan',
      nextAction: 'Monitor dispatch',
    },
    {
      key: 'in_transit',
      label: 'In Transit',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      shortLabel: 'Sedang perjalanan',
      nextAction: 'Prepare receiving',
    },
    {
      key: 'receiving',
      label: 'Receiving/QC',
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
      shortLabel: 'Proses inbound',
      nextAction: 'Finalize receiving',
    },
  ]), []);
  const kanbanActiveStatusSet = useMemo(() => new Set(kanbanActiveStatusMeta.map((meta) => meta.key)), [kanbanActiveStatusMeta]);
  const deliveryUploadsById = useMemo(() => {
    const map = new Map();
    deliveryUploads.forEach((row) => {
      if (row?.id != null) map.set(Number(row.id), row);
    });
    return map;
  }, [deliveryUploads]);
  const selectedDeliveryUpload = useMemo(() => {
    const selectedId = Number(selectedDeliveryUploadId || 0);
    if (selectedId > 0 && deliveryUploadsById.has(selectedId)) return deliveryUploadsById.get(selectedId);
    if (deliveryUploadResult?.id && deliveryUploadsById.has(Number(deliveryUploadResult.id))) {
      return deliveryUploadsById.get(Number(deliveryUploadResult.id));
    }
    return deliveryUploads[0] || deliveryUploadResult || null;
  }, [deliveryUploads, deliveryUploadsById, deliveryUploadResult, selectedDeliveryUploadId]);
  const selectedDeliveryUploadItems = useMemo(() => {
    if (!selectedDeliveryUpload) return [];
    return Array.isArray(selectedDeliveryUpload.items) ? selectedDeliveryUpload.items : [];
  }, [selectedDeliveryUpload]);
  const lastDeliveryUploadItems = useMemo(() => {
    return Array.isArray(deliveryUploadResult?.items) ? deliveryUploadResult.items : [];
  }, [deliveryUploadResult]);
  const customerShipmentsByUploadId = useMemo(() => {
    const map = new Map();
    customerShipments.forEach((row) => {
      const uploadId = Number(row?.deliveryUploadId ?? row?.delivery_upload_id ?? 0);
      if (uploadId > 0) map.set(uploadId, row);
    });
    return map;
  }, [customerShipments]);
  const customerShipmentSummary = useMemo(() => {
    return customerShipments.reduce((acc, row) => {
      acc.total += 1;
      acc.totalQty += Number(row?.totalQty ?? row?.total_qty ?? 0);
      const status = String(row?.status || '').toLowerCase();
      if (status === 'reserved') acc.reserved += 1;
      if (status === 'picked') acc.picked += 1;
      if (status === 'loaded' || status === 'sj_created' || status === 'printed') acc.loaded += 1;
      return acc;
    }, { total: 0, totalQty: 0, reserved: 0, picked: 0, loaded: 0 });
  }, [customerShipments]);
  const selectedCustomerShipment = useMemo(() => {
    const selectedId = Number(selectedCustomerShipmentId || 0);
    if (selectedId > 0) {
      const found = customerShipments.find((row) => Number(row?.id || 0) === selectedId);
      if (found) return found;
    }
    return customerShipments[0] || null;
  }, [customerShipments, selectedCustomerShipmentId]);
  const deliveryUploadSummary = useMemo(() => {
    return deliveryUploads.reduce((acc, row) => {
      const status = String(row?.status || '').trim().toLowerCase();
      acc.total += 1;
      acc.orderQty += Number(row?.total_qty_order || 0);
      acc.fulfilledQty += Number(row?.total_qty_fulfilled || 0);
      acc.shortageQty += Number(row?.total_qty_shortage || 0);
      if (status === 'full') acc.full += 1;
      if (status === 'partial_backorder') acc.partial += 1;
      return acc;
    }, { total: 0, full: 0, partial: 0, orderQty: 0, fulfilledQty: 0, shortageQty: 0 });
  }, [deliveryUploads]);
  const kanbanActiveRows = useMemo(
    () => kanbanRequests.filter((row) => kanbanActiveStatusSet.has(String(row?.status || '').trim().toLowerCase())),
    [kanbanRequests, kanbanActiveStatusSet],
  );
  const resolveKanbanDashboardCategory = (row) => {
    const masterItem = masterItemsByCode.get(row?.item_code);
    const rawText = String(row?.item_type || masterItem?.type || masterItem?.category || '').trim();
    const rawValue = rawText.toLowerCase();
    if (!rawValue) return 'unknown';
    const masterCategory = (masterCategories || []).find((category) => {
      const code = String(category?.code || '').trim().toLowerCase();
      const name = String(category?.name || '').trim().toLowerCase();
      return rawValue === code || rawValue === name;
    });
    if (masterCategory?.code) return String(masterCategory.code).trim().toLowerCase();
    if (rawValue.includes('raw')) return 'raw';
    if (rawValue.includes('indirect')) return 'indirect';
    if (rawValue.includes('consum')) return 'consumable';
    if (rawValue.includes('subcon')) return 'subcon';
    if (rawValue.includes('sub assy') || rawValue.includes('subassy') || rawValue === 'sa') return 'subassy';
    if (rawValue.includes('child part') || rawValue === 'cp' || rawValue.startsWith('cp')) return 'cp';
    return rawValue;
  };
  const kanbanDashboardCategoryOptions = useMemo(() => {
    const masterOptions = (masterCategories || [])
      .map((category) => {
        const code = String(category?.code || '').trim();
        const name = String(category?.name || '').trim();
        if (!code && !name) return null;
        return { value: (code || name).toLowerCase(), label: [code, name].filter(Boolean).join(' - ') };
      })
      .filter(Boolean);
    if (masterOptions.length > 0) return [{ value: 'all', label: 'Semua Kategori' }, ...masterOptions];
    return [
      { value: 'all', label: 'Semua Kategori' },
      { value: 'raw', label: 'Raw Material' },
      { value: 'indirect', label: 'Indirect Material' },
      { value: 'consumable', label: 'Consumable' },
      { value: 'subcon', label: 'Subcon' },
    ];
  }, [masterCategories]);
  const kanbanDashboardCategoryCounts = useMemo(() => (
    kanbanActiveRows.reduce((acc, row) => {
      const key = resolveKanbanDashboardCategory(row);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ), [kanbanActiveRows, masterItemsByCode]);
  const kanbanDashboardRows = useMemo(() => {
    const filterKey = String(kanbanDashboardCategoryFilter || 'all').trim().toLowerCase();
    if (filterKey === 'all') return kanbanActiveRows;
    return kanbanActiveRows.filter((row) => resolveKanbanDashboardCategory(row) === filterKey);
  }, [kanbanActiveRows, kanbanDashboardCategoryFilter, masterItemsByCode]);
  const kanbanOperationalSummary = useMemo(() => {
    const summary = {
      active: 0,
      pending: 0,
      approved: 0,
      inFlow: 0,
      receiving: 0,
      blocked: 0,
      overdue: 0,
      oldestAge: 0,
      oldestLabel: '-',
    };
    kanbanDashboardRows.forEach((row) => {
      const health = getKanbanRequestHealth(row);
      const statusKey = String(row?.status || '').trim().toLowerCase();
      summary.active += 1;
      if (['triggered', 'requested'].includes(statusKey)) summary.pending += 1;
      if (statusKey === 'approved') summary.approved += 1;
      if (['dn_created', 'scheduled', 'in_transit'].includes(statusKey)) summary.inFlow += 1;
      if (statusKey === 'receiving') summary.receiving += 1;
      if (health.isOverPrl) summary.blocked += 1;
      if (health.isOverdue) summary.overdue += 1;
      if (health.ageHours >= summary.oldestAge) {
        summary.oldestAge = health.ageHours;
        summary.oldestLabel = `${row.item_code || '-'} • ${getRequestIdLabel(row)}`;
      }
    });
    return summary;
  }, [kanbanDashboardRows, getKanbanRequestHealth, getRequestIdLabel]);
  const kanbanStatusCards = useMemo(() => kanbanActiveStatusMeta.map((meta) => {
    const rows = kanbanDashboardRows.filter((row) => String(row?.status || '').trim().toLowerCase() === meta.key);
    const enrichedRows = rows
      .map((row) => ({ row, health: getKanbanRequestHealth(row) }))
      .sort((a, b) => b.health.ageHours - a.health.ageHours || new Date(b.row.created_at || 0) - new Date(a.row.created_at || 0));
    const oldest = enrichedRows[0];
    return {
      ...meta,
      count: rows.length,
      blocked: enrichedRows.filter((entry) => entry.health.isOverPrl).length,
      overdue: enrichedRows.filter((entry) => entry.health.isOverdue).length,
      topRows: enrichedRows.slice(0, 3),
      oldestLabel: oldest ? `${getRequestIdLabel(oldest.row)} • ${formatRequestAging(oldest.health.ageHours)}` : '-',
    };
  }), [kanbanDashboardRows, kanbanActiveStatusMeta, getKanbanRequestHealth, getRequestIdLabel]);
  const kanbanActiveQueue = useMemo(() => (
    [...kanbanDashboardRows]
      .map((row) => ({ row, health: getKanbanRequestHealth(row) }))
      .sort((a, b) => b.health.ageHours - a.health.ageHours || new Date(a.row.created_at || 0) - new Date(b.row.created_at || 0))
  ), [kanbanDashboardRows, getKanbanRequestHealth]);
  function formatRequestAging(ageHours) {
    const safeHours = Number(ageHours || 0);
    if (safeHours >= 24) return `${Math.floor(safeHours / 24)}d ${safeHours % 24}h`;
    return `${safeHours}h`;
  }
  const getKanbanNextAction = (row) => {
    const statusKey = String(row?.status || '').trim().toLowerCase();
    if (statusKey === 'triggered' || statusKey === 'requested') return 'Approve / reject';
    if (statusKey === 'approved') return row?.dn_id ? 'Create schedule' : 'Create DN';
    if (statusKey === 'production_ready') return 'Konfirmasi aktual produksi';
    if (statusKey === 'dn_created') return row?.schedule_id ? 'Monitor schedule' : 'Create schedule';
    if (statusKey === 'scheduled') return 'Monitor dispatch';
    if (statusKey === 'in_transit') return 'Receiving / check-in';
    if (statusKey === 'receiving') return 'Finalize QC / close';
    if (statusKey === 'fifo') return 'Consume from FIFO';
    if (statusKey === 'closed') return 'Closed';
    if (statusKey === 'rejected') return 'Rejected';
    return '-';
  };
  const kanbanRequestHealthSummary = useMemo(() => (
    kanbanRequests.reduce((acc, row) => {
      const health = getKanbanRequestHealth(row);
      if (health.isOverdue) acc.overdue += 1;
      if (health.isOverPrl) acc.blocked += 1;
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
      if (health.isOverPrl) acc[itemCode].blocked += 1;
      if (health.hasStockGap) acc[itemCode].stockGap += 1;
      return acc;
    }, {})
  ), [kanbanRequests, getKanbanRequestHealth]);
  const getKanbanItemAndon = (row) => {
    const itemCode = String(row?.item_code || '').trim();
    const metrics = kanbanRequestHealthByItem[itemCode] || { open: 0, overdue: 0, blocked: 0, stockGap: 0 };
    const masterItem = masterItemsByCode.get(itemCode);
    const stock = Number(fifoTotalsByItemCode.get(itemCode) ?? 0);
    const min = Number(row?.min_qty ?? masterItem?.safety_stock ?? 0);
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
          ? `${metrics.blocked} over PRL request`
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
  const dnDetailScheduleRows = useMemo(
    () => resolveScheduleRowsForSupplier(selectedDnDetail?.supplier),
    [selectedDnDetail?.supplier, masterVendors],
  );
  const handleDnDetailScheduleChange = (value) => {
    const selected = dnDetailScheduleRows[Number(value)];
    if (!selected) {
      setDnHeaderEdits((prev) => ({
        ...(prev || {}),
        scheduleIndex: '',
        cycle: '',
        rit: '',
        deliveryTime: '',
      }));
      return;
    }
    setDnHeaderEdits((prev) => ({
      ...(prev || {}),
      scheduleIndex: value,
      cycle: selected.cycle || '',
      rit: selected.rit || '',
      deliveryTime: selected.time || '',
    }));
  };
  const masterItemOptions = useMemo(
    () => (Array.isArray(masterItems) ? masterItems : []).filter((item) => item?.code),
    [masterItems],
  );
  const masterVendorOptions = useMemo(
    () => (Array.isArray(masterVendors) ? masterVendors : []).filter((vendor) => vendor?.id || vendor?.name),
    [masterVendors],
  );
  const deliveryNoteVendorOptions = useMemo(() => {
    const rows = masterVendorOptions.filter((vendor) => String(vendor.role || '').trim().toLowerCase() === 'delivery note');
    return rows.length > 0 ? rows : masterVendorOptions;
  }, [masterVendorOptions]);
  const dropZoneOptions = useMemo(() => {
    const rows = [];
    const seen = new Set();
    const addOption = (value, label, source) => {
      const key = String(value || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({ value: key, label: label || key, source });
    };
    (Array.isArray(masterLocations) ? masterLocations : Array.from(masterLocationsById?.values?.() || [])).forEach((location) => {
      addOption(location.id, `${location.id}${location.category ? ` - ${location.category}` : ''}`, 'Location');
    });
    (Array.isArray(masterAreas) ? masterAreas : []).forEach((area) => {
      addOption(area.id, `${area.id}${area.name ? ` - ${area.name}` : ''}`, 'Area');
    });
    (Array.isArray(masterDeliveries) ? masterDeliveries : []).forEach((delivery) => {
      addOption(delivery.id, `${delivery.id}${delivery.area_id ? ` - ${delivery.area_id}` : ''}`, 'Delivery');
    });
    (Array.isArray(masterWarehouses) ? masterWarehouses : []).forEach((warehouse) => {
      addOption(warehouse.id, `${warehouse.id}${warehouse.name ? ` - ${warehouse.name}` : ''}`, 'Warehouse');
    });
    return rows;
  }, [masterLocations, masterLocationsById, masterAreas, masterDeliveries, masterWarehouses]);
  const allVendorScheduleOptions = useMemo(() => {
    const rows = [];
    masterVendorOptions.forEach((vendor) => {
      buildVendorScheduleRows(vendor).forEach((scheduleRow, index) => {
        const time = String(scheduleRow.time || '').trim();
        if (!time) return;
        const vendorLabel = vendor.name || vendor.id || 'Vendor';
        const detail = [
          scheduleRow.rit ? `Rit ${scheduleRow.rit}` : '',
          scheduleRow.cycle || '',
        ].filter(Boolean).join(' - ');
        rows.push({
          key: `${vendor.id || vendor.name}-${index}-${time}`,
          value: time,
          label: `${time} - ${vendorLabel}${detail ? ` (${detail})` : ''}`,
        });
      });
    });
    return rows;
  }, [masterVendorOptions]);
  const parseCycleParts = (value) => {
    const parts = String(value || '')
      .split(/[-\/x×,;\s]+/i)
      .map((part) => Number(String(part || '').trim()))
      .filter((num) => Number.isFinite(num) && num > 0);
    return {
      x: parts[0] || '',
      y: parts[1] || '',
      z: parts[2] || '',
    };
  };
  const resolveVendorCycleDefaults = (supplierValue) => {
    const supplierText = String(supplierValue || '').trim().toLowerCase();
    if (!supplierText) return { x: '1', y: '4', z: '4' };
    const vendor = (masterVendors || []).find((row) => (
      String(row?.id || '').trim().toLowerCase() === supplierText
      || String(row?.name || '').trim().toLowerCase() === supplierText
    ));
    const rows = vendor ? buildVendorScheduleRows(vendor) : [];
    const withCycle = rows.find((row) => String(row?.cycle || '').trim());
    const parsed = parseCycleParts(withCycle?.cycle || vendor?.cycle);
    return {
      x: String(parsed.x || 1),
      y: String(parsed.y || 4),
      z: String(parsed.z || 4),
    };
  };
  const syncKanbanSettingFromItem = (itemCode) => {
    const item = masterItemsByCode.get(itemCode);
    const itemSetting = kanbanSettingsByCode.get(itemCode);
    const lotQty = itemSetting?.lot_qty ?? item?.pack_qty ?? item?.packQty ?? item?.order_lot_size ?? item?.orderLotSize ?? '';
    const supplierMeta = resolveMasterItemSupplier(itemCode);
    const supplierValue = supplierMeta.supplierCode || supplierMeta.supplierName || '';
    const vendorCycle = resolveVendorCycleDefaults(supplierValue);
    setKanbanSettingsForm((prev) => ({
      ...prev,
      itemCode,
      minQty: itemSetting?.min_qty ?? item?.safety_stock ?? item?.safetyStock ?? '',
      maxQty: itemSetting?.max_qty ?? '',
      lotQty,
      leadTimeDays: itemSetting?.lead_time_days ?? item?.lead_time_days ?? item?.leadTimeDays ?? '',
      safetyFactor: itemSetting?.safety_factor ?? '',
      regularKanban: itemSetting?.regular_kanban ?? '2',
      safetyHours: itemSetting?.safety_hours ?? '48',
      workHours: itemSetting?.work_hours ?? '24',
      cycleX: itemSetting?.cycle_x ?? vendorCycle.x,
      cycleY: itemSetting?.cycle_y ?? vendorCycle.y,
      cycleZ: itemSetting?.cycle_z ?? vendorCycle.z,
      dropZone: itemSetting?.drop_zone ?? item?.location_id ?? item?.line_production ?? item?.location_name ?? '',
    }));
    const categoryValue = item?.type || itemSetting?.item_type || '';
    if (categoryValue) setKanbanCategory(categoryValue);
  };
  const syncManualRequestFromItem = (itemCode, kanbanIdValue = '') => {
    const setting = kanbanSettingsByCode.get(itemCode);
    const requestQty = Number(setting?.lot_qty || setting?.min_qty || 0);
    const onHand = Number(fifoTotalsByItemCode.get(itemCode) ?? 0);
    setManualRequestForm((prev) => ({
      ...prev,
      itemCode,
      kanbanId: kanbanIdValue || prev.kanbanId,
      onHand: String(onHand),
      requestQty: requestQty > 0 ? String(requestQty) : prev.requestQty,
    }));
  };
  const handleManualKanbanSelect = (value) => {
    const selected = kanbanSettings.find((row) => buildKanbanDisplayId(row.item_code, row.item_type, row) === value);
    if (selected?.item_code) {
      syncManualRequestFromItem(selected.item_code, value);
      return;
    }
    setManualRequestForm((prev) => ({ ...prev, kanbanId: value }));
  };
  const manualKanbanOptions = useMemo(() => (
    (kanbanSettings || []).map((row) => {
      const kanbanId = buildKanbanDisplayId(row.item_code, row.item_type, row);
      return {
        value: kanbanId,
        label: `${kanbanId} - ${row.item_code} - ${row.item_name || '-'}`,
        row,
      };
    })
  ), [kanbanSettings, buildKanbanDisplayId]);
  const openKanbanInScan = (kanbanIdValue) => {
    const kanbanId = String(kanbanIdValue || '').trim();
    if (!kanbanId) {
      setScanError('Kanban ID belum tersedia untuk discan.');
      return;
    }
    setScanMode('manual');
    setScanInput(kanbanId);
    setKanbanSubTab('scan');
    setScanError('');
  };
  const openRequestDnDetail = (row) => {
    const dnId = Number(row?.dn_id || 0);
    if (!dnId) return;
    const existingDn = (kanbanDnPaginationMeta?.rows || []).find((dn) => Number(dn?.id || 0) === dnId);
    const supplierMeta = getRequestSupplierMeta(row);
    const fallbackDn = {
      id: dnId,
      dn_number: row?.dn_number || `DN-${dnId}`,
      supplier: supplierMeta.supplierCode || supplierMeta.supplierName || '',
      planned_date: row?.planned_date || row?.plannedDate || row?.created_at || null,
      status: row?.dn_status || 'open',
    };
    setKanbanView?.('board');
    setKanbanSubTab('dn');
    openDnDetailModal(existingDn || fallbackDn, false);
  };

  const openKanbanStatusRequests = (statusKey = 'all') => {
    setKanbanView?.('board');
    setKanbanSubTab('requests');
    setKanbanRequestQuickFilter?.('all');
    setKanbanRequestStatusFilter?.(statusKey || 'all');
    setTablePagination?.((prev) => ({
      ...prev,
      kanbanRequests: { ...(prev.kanbanRequests || {}), page: 1 },
    }));
  };

  const openKanbanDashboardTarget = (row) => {
    if (!row?.id) return;
    const statusKey = String(row.status || '').trim().toLowerCase();
    const flowMeta = resolveRequestFlowMeta(row);
    const scheduleVendor = resolveRequestVendor(row);
    const isScheduleFlow = isScheduleVendorRole(scheduleVendor?.role) || flowMeta.key === 'schedule';

    setKanbanView?.('board');

    if (flowMeta.key === 'production' && ['triggered', 'requested', 'approved', 'production_ready'].includes(statusKey)) {
      setKanbanView?.('planning');
      setKanbanSubTab('production');
      setProductionTab('queue');
      if (statusKey === 'production_ready') {
        openProductionRequest(row);
      } else {
        void openProductionBatchRows([row]);
      }
      return;
    }

    if (flowMeta.key === 'subcon' && ['triggered', 'requested', 'approved'].includes(statusKey)) {
      setMainTab?.('subcon');
      return;
    }

    if (statusKey === 'approved') {
      if (row.dn_id) {
        openRequestDnDetail(row);
        return;
      }
      if (flowMeta.canCreateDn) {
        setKanbanSubTab('requests');
        openDnModal(row);
        return;
      }
      openKanbanStatusRequests(statusKey);
      return;
    }

    if (statusKey === 'dn_created') {
      if (isScheduleFlow && !row.schedule_id) {
        setKanbanSubTab('requests');
        openScheduleModal(row);
        return;
      }
      if (row.dn_id) {
        openRequestDnDetail(row);
        return;
      }
      setKanbanSubTab('dn');
      return;
    }

    if (statusKey === 'scheduled' || statusKey === 'in_transit') {
      setKanbanView?.('planning');
      setKanbanSubTab('delivery');
      return;
    }

    if (statusKey === 'receiving') {
      setKanbanSubTab('receiving');
      if (row.schedule_id || row.dn_id) openReceiveModal(row);
      return;
    }

    openKanbanStatusRequests(statusKey || 'all');
  };

  const openKanbanItemAnalysis = (row) => {
    setKanbanAnalysisRow(row || null);
  };

  const kanbanItemAnalysis = useMemo(() => {
    if (!kanbanAnalysisRow) return null;
    const itemCode = String(kanbanAnalysisRow?.item_code || '').trim();
    const masterItem = masterItemsByCode.get(itemCode) || {};
    const supplierMeta = resolveMasterItemSupplier(itemCode);
    const masterLocation = masterLocationsById.get(masterItem?.location_id || kanbanAnalysisRow?.drop_zone);
    const activeRequests = (kanbanRequests || [])
      .filter((request) => String(request?.item_code || '').trim() === itemCode)
      .filter((request) => !['closed', 'rejected', 'fifo'].includes(String(request?.status || '').trim().toLowerCase()));
    const activeRequestEntries = activeRequests
      .map((request) => ({ row: request, health: getKanbanRequestHealth(request) }))
      .sort((left, right) => right.health.ageHours - left.health.ageHours || new Date(right.row.created_at || 0) - new Date(left.row.created_at || 0));
    const statusCounts = activeRequests.reduce((acc, request) => {
      const key = String(request?.status || 'requested').trim().toLowerCase() || 'requested';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const onHand = Number(fifoTotalsByItemCode.get(itemCode) ?? 0);
    const minQty = Number(kanbanAnalysisRow?.min_qty ?? masterItem?.safety_stock ?? 0);
    const maxQty = Number(kanbanAnalysisRow?.effective_max_qty ?? kanbanAnalysisRow?.max_qty ?? 0);
    const lotQty = Number(kanbanAnalysisRow?.lot_qty ?? masterItem?.pack_qty ?? masterItem?.packQty ?? 0);
    const openRequestQty = activeRequests.reduce((acc, request) => acc + Number(request?.request_qty || 0), 0);
    const andon = getKanbanItemAndon(kanbanAnalysisRow);
    const stockGap = minQty > 0 ? onHand - minQty : null;
    const prlQty = getDisplayPrlQty(kanbanAnalysisRow);
    const thumbUrl = masterItem?.image_thumb_url || masterItem?.imageThumbUrl || masterItem?.image_url || masterItem?.imageUrl || '';
    const recommendation = andon.level === 'red'
      ? 'Prioritas proses: cek request overdue/stock gap, lakukan replenishment, atau buat request baru jika belum ada.'
      : andon.level === 'yellow'
        ? 'Pantau request terbuka dan siapkan replenishment sebelum stok turun di bawah minimum.'
        : 'Supply normal. Tetap monitor konsumsi dan FIFO sesuai proses berjalan.';
    return {
      row: kanbanAnalysisRow,
      itemCode,
      itemName: kanbanAnalysisRow?.item_name || masterItem?.name || '-',
      categoryLabel: getCategoryLabel(kanbanAnalysisRow?.item_type || masterItem?.type || ''),
      unit: kanbanAnalysisRow?.item_unit || masterItem?.unit || 'PCS',
      supplierLabel: supplierMeta.label,
      locationLabel: masterLocation?.id || masterLocation?.name || kanbanAnalysisRow?.drop_zone || '-',
      onHand,
      minQty,
      maxQty,
      lotQty,
      openRequestQty,
      stockGap,
      prlQty,
      andon,
      recommendation,
      statusCounts,
      activeRequestEntries,
      thumbUrl,
      cardsLabel: getKanbanCardsLabel(kanbanAnalysisRow),
      regularCards: kanbanAnalysisRow?.effective_regular_kanban ?? kanbanAnalysisRow?.calculated_regular_kanban ?? '-',
      safetyCards: kanbanAnalysisRow?.effective_safety_kanban ?? kanbanAnalysisRow?.calculated_safety_kanban ?? '-',
      leadTimeDays: kanbanAnalysisRow?.lead_time_days || 0,
      sourceRows: [
        'On hand: saldo inventory FIFO saat ini.',
        'Min/Max, lot, kartu: setup Kanban Item dan master item.',
        'Request aktif: data Kanban Requests yang belum closed/rejected/FIFO.',
        'Supplier: relasi supplier master item dengan share terbesar.',
      ],
    };
  }, [
    kanbanAnalysisRow,
    kanbanRequests,
    fifoTotalsByItemCode,
    masterItemsByCode,
    masterLocationsById,
    itemSupplierMap,
    masterVendors,
    getKanbanRequestHealth,
    getCategoryLabel,
    getKanbanCardsLabel,
  ]);

  const closeProductionRequestModal = () => {
    setProductionRequestModal({
      open: false,
      row: null,
      rows: [],
      loading: false,
      saving: false,
      error: '',
      productionDate: '',
      actualQty: '',
      requirementQty: '',
      varianceReason: '',
      overproductionApproved: false,
      postedResult: null,
    });
  };

  const closeProductionBatchModal = () => {
    setProductionBatchModal({
      open: false,
      entries: [],
      loading: false,
      posting: false,
      error: '',
      productionDate: '',
      lineFilter: 'all',
      categoryFilter: 'all',
      actualConfirmOpen: false,
    });
  };

  const getProductionRequestCategoryMeta = (row = {}) => {
    const flowCategory = resolveRequestFlowMeta(row)?.category || {};
    const item = masterItemsByCode.get(row?.item_code) || {};
    const raw = String(row?.item_type || item?.type || item?.category || flowCategory.label || '').trim();
    const text = `${raw} ${flowCategory.key || ''} ${flowCategory.label || ''}`.toLowerCase();
    const hasToken = (token) => new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, 'i').test(text);
    if (flowCategory.key === 'child' || hasToken('cp') || text.includes('childpart') || text.includes('child part') || text.includes('child')) {
      return { key: 'child', label: 'Child Part' };
    }
    if (flowCategory.key === 'subassy' || flowCategory.key === 'assy' || hasToken('sa') || text.includes('subassy') || text.includes('sub assy') || text.includes('sub-assy') || text.includes('assy')) {
      return { key: 'assy', label: 'Assy/Subassy' };
    }
    if (flowCategory.key === 'fg' || hasToken('fg') || text.includes('finish')) return { key: 'fg', label: 'FG' };
    return { key: 'other', label: flowCategory.label || raw || 'Other' };
  };

  const getProductionRequestItemMeta = (row = {}) => {
    const item = masterItemsByCode.get(row?.item_code) || {};
    const lineValue = String(row?.line_production || item?.line_production || '').trim();
    const location = masterLocationsById?.get?.(lineValue) || masterLocationsById?.get?.(String(lineValue));
    const snpQty = Number(item?.pack_qty ?? item?.packQty ?? row?.pack_qty ?? row?.packQty ?? 0);
    const cycleTimeSeconds = Number(item?.cycle_time_seconds ?? item?.cycleTimeSeconds ?? 0);
    return {
      item,
      snpQty: Number.isFinite(snpQty) && snpQty > 0 ? snpQty : 0,
      cycleTimeSeconds: Number.isFinite(cycleTimeSeconds) && cycleTimeSeconds > 0 ? cycleTimeSeconds : 0,
      machineLabel: String(location?.machine_note || location?.machineNote || location?.note || '').trim() || '-',
    };
  };

  const splitQtyBySnp = (qtyInput, snpInput) => {
    const qty = Number(qtyInput || 0);
    const snp = Number(snpInput || 0);
    if (!Number.isFinite(qty) || qty <= 0) return [];
    if (!Number.isFinite(snp) || snp <= 0) return [{ qty, isPartial: false }];
    const rows = [];
    let remaining = qty;
    const tolerance = 0.000001;
    while (remaining > tolerance) {
      const labelQty = Math.min(snp, remaining);
      rows.push({ qty: labelQty, isPartial: labelQty + tolerance < snp });
      remaining = Math.max(0, remaining - labelQty);
    }
    return rows;
  };

  const formatDurationFromSeconds = (secondsInput) => {
    const seconds = Number(secondsInput || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return '-';
    const totalSeconds = Math.round(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secondsPart = totalSeconds % 60;
    if (hours > 0) return `${hours}j ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secondsPart}s`;
    return `${secondsPart}s`;
  };

  const buildProductionWoGroupNo = ({ productionDate = '', lineLabel = '', machineLabel = '' } = {}) => {
    const dateToken = String(productionDate || getTodayDnDateInput()).replaceAll('-', '');
    const normalizeToken = (value, fallback) => {
      const token = String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 18);
      return token || fallback;
    };
    return `WO-${dateToken}-${normalizeToken(lineLabel, 'LINE')}-${normalizeToken(machineLabel, 'MACHINE')}`;
  };

  const getProductionRequestLineLabel = (row = {}) => {
    const item = masterItemsByCode.get(row?.item_code);
    const rawLine = String(row?.line_production || item?.line_production || '').trim();
    if (!rawLine) return 'No Line';
    const location = masterLocationsById?.get?.(rawLine) || masterLocationsById?.get?.(String(rawLine));
    if (location) {
      const code = String(location.code || location.id || rawLine).trim();
      const name = String(location.name || location.description || location.note || '').trim();
      return [code, name].filter(Boolean).join(' - ');
    }
    return rawLine;
  };

  const getProductionRequestPlantLabel = (row = {}) => {
    const item = masterItemsByCode.get(row?.item_code);
    const rawLocation = String(row?.location_id || item?.location_id || item?.location_name || '').trim();
    if (!rawLocation) return '-';
    const location = masterLocationsById?.get?.(rawLocation) || null;
    if (location) {
      const warehouse = masterWarehouses?.find?.((wh) => (
        String(wh.id || '').trim() === String(location.warehouse_id || '').trim()
        || String(wh.code || '').trim() === String(location.warehouse_id || '').trim()
      ));
      return warehouse?.name || warehouse?.code || location.warehouse || location.warehouse_id || rawLocation;
    }
    return rawLocation;
  };

  const escapePrintText = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const printProductionWorkOrders = (entriesInput = [], { title = 'Production Work Order' } = {}) => {
    const entries = entriesInput.filter((entry) => entry?.row || entry?.postedResult?.productionOrder);
    if (entries.length === 0) {
      alert('Belum ada WO production yang bisa dicetak.');
      return;
    }
    const printDate = new Date().toLocaleString('id-ID');
    const printableEntries = entries.map((entry) => {
      const row = entry.row || {};
      const productionOrder = entry.postedResult?.productionOrder || {};
      const productionNo = productionOrder.wo_number
        || (entry.productionId ? `WO-PROD-${String(entry.productionId).padStart(5, '0')}` : `WO-${getRequestIdLabel(row)}`);
      const productionDate = String(entry.postedResult?.productionOrder?.production_date || productionBatchModal.productionDate || getTodayDnDateInput()).slice(0, 10);
      const requirements = Array.isArray(entry.postedResult?.requirements)
        ? entry.postedResult.requirements
        : Array.isArray(entry.requirements)
          ? entry.requirements
          : [];
      const lineLabel = getProductionRequestLineLabel(row);
      const plantLabel = getProductionRequestPlantLabel(row);
      const meta = getProductionRequestItemMeta(row);
      const plannedQty = Number(productionOrder.request_qty || row.request_qty || 0);
      const actualQty = Number(productionOrder.actual_qty || productionOrder.qty || entry.actualQty || row.request_qty || 0);
      const labelPlan = splitQtyBySnp(actualQty || plannedQty, meta.snpQty);
      return {
        entry,
        row,
        productionNo,
        productionDate,
        requirements,
        lineLabel,
        plantLabel,
        meta,
        machineLabel: meta.machineLabel,
        plannedQty,
        actualQty,
        labelPlan,
        processSeconds: (actualQty || plannedQty) * meta.cycleTimeSeconds,
      };
    });
    const lineGroups = Array.from(printableEntries.reduce((map, item) => {
      const groupKey = [item.productionDate, item.lineLabel || '-', item.machineLabel || '-', item.plantLabel || '-'].join('||');
      const current = map.get(groupKey) || {
        productionDate: item.productionDate,
        lineLabel: item.lineLabel || '-',
        machineLabel: item.machineLabel || '-',
        plantLabel: item.plantLabel || '-',
        entries: [],
      };
      current.entries.push(item);
      map.set(groupKey, current);
      return map;
    }, new Map()).values());
    const pages = lineGroups.map((group) => {
      const woGroupNo = buildProductionWoGroupNo(group);
      const requestCount = group.entries.length;
      const partCount = new Set(group.entries.map((item) => String(item.row?.item_code || '').trim()).filter(Boolean)).size;
      const materialRows = group.entries.map((item, entryIndex) => {
        const row = item.row || {};
        const requirements = item.requirements.length > 0 ? item.requirements : [null];
        const rowSpan = requirements.length;
        return requirements.map((requirement, materialIndex) => `
          <tr>
            ${materialIndex === 0 ? `
              <td rowspan="${rowSpan}" class="center">${entryIndex + 1}</td>
              <td rowspan="${rowSpan}"><strong>${escapePrintText(getRequestIdLabel(row))}</strong><br><span class="muted">${escapePrintText(item.productionNo)}</span></td>
              <td rowspan="${rowSpan}"><strong>${escapePrintText(row.item_code || '-')}</strong><br><span class="muted">${escapePrintText(row.part_no || masterItemsByCode.get(row.item_code)?.part_no || '-')}</span></td>
              <td rowspan="${rowSpan}">${escapePrintText(row.item_name || masterItemsByCode.get(row.item_code)?.name || '-')}</td>
              <td rowspan="${rowSpan}" class="right"><strong>${escapePrintText(formatQty(item.plannedQty || 0))}</strong></td>
              <td rowspan="${rowSpan}" class="right"><strong>${escapePrintText(formatQty(item.actualQty || item.plannedQty || 0))}</strong></td>
              <td rowspan="${rowSpan}">${escapePrintText(item.lineLabel)}<br><span class="muted">Mesin: ${escapePrintText(item.machineLabel)}</span></td>
              <td rowspan="${rowSpan}" class="right">${escapePrintText(formatQty(item.meta.cycleTimeSeconds || 0))} s<br><span class="muted">${escapePrintText(formatDurationFromSeconds(item.processSeconds))}</span></td>
              <td rowspan="${rowSpan}" class="center">${escapePrintText(String(item.labelPlan.length || 1))}<br><span class="muted">SNP ${escapePrintText(item.meta.snpQty ? formatQty(item.meta.snpQty) : '-')}</span></td>
            ` : ''}
            <td>${escapePrintText(requirement?.itemCode || requirement?.item_code || '-')}</td>
            <td>${escapePrintText(requirement?.itemName || requirement?.item_name || (requirement ? '-' : 'Material list is not available'))}</td>
            <td class="right">${escapePrintText(requirement ? formatQty(requirement.requiredQty || requirement.required_qty || 0) : '-')}</td>
            <td>${escapePrintText(requirement?.itemUnit || requirement?.item_unit || '')}</td>
            <td>${escapePrintText((requirement?.positionCodes || requirement?.position_codes || []).join(', ') || '-')}</td>
          </tr>
        `).join('');
      }).join('');
      return `
        <section class="page">
          <div class="header">
            <div>
              <div class="company">PT. MATRA RODA PIRANTI</div>
              <div class="muted">Production Planning & Control</div>
            </div>
            <div class="doc-title">
              <div>WORK ORDER PRODUKSI PER LINE</div>
              <strong>${escapePrintText(woGroupNo)}</strong>
            </div>
          </div>
          <div class="meta-grid">
            <div><span>Production Date</span><strong>${escapePrintText(group.productionDate)}</strong></div>
            <div><span>Production Line</span><strong>${escapePrintText(group.lineLabel)}</strong></div>
            <div><span>Machine</span><strong>${escapePrintText(group.machineLabel)}</strong></div>
            <div><span>Total Part</span><strong>${group.entries.length}</strong></div>
            <div><span>Plant / Location</span><strong>${escapePrintText(group.plantLabel)}</strong></div>
            <div><span>WO Number</span><strong>${escapePrintText(woGroupNo)}</strong></div>
            <div class="wide"><span>Production Ref</span><strong>${requestCount} request / ${partCount} part. Detail referensi ada di tabel.</strong></div>
            <div class="wide"><span>Instruction</span><strong>Issue material by FIFO lot according to system recommendation.</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>WO / Request</th>
                <th>FG Code / Part No</th>
                <th>Item Name</th>
                <th>WO Qty</th>
                <th>Actual Qty</th>
                <th>Line / Machine</th>
                <th>Cycle / Est Time</th>
                <th>Labels</th>
                <th>Material Code</th>
                <th>Material Name</th>
                <th>Req Qty</th>
                <th>UOM</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>${materialRows}</tbody>
          </table>
          <div class="sign-grid">
            <div><span>Prepared By</span><div></div></div>
            <div><span>Line Leader</span><div></div></div>
            <div><span>Production</span><div></div></div>
            <div><span>Warehouse</span><div></div></div>
          </div>
          <div class="footer-note">Printed ${escapePrintText(printDate)}. Format compact: 1 sheet per production line/date/location.</div>
        </section>
      `;
    }).join('');
    const printWindow = window.open('', '_blank', 'width=1120,height=800');
    if (!printWindow) {
      alert('Popup print diblokir browser. Izinkan popup untuk mencetak WO.');
      return;
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>${escapePrintText(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; }
          .page { width: 297mm; min-height: 210mm; margin: 0 auto 12px; padding: 9mm; background: #fff; page-break-after: always; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 7px; }
          .company { font-size: 16px; font-weight: 700; }
          .muted { color: #64748b; font-size: 9px; }
          .doc-title { text-align: right; font-size: 16px; font-weight: 700; letter-spacing: .08em; }
          .doc-title strong { display: block; margin-top: 4px; font-size: 12px; letter-spacing: 0; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
          .meta-grid div { border: 1px solid #cbd5e1; padding: 5px 7px; min-height: 34px; }
          .meta-grid .wide { grid-column: span 2; }
          .meta-grid span, .sign-grid span { display: block; color: #64748b; font-size: 8px; text-transform: uppercase; margin-bottom: 3px; }
          .meta-grid strong { font-size: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
          .right { text-align: right; }
          .center { text-align: center; }
          .sign-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
          .sign-grid > div { border: 1px solid #cbd5e1; padding: 6px; height: 48px; }
          .footer-note { margin-top: 6px; color: #64748b; font-size: 8px; }
          @media print {
            @page { size: A4 landscape; margin: 6mm; }
            body { background: #fff; }
            .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>${pages}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const printProductionOutputLabels = (entriesInput = [], { title = 'Production Output Labels' } = {}) => {
    const labelEntries = entriesInput.flatMap((entry) => {
      const row = entry.row || {};
      const productionOrder = entry.postedResult?.productionOrder || {};
      const labels = Array.isArray(entry.postedResult?.outputLabels)
        ? entry.postedResult.outputLabels
        : Array.isArray(productionOrder.output_label_summary)
          ? productionOrder.output_label_summary
          : [];
      return labels.map((label) => ({
        row,
        productionOrder,
        label,
        lineLabel: getProductionRequestLineLabel(row),
        plantLabel: getProductionRequestPlantLabel(row),
        meta: getProductionRequestItemMeta(row),
      }));
    });
    if (labelEntries.length === 0) {
      alert('Belum ada label produksi posted yang bisa dicetak.');
      return;
    }
    const printDate = new Date().toLocaleString('id-ID');
    const labelCards = labelEntries.map((item) => {
      const row = item.row || {};
      const label = item.label || {};
      const productionOrder = item.productionOrder || {};
      const labelNo = label.productionLabelNo || label.production_label_no || label.batchNo || label.batch_no || '-';
      const qty = Number(label.qty || label.qty_in || 0);
      const seq = label.seq || label.label_seq || '-';
      const total = label.total || label.label_total || '-';
      const partial = Boolean(label.isPartial || label.is_partial_label);
      return `
        <section class="label-card">
          <div class="label-header">
            <div>
              <div class="company">PT. MATRA RODA PIRANTI</div>
              <div class="muted">Production Output Label</div>
            </div>
            <div class="label-no">${escapePrintText(labelNo)}</div>
          </div>
          <div class="item-code">${escapePrintText(row.item_code || productionOrder.product_code || '-')}</div>
          <div class="item-name">${escapePrintText(row.item_name || masterItemsByCode.get(row.item_code)?.name || '-')}</div>
          <div class="grid">
            <div><span>WO</span><strong>${escapePrintText(productionOrder.wo_number || `WO-${getRequestIdLabel(row)}`)}</strong></div>
            <div><span>Request</span><strong>${escapePrintText(getRequestIdLabel(row))}</strong></div>
            <div><span>Qty Label</span><strong>${escapePrintText(formatQty(qty))}</strong></div>
            <div><span>SNP</span><strong>${escapePrintText(label.snpQty ? formatQty(label.snpQty) : item.meta.snpQty ? formatQty(item.meta.snpQty) : '-')}</strong></div>
            <div><span>Seq</span><strong>${escapePrintText(`${seq}/${total}`)}</strong></div>
            <div><span>Status Label</span><strong>${partial ? 'PARTIAL' : 'FULL SNP'}</strong></div>
            <div><span>Line</span><strong>${escapePrintText(item.lineLabel)}</strong></div>
            <div><span>Machine</span><strong>${escapePrintText(item.meta.machineLabel)}</strong></div>
            <div><span>Production Date</span><strong>${escapePrintText(String(productionOrder.production_date || productionBatchModal.productionDate || getTodayDnDateInput()).slice(0, 10))}</strong></div>
          </div>
          <table class="qc-table">
            <thead>
              <tr>
                <th>QC Check</th>
                <th>OK</th>
                <th>NG</th>
                <th>Hold</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Visual</td><td></td><td></td><td></td><td></td></tr>
              <tr><td>Qty</td><td></td><td></td><td></td><td></td></tr>
              <tr><td>Label / Part No</td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
          <div class="sign-row">
            <div><span>Production</span></div>
            <div><span>QC Inspector</span></div>
            <div><span>Date</span></div>
          </div>
          <div class="footer-note">Printed ${escapePrintText(printDate)}. QC status awal sistem: ${escapePrintText(label.qcStatus || label.qc_status || 'qc_pending')}.</div>
        </section>
      `;
    }).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=760');
    if (!printWindow) {
      alert('Popup print diblokir browser. Izinkan popup untuk mencetak label produksi.');
      return;
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>${escapePrintText(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; }
          .label-card { width: 100mm; min-height: 72mm; margin: 6mm auto; padding: 5mm; background: #fff; border: 1px solid #0f172a; page-break-after: always; }
          .label-header { display: flex; justify-content: space-between; gap: 8px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
          .company { font-size: 11px; font-weight: 700; }
          .muted, .footer-note { color: #64748b; font-size: 7px; }
          .label-no { font-size: 11px; font-weight: 700; text-align: right; }
          .item-code { margin-top: 5px; font-size: 20px; font-weight: 800; }
          .item-name { font-size: 8px; color: #334155; min-height: 18px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin: 5px 0; }
          .grid div { border: 1px solid #cbd5e1; padding: 3px; min-height: 25px; }
          span { display: block; color: #64748b; font-size: 6px; text-transform: uppercase; }
          strong { display: block; margin-top: 1px; font-size: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 7px; }
          th, td { border: 1px solid #94a3b8; height: 13px; padding: 2px; text-align: left; }
          th { background: #e2e8f0; }
          .sign-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 5px; }
          .sign-row div { border: 1px solid #cbd5e1; height: 20px; padding: 2px; }
          @media print {
            @page { size: 100mm 80mm; margin: 3mm; }
            body { background: #fff; }
            .label-card { margin: 0; width: auto; min-height: auto; border: 1px solid #0f172a; }
          }
        </style>
      </head>
      <body>${labelCards}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const buildProductionReadinessEntry = async (row, productionDate, actualQtyInput = null, previousEntry = {}) => {
    const actualQtyValue = Number(actualQtyInput ?? previousEntry.actualQty ?? row.request_qty ?? 0);
    try {
      const query = new URLSearchParams({
        productCode: String(row.item_code || ''),
        qty: String(actualQtyValue),
        asOfDate: productionDate,
      });
      const data = await apiFetch(`/api/production/requirements?${query.toString()}`);
      const requirements = Array.isArray(data) ? data : [];
      const shortageRows = requirements.filter((item) => Number(item.shortage || 0) > 0);
      const requestStatusKey = String(row?.status || '').trim().toLowerCase();
      return {
        row,
        requirements,
        status: shortageRows.length > 0 ? 'shortage' : requestStatusKey === 'production_ready' ? 'released' : 'ready',
        shortageRows,
        error: '',
        productionId: null,
        actualQty: String(actualQtyValue || ''),
        requirementQty: String(actualQtyValue || ''),
        varianceReason: previousEntry.varianceReason || '',
        overproductionApproved: Boolean(previousEntry.overproductionApproved),
      };
    } catch (error) {
      return {
        row,
        requirements: [],
        status: 'blocked',
        shortageRows: [],
        error: error?.message || 'Failed to load BOM requirements.',
        productionId: null,
        actualQty: String(actualQtyValue || ''),
        requirementQty: String(actualQtyValue || ''),
        varianceReason: previousEntry.varianceReason || '',
        overproductionApproved: Boolean(previousEntry.overproductionApproved),
      };
    }
  };

  const openProductionBatchRows = async (rowsInput = []) => {
    const seenIds = new Set();
    const productionRows = rowsInput.filter((row) => {
      if (!row?.id || seenIds.has(row.id)) return false;
      seenIds.add(row.id);
      return isRequestSelectable(row) && resolveRequestFlowMeta(row).key === 'production';
    });
    if (productionRows.length === 0) {
      alert('Tidak ada request Production yang valid untuk diproses.');
      return;
    }
    const productionDate = getTodayDnDateInput();
    const categoryKeys = new Set(productionRows.map((row) => getProductionRequestCategoryMeta(row).key));
    const initialCategoryFilter = categoryKeys.size === 1 ? Array.from(categoryKeys)[0] : 'all';
    setProductionBatchModal({
      open: true,
      entries: productionRows.map((row) => ({
        row,
        requirements: [],
        status: 'loading',
        shortageRows: [],
        error: '',
        productionId: null,
        actualQty: String(row.request_qty || ''),
        requirementQty: '',
        varianceReason: '',
        overproductionApproved: false,
      })),
      loading: true,
      posting: false,
      error: '',
      productionDate,
      lineFilter: 'all',
      categoryFilter: initialCategoryFilter,
      actualConfirmOpen: false,
    });
    const entries = await Promise.all(productionRows.map((row) => buildProductionReadinessEntry(row, productionDate, row.request_qty)));
    setProductionBatchModal((prev) => ({
      ...prev,
      entries,
      loading: false,
    }));
  };

  const openProductionBatchRequests = async () => {
    const selectedRows = selectedRequestIds
      .map((id) => requestRows.find((row) => row.id === id) || kanbanRequests.find((row) => row.id === id))
      .filter(Boolean);
    await openProductionBatchRows(selectedRows);
  };

  const reloadProductionBatchRequirements = async (productionDate) => {
    const currentEntries = productionBatchModal.entries.filter((entry) => entry?.row);
    if (currentEntries.length === 0) return;
    const dateValue = productionDate || productionBatchModal.productionDate || getTodayDnDateInput();
    setProductionBatchModal((prev) => ({
      ...prev,
      productionDate: dateValue,
      loading: true,
      error: '',
      entries: currentEntries.map((entry) => ({
        ...entry,
        requirements: [],
        status: 'loading',
        shortageRows: [],
        error: '',
        productionId: null,
      })),
    }));
    const entries = await Promise.all(currentEntries.map((entry) => buildProductionReadinessEntry(
      entry.row,
      dateValue,
      entry.actualQty || entry.row?.request_qty,
      entry,
    )));
    setProductionBatchModal((prev) => ({
      ...prev,
      entries,
      loading: false,
    }));
  };

  const isProductionBatchEntryInScope = (entry, lineFilter = 'all', categoryFilter = 'all') => (
    (String(lineFilter || 'all') === 'all' || getProductionRequestLineLabel(entry?.row) === String(lineFilter || 'all'))
    && (String(categoryFilter || 'all') === 'all' || getProductionRequestCategoryMeta(entry?.row).key === String(categoryFilter || 'all'))
  );

  const releaseProductionBatch = async () => {
    const activeLineFilter = String(productionBatchModal.lineFilter || 'all');
    const activeCategoryFilter = String(productionBatchModal.categoryFilter || 'all');
    const lineFilteredEntries = productionBatchModal.entries.filter((entry) => (
      isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter)
    ));
    const readyEntries = lineFilteredEntries.filter((entry) => entry.status === 'ready');
    if (readyEntries.length === 0) {
      setProductionBatchModal((prev) => ({ ...prev, error: 'Tidak ada request Ready yang bisa dibuat WO.' }));
      return;
    }
    const categoryScopeText = activeCategoryFilter === 'all'
      ? 'semua kategori'
      : getProductionRequestCategoryMeta(lineFilteredEntries[0]?.row).label;
    const scopeText = `${activeLineFilter === 'all' ? 'semua line' : `line ${activeLineFilter}`} / ${categoryScopeText}`;
    if (!window.confirm(`Release WO untuk ${readyEntries.length} request ready pada ${scopeText}? Aktual produksi akan dikonfirmasi setelah proses selesai.`)) return;
    setProductionBatchModal((prev) => ({ ...prev, posting: true, error: '' }));
    const nextEntries = [];
    let successCount = 0;
    for (const entry of productionBatchModal.entries) {
      const inActiveScope = isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter);
      if (entry.status !== 'ready' || !inActiveScope) {
        nextEntries.push(entry);
        continue;
      }
      try {
        const result = await apiFetch(`/api/kanban/requests/${entry.row.id}/release-production`, {
          method: 'POST',
          body: JSON.stringify({
            productionDate: productionBatchModal.productionDate || getTodayDnDateInput(),
          }),
        });
        successCount += 1;
        nextEntries.push({
          ...entry,
          row: { ...entry.row, ...(result?.request || {}), status: 'production_ready' },
          status: 'released',
          productionId: result?.productionOrder?.id || null,
          postedResult: result,
          error: '',
        });
      } catch (error) {
        nextEntries.push({
          ...entry,
          status: 'failed',
          error: error?.message || 'Failed to release WO.',
        });
      }
    }
    setProductionBatchModal((prev) => ({
      ...prev,
      entries: nextEntries,
      posting: false,
      error: '',
    }));
    if (successCount > 0) {
      if (showToastMessage) {
        showToastMessage(`WO released untuk ${successCount} request.`, 'Status sekarang menunggu konfirmasi aktual.', null, 'success');
      } else {
        alert(`WO released untuk ${successCount} request. Status sekarang menunggu konfirmasi aktual.`);
      }
      await fetchKanbanRequests?.();
      await fetchKanbanSettings?.();
    }
  };

  const openProductionBatchActualConfirm = () => {
    const activeLineFilter = String(productionBatchModal.lineFilter || 'all');
    const activeCategoryFilter = String(productionBatchModal.categoryFilter || 'all');
    const readyEntries = productionBatchModal.entries.filter((entry) => (
      entry.status === 'released'
      && isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter)
    ));
    if (readyEntries.length === 0) {
      setProductionBatchModal((prev) => ({ ...prev, error: 'Tidak ada WO Released yang siap dikonfirmasi aktual.' }));
      return;
    }
    setProductionBatchModal((prev) => ({
      ...prev,
      error: '',
      actualConfirmOpen: true,
      entries: prev.entries.map((entry) => (
        readyEntries.some((readyEntry) => readyEntry.row?.id === entry.row?.id)
          ? {
              ...entry,
              actualQty: String(entry.actualQty || entry.row?.request_qty || ''),
              requirementQty: String(entry.requirementQty || entry.row?.request_qty || ''),
              varianceReason: entry.varianceReason || '',
              overproductionApproved: Boolean(entry.overproductionApproved),
            }
          : entry
      )),
    }));
  };

  const updateProductionBatchEntry = (rowId, changes = {}) => {
    setProductionBatchModal((prev) => ({
      ...prev,
      error: '',
      entries: prev.entries.map((entry) => (
        entry.row?.id === rowId ? { ...entry, ...changes } : entry
      )),
    }));
  };

  const reloadProductionBatchEntryRequirements = async (rowId) => {
    const entry = productionBatchModal.entries.find((item) => item.row?.id === rowId);
    if (!entry?.row) return;
    const actualQtyValue = Number(entry.actualQty || 0);
    if (!Number.isFinite(actualQtyValue) || actualQtyValue <= 0) {
      updateProductionBatchEntry(rowId, { error: 'Qty aktual wajib lebih dari 0.', status: 'blocked' });
      return;
    }
    updateProductionBatchEntry(rowId, {
      requirements: [],
      shortageRows: [],
      status: 'loading',
      error: '',
      productionId: null,
      postedResult: null,
    });
    const nextEntry = await buildProductionReadinessEntry(
      entry.row,
      productionBatchModal.productionDate || getTodayDnDateInput(),
      actualQtyValue,
      entry,
    );
    setProductionBatchModal((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => (item.row?.id === rowId ? nextEntry : item)),
    }));
  };

  const confirmProductionBatch = async () => {
    if (!productionBatchModal.actualConfirmOpen) {
      openProductionBatchActualConfirm();
      return;
    }
    const activeLineFilter = String(productionBatchModal.lineFilter || 'all');
    const activeCategoryFilter = String(productionBatchModal.categoryFilter || 'all');
    const lineFilteredEntries = productionBatchModal.entries.filter((entry) => (
      isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter)
    ));
    const readyEntries = lineFilteredEntries.filter((entry) => entry.status === 'released');
    if (readyEntries.length === 0) {
      setProductionBatchModal((prev) => ({ ...prev, error: 'Tidak ada WO Released yang siap dikonfirmasi aktual.' }));
      return;
    }
    const invalidEntry = readyEntries.find((entry) => {
      const requestQty = Number(entry.row?.request_qty || 0);
      const actualQty = Number(entry.actualQty || 0);
      const hasVariance = Number.isFinite(actualQty) && actualQty > 0 && actualQty !== requestQty;
      return !Number.isFinite(actualQty)
        || actualQty <= 0
        || Number(entry.requirementQty || 0) !== actualQty
        || (hasVariance && !String(entry.varianceReason || '').trim())
        || (actualQty > requestQty && !entry.overproductionApproved);
    });
    if (invalidEntry) {
      setProductionBatchModal((prev) => ({
        ...prev,
        error: `Cek actual qty/alasan/approval untuk ${getRequestIdLabel(invalidEntry.row)} sebelum batch posting.`,
      }));
      return;
    }
    const categoryScopeText = activeCategoryFilter === 'all'
      ? 'semua kategori'
      : getProductionRequestCategoryMeta(lineFilteredEntries[0]?.row).label;
    const scopeText = `${activeLineFilter === 'all' ? 'semua line' : `line ${activeLineFilter}`} / ${categoryScopeText}`;
    if (!window.confirm(`Post aktual produksi untuk ${readyEntries.length} WO Released pada ${scopeText}? Request shortage tetap tertahan.`)) return;
    setProductionBatchModal((prev) => ({ ...prev, posting: true, error: '' }));
    const nextEntries = [];
    let successCount = 0;
    for (const entry of productionBatchModal.entries) {
      const inActiveScope = isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter);
      if (entry.status !== 'released' || !inActiveScope) {
        nextEntries.push(entry);
        continue;
      }
      try {
        const result = await apiFetch(`/api/kanban/requests/${entry.row.id}/complete-production`, {
          method: 'POST',
          body: JSON.stringify({
            productionDate: productionBatchModal.productionDate || getTodayDnDateInput(),
            actualQty: Number(entry.actualQty || entry.row.request_qty || 0),
            varianceReason: entry.varianceReason || '',
            overproductionApproved: Boolean(entry.overproductionApproved),
          }),
        });
        successCount += 1;
        nextEntries.push({
          ...entry,
          status: 'posted',
          productionId: result?.productionOrder?.id || null,
          postedResult: result,
          error: '',
        });
      } catch (error) {
        nextEntries.push({
          ...entry,
          status: 'failed',
          error: error?.message || 'Failed to post production.',
        });
      }
    }
    setProductionBatchModal((prev) => ({
      ...prev,
      entries: nextEntries,
      posting: false,
      error: '',
      actualConfirmOpen: successCount > 0 ? false : prev.actualConfirmOpen,
    }));
    if (successCount > 0) {
      if (showToastMessage) {
        showToastMessage(`Aktual produksi diposting untuk ${successCount} WO.`, '', null, 'success');
      } else {
        alert(`Aktual produksi diposting untuk ${successCount} WO.`);
      }
      await fetchKanbanRequests?.();
      await fetchKanbanSettings?.();
      setSelectedRequestIds((prev) => prev.filter((id) => !nextEntries.some((entry) => entry.status === 'posted' && entry.row.id === id)));
    }
  };

  const openProductionRequest = async (row) => {
    if (!row?.id) return;
    const qty = Number(row.request_qty || 0);
    const productionDate = getTodayDnDateInput();
    setProductionRequestModal({
      open: true,
      row,
      rows: [],
      loading: true,
      saving: false,
      error: '',
      productionDate,
      actualQty: String(qty || ''),
      requirementQty: String(qty || ''),
      varianceReason: '',
      overproductionApproved: false,
      postedResult: null,
    });
    try {
      const query = new URLSearchParams({
        productCode: String(row.item_code || ''),
        qty: String(qty),
        asOfDate: productionDate,
      });
      const data = await apiFetch(`/api/production/requirements?${query.toString()}`);
      setProductionRequestModal((prev) => ({
        ...prev,
        rows: Array.isArray(data) ? data : [],
        loading: false,
        requirementQty: String(qty),
        error: '',
      }));
    } catch (error) {
      setProductionRequestModal((prev) => ({
        ...prev,
        rows: [],
        loading: false,
        error: error?.message || 'Failed to load production BOM requirements.',
      }));
    }
  };

  const reloadProductionRequestRequirements = async (productionDate) => {
    const row = productionRequestModal.row;
    if (!row?.id) return;
    const dateValue = productionDate || productionRequestModal.productionDate || getTodayDnDateInput();
    const actualQtyValue = Number(productionRequestModal.actualQty || row.request_qty || 0);
    if (!Number.isFinite(actualQtyValue) || actualQtyValue <= 0) {
      setProductionRequestModal((prev) => ({
        ...prev,
        productionDate: dateValue,
        error: 'Qty aktual produksi wajib lebih dari 0.',
      }));
      return;
    }
    setProductionRequestModal((prev) => ({
      ...prev,
      productionDate: dateValue,
      loading: true,
      error: '',
    }));
    try {
      const query = new URLSearchParams({
        productCode: String(row.item_code || ''),
        qty: String(actualQtyValue),
        asOfDate: dateValue,
      });
      const data = await apiFetch(`/api/production/requirements?${query.toString()}`);
      setProductionRequestModal((prev) => ({
        ...prev,
        rows: Array.isArray(data) ? data : [],
        loading: false,
        requirementQty: String(actualQtyValue),
      }));
    } catch (error) {
      setProductionRequestModal((prev) => ({
        ...prev,
        rows: [],
        loading: false,
        error: error?.message || 'Failed to load production BOM requirements.',
      }));
    }
  };

  const confirmProductionRequest = async () => {
    const row = productionRequestModal.row;
    if (!row?.id) return;
    const requestQty = Number(row.request_qty || 0);
    const actualQty = Number(productionRequestModal.actualQty || 0);
    if (!Number.isFinite(actualQty) || actualQty <= 0) {
      setProductionRequestModal((prev) => ({ ...prev, error: 'Qty aktual produksi wajib lebih dari 0.' }));
      return;
    }
    if (Number(productionRequestModal.requirementQty || 0) !== actualQty) {
      setProductionRequestModal((prev) => ({ ...prev, error: 'Recheck BOM untuk qty aktual terbaru sebelum posting.' }));
      return;
    }
    const hasVariance = actualQty !== requestQty;
    if (hasVariance && !String(productionRequestModal.varianceReason || '').trim()) {
      setProductionRequestModal((prev) => ({ ...prev, error: 'Alasan selisih wajib diisi jika qty aktual berbeda dari WO.' }));
      return;
    }
    if (actualQty > requestQty && !productionRequestModal.overproductionApproved) {
      setProductionRequestModal((prev) => ({ ...prev, error: 'Qty aktual melebihi WO. Centang approval overproduction sebelum posting.' }));
      return;
    }
    const shortageRows = productionRequestModal.rows.filter((item) => Number(item.shortage || 0) > 0);
    if (shortageRows.length > 0) {
      setProductionRequestModal((prev) => ({
        ...prev,
        error: 'Material shortage masih ada. Production belum bisa diposting.',
      }));
      return;
    }
    const label = getRequestIdLabel(row);
    const closeText = actualQty >= requestQty ? 'close request' : `sisakan ${formatQty(requestQty - actualQty)} pada request`;
    if (!window.confirm(`Post actual production ${formatQty(actualQty)} untuk ${label} dan ${closeText}?`)) return;
    setProductionRequestModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const result = await apiFetch(`/api/kanban/requests/${row.id}/complete-production`, {
        method: 'POST',
        body: JSON.stringify({
          productionDate: productionRequestModal.productionDate || getTodayDnDateInput(),
          actualQty,
          varianceReason: productionRequestModal.varianceReason || '',
          overproductionApproved: productionRequestModal.overproductionApproved,
        }),
      });
      const message = `Production posted. ${result?.productionOrder?.wo_number || `WO-PROD-${result?.productionOrder?.id || '-'}`} created.`;
      if (showToastMessage) {
        showToastMessage(message, '', null, 'success');
      } else {
        alert(message);
      }
      setProductionRequestModal((prev) => ({
        ...prev,
        saving: false,
        error: '',
        postedResult: result,
      }));
      await fetchKanbanRequests?.();
      await fetchKanbanSettings?.();
    } catch (error) {
      setProductionRequestModal((prev) => ({
        ...prev,
        saving: false,
        error: error?.message || 'Failed to post production.',
      }));
    }
  };

  const openProductionLineBatchFromRequest = async (row) => {
    const lineLabel = getProductionRequestLineLabel(row);
    const categoryMeta = getProductionRequestCategoryMeta(row);
    const lineRows = productionQueueRows.filter((item) => (
      isRequestSelectable(item)
      && resolveRequestFlowMeta(item).key === 'production'
      && getProductionRequestLineLabel(item) === lineLabel
      && getProductionRequestCategoryMeta(item).key === categoryMeta.key
    ));
    if (lineRows.length === 0) {
      setProductionRequestModal((prev) => ({
        ...prev,
        error: `Tidak ada request production ${categoryMeta.label} lain untuk line ${lineLabel}.`,
      }));
      return;
    }
    closeProductionRequestModal();
    await openProductionBatchRows(lineRows);
  };

  const handleSplitDnByRit = async (dn) => {
    const dnId = Number(dn?.id || 0);
    if (!dnId) return;
    const dnNumber = dn?.dn_number || `DN-${dnId}`;
    const itemCount = Number(dn?.item_count || 0);
    const message = itemCount > 0
      ? `Split ${dnNumber} (${itemCount} item) mengikuti rit supplier?`
      : `Split ${dnNumber} mengikuti rit supplier?`;
    if (!window.confirm(message)) return;
    try {
      const result = await apiFetch(`/api/dn/${dnId}/split-by-rit`, { method: 'POST' });
      const count = Array.isArray(result?.dns) ? result.dns.length : 0;
      const label = count > 0 ? `${dnNumber} split menjadi ${count} DN per rit.` : `${dnNumber} berhasil di-split per rit.`;
      if (showToastMessage) {
        showToastMessage(label, '', null, 'success');
      } else {
        alert(label);
      }
      await fetchDeliveryNotes?.();
      await fetchKanbanRequests?.();
    } catch (error) {
      const errorMessage = error?.message || 'Gagal split DN per rit.';
      if (showToastMessage) {
        showToastMessage(errorMessage, '', null, 'error');
      } else {
        alert(errorMessage);
      }
    }
  };

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
    return ['triggered', 'requested', 'approved', 'production_ready'].includes(statusKey) && !row?.dn_id;
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
  }, [kanbanRequestStatusFilter, kanbanRequestCategoryFilter, kanbanRequestFlowFilter, setSelectedRequestIds]);

  const formatDnQty = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return formatQty(num, fallback);
  };

  const formatDnQty0 = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return formatQty(num, fallback);
  };

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

  const formatSignedQty = (value, fallback = '-') => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num > 0 ? `+${formatQty(num, fallback)}` : formatQty(num, fallback);
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

  const handleDnPreviewPrint = async () => {
    if (!dnPrintPayload) return;
    const filename = buildPrintFileName('DN', dnPrintPayload?.dnNumber);
    const dnStatus = String(dnPrintPayload?.sourceDn?.status || '').toLowerCase();
    const canPrintCards = dnPrintMode === 'cards' && ['open', 'sent', 'in_transit', 'partial', 'published'].includes(dnStatus);
    if (canPrintCards && !dnPrintCardsReady) {
      setDnPrintCardsReady(true);
      await new Promise((resolve) => setTimeout(resolve, 220));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    triggerPrintWithTitle(filename);
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
  const receiveAutoLoadRef = useRef(false);
  const [receiveFlashKey, setReceiveFlashKey] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveTruckNo, setReceiveTruckNo] = useState('');
  const [receiveDriverName, setReceiveDriverName] = useState('');
  const [receiveDoNumber, setReceiveDoNumber] = useState('');
  const [receiveMillsheetQuestion, setReceiveMillsheetQuestion] = useState('follow_up');
  const [receiveMillsheetNotes, setReceiveMillsheetNotes] = useState('');
  const [receiveDoCheck, setReceiveDoCheck] = useState({
    status: 'idle',
    message: '',
    matches: [],
  });
  const receiveDoCheckSeqRef = useRef(0);
  const productionImportRef = useRef(null);
  const wipImportRef = useRef(null);
  const [productionTab, setProductionTab] = useState('queue');
  const [productionQueueStatusFilter, setProductionQueueStatusFilter] = useState('all');
  const [productionQueueHealthFilter, setProductionQueueHealthFilter] = useState('all');
  const [productionQueueCategoryFilter, setProductionQueueCategoryFilter] = useState('all');
  const [productionQueuePage, setProductionQueuePage] = useState(1);
  const [productionQueuePageSize, setProductionQueuePageSize] = useState(25);
  const [productionImportRows, setProductionImportRows] = useState([]);
  const [productionImportLoading, setProductionImportLoading] = useState(false);
  const [productionImportError, setProductionImportError] = useState('');
  const [productionImportSummary, setProductionImportSummary] = useState(null);
  const [productionOrderRows, setProductionOrderRows] = useState([]);
  const [productionOrderHistoryLoading, setProductionOrderHistoryLoading] = useState(false);
  const [productionOrderHistoryError, setProductionOrderHistoryError] = useState('');
  const [productionManualSaving, setProductionManualSaving] = useState(false);
  const [productionManualError, setProductionManualError] = useState('');
  const [productionManualSuccess, setProductionManualSuccess] = useState('');
  const [showProductionManualForm, setShowProductionManualForm] = useState(false);
  const [productionOrderPage, setProductionOrderPage] = useState(1);
  const [productionOrderPageSize, setProductionOrderPageSize] = useState(25);
  const [productionManualForm, setProductionManualForm] = useState(() => ({
    productionDate: getTodayDnDateInput(),
    productCode: '',
    qty: '',
    lineCode: '',
    shiftLabel: 'Shift 1',
    documentNo: '',
    notes: '',
  }));
  const productionShiftOptions = ['Shift 1', 'Shift 2'];
  const productionOrderPageSizeOptions = [25, 50, 100, 250];
  const productionOrderTotalRows = productionOrderRows.length;
  const productionOrderTotalPages = Math.max(1, Math.ceil(productionOrderTotalRows / productionOrderPageSize));
  const productionOrderCurrentPage = Math.min(Math.max(1, productionOrderPage), productionOrderTotalPages);
  const productionOrderStartIndex = productionOrderTotalRows === 0 ? 0 : (productionOrderCurrentPage - 1) * productionOrderPageSize;
  const productionOrderEndIndex = Math.min(productionOrderStartIndex + productionOrderPageSize, productionOrderTotalRows);
  const pagedProductionOrderRows = productionOrderRows.slice(productionOrderStartIndex, productionOrderEndIndex);
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
  const [productionRequestModal, setProductionRequestModal] = useState({
    open: false,
    row: null,
    rows: [],
    loading: false,
    saving: false,
    error: '',
    productionDate: '',
    actualQty: '',
    requirementQty: '',
    varianceReason: '',
    overproductionApproved: false,
    postedResult: null,
  });
  const [productionBatchModal, setProductionBatchModal] = useState({
    open: false,
    entries: [],
    loading: false,
    posting: false,
    error: '',
    productionDate: '',
    lineFilter: 'all',
    categoryFilter: 'all',
    actualConfirmOpen: false,
  });
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
  const incomingQuickActionNonceRef = useRef(null);
  const [showRnDetailModal, setShowRnDetailModal] = useState(false);
  const [selectedRnDetail, setSelectedRnDetail] = useState(null);
  const [showRnPrintModal, setShowRnPrintModal] = useState(false);
  const [rnPrintPayload, setRnPrintPayload] = useState(null);
  const [dnPrintCardsReady, setDnPrintCardsReady] = useState(false);
  const dnPrintCardsTimerRef = useRef(null);
  const [qrSimulationLoading, setQrSimulationLoading] = useState(false);
  const [qrSimulationError, setQrSimulationError] = useState('');
  const [qrSimulationResult, setQrSimulationResult] = useState(null);
  const [qrSimulationRefreshNonce, setQrSimulationRefreshNonce] = useState(0);

  useEffect(() => {
    if (mainTab !== 'kanban') return;
    if (incomingQuickAction?.type !== 'dn') return;
    if (!incomingQuickAction?.nonce || incomingQuickActionNonceRef.current === incomingQuickAction.nonce) return;
    incomingQuickActionNonceRef.current = incomingQuickAction.nonce;
    setKanbanView?.('board');
    setKanbanSubTab('receiving');
    setShowReceiveFormModal(true);
  }, [incomingQuickAction?.nonce, incomingQuickAction?.type, mainTab, setKanbanSubTab, setKanbanView]);

  useEffect(() => {
    if (dnPrintCardsTimerRef.current) {
      clearTimeout(dnPrintCardsTimerRef.current);
      dnPrintCardsTimerRef.current = null;
    }
    if (!showDnPrintModal || !dnPrintPayload) {
      setDnPrintCardsReady(false);
      return undefined;
    }
    setDnPrintCardsReady(false);
    dnPrintCardsTimerRef.current = setTimeout(() => {
      setDnPrintCardsReady(true);
      dnPrintCardsTimerRef.current = null;
    }, 160);
    return () => {
      if (dnPrintCardsTimerRef.current) {
        clearTimeout(dnPrintCardsTimerRef.current);
        dnPrintCardsTimerRef.current = null;
      }
    };
  }, [dnPrintPayload, showDnPrintModal]);

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
          size: ${showDnPrintModal ? 'A4 portrait' : 'A4 portrait'};
          margin: ${showDnPrintModal ? '8mm 10mm 10mm 10mm' : '10mm 15mm 15mm 15mm'};
        }
        @page dn-card-landscape {
          size: A4 landscape;
          margin: 8mm 10mm 10mm 10mm;
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

  useEffect(() => {
    if (!showQrModal || !qrPayload) {
      setQrSimulationLoading(false);
      setQrSimulationError('');
      setQrSimulationResult(null);
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      setQrSimulationLoading(true);
      setQrSimulationError('');
      try {
        const data = await apiFetch('/api/kanban/scan-preview', {
          method: 'POST',
          body: JSON.stringify({
            kanbanId: qrPayload,
          }),
        });
        if (!cancelled) {
          setQrSimulationResult(data || null);
        }
      } catch (error) {
        if (!cancelled) {
          setQrSimulationResult(null);
          setQrSimulationError(error.message || 'Gagal memuat simulasi QR.');
        }
      } finally {
        if (!cancelled) {
          setQrSimulationLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, qrPayload, showQrModal, qrSimulationRefreshNonce]);

  const buildProductionUniqLabel = (itemCode, partNo) => {
    const code = String(itemCode || '').trim();
    const part = String(partNo || '').trim();
    if (code && part && part !== code) return `${code} / ${part}`;
    return code || part || '-';
  };

  const productionOutputItemOptions = useMemo(() => {
    const allowedTypes = new Set([
      'fg',
      'finishgood',
      'finishedgood',
      'finishedgoods',
      'child',
      'childpart',
      'cp',
      'subassy',
      'subass',
      'subassembly',
      'sa',
    ]);
    return (Array.isArray(masterItems) ? masterItems : [])
      .filter((item) => {
        const typeKey = String(item?.type || item?.item_type || item?.category || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
        return allowedTypes.has(typeKey);
      })
      .map((item) => ({
        ...item,
        code: item.code || item.item_code,
        label: [
          item.code || item.item_code,
          item.part_no || item.partNo,
          item.name,
        ].filter(Boolean).join(' | '),
      }))
      .filter((item) => item.code);
  }, [masterItems]);

  const selectedProductionManualItem = useMemo(() => {
    const code = String(productionManualForm.productCode || '').trim();
    if (!code) return null;
    return productionOutputItemOptions.find((item) => String(item.code || '').trim() === code)
      || masterItemsByCode?.get?.(code)
      || null;
  }, [masterItemsByCode, productionManualForm.productCode, productionOutputItemOptions]);

  const productionLineOptions = useMemo(() => {
    const normalizeLocationType = (value) => {
      const raw = String(value || '').trim();
      if (/production\s*line/i.test(raw)) return 'Production Line';
      if (/work\s*center/i.test(raw)) return 'Work Center';
      return '';
    };
    const sourceRows = Array.isArray(masterLocations) ? masterLocations : Array.from(masterLocationsById?.values?.() || []);
    const rows = sourceRows.filter((location) => location?.id);
    const processRows = rows.filter((location) => normalizeLocationType(location.line_description || location.lineDescription) || normalizeLocationType(location.category));
    const list = processRows.length > 0 ? processRows : rows;
    return list
      .map((location) => {
        const id = String(location.id || '').trim();
        const type = normalizeLocationType(location.line_description || location.lineDescription) || normalizeLocationType(location.category);
        const processName = String(location.fifo_lane || location.fifoLane || '').trim();
        const machineNote = String(location.machine_note || location.machineNote || '').trim();
        const primaryLabel = processName || machineNote || id;
        const detail = [
          id !== primaryLabel ? id : '',
          type,
          location.category && location.category !== type ? location.category : '',
          machineNote && machineNote !== primaryLabel ? machineNote : '',
        ].filter(Boolean).join(' | ');
        return {
          ...location,
          value: id,
          processName,
          label: detail ? `${primaryLabel} | ${detail}` : primaryLabel,
        };
      })
      .sort((left, right) => String(left.label || '').localeCompare(String(right.label || '')));
  }, [masterLocations, masterLocationsById]);

  const getProductionLineDisplayLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const option = productionLineOptions.find((row) => String(row.value || '').trim() === raw);
    return option?.processName || option?.fifo_lane || option?.fifoLane || raw;
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
    setReceiveMillsheetQuestion('follow_up');
    setReceiveMillsheetNotes('');
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

  const notifyMessage = (message, actionLabel = '', onAction = null, tone = 'auto') => {
    if (showToastMessage) {
      showToastMessage(message, actionLabel, onAction, tone);
      return;
    }
    alert(message);
  };

  const openReceivingNoteByNumber = (rnNumber) => {
    const targetRnNumber = String(rnNumber || '').trim();
    setKanbanView?.('board');
    setKanbanSubTab('receiving');
    setRnStatus?.('all');
    setRnDateStart?.('');
    setRnDateEnd?.('');
    if (targetRnNumber) setRnSearch?.(targetRnNumber);
    setTablePagination?.((prev) => ({
      ...prev,
      kanbanReceiving: { ...(prev.kanbanReceiving || {}), page: 1 },
    }));
  };

  const normalizeImportText = (value) => String(value ?? '').trim();
  const normalizeImportKey = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  const getImportedRowValue = (row, aliases = []) => {
    const entries = Object.entries(row || {});
    for (const alias of aliases) {
      const normalizedAlias = normalizeImportKey(alias);
      const match = entries.find(([key]) => normalizeImportKey(key) === normalizedAlias);
      if (match && match[1] !== undefined && match[1] !== null && String(match[1]).trim() !== '') {
        return match[1];
      }
    }
    return '';
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
    if (receiveAutoLoadRef.current) {
      receiveAutoLoadRef.current = false;
      return;
    }
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
          body: JSON.stringify({
            doNumber: normalizedDoNumber,
            supplier: receiveSupplier,
            items: payloadItems,
          }),
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
      setProductionTab('queue');
    } else if (kanbanSubTab === 'delivery') {
      setDeliveryWorkflowTab('upload-dn');
    }
  }, [kanbanSubTab]);

  useEffect(() => {
    if (!isProductionUser) return;
    if (kanbanView !== 'board') {
      setKanbanView('board');
    }
  }, [isProductionUser, kanbanView, setKanbanView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (kanbanSubTab === 'scan' && scanMode !== 'camera') {
        scanManualInputRef.current?.focus();
      }
      if (kanbanSubTab === 'empty') {
        emptyKanbanInputRef.current?.focus();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [kanbanSubTab, scanMode]);

  useEffect(() => {
    if (kanbanSubTab !== 'production') return;
    if (productionTab === 'fg') {
      fetchProductionImportHistory();
      fetchProductionOrderHistory();
    } else if (productionTab === 'wip') {
      fetchWipImportHistory();
    } else if (productionTab === 'report') {
      fetchProductionCompare({ silent: true });
    }
  }, [kanbanSubTab, productionTab]);

  useEffect(() => {
    setProductionOrderPage((prev) => Math.min(Math.max(1, prev), productionOrderTotalPages));
  }, [productionOrderTotalPages]);

  useEffect(() => {
    if (kanbanSubTab !== 'delivery') return;
    refreshDeliveryWorkflow();
  }, [kanbanSubTab]);

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

  const fetchProductionOrderHistory = async () => {
    if (!canProduction) return;
    setProductionOrderHistoryLoading(true);
    setProductionOrderHistoryError('');
    try {
      const data = await apiFetch('/api/production/orders');
      setProductionOrderRows(Array.isArray(data) ? data : []);
      setProductionOrderPage(1);
    } catch (error) {
      setProductionOrderRows([]);
      setProductionOrderHistoryError(error.message || 'Gagal memuat riwayat output produksi.');
    } finally {
      setProductionOrderHistoryLoading(false);
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

  const fetchDeliveryUploads = async ({ silent = false } = {}) => {
    if (!canOpenDeliveryTab) return;
    if (!silent) setDeliveryUploadsLoading(true);
    setDeliveryUploadsError('');
    try {
      const data = await apiFetch('/api/delivery/uploads?limit=20&offset=0');
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setDeliveryUploads(rows);
      if (!selectedDeliveryUploadId && rows.length > 0) {
        setSelectedDeliveryUploadId(rows[0].id);
      }
    } catch (error) {
      setDeliveryUploads([]);
      setDeliveryUploadsError(error.message || 'Gagal memuat delivery uploads.');
    } finally {
      if (!silent) setDeliveryUploadsLoading(false);
    }
  };

  const fetchCustomerShipments = async ({ silent = false } = {}) => {
    if (!canOpenDeliveryTab) return;
    if (!silent) setCustomerShipmentsLoading(true);
    setCustomerShipmentsError('');
    try {
      const data = await apiFetch('/api/delivery/customer-shipments?limit=50&offset=0');
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setCustomerShipments(rows);
      if (!selectedCustomerShipmentId && rows.length > 0) {
        setSelectedCustomerShipmentId(rows[0].id);
      }
    } catch (error) {
      setCustomerShipments([]);
      setCustomerShipmentsError(error.message || 'Gagal memuat Outbound Customer.');
    } finally {
      if (!silent) setCustomerShipmentsLoading(false);
    }
  };

  const refreshDeliveryWorkflow = async ({ silent = false } = {}) => {
    await Promise.all([
      fetchDeliveryUploads({ silent }),
      fetchCustomerShipments({ silent }),
    ]);
  };

  const getShipmentUploadId = (shipment = {}) => Number(shipment?.deliveryUploadId ?? shipment?.delivery_upload_id ?? 0);

  const getDeliveryUploadFulfilledQty = (upload = {}) => {
    const direct = Number(upload?.total_qty_fulfilled ?? upload?.totalQtyFulfilled ?? 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const items = Array.isArray(upload?.items) ? upload.items : [];
    return items.reduce((sum, item) => sum + Number(item?.qtyFulfilled ?? item?.qty_fulfilled ?? 0), 0);
  };

  const getDeliveryUploadShipment = (upload = {}) => {
    const uploadId = Number(upload?.id || 0);
    if (!uploadId) return null;
    return customerShipmentsByUploadId.get(uploadId) || upload.customer_sj || upload.customerSj || null;
  };

  const getCustomerOutboundNumber = (shipment = {}) => (
    shipment.outboundNumber || shipment.outbound_number || shipment.sjNumber || shipment.sj_number || '-'
  );

  const getCustomerSjNumber = (shipment = {}) => (
    shipment.customerSjNumber || shipment.customer_sj_number || ''
  );

  const isCustomerShipmentLoaded = (shipment = {}) => {
    const status = String(shipment.status || '').toLowerCase();
    return status === 'loaded' || status === 'sj_created' || status === 'printed';
  };

  const getCustomerShipmentStatusMeta = (statusValue) => {
    const status = String(statusValue || '').toLowerCase();
    if (status === 'reserved') return { label: 'RESERVED', className: 'bg-slate-100 text-slate-700' };
    if (status === 'picked') return { label: 'PICKED', className: 'bg-sky-100 text-sky-700' };
    if (status === 'loaded') return { label: 'LOADED / STOCK OUT', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'sj_created') return { label: 'SJ CREATED', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'printed') return { label: 'PRINTED', className: 'bg-indigo-100 text-indigo-700' };
    return { label: status ? status.toUpperCase() : '-', className: 'bg-slate-100 text-slate-700' };
  };

  const getCustomerShipmentPickedQty = (shipment = {}) => {
    const items = Array.isArray(shipment.items) ? shipment.items : [];
    return items.reduce((sum, item) => sum + Number(item.qtyPicked ?? item.qty_picked ?? 0), 0);
  };

  const getCustomerShipmentLoadedQty = (shipment = {}) => {
    const items = Array.isArray(shipment.items) ? shipment.items : [];
    return items.reduce((sum, item) => sum + Number(item.qtyLoaded ?? item.qty_loaded ?? 0), 0);
  };

  const isCustomerShipmentFullyPicked = (shipment = {}) => {
    const items = Array.isArray(shipment.items) ? shipment.items : [];
    return items.length > 0 && items.every((item) => Number(item.qtyPicked ?? item.qty_picked ?? 0) >= Number(item.qtyShip ?? item.qty_ship ?? 0));
  };

  const printCustomerShipment = (shipment = {}) => {
    const items = Array.isArray(shipment.items) ? shipment.items : [];
    const loaded = isCustomerShipmentLoaded(shipment);
    const docNumber = loaded ? (getCustomerSjNumber(shipment) || getCustomerOutboundNumber(shipment)) : getCustomerOutboundNumber(shipment);
    const documentTitle = loaded ? 'SURAT JALAN CUSTOMER' : 'ORDER MUAT / PICKING LIST';
    const customerName = shipment.customerName || shipment.customer_name || '-';
    const customerDn = shipment.customerDnNumber || shipment.customer_dn_number || '-';
    const sjDate = String(shipment.sjDate || shipment.sj_date || '').slice(0, 10) || getTodayDnDateInput();
    const totalQty = loaded
      ? Number(getCustomerShipmentLoadedQty(shipment) || shipment.totalQty || shipment.total_qty || 0)
      : Number(shipment.totalQty ?? shipment.total_qty ?? items.reduce((sum, item) => sum + Number(item.qtyShip || item.qty_ship || 0), 0));
    const rowsHtml = items.map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapePrintText(item.itemCode || item.item_code || '-')}</td>
        <td>${escapePrintText(item.partNo || item.part_no || '-')}</td>
        <td>${escapePrintText(item.itemName || item.item_name || '-')}</td>
        <td class="right">${escapePrintText(formatQty(loaded ? (item.qtyLoaded ?? item.qty_loaded ?? item.qtyShip ?? item.qty_ship ?? 0) : (item.qtyShip ?? item.qty_ship ?? 0)))}</td>
        <td class="center">${escapePrintText(item.uom || 'PC')}</td>
      </tr>
    `).join('');
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapePrintText(docNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .page { min-height: 277mm; padding: 2mm; }
    .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .brand { font-size: 15px; font-weight: 800; }
    .muted { color: #64748b; font-size: 10px; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
    .title .number { margin-top: 4px; font-weight: 800; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-bottom: 12px; }
    .meta div { border: 1px solid #cbd5e1; padding: 6px 8px; min-height: 34px; }
    .meta span { display: block; color: #64748b; font-size: 9px; text-transform: uppercase; }
    .meta strong { display: block; margin-top: 2px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #0f172a; padding: 5px; vertical-align: top; }
    th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; }
    .center { text-align: center; }
    .right { text-align: right; }
    .summary { margin-top: 8px; display: flex; justify-content: flex-end; }
    .summary div { border: 1px solid #0f172a; padding: 6px 10px; min-width: 180px; text-align: right; font-weight: 800; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 28px; }
    .signature { border: 1px solid #0f172a; height: 78px; padding: 6px; text-align: center; font-weight: 700; }
    .signature span { display: block; margin-top: 42px; border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 400; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">PT. Matra Roda Piranti</div>
        <div class="muted">Customer Delivery Document</div>
      </div>
      <div class="title">
        <h1>${escapePrintText(documentTitle)}</h1>
        <div class="number">${escapePrintText(docNumber)}</div>
      </div>
    </div>
    <div class="meta">
      <div><span>Customer</span><strong>${escapePrintText(customerName)}</strong></div>
      <div><span>Tanggal</span><strong>${escapePrintText(sjDate)}</strong></div>
      <div><span>Ref DN Customer</span><strong>${escapePrintText(customerDn)}</strong></div>
      <div><span>${loaded ? 'Total Qty Kirim' : 'Total Qty Rencana Muat'}</span><strong>${escapePrintText(formatQty(totalQty || 0))}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;">No</th>
          <th style="width:90px;">UNIQ</th>
          <th style="width:150px;">Part No</th>
          <th>Part Name</th>
          <th style="width:90px;">${loaded ? 'Qty Kirim' : 'Qty Muat'}</th>
          <th style="width:60px;">UOM</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="6" class="center">Tidak ada item.</td></tr>'}
      </tbody>
    </table>
    <div class="summary"><div>Total: ${escapePrintText(formatQty(totalQty || 0))}</div></div>
    <div class="signatures">
      <div class="signature">Prepared<span>Admin Delivery</span></div>
      <div class="signature">${loaded ? 'Security' : 'Warehouse'}<span>&nbsp;</span></div>
      <div class="signature">${loaded ? 'Customer' : 'Loaded By'}<span>&nbsp;</span></div>
    </div>
  </div>
</body>
</html>`;
    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) {
      alert('Popup print diblokir browser. Izinkan popup untuk mencetak dokumen.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const handleCreateCustomerShipment = async (upload, { printAfter = true } = {}) => {
    const uploadId = Number(upload?.id || 0);
    if (!uploadId) return;
    const fulfilledQty = getDeliveryUploadFulfilledQty(upload);
    if (!(fulfilledQty > 0)) {
      setDeliveryUploadError('Order Muat belum bisa dibuat karena stok tersedia masih 0.');
      return;
    }
    const existing = getDeliveryUploadShipment(upload);
    if (existing?.id) {
      if (printAfter) printCustomerShipment(existing);
      setSelectedCustomerShipmentId(existing.id);
      setDeliveryWorkflowTab('outbound-customer');
      return;
    }
    setCustomerShipmentCreatingId(uploadId);
    setCustomerShipmentsError('');
    try {
      const data = await apiFetch(`/api/delivery/uploads/${uploadId}/customer-sj`, {
        method: 'POST',
        body: {},
      });
      const shipment = data?.shipment || null;
      await refreshDeliveryWorkflow({ silent: true });
      if (shipment) {
        setSelectedCustomerShipmentId(shipment.id);
        setDeliveryWorkflowTab('outbound-customer');
        notifyMessage(data?.existing ? 'Order Muat sudah pernah dibuat.' : 'Order Muat berhasil dibuat.');
        if (printAfter) printCustomerShipment(shipment);
      }
    } catch (error) {
      setCustomerShipmentsError(error.message || 'Gagal membuat Order Muat.');
      setDeliveryUploadError(error.message || 'Gagal membuat Order Muat.');
    } finally {
      setCustomerShipmentCreatingId(null);
    }
  };

  const handleScanCustomerShipmentKanban = async (event) => {
    event?.preventDefault?.();
    const shipmentId = Number(selectedCustomerShipment?.id || 0);
    const kanbanId = String(customerShipmentScanValue || '').trim();
    if (!shipmentId || !kanbanId) return;
    setCustomerShipmentScanLoading(true);
    setCustomerShipmentsError('');
    try {
      const data = await apiFetch(`/api/delivery/customer-shipments/${shipmentId}/scan-kanban`, {
        method: 'POST',
        body: { kanbanId },
      });
      await refreshDeliveryWorkflow({ silent: true });
      setCustomerShipmentScanValue('');
      notifyMessage(data?.message || 'Scan kanban berhasil.');
    } catch (error) {
      setCustomerShipmentsError(error.message || 'Scan kanban gagal.');
    } finally {
      setCustomerShipmentScanLoading(false);
    }
  };

  const handleConfirmCustomerShipmentLoaded = async (shipment = selectedCustomerShipment) => {
    const shipmentId = Number(shipment?.id || 0);
    if (!shipmentId) return;
    setCustomerShipmentConfirmingId(shipmentId);
    setCustomerShipmentsError('');
    try {
      const data = await apiFetch(`/api/delivery/customer-shipments/${shipmentId}/confirm-loaded`, {
        method: 'POST',
        body: {},
      });
      await refreshDeliveryWorkflow({ silent: true });
      if (data?.shipment?.id) {
        setSelectedCustomerShipmentId(data.shipment.id);
        printCustomerShipment(data.shipment);
      }
      notifyMessage(data?.message || 'Confirm muat berhasil.');
    } catch (error) {
      setCustomerShipmentsError(error.message || 'Confirm muat gagal.');
    } finally {
      setCustomerShipmentConfirmingId(null);
    }
  };

  const handleDeliveryUpload = async () => {
    const file = deliveryUploadInputRef.current?.files?.[0] || null;
    if (!file) {
      setDeliveryUploadError('Pilih file foto / PDF DN terlebih dahulu.');
      return;
    }
    setDeliveryUploadLoading(true);
    setDeliveryUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch('/api/delivery/upload-dn', {
        method: 'POST',
        body: formData,
        timeoutMs: 180000,
      });
      setDeliveryUploadResult(result?.upload || null);
      await refreshDeliveryWorkflow({ silent: true });
      if (deliveryUploadInputRef.current) deliveryUploadInputRef.current.value = '';
      setSelectedDeliveryUploadId(result?.upload?.id || null);
      notifyMessage('DN customer berhasil diproses.');
    } catch (error) {
      setDeliveryUploadError(error.message || 'Gagal upload DN.');
    } finally {
      setDeliveryUploadLoading(false);
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

  const handleSubmitManualProductionReport = async (event) => {
    event.preventDefault();
    if (isStockOpnameLocked) {
      notifyMessage('Selesaikan dulu Stock Opname!');
      return;
    }
    const productionDate = String(productionManualForm.productionDate || '').trim();
    const productCode = String(productionManualForm.productCode || '').trim();
    const qtyNumber = Number(productionManualForm.qty);
    if (!productionDate) {
      setProductionManualError('Tanggal produksi wajib diisi.');
      return;
    }
    if (!productCode) {
      setProductionManualError('Kode item hasil produksi wajib dipilih.');
      return;
    }
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      setProductionManualError('Qty produksi wajib lebih dari 0.');
      return;
    }
    setProductionManualSaving(true);
    setProductionManualError('');
    setProductionManualSuccess('');
    try {
      const result = await apiFetch('/api/production/consume', {
        method: 'POST',
        body: JSON.stringify({
          productCode,
          qty: qtyNumber,
          productionDate,
          source: 'MANUAL_REPORT',
          lineCode: productionManualForm.lineCode,
          shiftLabel: productionManualForm.shiftLabel,
          documentNo: productionManualForm.documentNo,
          notes: productionManualForm.notes,
        }),
      });
      setProductionManualSuccess(`Input produksi tersimpan. PROD-${result?.productionId || '-'}`);
      setProductionManualForm((prev) => ({
        ...prev,
        qty: '',
        documentNo: '',
        notes: '',
      }));
      setProductionOrderPage(1);
      await fetchProductionOrderHistory();
      await fetchProductionCompare({
        silent: true,
        start: productionCompareStart,
        end: productionCompareEnd,
        code: productionCompareCode || productCode,
      });
      notifyMessage('Input produksi manual tersimpan.');
    } catch (error) {
      setProductionManualError(error.message || 'Input produksi manual gagal.');
    } finally {
      setProductionManualSaving(false);
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
        await fetchProductionOrderHistory();
        await fetchProductionCompare({
          silent: true,
          start: productionCompareStart,
          end: productionCompareEnd,
          code: productionCompareCode,
        });
      } catch (error) {
        setProductionImportError(error.message || 'Import produksi gagal.');
        await fetchProductionImportHistory();
        await fetchProductionOrderHistory();
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
    const supplierKey = resolveKey(['supplier', 'supplier_id', 'vendor', 'vendor_id']);
    const qtyKey = resolveKey(['qty', 'snp', 'pack', 'quantity']);
    const lotKey = resolveKey(['lot', 'lot_no', 'supplier_lot', 'supplier_lot_no', 'batch', 'batch_no']);
    const kanbanKey = resolveKey(['kanban', 'kanban_id', 'kanbanid', 'card_uid', 'carduid']);
    let itemCode = itemKey ? String(parsed[itemKey] || '').trim() : '';
    const dnNumber = dnKey ? String(parsed[dnKey] || '').trim() : '';
    const supplier = supplierKey ? String(parsed[supplierKey] || '').trim() : '';
    let qty = qtyKey ? Number(parsed[qtyKey]) : NaN;
    const lotNo = lotKey ? String(parsed[lotKey] || '').trim() : '';
    const kanbanId = kanbanKey ? normalizeKanbanIdDisplay(parsed[kanbanKey]) : '';

    if (!itemCode && Array.isArray(itemList)) {
      const direct = itemList.find((item) => String(item.itemCode || '') === raw);
      if (direct) itemCode = direct.itemCode;
      if (!itemCode) {
        const matches = itemList.filter((item) => raw.includes(String(item.itemCode || '')));
        if (matches.length === 1) itemCode = matches[0].itemCode;
      }
    }

    if (!Number.isFinite(qty)) qty = NaN;
    return { raw, itemCode, dnNumber, supplier, qty, lotNo, kanbanId };
  };

  const handleToggleDnSelection = (id) => {
    setReceiveSelectedDnIds((prev) => (
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    ));
  };

  const loadReceiveItemsByDnIds = async (dnIds = []) => {
    const selectedIds = Array.isArray(dnIds) ? dnIds.filter(Boolean) : [];
    if (!selectedIds.length) {
      setReceiveError('Pilih minimal satu DN.');
      return [];
    }
    setReceiveLoading(true);
    setReceiveError('');
    setReceiveScanError('');
    try {
      const query = selectedIds.join(',');
      const rows = await apiFetch(`/api/delivery-notes/items?dnIds=${encodeURIComponent(query)}`);
      const mapped = (Array.isArray(rows) ? rows : []).map((row, index) => {
        const itemCode = row.item_code || '-';
        const originDnItemId = Number(row.id || row.origin_dn_item_id || row.dn_item_id || 0) || null;
        const masterItem = masterItemsByCode?.get(itemCode);
        const packQtyRaw = Number(row.pack_qty || 0);
        const lotQtyRaw = Number(kanbanSettingsByCode?.get(itemCode)?.lot_qty || 0);
        const packQty = Number.isFinite(packQtyRaw) && packQtyRaw > 0
          ? packQtyRaw
          : (Number.isFinite(lotQtyRaw) && lotQtyRaw > 0 ? lotQtyRaw : 0);
        const originalDocQty = Number(row.request_qty || 0);
        const alreadyReceived = Number(row.received_total || row.receivedTotal || 0);
        const docQty = Math.max(0, originalDocQty - alreadyReceived);
        const rowKey = originDnItemId
          ? `${row.dn_id}-${originDnItemId}`
          : `${row.dn_id}-${itemCode}-${row.request_id || row.line_no || index}`;
        return {
          key: rowKey,
          originDnId: row.dn_id,
          originDnItemId,
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
      return mapped;
    } catch (error) {
      setReceiveError(error.message || 'Gagal memuat item DN.');
      setReceiveItems([]);
      return [];
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleLoadReceiveItems = async () => {
    await loadReceiveItemsByDnIds(receiveSelectedDnIds);
  };

  const handleReceiveScan = async () => {
    const lines = receiveScanInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    let workingItems = [...receiveItems];
    if (!workingItems.length) {
      const initialParsed = lines.map((raw) => parseReceiveScanPayload(raw, [])).filter(Boolean);
      const firstWithDn = initialParsed.find((entry) => entry.dnNumber);
      if (!firstWithDn?.dnNumber) {
        setReceiveScanError('Label incoming harus memuat nomor DN. Load item DN terlebih dahulu jika QR lama tidak punya DN.');
        return;
      }
      const supplierForScan = firstWithDn.supplier || receiveSupplier;
      if (!supplierForScan) {
        setReceiveScanError('Label incoming harus memuat supplier. Cetak ulang label dari Supplier Portal terbaru.');
        return;
      }
      setReceiveDnLoading(true);
      setReceiveDnError('');
      try {
        const data = await apiFetch(`/api/delivery-notes/open?supplier=${encodeURIComponent(supplierForScan)}`);
        const rows = Array.isArray(data) ? data : [];
        const matchedDn = rows.find((dn) => String(dn.dn_number || '').toLowerCase() === String(firstWithDn.dnNumber || '').toLowerCase());
        if (!matchedDn?.id) {
          setReceiveScanError(`DN ${firstWithDn.dnNumber} tidak ditemukan/open untuk supplier ${supplierForScan}.`);
          setReceiveDnOptions(rows);
          return;
        }
        receiveAutoLoadRef.current = true;
        setReceiveSupplier(supplierForScan);
        setReceiveDnOptions(rows);
        setReceiveSelectedDnIds([matchedDn.id]);
        workingItems = await loadReceiveItemsByDnIds([matchedDn.id]);
        if (!workingItems.length) {
          setReceiveScanError(`Item DN ${firstWithDn.dnNumber} tidak bisa dimuat.`);
          return;
        }
      } catch (error) {
        setReceiveScanError(error.message || 'Gagal auto-load DN dari QR.');
        return;
      } finally {
        setReceiveDnLoading(false);
      }
    }
    let latestError = '';
    const nextLogs = [...receiveScanLogs];
    let updatedItems = [...workingItems];
    lines.forEach((raw) => {
      const parsed = parseReceiveScanPayload(raw, updatedItems);
      if (!parsed) return;
      if (!parsed.itemCode) {
        latestError = 'Item QR tidak ditemukan.';
        return;
      }
      let itemIndex = -1;
      if (parsed.dnNumber) {
        const matches = updatedItems
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.itemCode === parsed.itemCode && item.dnNumber === parsed.dnNumber);
        const openMatch = matches.find(({ item }) => Number(item.receivedQty || 0) < Number(item.docQty || 0));
        itemIndex = (openMatch || matches[0])?.index ?? -1;
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
        originDnItemId: item.originDnItemId,
        dnNumber: item.dnNumber,
        qty: qtyValue,
        lotNo: parsed.lotNo || '',
        kanbanId: parsed.kanbanId || '',
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
      const next = prev.filter((log) => {
        const logKey = log.originDnItemId
          ? `${log.originDnId}-${log.originDnItemId}`
          : `${log.originDnId}-${log.itemCode}`;
        return logKey !== itemKey;
      });
      receiveScanSetRef.current = new Set(next.map((log) => log.qrValue));
      return next;
    });
  };

  const receiveDoFormatValidation = validateReceiveDoNumberFormat(receiveDoNumber);
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

  const receiveVarianceSummary = useMemo(() => {
    const rows = (receiveItems || [])
      .map((item) => {
        const docQty = Number(item.docQty || 0);
        const receivedQty = Number(item.receivedQty || 0);
        const variance = receivedQty - docQty;
        const status = variance === 0 ? 'MATCH' : variance < 0 ? 'SHORT' : 'OVER';
        return { ...item, docQty, receivedQty, variance, status };
      })
      .filter((item) => item.status !== 'MATCH');
    const shortRows = rows.filter((item) => item.status === 'SHORT');
    const overRows = rows.filter((item) => item.status === 'OVER');
    return {
      rows,
      shortRows,
      overRows,
      hasVariance: rows.length > 0,
      hasShort: shortRows.length > 0,
      hasOver: overRows.length > 0,
      totalReceived: (receiveItems || []).reduce((acc, item) => acc + Number(item.receivedQty || 0), 0),
      shortQty: shortRows.reduce((acc, item) => acc + Math.abs(Number(item.variance || 0)), 0),
      overQty: overRows.reduce((acc, item) => acc + Number(item.variance || 0), 0),
    };
  }, [receiveItems]);

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
    const normalizedReceiveDoNumber = normalizeReceiveDoNumber(receiveDoNumber);
    if (!normalizedReceiveDoNumber) {
      const message = 'Nomor SJ / DO masih kosong. Isi nomor surat jalan sebelum confirm receiving.';
      setReceiveError(message);
      notifyMessage(message, '', null, 'warning');
      return;
    }
    if (!receiveDoFormatValidation.valid) {
      const message = receiveDoFormatValidation.reason || 'Nomor SJ / DO wajib diisi.';
      setReceiveError(message);
      notifyMessage(message, '', null, 'warning');
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
    const scanMetaByLine = new Map();
    receiveScanLogs.forEach((scan) => {
      const key = scan.originDnItemId
        ? `${scan.originDnId}-${scan.originDnItemId}`
        : `${scan.originDnId}-${scan.itemCode}`;
      if (!scanMetaByLine.has(key)) scanMetaByLine.set(key, { lotNo: '', kanbanId: '' });
      const meta = scanMetaByLine.get(key);
      if (!meta.lotNo && scan.lotNo) meta.lotNo = scan.lotNo;
      if (!meta.kanbanId && scan.kanbanId) meta.kanbanId = scan.kanbanId;
    });
    const payloadItems = receiveItems.map((item) => {
      const key = item.originDnItemId
        ? `${item.originDnId}-${item.originDnItemId}`
        : `${item.originDnId}-${item.itemCode}`;
      const meta = scanMetaByLine.get(key) || {};
      return {
        originDnId: item.originDnId,
        originDnItemId: item.originDnItemId,
        itemCode: item.itemCode,
        receivedQty: Number(item.receivedQty || 0),
        supplierLotNo: meta.lotNo || null,
        kanbanId: meta.kanbanId || null,
      };
    });
    const totalReceived = receiveItems.reduce((acc, item) => acc + Number(item.receivedQty || 0), 0);
    if (!totalReceived) {
      setReceiveError('Qty terima masih 0.');
      return;
    }
    if (receiveVarianceSummary.hasOver) {
      const details = receiveVarianceSummary.overRows
        .slice(0, 5)
        .map((item) => `${item.itemCode}: DN ${formatQty(item.docQty)} / terima ${formatQty(item.receivedQty)} / lebih ${formatQty(item.variance)}`)
        .join('\n');
      const ok = window.confirm(`Over delivery detected.\n\n${details}\n\nJika dilanjutkan, sistem akan mencatat qty lebih sebagai exception receiving. Lanjutkan?`);
      if (!ok) return;
    }
    if (receiveVarianceSummary.hasShort) {
      const details = receiveVarianceSummary.shortRows
        .slice(0, 5)
        .map((item) => `${item.itemCode}: DN ${formatQty(item.docQty)} / terima ${formatQty(item.receivedQty)} / kurang ${formatQty(Math.abs(item.variance))}`)
        .join('\n');
      const ok = window.confirm(`Short receiving detected.\n\n${details}\n\nJika dilanjutkan, RN akan dibuat untuk qty yang diterima dan sisa DN tetap outstanding/partial. Lanjutkan?`);
      if (!ok) return;
    }
    if (receiveDoCheck.status === 'warn') {
      const ok = window.confirm(receiveDoCheck.message || 'Nomor SJ ini sudah pernah muncul. Lanjutkan sebagai pengiriman gabungan?');
      if (!ok) return;
    }
    setReceiveSubmitting(true);
    setReceiveError('');
    try {
      const result = await apiFetch('/api/receive-notes/merge', {
        method: 'POST',
        body: JSON.stringify({
          supplier: receiveSupplier,
          doNumber: normalizedReceiveDoNumber,
          dnIds: receiveSelectedDnIds,
          items: payloadItems,
          scans: receiveScanLogs,
          truckNo: receiveTruckNo,
          driverName: receiveDriverName,
          millsheetQuestion: receiveMillsheetQuestion,
          millsheetNotes: receiveMillsheetNotes,
          allowOverReceive: receiveVarianceSummary.hasOver,
        }),
      });
      await fetchReceiveNotes?.();
      await fetchDeliveryNotes?.();
      await fetchOpenDns(receiveSupplier);
      resetReceiveState();
      setReceiveSelectedDnIds([]);
      const rnNumber = result?.rnNumber || result?.postResult?.header?.rn_number || '';
      notifyMessage(
        `Penerimaan aktual ${rnNumber || normalizedReceiveDoNumber || 'RN'} tersimpan.`,
        rnNumber ? 'Buka' : '',
        rnNumber ? () => openReceivingNoteByNumber(rnNumber) : null,
        'success',
      );
    } catch (error) {
      setReceiveError(error.message || 'Gagal menyimpan receiving.');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleDeleteReceiveNote = async (rn) => {
    if (!rn) return;
    if (rn.rn_type === 'header' && rn.rn_header_id) {
      handleReverseReceiveNote(rn);
      return;
    }
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

  const handleReverseReceiveNote = async (rn) => {
    if (!rn) return;
    if (rn.rn_type !== 'header' || !rn.rn_header_id) {
      alert('RN lama belum support reversal otomatis. Gunakan hapus RN hanya jika benar-benar perlu.');
      return;
    }
    const label = rn.rn_number || rn.id || '';
    const reason = window.prompt(
      `Batalkan/Reversal RN ${label}?\n\nStok, sisa PO, dan schedule akan dibalik. Isi alasan koreksi:`,
      'Salah input item/qty penerimaan.',
    );
    if (reason === null) return;
    const cleanReason = String(reason || '').trim();
    if (!cleanReason) {
      alert('Alasan wajib diisi untuk reversal RN.');
      return;
    }
    try {
      const result = await apiFetch(`/api/inbound/receipts/${rn.rn_header_id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: cleanReason }),
      });
      await fetchReceiveNotes?.();
      await fetchDeliveryNotes?.();
      const reversedLabel = result?.header?.rn_number || label;
      notifyMessage(
        `RN ${reversedLabel} berhasil dibatalkan. Silakan input ulang penerimaan yang benar.`,
        'Buka RN',
        () => openReceivingNoteByNumber(label),
        'warning',
      );
    } catch (error) {
      alert(error.message || 'Gagal membatalkan RN.');
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
    const doNumber = rn.do_number || items.find((row) => row.do_number)?.do_number || '-';
    const dnReference = rn.dn_reference || rn.dn_number || rn.dnNumber || (doNumber !== '-' ? doNumber : '-');
    const poNumbers = Array.from(new Set(
      items
        .map((row) => String(row.po_number || row.schedule_po_number || row.po_line_po_number || '').trim())
        .filter(Boolean),
    ));
    const totalDocQty = items.reduce((sum, row) => sum + Number(row.expected_qty ?? row.doc_qty ?? 0), 0);
    const totalActualQty = items.reduce((sum, row) => sum + Number(row.received_qty ?? row.actual_qty ?? 0), 0);
    const receivedByName = rn.received_by_name || items.find((row) => row.received_by_name)?.received_by_name || '-';
    const remarks = rn.notes || items.find((row) => row.notes)?.notes || '-';
    const statusLabel = totalActualQty > totalDocQty ? 'OVER'
      : totalActualQty < totalDocQty ? 'SHORT'
      : 'COMPLETE';
    return {
      rnNumber: rn.rn_number || '-',
      receivedDateLabel: receivedDate ? receivedDate.toLocaleDateString('id-ID') : '-',
      receivedTimeLabel: receivedDate ? receivedDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      supplierName: rn.supplier || '-',
      truckPlate: rn.truck_no || rn.truck_plate || rn.plate_no || '-',
      driverName: rn.driver_name || '-',
      poNumberLabel: poNumbers.length > 1 ? `${poNumbers[0]} +${poNumbers.length - 1}` : (poNumbers[0] || '-'),
      doNumber,
      dnReference,
      receivedByName,
      remarks,
      totalDocQty,
      totalActualQty,
      totalVarianceQty: totalActualQty - totalDocQty,
      itemCount: items.length,
      statusLabel,
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
              <div className="rn-info-label">NO PO</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.poNumberLabel}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">NO SJ / DO</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.doNumber || '-'}</div>
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
              <div className="rn-info-label">JAM TERIMA</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.receivedTimeLabel}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">DN REFERENCE</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.dnReference || '-'}</div>
            </div>
            <div className="rn-info-row">
              <div className="rn-info-label">DITERIMA OLEH</div>
              <div className="rn-info-sep">:</div>
              <div className="rn-info-value">{rnPrintPayload.receivedByName}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
          <div className="rounded border border-slate-300 px-3 py-2">
            <div className="text-slate-500">Total Line</div>
            <div className="font-semibold">{rnPrintPayload.itemCount}</div>
          </div>
          <div className="rounded border border-slate-300 px-3 py-2">
            <div className="text-slate-500">Qty Dokumen</div>
            <div className="font-semibold">{formatDnQty0(rnPrintPayload.totalDocQty)}</div>
          </div>
          <div className="rounded border border-slate-300 px-3 py-2">
            <div className="text-slate-500">Qty Aktual</div>
            <div className="font-semibold">{formatDnQty0(rnPrintPayload.totalActualQty)}</div>
          </div>
          <div className="rounded border border-slate-300 px-3 py-2">
            <div className="text-slate-500">Status Receipt</div>
            <div className="font-semibold">{rnPrintPayload.statusLabel}</div>
          </div>
        </div>

        <div className="mt-2 rounded border border-slate-300 px-3 py-2 text-[11px]">
          <span className="font-semibold">Remarks:</span> {rnPrintPayload.remarks || '-'}
        </div>

        <table className="w-full rn-print-table">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '36%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>UNIQ</th>
              <th>PART NUMBER /<br />PART NAME</th>
              <th>Unit</th>
              <th>Doc Qty</th>
              <th>Actual Qty</th>
              <th>Selisih</th>
              <th>QC Status</th>
            </tr>
          </thead>
          <tbody>
            {rnPrintPayload.items.map((row, index) => {
              const itemCode = String(row.item_code || row.uniq || '').trim();
              const masterItem = itemCode ? masterItemsByCode?.get(itemCode) : null;
              const partNo = row.part_no || row.partNo || masterItem?.part_no || masterItem?.partNo || itemCode || '-';
              const partName = row.part_name || row.item_name || row.partName || row.itemName || masterItem?.name || partNo || '-';
              const unitLabel = row.unit || row.item_unit || row.uom || '-';
              const docQtyValue = Number(row.expected_qty ?? row.doc_qty ?? 0);
              const qtyValue = row.received_qty ?? row.actual_qty ?? 0;
              const varianceValue = Number(qtyValue || 0) - docQtyValue;
              const uniqValue = row.uniq || itemCode || masterItem?.code || partNo || '-';
              const qcStatusLabel = String(row.qc_status || 'OK').toUpperCase();
              return (
                <tr key={`${row.id}-${index}`}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center rn-uniq">{uniqValue}</td>
                  <td className="rn-part-cell">
                    <div className="rn-part-no">{partNo}</div>
                    <div className="rn-part-name">{partName}</div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Prod: {row.production_date ? new Date(row.production_date).toLocaleDateString('id-ID') : '-'} | Exp: {row.expired_date ? new Date(row.expired_date).toLocaleDateString('id-ID') : '-'}
                    </div>
                  </td>
                  <td className="text-center">{unitLabel}</td>
                  <td className="text-right">{formatDnQty0(docQtyValue)}</td>
                  <td className="text-right">{formatDnQty0(qtyValue)}</td>
                  <td className="text-right">{varianceValue > 0 ? `+${formatDnQty0(varianceValue)}` : formatDnQty0(varianceValue)}</td>
                  <td className="text-center">{qcStatusLabel}</td>
                </tr>
              );
            })}
            {rnPrintPayload.items.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-400">Tidak ada item.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="rn-footer-section">
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
          <div className="rn-page-footer" />
        </div>
      </div>
    );
  };

  const renderDnPrintDocument = () => {
    if (dnPrintLoading) {
      return <div className="text-xs text-slate-400">Loading...</div>;
    }
    if (!dnPrintPayload) {
      return <div className="text-xs text-slate-400">Data is not available.</div>;
    }
    const {
      dnNumber,
      supplierName,
      dateLabel,
      deliveryDateLabel,
      deliveryType,
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
    const dnStatus = String(dnPrintPayload?.sourceDn?.status || '').toLowerCase();
    const dnStatusLabel = dnStatus ? dnStatus.toUpperCase() : 'UNKNOWN';
    const dnDeliveryTypeLabel = String(deliveryType || dnPrintPayload?.sourceDn?.delivery_type || 'normal').toUpperCase();
    const dnStatusNotice = (() => {
      if (dnStatus === 'draft') {
        return {
          title: 'DN is still in Draft.',
          detail: 'Review the delivery date and rit/time, then use Print/PDF or Email to release the DN before sending it to the supplier.',
          className: 'border-amber-200 bg-amber-50 text-amber-800',
        };
      }
      if (dnStatus === 'open') {
        return {
          title: 'DN is open and ready to send.',
          detail: 'Use Email to send the DN to the supplier. After it is emailed, the DN status will move to SENT and delivery monitoring will start.',
          className: 'border-sky-200 bg-sky-50 text-sky-800',
        };
      }
      if (dnStatus === 'sent') {
        return {
          title: 'DN has been sent to the supplier.',
          detail: 'Monitor the planned delivery date and continue with receiving once the shipment arrives.',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        };
      }
      if (dnStatus === 'partial') {
        return {
          title: 'DN is partially received.',
          detail: 'Review remaining quantity and close the DN only after the delivery is completed or approved for force close.',
          className: 'border-orange-200 bg-orange-50 text-orange-800',
        };
      }
      if (dnStatus === 'closed' || dnStatus === 'received') {
        return {
          title: 'DN is completed.',
          detail: 'No further delivery action is required for this DN.',
          className: 'border-slate-200 bg-slate-50 text-slate-700',
        };
      }
      return {
        title: 'DN status requires review.',
        detail: 'Check the DN status and delivery schedule before sending or receiving this document.',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
      };
    })();
    const canPrintCards = ['open', 'sent', 'in_transit', 'partial', 'published'].includes(dnStatus);

    const primaryDelivery = masterDeliveries?.[0] || null;
    const deliveryArea = masterAreas?.find((area) => area.id === primaryDelivery?.area_id) || null;
    const deliveryPlant = masterPlants?.find((plant) => plant.id === deliveryArea?.plant_id) || masterPlants?.[0] || null;
    const plantCode = deliveryPlant?.id || '-';
    const deliveryCode = primaryDelivery?.id || deliveryArea?.id || '-';
    const destinationPlant = [plantCode, deliveryCode].filter(Boolean).join(' ') || '-';
    const summaryRows = items.map((row, index) => ({
      no: index + 1,
      uniq: row.uniq || '-',
      partNo: row.partNo || '-',
      partName: row.partName || '-',
      packing: row.packing || '-',
      dropZone: row.dropZone || '-',
      unit: row.unit || '-',
      qtyKbn: row.qtyKbn,
      orderKbn: row.orderKbn,
      orderUnit: row.orderUnit,
    }));
    const printDateLabel = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const cardRows = Array.isArray(dnPrintPayload.cards) ? dnPrintPayload.cards : [];
    const cardItemsByCode = new Map(summaryRows.map((item) => [item.uniq, item]));
    const showCardSection = canPrintCards && dnPrintMode === 'cards' && cardRows.length > 0;
    const cardPayloads = showCardSection && dnPrintCardsReady
      ? cardRows.map((card, index) => {
        const item = cardItemsByCode.get(card.item_code || '') || null;
        const seq = Number(card.card_seq || index + 1) || index + 1;
        const total = Number(card.total_cards || 1) || 1;
        const qtyBox = Number(card.card_qty || item?.orderUnit || 0);
        const lotBatch = String(card.lot_batch || item?.requestCode || '').trim();
        return {
          key: `${card.item_code || item?.uniq || 'item'}-${seq}-${card.card_uid || index}`,
          seq,
          total,
          destinationPlant,
          supplier: supplierName || '-',
          partNo: card.part_no || item?.partNo || card.item_code || '-',
          itemName: item?.partName || card.item_name || '-',
          uniqueCode: item?.uniq || card.item_code || '-',
          qtyBox,
          orderNumber: lotBatch || dnNumber || '-',
          locationLabel: companyName || deliveryAddress || '-',
          cycleLabel: cycleLabel || '-',
          dockGateLabel: areaLabel || '-',
          mainQrValue: card.card_uid || `${dnNumber}-${card.item_code || item?.uniq || 'item'}-${seq}`,
          secondaryQrValue: qrValue || dnNumber || '',
          deliveryTimeLabel: [deliveryDateLabel, timeLabel].filter(Boolean).join(' ') || '-',
          orderDate: dateLabel || '-',
          lotBatch: lotBatch || '-',
        };
      })
      : [];
    const cardsPerPage = 4;
    const cardPages = [];
    for (let index = 0; index < cardPayloads.length; index += cardsPerPage) {
      cardPages.push(cardPayloads.slice(index, index + cardsPerPage));
    }

    return (
      <div
        className="mx-auto bg-white text-slate-900 print-body dn-print-page"
        style={{ width: '100%', maxWidth: '210mm' }}
      >
        <div className={`mb-3 rounded-lg border px-3 py-2 text-[11px] print:hidden ${dnStatusNotice.className}`}>
          <div className="font-semibold">Status {dnStatusLabel}: {dnStatusNotice.title}</div>
          <div className="mt-0.5">{dnStatusNotice.detail}</div>
        </div>
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
                        <div className="dn-dept">Department Logistics (PPIC)</div>
                      </div>
                    </div>
                    <div className="dn-doc">
                      <div className="dn-title">DELIVERY NOTE</div>
                      <div className="dn-number">{dnNumber}</div>
                      <div className="dn-print-date">PRINT DATE : {printDateLabel}</div>
                      <div className="mt-1 inline-block border border-slate-900 px-2 py-0.5 text-[8px] font-bold">
                        STATUS : {dnStatusLabel}
                      </div>
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
                      <div className="dn-info-row">
                        <div className="dn-info-label">TYPE</div>
                        <div className="dn-info-sep">:</div>
                        <div className="dn-info-value">{dnDeliveryTypeLabel}</div>
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
            {summaryRows.map((row) => (
              <tr key={`${row.uniq}-${row.no}`}>
                <td className="border border-slate-900 p-1 text-center">{row.no}</td>
                <td className="border border-slate-900 p-1 text-center font-semibold">{row.uniq}</td>
                <td className="border border-slate-900 p-1 dn-part-cell">
                  <div className="dn-part-no">{row.partNo}</div>
                  <div className="dn-part-name">{row.partName}</div>
                </td>
                <td className="border border-slate-900 p-1 text-center">{row.packing}</td>
                <td className="border border-slate-900 p-1 text-center">{row.dropZone || '-'}</td>
                <td className="border border-slate-900 p-1 text-center">{row.unit}</td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty(row.qtyKbn)}</td>
                <td className="border border-slate-900 p-1 text-right">
                  {row.qtyKbn ? formatDnQty(row.orderKbn) : '-'}
                </td>
                <td className="border border-slate-900 p-1 text-right">{formatDnQty0(row.orderUnit)}</td>
              </tr>
            ))}
            {summaryRows.length === 0 && (
              <tr>
                <td colSpan="9" className="border border-slate-900 p-2 text-center text-slate-500">
                  No items.
                </td>
              </tr>
            )}
            {summaryRows.length > 0 && (
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

        {showCardSection && (
          <div className="mt-4 dn-card-section">
            <div className="text-xs font-semibold mb-2">KANBAN CARDS - {dnNumber}</div>
            {!dnPrintCardsReady ? (
              <div className="border border-dashed border-slate-300 rounded-lg p-4 text-[11px] text-slate-500 bg-slate-50">
                Menyiapkan kartu kanban untuk cetak...
              </div>
            ) : cardPages.length > 0 ? (
              cardPages.map((page, pageIndex) => (
                <div
                  key={`dn-cards-${pageIndex}`}
                  className="dn-card-sheet"
                >
                  <div className="dn-card-grid">
                    {page.map((card) => {
                      const partNoSize = String(card.partNo || '').length > 16 ? '18pt' : '22pt';
                      const qtySize = String(formatDnQty(card.qtyBox) || '').length > 4 ? '18pt' : '22pt';
                      return (
                        <div
                          key={card.key}
                          className="dn-kanban-card"
                        >
                          <div className="dn-kanban-card__body">
                            <div className="dn-kanban-card__top">
                              <div className="border-r-2 border-black flex flex-col items-center justify-center gap-0.25 text-center px-1">
                                <div className="text-[8.5pt] font-bold leading-tight">{card.destinationPlant || '-'}</div>
                                <div className="text-[5pt] font-semibold uppercase tracking-wide text-slate-700">{card.supplier}</div>
                              </div>
                              <div className="border-r-2 border-black flex flex-col items-center justify-center leading-tight px-1">
                                <div className="text-[7pt] font-bold">E-KANBAN CARD</div>
                                <div className="text-[5pt] font-semibold">PT MRP</div>
                              </div>
                              <div className="flex items-center justify-center">
                                <QRCodeSVG value={card.secondaryQrValue} size={28} />
                              </div>
                            </div>

                            <div className="dn-kanban-card__middle">
                              <div className="dn-kanban-card__main">
                                <div className="dn-part-group">
                                  <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">PART NO</div>
                                  <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: partNoSize }}>
                                    {card.partNo}
                                  </div>
                                  <div className="text-[6pt] font-semibold leading-tight text-slate-700">{card.itemName}</div>
                                </div>
                                <div className="dn-grid-info">
                                  <div className="dn-qty-panel">
                                    <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">QTY</div>
                                    <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: qtySize }}>
                                      {formatDnQty(card.qtyBox)}
                                    </div>
                                  </div>
                                  <div className="dn-order-panel">
                                    <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">ORDER NO</div>
                                    <div className="text-[8pt] font-bold break-all">{card.orderNumber}</div>
                                    <div className="text-[6pt] font-semibold uppercase tracking-wide mt-1 text-slate-700">LOCATION</div>
                                    <div className="text-[7pt] font-semibold">{card.locationLabel}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="dn-kanban-card__meta">
                                <div className="dn-meta-line">
                                  <span>CYCLE</span>
                                  <strong>{card.cycleLabel}</strong>
                                </div>
                                <div className="dn-meta-line">
                                  <span>AREA</span>
                                  <strong>{card.dockGateLabel}</strong>
                                </div>
                                <div className="dn-meta-chip">UNIQUE {card.uniqueCode}</div>
                                <div className="dn-meta-qr">
                                  <QRCodeSVG value={card.mainQrValue} size={48} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500">
                Tidak ada kartu kanban yang bisa dicetak untuk DN ini.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const [masterToolsOpen, setMasterToolsOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [kanbanSyncLoading, setKanbanSyncLoading] = useState(false);
  const [kanbanItemVisibleLimit, setKanbanItemVisibleLimit] = useState(75);
  const [showMissingKanbanPanel, setShowMissingKanbanPanel] = useState(false);
  const [missingKanbanSearch, setMissingKanbanSearch] = useState('');
  const [missingKanbanCategoryFilter, setMissingKanbanCategoryFilter] = useState('all');
  const [selectedMissingKanbanCodes, setSelectedMissingKanbanCodes] = useState([]);
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
      const supplierMeta = resolveMasterItemSupplier(row.item_code);
      const supplier = `${supplierMeta.supplierCode} ${supplierMeta.supplierName}`.toLowerCase();
      const category = String(row.item_type || '').toLowerCase();
      const dropZone = String(row.drop_zone || '').toLowerCase();
      return itemCode.includes(query)
        || itemName.includes(query)
        || supplier.includes(query)
        || category.includes(query)
        || dropZone.includes(query);
    });
  }, [kanbanSettings, masterSearch, itemSupplierMap, masterItemsByCode, masterVendors]);
  const visibleKanbanBoardItems = useMemo(
    () => filteredKanbanItems.slice(0, kanbanItemVisibleLimit),
    [filteredKanbanItems, kanbanItemVisibleLimit],
  );

  useEffect(() => {
    setKanbanItemVisibleLimit(75);
  }, [kanbanSearch, kanbanCategoryFilter]);

  const missingKanbanItems = useMemo(() => {
    const existingCodes = new Set((kanbanSettings || []).map((row) => String(row.item_code || '').trim()).filter(Boolean));
    return (items || [])
      .filter((item) => String(item?.code || '').trim())
      .filter((item) => !existingCodes.has(String(item.code).trim()))
      .filter((item) => !String(item.code || '').toUpperCase().startsWith('TEST-'))
      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
  }, [items, kanbanSettings]);

  const missingKanbanPreview = missingKanbanItems.slice(0, 8);

  const masterCategoryFilterOptions = useMemo(() => {
    const options = (masterCategories || [])
      .map((category) => ({
        code: String(category?.code || '').trim(),
        name: String(category?.name || '').trim(),
      }))
      .filter((category) => category.code || category.name);
    if (options.length > 0) return options;
    return [
      { code: 'FG', name: 'Finished Good' },
      { code: 'CP', name: 'Child Part' },
      { code: 'SA', name: 'Sub-Assy' },
      { code: 'RM', name: 'Raw Material' },
      { code: 'IM', name: 'Indirect Material' },
      { code: 'CB', name: 'Consumable' },
      { code: 'SUBCON', name: 'Subcon' },
    ];
  }, [masterCategories]);

  const resolveMissingKanbanCategory = (item) => {
    const rawValue = String(item?.type || item?.item_type || item?.category || '').trim();
    const rawLower = rawValue.toLowerCase();
    const matched = masterCategoryFilterOptions.find((category) => {
      const codeLower = String(category.code || '').toLowerCase();
      const nameLower = String(category.name || '').toLowerCase();
      return (
        (codeLower && rawLower === codeLower) ||
        (nameLower && rawLower === nameLower) ||
        (codeLower && rawLower.includes(codeLower)) ||
        (nameLower && rawLower.includes(nameLower))
      );
    });
    if (matched) {
      return {
        code: matched.code || rawValue,
        name: matched.name || matched.code || rawValue,
        label: matched.name ? `${matched.code} - ${matched.name}` : (matched.code || rawValue || '-'),
      };
    }
    return {
      code: rawValue || '-',
      name: rawValue || '-',
      label: rawValue || '-',
    };
  };

  const visibleMissingKanbanItems = useMemo(() => {
    const query = missingKanbanSearch.trim().toLowerCase();
    const categoryFilter = String(missingKanbanCategoryFilter || 'all').trim().toLowerCase();
    return missingKanbanItems.filter((item) => {
      const code = String(item?.code || '').toLowerCase();
      const name = String(item?.name || '').toLowerCase();
      const category = resolveMissingKanbanCategory(item);
      const categoryCode = String(category.code || '').toLowerCase();
      const categoryName = String(category.name || '').toLowerCase();
      const matchesSearch = !query || code.includes(query) || name.includes(query) || categoryCode.includes(query) || categoryName.includes(query);
      const matchesCategory =
        categoryFilter === 'all' ||
        categoryCode === categoryFilter ||
        categoryName === categoryFilter ||
        String(item?.type || '').toLowerCase() === categoryFilter ||
        String(item?.category || '').toLowerCase() === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [missingKanbanItems, missingKanbanSearch, missingKanbanCategoryFilter, masterCategoryFilterOptions]);

  useEffect(() => {
    const missingSet = new Set(missingKanbanItems.map((item) => String(item.code || '').trim()).filter(Boolean));
    setSelectedMissingKanbanCodes((prev) => prev.filter((code) => missingSet.has(String(code || '').trim())));
  }, [missingKanbanItems]);

  const selectedVisibleMissingKanbanCodes = useMemo(() => {
    const visibleCodes = new Set(visibleMissingKanbanItems.map((item) => String(item.code || '').trim()).filter(Boolean));
    return selectedMissingKanbanCodes.filter((code) => visibleCodes.has(String(code || '').trim()));
  }, [selectedMissingKanbanCodes, visibleMissingKanbanItems]);

  const allVisibleMissingSelected = visibleMissingKanbanItems.length > 0
    && visibleMissingKanbanItems.every((item) => selectedVisibleMissingKanbanCodes.includes(String(item.code || '').trim()));

  const toggleMissingKanbanSelection = (code) => {
    const normalized = String(code || '').trim();
    if (!normalized) return;
    setSelectedMissingKanbanCodes((prev) => (
      prev.includes(normalized)
        ? prev.filter((value) => value !== normalized)
        : [...prev, normalized]
    ));
  };

  const toggleVisibleMissingSelection = () => {
    const visibleCodes = visibleMissingKanbanItems.map((item) => String(item.code || '').trim()).filter(Boolean);
    if (!visibleCodes.length) return;
    setSelectedMissingKanbanCodes((prev) => {
      const prevSet = new Set(prev);
      const shouldSelectAll = !visibleCodes.every((code) => prevSet.has(code));
      if (shouldSelectAll) {
        return Array.from(new Set([...prev, ...visibleCodes]));
      }
      return prev.filter((code) => !visibleCodes.includes(code));
    });
  };

  const clearMissingKanbanSelection = () => setSelectedMissingKanbanCodes([]);

  const handleGenerateMissingKanban = async () => {
    if (kanbanSyncLoading || missingKanbanItems.length === 0) return;
    setShowMissingKanbanPanel(true);
    setKanbanSyncLoading(true);
    try {
      const codes = selectedMissingKanbanCodes.length > 0
        ? selectedMissingKanbanCodes
        : missingKanbanItems.map((item) => item.code);
      await handleGenerateKanbanFromMasterItems?.({ itemCodes: codes });
      clearMissingKanbanSelection();
    } finally {
      setKanbanSyncLoading(false);
    }
  };

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
  const [dnBatchWarnings, setDnBatchWarnings] = useState({ missingSupplier: [], invalidRole: [], invalidFlow: [] });
  const [requestBatchResultModal, setRequestBatchResultModal] = useState(null);

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

  const getRequestSupplyLabel = (row = {}) => {
    const supplySource = String(row?.supply_source || row?.supplySource || '').trim().toLowerCase();
    if (supplySource === 'prl') {
      const ref = String(row?.supply_ref || row?.supplyRef || '').trim();
      const remaining = row?.supply_qty_remaining_snapshot ?? row?.supplyQtyRemainingSnapshot;
      const remainingLabel = Number.isFinite(Number(remaining)) ? ` | sisa ${formatQty(remaining)}` : '';
      return `${ref || 'PRL'}${remainingLabel}`;
    }
    const poNumber = String(row?.po_number || row?.poNumber || '').trim();
    if (!poNumber) return '-';
    const lineNo = row?.po_line_no ?? row?.poLineNo;
    const remaining = row?.po_qty_remaining_snapshot ?? row?.poQtyRemainingSnapshot;
    const lineLabel = lineNo !== null && lineNo !== undefined && String(lineNo).trim() !== '' ? ` / L${lineNo}` : '';
    const remainingLabel = Number.isFinite(Number(remaining)) ? ` | sisa ${formatQty(remaining)}` : '';
    return `${poNumber}${lineLabel}${remainingLabel}`;
  };

  const getBatchResultRequestRow = (modal, requestId) => {
    const idText = String(requestId || '');
    return (modal?.selectedRows || []).find((row) => String(row?.id || '') === idText)
      || kanbanRequests.find((row) => String(row?.id || '') === idText)
      || null;
  };

  const getBatchResultRequestLabel = (row, fallbackId = '') => {
    if (row) return getRequestIdLabel(row);
    return fallbackId ? `Request #${fallbackId}` : '-';
  };

  const getBatchResultPartName = (row = null, fallbackItemCode = '') => {
    const direct = row?.item_name || row?.itemName || row?.part_name || row?.partName || '';
    if (String(direct || '').trim()) return String(direct).trim();
    const itemCode = String(fallbackItemCode || row?.item_code || row?.itemCode || '').trim();
    const masterItem = itemCode ? masterItemsByCode?.get?.(itemCode) : null;
    return masterItem?.name || masterItem?.part_name || masterItem?.partName || '-';
  };

  const getBatchSkippedReasonLabel = (skip = {}) => {
    const reason = String(skip.reason || skip.code || '').trim().toLowerCase();
    if (reason === 'kanban_po_required' || reason === 'kanban_po_qty_exceeded' || reason === 'po_required') return 'PO kurang';
    if (reason === 'kanban_prl_qty_exceeded') return 'PRL kurang';
    if (reason === 'missing_supplier') return 'Supplier belum ada';
    if (reason === 'invalid_role') return 'Role supplier bukan Delivery Note';
    if (reason === 'invalid_flow') return 'Flow bukan Supplier DN';
    if (reason === 'dn_linked') return 'Sudah punya DN';
    if (reason === 'manual_role') return 'Approval manual butuh supervisor';
    if (reason === 'status') return `Status tidak valid${skip.status ? ` (${skip.status})` : ''}`;
    return reason ? reason.replace(/_/g, ' ') : 'Tidak diproses';
  };

  const getBatchSkippedQtyText = (skip = {}, row = null) => {
    const details = skip.details || {};
    const requiredQty = details.requiredQty ?? skip.requestQty ?? row?.request_qty;
    const availableQty = details.availableQty;
    const shortageQty = details.shortageQty;
    const parts = [];
    if (Number.isFinite(Number(requiredQty))) parts.push(`request ${formatQty(requiredQty)}`);
    if (Number.isFinite(Number(availableQty))) parts.push(`tersedia ${formatQty(availableQty)}`);
    if (Number.isFinite(Number(shortageQty)) && Number(shortageQty) > 0) parts.push(`kurang ${formatQty(shortageQty)}`);
    return parts.join(' | ');
  };

  const openRequestBatchResult = (action, outcome) => {
    if (!outcome || typeof outcome !== 'object') return;
    setRequestBatchResultModal({
      action,
      ok: Boolean(outcome.ok),
      error: outcome.error || outcome.result?.error || '',
      result: outcome.result || {},
      selectedRows: outcome.selectedRows || [],
    });
  };

  const renderRequestBatchResultModal = () => {
    const modal = requestBatchResultModal;
    if (!modal) return null;
    const result = modal.result || {};
    const approvedRows = Array.isArray(result.approved) ? result.approved : [];
    const skippedRows = Array.isArray(result.skipped) ? result.skipped : [];
    const dnLinks = Array.isArray(result.dnRequestLinks) ? result.dnRequestLinks : [];
    const actionLabel = modal.action === 'approve-dn'
      ? 'Batch Approve + DN'
      : modal.action === 'dn'
        ? 'Batch DN'
        : 'Batch Approve';
    const dnRequestCount = dnLinks.reduce((sum, link) => sum + Number(link.requestCount || link.requestIds?.length || 0), 0);
    const successCount = modal.action === 'approve' ? approvedRows.length : dnRequestCount;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-5xl max-h-[88vh] overflow-hidden shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{actionLabel} Result</div>
              <div className="text-xs text-slate-500">
                {successCount} sukses diproses
                {skippedRows.length > 0 ? `, ${skippedRows.length} gagal/skip` : ''}
                {modal.error && !modal.ok ? ` - ${modal.error}` : ''}
              </div>
            </div>
            <button type="button" onClick={() => setRequestBatchResultModal(null)} className="text-slate-500 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-4 space-y-4">
            {dnLinks.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase text-emerald-700">Masuk DN Register</div>
                  <button
                    type="button"
                    onClick={() => {
                      setKanbanSubTab('dn');
                      setRequestBatchResultModal(null);
                    }}
                    className="rounded border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Buka DN Register
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-emerald-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-emerald-50 text-emerald-800">
                      <tr>
                        <th className="px-3 py-2 text-left">DN Number</th>
                        <th className="px-3 py-2 text-left">Supplier</th>
                        <th className="px-3 py-2 text-left">Request Masuk</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Part Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dnLinks.map((link) => (
                        <tr key={`${link.dnId || link.dnNumber}-${link.supplier}`}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{link.dnNumber || `DN-${link.dnId || '-'}`}</td>
                          <td className="px-3 py-2">{link.supplier || '-'}</td>
                          <td className="px-3 py-2">
                            {(link.requestIds || []).map((id) => getBatchResultRequestLabel(getBatchResultRequestRow(modal, id), id)).join(', ')}
                          </td>
                          <td className="px-3 py-2">{(link.itemCodes || []).join(', ') || '-'}</td>
                          <td className="px-3 py-2">
                            {(link.requestIds || []).map((id, index) => {
                              const row = getBatchResultRequestRow(modal, id);
                              return getBatchResultPartName(row, (link.itemCodes || [])[index]);
                            }).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {approvedRows.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">Berhasil Approve</div>
                <div className="overflow-x-auto rounded-lg border border-emerald-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-emerald-50 text-emerald-800">
                      <tr>
                        <th className="px-3 py-2 text-left">Request</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Part Name</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-left">Supply</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {approvedRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{getBatchResultRequestLabel(row, row.id)}</td>
                          <td className="px-3 py-2">{row.item_code || '-'}</td>
                          <td className="px-3 py-2">{getBatchResultPartName(row, row.item_code)}</td>
                          <td className="px-3 py-2 text-right">{formatQty(row.request_qty)}</td>
                          <td className="px-3 py-2">{getRequestSupplyLabel(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {skippedRows.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-rose-700">Gagal / Tidak Diproses</div>
                <div className="overflow-x-auto rounded-lg border border-rose-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-rose-50 text-rose-800">
                      <tr>
                        <th className="px-3 py-2 text-left">Request</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Part Name</th>
                        <th className="px-3 py-2 text-left">Alasan</th>
                        <th className="px-3 py-2 text-left">Qty Detail</th>
                        <th className="px-3 py-2 text-left">Pesan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {skippedRows.map((skip, index) => {
                        const row = getBatchResultRequestRow(modal, skip.id);
                        return (
                          <tr key={`${skip.id || 'skip'}-${index}`}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{getBatchResultRequestLabel(row, skip.id)}</td>
                            <td className="px-3 py-2">{skip.itemCode || skip.item_code || row?.item_code || '-'}</td>
                            <td className="px-3 py-2">{getBatchResultPartName(row, skip.itemCode || skip.item_code)}</td>
                            <td className="px-3 py-2 font-semibold text-rose-700">{getBatchSkippedReasonLabel(skip)}</td>
                            <td className="px-3 py-2">{getBatchSkippedQtyText(skip, row) || '-'}</td>
                            <td className="px-3 py-2 text-slate-600">{skip.error || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dnLinks.length === 0 && approvedRows.length === 0 && skippedRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {modal.error || 'Tidak ada detail hasil dari server.'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const buildDnBatchGroups = () => {
    const missingSupplier = [];
    const invalidRole = [];
    const invalidFlow = [];
    const groupMap = new Map();
    const eligibleRows = selectedRequestIds
      .map((id) => kanbanRequests.find((row) => row.id === id))
      .filter((row) => row && isRequestSelectable(row));
    eligibleRows.forEach((row) => {
      const flowMeta = resolveRequestFlowMeta(row);
      if (flowMeta.key !== 'supplier-dn') {
        invalidFlow.push(`${row.item_code} (${flowMeta.label})`);
        return;
      }
      const supplierMeta = resolveMasterItemSupplier(row.item_code);
      const supplierKey = String(supplierMeta.supplierCode || supplierMeta.supplierName || '').trim();
      if (!supplierKey) {
        missingSupplier.push(row.item_code);
        return;
      }
      const vendor = supplierMeta.vendor || masterVendors.find((v) =>
        String(v.id).toLowerCase() === supplierKey.toLowerCase()
        || String(v.name || '').toLowerCase() === supplierKey.toLowerCase(),
      );
      const vendorRole = String(vendor?.role || '').trim().toLowerCase();
      if (vendorRole && vendorRole !== 'delivery note') {
        invalidRole.push(row.item_code);
        return;
      }
      const supplierLabel = supplierMeta.label || vendor?.name || supplierKey;
      if (!groupMap.has(supplierKey)) {
        groupMap.set(supplierKey, { supplierKey, supplierLabel, ids: [] });
      }
      groupMap.get(supplierKey).ids.push(row.id);
    });
    const groups = Array.from(groupMap.values()).map((group) => ({
      ...group,
      count: group.ids.length,
    }));
    return { groups, missingSupplier, invalidRole, invalidFlow };
  };

  const openDnBatchModal = () => {
    const { groups, missingSupplier, invalidRole, invalidFlow } = buildDnBatchGroups();
    if (groups.length === 0) {
      const reasons = [];
      if (invalidFlow.length > 0) {
        const preview = Array.from(new Set(invalidFlow)).slice(0, 3).join(', ');
        const suffix = invalidFlow.length > 3 ? ` dan ${invalidFlow.length - 3} lainnya` : '';
        reasons.push(`Flow bukan Supplier DN: ${preview}${suffix}.`);
      }
      if (missingSupplier.length > 0) {
        const preview = Array.from(new Set(missingSupplier)).slice(0, 3).join(', ');
        const suffix = missingSupplier.length > 3 ? ` dan ${missingSupplier.length - 3} lainnya` : '';
        reasons.push(`Supplier Master Item belum diisi untuk item: ${preview}${suffix}.`);
      }
      if (invalidRole.length > 0) {
        const preview = Array.from(new Set(invalidRole)).slice(0, 3).join(', ');
        const suffix = invalidRole.length > 3 ? ` dan ${invalidRole.length - 3} lainnya` : '';
        reasons.push(`Role supplier bukan Delivery Note untuk item: ${preview}${suffix}.`);
      }
      if (reasons.length === 0) {
        reasons.push('Kemungkinan status belum Pending/Approved, sudah punya DN, atau request belum eligible untuk DN.');
      }
      alert(`Tidak ada request valid untuk dibuat DN.
${reasons.join('\n')}`);
      return;
    }
    const initialRemarks = {};
    groups.forEach((group) => {
      initialRemarks[group.supplierKey] = dnBatchRemarks[group.supplierKey] || '';
    });
    setDnBatchWarnings({ missingSupplier, invalidRole, invalidFlow });
    setDnBatchGroups(groups);
    setDnBatchRemarks(initialRemarks);
    setShowDnBatchModal(true);
  };

  const scanActionType = String(scanActiveResult?.actionType || '').trim();
  const scanActionLabel = scanActiveResult?.actionLabel || '-';
  const scanActionHint = scanActiveResult?.actionHint || '-';
  const scanPrlPlan = scanActiveResult?.prlPlan || null;
  const scanPrlEligible = Boolean(scanPrlPlan?.eligible);
  const scanPrlOver = Boolean(scanPrlPlan?.overPrl || scanActiveResult?.cardMeta?.overPrl);
  const scanCategoryText = [
    scanActiveResult?.itemCategoryCode,
    scanActiveResult?.itemCategoryLabel,
    scanActiveResult?.category,
    scanActiveResult?.actionLabel,
    scanActiveResult?.actionHint,
    scanActiveResult?.cardMeta?.itemCategoryCode,
    scanActiveResult?.cardMeta?.itemCategoryLabel,
  ].map((value) => String(value || '').trim().toLowerCase()).join(' ');
  const isScanIssueAction = scanActionType === 'issue'
    || scanActionType === 'consumption'
    || scanActionType === 'consumption_only'
    || /\brm\b|raw|indirect|consum/.test(scanCategoryText);
  const isScanSubconAction = scanActionType === 'external_transfer';
  const isScanRoutingAction = scanActionType === 'routing_execution';
  const executeScanFlow = async () => {
    if (!scanActiveResult) {
      setScanError('Hasil scan belum tersedia.');
      return;
    }
    try {
      if (isScanIssueAction) {
        const outcome = await consumeStockFromScan(scanActiveResult);
        setScanError(outcome.ok ? '' : outcome.reason || 'Gagal potong stok.');
        if (outcome.ok && typeof handleProcessScan === 'function') {
          await handleProcessScan();
        }
        return;
      }
      if (isScanRoutingAction) {
        const currentStatus = String(scanActiveResult.processState?.status || scanActiveResult.currentProcess?.status || '').trim().toLowerCase();
        const currentStepStatus = String(scanActiveResult.processState?.currentStep?.status || '').trim().toLowerCase();
        const isInProcess = currentStatus === 'in_process' || currentStepStatus === 'started' || currentStepStatus === 'in_process';
        const outcome = isInProcess
          ? await handleKanbanProcessFinish(scanActiveResult)
          : await handleKanbanProcessStart(scanActiveResult);
        setScanError(outcome.ok ? '' : outcome.reason || (isInProcess ? 'Gagal finish proses.' : 'Gagal start proses.'));
        return;
      }
      if (isScanSubconAction) {
        if (isProductionUser) {
          setScanError('Kartu ini termasuk flow Subcon. Akun produksi tidak dapat memproses kartu Subcon.');
          return;
        }
        setMainTab('subcon');
        setScanError('');
        return;
      }
      setScanError('Kategori item belum dikenali.');
    } catch (error) {
      setScanError(error.message || 'Gagal eksekusi scan.');
    }
  };

  const productionQueueAllRows = kanbanRequests
    .filter((row) => isRequestSelectable(row) && resolveRequestFlowMeta(row).key === 'production')
    .sort((a, b) => {
      const healthA = getKanbanRequestHealth(a);
      const healthB = getKanbanRequestHealth(b);
      if (Number(healthB.hasStockGap) !== Number(healthA.hasStockGap)) {
        return Number(healthB.hasStockGap) - Number(healthA.hasStockGap);
      }
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
  const productionQueueNeedWoRows = productionQueueAllRows.filter((row) => String(row.status || '').trim().toLowerCase() !== 'production_ready');
  const productionQueueReleasedRows = productionQueueAllRows.filter((row) => String(row.status || '').trim().toLowerCase() === 'production_ready');
  const productionQueueStatusRows = productionQueueAllRows.filter((row) => {
    const statusKey = String(row.status || '').trim().toLowerCase();
    if (productionQueueStatusFilter === 'need_wo') return statusKey !== 'production_ready';
    if (productionQueueStatusFilter === 'released') return statusKey === 'production_ready';
    return true;
  });
  const productionQueueHealthRows = productionQueueStatusRows.filter((row) => {
    const statusKey = String(row.status || '').trim().toLowerCase();
    const health = getKanbanRequestHealth(row);
    if (productionQueueHealthFilter === 'ready') return statusKey !== 'production_ready' && !health.hasStockGap;
    if (productionQueueHealthFilter === 'review') return statusKey !== 'production_ready' && health.hasStockGap;
    return true;
  });
  const productionQueueRows = productionQueueHealthRows.filter((row) => {
    if (productionQueueCategoryFilter === 'all') return true;
    return getProductionRequestCategoryMeta(row).key === productionQueueCategoryFilter;
  });
  const productionQueueActionableRows = productionQueueRows.filter((row) => {
    const statusKey = String(row.status || '').trim().toLowerCase();
    return statusKey === 'production_ready' || !getKanbanRequestHealth(row).hasStockGap;
  });
  const productionQueuePageSizeOptions = [10, 25, 50, 100];
  const productionQueueTotalRows = productionQueueRows.length;
  const productionQueueTotalPages = Math.max(1, Math.ceil(productionQueueTotalRows / productionQueuePageSize));
  const productionQueueCurrentPage = Math.min(Math.max(1, Number(productionQueuePage) || 1), productionQueueTotalPages);
  const productionQueueStartIndex = productionQueueTotalRows === 0 ? 0 : (productionQueueCurrentPage - 1) * productionQueuePageSize;
  const productionQueueEndIndex = Math.min(productionQueueStartIndex + productionQueuePageSize, productionQueueTotalRows);
  const productionQueuePagedRows = productionQueueRows.slice(productionQueueStartIndex, productionQueueEndIndex);
  const productionQueueReadyCount = productionQueueNeedWoRows.filter((row) => !getKanbanRequestHealth(row).hasStockGap).length;
  const productionQueueStockGapCount = productionQueueNeedWoRows.length - productionQueueReadyCount;
  const productionQueueReleasedCount = productionQueueReleasedRows.length;
  const productionQueueAssyCount = productionQueueAllRows.filter((row) => getProductionRequestCategoryMeta(row).key === 'assy').length;
  const productionQueueChildCount = productionQueueAllRows.filter((row) => getProductionRequestCategoryMeta(row).key === 'child').length;
  const productionDashboardCardClass = (active, baseClass) => `rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-300 ${baseClass} ${
    active ? 'ring-2 ring-slate-900 ring-offset-1' : 'hover:shadow-sm'
  }`;

  useEffect(() => {
    if (productionQueueCurrentPage !== productionQueuePage) {
      setProductionQueuePage(productionQueueCurrentPage);
    }
  }, [productionQueueCurrentPage, productionQueuePage]);

  const selectedRequestRows = selectedRequestIds
    .map((id) => kanbanRequests.find((row) => row.id === id))
    .filter(Boolean);
  const selectedBatchApproveIds = selectedRequestRows
    .filter((row) => {
      const statusKey = String(row?.status || '').trim().toLowerCase();
      return ['triggered', 'requested'].includes(statusKey) && !row?.dn_id;
    })
    .map((row) => row.id);
  const selectedBatchApproveCount = selectedBatchApproveIds.length;
  const selectedSupplierDnIds = selectedRequestRows
    .filter((row) => isRequestSelectable(row) && resolveRequestFlowMeta(row).key === 'supplier-dn')
    .map((row) => row.id);
  const selectedSupplierDnCount = selectedSupplierDnIds.length;
  const selectedProductionIds = selectedRequestRows
    .filter((row) => isRequestSelectable(row) && resolveRequestFlowMeta(row).key === 'production')
    .map((row) => row.id);
  const selectedProductionCount = selectedProductionIds.length;
  const selectedStockGapIds = requestRows
    .filter((row) => {
      if (!isRequestSelectable(row)) return false;
      const health = getKanbanRequestHealth(row);
      return Boolean(health?.hasStockGap);
    })
    .map((row) => row.id);
  const selectedStockGapCount = selectedStockGapIds.length;

  return (
    <>
            {/* Kanban Board */}
            {mainTab === 'kanban' && (
              <>
                <div className={`space-y-4 ${(showDnPrintModal || showRnPrintModal) ? 'kanban-print-host' : ''}`}>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {kanbanView === 'master'
                      ? 'Setup Master Kanban'
                      : kanbanView === 'planning'
                        ? 'Planning'
                        : 'Kanban Board'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {kanbanView === 'master'
                      ? 'Konfigurasi parameter kanban untuk material dan layanan subcon.'
                      : kanbanView === 'planning'
                        ? 'Kelola workflow delivery dan produksi.'
                        : 'Pantau alur request, DN, receiving, dan kanban kosong.'}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {!isProductionUser && (
                    <button
                      onClick={() => setKanbanView('master')}
                      className={`px-3 py-1.5 rounded border ${kanbanView === 'master' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600'}`}
                    >
                      Master Kanban
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setKanbanView('board');
                      setKanbanSubTab('dashboard');
                    }}
                    className={`px-3 py-1.5 rounded border ${kanbanView === 'board' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
                  >
                    Kanban Board
                  </button>
                  {!isProductionUser && (
                    <button
                      onClick={() => {
                        setKanbanView('planning');
                        setKanbanSubTab(planningDefaultTab);
                      }}
                      className={`px-3 py-1.5 rounded border ${kanbanView === 'planning' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}
                    >
                      Planning
                    </button>
                  )}
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
                          <div
                            className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-20 text-left text-xs overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                              onClick={async (e) => {
                                e.stopPropagation();
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
                                  "Safety Factor": row.safety_factor,
                                  "Regular Kanban": row.regular_kanban,
                                  "Safety Hours": row.safety_hours,
                                  "Work Hours": row.work_hours,
                                  "Cycle X": row.cycle_x,
                                  "Cycle Y": row.cycle_y,
                                  "Cycle Z": row.cycle_z,
                                  "Calculated Cards": row.effective_card_count ?? row.calculated_card_count ?? '',
                                  "Calculated Regular": row.effective_regular_kanban ?? row.calculated_regular_kanban ?? '',
                                  "Calculated Safety": row.effective_safety_kanban ?? row.calculated_safety_kanban ?? '',
                                  "Calculated Max Qty": row.effective_max_qty ?? row.calculated_max_qty ?? '',
                                  "Supplier Master Item": resolveMasterItemSupplier(row.item_code).label,
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
                                  "Safety Factor": "0",
                                  "Regular Kanban": "2",
                                  "Safety Hours": "48",
                                  "Work Hours": "24",
                                  "Cycle X": "1",
                                  "Cycle Y": "4",
                                  "Cycle Z": "4",
                                  "Supplier Master Item": "",
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
                                      safetyFactor: row["Safety Factor"] ?? row["safety_factor"] ?? row["safetyFactor"],
                                      regularKanban: row["Regular Kanban"] ?? row["regular_kanban"] ?? row["regularKanban"],
                                      safetyHours: row["Safety Hours"] ?? row["safety_hours"] ?? row["safetyHours"],
                                      workHours: row["Work Hours"] ?? row["work_hours"] ?? row["workHours"],
                                      cycleX: row["Cycle X"] ?? row["cycle_x"] ?? row["cycleX"],
                                      cycleY: row["Cycle Y"] ?? row["cycle_y"] ?? row["cycleY"],
                                      cycleZ: row["Cycle Z"] ?? row["cycle_z"] ?? row["cycleZ"],
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
                          setKanbanCategory('');
                          setKanbanSettingsForm({
                            itemCode: '',
                            minQty: '',
                            maxQty: '',
                            lotQty: '',
                            leadTimeDays: '',
                            safetyFactor: '',
                            regularKanban: '2',
                            safetyHours: '48',
                            workHours: '24',
                            cycleX: '1',
                            cycleY: '4',
                            cycleZ: '4',
                            dropZone: '',
                            active: true,
                          });
                        }}
                      >
                        <Plus size={14} /> Kanban Baru
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs border rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          setShowMissingKanbanPanel(true);
                          handleGenerateMissingKanban();
                        }}
                        disabled={kanbanSyncLoading || missingKanbanItems.length === 0}
                      >
                        <ArrowDownUp size={14} />
                        {kanbanSyncLoading ? 'Menyinkronkan...' : `Sinkron Master Item (${missingKanbanItems.length})`}
                      </button>
                    </div>
                  </div>

                  {showMissingKanbanPanel && <>
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <div className="font-semibold">Alur sinkron master item → kanban</div>
                    <div className="mt-1">
                      Sistem membaca semua item master, mencari item yang belum punya `kanban_settings`, lalu membuat default awal dari data master.
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-white/70 px-2 py-0.5 border border-amber-200">
                        Belum punya kanban: {missingKanbanItems.length} item
                      </span>
                      {missingKanbanPreview.map((item) => (
                        <span key={item.code} className="rounded-full bg-white/70 px-2 py-0.5 border border-amber-200">
                          {item.code} · {getCategoryLabel(item.type)}
                        </span>
                      ))}
                      {missingKanbanItems.length > missingKanbanPreview.length && (
                        <span className="text-amber-700">+{missingKanbanItems.length - missingKanbanPreview.length} item lagi</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">Preview Item Master Belum Punya Kanban</div>
                        <div className="text-xs text-slate-500">
                          Pilih satu per satu atau batch, lalu generate langsung dari master reference.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded border px-2 py-1.5 text-xs"
                          value={missingKanbanCategoryFilter}
                          onChange={(e) => setMissingKanbanCategoryFilter(e.target.value)}
                        >
                          <option value="all">Semua Kategori</option>
                          {masterCategoryFilterOptions.map((category) => (
                            <option key={category.code || category.name} value={category.code || category.name}>
                              {category.code ? `${category.code}${category.name ? ` - ${category.name}` : ''}` : category.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
                          <Search size={14} className="text-slate-400" />
                          <input
                            className="outline-none text-xs w-48"
                            placeholder="Cari kode / nama / kategori..."
                            value={missingKanbanSearch}
                            onChange={(e) => setMissingKanbanSearch(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
                          onClick={toggleVisibleMissingSelection}
                          disabled={visibleMissingKanbanItems.length === 0}
                        >
                          {allVisibleMissingSelected ? 'Unselect Visible' : 'Select Visible'}
                        </button>
                        <button
                          type="button"
                          className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
                          onClick={clearMissingKanbanSelection}
                          disabled={selectedMissingKanbanCodes.length === 0}
                        >
                          Clear Selection
                        </button>
                        <button
                          type="button"
                          className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                          onClick={handleGenerateMissingKanban}
                          disabled={kanbanSyncLoading || missingKanbanItems.length === 0}
                        >
                          {selectedMissingKanbanCodes.length > 0
                            ? `Generate Selected (${selectedMissingKanbanCodes.length})`
                            : `Generate All Missing (${missingKanbanItems.length})`}
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-4 py-2 text-left w-10">
                              <input
                                type="checkbox"
                                checked={allVisibleMissingSelected}
                                onChange={toggleVisibleMissingSelection}
                                disabled={visibleMissingKanbanItems.length === 0}
                              />
                            </th>
                            <th className="px-4 py-2 text-left">Item Code</th>
                            <th className="px-4 py-2 text-left">Item Name</th>
                            <th className="px-4 py-2 text-left">Kategori Master Ref</th>
                            <th className="px-4 py-2 text-left">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleMissingKanbanItems.map((item) => {
                            const category = resolveMissingKanbanCategory(item);
                            const itemCode = String(item.code || '').trim();
                            const selected = selectedMissingKanbanCodes.includes(itemCode);
                            return (
                              <tr key={itemCode} className="border-t hover:bg-slate-50">
                                <td className="px-4 py-2 align-top">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleMissingKanbanSelection(itemCode)}
                                  />
                                </td>
                                <td className="px-4 py-2 font-semibold text-slate-700">{itemCode}</td>
                                <td className="px-4 py-2 text-slate-600">{item.name || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className="rounded-full border bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                    {category.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-1 text-[10px] hover:bg-slate-50 disabled:opacity-50"
                                    onClick={async () => {
                                      if (!itemCode) return;
                                      setKanbanSyncLoading(true);
                                      try {
                                        await handleGenerateKanbanFromMasterItems?.({ itemCodes: [itemCode] });
                                      } finally {
                                        setKanbanSyncLoading(false);
                                      }
                                    }}
                                    disabled={kanbanSyncLoading}
                                  >
                                    Generate
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {visibleMissingKanbanItems.length === 0 && (
                            <tr>
                              <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>
                                Tidak ada item yang cocok dengan filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>}

                  <div className="mt-4 space-y-3">
                    {filteredKanbanSettings.map((row) => (
                      <div key={row.item_code} className="border rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">{buildKanbanDisplayId(row.item_code, row.item_type, row)}</div>
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
                            <div className="font-semibold text-slate-700">{resolveMasterItemSupplier(row.item_code).label}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Quantities</div>
                            <div className="font-semibold text-slate-700">
                              {row.lot_qty} / Min: {row.min_qty} / Max: {row.effective_max_qty ?? row.max_qty}
                            </div>
                            {getDisplayPrlQty(row) !== null && getDisplayPrlQty(row) !== undefined && getDisplayPrlQty(row) !== '' && (
                              <div className="mt-0.5 text-[10px] text-sky-600">
                                PRL {row.prl_month_label || ''}: {getDisplayPrlQty(row)}
                              </div>
                            )}
                            {getDisplayPrlQty(row) !== null && getDisplayPrlQty(row) !== undefined && getDisplayPrlQty(row) !== '' && (
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                WD {row.effective_working_days || row.calculated_working_days || '-'} / Work {row.work_hours ?? 24}h / Cycle {row.cycle_x ?? 1}×{row.cycle_y ?? 4}×{row.cycle_z ?? 4} / Safety {row.safety_hours ?? 48}h
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-400">Cards</div>
                            <div className="font-semibold text-slate-700">{getKanbanCardsLabel(row)}</div>
                            {(row.effective_regular_kanban != null || row.calculated_regular_kanban != null || row.effective_safety_kanban != null || row.calculated_safety_kanban != null) && (
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                Reg {row.effective_regular_kanban ?? row.calculated_regular_kanban ?? '-'} + Safety {row.effective_safety_kanban ?? row.calculated_safety_kanban ?? '-'}
                              </div>
                            )}
                            {row.effective_daily_demand !== null && row.effective_daily_demand !== undefined && row.effective_daily_demand !== '' && (
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                Daily {formatNumber2 ? formatNumber2(row.effective_daily_demand) : Number(row.effective_daily_demand || 0).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                          onClick={() => {
                            setShowKanbanEdit(true);
                            setKanbanEditMode('edit');
                            setKanbanCategory('');
                            setKanbanSettingsForm({
                              itemCode: row.item_code,
                              minQty: String(row.min_qty ?? ''),
                              maxQty: String(row.max_qty ?? ''),
                              lotQty: String(row.lot_qty ?? ''),
                              leadTimeDays: String(row.lead_time_days ?? ''),
                              safetyFactor: String(row.safety_factor ?? ''),
                              regularKanban: String(row.regular_kanban ?? '2'),
                              safetyHours: String(row.safety_hours ?? '48'),
                              workHours: String(row.work_hours ?? '24'),
                              cycleX: String(row.cycle_x ?? '1'),
                              cycleY: String(row.cycle_y ?? '4'),
                              cycleZ: String(row.cycle_z ?? '4'),
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
                        <option value="">Pilih kategori dari master</option>
                        {kanbanCategory && !masterCategories.some((category) => [category.code, category.name].includes(kanbanCategory)) && (
                          <option value={kanbanCategory}>{kanbanCategory}</option>
                        )}
                        {masterCategories.map((category) => (
                          <option key={category.code || category.name} value={category.code || category.name}>
                            {category.code ? `${category.code}${category.name ? ` - ${category.name}` : ''}` : category.name}
                          </option>
                        ))}
                      </select>
                      <label className="block text-[10px] uppercase text-slate-400">Item Code</label>
                      <select
                        className="border p-2 rounded w-full text-xs"
                        value={kanbanSettingsForm.itemCode}
                        onChange={(e) => syncKanbanSettingFromItem(e.target.value)}
                      >
                        <option value="">Pilih item dari Master Item</option>
                        {masterItemOptions.map((item) => (
                          <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                        ))}
                      </select>
                      <label className="block text-[10px] uppercase text-slate-400">Item Name</label>
                      <input
                        className="border p-2 rounded w-full text-xs bg-slate-50"
                        value={masterItemsByCode.get(kanbanSettingsForm.itemCode)?.name || ''}
                        readOnly
                      />
                      <label className="block text-[10px] uppercase text-slate-400">Supplier Master Item</label>
                      <input
                        className="border p-2 rounded w-full text-xs bg-slate-50"
                        value={resolveMasterItemSupplier(kanbanSettingsForm.itemCode).label}
                        readOnly
                      />
                      <label className="block text-[10px] uppercase text-slate-400">Drop Zone / Line</label>
                      <select
                        className="border p-2 rounded w-full text-xs"
                        value={kanbanSettingsForm.dropZone}
                        onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, dropZone: e.target.value })}
                      >
                        <option value="">Pilih lokasi/area dari Master Referensi</option>
                        {kanbanSettingsForm.dropZone && !dropZoneOptions.some((option) => option.value === kanbanSettingsForm.dropZone) && (
                          <option value={kanbanSettingsForm.dropZone}>{kanbanSettingsForm.dropZone}</option>
                        )}
                        {dropZoneOptions.map((option) => (
                          <option key={`${option.source}-${option.value}`} value={option.value}>
                            {option.source}: {option.label}
                          </option>
                        ))}
                      </select>
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
                          <label className="block text-[10px] uppercase text-slate-400">Safety Factor</label>
                          <input type="number" step="0.01" min="0" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.safetyFactor} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, safetyFactor: e.target.value })} placeholder="0.1 = 10%" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Cycle X</label>
                          <input type="number" min="1" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.cycleX} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, cycleX: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Cycle Y</label>
                          <input type="number" min="1" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.cycleY} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, cycleY: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Cycle Z</label>
                          <input type="number" min="1" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.cycleZ} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, cycleZ: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Safety Hours</label>
                          <input type="number" min="0" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.safetyHours} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, safetyHours: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400">Work Hours</label>
                          <input type="number" min="1" className="border p-2 rounded w-full text-xs" value={kanbanSettingsForm.workHours} onChange={(e) => setKanbanSettingsForm({ ...kanbanSettingsForm, workHours: e.target.value })} />
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
                        <div className="font-semibold mb-1">Formula PRL</div>
                        <div>Hourly Demand = (PRL / Work Days) / Work Hours</div>
                        <div>Total Kanban = Reguler + Safety</div>
                        <div>Reguler = Ceil((Hourly Demand × Cycle X × Cycle Y) / Kanban Qty)</div>
                        <div>Safety = Ceil((Hourly Demand × Safety Hours) / Kanban Qty)</div>
                        <div className="mt-1">Nilai otomatis dihitung saat PRL dirilis.</div>
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
                            safetyFactor: '',
                            regularKanban: '2',
                            safetyHours: '48',
                            workHours: '24',
                            cycleX: '1',
                            cycleY: '4',
                            cycleZ: '4',
                            dropZone: '',
                            active: true,
                          });
                          setKanbanCategory('');
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

              {['board', 'planning'].includes(kanbanView) && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 text-xs">
                  {(kanbanView === 'planning' ? planningTabs : kanbanBoardTabs).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={tab.disabled}
                      title={tab.disabled ? tab.disabledTitle : undefined}
                      onClick={() => {
                        if (tab.disabled) return;
                        setKanbanSubTab(tab.key);
                      }}
                      className={getLockedButtonClassName(
                        `px-3 py-1.5 rounded ${kanbanSubTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`,
                        tab.disabled,
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {kanbanSubTab === 'dashboard' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                      {[
                        { label: 'Active', value: kanbanOperationalSummary.active, tone: 'border-slate-200 bg-white text-slate-900' },
                        { label: 'Pending', value: kanbanOperationalSummary.pending, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
                        { label: 'Approved', value: kanbanOperationalSummary.approved, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                        { label: 'In Flow', value: kanbanOperationalSummary.inFlow, tone: 'border-blue-200 bg-blue-50 text-blue-700' },
                        { label: 'Receiving', value: kanbanOperationalSummary.receiving, tone: 'border-orange-200 bg-orange-50 text-orange-700' },
                        { label: 'Over PRL', value: kanbanOperationalSummary.blocked, tone: 'border-rose-200 bg-rose-50 text-rose-700' },
                        { label: 'Overdue', value: kanbanOperationalSummary.overdue, tone: 'border-red-200 bg-red-50 text-red-700' },
                      ].map((card) => (
                        <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.tone}`}>
                          <div className="text-[10px] uppercase tracking-wide opacity-70">{card.label}</div>
                          <div className="mt-1 text-2xl font-bold">{card.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs font-semibold text-slate-600">Filter Kategori</div>
                        <select
                          className="rounded border px-3 py-1.5 text-xs bg-white"
                          value={kanbanDashboardCategoryFilter}
                          onChange={(e) => setKanbanDashboardCategoryFilter(e.target.value)}
                        >
                          {kanbanDashboardCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2">
                          {kanbanDashboardCategoryOptions.filter((option) => option.value !== 'all').map((option) => {
                            const active = kanbanDashboardCategoryFilter === option.value;
                            const count = Number(kanbanDashboardCategoryCounts[option.value] || 0);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setKanbanDashboardCategoryFilter(active ? 'all' : option.value)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                                  active
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {option.label} ({count})
                              </button>
                            );
                          })}
                        </div>
                        <div className="ml-auto text-xs text-slate-500">
                          Menampilkan {kanbanDashboardRows.length} dari {kanbanActiveRows.length} aktif
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)] gap-4">
                      <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                          <div>
                            <div className="text-sm font-semibold">Live Kanban Status Board</div>
                            <div className="text-xs text-slate-500">
                              Menampilkan status aktif, aging, blocker, dan action berikutnya.
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Oldest: <span className="font-semibold text-slate-700">{kanbanOperationalSummary.oldestLabel}</span>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {kanbanStatusCards.map((statusCard) => (
                            <div
                              key={statusCard.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => openKanbanStatusRequests(statusCard.key)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  openKanbanStatusRequests(statusCard.key);
                                }
                              }}
                              className={`rounded-xl border p-3 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 ${statusCard.tone}`}
                              title={`Open ${statusCard.label} requests`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold">{statusCard.label}</div>
                                  <div className="text-[10px] opacity-80">{statusCard.shortLabel}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold">{statusCard.count}</div>
                                  <div className="text-[10px] opacity-80">over PRL {statusCard.blocked} · overdue {statusCard.overdue}</div>
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] opacity-80">Next: {statusCard.nextAction}</div>
                              <div className="mt-1 text-[10px] opacity-80">Oldest: {statusCard.oldestLabel}</div>
                              <div className="mt-3 space-y-2">
                                {statusCard.topRows.length > 0 ? statusCard.topRows.map(({ row, health }) => (
                                  <button
                                    key={row.id}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openKanbanDashboardTarget(row);
                                    }}
                                    className="block w-full rounded-lg bg-white/70 border border-white/70 px-2 py-2 text-left text-[11px] text-slate-700 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                                    title={`Open next action: ${getKanbanNextAction(row)}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-semibold">{getRequestIdLabel(row)}</div>
                                      <div className="text-slate-500">{formatRequestAging(health.ageHours)}</div>
                                    </div>
                                    <div className="text-slate-500">{row.item_code} · {row.item_name || '-'}</div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {health.isOverPrl && (
                                        <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                          Over PRL
                                        </span>
                                      )}
                                      {health.isOverdue && (
                                        <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                          Overdue
                                        </span>
                                      )}
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                        Next: {getKanbanNextAction(row)}
                                      </span>
                                    </div>
                                  </button>
                                )) : (
                                  <div className="rounded-lg border border-dashed border-white/80 bg-white/60 px-3 py-4 text-[11px] text-slate-500">
                                    Tidak ada request aktif di status ini.
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b pb-3">
                          <div>
                            <div className="text-sm font-semibold">Priority Queue</div>
                            <div className="text-xs text-slate-500">Request aktif diurutkan dari aging tertinggi.</div>
                          </div>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
                            onClick={() => setKanbanSubTab('requests')}
                          >
                            Buka Requests
                          </button>
                        </div>
                        <div className="mt-3 space-y-2 max-h-[860px] overflow-auto pr-1">
                          {kanbanActiveQueue.slice(0, 12).map(({ row, health }, index) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => openKanbanDashboardTarget(row)}
                              className="block w-full rounded-xl border bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                              title={`Open next action: ${getKanbanNextAction(row)}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[10px] text-slate-400">#{index + 1}</div>
                                  <div className="font-semibold text-sm">{getRequestIdLabel(row)}</div>
                                  <div className="text-[11px] text-slate-500">{row.item_code} · {row.item_name || '-'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-800">{formatRequestAging(health.ageHours)}</div>
                                  <div className="text-[10px] text-slate-500">{row.dn_id ? `DN-${row.dn_id}` : 'No DN'}</div>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                                <span className="rounded-full border bg-white px-2 py-0.5 text-slate-600">
                                  {String(row.status || '').toUpperCase()}
                                </span>
                                <span className="rounded-full border bg-white px-2 py-0.5 text-slate-600">
                                  Next: {getKanbanNextAction(row)}
                                </span>
                                {health.isOverPrl && (
                                  <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-rose-700">
                                    Over PRL
                                  </span>
                                )}
                                {health.isOverdue && (
                                  <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-red-700">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                          {kanbanActiveQueue.length === 0 && (
                            <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-slate-400">
                              Tidak ada request aktif.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isProductionUser && kanbanSubTab === 'items' && (
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
                        {masterCategoryFilterOptions.map((category) => {
                          const code = String(category.code || category.name || '').trim();
                          const name = String(category.name || '').trim();
                          if (!code) return null;
                          return (
                            <option key={`kanban-category-${code}`} value={code}>
                              {[code, name].filter(Boolean).join(' - ')}
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => {
                            if (!canEditSchedules) return;
                            setShowKanbanEdit(true);
                            setKanbanEditMode('new');
                            setKanbanCategory('');
                            setKanbanSettingsForm({
                              itemCode: '',
                              minQty: '',
                              maxQty: '',
                              lotQty: '',
                              leadTimeDays: '',
                              safetyFactor: '',
                              regularKanban: '2',
                              safetyHours: '48',
                              workHours: '24',
                              cycleX: '1',
                              cycleY: '4',
                              cycleZ: '4',
                              dropZone: '',
                              active: true,
                            });
                          }}
                          disabled={!canEditSchedules}
                          title={getLockedActionTitle(canEditSchedules, 'New Item')}
                          className={getLockedButtonClassName('px-3 py-2 text-xs bg-slate-900 text-white rounded flex items-center gap-2', !canEditSchedules)}
                        >
                          <Plus size={14} /> New Item
                        </button>
                        <button
                          className={getLockedButtonClassName('px-3 py-2 text-xs border rounded flex items-center gap-2', !canEditSchedules)}
                          disabled={!canEditSchedules}
                          title={getLockedActionTitle(canEditSchedules, 'Auto/Manual Request')}
                          onClick={() => {
                            if (!canEditSchedules) return;
                            setShowTriggerChoiceModal(true);
                          }}
                        >
                          <ArrowDownUp size={14} /> Auto/Manual Request
                        </button>
                        <button
                          className={getLockedButtonClassName('px-3 py-2 text-xs border rounded flex items-center gap-2', !canEditSchedules)}
                          disabled={!canEditSchedules}
                          title={getLockedActionTitle(canEditSchedules, 'Print Cards')}
                          onClick={() => {
                            if (!canEditSchedules) return;
                            setShowKanbanCardModal(true);
                          }}
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
                      {visibleKanbanBoardItems.map((row) => {
                        const masterItem = masterItemsByCode.get(row.item_code);
                        const masterLocation = masterLocationsById.get(masterItem?.location_id);
                        const stock = Number(fifoTotalsByItemCode.get(row.item_code) ?? 0);
                        const min = Number(row.min_qty ?? masterItem?.safety_stock ?? 0);
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
                                  <div className="text-sm font-bold">{buildKanbanDisplayId(row.item_code, row.item_type, row)}</div>
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
                                  Over PRL {itemRequestHealth.blocked}
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
                                <div className="font-semibold text-slate-700">{min} / {row.effective_max_qty ?? row.max_qty}</div>
                                {getDisplayPrlQty(row) !== null && getDisplayPrlQty(row) !== undefined && getDisplayPrlQty(row) !== '' && (
                                  <div className="mt-0.5 text-[10px] text-sky-600">
                                    PRL {row.prl_month_label || ''}: {getDisplayPrlQty(row)}
                                  </div>
                                )}
                                {getDisplayPrlQty(row) !== null && getDisplayPrlQty(row) !== undefined && getDisplayPrlQty(row) !== '' && (
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    WD {row.effective_working_days || row.calculated_working_days || '-'} / Work {row.work_hours ?? 24}h / Cycle {row.cycle_x ?? 1}×{row.cycle_y ?? 4}×{row.cycle_z ?? 4} / Safety {row.safety_hours ?? 48}h
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-400">Cards</div>
                                <div className="font-semibold text-slate-700">{getKanbanCardsLabel(row)}</div>
                                {(row.effective_regular_kanban != null || row.calculated_regular_kanban != null || row.effective_safety_kanban != null || row.calculated_safety_kanban != null) && (
                                  <div className="mt-0.5 text-[10px] text-slate-500">
                                    Reg {row.effective_regular_kanban ?? row.calculated_regular_kanban ?? '-'} + Safety {row.effective_safety_kanban ?? row.calculated_safety_kanban ?? '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                              <div>Supplier: {resolveMasterItemSupplier(row.item_code).label}</div>
                              <div>Lead Time: {row.lead_time_days || 0} days</div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => openQrModal(row)}
                                className="p-2 border rounded hover:bg-slate-50"
                                title="Lihat QR Kanban"
                                aria-label={`Lihat QR ${row.item_code}`}
                              >
                                <QrCode size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openKanbanItemAnalysis(row)}
                                className="p-2 border rounded hover:bg-slate-50"
                                title="Analisa Kanban"
                                aria-label={`Analisa Kanban ${row.item_code}`}
                              >
                                <BarChart3 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {visibleKanbanBoardItems.length < filteredKanbanItems.length && (
                        <div className="md:col-span-2 xl:col-span-3 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setKanbanItemVisibleLimit((prev) => prev + 75)}
                            className="px-4 py-2 text-xs border rounded-lg bg-white hover:bg-slate-50 text-slate-600"
                          >
                            Tampilkan 75 lagi ({visibleKanbanBoardItems.length} / {filteredKanbanItems.length})
                          </button>
                        </div>
                      )}
                      {!kanbanLoading && filteredKanbanItems.length === 0 && (
                        <div className="text-sm text-gray-400">Tidak ada item.</div>
                      )}
                    </div>
                  </div>
                )}

                {!isProductionUser && kanbanSubTab === 'requests' && (
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
                            <div className="text-xs text-slate-500">Aging, overdue, dan Over PRL request dipantau langsung dari board.</div>
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
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedStockGapIds.length === 0) {
                                  alert('Tidak ada request Stock Gap yang eligible untuk dipilih.');
                                  return;
                                }
                                setSelectedRequestIds(Array.from(new Set(selectedStockGapIds)));
                              }}
                              className="px-3 py-1.5 text-xs border rounded hover:bg-slate-50 flex items-center gap-2"
                              title="Pilih semua request Stock Gap yang masih bisa diproses"
                            >
                              <CheckCircle size={14} /> Select Stock Gap Eligible
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
                            <div className="text-[11px] uppercase tracking-wide text-rose-700">Over PRL</div>
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
                            Quick filter: <span className="font-semibold text-slate-700">{requestQuickFilterOptions.find((option) => option.value === kanbanRequestQuickFilter)?.label || 'All'}</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[72px_1fr_44px_1fr] lg:items-center">
                            <span className="text-[10px] font-semibold uppercase text-slate-500">Category</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                            {requestCategoryFilterOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setKanbanRequestCategoryFilter?.(option.value);
                                  setTablePagination?.((prev) => ({
                                    ...prev,
                                    kanbanRequests: { ...(prev.kanbanRequests || {}), page: 1 },
                                  }));
                                }}
                                className={`h-8 rounded-lg border px-3 text-xs font-medium transition ${
                                  (kanbanRequestCategoryFilter || 'all') === option.value
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                            </div>
                            <span className="text-[10px] font-semibold uppercase text-slate-500">Flow</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                            {requestFlowFilterOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setKanbanRequestFlowFilter?.(option.value);
                                  setTablePagination?.((prev) => ({
                                    ...prev,
                                    kanbanRequests: { ...(prev.kanbanRequests || {}), page: 1 },
                                  }));
                                }}
                                className={`h-8 rounded-lg border px-3 text-xs font-medium transition ${
                                  (kanbanRequestFlowFilter || 'all') === option.value
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                            </div>
                          </div>
                        </div>
                        {selectedRequestIds.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-xs text-slate-600">
                              {selectedRequestIds.length} request dipilih
                              {selectedBatchApproveCount < selectedRequestIds.length && (
                                <span className="ml-2 text-amber-600">
                                  ({selectedBatchApproveCount} siap di-approve)
                                </span>
                              )}
                              {selectedSupplierDnCount < selectedRequestIds.length && (
                                <span className="ml-2 text-indigo-600">
                                  ({selectedSupplierDnCount} Supplier DN)
                                </span>
                              )}
                              {selectedProductionCount > 0 && (
                                <span className="ml-2 text-emerald-600">
                                  ({selectedProductionCount} Production)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedRequestIds([])}
                                className="px-3 py-1.5 text-xs border rounded bg-white text-slate-600 hover:bg-slate-50"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                disabled={!canEditSchedules || selectedBatchApproveCount === 0}
                                onClick={async () => {
                                  if (!canEditSchedules || selectedBatchApproveCount === 0) return;
                                  const outcome = await handleBatchApproveKanban?.();
                                  if (outcome && typeof outcome === 'object') {
                                    openRequestBatchResult('approve', outcome);
                                    if (outcome.ok) setSelectedRequestIds([]);
                                  } else if (outcome) {
                                    setSelectedRequestIds([]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs rounded border ${
                                  !canEditSchedules || selectedBatchApproveCount === 0
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={!canEditSchedules ? getLockedActionTitle(canEditSchedules, 'Batch approve') : 'Approve selected requests'}
                                >
                                  Batch Approve
                                </button>
                              <button
                                type="button"
                                disabled={!canEditSchedules || selectedSupplierDnCount === 0}
                                onClick={async () => {
                                  if (!canEditSchedules || selectedSupplierDnCount === 0) return;
                                  const outcome = await handleBatchApproveAndDn?.();
                                  if (outcome && typeof outcome === 'object') {
                                    openRequestBatchResult('approve-dn', outcome);
                                    if (outcome.ok) setSelectedRequestIds([]);
                                  } else if (outcome) {
                                    setSelectedRequestIds([]);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs rounded border ${
                                  !canEditSchedules || selectedSupplierDnCount === 0
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                }`}
                                title={!canEditSchedules ? getLockedActionTitle(canEditSchedules, 'Batch approve + DN') : 'Approve selected requests and create DN'}
                              >
                                Batch Approve + DN
                              </button>
                              <button
                                type="button"
                                disabled={!canEditSchedules || selectedProductionCount === 0}
                                onClick={() => {
                                  if (!canEditSchedules || selectedProductionCount === 0) return;
                                  void openProductionBatchRequests();
                                }}
                                className={`px-3 py-1.5 text-xs rounded border ${
                                  !canEditSchedules || selectedProductionCount === 0
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={!canEditSchedules ? getLockedActionTitle(canEditSchedules, 'Batch production') : 'Check BOM readiness and post selected production requests'}
                              >
                                Batch Production
                              </button>
                            </div>
                          </div>
                        )}
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
                              <th className="text-left p-2">{renderFilterHeader('Category', 'category')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Flow', 'flow')}</th>
                              <th className="text-left p-2">{renderFilterHeader('Supplier', 'supplier')}</th>
                              <th className="text-left p-2">Supply</th>
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
                              const groupKanbanId = firstRow ? buildKanbanDisplayId(firstRow.item_code, firstRow.item_type, firstRow) : '-';
                              const groupSupplierMeta = getRequestSupplierMeta(firstRow || {});
                              const groupFlowMeta = resolveRequestFlowMeta(firstRow || {});
                              const groupSupplyLabels = Array.from(new Set(group.rows.map((row) => getRequestSupplyLabel(row)).filter((label) => label && label !== '-')));
                              const firstRowStatusKey = String(firstRow?.status || '').trim().toLowerCase();
                              const groupFlowKeys = new Set(group.rows.map((row) => resolveRequestFlowMeta(row).key));
                              const groupFlowLabel = groupFlowKeys.size > 1 ? 'Mixed' : groupFlowMeta.label;
                              const groupCategoryKeys = new Set(group.rows.map((row) => resolveRequestFlowMeta(row).category?.key || 'other'));
                              const groupCategoryLabel = groupCategoryKeys.size > 1 ? 'Mixed' : groupFlowMeta.category?.label || '-';
                              const groupSelectableIds = group.rows.filter((row) => isRequestSelectable(row)).map((row) => row.id);
                              const groupSelectedCount = groupSelectableIds.filter((id) => selectedRequestIds.includes(id)).length;
                              const groupAllSelected = groupSelectableIds.length > 0 && groupSelectedCount === groupSelectableIds.length;
                              const groupSomeSelected = groupSelectedCount > 0 && !groupAllSelected;
                              const groupHasOverdue = group.rows.some((row) => getKanbanRequestHealth(row).isOverdue);
                              const groupHasBlocked = group.rows.some((row) => getKanbanRequestHealth(row).isOverPrl);
                              const groupHasStockGap = group.rows.some((row) => getKanbanRequestHealth(row).hasStockGap);
                              const groupMaxAge = group.rows.reduce((maxAge, row) => Math.max(maxAge, getKanbanRequestHealth(row).ageHours), 0);
                              const groupStatusLabel = groupHasStockGap
                                ? 'Pending - Stock Gap'
                                : groupHasBlocked
                                  ? 'Pending - Over PRL'
                                  : group.progressLabel;
                              const groupDnRow = group.rows.find((row) => row?.dn_id);
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
                                    <td className="p-2">
                                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {groupCategoryLabel}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${groupFlowKeys.size > 1 ? 'border-slate-200 bg-white text-slate-600' : getRequestFlowBadgeClass(groupFlowMeta.key)}`}>
                                        {groupFlowLabel}
                                      </span>
                                     </td>
                                     <td className="p-2 text-slate-700 font-semibold">{groupSupplierMeta.codeLabel}</td>
                                    <td className="p-2 text-slate-600">{groupSupplyLabels.length === 0 ? '-' : groupSupplyLabels.length === 1 ? groupSupplyLabels[0] : 'Mixed'}</td>
                                     <td className="p-2">{groupTriggerLabel}</td>
                                    <td className="p-2 text-right">{formatQty(groupOnHand)}</td>
                                    <td className="p-2 text-right font-semibold">{formatQty(group.totalQty || 0)}</td>
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
                                      {groupHasStockGap ? (
                                        <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                          Stock Gap
                                        </span>
                                      ) : groupHasBlocked ? (
                                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                          Over PRL
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                          Clear
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                                        groupHasStockGap
                                          ? 'bg-orange-100 text-orange-700'
                                          : groupHasBlocked
                                            ? 'bg-rose-100 text-rose-700'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}>
                                        {groupStatusLabel}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      {groupDnRow ? (
                                        <button
                                          type="button"
                                          onClick={() => openRequestDnDetail(groupDnRow)}
                                          className="px-2 py-1 border rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-[11px] font-semibold"
                                          title={`Buka DN-${groupDnRow.dn_id} di DN Register`}
                                        >
                                          DN
                                        </button>
                                      ) : groupFlowMeta.key === 'production' && firstRow ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (firstRowStatusKey === 'production_ready') {
                                              openProductionRequest(firstRow);
                                            } else {
                                              void openProductionBatchRows([firstRow]);
                                            }
                                          }}
                                          className="px-2 py-1 border rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-semibold"
                                          title={groupFlowMeta.reason || 'Release WO atau konfirmasi aktual produksi'}
                                        >
                                          {firstRowStatusKey === 'production_ready' ? 'Konfirmasi Aktual' : 'Buat WO'}
                                        </button>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                  {expanded && group.rows.map((row) => {
                                    const health = getKanbanRequestHealth(row);
                                    const onHand = health.onHand;
                                    const triggerLabel = row.trigger_type === 'manual' ? 'Manual' : 'Auto';
                                    const statusKey = String(row.status || '').trim().toLowerCase();
                                    const baseStatusLabel = statusKey === 'triggered' || statusKey === 'requested'
                                      ? 'Pending'
                                      : statusKey === 'approved'
                                        ? 'Approved'
                                        : statusKey === 'production_ready'
                                          ? 'WO Released'
                                        : statusKey === 'rejected'
                                          ? 'Rejected'
                                          : row.status;
                                    const statusLabel = health.hasStockGap && ['triggered', 'requested'].includes(statusKey)
                                      ? 'Pending - Stock Gap'
                                      : health.isOverPrl && !health.hasStockGap && ['triggered', 'requested'].includes(statusKey)
                                        ? 'Pending - Over PRL'
                                        : baseStatusLabel;
                                    const statusClass = health.hasStockGap && ['triggered', 'requested', 'approved'].includes(statusKey)
                                      ? 'bg-orange-100 text-orange-700'
                                      : statusLabel === 'WO Released'
                                        ? 'bg-sky-100 text-sky-700'
                                      : statusLabel === 'Approved'
                                        ? 'bg-slate-900 text-white'
                                        : statusLabel === 'Rejected'
                                          ? 'bg-red-100 text-red-700'
                                          : health.isOverPrl
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-slate-100 text-slate-700';
                                    const canApproveRequest = ['triggered', 'requested'].includes(statusKey);
                                    const allowApproveAndDn = dnStatusFlowList.length === 0 || dnStatusFlowList.includes('APPROVE') || dnStatusFlowList.includes('APPROVED');
                                    const rowKanbanId = extractKanbanIdNote(row.notes) || buildKanbanDisplayId(row.item_code, row.item_type, row);
                                    const scheduleVendor = resolveRequestVendor(row);
                                    const canCreateScheduleForRow = isScheduleVendorRole(scheduleVendor?.role);
                                    const rowSupplierMeta = getRequestSupplierMeta(row);
                                    const rowFlowMeta = resolveRequestFlowMeta(row);
                                    const canCreateDnForRow = Boolean(rowFlowMeta.canCreateDn);
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
                                        <td className="p-2">{rowKanbanId}</td>
                                        <td className="p-2">{row.item_code} - {row.item_name || '-'}</td>
                                        <td className="p-2">
                                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {rowFlowMeta.category?.label || '-'}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRequestFlowBadgeClass(rowFlowMeta.key)}`} title={rowFlowMeta.reason || rowFlowMeta.actionLabel || ''}>
                                            {rowFlowMeta.label}
                                          </span>
                                         </td>
                                         <td className="p-2 text-slate-700 font-semibold">{rowSupplierMeta.codeLabel}</td>
                                        <td className="p-2 text-slate-600">{getRequestSupplyLabel(row)}</td>
                                         <td className="p-2">{triggerLabel}</td>
                                        <td className="p-2 text-right">{formatQty(onHand)}</td>
                                        <td className="p-2 text-right font-semibold">{formatQty(row.request_qty || 0)}</td>
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
                                              <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                                Stock Gap
                                              </span>
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
                                          {row.dn_id && (
                                            <div className="mt-1 text-[10px] font-semibold text-indigo-600">DN-{row.dn_id}</div>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          <div className="flex gap-1 flex-wrap items-center">
                                            <button
                                              type="button"
                                              onClick={() => openKanbanInScan(rowKanbanId)}
                                              className="px-2 py-1 border rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                              title="Ambil Kanban ID ini untuk scan"
                                            >
                                              Scan
                                            </button>
                                            {health.hasStockGap && (
                                              <button
                                                type="button"
                                                disabled={!canEditSchedules}
                                                onClick={() => {
                                                  if (!canEditSchedules) return;
                                                  openKanbanShortageInPrl(row);
                                                }}
                                                className={getLockedButtonClassName('px-2 py-1 border rounded text-orange-700 bg-orange-50 hover:bg-orange-100', !canEditSchedules)}
                                                title={getLockedActionTitle(canEditSchedules, 'Buka PRL auto draft untuk item ini')}
                                                aria-label="Open stock gap in PRL"
                                              >
                                                PRL
                                              </button>
                                            )}
                                            {canApproveRequest && (
                                              <>
                                                <button
                                                  disabled={!canEditSchedules}
                                                  onClick={async () => {
                                                    if (!canEditSchedules) return;
                                                    const outcome = await handleApproveKanban(row);
                                                    if (outcome && typeof outcome === 'object') {
                                                      openRequestBatchResult('approve', outcome);
                                                    }
                                                  }}
                                                  className={getLockedButtonClassName('px-2 py-1 border rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100', !canEditSchedules)}
                                                  title={getLockedActionTitle(canEditSchedules, 'Approve request')}
                                                  aria-label="Approve request"
                                                >
                                                  Approve
                                                </button>
                                                {allowApproveAndDn && canCreateDnForRow && !health.hasStockGap && (
                                                  <button
                                                    disabled={!canEditSchedules}
                                                    onClick={async () => {
                                                      if (!canEditSchedules) return;
                                                      const outcome = await handleApproveAndCreateDn(row);
                                                      if (outcome && typeof outcome === 'object') {
                                                        openRequestBatchResult('approve-dn', outcome);
                                                      }
                                                    }}
                                                    className={getLockedButtonClassName('px-2 py-1 border rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100', !canEditSchedules)}
                                                    title={getLockedActionTitle(canEditSchedules, 'Approve + DN')}
                                                    aria-label="Approve and create DN"
                                                  >
                                                    Approve + DN
                                                  </button>
                                                )}
                                                {!canCreateDnForRow && rowFlowMeta.key === 'production' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (statusKey === 'production_ready') {
                                                        openProductionRequest(row);
                                                      } else {
                                                        void openProductionBatchRows([row]);
                                                      }
                                                    }}
                                                    className="px-2 py-1 border rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                    title={rowFlowMeta.reason || 'Release WO atau konfirmasi aktual produksi'}
                                                  >
                                                    {statusKey === 'production_ready' ? 'Konfirmasi Aktual' : 'Buat WO'}
                                                  </button>
                                                )}
                                                {!canCreateDnForRow && rowFlowMeta.key === 'subcon' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setMainTab?.('subcon')}
                                                    className="px-2 py-1 border rounded text-violet-700 bg-violet-50 hover:bg-violet-100"
                                                    title={rowFlowMeta.reason || 'Open Subcon flow'}
                                                  >
                                                    Subcon
                                                  </button>
                                                )}
                                                <button
                                                  disabled={!canEditSchedules}
                                                  onClick={() => {
                                                    if (!canEditSchedules) return;
                                                    handleRejectKanban(row);
                                                  }}
                                                  className={getLockedButtonClassName('p-2 border rounded text-amber-600 hover:text-amber-700', !canEditSchedules)}
                                                  title={getLockedActionTitle(canEditSchedules, 'Reject')}
                                                  aria-label="Reject request"
                                                >
                                                  <XIcon size={12} />
                                                </button>
                                                {canDeleteRecords && (
                                                  <button
                                                    disabled={!canDeleteRecords}
                                                    onClick={() => {
                                                      if (!canDeleteRecords) return;
                                                      handleDeleteKanbanRequest(row);
                                                    }}
                                                    className={getLockedButtonClassName('p-2 border rounded text-red-600 hover:text-red-700', !canDeleteRecords)}
                                                    title={getLockedActionTitle(canDeleteRecords, 'Delete')}
                                                    aria-label="Delete request"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                )}
                                              </>
                                            )}
                                            {canDeleteRecords && row.status === 'approved' && !row.dn_id && (
                                              <button
                                                disabled={!canDeleteRecords}
                                                onClick={() => {
                                                  if (!canDeleteRecords) return;
                                                  handleDeleteKanbanRequest(row);
                                                }}
                                                className={getLockedButtonClassName('p-2 border rounded text-red-600 hover:text-red-700', !canDeleteRecords)}
                                                title={getLockedActionTitle(canDeleteRecords, 'Delete')}
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
                                                    disabled={!canDeleteRecords}
                                                    onClick={() => {
                                                      if (!canDeleteRecords) return;
                                                      handleDeleteKanbanRequest(row);
                                                    }}
                                                    className={getLockedButtonClassName('w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50', !canDeleteRecords)}
                                                  >
                                                    Hapus
                                                  </button>
                                                </div>
                                              </details>
                                            )}
                                            {row.status === 'approved' && row.dn_id && (
                                              <span className="text-[10px] text-indigo-600 font-semibold">DN-{row.dn_id}</span>
                                            )}
                                            {row.status === 'approved' && !row.dn_id && canCreateDnForRow && (
                                              <button
                                                disabled={!canEditSchedules}
                                                onClick={() => {
                                                  if (!canEditSchedules) return;
                                                  openDnModal(row);
                                                }}
                                                className={getLockedButtonClassName('p-2 border rounded text-slate-600 hover:text-slate-900', !canEditSchedules)}
                                                title={getLockedActionTitle(canEditSchedules, 'Create DN')}
                                                aria-label="Create DN"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            )}
                                            {row.status === 'approved' && !row.dn_id && !canCreateDnForRow && rowFlowMeta.key === 'production' && (
                                              <button
                                                type="button"
                                                onClick={() => { void openProductionBatchRows([row]); }}
                                                className="px-2 py-1 border rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                title={rowFlowMeta.reason || 'Check BOM readiness and release WO'}
                                              >
                                                Buat WO
                                              </button>
                                            )}
                                            {row.status === 'production_ready' && !row.dn_id && !canCreateDnForRow && rowFlowMeta.key === 'production' && (
                                              <button
                                                type="button"
                                                onClick={() => openProductionRequest(row)}
                                                className="px-2 py-1 border rounded text-sky-700 bg-sky-50 hover:bg-sky-100"
                                                title={rowFlowMeta.reason || 'Konfirmasi aktual produksi'}
                                              >
                                                Konfirmasi Aktual
                                              </button>
                                            )}
                                            {row.status === 'approved' && !row.dn_id && !canCreateDnForRow && rowFlowMeta.key === 'subcon' && (
                                              <button
                                                type="button"
                                                onClick={() => setMainTab?.('subcon')}
                                                className="px-2 py-1 border rounded text-violet-700 bg-violet-50 hover:bg-violet-100"
                                                title={rowFlowMeta.reason || 'Open Subcon flow'}
                                              >
                                                Subcon
                                              </button>
                                            )}
                                            {row.status === 'dn_created' && row.dn_id && (
                                              <button
                                                type="button"
                                                onClick={() => openRequestDnDetail(row)}
                                                className="px-2 py-1 border rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold"
                                                title={`Buka DN-${row.dn_id} di DN Register`}
                                                aria-label="Open DN register detail"
                                              >
                                                DN
                                              </button>
                                            )}
                                            {row.status === 'dn_created' && row.dn_id && canCreateScheduleForRow && (
                                              <button
                                                disabled={!canEditSchedules}
                                                onClick={() => {
                                                  if (!canEditSchedules) return;
                                                  openScheduleModal(row);
                                                }}
                                                className={getLockedButtonClassName('p-2 border rounded text-slate-600 hover:text-slate-900', !canEditSchedules)}
                                                title={getLockedActionTitle(canEditSchedules, 'Create Schedule')}
                                                aria-label="Create schedule"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            )}
                                            {(row.status === 'scheduled' || row.status === 'in_transit') && row.schedule_id && (
                                              <button
                                                disabled={!canEditSchedules}
                                                onClick={() => {
                                                  if (!canEditSchedules) return;
                                                  openReceiveModal(row);
                                                }}
                                                className={getLockedButtonClassName('p-2 border rounded text-slate-600 hover:text-slate-900', !canEditSchedules)}
                                                title={getLockedActionTitle(canEditSchedules, 'Receive/RN')}
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
                              <tr><td colSpan="16" className="p-3 text-center text-gray-400">No requests found.</td></tr>
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

                {!isProductionUser && kanbanSubTab === 'dn' && (
                  <div className="bg-white rounded-xl border p-4">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold">DN Register</div>
                        <div className="text-xs text-slate-500">
                          {kanbanDnPaginationMeta.total} DN tampil dari filter aktif.
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_150px_auto] lg:min-w-[720px]">
                        <label className="relative block">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
                            placeholder="Cari DN / supplier / tanggal / status"
                            value={kanbanDnFilters?.search || ''}
                            onChange={(event) => updateKanbanDnFilter('search', event.target.value)}
                          />
                        </label>
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                          value={kanbanDnFilters?.supplier || 'all'}
                          onChange={(event) => updateKanbanDnFilter('supplier', event.target.value)}
                        >
                          <option value="all">Semua supplier</option>
                          {(kanbanDnSupplierOptions || []).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                          value={kanbanDnFilters?.status || 'all'}
                          onChange={(event) => updateKanbanDnFilter('status', event.target.value)}
                        >
                          <option value="all">Semua status</option>
                          {(kanbanDnStatusOptions || []).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={resetKanbanDnFilters}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2">DN Number</th>
                            <th className="text-left p-2">Supplier</th>
                            <th className="text-left p-2">Created Date</th>
                            <th className="text-left p-2">Delivery Date</th>
                            <th className="text-right p-2">Qty</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Alert</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryNotesLoading && (
                            <tr><td colSpan="9" className="p-3 text-center text-gray-400">Loading...</td></tr>
                          )}
                          {!deliveryNotesLoading && kanbanDnPaginationMeta.rows.map((dn) => {
                            const supplierVendor = resolveVendorFromSupplier(dn.supplier);
                            const supplierLabel = supplierVendor?.name || dn.supplier || '-';
                            const supplierCode = supplierVendor?.id || '';
                            const createdDate = formatDnDate(dn.created_at);
                            const plannedDate = formatDnDate(dn.planned_date);
                            const statusValue = String(dn.status || '').toLowerCase();
                            const statusLabel = statusValue ? statusValue.toUpperCase() : '-';
                            const deliveryTypeLabel = getDnDeliveryTypeForDisplay(dn).toUpperCase();
                            const isDraft = statusValue === 'draft';
                            const canEditDnHeader = ['draft', 'open'].includes(statusValue);
                            const arrivalWarning = getDnArrivalWarning(dn);
                            const isEmailSending = Number(dnEmailSendingId) === Number(dn.id);
                            const isEmailLocked = ['closed', 'received', 'cancelled', 'canceled'].includes(statusValue);
                            const hasEmailBeenSent = typeof isDnEmailSent === 'function'
                              ? isDnEmailSent(dn)
                              : Boolean(dn?.email_sent_at || dn?.emailSentAt || Number(dn?.email_send_count || dn?.emailSendCount || 0) > 0 || statusValue === 'sent');
                            return (
                            <tr key={dn.id} className="border-t">
                              <td className="p-2 font-semibold">{dn.dn_number}</td>
                              <td className="p-2">
                                <div className="font-semibold text-slate-800">{supplierLabel}</div>
                                {supplierCode && <div className="text-[10px] text-slate-400">{supplierCode}</div>}
                              </td>
                              <td className="p-2 text-slate-600">{createdDate}</td>
                              <td className="p-2">{plannedDate}</td>
                              <td className="p-2 text-right">{formatQty(dn.total_qty)}</td>
                              <td className="p-2">{statusLabel}</td>
                              <td className="p-2">{deliveryTypeLabel}</td>
                              <td className="p-2">
                                {arrivalWarning ? (
                                  <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${arrivalWarning.className}`}>
                                    {arrivalWarning.label}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openDnDetailModal(dn, false)}
                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                    title="Lihat Detail"
                                  >
                                    <Eye size={13} /> Detail
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDnPrintPdf(dn)}
                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                    title="Print / PDF DN"
                                  >
                                    <Printer size={13} /> Print/PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDnEmail(dn)}
                                    disabled={isEmailSending || isEmailLocked}
                                    className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
                                      isEmailSending
                                        ? 'cursor-wait border-sky-200 bg-sky-50 text-sky-700'
                                        : isEmailLocked
                                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                        : hasEmailBeenSent
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                    title={isEmailSending ? 'Email sedang dikirim' : isEmailLocked ? 'Email terkunci karena DN sudah selesai' : hasEmailBeenSent ? 'Email sudah dikirim - klik untuk detail atau resend' : 'Email DN'}
                                  >
                                    {isEmailSending ? <Clock size={13} /> : hasEmailBeenSent && !isEmailLocked ? <CheckCircle size={13} /> : <Mail size={13} />}
                                    {isEmailSending ? 'Mengirim...' : 'Email'}
                                  </button>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setDnActionMenuOpen((prev) => (prev === dn.id ? null : dn.id))}
                                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                      title="Aksi lainnya"
                                    >
                                      Lainnya <ChevronDown size={12} />
                                    </button>
                                    {dnActionMenuOpen === dn.id && (
                                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDnActionMenuOpen(null);
                                            handleDnPreview(dn);
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                          <FileText size={13} /> Preview DN
                                        </button>
                                        {canEditDnHeader && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDnActionMenuOpen(null);
                                              openDnDetailModal(dn, true);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                          >
                                            <Edit size={13} /> Edit tanggal / rit
                                          </button>
                                        )}
                                        {isDraft && canEditSchedules && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDnActionMenuOpen(null);
                                              handleSplitDnByRit(dn);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                          >
                                            <ArrowDownUp size={13} /> Split rit
                                          </button>
                                        )}
                                        {isDraft && canDeleteRecords && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDnActionMenuOpen(null);
                                              handleDeleteDn(dn);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                                          >
                                            <Trash2 size={13} /> Hapus DN
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )})}
                          {!deliveryNotesLoading && kanbanDnPaginationMeta.total === 0 && (
                            <tr><td colSpan="9" className="p-3 text-center text-gray-400">No DN found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3">
                      {renderPaginationControls('kanbanDn', kanbanDnPaginationMeta)}
                    </div>
                  </div>
                )}

                {!isProductionUser && kanbanSubTab === 'delivery' && (
                  canOpenDeliveryTab ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Delivery Workflow</div>
                        <div className="text-xs text-slate-500">Pisahkan alur upload DN, import penerimaan aktual, dan histori agar lebih cepat dipakai operator.</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { key: 'upload-dn', label: 'Upload DN' },
                          { key: 'import-aktual', label: 'Import Aktual' },
                          { key: 'outbound-customer', label: 'Outbound Customer' },
                          { key: 'history', label: 'History' },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setDeliveryWorkflowTab(tab.key)}
                            className={`px-3 py-2 text-xs rounded border transition ${
                              deliveryWorkflowTab === tab.key
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="px-3 py-2 text-xs border rounded"
                          onClick={() => refreshDeliveryWorkflow()}
                          disabled={deliveryUploadsLoading || customerShipmentsLoading}
                        >
                          {deliveryUploadsLoading || customerShipmentsLoading ? 'Memuat...' : 'Refresh'}
                        </button>
                      </div>
                    </div>

                    {deliveryWorkflowTab === 'upload-dn' && (
                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-4">
                        <div className="bg-white rounded-xl border p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Upload Delivery Note</div>
                              <div className="text-xs text-slate-500">Upload foto atau PDF DN customer. Sistem akan baca teks, cek stok tersedia, lalu trigger backorder BOM jika kurang.</div>
                            </div>
                          </div>
                          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                            OCR utama memakai Gemini. Jika Gemini terkena limit/rate-limit, sistem akan mencoba OCR lokal Tesseract bila sudah terpasang di server.
                          </div>
                          <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                            <input
                              ref={deliveryUploadInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              className="block w-full text-xs"
                            />
                            <div className="mt-2 text-[11px] text-slate-500">
                              Format: foto JPG/PNG/WEBP atau PDF hasil scan customer.
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleDeliveryUpload}
                                disabled={deliveryUploadLoading}
                                className="px-3 py-2 text-xs bg-slate-900 text-white rounded flex items-center gap-2 disabled:opacity-60"
                              >
                                <FileUp size={14} />
                                {deliveryUploadLoading ? 'Memproses...' : 'Upload & Proses'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (deliveryUploadInputRef.current) deliveryUploadInputRef.current.value = '';
                                  setDeliveryUploadError('');
                                }}
                                className="px-3 py-2 text-xs border rounded"
                              >
                                Reset
                              </button>
                            </div>
                            {deliveryUploadError && (
                              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
                                {deliveryUploadError}
                              </div>
                            )}
                            {deliveryUploadResult && (
                              <div className="mt-4 rounded-xl border bg-white p-3 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-slate-700">Hasil Upload Terakhir</div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    String(deliveryUploadResult.status || '').toLowerCase() === 'full'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {String(deliveryUploadResult.status || '-').toUpperCase()}
                                  </span>
                                </div>
                                {deliveryUploadResult.extraction_warning && (
                                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                                    {deliveryUploadResult.extraction_warning}
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <div className="text-slate-400">Customer</div>
                                    <div className="font-semibold text-slate-800 break-words">{deliveryUploadResult.customer_name || '-'}</div>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <div className="text-slate-400">DN Number</div>
                                    <div className="font-semibold text-slate-800 break-words">{deliveryUploadResult.dn_number || '-'}</div>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <div className="text-slate-400">Qty Order</div>
                                    <div className="font-semibold text-slate-800">{formatQty(deliveryUploadResult.total_qty_order || 0)}</div>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2">
                                    <div className="text-slate-400">Qty Kurang</div>
                                    <div className="font-semibold text-slate-800">{formatQty(deliveryUploadResult.total_qty_shortage || 0)}</div>
                                  </div>
                                </div>
                                {(() => {
                                  const fulfilledQty = getDeliveryUploadFulfilledQty(deliveryUploadResult);
                                  const shipment = getDeliveryUploadShipment(deliveryUploadResult);
                                  const isCreating = Number(customerShipmentCreatingId) === Number(deliveryUploadResult.id);
                                  return (
                                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="font-semibold text-slate-800">
                                          {shipment?.id ? `Order Muat: ${getCustomerOutboundNumber(shipment)}` : fulfilledQty > 0 ? 'Qty tersedia siap dibuat Order Muat.' : 'Stok belum ada untuk dibuat Order Muat.'}
                                        </div>
                                        <div className="text-slate-500">Order Muat mengambil qty tersedia, bukan qty kurang/backorder.</div>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isCreating || !(fulfilledQty > 0)}
                                        onClick={() => handleCreateCustomerShipment(deliveryUploadResult)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Printer size={13} />
                                        {isCreating ? 'Membuat...' : shipment?.id ? 'Print Order Muat' : 'Buat Order Muat'}
                                      </button>
                                    </div>
                                  );
                                })()}
                                <div className="overflow-x-auto">
                                  <table className="min-w-[900px] w-full text-[11px]">
                                    <thead className="bg-slate-100 text-slate-600">
                                      <tr>
                                        <th className="p-2 text-left">No</th>
                                        <th className="p-2 text-left">UNIQ</th>
                                        <th className="p-2 text-left">Part No</th>
                                        <th className="p-2 text-left">Item Master</th>
                                        <th className="p-2 text-right">Order</th>
                                        <th className="p-2 text-right">Stok</th>
                                        <th className="p-2 text-right">Tersedia Muat</th>
                                        <th className="p-2 text-right">Kurang</th>
                                        <th className="p-2 text-left">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lastDeliveryUploadItems.map((item) => {
                                        const statusKey = String(item.status || '').toLowerCase();
                                        const details = item.details && typeof item.details === 'object' ? item.details : {};
                                        const parsed = details.parsed && typeof details.parsed === 'object' ? details.parsed : {};
                                        const tone = statusKey === 'full'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : statusKey === 'partial_backorder'
                                            ? 'bg-amber-100 text-amber-700'
                                            : statusKey === 'missing_item'
                                              ? 'bg-rose-100 text-rose-700'
                                              : 'bg-slate-100 text-slate-700';
                                        return (
                                          <tr key={item.id || `${item.lineNo}-${item.partNo}`} className="border-t">
                                            <td className="p-2">{item.lineNo || '-'}</td>
                                            <td className="p-2 font-semibold">{parsed.uniq || details.uniq || item.itemCode || '-'}</td>
                                            <td className="p-2">{item.partNo || parsed.partNo || '-'}</td>
                                            <td className="p-2">
                                              <div className="font-semibold">{item.itemCode || '-'}</div>
                                              <div className="text-slate-500">{item.itemName || '-'}</div>
                                            </td>
                                            <td className="p-2 text-right">{formatQty(item.qtyOrder || 0)}</td>
                                            <td className="p-2 text-right">{formatQty(item.qtyAvailable || 0)}</td>
                                            <td className="p-2 text-right text-emerald-700 font-semibold">{formatQty(item.qtyFulfilled || 0)}</td>
                                            <td className="p-2 text-right text-rose-700 font-semibold">{formatQty(item.qtyShortage || 0)}</td>
                                            <td className="p-2">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone}`}>
                                                {statusKey ? statusKey.replace(/_/g, ' ').toUpperCase() : '-'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {lastDeliveryUploadItems.length === 0 && (
                                        <tr>
                                          <td colSpan="9" className="p-3 text-center text-slate-400">Detail item akan tampil setelah upload selesai.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                          {deliveryUploadsError && (
                            <div className="text-xs text-red-600">{deliveryUploadsError}</div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl border bg-slate-50 p-3">
                              <div className="text-[10px] uppercase tracking-wide text-slate-400">Upload</div>
                              <div className="mt-1 text-xl font-bold text-slate-900">{deliveryUploadSummary.total}</div>
                            </div>
                            <div className="rounded-xl border bg-emerald-50 p-3">
                              <div className="text-[10px] uppercase tracking-wide text-emerald-600">Full</div>
                              <div className="mt-1 text-xl font-bold text-emerald-700">{deliveryUploadSummary.full}</div>
                            </div>
                            <div className="rounded-xl border bg-amber-50 p-3">
                              <div className="text-[10px] uppercase tracking-wide text-amber-600">Partial</div>
                              <div className="mt-1 text-xl font-bold text-amber-700">{deliveryUploadSummary.partial}</div>
                            </div>
                            <div className="rounded-xl border bg-rose-50 p-3">
                              <div className="text-[10px] uppercase tracking-wide text-rose-600">Shortage Qty</div>
                              <div className="mt-1 text-xl font-bold text-rose-700">{formatNumber0(deliveryUploadSummary.shortageQty || 0)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border p-4">
                          <div className="text-sm font-semibold mb-2">Ringkasan DN</div>
                          <div className="text-xs text-slate-500 mb-3">Data upload DN terakhir dan ringkasan proses akan tampil di sini.</div>
                          <div className="space-y-2 text-xs">
                            <div className="rounded-lg border bg-slate-50 p-3">
                              <div className="text-[10px] uppercase text-slate-400">Total Upload</div>
                              <div className="font-semibold">{deliveryUploads.length}</div>
                            </div>
                            <div className="rounded-lg border bg-slate-50 p-3">
                              <div className="text-[10px] uppercase text-slate-400">Last Customer</div>
                              <div className="font-semibold break-words">{deliveryUploadResult?.customer_name || '-'}</div>
                            </div>
                            <div className="rounded-lg border bg-slate-50 p-3">
                              <div className="text-[10px] uppercase text-slate-400">Last DN</div>
                              <div className="font-semibold break-words">{deliveryUploadResult?.dn_number || '-'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {deliveryWorkflowTab === 'outbound-customer' && (
                      <div className="space-y-4">
                        {customerShipmentsError && (
                          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">{customerShipmentsError}</div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-xl border bg-slate-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">Order Muat</div>
                            <div className="mt-1 text-xl font-bold text-slate-900">{customerShipmentSummary.total}</div>
                          </div>
                          <div className="rounded-xl border bg-sky-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-sky-600">Picked</div>
                            <div className="mt-1 text-xl font-bold text-sky-700">{customerShipmentSummary.picked}</div>
                          </div>
                          <div className="rounded-xl border bg-emerald-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-emerald-600">Loaded / Stock Out</div>
                            <div className="mt-1 text-xl font-bold text-emerald-700">{customerShipmentSummary.loaded}</div>
                          </div>
                          <div className="rounded-xl border bg-amber-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-amber-600">Qty Rencana</div>
                            <div className="mt-1 text-xl font-bold text-amber-700">{formatQty(customerShipmentSummary.totalQty || 0)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] gap-4">
                          <div className="bg-white rounded-xl border p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">Daftar Order Muat</div>
                                <div className="text-xs text-slate-500">Dari DN customer, untuk picking dan loading warehouse.</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => fetchCustomerShipments()}
                                disabled={customerShipmentsLoading}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {customerShipmentsLoading ? 'Memuat...' : 'Refresh'}
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-[820px] w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Order Muat</th>
                                    <th className="p-2 text-left">SJ Customer</th>
                                    <th className="p-2 text-left">Customer</th>
                                    <th className="p-2 text-left">Ref DN</th>
                                    <th className="p-2 text-right">Qty</th>
                                    <th className="p-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customerShipmentsLoading && (
                                    <tr>
                                      <td colSpan="6" className="p-3 text-center text-slate-400">Memuat...</td>
                                    </tr>
                                  )}
                                  {!customerShipmentsLoading && customerShipments.map((row) => {
                                    const active = Number(selectedCustomerShipment?.id || 0) === Number(row.id || 0);
                                    const statusMeta = getCustomerShipmentStatusMeta(row.status);
                                    return (
                                      <tr
                                        key={row.id}
                                        className={`border-t cursor-pointer ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                        onClick={() => setSelectedCustomerShipmentId(row.id)}
                                      >
                                        <td className="p-2 font-semibold">{getCustomerOutboundNumber(row)}</td>
                                        <td className="p-2">{getCustomerSjNumber(row) || '-'}</td>
                                        <td className="p-2">{row.customerName || row.customer_name || '-'}</td>
                                        <td className="p-2">{row.customerDnNumber || row.customer_dn_number || '-'}</td>
                                        <td className="p-2 text-right font-semibold">{formatQty(row.totalQty || row.total_qty || 0)}</td>
                                        <td className="p-2">
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}>
                                            {statusMeta.label}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {!customerShipmentsLoading && customerShipments.length === 0 && (
                                    <tr>
                                      <td colSpan="6" className="p-3 text-center text-slate-400">Belum ada Order Muat.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border p-4 space-y-4">
                            {selectedCustomerShipment ? (() => {
                              const shipment = selectedCustomerShipment;
                              const statusMeta = getCustomerShipmentStatusMeta(shipment.status);
                              const loaded = isCustomerShipmentLoaded(shipment);
                              const fullyPicked = isCustomerShipmentFullyPicked(shipment);
                              const pickedQty = getCustomerShipmentPickedQty(shipment);
                              const loadedQty = getCustomerShipmentLoadedQty(shipment);
                              const uploadId = getShipmentUploadId(shipment);
                              const isConfirming = Number(customerShipmentConfirmingId) === Number(shipment.id);
                              return (
                                <>
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="text-sm font-semibold">Warehouse Pick & Confirm</div>
                                      <div className="mt-1 text-xs text-slate-500">{getCustomerOutboundNumber(shipment)} | Ref DN {shipment.customerDnNumber || shipment.customer_dn_number || '-'}</div>
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                                        <span className={`rounded-full px-2 py-0.5 ${statusMeta.className}`}>{statusMeta.label}</span>
                                        {getCustomerSjNumber(shipment) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">SJ {getCustomerSjNumber(shipment)}</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => printCustomerShipment(shipment)}
                                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        <Printer size={13} /> {loaded ? 'Print SJ' : 'Print Order Muat'}
                                      </button>
                                      {uploadId > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedDeliveryUploadId(uploadId);
                                            setDeliveryWorkflowTab('history');
                                          }}
                                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                          <Eye size={13} /> DN
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="rounded-lg border bg-slate-50 p-3">
                                      <div className="text-[10px] uppercase text-slate-400">Rencana</div>
                                      <div className="font-bold">{formatQty(shipment.totalQty || shipment.total_qty || 0)}</div>
                                    </div>
                                    <div className="rounded-lg border bg-sky-50 p-3">
                                      <div className="text-[10px] uppercase text-sky-600">Picked</div>
                                      <div className="font-bold text-sky-700">{formatQty(pickedQty)}</div>
                                    </div>
                                    <div className="rounded-lg border bg-emerald-50 p-3">
                                      <div className="text-[10px] uppercase text-emerald-600">Loaded</div>
                                      <div className="font-bold text-emerald-700">{formatQty(loadedQty)}</div>
                                    </div>
                                  </div>

                                  {!loaded && (
                                    <form onSubmit={handleScanCustomerShipmentKanban} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <div className="mb-2 text-xs font-semibold text-slate-700">Scan Kanban Kosong / Label Stok</div>
                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                          value={customerShipmentScanValue}
                                          onChange={(event) => setCustomerShipmentScanValue(event.target.value)}
                                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200"
                                          placeholder="Scan atau input kanban ID"
                                          autoComplete="off"
                                        />
                                        <button
                                          type="submit"
                                          disabled={customerShipmentScanLoading || !customerShipmentScanValue.trim()}
                                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                        >
                                          <QrCode size={13} /> {customerShipmentScanLoading ? 'Scan...' : 'Scan Pick'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={!fullyPicked || isConfirming}
                                          onClick={() => handleConfirmCustomerShipmentLoaded(shipment)}
                                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                        >
                                          <Truck size={13} /> {isConfirming ? 'Confirm...' : 'Confirm Muat'}
                                        </button>
                                      </div>
                                    </form>
                                  )}

                                  <div className="overflow-x-auto rounded-xl border">
                                    <table className="min-w-[940px] w-full text-xs">
                                      <thead className="bg-slate-100 text-slate-600">
                                        <tr>
                                          <th className="p-2 text-left">UNIQ</th>
                                          <th className="p-2 text-left">Part No</th>
                                          <th className="p-2 text-left">Part Name</th>
                                          <th className="p-2 text-right">Rencana</th>
                                          <th className="p-2 text-right">Picked</th>
                                          <th className="p-2 text-right">Loaded</th>
                                          <th className="p-2 text-left">Scan</th>
                                          <th className="p-2 text-left">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(shipment.items || []).map((item) => {
                                          const itemStatus = getCustomerShipmentStatusMeta(item.pickStatus || item.pick_status || shipment.status);
                                          const refs = Array.isArray(item.scanRefs) ? item.scanRefs : Array.isArray(item.scan_refs) ? item.scan_refs : [];
                                          return (
                                            <tr key={item.id} className="border-t align-top">
                                              <td className="p-2 font-semibold">{item.itemCode || item.item_code || '-'}</td>
                                              <td className="p-2">{item.partNo || item.part_no || '-'}</td>
                                              <td className="p-2">{item.itemName || item.item_name || '-'}</td>
                                              <td className="p-2 text-right">{formatQty(item.qtyShip || item.qty_ship || 0)}</td>
                                              <td className="p-2 text-right text-sky-700 font-semibold">{formatQty(item.qtyPicked || item.qty_picked || 0)}</td>
                                              <td className="p-2 text-right text-emerald-700 font-semibold">{formatQty(item.qtyLoaded || item.qty_loaded || 0)}</td>
                                              <td className="p-2">
                                                {refs.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {refs.slice(-3).map((ref, index) => (
                                                      <div key={`${item.id}-scan-${index}`} className="rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                                                        {ref.kanbanId || '-'} | {formatQty(ref.qty || 0)}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400">-</span>
                                                )}
                                              </td>
                                              <td className="p-2">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${itemStatus.className}`}>
                                                  {itemStatus.label}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
                              );
                            })() : (
                              <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-center text-xs text-slate-500">
                                Belum ada Order Muat. Buat dari hasil upload DN yang stoknya tersedia.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {deliveryWorkflowTab === 'history' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-xl border bg-slate-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">Upload</div>
                            <div className="mt-1 text-xl font-bold text-slate-900">{deliveryUploadSummary.total}</div>
                          </div>
                          <div className="rounded-xl border bg-emerald-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-emerald-600">Full</div>
                            <div className="mt-1 text-xl font-bold text-emerald-700">{deliveryUploadSummary.full}</div>
                          </div>
                          <div className="rounded-xl border bg-amber-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-amber-600">Partial</div>
                            <div className="mt-1 text-xl font-bold text-amber-700">{deliveryUploadSummary.partial}</div>
                          </div>
                          <div className="rounded-xl border bg-rose-50 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-rose-600">Shortage Qty</div>
                            <div className="mt-1 text-xl font-bold text-rose-700">{formatNumber0(deliveryUploadSummary.shortageQty || 0)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
                          <div className="bg-white rounded-xl border p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="text-sm font-semibold">Histori Upload DN</div>
                                <div className="text-xs text-slate-500">Klik baris untuk melihat detail item dan backorder BOM.</div>
                              </div>
                              <div className="text-xs text-slate-500">{deliveryUploads.length} record</div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-[960px] w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Waktu</th>
                                    <th className="p-2 text-left">Customer</th>
                                    <th className="p-2 text-left">DN Number</th>
                                    <th className="p-2 text-right">Order</th>
                                    <th className="p-2 text-right">Tersedia Muat</th>
                                    <th className="p-2 text-right">Shortage</th>
                                    <th className="p-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {deliveryUploadsLoading && (
                                    <tr>
                                      <td colSpan="7" className="p-3 text-center text-slate-400">Memuat...</td>
                                    </tr>
                                  )}
                                  {!deliveryUploadsLoading && deliveryUploads.map((row) => {
                                    const statusKey = String(row.status || '').toLowerCase();
                                    const active = Number(selectedDeliveryUpload?.id || 0) === Number(row.id || 0);
                                    const statusTone = statusKey === 'full'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : statusKey === 'partial_backorder'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-rose-100 text-rose-700';
                                    return (
                                      <tr
                                        key={row.id}
                                        className={`border-t cursor-pointer ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                        onClick={() => setSelectedDeliveryUploadId(row.id)}
                                      >
                                        <td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                                        <td className="p-2">{row.customer_name || '-'}</td>
                                        <td className="p-2 font-semibold">{row.dn_number || '-'}</td>
                                        <td className="p-2 text-right">{formatQty(row.total_qty_order || 0)}</td>
                                        <td className="p-2 text-right">{formatQty(row.total_qty_fulfilled || 0)}</td>
                                        <td className="p-2 text-right">{formatQty(row.total_qty_shortage || 0)}</td>
                                        <td className="p-2">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusTone}`}>
                                            {statusKey ? statusKey.replace(/_/g, ' ').toUpperCase() : '-'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {!deliveryUploadsLoading && deliveryUploads.length === 0 && (
                                    <tr>
                                      <td colSpan="7" className="p-3 text-center text-slate-400">Belum ada upload DN.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl border p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="text-sm font-semibold">Detail DN Terpilih</div>
                                <div className="text-xs text-slate-500">Detail item per baris dan request BOM yang dibuat.</div>
                              </div>
                              <div className="text-xs text-slate-500">{selectedDeliveryUpload?.file_name || '-'}</div>
                            </div>
                            {selectedDeliveryUpload ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Customer</div>
                                    <div className="mt-1 font-semibold break-words">{selectedDeliveryUpload.customer_name || '-'}</div>
                                  </div>
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400">DN Number</div>
                                    <div className="mt-1 font-semibold break-words">{selectedDeliveryUpload.dn_number || '-'}</div>
                                  </div>
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400">File</div>
                                    <div className="mt-1 font-semibold break-words">{selectedDeliveryUpload.file_name || '-'}</div>
                                  </div>
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Status</div>
                                    <div className="mt-1 font-semibold">{String(selectedDeliveryUpload.status || '-').toUpperCase()}</div>
                                  </div>
                                </div>
                                {(() => {
                                  const fulfilledQty = getDeliveryUploadFulfilledQty(selectedDeliveryUpload);
                                  const shipment = getDeliveryUploadShipment(selectedDeliveryUpload);
                                  const isCreating = Number(customerShipmentCreatingId) === Number(selectedDeliveryUpload.id);
                                  return (
                                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <div className="font-semibold text-slate-800">
                                          {shipment?.id ? `Order Muat sudah dibuat: ${getCustomerOutboundNumber(shipment)}` : fulfilledQty > 0 ? `Qty tersedia ${formatQty(fulfilledQty)} siap dibuat Order Muat.` : 'Belum ada stok tersedia untuk Order Muat.'}
                                        </div>
                                        <div className="text-slate-500">Gunakan tombol ini untuk membuat atau print ulang Order Muat ke warehouse.</div>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={isCreating || !(fulfilledQty > 0)}
                                        onClick={() => handleCreateCustomerShipment(selectedDeliveryUpload)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Printer size={13} />
                                        {isCreating ? 'Membuat...' : shipment?.id ? 'Print Order Muat' : 'Buat Order Muat'}
                                      </button>
                                    </div>
                                  );
                                })()}
                                <div className="overflow-x-auto">
                                  <table className="min-w-[1120px] w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-600">
                                      <tr>
                                        <th className="p-2 text-left">No</th>
                                        <th className="p-2 text-left">UNIQ</th>
                                        <th className="p-2 text-left">Part No</th>
                                        <th className="p-2 text-left">Item Master</th>
                                        <th className="p-2 text-right">Qty Order</th>
                                        <th className="p-2 text-right">Stock</th>
                                        <th className="p-2 text-right">Tersedia Muat</th>
                                        <th className="p-2 text-right">Shortage</th>
                                        <th className="p-2 text-left">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedDeliveryUploadItems.map((item) => {
                                        const statusKey = String(item.status || '').toLowerCase();
                                        const details = item.details && typeof item.details === 'object' ? item.details : {};
                                        const parsed = details.parsed && typeof details.parsed === 'object' ? details.parsed : {};
                                        const tone = statusKey === 'full'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : statusKey === 'partial_backorder'
                                            ? 'bg-amber-100 text-amber-700'
                                            : statusKey === 'missing_item'
                                              ? 'bg-rose-100 text-rose-700'
                                              : 'bg-slate-100 text-slate-700';
                                        return (
                                          <tr key={item.id} className="border-t">
                                            <td className="p-2">{item.lineNo || '-'}</td>
                                            <td className="p-2 font-semibold">{parsed.uniq || details.uniq || item.itemCode || '-'}</td>
                                            <td className="p-2">{item.partNo || parsed.partNo || '-'}</td>
                                            <td className="p-2">
                                              <div className="font-semibold">{item.itemCode || '-'}</div>
                                              <div className="text-slate-500">{item.itemName || '-'}</div>
                                            </td>
                                            <td className="p-2 text-right">{formatQty(item.qtyOrder || 0)}</td>
                                            <td className="p-2 text-right">{formatQty(item.qtyAvailable || 0)}</td>
                                            <td className="p-2 text-right text-emerald-700 font-semibold">{formatQty(item.qtyFulfilled || 0)}</td>
                                            <td className="p-2 text-right text-rose-700 font-semibold">{formatQty(item.qtyShortage || 0)}</td>
                                            <td className="p-2">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone}`}>
                                                {statusKey ? statusKey.replace(/_/g, ' ').toUpperCase() : '-'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {selectedDeliveryUploadItems.length === 0 && (
                                        <tr>
                                          <td colSpan="9" className="p-3 text-center text-slate-400">Belum ada detail item.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-400 py-8 text-center">Belum ada data delivery yang dipilih.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  ) : (
                    <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
                      Delivery hanya tersedia untuk role dengan akses penjadwalan.
                    </div>
                  )
                )}

                {!isProductionUser && kanbanSubTab === 'receiving' && (
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
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Ada Mill Sheet?</label>
                            <select
                              className="border p-2 rounded w-full text-sm bg-white"
                              value={receiveMillsheetQuestion}
                              onChange={(e) => setReceiveMillsheetQuestion(e.target.value)}
                            >
                              <option value="yes">Ada / dibawa supplier</option>
                              <option value="follow_up">Belum ada, susulan</option>
                              <option value="no">Tidak ada</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Catatan Mill Sheet</label>
                            <input
                              className="border p-2 rounded w-full text-sm bg-white"
                              placeholder="Contoh: supplier kirim susulan hari ini / file ada di portal"
                              value={receiveMillsheetNotes}
                              onChange={(e) => setReceiveMillsheetNotes(e.target.value)}
                            />
                            <div className="mt-1 text-[10px] text-slate-500">
                              Status ini untuk follow-up dokumen QC. RN dan stok tetap diproses sesuai qty aktual.
                            </div>
                          </div>
                        </div>
                      </div>
                      {receiveDnError && (
                        <div className="mt-2 text-xs text-red-600">{receiveDnError}</div>
                      )}

                      <div className="mt-3">
                    <div className="text-[10px] uppercase text-slate-400 mb-2">Daftar DN Open / Sent / Incoming / Partial</div>
                        <div className="border rounded max-h-44 overflow-y-auto text-xs">
                          {receiveDnLoading && (
                            <div className="p-3 text-center text-slate-400">Memuat DN...</div>
                          )}
                          {!receiveDnLoading && receiveDnOptions.length === 0 && (
                            <div className="p-3 text-center text-slate-400">Tidak ada DN open/sent/incoming/partial.</div>
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
                                Qty: {formatQty(dn.total_qty || 0)}
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
                              <label className="block text-[10px] uppercase text-slate-400 mb-1">Scan QR Label Incoming</label>
                              <input
                                className="border p-2 rounded w-full text-sm"
                                placeholder="Scan label supplier; DN/item/qty akan terbaca"
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
                                      <td className="p-2 border text-right">{formatQty(docQty)}</td>
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

                          {receiveVarianceSummary.totalReceived > 0 && receiveVarianceSummary.hasVariance && (
                            <div className={`rounded border px-3 py-2 text-xs ${
                              receiveVarianceSummary.hasOver
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}>
                              <div className="font-semibold">
                                {receiveVarianceSummary.hasOver ? 'Over delivery detected.' : 'Short receiving detected.'}
                              </div>
                              <div className="mt-1">
                                {receiveVarianceSummary.hasShort && (
                                  <span>{receiveVarianceSummary.shortRows.length} item SHORT, kurang {formatQty(receiveVarianceSummary.shortQty)}. </span>
                                )}
                                {receiveVarianceSummary.hasOver && (
                                  <span>{receiveVarianceSummary.overRows.length} item OVER, lebih {formatQty(receiveVarianceSummary.overQty)}. </span>
                                )}
                                Confirm Receiving akan mencatat qty aktual yang diterima; selisih tetap menjadi exception untuk ditindaklanjuti.
                              </div>
                            </div>
                          )}

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
                              disabled={receiveSubmitting || isStockOpnameLocked}
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
                            const isHeaderRn = rn.rn_type === 'header' && rn.rn_header_id;
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
                                <td className="p-2 text-right">{formatQty(expected)}</td>
                                <td className="p-2 text-right">{formatQty(actual)}</td>
                                <td className={`p-2 text-right ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {formatSignedQty(variance)}
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
                                        onClick={() => handleReverseReceiveNote(rn)}
                                        className="p-1.5 border rounded text-amber-700 hover:text-amber-800"
                                        title="Batalkan/Reversal RN"
                                        aria-label="Reverse RN"
                                      >
                                        <RotateCcw size={12} />
                                      </button>
                                    )}
                                    {canDeleteRecords && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReceiveNote(rn)}
                                        className="p-1.5 border rounded text-rose-600 hover:text-rose-700"
                                        title={isHeaderRn ? 'Batalkan/Reversal RN' : 'Hapus RN'}
                                        aria-label={isHeaderRn ? 'Reverse RN' : 'Delete RN'}
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

                    {!isProductionUser && (
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
                    )}

                    <div className={isProductionUser ? 'grid grid-cols-1 gap-4 max-w-3xl' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
                      <div className="bg-white rounded-2xl border p-5 shadow-sm">
                        <div className="text-sm font-semibold mb-1">Pemindaian Kanban Tunggal</div>
                        <div className="text-xs text-slate-500 mb-4">Input otomatis fokus. Scan QR kanban dari scanner line, lalu sistem langsung mencatat saat scanner mengirim Enter.</div>
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
                            <label className="block text-[10px] uppercase text-slate-400 mb-1">Kanban ID</label>
                            <input
                              ref={emptyKanbanInputRef}
                              className={`border rounded w-full ${isProductionUser ? 'p-4 text-lg font-semibold' : 'p-2 text-xs'}`}
                              placeholder="Pindai atau masukkan Kanban ID dari master"
                              value={emptyKanbanForm.kanbanId}
                              onChange={(e) => setEmptyKanbanForm({ ...emptyKanbanForm, kanbanId: e.target.value })}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' || event.shiftKey) return;
                                event.preventDefault();
                                const value = event.currentTarget.value.trim();
                                if (!value) return;
                                void Promise.resolve(handleEmptyKanbanScanValue?.(value))
                                  .finally(() => {
                                    window.requestAnimationFrame(() => emptyKanbanInputRef.current?.focus());
                                  });
                              }}
                            />
                            <div className="text-[10px] text-slate-400 mt-1">Standar scanner: suffix Enter/CR aktif.</div>
                          </div>
                          <button
                            type="submit"
                            className={`w-full bg-slate-900 text-white rounded flex items-center justify-center gap-2 disabled:opacity-60 ${isProductionUser ? 'py-4 text-sm font-semibold' : 'py-2 text-xs'}`}
                            disabled={isStockOpnameLocked}
                          >
                            <QrCode size={14} /> Catat Kanban Kosong
                          </button>
                        </form>
                      </div>

                      {!isProductionUser && (
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
                      )}
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                      <div className="text-sm font-semibold mb-1">Log Kanban Kosong Aktual</div>
                      <div className="text-xs text-slate-500 mb-3">{isProductionUser ? 'Riwayat transaksi stok dari scan/kanban kosong.' : 'Riwayat transaksi stok, request, dan lot FIFO dari kanban kosong.'}</div>
                      <div className="overflow-x-auto">
                        <div className={`${isProductionUser ? 'min-w-[1140px]' : 'min-w-[1600px]'} text-xs`}>
                          <div className="bg-slate-100 grid items-center" style={{ gridTemplateColumns: isProductionUser ? '160px 180px minmax(220px, 1fr) 150px 90px minmax(220px, 1fr) 120px' : emptyLogGrid }}>
                            <div className="text-left p-2">Waktu</div>
                            <div className="text-left p-2">ID Kanban</div>
                            <div className="text-left p-2">Item</div>
                            <div className="text-left p-2">Lokasi</div>
                            <div className="text-right p-2">Qty</div>
                            <div className="text-left p-2">Lot RN/FIFO</div>
                            {!isProductionUser && <><div className="text-left p-2">Area/Lini</div><div className="text-left p-2">Kategori</div></>}
                            <div className="text-left p-2">Status</div>
                            {!isProductionUser && <div className="text-left p-2">Referensi DN</div>}
                            {!isProductionUser && <div className="text-left p-2">Aksi</div>}
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
                                  const rowKanbanId = normalizeKanbanIdDisplay(row.kanban_id || extractKanbanIdNote(row.notes)) || '-';
                                  const locationLabel = row.location_label || row.location_id || '-';
                                  const consumedQty = Number(row.consumed_qty ?? row.request_qty ?? 0);
                                  const lotSummary = row.lot_summary || (row.lot_count ? `${row.lot_count} lot` : '-');
                                  const statusKey = String(row.status || '').trim().toLowerCase();
                                  const allowApprove = dnStatusFlowList.length === 0 || dnStatusFlowList.includes('APPROVE') || dnStatusFlowList.includes('APPROVED');
                                  const canApproveRequest = ['triggered', 'requested'].includes(statusKey);
                                  return (
                                    <div
                                      key={row.id}
                                      className="grid items-center border-t"
                                      style={{ gridTemplateColumns: isProductionUser ? '160px 180px minmax(220px, 1fr) 150px 90px minmax(220px, 1fr) 120px' : emptyLogGrid, position: 'absolute', top: rowIndex * emptyRowHeight, height: emptyRowHeight, width: '100%' }}
                                    >
                                      <div className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</div>
                                      <div className="p-2 font-semibold">{rowKanbanId}</div>
                                      <div className="p-2">{row.item_code} - {row.item_name || '-'}</div>
                                      <div className="p-2 truncate" title={locationLabel}>{locationLabel}</div>
                                      <div className="p-2 text-right">{formatNumber0(consumedQty)}</div>
                                      <div className="p-2 truncate" title={lotSummary}>{lotSummary}</div>
                                      {!isProductionUser && <div className="p-2">{extractAreaNote(row.notes)}</div>}
                                      {!isProductionUser && <div className="p-2">{getCategoryLabel(setting?.item_type)}</div>}
                                      <div className="p-2">{row.status}</div>
                                      {!isProductionUser && <div className="p-2">{row.dn_id ? `DN-${row.dn_id}` : '-'}</div>}
                                      {!isProductionUser && (
                                        <div className="p-2 flex flex-wrap items-center gap-1">
                                          {canApproveRequest && allowApprove && (
                                            <button
                                              onClick={async () => {
                                                const outcome = await handleApproveAndCreateDn(row);
                                                if (outcome && typeof outcome === 'object') {
                                                  openRequestBatchResult('approve-dn', outcome);
                                                }
                                              }}
                                              className="px-2 py-1 text-[10px] bg-emerald-600 text-white rounded"
                                              title="Approve + DN"
                                            >
                                              Approve
                                            </button>
                                          )}
                                          {canApproveRequest && (
                                            <button
                                              onClick={() => handleRejectKanban(row)}
                                              className="px-2 py-1 text-[10px] border border-amber-200 text-amber-700 rounded"
                                              title="Reject request"
                                            >
                                              Reject
                                            </button>
                                          )}
                                          {statusKey === 'approved' && !row.dn_id && (
                                            <button onClick={() => openDnModal(row)} className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded">Buat DN</button>
                                          )}
                                          {statusKey === 'approved' && row.dn_id && (
                                            <span className="text-[10px] text-indigo-600 font-semibold">DN-{row.dn_id}</span>
                                          )}
                                        </div>
                                      )}
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

                {canProduction && kanbanSubTab === 'production' && (
                  <div className="space-y-4">
                    <div className="bg-white/90 rounded-xl border px-4">
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        {[
                          { key: 'queue', label: 'Production Queue' },
                          { key: 'fg', label: 'Input Produksi' },
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
                    {productionTab === 'queue' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('all');
                              setProductionQueueHealthFilter('all');
                              setProductionQueueCategoryFilter('all');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(
                              productionQueueStatusFilter === 'all' && productionQueueHealthFilter === 'all' && productionQueueCategoryFilter === 'all',
                              'border-slate-200 bg-white',
                            )}
                          >
                            <div className="text-[10px] font-semibold uppercase text-slate-500">Production Requests</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{productionQueueAllRows.length}</div>
                            <div className="mt-1 text-xs text-slate-500">Open kanban requests routed to production.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('all');
                              setProductionQueueHealthFilter('all');
                              setProductionQueueCategoryFilter('assy');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(productionQueueCategoryFilter === 'assy', 'border-violet-200 bg-violet-50')}
                          >
                            <div className="text-[10px] font-semibold uppercase text-violet-700">Assy/Subassy</div>
                            <div className="mt-2 text-2xl font-bold text-violet-700">{productionQueueAssyCount}</div>
                            <div className="mt-1 text-xs text-violet-700">WO assembly dipisah dari Child Part.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('all');
                              setProductionQueueHealthFilter('all');
                              setProductionQueueCategoryFilter('child');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(productionQueueCategoryFilter === 'child', 'border-cyan-200 bg-cyan-50')}
                          >
                            <div className="text-[10px] font-semibold uppercase text-cyan-700">Child Part</div>
                            <div className="mt-2 text-2xl font-bold text-cyan-700">{productionQueueChildCount}</div>
                            <div className="mt-1 text-xs text-cyan-700">Pilih filter ini untuk WO Child Part.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('need_wo');
                              setProductionQueueHealthFilter('ready');
                              setProductionQueueCategoryFilter('all');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(
                              productionQueueStatusFilter === 'need_wo' && productionQueueHealthFilter === 'ready',
                              'border-emerald-200 bg-emerald-50',
                            )}
                          >
                            <div className="text-[10px] font-semibold uppercase text-emerald-700">Ready For WO</div>
                            <div className="mt-2 text-2xl font-bold text-emerald-700">{productionQueueReadyCount}</div>
                            <div className="mt-1 text-xs text-emerald-700">BOM/material clear untuk release WO.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('released');
                              setProductionQueueHealthFilter('all');
                              setProductionQueueCategoryFilter('all');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(productionQueueStatusFilter === 'released', 'border-sky-200 bg-sky-50')}
                          >
                            <div className="text-[10px] font-semibold uppercase text-sky-700">WO Released</div>
                            <div className="mt-2 text-2xl font-bold text-sky-700">{productionQueueReleasedCount}</div>
                            <div className="mt-1 text-xs text-sky-700">Menunggu konfirmasi aktual produksi.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductionQueueStatusFilter('need_wo');
                              setProductionQueueHealthFilter('review');
                              setProductionQueueCategoryFilter('all');
                              setProductionQueuePage(1);
                            }}
                            className={productionDashboardCardClass(
                              productionQueueStatusFilter === 'need_wo' && productionQueueHealthFilter === 'review',
                              'border-orange-200 bg-orange-50',
                            )}
                          >
                            <div className="text-[10px] font-semibold uppercase text-orange-700">Needs Review</div>
                            <div className="mt-2 text-2xl font-bold text-orange-700">{productionQueueStockGapCount}</div>
                            <div className="mt-1 text-xs text-orange-700">Stock gap must be checked before posting.</div>
                          </button>
                        </div>
                        <div className="rounded-xl border bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Production Queue</div>
                              <div className="text-xs text-slate-500">
                                Release WO setelah BOM/material siap. Aktual produksi diposting setelah proses produksi selesai.
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fetchKanbanRequests?.()}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <ArrowDownUp size={14} /> Refresh
                              </button>
                              <button
                                type="button"
                                disabled={!canProduction || productionQueueActionableRows.length === 0}
                                onClick={() => {
                                  if (!canProduction || productionQueueActionableRows.length === 0) return;
                                  void openProductionBatchRows(productionQueueActionableRows);
                                }}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                                  !canProduction || productionQueueActionableRows.length === 0
                                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                                title={!canProduction
                                  ? getLockedActionTitle(canProduction, 'Batch production')
                                  : productionQueueActionableRows.length === 0
                                    ? 'Tidak ada request ready atau WO Released pada filter ini.'
                                    : 'Check BOM readiness, release WO, atau konfirmasi aktual sesuai status'}
                              >
                                <CheckCircle size={14} /> Batch Production
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 overflow-x-auto">
                            <table className="min-w-[1060px] w-full text-xs">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <th className="p-2 text-left">Request ID</th>
                                  <th className="p-2 text-left">Date/Time</th>
                                  <th className="p-2 text-left">Kanban ID</th>
                                  <th className="p-2 text-left">Category</th>
                                  <th className="p-2 text-left">Item</th>
                                  <th className="p-2 text-right">On Hand</th>
                                  <th className="p-2 text-right">Order Qty</th>
                                  <th className="p-2 text-left">Aging</th>
                                  <th className="p-2 text-left">Exception</th>
                                  <th className="p-2 text-left">Status</th>
                                  <th className="p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productionQueuePagedRows.map((row) => {
                                  const health = getKanbanRequestHealth(row);
                                  const statusKey = String(row.status || '').trim().toLowerCase();
                                  const isWoReleased = statusKey === 'production_ready';
                                  const canReleaseWo = !isWoReleased && !health.hasStockGap;
                                  const statusLabel = health.hasStockGap && ['triggered', 'requested'].includes(statusKey)
                                    ? 'Pending - Stock Gap'
                                    : statusKey === 'approved'
                                      ? 'Approved'
                                      : statusKey === 'production_ready'
                                        ? 'WO Released'
                                      : statusKey === 'rejected'
                                        ? 'Rejected'
                                        : statusKey === 'triggered' || statusKey === 'requested'
                                          ? 'Pending'
                                          : row.status || '-';
                                  const rowKanbanId = extractKanbanIdNote(row.notes) || buildKanbanDisplayId(row.item_code, row.item_type, row);
                                  const categoryMeta = getProductionRequestCategoryMeta(row);
                                  return (
                                    <tr key={row.id} className="border-t align-top">
                                      <td className="p-2 font-semibold text-slate-900">{getRequestIdLabel(row)}</td>
                                      <td className="p-2 text-slate-600">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</td>
                                      <td className="p-2 text-slate-700">{rowKanbanId}</td>
                                      <td className="p-2">
                                        <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                                          {categoryMeta.label}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        <div className="font-semibold text-slate-900">{row.item_code || '-'}</div>
                                        <div className="text-[10px] text-slate-500">{row.item_name || '-'}</div>
                                      </td>
                                      <td className="p-2 text-right">{formatQty(health.onHand || 0)}</td>
                                      <td className="p-2 text-right font-semibold">{formatQty(row.request_qty || 0)}</td>
                                      <td className="p-2">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                          health.isOverdue
                                            ? 'border-amber-200 bg-amber-100 text-amber-700'
                                            : 'border-slate-200 bg-slate-100 text-slate-700'
                                        }`}>
                                          {formatRequestAging(health.ageHours)}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        {health.hasStockGap ? (
                                          <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                            Stock Gap
                                          </span>
                                        ) : row.exception_code ? (
                                          <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                            {row.exception_code}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">-</span>
                                        )}
                                        {row.exception_note && (
                                          <div className="mt-1 text-[10px] text-rose-600">{row.exception_note}</div>
                                        )}
                                      </td>
                                      <td className="p-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          health.hasStockGap
                                            ? 'bg-orange-100 text-orange-700'
                                            : statusLabel === 'WO Released'
                                              ? 'bg-sky-100 text-sky-700'
                                            : statusLabel === 'Approved'
                                              ? 'bg-slate-900 text-white'
                                              : statusLabel === 'Rejected'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {statusLabel}
                                        </span>
                                      </td>
                                      <td className="p-2">
                                        <div className="flex flex-wrap gap-1">
                                          {health.hasStockGap && !isWoReleased && (
                                            <button
                                              type="button"
                                              disabled={!canEditSchedules}
                                              onClick={() => {
                                                if (!canEditSchedules) return;
                                                openKanbanShortageInPrl(row);
                                              }}
                                              className={getLockedButtonClassName('rounded border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100', !canEditSchedules)}
                                              title={getLockedActionTitle(canEditSchedules, 'Review shortage di PRL sebelum WO')}
                                            >
                                              Review PRL
                                            </button>
                                          )}
                                          {canReleaseWo && (
                                            <button
                                              type="button"
                                              disabled={!canProduction}
                                              onClick={() => {
                                                if (!canProduction) return;
                                                void openProductionBatchRows([row]);
                                              }}
                                              className={getLockedButtonClassName('rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100', !canProduction)}
                                              title={getLockedActionTitle(canProduction, 'Check BOM dan release WO')}
                                            >
                                              Buat WO
                                            </button>
                                          )}
                                          {isWoReleased && (
                                            <button
                                              type="button"
                                              disabled={!canProduction}
                                              onClick={() => {
                                                if (!canProduction) return;
                                                openProductionRequest(row);
                                              }}
                                              className={getLockedButtonClassName('rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100', !canProduction)}
                                              title={getLockedActionTitle(canProduction, 'Konfirmasi aktual produksi')}
                                            >
                                              Konfirmasi Aktual
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => openKanbanInScan(rowKanbanId)}
                                            className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                                            title="Ambil Kanban ID ini untuk scan"
                                          >
                                            Scan
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {productionQueueRows.length === 0 && (
                                  <tr>
                                    <td colSpan={11} className="p-6 text-center text-slate-400">
                                      No production requests.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-3 flex flex-col gap-3 text-[11px] text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>Tampilkan</span>
                              <select
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
                                value={productionQueuePageSize}
                                onChange={(event) => {
                                  setProductionQueuePageSize(Number(event.target.value) || 25);
                                  setProductionQueuePage(1);
                                }}
                              >
                                {productionQueuePageSizeOptions.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                              <span>baris per halaman</span>
                              <span className="text-slate-400">
                                {productionQueueTotalRows === 0
                                  ? 'Menampilkan 0-0 dari 0 entri'
                                  : `Menampilkan ${productionQueueStartIndex + 1}-${productionQueueEndIndex} dari ${productionQueueTotalRows} entri`}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setProductionQueuePage((prev) => Math.max(1, prev - 1))}
                                disabled={productionQueueCurrentPage <= 1}
                                className="rounded border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                              >
                                Previous
                              </button>
                              {Array.from({ length: productionQueueTotalPages }, (_, idx) => idx + 1)
                                .filter((pageNo) => (
                                  pageNo === 1
                                  || pageNo === productionQueueTotalPages
                                  || Math.abs(pageNo - productionQueueCurrentPage) <= 1
                                ))
                                .reduce((acc, pageNo, idx, arr) => {
                                  if (idx > 0 && pageNo - arr[idx - 1] > 1) acc.push(`gap-${pageNo}`);
                                  acc.push(pageNo);
                                  return acc;
                                }, [])
                                .map((entry) => (
                                  typeof entry === 'string' ? (
                                    <span key={entry} className="px-1 text-slate-300">...</span>
                                  ) : (
                                    <button
                                      key={entry}
                                      type="button"
                                      onClick={() => setProductionQueuePage(entry)}
                                      className={`min-w-7 rounded border px-2 py-1 ${
                                        entry === productionQueueCurrentPage
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {entry}
                                    </button>
                                  )
                                ))}
                              <button
                                type="button"
                                onClick={() => setProductionQueuePage((prev) => Math.min(productionQueueTotalPages, prev + 1))}
                                disabled={productionQueueCurrentPage >= productionQueueTotalPages}
                                className="rounded border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {productionTab === 'fg' && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">Input Manual Laporan Produksi</div>
                          <div className="text-xs text-slate-500">Hasil produksi akan masuk stok FG/Subassy/Child Part dan konsumsi material mengikuti BOM.</div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {selectedProductionManualItem && showProductionManualForm && (
                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <span className="font-semibold">{selectedProductionManualItem.code}</span>
                              {selectedProductionManualItem.name ? ` - ${selectedProductionManualItem.name}` : ''}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setShowProductionManualForm((prev) => !prev);
                              setProductionManualError('');
                              setProductionManualSuccess('');
                            }}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                              showProductionManualForm
                                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                : 'border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {showProductionManualForm ? <X size={14} /> : <Plus size={14} />}
                            {showProductionManualForm ? 'Tutup Form' : 'Input Produksi'}
                          </button>
                        </div>
                      </div>
                      {showProductionManualForm && (
                      <form onSubmit={handleSubmitManualProductionReport} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 text-xs">
                        <div className="lg:col-span-2">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Tanggal Produksi</label>
                          <input
                            type="date"
                            className="border p-2 rounded w-full text-xs"
                            value={productionManualForm.productionDate}
                            onChange={(e) => setProductionManualForm((prev) => ({ ...prev, productionDate: e.target.value }))}
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Item Produksi</label>
                          <SearchableSelectDropdown
                            value={productionManualForm.productCode}
                            options={productionOutputItemOptions}
                            placeholder="Ketik kode / part no / nama"
                            searchPlaceholder="Cari item produksi..."
                            emptyText="Item produksi tidak ditemukan."
                            getOptionValue={(item) => item.code}
                            getOptionLabel={(item) => item.label || item.code}
                            controlClassName="rounded border-slate-200 px-2 py-1.5 text-xs shadow-none"
                            onChange={(value, option) => setProductionManualForm((prev) => ({
                              ...prev,
                              productCode: value,
                              lineCode: prev.lineCode || option?.line_production || option?.lineProduction || '',
                            }))}
                          />
                        </div>
                        <div className="lg:col-span-1">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Qty Produksi</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="border p-2 rounded w-full text-xs text-right"
                            placeholder="0"
                            value={productionManualForm.qty}
                            onChange={(e) => setProductionManualForm((prev) => ({ ...prev, qty: e.target.value }))}
                          />
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Line</label>
                          <SearchableSelectDropdown
                            value={productionManualForm.lineCode}
                            options={productionLineOptions}
                            placeholder="Pilih line produksi"
                            searchPlaceholder="Cari line dari Master Ref..."
                            emptyText="Line produksi tidak ditemukan di Master Ref."
                            getOptionValue={(item) => item.value || item.id}
                            getOptionLabel={(item) => item.label || item.id}
                            controlClassName="rounded border-slate-200 px-2 py-1.5 text-xs shadow-none"
                            onChange={(value) => setProductionManualForm((prev) => ({ ...prev, lineCode: value }))}
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Shift</label>
                          <select
                            className="border p-2 rounded w-full text-xs bg-white"
                            value={productionManualForm.shiftLabel}
                            onChange={(e) => setProductionManualForm((prev) => ({ ...prev, shiftLabel: e.target.value }))}
                          >
                            {productionShiftOptions.map((shift) => (
                              <option key={shift} value={shift}>{shift}</option>
                            ))}
                          </select>
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">No WO / Dokumen</label>
                          <input
                            type="text"
                            className="border p-2 rounded w-full text-xs"
                            placeholder="WO / dokumen produksi"
                            value={productionManualForm.documentNo}
                            onChange={(e) => setProductionManualForm((prev) => ({ ...prev, documentNo: e.target.value }))}
                          />
                        </div>
                        <div className="lg:col-span-6">
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">Catatan</label>
                          <input
                            type="text"
                            className="border p-2 rounded w-full text-xs"
                            placeholder="Opsional"
                            value={productionManualForm.notes}
                            onChange={(e) => setProductionManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>
                        <div className="lg:col-span-3 flex items-end">
                          <button
                            type="submit"
                            className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            disabled={productionManualSaving}
                          >
                            {productionManualSaving ? 'Menyimpan...' : 'Simpan Produksi'}
                          </button>
                        </div>
                      </form>
                      )}
                      {productionManualError && (
                        <div className="mt-2 text-xs text-red-600">{productionManualError}</div>
                      )}
                      {productionManualSuccess && (
                        <div className="mt-2 text-xs text-emerald-700">{productionManualSuccess}</div>
                      )}
                    </div>
                    )}
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
                                <td className="p-2 text-right">{formatQty(row.total_qty || 0)}</td>
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
                        <div>
                          <div className="text-sm font-semibold">Riwayat Output Produksi</div>
                          <div className="text-xs text-slate-500">Gabungan input manual dan upload produksi.</div>
                        </div>
                        <button
                          type="button"
                          onClick={fetchProductionOrderHistory}
                          className="px-3 py-2 text-xs border rounded"
                          disabled={productionOrderHistoryLoading}
                        >
                          {productionOrderHistoryLoading ? 'Memuat...' : 'Refresh'}
                        </button>
                      </div>
                      {productionOrderHistoryError && (
                        <div className="mt-2 text-xs text-red-600">{productionOrderHistoryError}</div>
                      )}
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-[1100px] w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">Tanggal</th>
                              <th className="p-2 text-left">Item</th>
                              <th className="p-2 text-left">Nama Item</th>
                              <th className="p-2 text-right">Qty</th>
                              <th className="p-2 text-left">Line</th>
                              <th className="p-2 text-left">Shift</th>
                              <th className="p-2 text-left">No WO / Dokumen</th>
                              <th className="p-2 text-left">Source</th>
                              <th className="p-2 text-left">User</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productionOrderRows.length === 0 && !productionOrderHistoryLoading && (
                              <tr>
                                <td colSpan={9} className="p-3 text-center text-slate-400">Belum ada output produksi.</td>
                              </tr>
                            )}
                            {pagedProductionOrderRows.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="p-2">{formatProductionDateValue(row.production_date || row.created_at)}</td>
                                <td className="p-2 font-semibold">{buildProductionUniqLabel(row.product_code, row.part_no)}</td>
                                <td className="p-2">{row.product_name || '-'}</td>
                                <td className="p-2 text-right">{formatNumber0(row.qty || 0)}</td>
                                <td className="p-2">{getProductionLineDisplayLabel(row.line_code)}</td>
                                <td className="p-2">{row.shift_label || '-'}</td>
                                <td className="p-2">{row.document_no || '-'}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    row.source === 'MANUAL_REPORT' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {row.source === 'MANUAL_REPORT' ? 'MANUAL' : row.source || '-'}
                                  </span>
                                </td>
                                <td className="p-2">{row.created_by_name || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <div>
                          Showing {productionOrderTotalRows === 0 ? 0 : productionOrderStartIndex + 1} to {productionOrderEndIndex} of {productionOrderTotalRows} entries
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Rows per page</span>
                          <select
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                            value={productionOrderPageSize}
                            onChange={(event) => {
                              setProductionOrderPageSize(Number(event.target.value));
                              setProductionOrderPage(1);
                            }}
                          >
                            {productionOrderPageSizeOptions.map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <span>Halaman {productionOrderCurrentPage} dari {productionOrderTotalPages}</span>
                          <button
                            type="button"
                            disabled={productionOrderCurrentPage <= 1}
                            onClick={() => setProductionOrderPage((prev) => Math.max(1, prev - 1))}
                            className="rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={productionOrderCurrentPage >= productionOrderTotalPages}
                            onClick={() => setProductionOrderPage((prev) => Math.min(productionOrderTotalPages, prev + 1))}
                            className="rounded border border-slate-200 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
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
                  <div className={isProductionUser ? 'space-y-4 max-w-5xl mx-auto' : 'space-y-4'}>
                    {!isProductionUser && (
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
                    )}

                    <div>
                      <div className="text-2xl font-bold text-slate-900">Pemindai QR/Barcode</div>
                      <div className="text-xs text-slate-500">Pindai kartu kanban untuk operasi material cepat.</div>
                    </div>

                    <div className={isProductionUser ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
                      <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                          <QrCode size={16} /> Pemindai
                        </div>
                        <div className="text-xs text-slate-500 mb-3">Gunakan scanner line. Input akan otomatis proses saat scanner mengirim Enter.</div>
                        <div className="flex gap-2 text-xs mb-3">
                          {[
                            { key: 'manual', label: 'Scanner' },
                            { key: 'camera', label: 'Kamera' },
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
                              Kamera standby otomatis saat mode kamera dibuka. Browser harus mengizinkan akses kamera.
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setScanCameraEnabled(true);
                                  void startScanner?.();
                                }}
                                className="flex-1 bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                              >
                                <QrCode size={14} /> Aktifkan Ulang
                              </button>
                              <button
                                onClick={() => {
                                  setScanCameraEnabled(false);
                                  void stopScanner?.();
                                }}
                                className="flex-1 border py-2 rounded text-xs"
                              >
                                Hentikan
                              </button>
                            </div>
                            {scanCameraStatus && (
                              <div className="text-[11px] text-slate-500">
                                {scanCameraStatus}
                              </div>
                            )}
                          </div>
                        )}

                        {scanMode !== 'camera' && (
                          <>
                            <label className="block text-[10px] uppercase text-slate-400 mb-2">Scanner QR</label>
                            <textarea
                              ref={scanManualInputRef}
                              className={`border rounded w-full ${isProductionUser ? 'h-40 p-4 text-lg font-semibold' : 'h-36 p-2 text-xs'}`}
                              placeholder="Pindai atau masukkan Kanban ID"
                              value={scanInput}
                              onChange={(e) => setScanInput(e.target.value)}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' || event.shiftKey) return;
                                event.preventDefault();
                                void Promise.resolve(handleProcessScan({ autoExecute: true, clearInput: true, inputValue: event.currentTarget.value }))
                                  .finally(() => {
                                    window.requestAnimationFrame(() => scanManualInputRef.current?.focus());
                                  });
                              }}
                            />
                            <div className="text-[10px] text-slate-400 mt-2">Standar scanner: suffix Enter/CR aktif. Untuk input batch manual, gunakan Shift+Enter lalu tombol proses.</div>
                            <div className="mt-3">
                              <button onClick={handleProcessScan} className={`w-full bg-slate-900 text-white rounded flex items-center justify-center gap-2 ${isProductionUser ? 'py-4 text-sm font-semibold' : 'py-2 text-xs'}`}>
                                <Search size={14} /> Proses Data QR
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                          <Clock size={16} /> History Scan
                        </div>
                        <div className="text-xs text-slate-500 mb-3">Hanya menampilkan hasil proses scan: berhasil atau error.</div>
                        {scanError && (
                          <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3 whitespace-pre-wrap">{scanError}</div>
                        )}
                        {(!Array.isArray(scanHistory) || scanHistory.length === 0) && !scanActiveResult && (
                          <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed rounded-lg">
                            <QrCode size={28} />
                            <div className="mt-2">Belum ada history scan.</div>
                          </div>
                        )}
                        {Array.isArray(scanHistory) && scanHistory.length > 0 && !scanActiveResult && (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {scanHistory.map((entry) => {
                              const success = entry.status === 'success';
                              return (
                                <div
                                  key={entry.id}
                                  className={`rounded-xl border p-3 text-xs ${success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-bold text-sm">{entry.kanbanId || '-'}</div>
                                      <div className="mt-0.5">{entry.itemCode || '-'} {entry.itemName || ''}</div>
                                      <div className="mt-1 text-[11px] opacity-80">{entry.actionLabel || '-'}</div>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                      {success ? 'BERHASIL' : 'ERROR'}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-[11px]">{entry.message || (success ? 'Scan berhasil diproses.' : 'Scan gagal diproses.')}</div>
                                  <div className="mt-1 text-[10px] opacity-70">{formatScanTime(entry.scannedAt)}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {scanActiveResult && (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Array.isArray(scanActiveResult.scanWarnings) && scanActiveResult.scanWarnings.length > 0 && (
                              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                                {scanActiveResult.scanWarnings.join(' ')}
                              </div>
                            )}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                                  <CheckCircle size={14} /> Pemindaian Berhasil
                                </div>
                                <div className="text-[10px] uppercase tracking-wide text-slate-400">Routing Preview</div>
                              </div>
                              <div className="mt-3">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Item</div>
                                <div className="text-lg font-bold text-slate-800 leading-tight">
                                  {scanActiveResult.itemLabel || `${scanActiveResult.itemCode} - ${scanActiveResult.itemName}`}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                                  <span className="px-2 py-1 rounded-full bg-white border">Kanban ID: {scanActiveResult.kanbanId}</span>
                                  <span className="px-2 py-1 rounded-full bg-white border">Kode Item: {scanActiveResult.itemCode}</span>
                                  <span className="px-2 py-1 rounded-full bg-white border">Qty Kartu: {scanActiveResult.qty}</span>
                                </div>
                              </div>
                            </div>
                            <div className="border rounded-xl p-3 bg-indigo-50 border-indigo-200 text-xs">
                              <div className="text-[10px] uppercase tracking-wide text-indigo-500">Action Type</div>
                              <div className="mt-1 text-sm font-semibold text-indigo-800">{scanActionLabel}</div>
                              <div className="mt-1 text-indigo-700">{scanActionHint}</div>
                              <div className="mt-2 text-[10px] uppercase tracking-wide text-indigo-500">
                                Target: {scanActiveResult.nextDestination || '-'}
                              </div>
                              {scanActiveResult.processState?.stepsTotal > 0 && (
                                <div className="mt-1 text-indigo-500">
                                  Progress: {Number(scanActiveResult.processState.currentStepIndex || 0) + 1} / {scanActiveResult.processState.stepsTotal}
                                </div>
                              )}
                            </div>
                            {scanPrlPlan && (
                              <div className={`border rounded-xl p-3 text-xs ${scanPrlOver ? 'bg-rose-50 border-rose-200 text-rose-800' : scanPrlEligible ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[10px] uppercase tracking-wide">PRL Kanban Edar</div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${scanPrlOver ? 'bg-rose-600 text-white' : scanPrlEligible ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                                    {scanPrlOver ? 'OVER PRL' : scanPrlEligible ? 'REORDER OK' : 'CONSUMPTION ONLY'}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <div>
                                    <div className="text-[10px] opacity-70">Plan {scanPrlPlan.monthLabel || '-'}</div>
                                    <div className="font-semibold">{formatNumber0(scanPrlPlan.plannedQty || 0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] opacity-70">Terpakai</div>
                                    <div className="font-semibold">{formatNumber0(scanPrlPlan.usedQty || 0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] opacity-70">Sisa</div>
                                    <div className="font-semibold">{formatNumber0(scanPrlPlan.remainingQty || 0)}</div>
                                  </div>
                                </div>
                                {!scanPrlEligible && scanPrlPlan.notice && (
                                  <div className="mt-2 text-[11px]">{scanPrlPlan.notice}</div>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                              <div className="border rounded-xl p-3 bg-white">
                                <div className="text-[10px] uppercase tracking-wide text-slate-400">Posisi Sekarang</div>
                                <div className="mt-1 text-sm font-semibold text-slate-800">
                                  {scanActiveResult.currentPosition?.label || scanActiveResult.location || '-'}
                                </div>
                                <div className="mt-1 text-slate-500">
                                  {scanActiveResult.currentPosition?.sourceLabel || scanActiveResult.currentPosition?.source || 'Lokasi kanban / item'}
                                </div>
                              </div>
                              <div className="border rounded-xl p-3 bg-slate-50 border-slate-200">
                                <div className="text-[10px] uppercase tracking-wide text-slate-400">Proses Sekarang</div>
                                <div className="mt-1 text-sm font-semibold text-slate-800">
                                  {scanActiveResult.currentProcess?.label || scanActiveResult.currentProcess?.name || 'Routing belum tersedia'}
                                </div>
                                <div className="mt-1 text-slate-500">
                                  Status: {scanActiveResult.processState?.status || '-'} • Step {scanActiveResult.processState?.currentStepIndex !== undefined ? Number(scanActiveResult.processState.currentStepIndex) + 1 : 1}
                                </div>
                              </div>
                              <div className="border rounded-xl p-3 bg-red-50 border-red-200">
                                <div className="text-[10px] uppercase tracking-wide text-red-500">Proses Berikutnya</div>
                                <div className="mt-1 text-sm font-semibold text-red-700">
                                  {scanActiveResult.nextProcess?.label || scanActiveResult.nextProcess?.name || 'Routing selesai / belum tersedia'}
                                </div>
                                <div className="mt-1 text-red-600">
                                  WC: {scanActiveResult.nextProcess?.workCenter || '-'} • Seq {scanActiveResult.nextProcess?.sequence || '-'} • Std {Number(scanActiveResult.nextProcess?.standardTime || 0)} s
                                </div>
                              </div>
                            </div>
                            <div className="border rounded-lg p-3 text-xs space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-slate-500">
                                <div>Lokasi: {scanActiveResult.location || '-'}</div>
                                <div>Stok Tersedia: <span className={scanActiveResult.status === 'Critical' ? 'text-red-600' : 'text-emerald-600'}>{scanActiveResult.stock} PCS</span></div>
                                <div>Min/Maks: {scanActiveResult.min} / {scanActiveResult.max}</div>
                                <div>Status: <span className={`px-2 py-0.5 rounded-full text-[10px] ${scanActiveResult.status === 'Critical' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>{scanActiveResult.status}</span></div>
                              </div>
                              {Array.isArray(scanActiveResult.routingSteps) && scanActiveResult.routingSteps.length > 0 && (
                                <div className="pt-2 border-t">
                                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Routing Aktif</div>
                                  <div className="flex flex-wrap gap-2">
                                    {scanActiveResult.routingSteps.map((step) => (
                                      <span key={`${step.code || step.name}-${step.sequence}`} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                        {step.sequence}. {step.label || step.name || step.code || '-'}
                                        {step.workCenter ? ` • ${step.workCenter}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {(isScanIssueAction || isScanRoutingAction || isScanSubconAction) && (
                                <button
                                  onClick={executeScanFlow}
                                  className={`flex-1 bg-indigo-600 text-white rounded flex items-center justify-center gap-2 ${isProductionUser ? 'py-4 text-sm font-semibold' : 'py-2 text-xs'}`}
                                >
                                  <ArrowDownUp size={14} /> Eksekusi Scan
                                </button>
                              )}
                              {!isProductionUser && isScanIssueAction && (
                                <>
                                  <button
                                    onClick={async () => {
                                      setConsumeQty(String(scanActiveResult?.qty || ''));
                                      setShowConsumeModal(true);
                                    }}
                                    className="flex-1 border py-2 rounded text-xs"
                                  >
                                    {scanActionType === 'issue' ? 'Issue Material' : 'Keluarkan Material'}
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
                                </>
                              )}
                              {!isProductionUser && isScanSubconAction && (
                                <button
                                  onClick={() => {
                                    setMainTab('subcon');
                                    setScanError('');
                                  }}
                                  className="flex-1 bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                                >
                                  <Truck size={14} /> Buka Menu Subcon
                                </button>
                              )}
                              {!isProductionUser && isScanRoutingAction && (
                                <>
                                  <button
                                    onClick={async () => {
                                      const outcome = await handleKanbanProcessStart(scanActiveResult);
                                      setScanError(outcome.ok ? '' : outcome.reason || 'Gagal start proses.');
                                    }}
                                    className="flex-1 bg-emerald-600 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                                  >
                                    <Check size={14} /> Start Step
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const outcome = await handleKanbanProcessFinish(scanActiveResult);
                                      setScanError(outcome.ok ? '' : outcome.reason || 'Gagal finish proses.');
                                    }}
                                    className="flex-1 bg-slate-900 text-white py-2 rounded text-xs flex items-center justify-center gap-2"
                                  >
                                    <Settings size={14} /> Finish Step
                                  </button>
                                </>
                              )}
                              {!isScanIssueAction && !isScanSubconAction && !isScanRoutingAction && (
                                <button
                                  onClick={() => setScanError('Kategori item belum dikenali, cek master item.')}
                                  className="flex-1 border py-2 rounded text-xs"
                                >
                                  Cek Kategori Item
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {!isProductionUser && scanResults.length > 1 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-[10px] uppercase text-slate-400">Hasil Batch</div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {scanResults.map((result) => (
                                <div key={result.id} className="border rounded-lg p-2 text-xs">
                                  <div className="font-semibold text-slate-700">{result.kanbanId}</div>
                                  <div className="text-slate-500">Item: {result.itemName}</div>
                                  <div className="text-slate-400">
                                    Next: {result.nextProcess?.label || result.nextProcess?.name || '-'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {false && !isProductionUser && (
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
                                <div className="text-slate-400">
                                  {result.currentPosition?.label || result.location || '-'} → {result.nextProcess?.label || result.nextProcess?.name || 'Routing belum tersedia'}
                                </div>
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
                    )}
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
                          Rit/time must be selected for this vendor.
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
                      <select
                        className="border p-2 rounded text-sm w-full"
                        value={dnForm.supplier}
                        onChange={(e) => handleDnSupplierChange(e.target.value)}
                      >
                        <option value="">Select supplier from Master Vendor</option>
                        {dnForm.supplier && !deliveryNoteVendorOptions.some((vendor) => [vendor.id, vendor.name].includes(dnForm.supplier)) && (
                          <option value={dnForm.supplier}>{dnForm.supplier}</option>
                        )}
                        {deliveryNoteVendorOptions.map((vendor) => (
                          <option key={vendor.id || vendor.name} value={vendor.id || vendor.name}>
                            {vendor.id ? `${vendor.id} - ${vendor.name || vendor.id}` : vendor.name}
                            {vendor.role ? ` (${vendor.role})` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        className="border p-2 rounded text-sm w-full"
                        min={getTodayDnDateInput()}
                        value={dnForm.plannedDate}
                        onChange={(e) => {
                          const nextDate = e.target.value;
                          const today = getTodayDnDateInput();
                          setDnForm({
                            ...dnForm,
                            plannedDate: nextDate,
                            deliveryType: compareDnDateInput(nextDate, today) === 0 && normalizeDnDeliveryType(dnForm.deliveryType) === 'normal'
                              ? 'additional'
                              : dnForm.deliveryType,
                          });
                        }}
                      />
                      <select
                        className="border p-2 rounded text-sm w-full"
                        value={dnForm.deliveryType || 'normal'}
                        onChange={(e) => setDnForm({ ...dnForm, deliveryType: e.target.value })}
                      >
                        <option value="normal">Normal Delivery</option>
                        <option value="additional">Additional Delivery</option>
                        <option value="urgent">Urgent Delivery</option>
                      </select>
                      {compareDnDateInput(dnForm.plannedDate, getTodayDnDateInput()) === 0 && normalizeDnDeliveryType(dnForm.deliveryType) === 'normal' && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                          Same-day delivery must be marked as Additional or Urgent.
                        </div>
                      )}
                      <select
                        className="border p-2 rounded text-sm w-full"
                        value={dnForm.scheduleIndex ?? ''}
                        onChange={(e) => handleDnScheduleChange(e.target.value)}
                        disabled={dnScheduleRows.length === 0}
                      >
                        <option value="">{dnScheduleRows.length === 0 ? 'No supplier schedule' : 'Select Rit/Time'}</option>
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
                        <button type="button" onClick={() => setShowDnModal(false)} className="px-3 py-2 text-sm border rounded">Cancel</button>
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-60"
                          disabled={dnScheduleRows.length > 0 && !String(dnForm.scheduleIndex || '').trim()}
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {productionRequestModal.open && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-start justify-between border-b px-5 py-4">
                      <div>
                        <div className="text-sm font-semibold">Konfirmasi Aktual Produksi</div>
                        <div className="text-xs text-slate-500">
                          Cek kesiapan BOM sebelum hasil produksi aktual diposting ke stok dan kanban request ditutup.
                        </div>
                      </div>
                      <button type="button" onClick={closeProductionRequestModal} className="text-slate-500 hover:text-slate-800">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {(() => {
                        const row = productionRequestModal.row || {};
                        const shortageRows = productionRequestModal.rows.filter((item) => Number(item.shortage || 0) > 0);
                        const ready = productionRequestModal.rows.length > 0 && shortageRows.length === 0 && !productionRequestModal.loading;
                        const requestQty = Number(row.request_qty || 0);
                        const actualQty = Number(productionRequestModal.actualQty || 0);
                        const hasVariance = Number.isFinite(actualQty) && actualQty > 0 && actualQty !== requestQty;
                        const meta = getProductionRequestItemMeta(row);
                        const labelPlan = splitQtyBySnp(actualQty, meta.snpQty);
                        const partialCount = labelPlan.filter((label) => label.isPartial).length;
                        const processSeconds = actualQty * meta.cycleTimeSeconds;
                        const needsBomRecheck = Number(productionRequestModal.requirementQty || 0) !== actualQty;
                        return (
                          <>
                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-[145px_1fr_96px_96px]">
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Request</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{getRequestIdLabel(row)}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Item</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{row.item_code || '-'}</div>
                                <div className="text-[10px] text-slate-500">{row.item_name || '-'}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">WO Qty</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{formatQty(requestQty)}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">SNP / Label</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{meta.snpQty ? formatQty(meta.snpQty) : '-'}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-[160px_170px_1fr]">
                              <label className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                                <span className="mb-1 block text-[9px] font-semibold uppercase text-sky-700">Production Date</span>
                                <input
                                  type="date"
                                  className="w-full rounded border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                  value={productionRequestModal.productionDate || ''}
                                  onChange={(event) => reloadProductionRequestRequirements(event.target.value)}
                                  disabled={productionRequestModal.loading || productionRequestModal.saving}
                                />
                              </label>
                              <label className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <span className="mb-1 block text-[9px] font-semibold uppercase text-emerald-700">Qty Aktual Produksi</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  className="w-full rounded border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                  value={productionRequestModal.actualQty || ''}
                                  onChange={(event) => setProductionRequestModal((prev) => ({
                                    ...prev,
                                    actualQty: event.target.value,
                                    error: '',
                                  }))}
                                  onBlur={() => reloadProductionRequestRequirements(productionRequestModal.productionDate)}
                                  disabled={productionRequestModal.loading || productionRequestModal.saving || Boolean(productionRequestModal.postedResult)}
                                />
                              </label>
                              <div className={`rounded-md border px-3 py-2 ${
                                productionRequestModal.loading
                                  ? 'border-slate-200 bg-slate-50 text-slate-500'
                                  : needsBomRecheck
                                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                                  : ready
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                              }`}>
                                <div className="text-[9px] uppercase font-semibold">Readiness</div>
                                <div className="mt-0.5 font-semibold">
                                  {productionRequestModal.loading
                                    ? 'Loading BOM requirements...'
                                    : needsBomRecheck
                                      ? 'Qty aktual berubah. Recheck BOM sebelum posting.'
                                    : ready
                                      ? 'Ready for actual production posting'
                                      : shortageRows.length > 0
                                        ? `Blocked - material shortage on ${shortageRows.length} item(s)`
                                        : 'BOM requirement is not available'}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
                              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Label Plan</div>
                                <div className="mt-0.5 font-semibold text-slate-900">
                                  {labelPlan.length || '-'} label{partialCount > 0 ? `, ${partialCount} partial` : ''}
                                </div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Line / Machine</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{getProductionRequestLineLabel(row)}</div>
                                <div className="text-[10px] text-slate-500">Mesin: {meta.machineLabel}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Cycle Time</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{meta.cycleTimeSeconds ? `${formatQty(meta.cycleTimeSeconds)} s/pcs` : '-'}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Est. Process Time</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{formatDurationFromSeconds(processSeconds)}</div>
                              </div>
                            </div>
                            {labelPlan.length > 0 && (
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                                <div className="mb-1.5 text-[9px] font-semibold uppercase text-slate-500">Split Label Produksi</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {labelPlan.map((label, index) => (
                                    <span
                                      key={`production-label-plan-${index}`}
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                        label.isPartial
                                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      L{index + 1}: {formatQty(label.qty)}{label.isPartial ? ' Partial' : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hasVariance && (
                              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-[1fr_210px]">
                                <label className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                  <span className="mb-1 block text-[9px] font-semibold uppercase text-amber-700">Alasan Selisih Aktual vs WO</span>
                                  <input
                                    className="w-full rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    placeholder="Contoh: material kurang, mesin stop, NG, sisa shift"
                                    value={productionRequestModal.varianceReason || ''}
                                    onChange={(event) => setProductionRequestModal((prev) => ({
                                      ...prev,
                                      varianceReason: event.target.value,
                                      error: '',
                                    }))}
                                    disabled={productionRequestModal.saving || Boolean(productionRequestModal.postedResult)}
                                  />
                                </label>
                                <label className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                                  actualQty > requestQty ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(productionRequestModal.overproductionApproved)}
                                    onChange={(event) => setProductionRequestModal((prev) => ({
                                      ...prev,
                                      overproductionApproved: event.target.checked,
                                      error: '',
                                    }))}
                                    disabled={actualQty <= requestQty || productionRequestModal.saving || Boolean(productionRequestModal.postedResult)}
                                  />
                                  <span className="text-xs font-semibold normal-case text-inherit">Approval overproduction</span>
                                </label>
                              </div>
                            )}
                            {productionRequestModal.postedResult && (
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                                Production posted sebagai {productionRequestModal.postedResult?.productionOrder?.wo_number || `WO-PROD-${productionRequestModal.postedResult?.productionOrder?.id || '-'}`}. Label produksi siap dicetak.
                              </div>
                            )}
                            {productionRequestModal.error && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                {productionRequestModal.error}
                              </div>
                            )}
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="min-w-[820px] w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Material</th>
                                    <th className="p-2 text-left">Type</th>
                                    <th className="p-2 text-right">Required</th>
                                    <th className="p-2 text-right">Available</th>
                                    <th className="p-2 text-right">Shortage</th>
                                    <th className="p-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productionRequestModal.loading && (
                                    <tr>
                                      <td colSpan={6} className="p-3 text-center text-slate-400">Loading...</td>
                                    </tr>
                                  )}
                                  {!productionRequestModal.loading && productionRequestModal.rows.length === 0 && (
                                    <tr>
                                      <td colSpan={6} className="p-3 text-center text-slate-400">No BOM material requirement found.</td>
                                    </tr>
                                  )}
                                  {!productionRequestModal.loading && productionRequestModal.rows.map((item) => {
                                    const shortage = Number(item.shortage || 0);
                                    const ok = shortage <= 0;
                                    return (
                                      <tr key={item.itemCode} className="border-t">
                                        <td className="p-2">
                                          <div className="font-semibold text-slate-900">{item.itemCode}</div>
                                          <div className="text-[10px] text-slate-500">{item.itemName || '-'}</div>
                                        </td>
                                        <td className="p-2">{item.itemType || '-'}</td>
                                        <td className="p-2 text-right">{formatQty(item.requiredQty || 0)} {item.itemUnit || ''}</td>
                                        <td className="p-2 text-right">{formatQty(item.availableQty || 0)} {item.itemUnit || ''}</td>
                                        <td className={`p-2 text-right font-semibold ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {formatQty(shortage)} {item.itemUnit || ''}
                                        </td>
                                        <td className="p-2">
                                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                            ok
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : 'border-rose-200 bg-rose-50 text-rose-700'
                                          }`}>
                                            {ok ? 'Ready' : 'Shortage'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end gap-2 border-t px-5 py-4">
                      {!productionRequestModal.postedResult && (
                        <button
                          type="button"
                          onClick={() => openProductionLineBatchFromRequest(productionRequestModal.row)}
                          className="px-3 py-2 text-sm border rounded bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={productionRequestModal.saving || productionRequestModal.loading}
                          title="Buka konfirmasi batch untuk production request pada line yang sama"
                        >
                          Konfirmasi Satu Line
                        </button>
                      )}
                      {productionRequestModal.postedResult && (
                        <>
                          <button
                            type="button"
                            onClick={() => printProductionWorkOrders([{
                              row: productionRequestModal.row,
                              status: 'posted',
                              productionId: productionRequestModal.postedResult?.productionOrder?.id,
                              postedResult: productionRequestModal.postedResult,
                            }], { title: 'Production Work Order' })}
                            className="px-3 py-2 text-sm border rounded bg-white text-slate-700"
                          >
                            Print WO
                          </button>
                          <button
                            type="button"
                            onClick={() => printProductionOutputLabels([{
                              row: productionRequestModal.row,
                              status: 'posted',
                              productionId: productionRequestModal.postedResult?.productionOrder?.id,
                              postedResult: productionRequestModal.postedResult,
                            }])}
                            className="px-3 py-2 text-sm border rounded bg-white text-slate-700"
                          >
                            Print Label
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={closeProductionRequestModal}
                        className="px-3 py-2 text-sm border rounded"
                        disabled={productionRequestModal.saving}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={confirmProductionRequest}
                        className="px-3 py-2 text-sm rounded bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                        disabled={
                          productionRequestModal.loading
                          || productionRequestModal.saving
                          || Boolean(productionRequestModal.postedResult)
                          || productionRequestModal.rows.length === 0
                          || productionRequestModal.rows.some((item) => Number(item.shortage || 0) > 0)
                          || !(Number(productionRequestModal.actualQty || 0) > 0)
                          || Number(productionRequestModal.requirementQty || 0) !== Number(productionRequestModal.actualQty || 0)
                          || (
                            Number(productionRequestModal.actualQty || 0) !== Number(productionRequestModal.row?.request_qty || 0)
                            && !String(productionRequestModal.varianceReason || '').trim()
                          )
                          || (
                            Number(productionRequestModal.actualQty || 0) > Number(productionRequestModal.row?.request_qty || 0)
                            && !productionRequestModal.overproductionApproved
                          )
                        }
                      >
                        {productionRequestModal.saving ? 'Posting...' : 'Konfirmasi Produksi'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {productionBatchModal.open && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-start justify-between border-b px-5 py-4">
                      <div>
                        <div className="text-sm font-semibold">Batch Production Execution</div>
                        <div className="text-xs text-slate-500">
                          Selected production requests are checked against BOM stock before WO release.
                        </div>
                      </div>
                      <button type="button" onClick={closeProductionBatchModal} className="text-slate-500 hover:text-slate-800">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {(() => {
                        const entries = productionBatchModal.entries || [];
                        const readyCount = entries.filter((entry) => entry.status === 'ready').length;
                        const postedCount = entries.filter((entry) => entry.status === 'posted').length;
                        const releasedCount = entries.filter((entry) => entry.status === 'released').length;
                        const shortageCount = entries.filter((entry) => entry.status === 'shortage').length;
                        const blockedCount = entries.filter((entry) => entry.status === 'blocked' || entry.status === 'failed').length;
                        const lineSummary = entries.reduce((acc, entry) => {
                          const lineLabel = getProductionRequestLineLabel(entry.row);
                          const current = acc.get(lineLabel) || { total: 0, ready: 0, shortage: 0, blocked: 0, released: 0, posted: 0 };
                          current.total += 1;
                          if (entry.status === 'ready') current.ready += 1;
                          if (entry.status === 'shortage') current.shortage += 1;
                          if (entry.status === 'blocked' || entry.status === 'failed') current.blocked += 1;
                          if (entry.status === 'released') current.released += 1;
                          if (entry.status === 'posted') current.posted += 1;
                          acc.set(lineLabel, current);
                          return acc;
                        }, new Map());
                        const categorySummary = entries.reduce((acc, entry) => {
                          const categoryMeta = getProductionRequestCategoryMeta(entry.row);
                          const current = acc.get(categoryMeta.key) || { label: categoryMeta.label, total: 0, ready: 0, shortage: 0, blocked: 0, released: 0, posted: 0 };
                          current.total += 1;
                          if (entry.status === 'ready') current.ready += 1;
                          if (entry.status === 'shortage') current.shortage += 1;
                          if (entry.status === 'blocked' || entry.status === 'failed') current.blocked += 1;
                          if (entry.status === 'released') current.released += 1;
                          if (entry.status === 'posted') current.posted += 1;
                          acc.set(categoryMeta.key, current);
                          return acc;
                        }, new Map());
                        const lineOptions = Array.from(lineSummary.entries()).sort((left, right) => String(left[0]).localeCompare(String(right[0])));
                        const activeLineFilter = String(productionBatchModal.lineFilter || 'all');
                        const categoryOptions = Array.from(categorySummary.entries()).sort((left, right) => String(left[1].label).localeCompare(String(right[1].label)));
                        const activeCategoryFilter = String(productionBatchModal.categoryFilter || 'all');
                        const visibleEntries = entries.filter((entry) => (
                          (activeLineFilter === 'all' || getProductionRequestLineLabel(entry.row) === activeLineFilter)
                          && (activeCategoryFilter === 'all' || getProductionRequestCategoryMeta(entry.row).key === activeCategoryFilter)
                        ));
                        return (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                              <div className="rounded-lg border bg-slate-50 p-3">
                                <div className="text-[10px] uppercase text-slate-400">Selected</div>
                                <div className="mt-1 text-lg font-bold text-slate-900">{entries.length}</div>
                              </div>
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                <div className="text-[10px] uppercase text-emerald-600">Ready</div>
                                <div className="mt-1 text-lg font-bold text-emerald-700">{readyCount}</div>
                              </div>
                              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                                <div className="text-[10px] uppercase text-orange-600">Shortage</div>
                                <div className="mt-1 text-lg font-bold text-orange-700">{shortageCount}</div>
                              </div>
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                                <div className="text-[10px] uppercase text-rose-600">Blocked/Failed</div>
                                <div className="mt-1 text-lg font-bold text-rose-700">{blockedCount}</div>
                              </div>
                              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                <div className="text-[10px] uppercase text-sky-600">WO Released</div>
                                <div className="mt-1 text-lg font-bold text-sky-700">{releasedCount}</div>
                              </div>
                              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                                <div className="text-[10px] uppercase text-indigo-600">Actual Posted</div>
                                <div className="mt-1 text-lg font-bold text-indigo-700">{postedCount}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[190px_220px_220px_1fr] gap-3 text-xs">
                              <label>
                                <span className="mb-1 block text-[10px] uppercase text-slate-400">Production Date</span>
                                <input
                                  type="date"
                                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs"
                                  value={productionBatchModal.productionDate || ''}
                                  onChange={(event) => reloadProductionBatchRequirements(event.target.value)}
                                  disabled={productionBatchModal.loading || productionBatchModal.posting}
                                />
                              </label>
                              <label>
                                <span className="mb-1 block text-[10px] uppercase text-slate-400">Production Line</span>
                                <select
                                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs"
                                  value={activeLineFilter}
                                  onChange={(event) => setProductionBatchModal((prev) => ({ ...prev, lineFilter: event.target.value, error: '' }))}
                                  disabled={productionBatchModal.loading || productionBatchModal.posting}
                                >
                                  <option value="all">All Lines ({entries.length})</option>
                                  {lineOptions.map(([lineLabel, summary]) => (
                                    <option key={lineLabel} value={lineLabel}>
                                      {lineLabel} ({summary.ready}/{summary.total} ready)
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span className="mb-1 block text-[10px] uppercase text-slate-400">Category</span>
                                <select
                                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs"
                                  value={activeCategoryFilter}
                                  onChange={(event) => setProductionBatchModal((prev) => ({ ...prev, categoryFilter: event.target.value, error: '' }))}
                                  disabled={productionBatchModal.loading || productionBatchModal.posting}
                                >
                                  <option value="all">All Category ({entries.length})</option>
                                  {categoryOptions.map(([categoryKey, summary]) => (
                                    <option key={categoryKey} value={categoryKey}>
                                      {summary.label} ({summary.ready}/{summary.total} ready)
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                                <div className="text-[10px] uppercase font-semibold">Batch Rule</div>
                                <div className="mt-1">
                                  Only Ready rows in the selected production line and category will be released to WO. Actual qty is posted later from WO Released rows.
                                </div>
                              </div>
                            </div>
                            {categoryOptions.length > 1 && (
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {categoryOptions.map(([categoryKey, summary]) => (
                                  <button
                                    key={categoryKey}
                                    type="button"
                                    onClick={() => setProductionBatchModal((prev) => ({ ...prev, categoryFilter: categoryKey, error: '' }))}
                                    className={`rounded-lg border p-3 text-left text-xs transition ${
                                      activeCategoryFilter === categoryKey
                                        ? 'border-cyan-700 bg-cyan-700 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="font-semibold">{summary.label}</div>
                                    <div className={`mt-1 text-[10px] ${activeCategoryFilter === categoryKey ? 'text-cyan-100' : 'text-slate-500'}`}>
                                      Ready {summary.ready} / Total {summary.total} - WO Released {summary.released} - Shortage {summary.shortage}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {lineOptions.length > 0 && (
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {lineOptions.map(([lineLabel, summary]) => (
                                  <button
                                    key={lineLabel}
                                    type="button"
                                    onClick={() => setProductionBatchModal((prev) => ({ ...prev, lineFilter: lineLabel, error: '' }))}
                                    className={`rounded-lg border p-3 text-left text-xs transition ${
                                      activeLineFilter === lineLabel
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="font-semibold">{lineLabel}</div>
                                    <div className={`mt-1 text-[10px] ${activeLineFilter === lineLabel ? 'text-slate-200' : 'text-slate-500'}`}>
                                      Ready {summary.ready} / Total {summary.total} - WO Released {summary.released} - Shortage {summary.shortage}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {productionBatchModal.error && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                {productionBatchModal.error}
                              </div>
                            )}
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="min-w-[1060px] w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Request</th>
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-right">WO Qty</th>
                                    <th className="p-2 text-left">Labels</th>
                                    <th className="p-2 text-right">BOM Lines</th>
                                    <th className="p-2 text-right">Shortage Lines</th>
                                    <th className="p-2 text-left">Status</th>
                                    <th className="p-2 text-left">Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleEntries.length === 0 && !productionBatchModal.loading && (
                                    <tr>
                                      <td colSpan={9} className="p-3 text-center text-slate-400">No production request selected.</td>
                                    </tr>
                                  )}
                                  {visibleEntries.map((entry) => {
                                    const row = entry.row || {};
                                    const requestQty = Number(row.request_qty || 0);
                                    const categoryMeta = getProductionRequestCategoryMeta(row);
                                    const meta = getProductionRequestItemMeta(row);
                                    const labelPlan = splitQtyBySnp(requestQty, meta.snpQty);
                                    const partialCount = labelPlan.filter((label) => label.isPartial).length;
                                    const statusKey = String(entry.status || '').toLowerCase();
                                    const statusClass = statusKey === 'ready'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : statusKey === 'released'
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                      : statusKey === 'posted'
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : statusKey === 'shortage'
                                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                                          : statusKey === 'loading'
                                            ? 'border-slate-200 bg-slate-50 text-slate-600'
                                            : 'border-rose-200 bg-rose-50 text-rose-700';
                                    const statusLabel = statusKey === 'posted'
                                      ? `Posted${entry.productionId ? ` PROD-${entry.productionId}` : ''}`
                                      : statusKey === 'released'
                                        ? `WO Released${entry.productionId ? ` PROD-${entry.productionId}` : ''}`
                                      : statusKey === 'shortage'
                                        ? 'Shortage'
                                        : statusKey === 'ready'
                                          ? 'Ready'
                                          : statusKey === 'loading'
                                            ? 'Loading'
                                            : statusKey === 'failed'
                                              ? 'Failed'
                                              : 'Blocked';
                                    const shortageText = (entry.shortageRows || [])
                                      .slice(0, 2)
                                      .map((item) => `${item.itemCode} kurang ${formatQty(item.shortage || 0)}`)
                                      .join(', ');
                                    return (
                                      <tr key={row.id} className="border-t">
                                        <td className="p-2 font-semibold">{getRequestIdLabel(row)}</td>
                                        <td className="p-2">
                                          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                                            {categoryMeta.label}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          <div className="font-semibold text-slate-900">{row.item_code || '-'}</div>
                                          <div className="text-[10px] text-slate-500">{row.item_name || '-'}</div>
                                          <div className="mt-1 text-[10px] font-semibold text-indigo-600">{getProductionRequestLineLabel(row)}</div>
                                        </td>
                                        <td className="p-2 text-right font-semibold">{formatQty(requestQty)}</td>
                                        <td className="p-2 text-slate-600">
                                          <div className="font-semibold text-slate-900">{labelPlan.length || '-'}</div>
                                          <div className="text-[10px] text-slate-500">
                                            SNP {meta.snpQty ? formatQty(meta.snpQty) : '-'}{partialCount > 0 ? `, ${partialCount} partial` : ''}
                                          </div>
                                        </td>
                                        <td className="p-2 text-right">{entry.requirements?.length || 0}</td>
                                        <td className="p-2 text-right">{entry.shortageRows?.length || 0}</td>
                                        <td className="p-2">
                                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
                                            {statusLabel}
                                          </span>
                                        </td>
                                        <td className="p-2 text-slate-600">
                                          {entry.error || shortageText || '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end gap-2 border-t px-5 py-4">
                      <button
                        type="button"
                        onClick={() => printProductionWorkOrders(
                          productionBatchModal.entries.filter((entry) => isProductionBatchEntryInScope(entry, productionBatchModal.lineFilter, productionBatchModal.categoryFilter)),
                          { title: 'Batch Production Work Order' },
                        )}
                        className="px-3 py-2 text-sm border rounded bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={
                          productionBatchModal.posting
                          || !productionBatchModal.entries.some((entry) => isProductionBatchEntryInScope(entry, productionBatchModal.lineFilter, productionBatchModal.categoryFilter))
                        }
                      >
                        Print WO
                      </button>
                      <button
                        type="button"
                        onClick={() => printProductionOutputLabels(productionBatchModal.entries)}
                        className="px-3 py-2 text-sm border rounded bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={productionBatchModal.posting || !productionBatchModal.entries.some((entry) => entry.status === 'posted' && entry.productionId)}
                      >
                        Print Label Posted
                      </button>
                      <button
                        type="button"
                        onClick={closeProductionBatchModal}
                        className="px-3 py-2 text-sm border rounded"
                        disabled={productionBatchModal.posting}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={openProductionBatchActualConfirm}
                        className="px-3 py-2 text-sm rounded border border-sky-200 bg-sky-50 text-sky-700 disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={
                          productionBatchModal.loading
                          || productionBatchModal.posting
                          || !productionBatchModal.entries.some((entry) => (
                            entry.status === 'released'
                            && isProductionBatchEntryInScope(entry, productionBatchModal.lineFilter, productionBatchModal.categoryFilter)
                          ))
                        }
                      >
                        Konfirmasi Aktual
                      </button>
                      <button
                        type="button"
                        onClick={releaseProductionBatch}
                        className="px-3 py-2 text-sm rounded bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                        disabled={
                          productionBatchModal.loading
                          || productionBatchModal.posting
                          || !productionBatchModal.entries.some((entry) => (
                            entry.status === 'ready'
                            && isProductionBatchEntryInScope(entry, productionBatchModal.lineFilter, productionBatchModal.categoryFilter)
                          ))
                        }
                      >
                        {productionBatchModal.posting ? 'Processing...' : 'Post Ready Production'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {productionBatchModal.actualConfirmOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-start justify-between border-b px-5 py-4">
                      <div>
                        <div className="text-sm font-semibold">Konfirmasi Aktual Batch</div>
                        <div className="text-xs text-slate-500">
                          Isi qty aktual setelah produksi selesai. Sistem recheck BOM berdasarkan qty aktual sebelum posting.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductionBatchModal((prev) => ({ ...prev, actualConfirmOpen: false, error: '' }))}
                        className="text-slate-500 hover:text-slate-800"
                        disabled={productionBatchModal.posting}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {(() => {
                        const activeLineFilter = String(productionBatchModal.lineFilter || 'all');
                        const activeCategoryFilter = String(productionBatchModal.categoryFilter || 'all');
                        const activeCategoryLabel = activeCategoryFilter === 'all'
                          ? 'All Category'
                          : getProductionRequestCategoryMeta((productionBatchModal.entries || []).find((entry) => getProductionRequestCategoryMeta(entry.row).key === activeCategoryFilter)?.row).label;
                        const actualEntries = (productionBatchModal.entries || []).filter((entry) => (
                          entry.status === 'released'
                          && isProductionBatchEntryInScope(entry, activeLineFilter, activeCategoryFilter)
                        ));
                        return (
                          <>
                            <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-5">
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Production Date</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{productionBatchModal.productionDate || '-'}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Line Scope</div>
                                <div className="mt-0.5 font-semibold text-slate-900">{activeLineFilter === 'all' ? 'All Lines' : activeLineFilter}</div>
                              </div>
                              <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-cyan-700">Category Scope</div>
                                <div className="mt-0.5 font-semibold text-cyan-700">{activeCategoryLabel}</div>
                              </div>
                              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-emerald-700">Ready To Confirm</div>
                                <div className="mt-0.5 font-semibold text-emerald-700">{actualEntries.length}</div>
                              </div>
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-[9px] uppercase text-slate-400">Rule</div>
                                <div className="mt-0.5 font-semibold text-slate-900">No BOM / no material = blocked</div>
                              </div>
                            </div>
                            {productionBatchModal.error && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                {productionBatchModal.error}
                              </div>
                            )}
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="min-w-[1200px] w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Request</th>
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-right">WO Qty</th>
                                    <th className="p-2 text-left">Actual Qty</th>
                                    <th className="p-2 text-left">Labels</th>
                                    <th className="p-2 text-left">Readiness</th>
                                    <th className="p-2 text-left">Reason / Approval</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {actualEntries.length === 0 && (
                                    <tr>
                                      <td colSpan={8} className="p-4 text-center text-slate-400">Tidak ada WO Released untuk dikonfirmasi.</td>
                                    </tr>
                                  )}
                                  {actualEntries.map((entry) => {
                                    const row = entry.row || {};
                                    const requestQty = Number(row.request_qty || 0);
                                    const actualQty = Number(entry.actualQty || 0);
                                    const hasVariance = Number.isFinite(actualQty) && actualQty > 0 && actualQty !== requestQty;
                                    const needsBomRecheck = Number(entry.requirementQty || 0) !== actualQty;
                                    const categoryMeta = getProductionRequestCategoryMeta(row);
                                    const meta = getProductionRequestItemMeta(row);
                                    const labelPlan = splitQtyBySnp(actualQty, meta.snpQty);
                                    const partialCount = labelPlan.filter((label) => label.isPartial).length;
                                    const shortageCount = entry.shortageRows?.length || 0;
                                    const readyForPost = !needsBomRecheck && shortageCount === 0 && !entry.error;
                                    return (
                                      <tr key={`actual-confirm-${row.id}`} className="border-t align-top">
                                        <td className="p-2 font-semibold">{getRequestIdLabel(row)}</td>
                                        <td className="p-2">
                                          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                                            {categoryMeta.label}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          <div className="font-semibold text-slate-900">{row.item_code || '-'}</div>
                                          <div className="text-[10px] text-slate-500">{row.item_name || '-'}</div>
                                          <div className="mt-1 text-[10px] font-semibold text-indigo-600">{getProductionRequestLineLabel(row)}</div>
                                        </td>
                                        <td className="p-2 text-right font-semibold">{formatQty(requestQty)}</td>
                                        <td className="p-2">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            className="w-24 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-right text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                            value={entry.actualQty || ''}
                                            onChange={(event) => updateProductionBatchEntry(row.id, {
                                              actualQty: event.target.value,
                                              error: '',
                                              postedResult: null,
                                            })}
                                            onBlur={() => reloadProductionBatchEntryRequirements(row.id)}
                                            disabled={productionBatchModal.posting}
                                          />
                                          {needsBomRecheck && (
                                            <div className="mt-1 text-[10px] font-semibold text-sky-700">Recheck BOM required</div>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          <div className="font-semibold text-slate-900">{labelPlan.length || '-'}</div>
                                          <div className="text-[10px] text-slate-500">
                                            SNP {meta.snpQty ? formatQty(meta.snpQty) : '-'}{partialCount > 0 ? `, ${partialCount} partial` : ''}
                                          </div>
                                        </td>
                                        <td className="p-2">
                                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                            readyForPost
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : 'border-amber-200 bg-amber-50 text-amber-700'
                                          }`}>
                                            {readyForPost ? 'Ready' : needsBomRecheck ? 'Needs Recheck' : 'Blocked'}
                                          </span>
                                          {entry.error && <div className="mt-1 text-[10px] text-rose-600">{entry.error}</div>}
                                          {shortageCount > 0 && <div className="mt-1 text-[10px] text-orange-600">Shortage {shortageCount} line</div>}
                                        </td>
                                        <td className="p-2">
                                          {hasVariance ? (
                                            <div className="space-y-1">
                                              <input
                                                className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] focus:outline-none focus:ring-2 focus:ring-amber-200"
                                                placeholder="Alasan selisih aktual"
                                                value={entry.varianceReason || ''}
                                                onChange={(event) => updateProductionBatchEntry(row.id, {
                                                  varianceReason: event.target.value,
                                                  error: '',
                                                })}
                                                disabled={productionBatchModal.posting}
                                              />
                                              {actualQty > requestQty && (
                                                <label className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                                  <input
                                                    type="checkbox"
                                                    checked={Boolean(entry.overproductionApproved)}
                                                    onChange={(event) => updateProductionBatchEntry(row.id, {
                                                      overproductionApproved: event.target.checked,
                                                      error: '',
                                                    })}
                                                    disabled={productionBatchModal.posting}
                                                  />
                                                  Approval overproduction
                                                </label>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-slate-400">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end gap-2 border-t px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setProductionBatchModal((prev) => ({ ...prev, actualConfirmOpen: false, error: '' }))}
                        className="px-3 py-2 text-sm border rounded"
                        disabled={productionBatchModal.posting}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={confirmProductionBatch}
                        className="px-3 py-2 text-sm rounded bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                        disabled={productionBatchModal.posting}
                      >
                        {productionBatchModal.posting ? 'Posting...' : 'Konfirmasi Aktual & Posting'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showDnDetailModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-3xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">DN Detail</div>
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
                        <div className="text-[10px] uppercase text-slate-400">Created Date</div>
                        <div className="font-semibold">{formatDnDate(selectedDnDetail?.created_at || selectedDnDetail?.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Planned Date</div>
                        {dnDetailEditable ? (
                          <input
                            type="date"
                            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                            min={getDnDateInputValue(selectedDnDetail?.created_at || selectedDnDetail?.createdAt)}
                            value={dnHeaderEdits?.plannedDate || ''}
                            onChange={(event) => {
                              const nextDate = event.target.value;
                              const createdDate = getDnDateInputValue(selectedDnDetail?.created_at || selectedDnDetail?.createdAt);
                              setDnHeaderEdits((prev) => ({
                                ...(prev || {}),
                                plannedDate: nextDate,
                                deliveryType: compareDnDateInput(nextDate, createdDate) === 0 && normalizeDnDeliveryType(prev?.deliveryType) === 'normal'
                                  ? 'additional'
                                  : prev?.deliveryType,
                              }));
                            }}
                          />
                        ) : (
                          <div className="font-semibold">
                            {selectedDnDetail?.planned_date
                              ? new Date(selectedDnDetail.planned_date).toLocaleDateString('id-ID')
                              : '-'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Status</div>
                        <div className="font-semibold">{String(selectedDnDetail?.status || '').toUpperCase() || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Delivery Type</div>
                        {dnDetailEditable ? (
                          <select
                            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                            value={dnHeaderEdits?.deliveryType || 'normal'}
                            onChange={(event) => setDnHeaderEdits((prev) => ({ ...(prev || {}), deliveryType: event.target.value }))}
                          >
                            <option value="normal">Normal Delivery</option>
                            <option value="additional">Additional Delivery</option>
                            <option value="urgent">Urgent Delivery</option>
                          </select>
                        ) : (
                          <div className="font-semibold">{getDnDeliveryTypeForDisplay(selectedDnDetail).toUpperCase()}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Cycle</div>
                        <div className="font-semibold">{dnDetailEditable ? (dnHeaderEdits?.cycle || '-') : (selectedDnDetail?.cycle || '-')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400">Rit/Time</div>
                        {dnDetailEditable ? (
                          <select
                            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                            value={dnHeaderEdits?.scheduleIndex ?? ''}
                            onChange={(event) => handleDnDetailScheduleChange(event.target.value)}
                            disabled={dnDetailScheduleRows.length === 0}
                          >
                            <option value="">{dnDetailScheduleRows.length === 0 ? 'No supplier schedule' : 'Select Rit/Time'}</option>
                            {dnDetailScheduleRows.map((row, idx) => (
                              <option key={`dn-detail-schedule-${idx}`} value={String(idx)}>
                                Rit {row.rit || '-'} {row.time ? `(${row.time})` : ''}{row.cycle ? ` - ${row.cycle}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-semibold">{selectedDnDetail?.rit || '-'} / {selectedDnDetail?.delivery_time || '-'}</div>
                        )}
                        {dnDetailEditable && (
                          <div className="mt-1 text-[10px] text-slate-400">
                            Time: {dnHeaderEdits?.deliveryTime || '-'}
                          </div>
                        )}
                      </div>
                    </div>
                    {dnDetailEditable
                      && compareDnDateInput(dnHeaderEdits?.plannedDate, selectedDnDetail?.created_at || selectedDnDetail?.createdAt) === 0
                      && normalizeDnDeliveryType(dnHeaderEdits?.deliveryType) === 'normal' && (
                        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
                          Same-day delivery must be marked as Additional or Urgent.
                        </div>
                    )}

                    {dnDetailLoading ? (
                      <div className="text-xs text-slate-400">Loading...</div>
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
                                    formatQty(row.request_qty)
                                  )}
                                </td>
                                <td className="p-2">{row.item_unit || '-'}</td>
                              </tr>
                            ))}
                            {dnDetailRows.length === 0 && (
                              <tr><td colSpan="4" className="p-3 text-center text-gray-400">No items.</td></tr>
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
                      <button type="button" onClick={closeDnDetailModal} className="px-3 py-2 text-sm border rounded">Close</button>
                      {dnDetailEditable && (
                        <button type="button" onClick={handleDnDetailSave} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded">Save</button>
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
                                <td className="p-2 text-right">{formatQty(expected)}</td>
                                <td className="p-2 text-right">{formatQty(actual)}</td>
                                <td className={`p-2 text-right ${variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                  {formatSignedQty(variance)}
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
                              <td className="p-2 text-right font-semibold">{formatQty(selectedRnDetail?.expected_total ?? 0)}</td>
                              <td className="p-2 text-right font-semibold">{formatQty(selectedRnDetail?.received_total ?? 0)}</td>
                              <td className="p-2 text-right font-semibold">{formatQty(selectedRnDetail?.variance ?? 0)}</td>
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
                        Supplier Master Item belum diisi untuk item: {Array.from(new Set(dnBatchWarnings.missingSupplier)).slice(0, 5).join(', ')}
                        {dnBatchWarnings.missingSupplier.length > 5 ? ' ...' : ''}
                      </div>
                    )}
                    {dnBatchWarnings.invalidRole.length > 0 && (
                      <div className="mb-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                        Supplier bukan role Delivery Note untuk item: {Array.from(new Set(dnBatchWarnings.invalidRole)).slice(0, 5).join(', ')}
                        {dnBatchWarnings.invalidRole.length > 5 ? ' ...' : ''}
                      </div>
                    )}
                    {(dnBatchWarnings.invalidFlow || []).length > 0 && (
                      <div className="mb-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2">
                        Skipped because flow is not Supplier DN: {Array.from(new Set(dnBatchWarnings.invalidFlow)).slice(0, 5).join(', ')}
                        {dnBatchWarnings.invalidFlow.length > 5 ? ' ...' : ''}
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
                          const outcome = await handleRequestDnBatch({ remarksBySupplier });
                          if (outcome && typeof outcome === 'object') {
                            openRequestBatchResult('dn', outcome);
                          }
                          if ((outcome && typeof outcome === 'object' && outcome.ok) || outcome === true) {
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

              {renderRequestBatchResultModal()}

              {showDnPrintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none kanban-print-page">
                    <div className="p-4 border-b flex justify-between items-center print:hidden">
                      <div className="text-sm font-semibold">Delivery Note Preview</div>
                      <div className="flex items-center gap-2">
                        {canEditSchedules && ['sent', 'in_transit', 'partial'].includes(String(dnPrintPayload?.sourceDn?.status || '').toLowerCase()) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const sourceDn = dnPrintPayload?.sourceDn;
                              if (!sourceDn?.id) return;
                              const closed = await handleForceCloseDn?.(sourceDn);
                              if (closed) closeDnPrintModal();
                            }}
                            className="px-3 py-1.5 text-xs border border-amber-300 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                            title="Force close this DN"
                          >
                            Force Close
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const sourceDn = dnPrintPayload?.sourceDn;
                            if (String(sourceDn?.status || '').toLowerCase() === 'draft' && sourceDn?.id) {
                              void handleDnPrintPdf(sourceDn);
                              return;
                            }
                            void handleDnPreviewPrint();
                          }}
                          className="px-3 py-1.5 text-xs border rounded"
                          title={String(dnPrintPayload?.sourceDn?.status || '').toLowerCase() === 'draft'
                            ? 'Open DN and continue to Print/PDF'
                            : 'Print / PDF'}
                        >
                          {String(dnPrintPayload?.sourceDn?.status || '').toLowerCase() === 'draft' ? 'Open & Print/PDF' : 'Print / PDF'}
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
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <div><span className="font-semibold text-slate-800">Supplier:</span> {scheduleRequestSupplier.label}</div>
                        <div><span className="font-semibold text-slate-800">Item:</span> {selectedKanban?.item_code || selectedKanban?.itemCode || selectedKanban?.item || '-'}</div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PO Aktif</label>
                        <SearchableSelectDropdown
                          value={scheduleForm.poNumber}
                          options={schedulePoOptions}
                          onChange={(value) => setScheduleForm({ ...scheduleForm, poNumber: value })}
                          placeholder={schedulePoLoading ? 'Memuat PO aktif...' : 'Pilih PO aktif dari Master PO'}
                          searchPlaceholder="Ketik nomor PO / supplier"
                          emptyText={schedulePoLoading ? 'Memuat PO aktif...' : 'Tidak ada PO aktif untuk supplier dan item ini.'}
                          disabled={schedulePoLoading}
                          getOptionValue={(option) => option.value}
                          getOptionLabel={(option) => option.label}
                        />
                        {schedulePoError && (
                          <div className="mt-1 text-[11px] text-rose-600">{schedulePoError}</div>
                        )}
                      </div>
                      <input type="date" className="border p-2 rounded text-sm w-full" value={scheduleForm.requestDate} onChange={(e) => setScheduleForm({ ...scheduleForm, requestDate: e.target.value })} />
                      <select
                        className="border p-2 rounded text-sm w-full"
                        value={scheduleForm.deliveryTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, deliveryTime: e.target.value })}
                      >
                        <option value="">Pilih delivery time dari Master Vendor</option>
                        {scheduleForm.deliveryTime && !allVendorScheduleOptions.some((option) => option.value === scheduleForm.deliveryTime) && (
                          <option value={scheduleForm.deliveryTime}>{scheduleForm.deliveryTime}</option>
                        )}
                        {allVendorScheduleOptions.map((option) => (
                          <option key={option.key} value={option.value}>{option.label}</option>
                        ))}
                      </select>
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
                        {qcStatusOptions.length === 0 && (
                          <option value="">QC status belum diatur di Master Config</option>
                        )}
                        {qcStatusOptions.map((status) => (
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
                  <div className="bg-white rounded-xl w-full max-w-6xl p-5 shadow-xl max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold">Create Manual Request</div>
                        <div className="text-xs text-slate-500">Create a manual kanban request</div>
                      </div>
                      <button onClick={closeManualRequestModal}><X size={16} /></button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                      <form
                        onSubmit={handleManualRequest}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
                          e.preventDefault();
                          queueManualRequestFromForm();
                        }}
                        className="space-y-3 text-sm overflow-y-auto pr-1"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Kanban ID *</label>
                            <SearchableSelectDropdown
                              value={manualRequestForm.kanbanId}
                              options={manualKanbanOptions}
                              onChange={(value) => handleManualKanbanSelect(value)}
                              placeholder="Pilih Kanban ID dari Master Kanban"
                              searchPlaceholder="Ketik Kanban ID / item"
                              emptyText="Master Kanban belum tersedia."
                              getOptionValue={(option) => String(option?.value || '').trim()}
                              getOptionLabel={(option) => option?.label || option?.value || ''}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Item Code *</label>
                            <select
                              className="border p-2 rounded w-full text-sm"
                              value={manualRequestForm.itemCode}
                              onChange={(e) => syncManualRequestFromItem(e.target.value)}
                            >
                              <option value="">Pilih item dari Master Item</option>
                              {masterItemOptions.map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.code} - {item.name || '-'}
                                </option>
                              ))}
                            </select>
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
                              placeholder="Qty on hand"
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
                            placeholder="Qty request"
                            value={manualRequestForm.requestQty}
                            onChange={(e) => setManualRequestForm({ ...manualRequestForm, requestQty: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={queueManualRequestFromForm}
                            className="px-3 py-2 text-sm border rounded bg-white inline-flex items-center gap-2"
                          >
                            <Plus size={14} />
                            <span>Item</span>
                          </button>
                          <button type="submit" className="flex-1 px-3 py-2 text-sm bg-slate-900 text-white rounded">
                            {manualRequestQueue.length > 0 ? `Create ${manualRequestQueue.length} Requests` : 'Create Request'}
                          </button>
                          <button type="button" onClick={closeManualRequestModal} className="px-3 py-2 text-sm border rounded">
                            Cancel
                          </button>
                        </div>
                      </form>
                      <div className="rounded-xl border bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daftar Request</div>
                            <div className="text-sm font-semibold text-slate-900">{manualRequestQueue.length} item</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setManualRequestQueue([])}
                            className="text-xs text-slate-500 hover:text-slate-700"
                            disabled={manualRequestQueue.length === 0}
                          >
                            Clear
                          </button>
                        </div>
                        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                          {manualRequestQueue.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
                              Belum ada item di daftar. Isi form lalu klik Tambah ke Daftar untuk membuat banyak request sekaligus.
                            </div>
                          ) : manualRequestQueue.map((row, index) => (
                            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {index + 1}. {row.itemCode}
                                  </div>
                                  {row.itemName && (
                                    <div className="mt-0.5 text-slate-600">
                                      {row.itemName}
                                    </div>
                                  )}
                                  {row.kanbanId && (
                                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] text-indigo-700">
                                      {row.kanbanId}
                                    </div>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500">
                                    <span>Qty</span>
                                    <input
                                      type="number"
                                      className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
                                      value={row.requestQty}
                                      onChange={(e) => updateManualRequestQueueRow(row.id, { requestQty: e.target.value })}
                                    />
                                    <span>On hand {row.onHand}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                                      {row.triggerType}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-400">
                                    Akan tersimpan: {row.normalizedQty ?? row.requestQty}
                                  </div>
                                  {row.errorMessage && (
                                    <div className="mt-1 text-rose-600">
                                      Gagal: {row.errorMessage}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openKanbanInScan(row.kanbanId || buildKanbanDisplayId(row.itemCode, masterItemsByCode.get(row.itemCode)?.type || '', row))}
                                    className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                                    title="Kirim Kanban ID ke tab Scan"
                                  >
                                    Scan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setManualRequestQueue((prev) => prev.filter((_, idx) => idx !== index))}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {kanbanItemAnalysis && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 rounded-t-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl border bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                          {kanbanItemAnalysis.thumbUrl ? (
                            <img src={kanbanItemAnalysis.thumbUrl} alt={kanbanItemAnalysis.itemCode} className="w-full h-full object-contain" />
                          ) : (
                            <Package size={18} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase text-slate-400">Analisa Kanban</div>
                          <div className="text-lg font-bold text-slate-900 truncate">
                            {buildKanbanDisplayId(kanbanItemAnalysis.row.item_code, kanbanItemAnalysis.row.item_type, kanbanItemAnalysis.row)}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {kanbanItemAnalysis.itemCode} - {kanbanItemAnalysis.itemName}
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => setKanbanAnalysisRow(null)} className="p-2 text-slate-500 hover:text-slate-800">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className={`rounded-2xl border p-4 ${kanbanItemAnalysis.andon.tone}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${kanbanItemAnalysis.andon.pill}`}>
                                {kanbanItemAnalysis.andon.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">{kanbanItemAnalysis.andon.note}</span>
                            </div>
                            <div className="mt-2 text-sm text-slate-700">{kanbanItemAnalysis.recommendation}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              openQrModal(kanbanItemAnalysis.row);
                              setKanbanAnalysisRow(null);
                            }}
                            className="px-3 py-2 text-xs border rounded-lg bg-white hover:bg-slate-50 flex items-center gap-2 shrink-0"
                          >
                            <QrCode size={14} /> Lihat QR
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl border bg-white p-3">
                          <div className="text-[10px] uppercase text-slate-400">On Hand</div>
                          <div className={`mt-1 text-xl font-bold ${kanbanItemAnalysis.andon.stockTone}`}>
                            {formatQty(kanbanItemAnalysis.onHand)} {kanbanItemAnalysis.unit}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Gap min: {kanbanItemAnalysis.stockGap === null ? '-' : formatNumber0(kanbanItemAnalysis.stockGap)}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-white p-3">
                          <div className="text-[10px] uppercase text-slate-400">Min / Max</div>
                          <div className="mt-1 text-xl font-bold text-slate-900">
                            {formatNumber0(kanbanItemAnalysis.minQty)} / {formatNumber0(kanbanItemAnalysis.maxQty)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            PRL: {kanbanItemAnalysis.prlQty !== null && kanbanItemAnalysis.prlQty !== undefined && kanbanItemAnalysis.prlQty !== '' ? formatNumber0(kanbanItemAnalysis.prlQty) : '-'}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-white p-3">
                          <div className="text-[10px] uppercase text-slate-400">Kartu</div>
                          <div className="mt-1 text-xl font-bold text-slate-900">{kanbanItemAnalysis.cardsLabel}</div>
                          <div className="text-[10px] text-slate-500">
                            Reg {kanbanItemAnalysis.regularCards} + Safety {kanbanItemAnalysis.safetyCards}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-white p-3">
                          <div className="text-[10px] uppercase text-slate-400">Request Aktif</div>
                          <div className="mt-1 text-xl font-bold text-slate-900">{kanbanItemAnalysis.activeRequestEntries.length}</div>
                          <div className="text-[10px] text-slate-500">
                            Qty open: {formatNumber0(kanbanItemAnalysis.openRequestQty)} {kanbanItemAnalysis.unit}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
                        <div className="rounded-2xl border bg-white p-4">
                          <div className="text-sm font-semibold text-slate-900">Informasi Item</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Kategori</div>
                              <div className="font-semibold text-slate-800">{kanbanItemAnalysis.categoryLabel}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Supplier</div>
                              <div className="font-semibold text-slate-800">{kanbanItemAnalysis.supplierLabel}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Lokasi</div>
                              <div className="font-semibold text-slate-800">{kanbanItemAnalysis.locationLabel}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Lead Time</div>
                              <div className="font-semibold text-slate-800">{kanbanItemAnalysis.leadTimeDays} hari</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Qty / Kanban</div>
                              <div className="font-semibold text-slate-800">{formatNumber0(kanbanItemAnalysis.lotQty)} {kanbanItemAnalysis.unit}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase text-slate-400">Status</div>
                              <div className="font-semibold text-slate-800">{kanbanItemAnalysis.andon.note}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">Request Aktif</div>
                            <div className="flex flex-wrap justify-end gap-1">
                              {Object.entries(kanbanItemAnalysis.statusCounts).length > 0 ? Object.entries(kanbanItemAnalysis.statusCounts).map(([status, count]) => (
                                <span key={status} className="rounded-full border bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                                  {status}: {count}
                                </span>
                              )) : (
                                <span className="text-[10px] text-slate-400">Tidak ada request aktif</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {kanbanItemAnalysis.activeRequestEntries.slice(0, 5).map(({ row, health }) => (
                              <div key={row.id || `${row.item_code}-${row.created_at}`} className="rounded-xl border bg-slate-50 p-3 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-slate-800">{getRequestIdLabel(row)}</div>
                                  <div className="text-[10px] text-slate-500">{formatRequestAging(health.ageHours)}</div>
                                </div>
                                <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                  <div>Status: <span className="font-semibold">{row.status || '-'}</span></div>
                                  <div>Qty: <span className="font-semibold">{formatQty(row.request_qty || 0)} {kanbanItemAnalysis.unit}</span></div>
                                  <div>Action: <span className="font-semibold">{getKanbanNextAction(row)}</span></div>
                                  <div>Dibuat: <span className="font-semibold">{row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-'}</span></div>
                                </div>
                                {(health.isOverdue || health.hasStockGap || health.isOverPrl) && (
                                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                                    {health.isOverdue ? 'Overdue. ' : ''}
                                    {health.hasStockGap ? `Stock gap: on hand ${formatQty(health.onHand)} < request ${formatQty(health.requestQty)}. ` : ''}
                                    {health.isOverPrl ? 'Over PRL. ' : ''}
                                  </div>
                                )}
                              </div>
                            ))}
                            {kanbanItemAnalysis.activeRequestEntries.length === 0 && (
                              <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-xs text-slate-500">
                                Belum ada request aktif untuk item ini.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">Sumber Angka</div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                          {kanbanItemAnalysis.sourceRows.map((source) => (
                            <div key={source} className="rounded-lg border bg-white px-3 py-2">{source}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showQrModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-4xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">QR Kanban ID</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQrSimulationRefreshNonce((prev) => prev + 1)}
                          className="px-3 py-1.5 text-xs border rounded-lg bg-slate-50 hover:bg-slate-100"
                          disabled={qrSimulationLoading}
                        >
                          {qrSimulationLoading ? 'Menyimulasikan...' : 'Simulasi Ulang'}
                        </button>
                        <button onClick={() => setShowQrModal(false)}><X size={16} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                      <div className="bg-slate-50 border rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                        <div className="text-xs text-slate-500 text-center">{qrTitle}</div>
                        <div className="bg-white border rounded-2xl p-3 shadow-sm">
                          <QRCodeCanvas value={qrPayload || '-'} size={180} />
                        </div>
                        <div className="text-[10px] text-slate-400 break-all text-center">Kanban ID: {qrPayload || '-'}</div>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-2xl border bg-white p-4">
                          <div className="text-sm font-semibold text-slate-900">Simulasi Scan QR</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Ini menampilkan hasil yang akan dibaca sistem saat QR ini dipindai.
                          </div>
                          {qrSimulationLoading && (
                            <div className="mt-3 text-xs text-slate-500">Memuat simulasi...</div>
                          )}
                          {qrSimulationError && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                              {qrSimulationError}
                            </div>
                          )}
                          {qrSimulationResult && (
                            <div className="mt-3 space-y-3 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="rounded-xl border bg-slate-50 p-3">
                                  <div className="text-[10px] uppercase text-slate-400">Action</div>
                                  <div className="font-semibold text-slate-800">{qrSimulationResult.actionLabel || qrSimulationResult.actionType || '-'}</div>
                                </div>
                                <div className="rounded-xl border bg-slate-50 p-3">
                                  <div className="text-[10px] uppercase text-slate-400">Item</div>
                                  <div className="font-semibold text-slate-800">{qrSimulationResult.itemLabel || qrSimulationResult.itemCode || '-'}</div>
                                </div>
                                <div className="rounded-xl border bg-slate-50 p-3">
                                  <div className="text-[10px] uppercase text-slate-400">Qty</div>
                                  <div className="font-semibold text-slate-800">{formatNumber0(qrSimulationResult.qty || 0)} pcs</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="rounded-xl border p-3">
                                  <div className="text-[10px] uppercase text-slate-400">Posisi Sekarang</div>
                                  <div className="font-semibold text-slate-800">{qrSimulationResult.currentPosition?.label || qrSimulationResult.location || '-'}</div>
                                </div>
                                <div className="rounded-xl border p-3">
                                  <div className="text-[10px] uppercase text-slate-400">Target Berikutnya</div>
                                  <div className="font-semibold text-slate-800">{qrSimulationResult.nextProcess?.label || qrSimulationResult.nextDestination || '-'}</div>
                                </div>
                              </div>
                              {Array.isArray(qrSimulationResult.scanWarnings) && qrSimulationResult.scanWarnings.length > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                                  {qrSimulationResult.scanWarnings.join(' ')}
                                </div>
                              )}
                              {qrSimulationResult.prlPlan && (
                                <div className={`rounded-xl border p-3 ${qrSimulationResult.prlPlan.overPrl ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                                  <div className="text-[10px] uppercase tracking-wide">PRL Preview</div>
                                  <div className="mt-1 text-xs">
                                    Plan: {formatNumber0(qrSimulationResult.prlPlan.plannedQty || 0)} • Terpakai: {formatNumber0(qrSimulationResult.prlPlan.usedQty || 0)} • Sisa: {formatNumber0(qrSimulationResult.prlPlan.remainingQty || 0)}
                                  </div>
                                  {qrSimulationResult.prlPlan.notice && (
                                    <div className="mt-1 text-[11px]">{qrSimulationResult.prlPlan.notice}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {!qrSimulationLoading && !qrSimulationError && !qrSimulationResult && (
                            <div className="mt-3 text-xs text-slate-400">Belum ada simulasi.</div>
                          )}
                        </div>
                      </div>
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
                          placeholder="Satu Kanban ID dari master per baris"
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
