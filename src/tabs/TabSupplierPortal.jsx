
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  ClipboardCheck,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  Loader2,
  Package,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import logoPrl from '../assets/kop-mrp.png';
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';

const TabSupplierPortal = (props) => {
  const {
    apiFetch,
    ensureXlsx,
    formatDateID,
    formatNumber0,
  } = props;

  const todayIso = new Date().toISOString().slice(0, 10);
  const monthStartIso = `${todayIso.slice(0, 8)}01`;
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
  const [prlRows, setPrlRows] = useState([]);
  const [prlTotal, setPrlTotal] = useState(0);
  const [prlLoading, setPrlLoading] = useState(false);
  const [prlError, setPrlError] = useState('');
  const [prlPage, setPrlPage] = useState(1);
  const [prlPageSize, setPrlPageSize] = useState(50);

  const [scheduleDraft, setScheduleDraft] = useState({ q: '', status: '', start: '', end: '', order: 'asc' });
  const [scheduleFilters, setScheduleFilters] = useState({ q: '', status: '', start: '', end: '', order: 'asc' });
  const [scheduleRows, setScheduleRows] = useState([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(50);
  const [scheduleLabelModal, setScheduleLabelModal] = useState({ open: false, loading: false, error: '', data: null });

  const [dnDraft, setDnDraft] = useState({ q: '', status: '', dnStatus: '', start: '', end: '' });
  const [dnFilters, setDnFilters] = useState({ q: '', status: '', dnStatus: '', start: '', end: '' });
  const [dnRows, setDnRows] = useState([]);
  const [dnTotal, setDnTotal] = useState(0);
  const [dnLoading, setDnLoading] = useState(false);
  const [dnError, setDnError] = useState('');
  const [dnPage, setDnPage] = useState(1);
  const [dnPageSize, setDnPageSize] = useState(50);
  const [dnDetails, setDnDetails] = useState({});
  const [labelModal, setLabelModal] = useState({ open: false, dnNumber: '', header: null, items: [], controls: {} });
  const [labelBulkDraft, setLabelBulkDraft] = useState({ packageText: '' });
  const [labelSelectedKeys, setLabelSelectedKeys] = useState([]);

  const [reportDraft, setReportDraft] = useState({ start: monthStartIso, end: todayIso });
  const [reportFilters, setReportFilters] = useState({ start: monthStartIso, end: todayIso });
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [millsheetRows, setMillsheetRows] = useState([]);
  const [millsheetPendingDns, setMillsheetPendingDns] = useState([]);
  const [millsheetPendingRns, setMillsheetPendingRns] = useState([]);
  const [millsheetLoading, setMillsheetLoading] = useState(false);
  const [millsheetSaving, setMillsheetSaving] = useState(false);
  const [millsheetError, setMillsheetError] = useState('');
  const [millsheetSearch, setMillsheetSearch] = useState('');
  const [millsheetForm, setMillsheetForm] = useState({
    referenceKey: '',
    referenceType: '',
    dnNumber: '',
    rnNumber: '',
    itemCode: '',
    lotSupplier: '',
    certificateNo: '',
    certificateDate: '',
    file: null,
  });

  useEffect(() => {
    if (!labelModal.open && !scheduleLabelModal.open) return undefined;
    document.body.classList.add('supplier-label-print-active');
    return () => document.body.classList.remove('supplier-label-print-active');
  }, [labelModal.open, scheduleLabelModal.open]);

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

  const getDnItemCode = (item) => String(item?.item_code || item?.itemCode || '').trim();
  const getDnItemName = (item) => String(item?.item_name || item?.itemName || '').trim();
  const getDnDocQty = (item) => Number(item?.doc_qty ?? item?.docQty ?? item?.request_qty ?? item?.requestQty ?? 0);
  const getDnPackQty = (item) => Number(item?.pack_qty ?? item?.packQty ?? 0);
  const getDnItemKey = (item, index = 0) => `${getDnItemCode(item) || 'ITEM'}-${index}`;
  const normalizeList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return value.split(/[>,;|]+/).map((entry) => entry.trim()).filter(Boolean);
      }
    }
    return [];
  };
  const getDnLocationLabel = (item) => {
    const code = String(item?.location_code || item?.locationCode || item?.drop_zone || item?.dropZone || item?.location_id || item?.locationId || '').trim();
    const name = String(item?.location_name || item?.locationName || '').trim();
    if (code && name && code !== name) return `${code} - ${name}`;
    return code || name || '-';
  };
  const getDnNextProcessLabel = (item) => {
    const routing = normalizeList(item?.process_routing || item?.processRouting);
    const flow = normalizeList(item?.process_flow || item?.processFlow);
    const firstStep = routing[0] || flow[0] || null;
    if (firstStep && typeof firstStep === 'object') {
      return String(
        firstStep.processName
        || firstStep.process_name
        || firstStep.name
        || firstStep.processCode
        || firstStep.process_code
        || firstStep.code
        || firstStep.process
        || '',
      ).trim() || '-';
    }
    if (firstStep) return String(firstStep).trim();
    return String(item?.line_production_name || item?.lineProductionName || item?.line_production || item?.lineProduction || '').trim() || '-';
  };

  const prlMonthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const getPrlFocusPeriods = useCallback(() => {
    const parseMonth = (value, fallback) => {
      const match = String(value || '').trim().match(/^(\d{4})-(\d{2})/);
      if (!match) return fallback;
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return fallback;
      return new Date(year, monthIndex, 1);
    };
    const today = new Date();
    const defaultMonth = parseMonth(todayIso, new Date(today.getFullYear(), today.getMonth(), 1));
    let startMonth = parseMonth(poFilters.start, defaultMonth);
    let endMonth = parseMonth(poFilters.end, startMonth);
    if (startMonth > endMonth) {
      [startMonth, endMonth] = [endMonth, startMonth];
    }
    const periods = [];
    const cursor = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
    while (cursor <= endMonth && periods.length < 24) {
      periods.push({
        year: cursor.getFullYear(),
        monthKey: prlMonthKeys[cursor.getMonth()] || prlMonthKeys[today.getMonth()],
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return periods.length ? periods : [{ year: today.getFullYear(), monthKey: prlMonthKeys[today.getMonth()] || 'jan' }];
  }, [poFilters.start, poFilters.end, todayIso]);

  const normalizeSupplierPreviewPrlRows = useCallback((payload) => {
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    const query = String(poFilters.q || '').trim().toLowerCase();
    const normalizedRows = rows
      .map((row) => ({
        document_type: 'PRL',
        prl_number: payload?.documentNumber || '-',
        month_label: payload?.monthLabel || '',
        month_key: payload?.monthKey || '',
        year: payload?.year || '',
        item_code: row.itemCode || '',
        item_name: row.description || '',
        part_no: row.partNo || row.itemCode || '',
        model: row.model || '-',
        qty_released: Number(row.months?.n || 0),
        uom: row.uom || '-',
        status: 'active',
      }))
      .filter((row) => Number(row.qty_released || 0) > 0);
    if (!query) return normalizedRows;
    return normalizedRows.filter((row) => [
      row.prl_number,
      row.month_label,
      row.item_code,
      row.item_name,
      row.part_no,
      row.model,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [poFilters.q]);

  const millsheetPendingOptions = useMemo(() => {
    const dnOptions = (millsheetPendingDns || []).map((row) => {
      const dnNumber = String(row.dnNumber || row.dn_number || '').trim();
      const poNumbers = String(row.poNumbers || row.po_numbers || '').trim();
      const rnNumbers = String(row.rnNumbers || row.rn_numbers || '').trim();
      const scheduleIds = String(row.scheduleIds || row.schedule_ids || '').trim();
      const itemCodes = String(row.itemCodes || row.item_codes || '').trim();
      const itemSummary = String(row.itemSummary || row.item_summary || '').trim();
      const itemCodeList = itemCodes.split(',').map((item) => item.trim()).filter(Boolean);
      const meta = [
        poNumbers ? `PO ${poNumbers}` : '',
        rnNumbers ? `RN ${rnNumbers}` : '',
        scheduleIds ? `Schedule ${scheduleIds}` : '',
        itemCodes ? `Item ${itemCodes}` : '',
      ].filter(Boolean).join(' | ');
      return {
        ...row,
        type: 'dn',
        value: `dn:${dnNumber}`,
        label: meta ? `DN ${dnNumber} | ${meta}` : `DN ${dnNumber}`,
        documentNumber: dnNumber,
        dnNumber,
        rnNumber: '',
        poNumbers,
        rnNumbers,
        scheduleIds,
        itemCodes,
        itemSummary,
        firstItemCode: itemCodeList.length === 1 ? itemCodeList[0] : '',
      };
    }).filter((row) => row.dnNumber);
    const rnOptions = (millsheetPendingRns || []).map((row) => {
      const rnNumber = String(row.rnNumber || row.rn_number || '').trim();
      const poNumber = String(row.poNumber || row.po_number || '').trim();
      const doNumber = String(row.doNumber || row.do_number || '').trim();
      const itemCodes = String(row.itemCodes || row.item_codes || '').trim();
      const itemSummary = String(row.itemSummary || row.item_summary || '').trim();
      const itemCodeList = itemCodes.split(',').map((item) => item.trim()).filter(Boolean);
      const meta = [
        poNumber ? `PO ${poNumber}` : '',
        doNumber ? `SJ ${doNumber}` : '',
        itemCodes ? `Item ${itemCodes}` : '',
      ].filter(Boolean).join(' | ');
      return {
        ...row,
        type: 'rn',
        value: `rn:${rnNumber}`,
        label: meta ? `RN ${rnNumber} | ${meta}` : `RN ${rnNumber}`,
        documentNumber: rnNumber,
        dnNumber: '',
        rnNumber,
        poNumbers: poNumber,
        rnNumbers: rnNumber,
        itemCodes,
        itemSummary,
        firstItemCode: itemCodeList.length === 1 ? itemCodeList[0] : '',
      };
    }).filter((row) => row.rnNumber);
    return [...dnOptions, ...rnOptions];
  }, [millsheetPendingDns, millsheetPendingRns]);

  const buildDefaultLotNo = (dnNumber, itemCode) => (
    `LOT-${String(dnNumber || 'DN').replace(/[^a-zA-Z0-9-]/g, '')}-${String(itemCode || 'ITEM').replace(/[^a-zA-Z0-9-]/g, '')}`
  );

  const splitAutoPackages = (docQty, packQty) => {
    const totalQty = Number(docQty || 0);
    const snp = Number(packQty || 0);
    if (!Number.isFinite(totalQty) || totalQty <= 0) return [];
    if (!Number.isFinite(snp) || snp <= 0) return [totalQty];
    const packages = [];
    let remaining = totalQty;
    while (remaining > 0) {
      const qty = remaining > snp ? snp : remaining;
      packages.push(qty);
      remaining -= qty;
    }
    return packages;
  };

  const parsePackageQtyText = (value) => String(value || '')
    .split(/[\n;,]+/)
    .map((entry) => Number(String(entry).trim()))
    .filter((qty) => Number.isFinite(qty) && qty > 0);

  const resolvePackageQtys = (value, shipmentQty, packQty) => {
    const customPackages = parsePackageQtyText(value);
    if (customPackages.length === 1) return splitAutoPackages(shipmentQty, customPackages[0]);
    if (customPackages.length > 1) return customPackages;
    return splitAutoPackages(shipmentQty, packQty);
  };

  const getPackageStatus = (qty, packQty) => {
    const snp = Number(packQty || 0);
    const value = Number(qty || 0);
    if (!Number.isFinite(snp) || snp <= 0) return 'NON SNP';
    if (value === snp) return 'FULL SNP';
    if (value < snp) return 'PARTIAL';
    return 'OVER SNP';
  };

  const buildSupplierLabels = useCallback((modal = labelModal) => {
    if (!modal?.open) return { labels: [], errors: [], warnings: [] };
    const labels = [];
    const errors = [];
    const warnings = [];
    const dnNumber = modal.dnNumber || modal.header?.dn_number || '';
    const supplierValue = String(modal.header?.supplier_id || modal.header?.supplierId || modal.header?.supplier || '').trim();
    (modal.items || []).forEach((item, index) => {
      const itemCode = getDnItemCode(item);
      const itemName = getDnItemName(item);
      const docQty = getDnDocQty(item);
      const packQty = getDnPackQty(item);
      const key = getDnItemKey(item, index);
      const control = modal.controls?.[key] || {};
      const shipmentQty = Number(control.shipmentQty || docQty);
      const packages = resolvePackageQtys(control.packageText, shipmentQty, packQty);
      const packageTotalQty = packages.reduce((sum, qty) => sum + Number(qty || 0), 0);
      const lotNo = String(control.lotNo || buildDefaultLotNo(dnNumber, itemCode)).trim();
      const locationLabel = getDnLocationLabel(item);
      const nextProcessLabel = getDnNextProcessLabel(item);
      const kanbanId = String(item?.kanban_id || item?.kanbanId || item?.request_code || item?.requestCode || '').trim();

      if (!itemCode) errors.push(`Line ${index + 1}: item kosong.`);
      if (!Number.isFinite(docQty) || docQty <= 0) errors.push(`${itemCode || `Line ${index + 1}`}: qty DN tidak valid.`);
      if (!Number.isFinite(shipmentQty) || shipmentQty <= 0) errors.push(`${itemCode || `Line ${index + 1}`}: qty kirim tidak valid.`);
      if (Number.isFinite(docQty) && Number.isFinite(shipmentQty) && shipmentQty > docQty) {
        errors.push(`${itemCode || `Line ${index + 1}`}: qty kirim ${formatQty(shipmentQty)} melebihi qty DN ${formatQty(docQty)}.`);
      }
      if (Number.isFinite(docQty) && Number.isFinite(shipmentQty) && shipmentQty < docQty) {
        warnings.push(`${itemCode}: qty kirim partial ${formatQty(shipmentQty)} dari DN ${formatQty(docQty)}.`);
      }
      if (packages.length === 0) errors.push(`${itemCode || `Line ${index + 1}`}: package kosong.`);
      if (Math.abs(packageTotalQty - shipmentQty) > 0.0001) {
        errors.push(`${itemCode || `Line ${index + 1}`}: total package ${formatQty(packageTotalQty)} tidak sama dengan qty kirim ${formatQty(shipmentQty)}.`);
      }
      if (!Number.isFinite(packQty) || packQty <= 0) {
        warnings.push(`${itemCode}: SNP kosong, label dibuat NON SNP.`);
      } else if (packages.every((qty) => Number(qty) !== packQty)) {
        warnings.push(`${itemCode}: tidak ada package yang sesuai SNP ${formatQty(packQty)}.`);
      } else if (packages.some((qty) => Number(qty) > packQty)) {
        warnings.push(`${itemCode}: ada package lebih besar dari SNP ${formatQty(packQty)}.`);
      }

      packages.forEach((qty, packageIndex) => {
        const seq = packageIndex + 1;
        const total = packages.length;
        const status = getPackageStatus(qty, packQty);
        const qrValue = [
          `type:incoming_label`,
          `supplier:${supplierValue}`,
          `dn:${dnNumber}`,
          `item:${itemCode}`,
          `qty:${qty}`,
          `lot:${lotNo}`,
          `kanban:${kanbanId}`,
          `pkg:${String(seq).padStart(3, '0')}/${String(total).padStart(3, '0')}`,
          `loc:${locationLabel}`,
          `next:${nextProcessLabel}`,
        ].join('|');
        labels.push({
          key: `${dnNumber}-${itemCode}-${seq}`,
          dnNumber,
          itemCode,
          itemName,
          partNo: item?.part_no || item?.partNo || '-',
          unit: item?.unit || '-',
          docQty,
          shipmentQty,
          packQty,
          packageQty: qty,
          packageSeq: seq,
          packageTotal: total,
          lotNo,
          kanbanId,
          locationLabel,
          nextProcessLabel,
          status,
          qrValue,
        });
      });
    });
    return { labels, errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)) };
  }, [formatQty, labelModal]);

  const labelBuild = useMemo(() => buildSupplierLabels(labelModal), [buildSupplierLabels, labelModal]);
  const supplierDnSummary = useMemo(() => {
    const header = labelModal.header || {};
    const dnNumber = labelModal.dnNumber || header.dn_number || '';
    const supplierCode = String(header.supplier_id || header.supplierId || header.supplier || '').trim();
    const supplierName = String(header.supplier_name || header.supplierName || header.supplier || '').trim();
    const rows = (labelModal.items || []).map((item, index) => {
      const itemCode = getDnItemCode(item);
      const itemLabels = labelBuild.labels.filter((label) => label.itemCode === itemCode);
      const shipmentQty = itemLabels.reduce((sum, label) => sum + Number(label.packageQty || 0), 0) || getDnDocQty(item);
      const packQty = getDnPackQty(item);
      return {
        no: index + 1,
        itemCode,
        itemName: getDnItemName(item),
        partNo: item?.part_no || item?.partNo || '-',
        packing: item?.type_pack || item?.typePack || item?.packing || '-',
        dropZone: getDnLocationLabel(item),
        unit: item?.unit || '-',
        snp: packQty,
        orderKbn: itemLabels.length || (packQty > 0 ? Math.ceil(Number(shipmentQty || 0) / packQty) : 0),
        orderUnit: shipmentQty,
      };
    });
    const totals = rows.reduce((acc, row) => {
      acc.orderKbn += Number(row.orderKbn || 0);
      acc.orderUnit += Number(row.orderUnit || 0);
      return acc;
    }, { orderKbn: 0, orderUnit: 0 });
    return {
      dnNumber,
      supplierCode,
      supplierName,
      supplierLabel: supplierName && supplierCode && supplierName !== supplierCode ? `${supplierCode} - ${supplierName}` : supplierCode || supplierName || '-',
      plannedDate: header.planned_date || header.plannedDate || '',
      cycle: header.cycle || '-',
      rit: header.rit || '-',
      deliveryTime: header.delivery_time || header.deliveryTime || '-',
      remarks: header.remarks || '',
      rows,
      totals,
      qrValue: [`type:dn`, `dn:${dnNumber}`, `supplier:${supplierCode || supplierName}`].join('|'),
      printDate: new Date().toLocaleDateString('id-ID'),
    };
  }, [labelBuild.labels, labelModal]);

  const openDnLabelModal = async (dnNumber) => {
    if (!dnNumber || !apiFetch) return;
    let detail = dnDetails[dnNumber];
    if (!detail?.items || !detail?.header) {
      setDnDetails((prev) => ({
        ...prev,
        [dnNumber]: { ...(prev[dnNumber] || {}), loading: true, error: '' },
      }));
      try {
        const data = await apiFetch(`/api/supplier/dn/${encodeURIComponent(dnNumber)}`);
        detail = { ...(detail || {}), loading: false, header: data?.header || null, items: data?.items || [] };
        setDnDetails((prev) => ({
          ...prev,
          [dnNumber]: { ...(prev[dnNumber] || {}), ...detail },
        }));
      } catch (error) {
        setDnDetails((prev) => ({
          ...prev,
          [dnNumber]: { ...(prev[dnNumber] || {}), loading: false, error: error.message || 'Gagal memuat detail DN.' },
        }));
        alert(error.message || 'Gagal memuat detail DN.');
        return;
      }
    }
    const itemsForLabel = Array.isArray(detail?.items) ? detail.items : [];
    const controls = {};
    itemsForLabel.forEach((item, index) => {
      const itemCode = getDnItemCode(item);
      controls[getDnItemKey(item, index)] = {
        lotNo: buildDefaultLotNo(dnNumber, itemCode),
        shipmentQty: String(getDnDocQty(item) || ''),
        packageText: '',
      };
    });
    setLabelModal({
      open: true,
      dnNumber,
      header: detail?.header || null,
      items: itemsForLabel,
      controls,
    });
    setLabelSelectedKeys([]);
  };

  const updateLabelControl = (itemKey, field, value) => {
    setLabelModal((prev) => ({
      ...prev,
      controls: {
        ...(prev.controls || {}),
        [itemKey]: {
          ...(prev.controls?.[itemKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const toggleLabelItemSelection = (itemKey) => {
    setLabelSelectedKeys((prev) => (
      prev.includes(itemKey)
        ? prev.filter((key) => key !== itemKey)
        : [...prev, itemKey]
    ));
  };

  const toggleAllLabelItemSelection = (checked) => {
    if (!checked) {
      setLabelSelectedKeys([]);
      return;
    }
    setLabelSelectedKeys((labelModal.items || []).map((item, index) => getDnItemKey(item, index)));
  };

  const updateAllLabelControls = (updater, options = {}) => {
    setLabelModal((prev) => {
      const dnNumber = prev.dnNumber || prev.header?.dn_number || '';
      const controls = { ...(prev.controls || {}) };
      const selectedSet = new Set(labelSelectedKeys);
      (prev.items || []).forEach((item, index) => {
        const itemKey = getDnItemKey(item, index);
        if (options.selectedOnly && !selectedSet.has(itemKey)) return;
        const current = controls[itemKey] || {};
        controls[itemKey] = {
          ...current,
          ...updater(item, index, current, dnNumber),
        };
      });
      return { ...prev, controls };
    });
  };

  const applyDnQtyToLabels = (selectedOnly = false) => {
    updateAllLabelControls((item) => ({
      shipmentQty: String(getDnDocQty(item) || ''),
    }), { selectedOnly });
  };

  const applyDefaultLotToLabels = (selectedOnly = false) => {
    updateAllLabelControls((item, index, current, dnNumber) => ({
      lotNo: buildDefaultLotNo(dnNumber, getDnItemCode(item)),
    }), { selectedOnly });
  };

  const applyPackageTextToLabels = (selectedOnly = false) => {
    updateAllLabelControls(() => ({
      packageText: String(labelBulkDraft.packageText || '').trim(),
    }), { selectedOnly });
  };

  const clearPackageTextForLabels = (selectedOnly = false) => {
    if (!selectedOnly) setLabelBulkDraft((prev) => ({ ...prev, packageText: '' }));
    updateAllLabelControls(() => ({ packageText: '' }), { selectedOnly });
  };

  const closeLabelModal = () => {
    setLabelModal({ open: false, dnNumber: '', header: null, items: [], controls: {} });
    setLabelBulkDraft({ packageText: '' });
    setLabelSelectedKeys([]);
  };

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
    if (normalized.includes('partial on time')) return 'bg-amber-100 text-amber-700';
    if (normalized.includes('late completion') || normalized.includes('partial late')) return 'bg-rose-100 text-rose-700';
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

  const resolveMillsheetBadge = useCallback((statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    if (normalized === 'qc_approved') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'uploaded_waiting_qc') return 'bg-sky-100 text-sky-700';
    if (normalized === 'qc_rejected' || normalized === 'overdue') return 'bg-rose-100 text-rose-700';
    if (normalized === 'required_pending') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }, []);

  const formatMillsheetStatus = useCallback((statusValue) => {
    const normalized = String(statusValue || '').toLowerCase();
    if (normalized === 'qc_approved') return 'QC Approved';
    if (normalized === 'uploaded_waiting_qc') return 'Menunggu QC';
    if (normalized === 'qc_rejected') return 'Ditolak QC';
    if (normalized === 'overdue') return 'Lewat Tenggang';
    if (normalized === 'required_pending') return 'Belum Lengkap';
    if (normalized === 'not_required') return 'Tidak Wajib';
    return statusValue || '-';
  }, []);

  const getProgressNumber = useCallback((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }, []);

  const buildDeliveryProgressSteps = useCallback((row = {}) => {
    const status = String(row.status || row.dnStatus || '').toLowerCase();
    const trackingStatus = String(row.tracking_status || row.trackingStatus || '').toLowerCase();
    const rnCount = getProgressNumber(row.rn_count ?? row.rnCount);
    const qcTotal = getProgressNumber(row.qc_total_count ?? row.qcTotalCount);
    const qcOpen = getProgressNumber(row.qc_open_count ?? row.qcOpenCount);
    const qcIssue = getProgressNumber(row.qc_issue_count ?? row.qcIssueCount);
    const qcReject = getProgressNumber(row.qc_reject_count ?? row.qcRejectCount);
    const diffQty = getProgressNumber(row.diff_qty ?? row.diffQty);
    const isCancelled = status === 'cancelled' || trackingStatus.includes('cancel');
    const hasIssue = qcIssue > 0 || qcReject > 0 || trackingStatus.includes('reject') || trackingStatus.includes('selisih');
    const hasReceived = rnCount > 0;
    const isCompleted = !isCancelled
      && hasReceived
      && Math.abs(diffQty) < 0.0001
      && qcOpen === 0
      && !hasIssue
      && (trackingStatus.includes('completed') || trackingStatus.includes('complete') || ['closed', 'received'].includes(status));
    const qcDone = hasReceived && qcOpen === 0 && !hasIssue;
    const qcMeta = hasReceived
      ? (qcOpen > 0
        ? `${formatQty(qcOpen)} open`
        : (hasIssue ? 'Perlu tindak lanjut' : `${formatQty(qcTotal || rnCount)} OK`))
      : 'Menunggu RN';

    return [
      {
        key: 'dn',
        label: 'DN',
        meta: formatDate(row.planned_date || row.plannedDate),
        icon: Package,
        state: isCancelled ? 'issue' : 'done',
      },
      {
        key: 'delivery',
        label: 'Kirim',
        meta: hasReceived ? 'Tiba WH' : 'Dalam kirim',
        icon: Truck,
        state: isCancelled ? 'issue' : (hasReceived ? 'done' : 'active'),
      },
      {
        key: 'rn',
        label: 'RN',
        meta: hasReceived ? 'Sudah RN' : 'Belum RN',
        icon: ClipboardCheck,
        state: isCancelled ? 'issue' : (hasReceived ? 'done' : 'pending'),
      },
      {
        key: 'qc',
        label: 'QC',
        meta: qcMeta,
        icon: ShieldCheck,
        state: isCancelled ? 'issue' : (!hasReceived ? 'pending' : (hasIssue ? 'issue' : (qcOpen > 0 ? 'active' : (qcDone ? 'done' : 'pending')))),
      },
      {
        key: 'finish',
        label: 'Selesai',
        meta: isCompleted ? 'Completed' : (hasIssue ? 'Hold' : 'Belum selesai'),
        icon: isCompleted ? CheckCircle2 : Circle,
        state: isCancelled || hasIssue ? 'issue' : (isCompleted ? 'done' : 'pending'),
      },
    ];
  }, [formatDate, formatQty, getProgressNumber]);

  const renderDeliveryProgress = useCallback((row = {}, options = {}) => {
    const { compact = false } = options;
    const steps = buildDeliveryProgressSteps(row);
    const stateClasses = {
      done: 'border-emerald-500 bg-emerald-50 text-emerald-700',
      active: 'border-sky-500 bg-sky-50 text-sky-700',
      issue: 'border-rose-500 bg-rose-50 text-rose-700',
      pending: 'border-slate-300 bg-white text-slate-400',
    };
    const connectorClass = (leftStep, rightStep) => (
      leftStep.state === 'done' && ['done', 'active'].includes(rightStep.state)
        ? 'bg-emerald-300'
        : rightStep.state === 'issue'
          ? 'bg-rose-300'
          : 'bg-slate-200'
    );

    return (
      <div className={compact ? 'min-w-[350px]' : 'rounded-lg border border-slate-200 bg-white p-3'}>
        <div className="flex items-start">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.key}>
                {index > 0 && (
                  <div className={`mt-4 h-0.5 flex-1 ${connectorClass(steps[index - 1], step)}`} />
                )}
                <div className={compact ? 'w-14 shrink-0 text-center' : 'w-24 shrink-0 text-center'}>
                  <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${stateClasses[step.state]}`}>
                    <StepIcon size={compact ? 14 : 16} />
                  </div>
                  <div className={`${compact ? 'mt-1 text-[10px]' : 'mt-2 text-xs'} font-semibold text-slate-700`}>
                    {step.label}
                  </div>
                  {!compact && (
                    <div className="mt-0.5 text-[11px] text-slate-500">{step.meta}</div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }, [buildDeliveryProgressSteps]);

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

  const fetchPrlList = useCallback(async () => {
    if (!apiFetch) return;
    setPrlLoading(true);
    setPrlError('');
    try {
      const payloads = await Promise.all(getPrlFocusPeriods().map(({ year, monthKey }) => {
        const query = new URLSearchParams({ year: String(year), month: monthKey }).toString();
        return apiFetch(`/api/prl/forecast-preview?${query}`, { timeoutMs: 60000 });
      }));
      const rows = payloads.flatMap((payload) => normalizeSupplierPreviewPrlRows(payload));
      const pageStart = (prlPage - 1) * prlPageSize;
      setPrlRows(rows.slice(pageStart, pageStart + prlPageSize));
      setPrlTotal(rows.length);
    } catch (error) {
      setPrlError(error.message || 'Gagal memuat data PRL.');
    } finally {
      setPrlLoading(false);
    }
  }, [apiFetch, getPrlFocusPeriods, normalizeSupplierPreviewPrlRows, prlPage, prlPageSize]);

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

  const fetchSupplierPerformance = useCallback(async () => {
    if (!apiFetch) return;
    setReportLoading(true);
    setReportError('');
    try {
      const query = buildQuery(reportFilters);
      const data = await apiFetch(`/api/supplier/performance${query}`);
      setReportData(data || null);
    } catch (error) {
      setReportError(error.message || 'Gagal memuat laporan performa supplier.');
    } finally {
      setReportLoading(false);
    }
  }, [apiFetch, buildQuery, reportFilters]);

  const fetchMillsheets = useCallback(async () => {
    if (!apiFetch) return;
    setMillsheetLoading(true);
    setMillsheetError('');
    try {
      const query = buildQuery({ q: millsheetSearch });
      const data = await apiFetch(`/api/supplier/millsheets${query}`);
      setMillsheetRows(Array.isArray(data?.documents) ? data.documents : []);
      setMillsheetPendingDns(Array.isArray(data?.pendingDns) ? data.pendingDns : []);
      setMillsheetPendingRns(Array.isArray(data?.pendingRns) ? data.pendingRns : []);
    } catch (error) {
      setMillsheetError(error.message || 'Gagal memuat Mill Sheet.');
    } finally {
      setMillsheetLoading(false);
    }
  }, [apiFetch, buildQuery, millsheetSearch]);

  useEffect(() => {
    if (activeView === 'po') {
      fetchPoList();
      fetchPrlList();
    }
  }, [activeView, fetchPoList, fetchPrlList]);

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

  useEffect(() => {
    if (activeView === 'report') {
      fetchSupplierPerformance();
    }
  }, [activeView, fetchSupplierPerformance]);

  useEffect(() => {
    if (activeView === 'millsheet') {
      fetchMillsheets();
    }
  }, [activeView, fetchMillsheets]);

  const applyPoFilters = () => {
    setPoFilters({ ...poDraft });
    setPoPage(1);
    setPrlPage(1);
  };

  const resetPoFilters = () => {
    const next = { q: '', status: '', start: '', end: '' };
    setPoDraft(next);
    setPoFilters(next);
    setPoPage(1);
    setPrlPage(1);
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

  const applyReportFilters = () => {
    setReportFilters({ ...reportDraft });
  };

  const resetReportFilters = () => {
    const next = { start: monthStartIso, end: todayIso };
    setReportDraft(next);
    setReportFilters(next);
  };

  const selectMillsheetPendingReference = (referenceKey, option) => {
    setMillsheetForm((prev) => ({
      ...prev,
      referenceKey,
      referenceType: option?.type || '',
      dnNumber: option?.type === 'dn' ? option?.dnNumber || '' : '',
      rnNumber: option?.type === 'rn' ? option?.rnNumber || '' : '',
      itemCode: option?.firstItemCode || prev.itemCode,
    }));
  };

  const submitMillsheet = async (event) => {
    event.preventDefault();
    const referenceKey = String(millsheetForm.referenceKey || '').trim();
    if (!referenceKey) {
      setMillsheetError('Pilih DN/RN dari daftar yang belum ada Mill Sheet.');
      return;
    }
    const selectedPending = millsheetPendingOptions.find((option) => String(option.value || '').toLowerCase() === referenceKey.toLowerCase());
    if (!selectedPending) {
      setMillsheetError('DN/RN harus dipilih dari dropdown pending Mill Sheet agar tidak salah upload.');
      return;
    }
    if (!millsheetForm.file) {
      setMillsheetError('File Mill Sheet wajib dipilih.');
      return;
    }
    setMillsheetSaving(true);
    setMillsheetError('');
    try {
      const formData = new FormData();
      formData.set('referenceType', selectedPending.type || '');
      formData.set('dnNumber', selectedPending.type === 'dn' ? selectedPending.dnNumber || '' : '');
      formData.set('rnNumber', selectedPending.type === 'rn' ? selectedPending.rnNumber || '' : '');
      formData.set('itemCode', String(millsheetForm.itemCode || '').trim());
      formData.set('lotSupplier', String(millsheetForm.lotSupplier || '').trim());
      formData.set('certificateNo', String(millsheetForm.certificateNo || '').trim());
      formData.set('certificateDate', String(millsheetForm.certificateDate || '').trim());
      formData.set('file', millsheetForm.file);
      await apiFetch('/api/supplier/millsheets', {
        method: 'POST',
        body: formData,
        timeoutMs: 60000,
      });
      setMillsheetForm({
        referenceKey: '',
        referenceType: '',
        dnNumber: '',
        rnNumber: '',
        itemCode: '',
        lotSupplier: '',
        certificateNo: '',
        certificateDate: '',
        file: null,
      });
      const input = document.getElementById('supplier-millsheet-file');
      if (input) input.value = '';
      await fetchMillsheets();
    } catch (error) {
      setMillsheetError(error.message || 'Gagal upload Mill Sheet.');
    } finally {
      setMillsheetSaving(false);
    }
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

  const poPrlExportHeaders = useMemo(() => ([
    { key: 'no', label: 'No' },
    { key: 'type', label: 'Tipe' },
    { key: 'document', label: 'Dokumen' },
    { key: 'period', label: 'Tanggal / Periode' },
    { key: 'item', label: 'Item' },
    { key: 'itemName', label: 'Nama Item' },
    { key: 'qty', label: 'Qty Order / Rilis' },
    { key: 'received', label: 'Qty Terima' },
    { key: 'remaining', label: 'Sisa' },
    { key: 'status', label: 'Status' },
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
    { key: 'progress', label: 'Progress Delivery' },
    { key: 'trackingStatus', label: 'Status Tracking' },
    { key: 'dnStatus', label: 'Status DN' },
    { key: 'docQty', label: 'Qty Dokumen' },
    { key: 'receivedQty', label: 'Qty Diterima' },
    { key: 'diffQty', label: 'Selisih' },
    { key: 'itemCount', label: 'Jumlah Item' },
    { key: 'rnCount', label: 'Jumlah RN' },
    { key: 'lastReceivedAt', label: 'Tgl Terima Terakhir' },
  ]), []);

  const reportExportHeaders = useMemo(() => ([
    { key: 'section', label: 'Section' },
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
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

  const buildPoPrlExportRows = (poList, prlList) => {
    const poExportRows = poList.map((row) => ({
      type: 'PO',
      document: row.po_number || '-',
      period: row.po_date || '-',
      item: '-',
      itemName: `${row.line_count ?? 0} line`,
      qty: formatQty(row.total_qty_order),
      received: formatQty(row.total_qty_received),
      remaining: formatQty(row.total_qty_remaining ?? (row.total_qty_order - row.total_qty_received)),
      status: row.status || '-',
    }));
    const prlExportRows = prlList.map((row) => ({
      type: 'PRL',
      document: row.prl_number || '-',
      period: row.month_label || `${String(row.month_key || '').toUpperCase()} ${row.year || ''}`.trim(),
      item: row.item_code || '-',
      itemName: row.item_name || '-',
      qty: formatQty(row.qty_released),
      received: '-',
      remaining: '-',
      status: 'RILIS',
    }));
    return [...poExportRows, ...prlExportRows].map((row, index) => ({ no: index + 1, ...row }));
  };

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
    progress: buildDeliveryProgressSteps(row)
      .map((step) => `${step.label}: ${step.meta}`)
      .join(' | '),
    trackingStatus: row.tracking_status || row.trackingStatus || '-',
    dnStatus: row.status || '-',
    docQty: formatQty(row.doc_qty_total ?? row.doc_qty ?? row.request_qty ?? row.requestQty),
    receivedQty: formatQty(row.received_qty_total ?? row.received_qty ?? row.receivedQty),
    diffQty: formatQty(row.diff_qty ?? row.diffQty),
    itemCount: row.item_count ?? row.itemCount ?? 0,
    rnCount: row.rn_count ?? row.rnCount ?? 0,
    lastReceivedAt: row.last_received_at ? formatDateTime(row.last_received_at) : '-',
  }));

  const buildPerformanceExportRows = (data = reportData) => {
    const summary = data?.summary || {};
    const supplier = data?.supplier || {};
    const period = data?.period || {};
    return [
      { section: 'Supplier', metric: 'Kode', value: supplier.code || '-' },
      { section: 'Supplier', metric: 'Nama', value: supplier.name || '-' },
      { section: 'Periode', metric: 'Mulai', value: period.start || '-' },
      { section: 'Periode', metric: 'Akhir', value: period.end || '-' },
      { section: 'Score', metric: 'Total Score', value: `${summary.weightedScore ?? 0}%` },
      { section: 'Score', metric: 'Rating', value: `${summary.ratingLabel || '-'} (${summary.rating || 0}/5)` },
      { section: 'Ketepatan Waktu', metric: 'Score', value: `${summary.timeScore ?? 0}%` },
      { section: 'Ketepatan Waktu', metric: 'Total Jadwal', value: summary.totalSchedules ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'On Time', value: summary.onTime ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Late', value: summary.late ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Late Completion', value: summary.lateCompletion ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Partial On Time', value: summary.partialOnTime ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Partial Late', value: summary.partialLate ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Too Early', value: summary.tooEarly ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Pending', value: summary.pending ?? 0 },
      { section: 'Ketepatan Waktu', metric: 'Qty On Time', value: formatQty(summary.onTimeQty) },
      { section: 'Ketepatan Waktu', metric: 'Qty Late', value: formatQty(summary.lateQty) },
      { section: 'Fulfillment Qty', metric: 'Score', value: `${summary.qtyScoreRaw ?? summary.qtyScore ?? 0}%` },
      { section: 'Fulfillment Qty', metric: 'Qty Rencana', value: formatQty(summary.requestQty) },
      { section: 'Fulfillment Qty', metric: 'Qty Diterima', value: formatQty(summary.receivedQty) },
      { section: 'QC + Line Claim', metric: 'Score', value: `${summary.qcScore ?? 0}%` },
      { section: 'QC + Line Claim', metric: 'Total Log', value: summary.qcTotal ?? 0 },
      { section: 'QC + Line Claim', metric: 'Open', value: summary.qcOpen ?? 0 },
      { section: 'QC + Line Claim', metric: 'Reject', value: summary.qcReject ?? 0 },
      { section: 'QC + Line Claim', metric: 'Line Claim', value: summary.lineClaimTotal ?? 0 },
      { section: 'Delivery Note', metric: 'Total DN', value: summary.dnCount ?? 0 },
      { section: 'Delivery Note', metric: 'Completed', value: summary.dnCompleted ?? 0 },
      { section: 'Delivery Note', metric: 'Pending', value: summary.dnPending ?? 0 },
      { section: 'Delivery Note', metric: 'Selisih/Reject', value: summary.dnIssue ?? 0 },
    ];
  };

  const fetchAllPoRows = async () => {
    if (!apiFetch) return [];
    const query = buildQuery({ ...poFilters, includeTotal: 0, limit: 5000, offset: 0 });
    const data = await apiFetch(`/api/supplier/po${query}`);
    return Array.isArray(data) ? data : (data?.rows || []);
  };

  const fetchAllPrlRows = async () => {
    if (!apiFetch) return [];
    const payloads = await Promise.all(getPrlFocusPeriods().map(({ year, monthKey }) => {
      const query = new URLSearchParams({ year: String(year), month: monthKey }).toString();
      return apiFetch(`/api/prl/forecast-preview?${query}`, { timeoutMs: 60000 });
    }));
    return payloads.flatMap((payload) => normalizeSupplierPreviewPrlRows(payload));
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
    const [poList, prlList] = await Promise.all([fetchAllPoRows(), fetchAllPrlRows()]);
    if (!poList.length && !prlList.length) {
      alert('Tidak ada data PO / PRL untuk diekspor.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const exportRows = buildPoPrlExportRows(poList, prlList);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO PRL Supplier');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `PO_PRL_Supplier_${today}.xlsx`);
  };

  const handleExportPoCsv = async () => {
    const [poList, prlList] = await Promise.all([fetchAllPoRows(), fetchAllPrlRows()]);
    if (!poList.length && !prlList.length) {
      alert('Tidak ada data PO / PRL untuk diekspor.');
      return;
    }
    const exportRows = buildPoPrlExportRows(poList, prlList);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(exportRows, `PO_PRL_Supplier_${today}.csv`);
  };

  const handlePrintPo = async () => {
    const [poList, prlList] = await Promise.all([fetchAllPoRows(), fetchAllPrlRows()]);
    if (!poList.length && !prlList.length) {
      alert('Tidak ada data PO / PRL untuk dicetak.');
      return;
    }
    openPrintWindow('Rekap PO / PRL Supplier', poPrlExportHeaders, buildPoPrlExportRows(poList, prlList));
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

  const handleExportPerformanceExcel = async () => {
    if (!ensureXlsx) return;
    if (!reportData) {
      alert('Laporan performa belum dimuat.');
      return;
    }
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildPerformanceExportRows()), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.monthly || []), 'Bulanan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.schedules || []), 'Jadwal');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.deliveryNotes || []), 'DN');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Performa_Supplier_${today}.xlsx`);
  };

  const handleExportPerformanceCsv = () => {
    if (!reportData) {
      alert('Laporan performa belum dimuat.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(buildPerformanceExportRows(), `Performa_Supplier_${today}.csv`);
  };

  const handlePrintPerformance = () => {
    if (!reportData) {
      alert('Laporan performa belum dimuat.');
      return;
    }
    openPrintWindow('Rapor Performa Supplier', reportExportHeaders, buildPerformanceExportRows());
  };

  const openScheduleLabelModal = async (row) => {
    const scheduleId = Number(row?.id || 0);
    if (!scheduleId) {
      setScheduleLabelModal({ open: true, loading: false, error: 'Schedule ID tidak valid.', data: null });
      return;
    }
    setScheduleLabelModal({ open: true, loading: true, error: '', data: null });
    try {
      const payload = await apiFetch(`/api/receiving-labels/schedule/${scheduleId}`, { method: 'POST' });
      setScheduleLabelModal({ open: true, loading: false, error: '', data: payload });
    } catch (error) {
      setScheduleLabelModal({ open: true, loading: false, error: error.message || 'Gagal membuat label schedule.', data: null });
    }
  };

  const poTotalPages = Math.max(1, Math.ceil(poTotal / poPageSize));
  const prlTotalPages = Math.max(1, Math.ceil(prlTotal / prlPageSize));
  const scheduleTotalPages = Math.max(1, Math.ceil(scheduleTotal / schedulePageSize));
  const dnTotalPages = Math.max(1, Math.ceil(dnTotal / dnPageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Supplier Portal</div>
          <div className="text-sm text-slate-500">Pantau PO, jadwal, DN, label incoming, dan performa delivery.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'guide' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('guide')}
            type="button"
          >
            Panduan
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'po' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('po')}
            type="button"
          >
            PO / PRL
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
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'millsheet' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('millsheet')}
            type="button"
          >
            Mill Sheet
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${activeView === 'report' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setActiveView('report')}
            type="button"
          >
            Laporan
          </button>
        </div>
      </div>

      {activeView === 'guide' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BookOpen size={18} /> Panduan Supplier Portal
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Gunakan portal ini untuk melihat PO/PRL rilis, jadwal kedatangan, tracking DN, mencetak label incoming, upload Mill Sheet, memakai AI, dan mengecek performa delivery supplier.
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
              {[
                { title: '1. Cek PO / PRL', body: 'Buka PO / PRL untuk memastikan PO aktif, sisa order, dan PRL yang sudah dirilis oleh internal.' },
                { title: '2. Ikuti Jadwal', body: 'Buka Jadwal Kedatangan untuk melihat tanggal rencana, status on time/late/too early, dan nomor SJ/DO.' },
                { title: '3. Tracking DN', body: 'Buka Tracking DN untuk melihat progres DN: kirim, RN, QC, sampai selesai.' },
                { title: '4. Cetak Label', body: 'Supplier jalur schedule klik Label di Jadwal Kedatangan. Supplier jalur DN tetap pakai detail DN > Label 1 DN, lalu print DN + label package.' },
                { title: '5. Upload Mill Sheet', body: 'Buka Mill Sheet, pilih DN, upload PDF/JPG/PNG, lalu tunggu review QC.' },
                { title: '6. Tanya AI', body: 'Gunakan tombol AI di layar untuk minta ringkasan PO/PRL, jadwal terlambat, DN pending, Mill Sheet, atau performa periode berjalan.' },
              ].map((step) => (
                <div key={step.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">{step.title}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-600">{step.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Printer size={18} /> SOP Label Incoming
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 text-left">Kondisi</th>
                    <th className="p-3 text-left">Yang Dilakukan Supplier</th>
                    <th className="p-3 text-left">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Semua item dikirim sesuai DN', 'Klik Qty = DN Semua, pastikan lot, lalu print.', 'Custom package boleh kosong agar otomatis mengikuti SNP.'],
                    ['Hanya item tertentu butuh custom package', 'Centang item terkait, isi Custom Package Bulk, klik Apply Dipilih.', 'Contoh isi 70 untuk pecah otomatis per label 70 + sisa.'],
                    ['Qty aktual berbeda dari DN', 'Edit Qty Kirim Aktual pada baris item terkait.', 'Sistem akan memberi warning partial jika qty kurang dari DN.'],
                    ['Lot perlu diganti', 'Edit Lot Supplier pada baris item atau klik Lot Dipilih untuk item tercentang.', 'Lot masuk ke QR label incoming.'],
                    ['Sebelum kirim barang', 'Print Label Schedule atau DN + Label 1 DN sesuai jalur supplier dan tempel pada barang.', 'Receiving akan scan label untuk auto-pilih PO, schedule, item, dan qty. Input manual tetap tersedia bila label belum ada.'],
                    ['Mill Sheet belum siap saat kirim', 'Tetap kirim barang dan upload dokumen susulan lewat menu Mill Sheet.', 'RN dan stok tetap diproses; dokumen akan masuk kontrol QC sampai lengkap.'],
                    ['AI supplier portal', 'Klik tombol AI dan tuliskan pertanyaan spesifik.', 'AI hanya membaca data supplier yang sedang login: PO/PRL, jadwal, DN, Mill Sheet, dan performa.'],
                    ['PRL sudah dirilis', 'Cek bagian PRL Rilis pada tab PO / PRL.', 'PRL menjadi referensi kebutuhan forecast supplier dan tidak menggantikan PO resmi.'],
                  ].map(([condition, action, note]) => (
                    <tr key={condition} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-slate-800">{condition}</td>
                      <td className="p-3 text-slate-600">{action}</td>
                      <td className="p-3 text-slate-500">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView !== 'guide' && (
        <>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter size={16} /> Filter & Pencarian
        </div>

        {activeView === 'po' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Cari PO / PRL / Item</label>
              <div className="flex items-center gap-2 mt-1">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ketik nomor PO, PRL, atau item..."
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
                <option value="too early">Too Early &gt; H-1</option>
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
        ) : activeView === 'dn' ? (
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
        ) : activeView === 'millsheet' ? (
          <div className="space-y-4">
            <form onSubmit={submitMillsheet} className="grid grid-cols-1 gap-3 lg:grid-cols-6">
              <div>
                <label className="text-xs font-semibold text-slate-500">DN / RN Pending</label>
                <SearchableSelectDropdown
                  className="mt-1"
                  controlClassName="rounded-lg shadow-none"
                  value={millsheetForm.referenceKey}
                  options={millsheetPendingOptions}
                  placeholder="Pilih DN/RN pending Mill Sheet"
                  searchPlaceholder="Cari DN / PO / RN / item..."
                  emptyText="Tidak ada DN/RN pending Mill Sheet."
                  onChange={selectMillsheetPendingReference}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  disabled={millsheetLoading || millsheetPendingOptions.length === 0}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Item Code</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Opsional"
                  value={millsheetForm.itemCode}
                  onChange={(event) => setMillsheetForm((prev) => ({ ...prev, itemCode: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Lot Supplier</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Opsional"
                  value={millsheetForm.lotSupplier}
                  onChange={(event) => setMillsheetForm((prev) => ({ ...prev, lotSupplier: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">No Certificate</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Opsional"
                  value={millsheetForm.certificateNo}
                  onChange={(event) => setMillsheetForm((prev) => ({ ...prev, certificateNo: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Tgl Certificate</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={millsheetForm.certificateDate}
                  onChange={(event) => setMillsheetForm((prev) => ({ ...prev, certificateDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">File PDF/JPG/PNG</label>
                <input
                  id="supplier-millsheet-file"
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  onChange={(event) => setMillsheetForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
                />
              </div>
              <div className="lg:col-span-6 flex flex-wrap items-center gap-2">
                <div className="flex min-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Search size={14} className="text-slate-400" />
                  <input
                    className="w-full text-sm outline-none"
                    value={millsheetSearch}
                    onChange={(event) => setMillsheetSearch(event.target.value)}
                    placeholder="Cari DN / PO / schedule / RN / item / lot / certificate"
                  />
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  type="submit"
                  disabled={millsheetSaving}
                >
                  {millsheetSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload Mill Sheet
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                  type="button"
                  onClick={fetchMillsheets}
                  disabled={millsheetLoading}
                >
                  Terapkan Cari
                </button>
              </div>
            </form>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Jika Mill Sheet belum tersedia saat kirim, barang tetap bisa diterima. Dokumen wajib dilengkapi sesuai tenggang dan akan direview oleh QC.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Periode Mulai</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={reportDraft.start}
                onChange={(event) => setReportDraft((prev) => ({ ...prev, start: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Periode Akhir</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                value={reportDraft.end}
                onChange={(event) => setReportDraft((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-2"
                onClick={applyReportFilters}
                type="button"
              >
                <Search size={14} /> Terapkan
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                onClick={resetReportFilters}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        )}
        {activeView === 'report' && (
          <div className="space-y-4">
            {reportLoading && (
              <div className="p-6 text-center text-slate-500">
                <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat laporan performa...
              </div>
            )}
            {!reportLoading && reportError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{reportError}</div>
            )}
            {!reportLoading && !reportError && !reportData && (
              <div className="p-6 text-center text-slate-500">Belum ada laporan performa.</div>
            )}
            {!reportLoading && !reportError && reportData && (() => {
              const summary = reportData.summary || {};
              const monthly = Array.isArray(reportData.monthly) ? reportData.monthly : [];
              const schedules = Array.isArray(reportData.schedules) ? reportData.schedules : [];
              const deliveryNotes = Array.isArray(reportData.deliveryNotes) ? reportData.deliveryNotes : [];
              const rating = Number(summary.rating || 0);
              const ratingClass = rating >= 4 ? 'bg-emerald-100 text-emerald-700' : rating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
              const kpiTiles = [
                { label: 'Total Score', value: `${summary.weightedScore ?? 0}%`, icon: Trophy, tone: 'text-indigo-700 bg-indigo-50' },
                { label: 'Ketepatan Waktu', value: `${summary.timeScore ?? 0}%`, icon: Clock3, tone: 'text-sky-700 bg-sky-50' },
                { label: 'Fulfillment Qty', value: `${summary.qtyScoreRaw ?? summary.qtyScore ?? 0}%`, icon: BarChart3, tone: 'text-emerald-700 bg-emerald-50' },
                { label: 'QC + Line Claim', value: `${summary.qcScore ?? 0}%`, icon: ShieldCheck, tone: 'text-violet-700 bg-violet-50' },
              ];
              return (
                <>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                    {kpiTiles.map((tile) => {
                      const TileIcon = tile.icon;
                      return (
                        <div key={tile.label} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tile.tone}`}>
                            <TileIcon size={18} />
                          </div>
                          <div className="mt-3 text-xs font-semibold uppercase text-slate-400">{tile.label}</div>
                          <div className="mt-1 text-2xl font-bold text-slate-900">{tile.value}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{reportData.supplier?.name || '-'}</div>
                        <div className="text-xs text-slate-500">
                          Periode {formatDate(reportData.period?.start)} s/d {formatDate(reportData.period?.end)}
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${ratingClass}`}>
                        {[...Array(5)].map((_, index) => (
                          <Star key={index} size={14} className={index < rating ? 'fill-current' : ''} />
                        ))}
                        {summary.ratingLabel || '-'}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                      {[
                        ['Jadwal', summary.totalSchedules],
                        ['On Time', summary.onTime],
                        ['Late', summary.late],
                        ['Late Completion', summary.lateCompletion],
                        ['Partial OK', summary.partialOnTime],
                        ['Partial Late', summary.partialLate],
                        ['Too Early', summary.tooEarly],
                        ['Pending', summary.pending],
                        ['QC Open', summary.qcOpen],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-50 p-3 text-center">
                          <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{formatQty(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                        <BarChart3 size={16} /> Trend Bulanan
                      </div>
                      {monthly.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-500">Belum ada data bulanan.</div>
                      ) : (
                        <div className="space-y-3">
                          {monthly.map((row) => (
                            <div key={row.month}>
                              <div className="mb-1 flex justify-between text-xs text-slate-600">
                                <span className="font-semibold">{row.month}</span>
                                <span>{row.weightedScore}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-indigo-500"
                                  style={{ width: `${Math.max(0, Math.min(100, Number(row.weightedScore || 0)))}%` }}
                                />
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                On-time qty {formatQty(row.onTimeQty)} / {formatQty(row.requestQty)}, late qty {formatQty(row.lateQty)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Truck size={16} /> Ringkasan DN
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Total DN', summary.dnCount],
                          ['Completed', summary.dnCompleted],
                          ['Pending', summary.dnPending],
                          ['Selisih/Reject', summary.dnIssue],
                          ['Qty DN', summary.dnDocQty],
                          ['Qty Diterima', summary.dnReceivedQty],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-slate-50 p-3">
                            <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
                            <div className="mt-1 text-lg font-bold text-slate-900">{formatQty(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <ClipboardCheck size={16} /> Detail Jadwal Performa
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="p-2 text-left">PO</th>
                            <th className="p-2 text-left">Item</th>
                            <th className="p-2 text-left">Tgl Rencana</th>
                            <th className="p-2 text-left">Tgl Tiba</th>
                            <th className="p-2 text-right">Qty Rencana</th>
                            <th className="p-2 text-right">Qty Tiba</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules.slice(0, 100).map((row) => (
                            <tr key={`${row.id}-${row.poNumber}-${row.itemCode}`} className="border-t border-slate-100">
                              <td className="p-2 font-semibold text-slate-800">{row.poNumber || '-'}</td>
                              <td className="p-2">{row.itemCode || '-'}</td>
                              <td className="p-2">{formatDate(row.requestDate)}</td>
                              <td className="p-2">{row.arrivalDate ? formatDate(row.arrivalDate) : '-'}</td>
                              <td className="p-2 text-right">{formatQty(row.requestQty)}</td>
                              <td className="p-2 text-right">{formatQty(row.receivedQty)}</td>
                              <td className="p-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${resolveStatusBadge(row.status)}`}>
                                  {row.status || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {schedules.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-slate-500">Tidak ada jadwal pada periode ini.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Package size={16} /> Detail DN Performa
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="p-2 text-left">DN</th>
                            <th className="p-2 text-left">Tanggal</th>
                            <th className="p-2 text-left">Tracking</th>
                            <th className="p-2 text-right">Qty DN</th>
                            <th className="p-2 text-right">Qty Terima</th>
                            <th className="p-2 text-right">Selisih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryNotes.slice(0, 100).map((row) => (
                            <tr key={`${row.dnNumber}-${row.plannedDate}`} className="border-t border-slate-100">
                              <td className="p-2 font-semibold text-slate-800">{row.dnNumber || '-'}</td>
                              <td className="p-2">{formatDate(row.plannedDate)}</td>
                              <td className="p-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${resolveTrackingBadge(row.trackingStatus)}`}>
                                  {row.trackingStatus || '-'}
                                </span>
                              </td>
                              <td className="p-2 text-right">{formatQty(row.docQty)}</td>
                              <td className="p-2 text-right">{formatQty(row.receivedQty)}</td>
                              <td className="p-2 text-right">{formatQty(row.diffQty)}</td>
                            </tr>
                          ))}
                          {deliveryNotes.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-500">Tidak ada DN pada periode ini.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-slate-600">
            {activeView === 'po'
              ? `Total PO: ${poTotal} | PRL Rilis: ${prlTotal}`
              : activeView === 'schedule'
                ? `Total Jadwal: ${scheduleTotal}`
                : activeView === 'dn'
                  ? `Total DN: ${dnTotal}`
                  : activeView === 'millsheet'
                    ? `Mill Sheet: ${millsheetRows.length} file, ${millsheetPendingOptions.length} DN/RN pending`
                    : `Rapor Performa: ${reportData?.supplier?.name || '-'}`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={() => {
                if (activeView === 'po') {
                  fetchPoList();
                  fetchPrlList();
                }
                else if (activeView === 'schedule') fetchScheduleList();
                else if (activeView === 'dn') fetchDnList();
                else if (activeView === 'millsheet') fetchMillsheets();
                else fetchSupplierPerformance();
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handlePrintPo : activeView === 'schedule' ? handlePrintSchedule : activeView === 'dn' ? handlePrintDn : handlePrintPerformance}
              disabled={activeView === 'millsheet'}
            >
              <Printer size={14} /> Print
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handleExportPoCsv : activeView === 'schedule' ? handleExportScheduleCsv : activeView === 'dn' ? handleExportDnCsv : handleExportPerformanceCsv}
              disabled={activeView === 'millsheet'}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-2"
              type="button"
              onClick={activeView === 'po' ? handleExportPoExcel : activeView === 'schedule' ? handleExportScheduleExcel : activeView === 'dn' ? handleExportDnExcel : handleExportPerformanceExcel}
              disabled={activeView === 'millsheet'}
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>

        {activeView === 'po' ? (
          <>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-slate-600">
            <div>Halaman PO {poPage} dari {poTotalPages}</div>
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
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">PRL Rilis Supplier</div>
                <div className="text-xs text-slate-500">Forecast kebutuhan yang sudah dirilis internal dan tampil sebagai referensi PO/PRL supplier.</div>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Total {prlTotal} item
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 text-left">No PRL</th>
                    <th className="p-3 text-left">Periode</th>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-left">Nama Item</th>
                    <th className="p-3 text-left">Part No</th>
                    <th className="p-3 text-left">Model</th>
                    <th className="p-3 text-right">Qty Rilis</th>
                    <th className="p-3 text-left">UOM</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prlLoading && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500">
                        <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat PRL...
                      </td>
                    </tr>
                  )}
                  {!prlLoading && prlError && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-rose-600">{prlError}</td>
                    </tr>
                  )}
                  {!prlLoading && !prlError && prlRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500">Belum ada PRL rilis untuk supplier ini.</td>
                    </tr>
                  )}
                  {prlRows.map((row) => (
                    <tr key={`${row.prl_number}-${row.item_code}-${row.month_key}-${row.year}`} className="border-t border-slate-100">
                      <td className="p-3 font-semibold text-slate-800">{row.prl_number}</td>
                      <td className="p-3">{row.month_label || `${String(row.month_key || '').toUpperCase()} ${row.year || ''}`}</td>
                      <td className="p-3 font-semibold text-slate-800">{row.item_code}</td>
                      <td className="p-3">{row.item_name || '-'}</td>
                      <td className="p-3">{row.part_no || '-'}</td>
                      <td className="p-3">{row.model || '-'}</td>
                      <td className="p-3 text-right font-semibold">{formatQty(row.qty_released)}</td>
                      <td className="p-3">{row.uom || '-'}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          RILIS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <div>Halaman PRL {prlPage} dari {prlTotalPages}</div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="border border-slate-200 rounded-lg px-2 py-1"
                  value={prlPageSize}
                  onChange={(event) => { setPrlPageSize(Number(event.target.value)); setPrlPage(1); }}
                >
                  {[25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>{size} / halaman</option>
                  ))}
                </select>
                <button
                  className="px-3 py-1 rounded border border-slate-200"
                  type="button"
                  onClick={() => setPrlPage((prev) => Math.max(1, prev - 1))}
                  disabled={prlPage <= 1}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1 rounded border border-slate-200"
                  type="button"
                  onClick={() => setPrlPage((prev) => Math.min(prlTotalPages, prev + 1))}
                  disabled={prlPage >= prlTotalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          </>
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
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {scheduleLoading && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat data...
                    </td>
                  </tr>
                )}
                {!scheduleLoading && scheduleError && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-rose-600">{scheduleError}</td>
                  </tr>
                )}
                {!scheduleLoading && !scheduleError && scheduleRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500">Tidak ada data jadwal.</td>
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
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => openScheduleLabelModal(row)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <QrCode size={14} /> Label
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeView === 'dn' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Detail</th>
                  <th className="p-3 text-left">No DN</th>
                  <th className="p-3 text-left">Tgl DN</th>
                  <th className="p-3 text-left">Progress Delivery</th>
                  <th className="p-3 text-left">Status Tracking</th>
                  <th className="p-3 text-left">Status DN</th>
                  <th className="p-3 text-left">Mill Sheet</th>
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
                    <td colSpan={13} className="p-6 text-center text-slate-500">
                      <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat data...
                    </td>
                  </tr>
                )}
                {!dnLoading && dnError && (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-rose-600">{dnError}</td>
                  </tr>
                )}
                {!dnLoading && !dnError && dnRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-slate-500">Tidak ada data DN.</td>
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
                        <td className="p-3 align-top">{renderDeliveryProgress(row, { compact: true })}</td>
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
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${resolveMillsheetBadge(row.millsheet_status || row.millsheetStatus)}`}>
                            {formatMillsheetStatus(row.millsheet_status || row.millsheetStatus)}
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
                          <td colSpan={13} className="bg-slate-50/60 p-4">
                            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="text-xs font-semibold text-slate-500">Detail Item DN</div>
                                <div className="text-[11px] text-slate-400">Cetak Label Incoming agar receiving cukup scan QR per package.</div>
                              </div>
                              <button
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                type="button"
                                onClick={() => openDnLabelModal(dnNumber)}
                                disabled={detail?.loading}
                              >
                                <Package size={14} /> Label 1 DN
                              </button>
                            </div>
                            {detail?.loading && (
                              <div className="text-sm text-slate-500"><Loader2 size={14} className="animate-spin inline-block mr-2" />Memuat detail...</div>
                            )}
                            {detail?.error && (
                              <div className="text-sm text-rose-600">{detail.error}</div>
                            )}
                            {!detail?.loading && !detail?.error && (
                              <div className="mb-3">
                                {renderDeliveryProgress(detail?.header || row)}
                              </div>
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
        ) : activeView === 'millsheet' ? (
          <div className="space-y-4">
            {millsheetError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{millsheetError}</div>
            )}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock3 size={16} /> DN/RN Perlu Mill Sheet
                </div>
                <div className="space-y-2">
                  {millsheetLoading && (
                    <div className="py-4 text-center text-sm text-slate-500">
                      <Loader2 size={16} className="mr-2 inline-block animate-spin" /> Memuat...
                    </div>
                  )}
                  {!millsheetLoading && millsheetPendingDns.length === 0 && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Tidak ada DN/RN pending.</div>
                  )}
                  {!millsheetLoading && millsheetPendingOptions.map((row) => (
                    <button
                      key={`pending-ms-${row.id}`}
                      type="button"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50"
                      onClick={() => selectMillsheetPendingReference(row.value || '', row)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">{row.type === 'rn' ? `RN ${row.rnNumber || '-'}` : `DN ${row.dnNumber || '-'}`}</div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${resolveMillsheetBadge(row.millsheetStatus)}`}>
                          {formatMillsheetStatus(row.millsheetStatus)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.poNumbers ? `PO ${row.poNumbers} | ` : ''}{row.rnNumbers ? `RN ${row.rnNumbers} | ` : ''}File {formatQty(row.documentCount)}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {row.itemSummary || row.itemCodes || 'Item belum terbaca'}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Due {formatDateTime(row.millsheetDueAt)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-3 text-left">Dokumen</th>
                      <th className="p-3 text-left">DN / RN</th>
                      <th className="p-3 text-left">Item / Lot</th>
                      <th className="p-3 text-left">Certificate</th>
                      <th className="p-3 text-left">Status QC</th>
                      <th className="p-3 text-left">Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {millsheetLoading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          <Loader2 size={18} className="mr-2 inline-block animate-spin" /> Memuat Mill Sheet...
                        </td>
                      </tr>
                    )}
                    {!millsheetLoading && millsheetRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">Belum ada file Mill Sheet.</td>
                      </tr>
                    )}
                    {!millsheetLoading && millsheetRows.map((row) => (
                      <tr key={`ms-row-${row.id}`} className="border-t border-slate-100 align-top">
                        <td className="p-3">
                          <a
                            className="inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900"
                            href={row.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileText size={14} /> {row.fileName || 'Mill Sheet'}
                          </a>
                          <div className="mt-1 text-[11px] text-slate-400">Hash {String(row.fileHash || '').slice(0, 12)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{row.dnNumber || '-'}</div>
                          <div className="text-xs text-slate-500">{row.rnNumber || '-'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{row.itemCode || 'Semua item'}</div>
                          <div className="text-xs text-slate-500">{row.lotSupplier || '-'}</div>
                        </td>
                        <td className="p-3">
                          <div>{row.certificateNo || '-'}</div>
                          <div className="text-xs text-slate-500">{formatDate(row.certificateDate)}</div>
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${resolveMillsheetBadge(row.status)}`}>
                            {formatMillsheetStatus(row.status)}
                          </span>
                          {row.qcNotes && <div className="mt-1 text-xs text-slate-500">{row.qcNotes}</div>}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          <div>{formatDateTime(row.uploadedAt)}</div>
                          <div className="text-slate-400">v{row.uploadVersion || 1}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {activeView === 'schedule' ? (
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
        ) : activeView === 'dn' ? (
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
        ) : null}
      </div>
        </>
      )}

      {scheduleLabelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 supplier-label-print-scope">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl supplier-label-print-shell">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 supplier-label-print-hidden">
              <div>
                <div className="text-sm font-semibold text-slate-900">Label Schedule Incoming</div>
                <div className="text-xs text-slate-500">Tempel label ini pada barang agar receiving cukup scan QR schedule.</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={scheduleLabelModal.loading || !scheduleLabelModal.data}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleLabelModal({ open: false, loading: false, error: '', data: null })}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-5 supplier-label-print-wrap">
              {scheduleLabelModal.loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  <Loader2 size={18} className="mr-2 inline-block animate-spin" /> Membuat label...
                </div>
              )}
              {!scheduleLabelModal.loading && scheduleLabelModal.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{scheduleLabelModal.error}</div>
              )}
              {!scheduleLabelModal.loading && scheduleLabelModal.data && (() => {
                const data = scheduleLabelModal.data;
                return (
                  <div className="supplier-package-label supplier-kanban-card bg-white">
                    <div className="supplier-kanban-card__body">
                      <div className="supplier-kanban-card__top">
                        <div className="border-r-2 border-black flex flex-col items-center justify-center px-1 text-center">
                          <div className="text-[8pt] font-black leading-tight">{data.schedule?.requestDate ? formatDate(data.schedule.requestDate) : '-'}</div>
                          <div className="text-[5pt] font-semibold uppercase tracking-wide text-slate-700">{data.schedule?.deliveryTime || '-'}</div>
                        </div>
                        <div className="border-r-2 border-black flex flex-col items-center justify-center px-1 text-center leading-tight">
                          <div className="text-[7pt] font-black">E-KANBAN CARD</div>
                          <div className="text-[5pt] font-semibold">SCHEDULE INCOMING</div>
                        </div>
                        <div className="flex items-center justify-center">
                          <QRCodeSVG value={data.qrValue || data.token || '-'} size={32} />
                        </div>
                      </div>

                      <div className="supplier-kanban-card__middle">
                        <div className="supplier-kanban-card__main">
                          <div className="px-2 pt-2">
                            <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">PO / Schedule</div>
                            <div className="break-all text-[12pt] font-extrabold leading-tight">{data.schedule?.poNumber || '-'}</div>
                            <div className="mt-1 text-[6pt] font-semibold text-slate-700">SCH-{data.schedule?.id || '-'} | {data.supplier?.id || data.supplier?.name || '-'}</div>
                          </div>
                          <div className="grid grid-cols-[32mm_1fr] border-t-2 border-black">
                            <div className="border-r-2 border-black p-2">
                              <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Qty</div>
                              <div className="font-extrabold leading-none tracking-tight text-[20pt]">{formatQty(data.schedule?.remainingQty || data.schedule?.requestQty || 0)}</div>
                              <div className="mt-1 text-[6pt] font-bold">{data.item?.unit || ''}</div>
                            </div>
                            <div className="p-2">
                              <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">UNIQ / Item</div>
                              <div className="break-all text-[10pt] font-bold">{data.item?.code || '-'}</div>
                              <div className="mt-1 text-[6pt] font-semibold leading-tight text-slate-700">{data.item?.name || '-'}</div>
                              <div className="mt-1 text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Token</div>
                              <div className="break-all text-[7pt] font-bold">{data.token || '-'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="supplier-kanban-card__meta">
                          <div className="supplier-meta-line">
                            <span>PO LINE</span>
                            <strong>{data.poLine?.lineNo || '-'}</strong>
                          </div>
                          <div className="supplier-meta-line">
                            <span>SNP</span>
                            <strong>{data.item?.packQty ? formatQty(data.item.packQty) : '-'}</strong>
                          </div>
                          <div className="supplier-meta-chip">SCAN FIRST</div>
                          <div className="supplier-meta-qr">
                            <QRCodeSVG value={data.qrValue || data.token || '-'} size={48} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {labelModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 supplier-label-print-scope"
          onClick={closeLabelModal}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supplier-label-print-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 supplier-label-print-hidden">
              <div>
                <div className="text-sm font-semibold text-slate-900">Label Incoming Supplier</div>
                <div className="text-xs text-slate-500">
                  DN {labelModal.dnNumber || '-'} - cover DN dan semua label package dicetak sekaligus.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={() => window.print()}
                  disabled={labelBuild.errors.length > 0 || labelBuild.labels.length === 0}
                >
                  <Printer size={14} /> Print DN + Label 1 DN ({labelBuild.labels.length})
                </button>
                <button
                  type="button"
                  onClick={closeLabelModal}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto bg-slate-50 p-5 supplier-label-print-wrap">
              <div className="mb-4 space-y-3 supplier-label-print-hidden">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Input Cepat Label</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Satu angka di custom package berarti qty per label; contoh 70 untuk otomatis 70 + 70 + sisa.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => applyDnQtyToLabels(false)}
                      >
                        Qty = DN Semua
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => applyDnQtyToLabels(true)}
                        disabled={labelSelectedKeys.length === 0}
                      >
                        Qty = DN Dipilih ({labelSelectedKeys.length})
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => applyDefaultLotToLabels(false)}
                      >
                        Generate Lot Semua
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => applyDefaultLotToLabels(true)}
                        disabled={labelSelectedKeys.length === 0}
                      >
                        Lot Dipilih
                      </button>
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Custom Package Bulk</label>
                          <input
                            className="mt-1 w-44 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            placeholder="Kosong = SNP, cth: 70"
                            value={labelBulkDraft.packageText}
                            onChange={(event) => setLabelBulkDraft((prev) => ({ ...prev, packageText: event.target.value }))}
                          />
                        </div>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          onClick={() => applyPackageTextToLabels(false)}
                          disabled={!String(labelBulkDraft.packageText || '').trim()}
                        >
                          Apply Semua
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          onClick={() => applyPackageTextToLabels(true)}
                          disabled={!String(labelBulkDraft.packageText || '').trim() || labelSelectedKeys.length === 0}
                        >
                          Apply Dipilih
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => clearPackageTextForLabels(false)}
                        >
                          Reset Custom
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => clearPackageTextForLabels(true)}
                          disabled={labelSelectedKeys.length === 0}
                        >
                          Reset Dipilih
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="w-10 p-2 text-center">
                          <input
                            type="checkbox"
                            checked={(labelModal.items || []).length > 0 && labelSelectedKeys.length === (labelModal.items || []).length}
                            onChange={(event) => toggleAllLabelItemSelection(event.target.checked)}
                            title="Pilih semua item"
                          />
                        </th>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-right">Qty DN</th>
                        <th className="p-2 text-right">SNP</th>
                        <th className="p-2 text-left">Auto Package</th>
                        <th className="p-2 text-left">Qty Kirim Aktual</th>
                        <th className="p-2 text-left">Lot Supplier</th>
                        <th className="p-2 text-left">Custom Package</th>
                        <th className="p-2 text-left">Lokasi / Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(labelModal.items || []).map((item, index) => {
                        const itemKey = getDnItemKey(item, index);
                        const control = labelModal.controls?.[itemKey] || {};
                        const docQty = getDnDocQty(item);
                        const packQty = getDnPackQty(item);
                        const shipmentQty = Number(control.shipmentQty || docQty);
                        const autoPackages = resolvePackageQtys(control.packageText, shipmentQty, packQty);
                        const isSelected = labelSelectedKeys.includes(itemKey);
                        return (
                          <tr key={`label-control-${itemKey}`} className={`border-t border-slate-100 align-top ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLabelItemSelection(itemKey)}
                                title={`Pilih ${getDnItemCode(item) || 'item'}`}
                              />
                            </td>
                            <td className="p-2">
                              <div className="font-semibold text-slate-900">{getDnItemCode(item) || '-'}</div>
                              <div className="mt-0.5 max-w-[280px] text-[11px] text-slate-500">{getDnItemName(item) || '-'}</div>
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-800">{formatQty(docQty)} {item.unit || ''}</td>
                            <td className="p-2 text-right">{packQty > 0 ? formatQty(packQty) : '-'}</td>
                            <td className="p-2">
                              <div className="max-w-[210px] break-words text-[11px] text-slate-500">
                                {autoPackages.join(' + ') || '-'}
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                value={control.shipmentQty || ''}
                                onChange={(event) => updateLabelControl(itemKey, 'shipmentQty', event.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                value={control.lotNo || ''}
                                onChange={(event) => updateLabelControl(itemKey, 'lotNo', event.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                placeholder="Auto / 70 / 70,70,40"
                                value={control.packageText || ''}
                                onChange={(event) => updateLabelControl(itemKey, 'packageText', event.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <div className="max-w-[220px] text-[11px] text-slate-500">
                                {getDnLocationLabel(item)} / {getDnNextProcessLabel(item)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {(labelBuild.errors.length > 0 || labelBuild.warnings.length > 0) && (
                <div className="mb-4 space-y-2 supplier-label-print-hidden">
                  {labelBuild.errors.map((message) => (
                    <div key={`label-error-${message}`} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {message}
                    </div>
                  ))}
                  {labelBuild.warnings.map((message) => (
                    <div key={`label-warning-${message}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {message}
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 supplier-dn-cover">
                <table className="w-full border border-slate-900 text-[10px] text-slate-900 supplier-dn-table">
                  <thead>
                    <tr>
                      <th colSpan={9} className="border-b border-slate-900 p-0">
                        <div className="grid grid-cols-[1.35fr_88px_1fr] gap-3 p-3 text-left">
                          <div className="flex items-start gap-3">
                            <img src={logoPrl} alt="MRP Logo" className="h-9 object-contain" />
                            <div>
                              <div className="text-[12px] font-black uppercase">PT. MATRA RODA PIRANTI</div>
                              <div className="text-[9px] font-semibold text-slate-500">Departemen Logistik (PPIC)</div>
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <div className="border border-slate-400 bg-white p-1">
                              <QRCodeSVG value={supplierDnSummary.qrValue || supplierDnSummary.dnNumber || '-'} size={76} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black uppercase tracking-wide">Delivery Note</div>
                            <div className="mt-1 font-bold">{supplierDnSummary.dnNumber || '-'}</div>
                            <div className="text-[9px] text-slate-500">PRINT DATE : {supplierDnSummary.printDate}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-900 p-3 text-left">
                          <div className="space-y-1">
                            <div><span className="inline-block w-20 font-bold uppercase">Supplier</span>: {supplierDnSummary.supplierLabel}</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Date</span>: {formatDate(supplierDnSummary.plannedDate)}</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Del. To</span>: PT. MATRA RODA PIRANTI</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Recipient</span>: PPIC / Receiving Warehouse</div>
                          </div>
                          <div className="space-y-1">
                            <div><span className="inline-block w-20 font-bold uppercase">Cycle</span>: {supplierDnSummary.cycle || '-'}</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Delivery</span>: {formatDate(supplierDnSummary.plannedDate)}</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Rit/Time</span>: {supplierDnSummary.rit || '-'} / {supplierDnSummary.deliveryTime || '-'}</div>
                            <div><span className="inline-block w-20 font-bold uppercase">Area</span>: -</div>
                          </div>
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-900 p-1 text-center">NO.</th>
                      <th className="border border-slate-900 p-1 text-center">UNIQ</th>
                      <th className="border border-slate-900 p-1 text-left">PART NUMBER / PART NAME</th>
                      <th className="border border-slate-900 p-1 text-center">PACKING</th>
                      <th className="border border-slate-900 p-1 text-center">DROP ZONE</th>
                      <th className="border border-slate-900 p-1 text-center">UNIT</th>
                      <th className="border border-slate-900 p-1 text-right">SNP</th>
                      <th className="border border-slate-900 p-1 text-right">ORDER KBN</th>
                      <th className="border border-slate-900 p-1 text-right">ORDER UNIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierDnSummary.rows.map((row) => (
                      <tr key={`supplier-dn-${row.itemCode}-${row.no}`}>
                        <td className="border border-slate-900 p-1 text-center">{row.no}</td>
                        <td className="border border-slate-900 p-1 text-center font-bold">{row.itemCode || '-'}</td>
                        <td className="border border-slate-900 p-1">
                          <div className="font-bold">{row.partNo || '-'}</div>
                          <div className="text-[9px]">{row.itemName || '-'}</div>
                        </td>
                        <td className="border border-slate-900 p-1 text-center">{row.packing || '-'}</td>
                        <td className="border border-slate-900 p-1 text-center">{row.dropZone || '-'}</td>
                        <td className="border border-slate-900 p-1 text-center">{row.unit || '-'}</td>
                        <td className="border border-slate-900 p-1 text-right">{row.snp > 0 ? formatQty(row.snp) : '-'}</td>
                        <td className="border border-slate-900 p-1 text-right">{formatQty(row.orderKbn || 0)}</td>
                        <td className="border border-slate-900 p-1 text-right">{formatQty(row.orderUnit || 0)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={7} className="border border-slate-900 p-1 text-right">Total</td>
                      <td className="border border-slate-900 p-1 text-right">{formatQty(supplierDnSummary.totals.orderKbn)}</td>
                      <td className="border border-slate-900 p-1 text-right">{formatQty(supplierDnSummary.totals.orderUnit)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="border border-t-0 border-slate-900 p-2 text-[10px] text-slate-900">
                  <div className="font-bold">Remarks :</div>
                  <div className="min-h-[28px] whitespace-pre-wrap">{supplierDnSummary.remarks || ''}</div>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_1.4fr_1fr] gap-3 text-[9px] text-slate-900">
                  <div className="border border-slate-900">
                    <div className="border-b border-slate-900 py-1 text-center font-bold">SECURITY</div>
                    <div className="h-14 border-b border-slate-900" />
                    <div className="px-2 py-1">Date:</div>
                  </div>
                  <div className="border border-slate-900">
                    <div className="grid grid-cols-2 border-b border-slate-900 text-center font-bold">
                      <div className="border-r border-slate-900 py-1">CONTROL MAN</div>
                      <div className="py-1">RECEIVED</div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-slate-900">
                      <div className="h-14 border-r border-slate-900" />
                      <div className="h-14" />
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="border-r border-slate-900 px-2 py-1">Date:</div>
                      <div className="px-2 py-1">Date:</div>
                    </div>
                  </div>
                  <div className="border border-slate-900">
                    <div className="py-1 text-center font-bold">SUPPLIER</div>
                    <div className="grid grid-cols-2 border-y border-slate-900 text-center font-bold">
                      <div className="border-r border-slate-900 py-1">APPROVED</div>
                      <div className="py-1">PREPARED</div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-slate-900">
                      <div className="h-14 border-r border-slate-900" />
                      <div className="h-14" />
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="border-r border-slate-900 px-2 py-1">Date:</div>
                      <div className="px-2 py-1">Date:</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 supplier-label-grid md:grid-cols-2">
                {labelBuild.labels.map((label) => {
                  const qtyText = formatQty(label.packageQty);
                  const partNoSize = String(label.partNo || label.itemCode || '').length > 16 ? '18pt' : '22pt';
                  const qtySize = String(qtyText || '').length > 5 ? '17pt' : '22pt';
                  return (
                    <div key={label.key} className="supplier-package-label supplier-kanban-card">
                      <div className="supplier-kanban-card__body">
                        <div className="supplier-kanban-card__top">
                          <div className="border-r-2 border-black flex flex-col items-center justify-center px-1 text-center">
                            <div className="text-[8pt] font-black leading-tight">{label.locationLabel || '-'}</div>
                            <div className="text-[5pt] font-semibold uppercase tracking-wide text-slate-700">{supplierDnSummary.supplierCode || supplierDnSummary.supplierName || '-'}</div>
                          </div>
                          <div className="border-r-2 border-black flex flex-col items-center justify-center px-1 text-center leading-tight">
                            <div className="text-[7pt] font-black">E-KANBAN CARD</div>
                            <div className="text-[5pt] font-semibold">SUPPLIER INCOMING</div>
                          </div>
                          <div className="flex items-center justify-center">
                            <QRCodeSVG value={label.dnNumber || supplierDnSummary.dnNumber || '-'} size={28} />
                          </div>
                        </div>

                        <div className="supplier-kanban-card__middle">
                          <div className="supplier-kanban-card__main">
                            <div className="px-2 pt-2">
                              <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Part No</div>
                              <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: partNoSize }}>
                                {label.partNo || label.itemCode || '-'}
                              </div>
                              <div className="mt-1 text-[6pt] font-semibold leading-tight text-slate-700">{label.itemName || '-'}</div>
                              <div className="mt-1 text-[6pt] font-bold text-slate-900">UNIQ {label.itemCode || '-'}</div>
                            </div>
                            <div className="grid grid-cols-[32mm_1fr] border-t-2 border-black">
                              <div className="border-r-2 border-black p-2">
                                <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Qty</div>
                                <div className="font-extrabold leading-none tracking-tight" style={{ fontSize: qtySize }}>
                                  {qtyText}
                                </div>
                                <div className="mt-1 text-[6pt] font-bold">{label.unit || ''}</div>
                              </div>
                              <div className="p-2">
                                <div className="text-[6pt] font-semibold uppercase tracking-wide text-slate-700">DN / Lot</div>
                                <div className="break-all text-[7pt] font-bold">{label.dnNumber || '-'} / {label.lotNo || '-'}</div>
                                <div className="mt-1 text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Package</div>
                                <div className="text-[7pt] font-bold">{String(label.packageSeq).padStart(3, '0')} / {String(label.packageTotal).padStart(3, '0')} | SNP {label.packQty > 0 ? formatQty(label.packQty) : '-'}</div>
                                <div className="mt-1 text-[6pt] font-semibold uppercase tracking-wide text-slate-700">Kanban</div>
                                <div className="break-all text-[7pt] font-bold">{label.kanbanId || '-'}</div>
                              </div>
                            </div>
                          </div>

                          <div className="supplier-kanban-card__meta">
                            <div className="supplier-meta-line">
                              <span>CYCLE</span>
                              <strong>{supplierDnSummary.cycle || '-'}</strong>
                            </div>
                            <div className="supplier-meta-line">
                              <span>AREA</span>
                              <strong>{label.nextProcessLabel || '-'}</strong>
                            </div>
                            <div className="supplier-meta-chip">{label.status || '-'}</div>
                            <div className="supplier-meta-qr">
                              <QRCodeSVG value={label.qrValue} size={48} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {labelBuild.labels.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Tidak ada label untuk dicetak.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabSupplierPortal;
