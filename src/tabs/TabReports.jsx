import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  CheckCircle,
  Clock3,
  Coins,
  FileText,
  Loader2,
  ListChecks,
  Printer,
  Sparkles,
  Star,
  ShieldCheck,
  TrendingDown,
  Trophy,
  Truck,
  Wand2,
  X,
} from 'lucide-react';
import logoPrl from '../assets/kop-mrp.png';
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';
import TabReportInbound from './TabReportInbound';

const SafeResponsiveContainer = ({ children }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = containerRef.current;
    if (!node) return undefined;
    let raf;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.floor(rect.width));
      const nextHeight = Math.max(0, Math.floor(rect.height));
      setSize((prev) => (prev.width === nextWidth && prev.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }));
    };
    const scheduleUpdate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateSize);
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(node);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', scheduleUpdate);
      if (observer) observer.disconnect();
    };
  }, []);

  const content = size.width > 0 && size.height > 0 && React.isValidElement(children)
    ? React.cloneElement(children, { width: size.width, height: size.height })
    : null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minWidth: 1, minHeight: 1 }}>
      {content}
    </div>
  );
};

const TabReports = (props) => {
  const {
    apiFetch,
    mainTab,
    reportTab,
    setReportTab,
    reportCategory,
    setReportCategory,
    canViewReport,
    fetchReport,
    handleExportReportExcel,
    reportStart,
    setReportStart,
    reportEnd,
    setReportEnd,
    reportSupplier,
    setReportSupplier,
    reportSummary,
    reportLoading,
    reportRows,
    stockCoverageRows,
    stockCoverageDays,
    setStockCoverageDays,
    slowMovingRows,
    inboundPerformanceRows,
    fifoViolationRows,
    inventoryValueRows,
    inventoryValueTotal,
    supplierShortageRows,
    supplierShortageSummary,
    supplierShortageSupplier,
    setSupplierShortageSupplier,
    supplierShortageSupplierOptions,
    supplierShortageMonth,
    setSupplierShortageMonth,
    supplierShortageYear,
    setSupplierShortageYear,
    rawMaterialLedgerPeriodType,
    setRawMaterialLedgerPeriodType,
    rawMaterialLedgerMonth,
    setRawMaterialLedgerMonth,
    rawMaterialLedgerYear,
    setRawMaterialLedgerYear,
    rawMaterialLedgerCategory,
    setRawMaterialLedgerCategory,
    rawMaterialLedgerLocation,
    setRawMaterialLedgerLocation,
    rawMaterialLedgerRows,
    rawMaterialLedgerLoading,
    rawMaterialLedgerError,
    rawMaterialLedgerMeta,
    outstandingPrlRows,
    allMutationStart,
    setAllMutationStart,
    allMutationEnd,
    setAllMutationEnd,
    allMutationCategory,
    setAllMutationCategory,
    allMutationLocation,
    setAllMutationLocation,
    allMutationRows,
    allMutationLoading,
    allMutationError,
    outstandingPrlMonth,
    outstandingPrlYear,
    setOutstandingPrlMonth,
    setOutstandingPrlYear,
    qualityObjectivesMonth,
    setQualityObjectivesMonth,
    qualityObjectivesSupplier,
    setQualityObjectivesSupplier,
    qualityObjectivesMonthStart,
    setQualityObjectivesMonthStart,
    qualityObjectivesMonthEnd,
    setQualityObjectivesMonthEnd,
    qualityObjectivesYear,
    setQualityObjectivesYear,
    qualityObjectivesData,
    canViewScorecard,
    scorecardFilterSupplier,
    setScorecardFilterSupplier,
    getUniqueSuppliers,
    scorecardSupplierOptions,
    scorecardFilterMonthStart,
    scorecardFilterMonthEnd,
    setScorecardFilterMonthStart,
    setScorecardFilterMonthEnd,
    handlePrintPDF,
    fetchQualityObjectivesReport,
    calculateSupplierPerformance,
    scorecardSchedulesLoading,
    fetchStockCoverageReport,
    fetchSlowMovingReport,
    fetchInboundPerformanceReport,
    fetchFifoViolationReport,
    fetchInventoryValueReport,
    fetchSupplierShortageReport,
    fetchRawMaterialLedgerReport,
    fetchAllMutationReport,
    fetchOutstandingPrlReport,
    handleExportRawMaterialLedgerExcel,
    handleExportStockCoverageExcel,
    handleExportSlowMovingExcel,
    handleExportInboundPerformanceExcel,
    handleExportFifoViolationExcel,
    handleExportInventoryValueExcel,
    handleExportSupplierShortageExcel,
    handleExportOutstandingPrlExcel,
    handleExportQualityObjectivesExcel,
    ensureXlsx,
    masterAreas,
    masterCategories,
    masterLocations,
    masterModelsMap,
    masterProcesses,
    masterVendors,
    formatModelCodes,
    parseModelCodes,
    getWorkingDays,
    capacityPlanningMonth,
    setCapacityPlanningMonth,
    capacityPlanningYear,
    setCapacityPlanningYear,
    capacityPlanningData,
    fetchCapacityPlanningReport,
    handleExportCapacityPlanningExcel,
    scheduleLoading,
    schedules,
    ensureSchedulesLoaded,
  } = props;

  const formatPrintDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  const formatQuantity = (value) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const formatCount = (value) => Number(value || 0).toLocaleString('id-ID');
  const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
  const getModelCodeText = (value) => {
    const parsed = typeof parseModelCodes === 'function' ? parseModelCodes(value) : [];
    const formatted = typeof formatModelCodes === 'function' ? formatModelCodes(masterModelsMap, parsed) : '';
    return formatted || value || '-';
  };
  const countWeekdaysInMonth = (monthKey, yearValue) => {
    const monthNum = monthKeyMap[String(monthKey || '').toLowerCase()];
    const yearNum = Number(yearValue || 0);
    if (!monthNum || !yearNum) return 0;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(yearNum, monthNum - 1, day);
      const weekday = date.getDay();
      if (weekday !== 0 && weekday !== 6) count += 1;
    }
    return count;
  };

  const todayLabel = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const ledgerCategory = rawMaterialLedgerCategory || 'raw';
  const ledgerCategoryLabel = ledgerCategory === 'wip'
    ? 'WIP'
    : ledgerCategory === 'fg'
      ? 'FINISH GOOD'
      : 'RAW MATERIAL';
  const ledgerTitle = `LAPORAN MUTASI ${ledgerCategoryLabel}`;
  const ledgerNote = ledgerCategory !== 'raw' && !rawMaterialLedgerLocation
    ? 'Disarankan pilih lokasi agar saldo lebih akurat.'
    : `Menampilkan kategori ${ledgerCategoryLabel}.`;
  const locationOptions = Array.from(new Set([
    ...(Array.isArray(masterLocations) ? masterLocations.map((row) => row.id).filter(Boolean) : []),
    ...(Array.isArray(masterAreas) ? masterAreas.flatMap((row) => [row.name, row.id]).filter(Boolean) : []),
    ...(Array.isArray(masterProcesses) ? masterProcesses.flatMap((row) => [row.name, row.code]).filter(Boolean) : []),
  ])).sort((a, b) => String(a).localeCompare(String(b)));
  const reportMenuGroups = useMemo(() => {
    const groups = [
      {
        key: 'supplier',
        label: 'Supplier',
        icon: Trophy,
        reports: [
          { key: 'rekap', label: 'Rekap Supplier/PO', icon: FileText, access: canViewReport },
          { key: 'scorecard', label: 'Rapor Kinerja', icon: Trophy, access: canViewScorecard },
          { key: 'sasaran-mutu', label: 'Sasaran Mutu', icon: CheckCircle, access: canViewReport },
          { key: 'supplier-shortage', label: 'Shortage Supplier', icon: AlertTriangle, access: canViewReport },
        ],
      },
      {
        key: 'inventory',
        label: 'Inventory',
        icon: Coins,
        reports: [
          { key: 'stock-coverage', label: 'Stock Coverage', icon: BarChart3, access: canViewReport },
          { key: 'slow-moving', label: 'Slow & Dead Stock', icon: TrendingDown, access: canViewReport },
          { key: 'fifo-violations', label: 'FIFO Violation', icon: AlertTriangle, access: canViewReport },
          { key: 'inventory-value', label: 'Inventory Value', icon: Coins, access: canViewReport },
          { key: 'all-mutations', label: 'All Mutasi', icon: FileText, access: canViewReport },
        ],
      },
      {
        key: 'inbound',
        label: 'Inbound',
        icon: Truck,
        reports: [
          { key: 'inbound-performance', label: 'Inbound Performance', icon: ArrowDownUp, access: canViewReport },
          { key: 'inbound-matrix', label: 'Delivery Matrix', icon: Truck, access: canViewReport },
        ],
      },
      {
        key: 'quality',
        label: 'Quality',
        icon: CheckCircle,
        reports: [
          { key: 'qc-report', label: 'Laporan QC', icon: ShieldCheck, access: canViewReport },
        ],
      },
      {
        key: 'prl',
        label: 'PRL',
        icon: ListChecks,
        reports: [
          { key: 'outstanding-prl', label: 'Outstanding PRL', icon: ListChecks, access: canViewReport },
        ],
      },
      {
        key: 'production',
        label: 'Produksi',
        icon: BarChart3,
        reports: [
          { key: 'capacity-planning', label: 'Capacity Planning', icon: BarChart3, access: canViewReport },
        ],
      },
    ];
    return groups
      .map((group) => ({ ...group, reports: group.reports.filter((report) => report.access) }))
      .filter((group) => group.reports.length > 0);
  }, [canViewReport, canViewScorecard]);
  const reportCategoryByTab = useMemo(() => {
    const map = new Map();
    reportMenuGroups.forEach((group) => {
      group.reports.forEach((report) => map.set(report.key, group.key));
    });
    return map;
  }, [reportMenuGroups]);
  const activeReportCategory = reportCategory || reportCategoryByTab.get(reportTab) || reportMenuGroups[0]?.key || 'supplier';
  const activeReportGroup = reportMenuGroups.find((group) => group.key === activeReportCategory) || reportMenuGroups[0] || null;
  const selectReportCategory = (group) => {
    if (!group) return;
    setReportCategory?.(group.key);
    if (!group.reports.some((report) => report.key === reportTab)) {
      setReportTab?.(group.reports[0]?.key);
    }
  };
  const selectReportTab = (group, tabKey) => {
    setReportCategory?.(group?.key || reportCategoryByTab.get(tabKey) || activeReportCategory);
    setReportTab?.(tabKey);
  };

  const ledgerCategoryOptions = useMemo(() => {
    const normalizeCategory = (value) => {
      const normalized = String(value || '').toLowerCase().trim();
      if (['raw', 'rm', 'raw material'].includes(normalized)) return 'raw';
      if (['wip', 'work in progress', 'work-in-progress'].includes(normalized)) return 'wip';
      if (['fg', 'finish good', 'finished good', 'finished goods', 'finish goods'].includes(normalized)) return 'fg';
      return '';
    };
    const options = [];
    const seen = new Set();
    (Array.isArray(masterCategories) ? masterCategories : []).forEach((category) => {
      const normalized = normalizeCategory(category.code || category.name);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      options.push({
        value: normalized,
        label: `${category.code || normalized} - ${category.name || ''}`.trim(),
      });
    });
    if (options.length === 0) {
      return [
        { value: 'all', label: 'ALL - Semua Kategori' },
        { value: '', label: 'Belum ada kategori di Master Reference', disabled: true },
      ];
    }
    return [
      { value: 'all', label: 'ALL - Semua Kategori' },
      ...options,
    ];
  }, [masterCategories]);

  const [inboundReportTab, setInboundReportTab] = useState('transaction');

  const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const text = String(value).trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatInboundDayLabel = (dateKey) => {
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '-';
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
  };

  const buildDateKeys = (startValue, endValue, rows = []) => {
    const rowDateKeys = rows
      .flatMap((row) => [toDateKey(row?.arrivalDate), toDateKey(row?.requestDate)])
      .filter(Boolean)
      .sort();
    let startKey = toDateKey(startValue) || rowDateKeys[0] || '';
    let endKey = toDateKey(endValue) || rowDateKeys[rowDateKeys.length - 1] || startKey;
    if (!startKey || !endKey) return [];
    let startDate = new Date(`${startKey}T00:00:00`);
    let endDate = new Date(`${endKey}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
      [startKey, endKey] = [endKey, startKey];
    }
    const result = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      result.push(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  };

  const normalizeInboundStatus = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');

  const masterSupplierLookup = useMemo(() => {
    const map = new Map();
    (Array.isArray(masterVendors) ? masterVendors : []).forEach((vendor) => {
      if (!vendor) return;
      const id = String(vendor.id || '').trim();
      const name = String(vendor.name || '').trim();
      if (id) map.set(id.toLowerCase(), vendor);
      if (name) map.set(name.toLowerCase(), vendor);
    });
    return map;
  }, [masterVendors]);

  const resolveInboundSupplierMeta = useCallback((rowOrValue) => {
    const candidates = [];
    if (rowOrValue && typeof rowOrValue === 'object') {
      candidates.push(
        rowOrValue.supplierId,
        rowOrValue.supplier_id,
        rowOrValue.poSupplierId,
        rowOrValue.po_supplier_id,
        rowOrValue.supplier,
        rowOrValue.supplierName,
        rowOrValue.supplier_name,
      );
    } else {
      candidates.push(rowOrValue);
    }
    let fallback = '';
    for (const candidate of candidates) {
      const text = String(candidate || '').trim();
      if (!text) continue;
      if (!fallback) fallback = text;
      const vendor = masterSupplierLookup.get(text.toLowerCase());
      if (vendor) {
        const id = String(vendor.id || text).trim();
        const name = String(vendor.name || id || text).trim();
        return {
          key: id || name || text,
          name: name || id || text,
          label: id && name && id !== name ? `${id} - ${name}` : (name || id || text),
        };
      }
    }
    return {
      key: fallback || 'UNKNOWN',
      name: fallback || 'UNKNOWN',
      label: fallback || 'UNKNOWN',
    };
  }, [masterSupplierLookup]);

  const inboundDailyTrend = useMemo(() => {
    const dateKeys = buildDateKeys(reportStart, reportEnd, inboundPerformanceRows);
    const map = new Map(dateKeys.map((dateKey) => [dateKey, {
      dateKey,
      label: formatInboundDayLabel(dateKey),
      onTime: 0,
      late: 0,
      total: 0,
    }]));

    inboundPerformanceRows.forEach((row) => {
      const dateKey = toDateKey(row?.requestDate || row?.arrivalDate);
      if (!dateKey || !map.has(dateKey)) return;
      const bucket = map.get(dateKey);
      const status = normalizeInboundStatus(row?.status);
      if (status.includes('late')) {
        bucket.late += 1;
      } else if (status.includes('ontime') || status.includes('on-time')) {
        bucket.onTime += 1;
      }
      bucket.total += 1;
    });

    return Array.from(map.values());
  }, [inboundPerformanceRows, reportEnd, reportStart]);

  const inboundSupplierKpiRows = useMemo(() => {
    const grouped = new Map();
    inboundPerformanceRows.forEach((row) => {
      const supplierMeta = resolveInboundSupplierMeta(row);
      const supplierKey = String(supplierMeta.key || '').trim() || 'UNKNOWN';
      if (!grouped.has(supplierKey)) {
        grouped.set(supplierKey, {
          supplier: supplierMeta.name || supplierKey,
          supplierLabel: supplierMeta.label || supplierMeta.name || supplierKey,
          supplierKey,
          total: 0,
          onTime: 0,
          late: 0,
          pending: 0,
          tooEarly: 0,
        });
      }
      const bucket = grouped.get(supplierKey);
      bucket.supplier = supplierMeta.name || bucket.supplier || supplierKey;
      bucket.supplierLabel = supplierMeta.label || bucket.supplierLabel || bucket.supplier;
      bucket.total += 1;
      const status = normalizeInboundStatus(row?.status);
      if (status.includes('late')) bucket.late += 1;
      else if (status.includes('ontime') || status.includes('on-time')) bucket.onTime += 1;
      else if (status.includes('pending')) bucket.pending += 1;
      else if (status.includes('tooearly')) bucket.tooEarly += 1;
    });
    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        onTimeRate: row.total ? (row.onTime / row.total) * 100 : 0,
        lateRate: row.total ? (row.late / row.total) * 100 : 0,
      }))
      .sort((left, right) => right.late - left.late || right.total - left.total || String(left.supplier).localeCompare(String(right.supplier), 'id'));
  }, [inboundPerformanceRows, resolveInboundSupplierMeta]);

  const inboundSupplierChartRows = useMemo(
    () => inboundSupplierKpiRows.slice(0, 8).map((row) => ({
      supplier: row.supplier,
      onTime: row.onTime,
      late: row.late,
      total: row.total,
    })),
    [inboundSupplierKpiRows],
  );

  const allMutationCategoryOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    (Array.isArray(masterCategories) ? masterCategories : []).forEach((category) => {
      const code = String(category.code || '').trim();
      const name = String(category.name || '').trim();
      const value = code || name;
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const label = code && name ? `${code} - ${name}` : (code || name);
      options.push({ value, label });
    });
    return [
      { value: '', label: 'ALL - Semua Kategori' },
      ...options,
    ];
  }, [masterCategories]);

  const masterSupplierOptions = useMemo(() => {
    const seen = new Set();
    const vendorRows = Array.isArray(masterVendors) ? masterVendors : [];
    const supplierRows = vendorRows.filter((vendor) => String(vendor?.type || '').trim().toLowerCase() === 'supplier');
    const sourceRows = supplierRows.length > 0 ? supplierRows : vendorRows;
    return sourceRows
      .map((vendor) => {
        const id = String(vendor?.id || '').trim();
        const name = String(vendor?.name || '').trim();
        const value = id || name;
        if (!value) return null;
        const key = value.toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          value,
          label: id && name && id !== name ? `${id} - ${name}` : (name || id),
          id,
          name,
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(left.label).localeCompare(String(right.label), 'id'));
  }, [masterVendors]);

  const renderReportHeader = (title, periodStart, periodEnd) => (
    <div className="report-print-header print-only">
      <div className="report-header-left">
        <img src={logoPrl} alt="Logo" className="report-logo" />
        <div>
          <div className="report-company">PT. MATRA RODA PIRANTI</div>
          <div className="report-dept">Departemen Logistik (PPIC)</div>
        </div>
      </div>
      <div className="report-header-right">
        <div className="report-title">{title}</div>
        <div className="report-meta">
          <div>Periode: {periodStart || periodEnd ? `${formatPrintDate(periodStart)} s/d ${formatPrintDate(periodEnd)}` : '-'}</div>
          <div>Print Date: {todayLabel}</div>
        </div>
      </div>
    </div>
  );

  const renderReportSignatures = () => (
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

  const handlePrintReport = (orientationOverride) => {
    if (typeof window === 'undefined') return;
    if (typeof document !== 'undefined') {
      const existingStyle = document.querySelector('style[data-report-page]');
      if (existingStyle) existingStyle.remove();
      const style = document.createElement('style');
      style.setAttribute('data-report-page', 'true');
      const orientation = orientationOverride || (reportPrintOrientation === 'landscape' ? 'landscape' : 'portrait');
      style.innerHTML = orientation === 'landscape'
        ? `
        @media print {
          @page {
            size: 297mm 210mm;
            margin: 10mm 12mm 12mm 12mm;
          }
        }
      `
        : `
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 15mm;
            margin-bottom: 25mm;
          }
        }
      `;
      document.head.appendChild(style);
    }
    if (typeof document !== 'undefined') {
      document.body.classList.add('report-print-active');
      document.body.classList.toggle('report-print-landscape', (orientationOverride || reportPrintOrientation) === 'landscape');
      if ((orientationOverride || reportPrintOrientation) === 'landscape') {
        document.documentElement.classList.add('report-print-landscape-root');
      } else {
        document.documentElement.classList.remove('report-print-landscape-root');
      }
    }
    const cleanup = () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('report-print-active');
        document.body.classList.remove('report-print-landscape');
        document.documentElement.classList.remove('report-print-landscape-root');
        const existingStyle = document.querySelector('style[data-report-page]');
        if (existingStyle) existingStyle.remove();
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
    setTimeout(cleanup, 800);
  };

  const monthOptions = [
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Aug' },
    { key: 'sep', label: 'Sep' },
    { key: 'oct', label: 'Oct' },
    { key: 'nov', label: 'Nov' },
    { key: 'dec', label: 'Dec' },
  ];

  const monthKeyMap = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const buildMonthRange = (monthKey, yearValue) => {
    const monthNum = monthKeyMap[String(monthKey || '').toLowerCase()];
    const yearNum = Number(yearValue || 0);
    if (!monthNum || !yearNum) return { start: '', end: '' };
    const start = new Date(yearNum, monthNum - 1, 1);
    const end = new Date(yearNum, monthNum, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const buildMonthInputRange = (monthInput) => {
    if (!monthInput) return { start: '', end: '' };
    const [yearStr, monthStr] = String(monthInput).split('-');
    const yearNum = Number(yearStr || 0);
    const monthNum = Number(monthStr || 0);
    if (!yearNum || !monthNum) return { start: '', end: '' };
    const start = new Date(yearNum, monthNum - 1, 1);
    const end = new Date(yearNum, monthNum, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };
  const buildMonthPeriodRange = (startMonthInput, endMonthInput) => {
    const startValue = String(startMonthInput || '').trim();
    const endValue = String(endMonthInput || '').trim();
    const normalizedStart = startValue && endValue
      ? (startValue <= endValue ? startValue : endValue)
      : (startValue || endValue);
    const normalizedEnd = startValue && endValue
      ? (startValue <= endValue ? endValue : startValue)
      : (endValue || startValue);
    const startRange = buildMonthInputRange(normalizedStart);
    const endRange = buildMonthInputRange(normalizedEnd);
    return {
      start: startRange.start,
      end: endRange.end,
    };
  };

  const [reportPrintOrientation, setReportPrintOrientation] = useState('portrait');
  const [scorecardExpanded, setScorecardExpanded] = useState({});
  const [rekapExpanded, setRekapExpanded] = useState({});
  const [capacityPlanningWorkCenter, setCapacityPlanningWorkCenter] = useState('');
  const [capacityPlanningShiftCount, setCapacityPlanningShiftCount] = useState(3);
  const [capacityPlanningShiftHours, setCapacityPlanningShiftHours] = useState(8);
  const [qcReportData, setQcReportData] = useState({
    period: null,
    summary: {},
    sourceBreakdown: [],
    dispositionBreakdown: [],
    monthlyTrend: [],
    topDefects: [],
    supplierRows: [],
    incomingItemRows: [],
    openCases: [],
    millsheet: {},
  });
  const [qcReportLoading, setQcReportLoading] = useState(false);
  const [qcReportError, setQcReportError] = useState('');

  const qcSourceLabels = {
    incoming_rn: 'Incoming RN',
    production_ng: 'Production NG',
    material_line_ng: 'Material NG Line',
    delivery_return: 'Delivery Return',
    manual: 'Manual',
  };
  const qcDispositionLabels = {
    ok: 'OK / Release',
    use_as_is: 'Use As Is',
    hold: 'Hold',
    sortir: 'Sortir',
    reject: 'Reject',
    rework: 'Rework',
    scrap: 'Scrap',
    return_supplier: 'Return Supplier',
    claim_customer: 'Claim Customer',
    correction_review: 'Correction Review',
    open_pending: 'Open / Pending',
  };
  const fetchQcReport = async () => {
    if (!apiFetch) return;
    setQcReportLoading(true);
    setQcReportError('');
    try {
      const params = new URLSearchParams();
      if (reportStart) params.set('start', reportStart);
      if (reportEnd) params.set('end', reportEnd);
      if (reportSupplier) params.set('supplier', reportSupplier);
      const data = await apiFetch(`/api/reports/qc?${params.toString()}`);
      setQcReportData({
        period: data?.period || null,
        summary: data?.summary || {},
        sourceBreakdown: Array.isArray(data?.sourceBreakdown) ? data.sourceBreakdown : [],
        dispositionBreakdown: Array.isArray(data?.dispositionBreakdown) ? data.dispositionBreakdown : [],
        monthlyTrend: Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [],
        topDefects: Array.isArray(data?.topDefects) ? data.topDefects : [],
        supplierRows: Array.isArray(data?.supplierRows) ? data.supplierRows : [],
        incomingItemRows: Array.isArray(data?.incomingItemRows) ? data.incomingItemRows : [],
        openCases: Array.isArray(data?.openCases) ? data.openCases : [],
        millsheet: data?.millsheet || {},
      });
    } catch (error) {
      setQcReportError(error?.message || 'Gagal memuat laporan QC.');
    } finally {
      setQcReportLoading(false);
    }
  };
  const handleExportQcReportExcel = async () => {
    const rows = [
      ...(qcReportData.incomingItemRows || []).map((row) => ({
        Section: 'Seluruh Item Datang',
        Supplier: row.supplierCode,
        'Nama Supplier': row.supplierName,
        Item: row.itemCode,
        'Nama Item': row.itemName,
        'Part No': row.partNo,
        Unit: row.unit,
        'RN Count': row.rnCount,
        'Line Count': row.receiptLines,
        'First Received': formatPrintDate(row.firstReceivedAt),
        'Last Received': formatPrintDate(row.lastReceivedAt),
        'Qty Dokumen': row.docQty,
        'Qty Datang': row.receivedQty,
        'Qty OK': row.qtyOk,
        'Qty NG': row.qtyNg,
        PPM: row.ppm,
        'QC Issue Line': row.qcIssueLines,
        'QC Status': row.qcStatus,
        Defect: row.defectCategory,
      })),
      ...(qcReportData.supplierRows || []).map((row) => ({
        Section: 'Supplier Performance',
        Supplier: row.supplierCode,
        'Nama Supplier': row.supplierName,
        'Total Case': row.totalCases,
        'Incoming QC': row.incomingCases,
        'Material NG Line': row.materialLineNg,
        Open: row.openCases,
        Closed: row.closedCases,
        'Reject/Return/Scrap': row.rejectCases,
        'Qty Defect': row.defectQty,
        'Closure Rate': row.closureRate,
        'Quality Score': row.qualityScore,
      })),
      ...(qcReportData.topDefects || []).map((row) => ({
        Section: 'Top Defect',
        Defect: row.defect,
        'Total Case': row.totalCases,
        'Qty Defect': row.defectQty,
        Major: row.major,
        Critical: row.critical,
      })),
      ...(qcReportData.openCases || []).map((row) => ({
        Section: 'Open Case',
        Tanggal: formatPrintDate(row.eventAt || row.createdAt),
        Case: row.caseNumber,
        Source: qcSourceLabels[row.sourceType] || row.sourceType,
        Dokumen: row.sourceDoc,
        Item: row.itemCode,
        Supplier: row.supplierCode || row.supplier,
        Qty: row.qty,
        Defect: row.defectCategory,
        Severity: row.severity,
        Status: row.status,
      })),
    ];
    if (ensureXlsx) {
      const XLSX = await ensureXlsx();
      if (XLSX) {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Tidak ada data' }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan QC');
        XLSX.writeFile(wb, `Laporan_QC_${new Date().toISOString().slice(0, 10)}.xlsx`);
        return;
      }
    }
    const headers = rows.length
      ? Array.from(rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set()))
      : ['Info'];
    const bodyRows = rows.length ? rows : [{ Info: 'Tidak ada data' }];
    const csv = [
      headers.join(','),
      ...bodyRows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_QC_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (mainTab !== 'reports') return;
    if (reportTab !== 'qc-report') return;
    if (!canViewReport) return;
    fetchQcReport();
  }, [mainTab, reportTab, canViewReport, reportStart, reportEnd, reportSupplier]);

  const rekapSupplierGroups = useMemo(() => {
    const groups = new Map();
    (Array.isArray(reportRows) ? reportRows : []).forEach((row) => {
      const supplierKey = String(row?.supplier || row?.supplierName || 'UNKNOWN').trim() || 'UNKNOWN';
      if (!groups.has(supplierKey)) {
        const supplierName = String(row?.supplierName || '').trim();
        groups.set(supplierKey, {
          supplierKey,
          supplierName,
          supplierLabel: supplierName && supplierName !== supplierKey ? `${supplierKey} - ${supplierName}` : supplierKey,
          rows: [],
          poCount: 0,
          totalRows: 0,
          totalRequested: 0,
          totalReceived: 0,
          onTimeQty: 0,
          lateQty: 0,
          tooEarlyQty: 0,
          onTimeCount: 0,
          lateCount: 0,
          lateCompletionCount: 0,
          partialOnTimeCount: 0,
          partialLateCount: 0,
          tooEarlyCount: 0,
          pendingCount: 0,
          rnCount: 0,
          looseCount: 0,
          qcTotal: 0,
          qcOpen: 0,
          qcReject: 0,
        });
      }
      const group = groups.get(supplierKey);
      group.rows.push(row);
      group.poCount += 1;
      group.totalRows += Number(row?.totalRows || 0);
      group.totalRequested += Number(row?.totalRequested || 0);
      group.totalReceived += Number(row?.totalReceived || 0);
      group.onTimeQty += Number(row?.onTimeQty || 0);
      group.lateQty += Number(row?.lateQty || 0);
      group.tooEarlyQty += Number(row?.tooEarlyQty || 0);
      group.onTimeCount += Number(row?.onTimeCount || 0);
      group.lateCount += Number(row?.lateCount || 0);
      group.lateCompletionCount += Number(row?.lateCompletionCount || 0);
      group.partialOnTimeCount += Number(row?.partialOnTimeCount || 0);
      group.partialLateCount += Number(row?.partialLateCount || 0);
      group.tooEarlyCount += Number(row?.tooEarlyCount || 0);
      group.pendingCount += Number(row?.pendingCount || 0);
      group.rnCount += Number(row?.rnCount || 0);
      group.looseCount += Number(row?.looseCount || 0);
      group.qcTotal += Number(row?.qcTotal || 0);
      group.qcOpen += Number(row?.qcOpen || 0);
      group.qcReject += Number(row?.qcReject || 0);
    });
    return Array.from(groups.values()).map((group) => {
      const timingScore = group.totalRequested > 0 ? Math.min(100, (group.onTimeQty / group.totalRequested) * 100) : 0;
      const fulfillmentScore = group.totalRequested > 0 ? Math.min(100, (group.totalReceived / group.totalRequested) * 100) : 0;
      const packingScore = group.rnCount > 0 ? Math.max(0, ((group.rnCount - group.looseCount) / group.rnCount) * 100) : null;
      const qcScore = group.rnCount > 0 ? Math.max(0, ((group.rnCount - group.qcOpen - group.qcReject) / group.rnCount) * 100) : null;
      const qualityWeight = qcScore === null ? 0 : 0.15;
      const packingWeight = packingScore === null ? 0 : 0.1;
      const timeWeight = 0.55;
      const fulfillWeight = 0.35;
      const rawWeight = timeWeight + fulfillWeight + qualityWeight + packingWeight;
      const weightedScore = rawWeight > 0
        ? ((timingScore * timeWeight) + (fulfillmentScore * fulfillWeight) + ((qcScore ?? 100) * qualityWeight) + ((packingScore ?? 100) * packingWeight)) / rawWeight
        : 0;
      let rating = 1;
      if (weightedScore >= 95) rating = 5;
      else if (weightedScore >= 80) rating = 4;
      else if (weightedScore >= 60) rating = 3;
      else if (weightedScore >= 40) rating = 2;
      return {
        ...group,
        timingScore: Math.round(timingScore),
        fulfillmentScore: Math.round(fulfillmentScore),
        packingScore: packingScore === null ? null : Math.round(packingScore),
        qcScore: qcScore === null ? null : Math.round(qcScore),
        weightedScore: Math.round(weightedScore * 100) / 100,
        rating,
        rows: group.rows.slice().sort((left, right) => String(left?.poNumber || '').localeCompare(String(right?.poNumber || ''), 'id')),
      };
    }).sort((left, right) => right.weightedScore - left.weightedScore || String(left.supplierLabel).localeCompare(String(right.supplierLabel), 'id'));
  }, [reportRows]);

  const monthOptionIndexMap = monthOptions.reduce((map, month, index) => ({
    ...map,
    [month.key]: index + 1,
  }), {});
  const qualitySps = qualityObjectivesData?.sps || {};
  const qualitySpsMonths = Array.isArray(qualitySps.months) && qualitySps.months.length > 0
    ? qualitySps.months
    : monthOptions.map((month, index) => ({
      month: index + 1,
      key: month.key,
      label: `${month.label}-${String(qualityObjectivesYear || new Date().getFullYear()).slice(-2)}`,
      incomingQty: 0,
      dnOrderQty: 0,
      percent: 0,
      status: '',
      hasData: false,
      inPeriod: true,
    }));
  const qualitySpsChartRows = qualitySpsMonths.map((month) => ({
    label: month.label,
    incomingQty: month.hasData ? Number(month.incomingQty || 0) : null,
    dnOrderQty: month.hasData ? Number(month.dnOrderQty || 0) : null,
    percent: month.hasData ? Number(month.percent || 0) : null,
  }));
  const qualitySpsYear = qualitySps.year || qualityObjectivesYear || new Date().getFullYear();
  const qualitySpsSupplierLabel = (() => {
    const supplierValue = qualitySps.supplier || qualityObjectivesSupplier || '';
    if (!supplierValue) return 'ALL SUPPLIER';
    const option = masterSupplierOptions.find((item) => item.value === supplierValue || item.id === supplierValue || item.name === supplierValue);
    return option?.label || supplierValue;
  })();
  const qualityMonthRangeText = (() => {
    const startIndex = monthOptionIndexMap[qualityObjectivesMonthStart] || Number(qualitySps.monthStart || 1);
    const endIndex = monthOptionIndexMap[qualityObjectivesMonthEnd] || Number(qualitySps.monthEnd || 12);
    const start = monthOptions[startIndex - 1]?.label || 'Jan';
    const end = monthOptions[endIndex - 1]?.label || 'Dec';
    return `${start}-${end} ${qualitySpsYear}`;
  })();
  const formatSpsQty = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };
  const formatSpsPercent = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '';
    return `${Math.round(num)}%`;
  };
  const renderQualitySpsValue = (month, key) => {
    if (!month?.hasData) return '';
    if (key === 'incomingQty' || key === 'dnOrderQty') return formatSpsQty(month[key]);
    if (key === 'percent') return formatSpsPercent(month.percent);
    if (key === 'status') return month.status || '';
    return '';
  };
  const getQualitySpsStatusClass = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return '';
    return normalized.includes('tidak') ? 'quality-sps-status-bad' : 'quality-sps-status-good';
  };
  const renderQualitySpsTable = () => (
    <div className="quality-sps-table-wrap">
      <table className="quality-sps-table">
        <thead>
          <tr>
            <th>SPS</th>
            {qualitySpsMonths.map((month) => (
              <th key={`sps-head-${month.key || month.month}`}>{month.label}</th>
            ))}
            <th>AVG</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Incoming (Pcs)</td>
            {qualitySpsMonths.map((month) => (
              <td key={`sps-incoming-${month.key || month.month}`} className="quality-sps-number">{renderQualitySpsValue(month, 'incomingQty')}</td>
            ))}
            <td className="quality-sps-number">{qualitySps.avgIncoming ? formatSpsQty(qualitySps.avgIncoming) : ''}</td>
          </tr>
          <tr>
            <td>Total DN Order (Pcs)</td>
            {qualitySpsMonths.map((month) => (
              <td key={`sps-dn-${month.key || month.month}`} className="quality-sps-number">{renderQualitySpsValue(month, 'dnOrderQty')}</td>
            ))}
            <td className="quality-sps-number">{qualitySps.avgDnOrder ? formatSpsQty(qualitySps.avgDnOrder) : ''}</td>
          </tr>
          <tr>
            <td>%</td>
            {qualitySpsMonths.map((month) => (
              <td key={`sps-percent-${month.key || month.month}`} className="quality-sps-percent">{renderQualitySpsValue(month, 'percent')}</td>
            ))}
            <td className="quality-sps-percent">{qualitySps.avgStatus ? formatSpsPercent(qualitySps.avgPercent) : ''}</td>
          </tr>
          <tr>
            <td>Hasil Target<br />100% +/-20%</td>
            {qualitySpsMonths.map((month) => (
              <td key={`sps-status-${month.key || month.month}`} className={`quality-sps-status ${getQualitySpsStatusClass(renderQualitySpsValue(month, 'status'))}`}>{renderQualitySpsValue(month, 'status')}</td>
            ))}
            <td className={`quality-sps-status ${getQualitySpsStatusClass(qualitySps.avgStatus)}`}>{qualitySps.avgStatus || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
  const renderQualitySpsSignatures = () => (
    <div className="quality-sps-signatures">
      <table>
        <thead>
          <tr>
            <th>Prepared</th>
            <th>Checked</th>
            <th>Approved</th>
          </tr>
        </thead>
        <tbody>
          <tr className="quality-sps-sign-space">
            <td />
            <td />
            <td />
          </tr>
          <tr>
            <td>WILI</td>
            <td>Muhtadin</td>
            <td>Beverly M</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
  const qcSummary = qcReportData?.summary || {};
  const qcMillsheet = qcReportData?.millsheet || {};
  const qcMonthlyChartRows = (qcReportData?.monthlyTrend || []).map((row) => ({
    ...row,
    label: row.month || '-',
    releaseRate: Number(row.releaseRate || 0),
  }));
  const qcDispositionChartRows = (qcReportData?.dispositionBreakdown || []).map((row) => ({
    ...row,
    label: qcDispositionLabels[row.disposition] || row.disposition || '-',
  }));
  const qcSupplierLabel = (() => {
    if (!reportSupplier) return 'ALL SUPPLIER';
    const option = masterSupplierOptions.find((item) => item.value === reportSupplier || item.id === reportSupplier || item.name === reportSupplier);
    return option?.label || reportSupplier;
  })();
  const getQcScoreClass = (value) => {
    const score = Number(value || 0);
    if (score >= 90) return 'text-emerald-700 bg-emerald-50';
    if (score >= 75) return 'text-blue-700 bg-blue-50';
    if (score >= 60) return 'text-amber-700 bg-amber-50';
    return 'text-rose-700 bg-rose-50';
  };
  const ScorecardSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-6 w-10 rounded bg-slate-200" />
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-16 rounded bg-slate-200" />
        ))}
      </div>
      <div className="mt-4 h-20 rounded bg-slate-200" />
    </div>
  );

  const capacityWorkCenterRows = useMemo(() => {
    const rows = Array.isArray(capacityPlanningData?.workCenters) ? capacityPlanningData.workCenters : [];
    return [...rows].sort((left, right) => Number(right.loadHours || 0) - Number(left.loadHours || 0) || String(left.workCenter || '').localeCompare(String(right.workCenter || '')));
  }, [capacityPlanningData?.workCenters]);

  const capacitySelectedWorkCenter = useMemo(() => {
    if (!capacityWorkCenterRows.length) return null;
    const exactMatch = capacityWorkCenterRows.find((row) => row.workCenter === capacityPlanningWorkCenter);
    return exactMatch || capacityWorkCenterRows[0];
  }, [capacityWorkCenterRows, capacityPlanningWorkCenter]);

  useEffect(() => {
    if (!capacityWorkCenterRows.length) {
      if (capacityPlanningWorkCenter) setCapacityPlanningWorkCenter('');
      return;
    }
    if (!capacityPlanningWorkCenter || !capacityWorkCenterRows.some((row) => row.workCenter === capacityPlanningWorkCenter)) {
      setCapacityPlanningWorkCenter(capacityWorkCenterRows[0].workCenter);
    }
  }, [capacityWorkCenterRows, capacityPlanningWorkCenter]);

  const capacityWorkingDays = useMemo(() => {
    const configuredDays = typeof getWorkingDays === 'function'
      ? Number(getWorkingDays(capacityPlanningMonth, capacityPlanningYear) || 0)
      : 0;
    return configuredDays > 0 ? configuredDays : countWeekdaysInMonth(capacityPlanningMonth, capacityPlanningYear);
  }, [capacityPlanningMonth, capacityPlanningYear, getWorkingDays]);

  const capacityDailyRows = useMemo(() => (
    Array.isArray(capacityPlanningData?.dailyRows)
      ? [...capacityPlanningData.dailyRows].sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
      : []
  ), [capacityPlanningData?.dailyRows]);

  const capacitySelectedWorkCenterDailyRows = useMemo(() => {
    const rows = Array.isArray(capacityPlanningData?.workCenterDailyRows) ? capacityPlanningData.workCenterDailyRows : [];
    if (!capacitySelectedWorkCenter?.workCenter) return rows;
    return rows
      .filter((row) => row.workCenter === capacitySelectedWorkCenter.workCenter)
      .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')));
  }, [capacityPlanningData?.workCenterDailyRows, capacitySelectedWorkCenter?.workCenter]);

  const capacityPerDayHours = Number(capacityPlanningShiftCount || 0) * Number(capacityPlanningShiftHours || 0);
  const capacitySelectedLoadHours = Number(capacitySelectedWorkCenter?.totalLoadHours || 0);
  const capacityUtilization = capacityWorkingDays > 0 && capacityPerDayHours > 0
    ? (capacitySelectedLoadHours / (capacityWorkingDays * capacityPerDayHours)) * 100
    : 0;
  const capacitySelectedChartData = useMemo(() => (
    capacitySelectedWorkCenterDailyRows.map((row) => ({
      date: row.date,
      plannedLoadHours: Number(row.plannedLoadHours || 0),
      actualLoadHours: Number(row.actualLoadHours || 0),
      capacityHours: capacityPerDayHours,
    }))
  ), [capacitySelectedWorkCenterDailyRows, capacityPerDayHours]);

  const capacityDailyChartData = useMemo(() => (
    capacityDailyRows.map((row) => ({
      date: row.date,
      plannedLoadHours: Number(row.plannedLoadHours || 0),
      actualLoadHours: Number(row.actualLoadHours || 0),
      capacityHours: capacityPerDayHours,
    }))
  ), [capacityDailyRows, capacityPerDayHours]);

  return (
    <>
            {/* Laporan */}
            {mainTab === 'reports' && (
            <div className="space-y-6 report-print-host">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
                <div className="flex flex-wrap gap-2">
                  {reportMenuGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const active = activeReportGroup?.key === group.key;
                    return (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => selectReportCategory(group)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${active ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <GroupIcon size={15} /> {group.label}
                      </button>
                    );
                  })}
                </div>
                {activeReportGroup && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {activeReportGroup.reports.map((report) => {
                      const ReportIcon = report.icon;
                      const active = reportTab === report.key;
                      return (
                        <button
                          key={report.key}
                          type="button"
                          onClick={() => selectReportTab(activeReportGroup, report.key)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          <ReportIcon size={14} /> {report.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {reportTab === 'rekap' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN REKAP SUPPLIER/PO', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText size={18}/> Report Rekap Supplier/PO</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportReportExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Start</label>
                      <input type="date" className="border p-2 rounded w-full text-sm" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">End</label>
                      <input type="date" className="border p-2 rounded w-full text-sm" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Cari supplier (opsional)</label>
                      <SearchableSelectDropdown
                        value={reportSupplier}
                        options={masterSupplierOptions}
                        placeholder="Cari supplier..."
                        searchPlaceholder="Ketik kode / nama supplier"
                        emptyText="Supplier tidak ditemukan."
                        className="w-full"
                        onChange={(nextValue) => setReportSupplier(nextValue || '')}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan Filter</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reportLoading && (
                      <div className="p-6 text-center text-slate-500">
                        <Loader2 size={18} className="animate-spin inline-block mr-2" /> Memuat laporan performa supplier...
                      </div>
                    )}
                    {!reportLoading && reportRows.length === 0 && (
                      <div className="p-6 text-center text-slate-500 rounded-xl border border-slate-200">Belum ada laporan performa.</div>
                    )}
                    {!reportLoading && reportRows.length > 0 && (
                      <>
                        <div className="report-summary-kpi-grid grid grid-cols-1 gap-3 lg:grid-cols-4">
                          {[
                            { label: 'Total Score', value: `${Math.round(Number(reportSummary?.weightedScore || 0))}%`, icon: Trophy, tone: 'text-indigo-700 bg-indigo-50' },
                            { label: 'Ketepatan Waktu', value: `${Math.round(Number(reportSummary?.timeScore || 0))}%`, icon: Clock3, tone: 'text-sky-700 bg-sky-50' },
                            { label: 'Fulfillment Qty', value: `${Math.round(Number(reportSummary?.qtyScore || 0))}%`, icon: BarChart3, tone: 'text-emerald-700 bg-emerald-50' },
                            { label: 'QC + Line Claim', value: `${Math.round(Number(reportSummary?.qcScore || 0))}%`, icon: ShieldCheck, tone: 'text-violet-700 bg-violet-50' },
                          ].map((tile) => {
                            const TileIcon = tile.icon;
                            return (
                              <div key={tile.label} className="report-summary-kpi-card rounded-xl border border-slate-200 bg-white p-4">
                                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tile.tone}`}>
                                  <TileIcon size={18} />
                                </div>
                                <div className="mt-3 text-xs font-semibold uppercase text-slate-400">{tile.label}</div>
                                <div className="mt-1 text-2xl font-bold text-slate-900">{tile.value}</div>
                              </div>
                            );
                          })}
                        </div>

                        {reportRows.map((supplierReport) => {
                          const summary = supplierReport.summary || {};
                          const supplierInfo = supplierReport.supplier || {};
                          const supplierKey = supplierInfo.code || supplierInfo.name || 'UNKNOWN';
                          const isOpen = rekapExpanded[supplierKey] ?? reportRows.length === 1;
                          const rating = Number(summary.rating || 0);
                          const ratingClass = rating >= 4 ? 'bg-emerald-100 text-emerald-700' : rating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                          const monthly = Array.isArray(supplierReport.monthly) ? supplierReport.monthly : [];
                          const deliveryNotes = Array.isArray(supplierReport.deliveryNotes) ? supplierReport.deliveryNotes : [];
                          const schedules = Array.isArray(supplierReport.schedules) ? supplierReport.schedules : [];
                          const supplierCategory = supplierInfo.category || 'Schedule';
                          return (
                            <div key={supplierKey} className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-bold text-slate-900">{supplierInfo.name || supplierKey}</div>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                                      {supplierCategory}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Periode {formatPrintDate(reportStart || supplierReport.period?.start)} s/d {formatPrintDate(reportEnd || supplierReport.period?.end)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${ratingClass}`}>
                                    {Array.from({ length: 5 }).map((_, index) => (
                                      <Star key={index} size={14} className={index < rating ? 'fill-current' : ''} />
                                    ))}
                                    {summary.ratingLabel || '-'}
                                  </div>
                                  <button
                                    type="button"
                                    className="print:hidden border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={() => setRekapExpanded((prev) => ({ ...prev, [supplierKey]: !isOpen }))}
                                  >
                                    {isOpen ? 'Tutup' : 'Detail'}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                                {[
                                  { label: 'Jadwal', value: summary.totalSchedules, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
                                  { label: 'On Time', value: summary.onTime, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                                  { label: 'Late', value: summary.late, tone: 'border-rose-200 bg-rose-50 text-rose-700' },
                                  { label: 'Late Completion', value: summary.lateCompletion, tone: 'border-orange-200 bg-orange-50 text-orange-700' },
                                  { label: 'Partial OK', value: summary.partialOnTime, tone: 'border-teal-200 bg-teal-50 text-teal-700' },
                                  { label: 'Partial Late', value: summary.partialLate, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
                                  { label: 'Too Early', value: summary.tooEarly, tone: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
                                  { label: 'Pending', value: summary.pending, tone: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
                                  { label: 'QC Open', value: summary.qcOpen, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
                                ].map((tile) => (
                                  <div key={tile.label} className={`rounded-lg border p-3 text-center ${tile.tone}`}>
                                    <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">{tile.label}</div>
                                    <div className="mt-1 text-xl font-black text-slate-950">{formatQuantity(tile.value)}</div>
                                  </div>
                                ))}
                              </div>

                              {isOpen && (
                                <div className="mt-4 space-y-4">
                                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <BarChart3 size={16} /> Trend Bulanan
                                      </div>
                                      {monthly.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-slate-500">Belum ada data bulanan.</div>
                                      ) : (
                                        <div className="space-y-4">
                                          {monthly.map((row) => {
                                            const requestQty = Number(row.requestQty || 0);
                                            const receivedQty = Number(row.receivedQty || 0);
                                            const onTimeQty = Number(row.onTimeQty || 0);
                                            const lateQty = Number(row.lateQty || 0);
                                            const score = Math.max(0, Math.min(100, Number(row.weightedScore || 0)));
                                            const timeScore = Math.max(0, Math.min(100, Number(row.timeScore || (requestQty > 0 ? (onTimeQty / requestQty) * 100 : 0))));
                                            const fulfillmentScore = Math.max(0, Math.min(100, Number(row.qtyScore || (requestQty > 0 ? (receivedQty / requestQty) * 100 : 0))));
                                            const lateRate = Math.max(0, Math.min(100, requestQty > 0 ? (lateQty / requestQty) * 100 : 0));
                                            const trendBars = [
                                              { label: 'Score', value: score, color: 'bg-indigo-500', text: `${Math.round(score)}%` },
                                              { label: 'Tepat Waktu', value: timeScore, color: 'bg-emerald-500', text: `${Math.round(timeScore)}%` },
                                              { label: 'Fulfillment / SNP', value: fulfillmentScore, color: 'bg-sky-500', text: `${Math.round(fulfillmentScore)}%` },
                                              { label: 'Late Qty', value: lateRate, color: 'bg-rose-500', text: `${Math.round(lateRate)}%` },
                                            ];
                                            return (
                                              <div key={row.month} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                                                <div className="mb-2 flex items-center justify-between text-xs">
                                                  <span className="font-bold text-slate-900">{row.month}</span>
                                                  <span className="rounded-full bg-white px-2 py-0.5 font-bold text-indigo-700">Score {Math.round(score)}%</span>
                                                </div>
                                                <div className="space-y-2">
                                                  {trendBars.map((bar) => (
                                                    <div key={`${row.month}-${bar.label}`}>
                                                      <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
                                                        <span>{bar.label}</span>
                                                        <span>{bar.text}</span>
                                                      </div>
                                                      <div className="h-2.5 rounded-full bg-white">
                                                        <div
                                                          className={`h-2.5 rounded-full ${bar.color}`}
                                                          style={{ width: `${bar.value}%` }}
                                                        />
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                                                  <div className="rounded bg-white px-2 py-1">
                                                    <div className="font-semibold text-slate-400">Order</div>
                                                    <div className="font-bold text-slate-900">{formatQuantity(requestQty)}</div>
                                                  </div>
                                                  <div className="rounded bg-white px-2 py-1">
                                                    <div className="font-semibold text-emerald-500">On-time</div>
                                                    <div className="font-bold text-slate-900">{formatQuantity(onTimeQty)}</div>
                                                  </div>
                                                  <div className="rounded bg-white px-2 py-1">
                                                    <div className="font-semibold text-rose-500">Late</div>
                                                    <div className="font-bold text-slate-900">{formatQuantity(lateQty)}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <Truck size={16} /> Ringkasan DN / SJ
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {[
                                          ['Total DN', summary.dnCount],
                                          ['Completed', summary.dnCompleted],
                                          ['Pending', summary.dnPending],
                                          ['Selisih/Reject', summary.dnIssue],
                                          ['Qty DN', summary.dnDocQty],
                                          ['Qty Diterima', summary.dnReceivedQty],
                                        ].map(([label, value]) => {
                                          const tone = label === 'Completed'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : label === 'Selisih/Reject'
                                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                                              : label === 'Pending'
                                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                : 'border-sky-200 bg-sky-50 text-sky-700';
                                          return (
                                          <div key={label} className={`rounded-lg border p-3 ${tone}`}>
                                            <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</div>
                                            <div className="mt-1 text-xl font-black text-slate-950">{formatQuantity(value)}</div>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                                      <FileText size={16} /> Detail Jadwal Performa
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
                                            <tr key={`${supplierKey}-${row.id}-${row.poNumber}-${row.itemCode}`} className="border-t border-slate-100">
                                              <td className="p-2 font-semibold text-slate-800">{row.poNumber || '-'}</td>
                                              <td className="p-2">{row.itemCode || '-'}</td>
                                              <td className="p-2">{formatPrintDate(row.requestDate)}</td>
                                              <td className="p-2">{row.arrivalDate ? formatPrintDate(row.arrivalDate) : '-'}</td>
                                              <td className="p-2 text-right">{formatQuantity(row.requestQty)}</td>
                                              <td className="p-2 text-right">{formatQuantity(row.receivedQty)}</td>
                                              <td className="p-2">{row.status || '-'}</td>
                                            </tr>
                                          ))}
                                          {schedules.length === 0 && (
                                            <tr><td colSpan={7} className="p-4 text-center text-slate-500">Tidak ada jadwal pada periode ini.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                                      <Truck size={16} /> Detail DN / SJ Performa
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs">
                                        <thead className="bg-slate-100 text-slate-700">
                                          <tr>
                                            <th className="p-2 text-left">DN / SJ</th>
                                            <th className="p-2 text-left">Tanggal</th>
                                            <th className="p-2 text-left">Sumber</th>
                                            <th className="p-2 text-left">Tracking</th>
                                            <th className="p-2 text-right">Qty DN</th>
                                            <th className="p-2 text-right">Qty Terima</th>
                                            <th className="p-2 text-right">Selisih</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {deliveryNotes.slice(0, 100).map((row) => (
                                            <tr key={`${supplierKey}-${row.dnNumber}-${row.plannedDate}`} className="border-t border-slate-100">
                                              <td className="p-2 font-semibold text-slate-800">{row.dnNumber || '-'}</td>
                                              <td className="p-2">{formatPrintDate(row.plannedDate)}</td>
                                              <td className="p-2">{row.sourceCategory || supplierCategory}</td>
                                              <td className="p-2">{row.trackingStatus || '-'}</td>
                                              <td className="p-2 text-right">{formatQuantity(row.docQty)}</td>
                                              <td className="p-2 text-right">{formatQuantity(row.receivedQty)}</td>
                                              <td className="p-2 text-right">{formatQuantity(row.diffQty)}</td>
                                            </tr>
                                          ))}
                                          {deliveryNotes.length === 0 && (
                                            <tr><td colSpan={7} className="p-4 text-center text-slate-500">Tidak ada DN/SJ pada periode ini.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {false && reportSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mb-6">
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Total PO</div>
                        <div className="font-bold">{reportSummary.totalRows}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Qty PO</div>
                        <div className="font-bold">{reportSummary.totalRequested}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Incoming</div>
                        <div className="font-bold">{reportSummary.totalReceived}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Qty On Time</div>
                        <div className="font-bold text-green-600">{formatQuantity(reportSummary.totalOnTimeQty)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Qty Late</div>
                        <div className="font-bold text-red-600">{formatQuantity(reportSummary.totalLateQty)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Late Completion</div>
                        <div className="font-bold text-rose-600">{reportSummary.totalLateCompletion || 0}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Parsial OK</div>
                        <div className="font-bold text-amber-600">{reportSummary.totalPartialOnTime || 0}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Menunggu</div>
                        <div className="font-bold text-yellow-600">{reportSummary.totalPending}</div>
                      </div>
                    </div>
                  )}

                  <div className="hidden">
                    {reportLoading && (
                      <div className="p-6 text-center text-sm text-slate-400 border rounded-lg">Memuat...</div>
                    )}
                    {!reportLoading && rekapSupplierGroups.length === 0 && (
                      <div className="p-6 text-center text-sm text-slate-400 border rounded-lg">Tidak ada data.</div>
                    )}
                    {!reportLoading && rekapSupplierGroups.map((group) => {
                      const isOpen = rekapExpanded[group.supplierKey] ?? rekapSupplierGroups.length === 1;
                      return (
                        <div key={group.supplierKey} className="border rounded-lg bg-white overflow-hidden">
                          <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{group.supplierLabel}</div>
                              <div className="text-xs text-slate-500">{group.poCount} PO | {formatQuantity(group.totalRequested)} order | {formatQuantity(group.totalReceived)} incoming</div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">Performance</div>
                                <div className="font-bold text-indigo-700">{formatPercent(group.weightedScore)}</div>
                              </div>
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">Rating</div>
                                <div className="flex justify-center gap-0.5 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <Star key={idx} size={14} fill={idx < group.rating ? 'currentColor' : 'none'} />
                                  ))}
                                </div>
                              </div>
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">Timing</div>
                                <div className="font-semibold text-green-700">{group.timingScore}%</div>
                              </div>
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">Fulfill</div>
                                <div className="font-semibold text-blue-700">{group.fulfillmentScore}%</div>
                              </div>
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">QC</div>
                                <div className="font-semibold text-rose-700">{group.qcScore === null ? '-' : `${group.qcScore}%`}</div>
                              </div>
                              <div className="border rounded p-2">
                                <div className="text-[10px] uppercase text-slate-400">Packing</div>
                                <div className="font-semibold text-slate-700">{group.packingScore === null ? '-' : `${group.packingScore}%`}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="print:hidden border px-3 py-2 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => setRekapExpanded((prev) => ({ ...prev, [group.supplierKey]: !isOpen }))}
                            >
                              {isOpen ? 'Tutup Detail' : 'Detail PO'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 px-4 pb-4 text-xs">
                            <div className="bg-emerald-50 text-emerald-700 rounded p-2">On-time Qty: <b>{formatQuantity(group.onTimeQty)}</b></div>
                            <div className="bg-rose-50 text-rose-700 rounded p-2">Late Qty: <b>{formatQuantity(group.lateQty)}</b></div>
                            <div className="bg-amber-50 text-amber-700 rounded p-2">Partial OK: <b>{group.partialOnTimeCount}</b></div>
                            <div className="bg-red-50 text-red-700 rounded p-2">Late Completion: <b>{group.lateCompletionCount}</b></div>
                            <div className="bg-orange-50 text-orange-700 rounded p-2">Partial Late: <b>{group.partialLateCount}</b></div>
                            <div className="bg-slate-50 text-slate-700 rounded p-2">QC Open/Reject: <b>{group.qcOpen}/{group.qcReject}</b></div>
                          </div>
                          {isOpen && (
                            <div className="border-t overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                  <tr>
                                    <th className="text-left p-3">No PO</th>
                                    <th className="text-right p-3">Qty PO</th>
                                    <th className="text-right p-3">Incoming</th>
                                    <th className="text-right p-3">On-time Qty</th>
                                    <th className="text-right p-3">Late Qty</th>
                                    <th className="text-right p-3">Partial OK</th>
                                    <th className="text-right p-3">Late Completion</th>
                                    <th className="text-right p-3">QC Open</th>
                                    <th className="text-right p-3">SNP Tidak Sesuai</th>
                                    <th className="text-center p-3">Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.rows.map((row, idx) => (
                                    <tr key={`${group.supplierKey}-${row.poNumber}-${idx}`} className="border-t">
                                      <td className="p-3 font-semibold text-slate-700">{row.poNumber}</td>
                                      <td className="p-3 text-right">{formatQuantity(row.totalRequested)}</td>
                                      <td className="p-3 text-right">{formatQuantity(row.totalReceived)}</td>
                                      <td className="p-3 text-right text-green-700">{formatQuantity(row.onTimeQty)}</td>
                                      <td className="p-3 text-right text-red-700">{formatQuantity(row.lateQty)}</td>
                                      <td className="p-3 text-right text-amber-700">{row.partialOnTimeCount || 0}</td>
                                      <td className="p-3 text-right text-rose-700">{row.lateCompletionCount || 0}</td>
                                      <td className="p-3 text-right text-rose-700">{row.qcOpen || 0}</td>
                                      <td className="p-3 text-right text-orange-700">{row.looseCount || 0}</td>
                                      <td className="p-3 text-center font-bold text-indigo-700">{row.weightedScore ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Supplier</th>
                          <th className="text-left p-3">No PO</th>
                          <th className="text-right p-3">Qty PO</th>
                          <th className="text-right p-3">Qty Incoming</th>
                          <th className="text-right p-3">Tepat Waktu</th>
                          <th className="text-right p-3">Terlambat</th>
                          <th className="text-right p-3">Terlalu Awal</th>
                          <th className="text-right p-3">Menunggu</th>
                          <th className="text-right p-3">SNP Tidak Sesuai<br/><span className="text-[10px] font-normal text-slate-500">Khusus Kg ±25%</span></th>
                          <th className="text-center p-3">Packing/SNP %</th>
                          <th className="text-center p-3">Terpenuhi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="11" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && reportRows.length === 0 && (
                          <tr><td colSpan="11" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && reportRows.map((row, idx) => (
                          (() => {
                            const rnCount = Number(row.rnCount || 0);
                            const looseCount = Number(row.looseCount || 0);
                            const packingScore = rnCount > 0 ? Math.round(((rnCount - looseCount) / rnCount) * 100) : null;
                            return (
                          <tr key={`${row.supplier}-${row.poNumber}-${idx}`} className="border-t">
                            <td className="p-3">{row?.supplier?.name || row?.supplier?.code || row?.supplierName || '-'}</td>
                            <td className="p-3">{row.poNumber}</td>
                            <td className="p-3 text-right">{row.totalRequested}</td>
                            <td className="p-3 text-right">{row.totalReceived}</td>
                            <td className="p-3 text-right text-green-600">{row.onTimeCount}</td>
                            <td className="p-3 text-right text-red-600">{row.lateCount}</td>
                            <td className="p-3 text-right text-blue-600">{row.tooEarlyCount}</td>
                            <td className="p-3 text-right text-yellow-600">{row.pendingCount}</td>
                            <td className="p-3 text-right text-rose-600">{looseCount}</td>
                            <td className="p-3 text-center">{packingScore === null ? '-' : `${packingScore}%`}</td>
                            <td className="p-3 text-center">{row.totalReceived >= row.totalRequested ? 'Ya' : 'Tidak'}</td>
                          </tr>
                            );
                          })()
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportTab === 'scorecard' && canViewScorecard && (
                <div className="bg-white rounded-xl shadow-sm border p-4 scorecard-print-scope report-print-scope">
                  {(() => {
                    const range = buildMonthPeriodRange(scorecardFilterMonthStart, scorecardFilterMonthEnd);
                    return renderReportHeader('RAPOR KINERJA SUPPLIER', range.start, range.end);
                  })()}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Trophy size={18}/> Rapor Kinerja Supplier</h3>
                    <div className="flex gap-2 items-center">
                      <div className="flex gap-2 items-center print:hidden">
                        <SearchableSelectDropdown
                          value={scorecardFilterSupplier === 'All' ? '' : scorecardFilterSupplier}
                          options={masterSupplierOptions}
                          placeholder="Filter nama supplier"
                          searchPlaceholder="Ketik kode / nama supplier"
                          emptyText="Supplier tidak ditemukan."
                          className="w-[280px]"
                          onChange={(nextValue) => setScorecardFilterSupplier(nextValue || 'All')}
                        />
                        <input
                          type="month"
                          className="border border-orange-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          title="Periode awal"
                          value={scorecardFilterMonthStart}
                          onChange={(e) => setScorecardFilterMonthStart(e.target.value)}
                        />
                        <span className="text-xs text-slate-500">s/d</span>
                        <input
                          type="month"
                          className="border border-orange-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          title="Periode akhir"
                          value={scorecardFilterMonthEnd}
                          onChange={(e) => setScorecardFilterMonthEnd(e.target.value)}
                        />
                        <select
                          className="border rounded px-2 py-1 text-xs text-slate-700"
                          value={reportPrintOrientation}
                          onChange={(e) => setReportPrintOrientation(e.target.value)}
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                        <button onClick={handlePrintReport} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg shadow transition" title="Cetak Rapor Kinerja">
                          <Printer size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      const rows = calculateSupplierPerformance();
                      if (scorecardSchedulesLoading) {
                        return (
                          <>
                            <ScorecardSkeleton />
                            <ScorecardSkeleton />
                            <ScorecardSkeleton />
                          </>
                        );
                      }
                      if (rows.length === 0) {
                        return <div className="text-center py-12 text-gray-400 italic">Belum ada data cukup untuk penilaian.</div>;
                      }
                      return rows.map((sup, idx) => {
                        const supKey = `${sup.name || 'supplier'}-${sup.monthLabel || ''}`;
                        const isExpanded = Boolean(scorecardExpanded[supKey]);
                        const items = Array.isArray(sup.items) ? sup.items : [];
                        const visibleItems = isExpanded ? items : items.slice(0, 10);
                        const hiddenCount = Math.max(items.length - visibleItems.length, 0);
                        return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row gap-6 print:shadow-none print:border print:break-inside-avoid scorecard-card"
                          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="bg-orange-100 p-2 rounded-lg text-orange-600 font-bold text-sm">#{idx + 1}</div>
                              <h4 className="font-bold text-lg text-gray-900">{sup.name}</h4>
                              {sup.monthLabel && <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-500">{sup.monthLabel}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {visibleItems.map((itm, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                  {itm}
                                </span>
                              ))}
                            </div>
                            {items.length > 10 && (
                              <button
                                type="button"
                                className="text-[10px] text-blue-600 hover:underline mb-3 print:hidden"
                                onClick={() => setScorecardExpanded((prev) => ({ ...prev, [supKey]: !isExpanded }))}
                              >
                                {isExpanded ? 'Sembunyikan' : `Tampilkan semua (${hiddenCount} lagi)`}
                              </button>
                            )}
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-sm border-t pt-3 text-center tabular-nums">
                              <div className="flex flex-col"><span className="text-gray-400 text-[10px] uppercase font-bold">Jadwal</span><span className="font-bold text-gray-800">{sup.totalSchedules}</span></div>
                              <div className="flex flex-col"><span className="text-green-600 text-[10px] uppercase font-bold">Tepat Waktu</span><span className="font-bold text-green-700">{sup.onTime}</span></div>
                              <div className="flex flex-col"><span className="text-red-500 text-[10px] uppercase font-bold">Terlambat</span><span className="font-bold text-red-600">{sup.late}</span></div>
                              <div className="flex flex-col"><span className="text-blue-600 text-[10px] uppercase font-bold">Terlalu Awal</span><span className="font-bold text-blue-700">{sup.tooEarly}</span></div>
                              <div className="flex flex-col"><span className="text-yellow-600 text-[10px] uppercase font-bold">Menunggu</span><span className="font-bold text-yellow-700">{sup.pending}</span></div>
                              <div className="flex flex-col"><span className="text-rose-600 text-[10px] uppercase font-bold">SNP Tidak Sesuai</span><span className="font-bold text-rose-700">{sup.packingLoose || 0}</span></div>
                              <div className="flex flex-col pl-4 border-l"><span className="text-gray-400 text-[10px] uppercase font-bold">Qty Jadwal</span><span className="font-bold text-gray-800">{sup.totalOrdered.toLocaleString()}</span></div>
                              <div className="flex flex-col"><span className="text-gray-400 text-[10px] uppercase font-bold">Qty Dikirim</span><span className="font-bold text-gray-800">{sup.totalReceived.toLocaleString()}</span></div>
                            </div>
                          </div>
                          <div className="scorecard-right kpi-rail">
                            <div className="kpi-tile kpi-tile--time">
                              <div className="text-2xl font-bold text-indigo-700">{sup.timeScore}%</div>
                              <div className="text-[10px] text-indigo-400 uppercase tracking-wide font-bold text-center leading-tight">Ketepatan<br/>Waktu</div>
                            </div>
                            <div className="kpi-tile kpi-tile--qty">
                              <div className="text-2xl font-bold text-teal-700">{sup.qtyScore}%</div>
                              <div className="text-[10px] text-teal-400 uppercase tracking-wide font-bold text-center leading-tight">Fulfillment<br/>(Qty)</div>
                            </div>
                            <div className="kpi-tile kpi-tile--packing">
                              <div className="text-2xl font-bold text-amber-700">{sup.packingScore === null || sup.packingScore === undefined ? '-' : `${sup.packingScore}%`}</div>
                              <div className="text-[10px] text-amber-500 uppercase tracking-wide font-bold text-center leading-tight">Packing/<br/>SNP</div>
                              <div className="mt-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                                Khusus Kg: toleransi &plusmn;25%
                              </div>
                            </div>
                            <div className="kpi-tile kpi-tile--rating">
                              <div className="flex mb-1">{[...Array(5)].map((_, i) => (<Star key={i} size={14} className={i < sup.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />))}</div>
                              <div className={`text-xs font-bold px-3 py-1 rounded-full ${sup.rating >= 4 ? 'bg-green-100 text-green-700' : sup.rating >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{sup.rating === 5 ? "Excellent" : sup.rating >= 4 ? "Good" : sup.rating >= 3 ? "Fair" : "Poor"}</div>
                            </div>
                          </div>
                        </div>
                      );
                      });
                    })()}
                  </div>
                </div>
              )}

              {reportTab === 'stock-coverage' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN STOCK COVERAGE', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={18}/> Stock Coverage Report</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchStockCoverageReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportStockCoverageExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Window (hari)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="border p-2 rounded w-full text-sm"
                        value={stockCoverageDays}
                        onChange={(e) => setStockCoverageDays(Number(e.target.value || 0))}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchStockCoverageReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <div className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-[11px] font-semibold text-amber-700">
                      Catatan: kolom SNP Tidak Sesuai memakai toleransi khusus item Kg sebesar ±25%.
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Stock</th>
                          <th className="text-right p-3">Avg Daily</th>
                          <th className="text-right p-3">Coverage (Days)</th>
                          <th className="text-right p-3">Safety Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && stockCoverageRows.length === 0 && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && stockCoverageRows.map((row, idx) => (
                          <tr key={`${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName}</div>
                            </td>
                            <td className="p-3 text-right">{Number(row.stockQty || 0).toLocaleString()}</td>
                            <td className="p-3 text-right">{Number(row.avgDailyConsumption || 0).toFixed(2)}</td>
                            <td className="p-3 text-right">{row.coverageDays === null ? '-' : Number(row.coverageDays || 0).toFixed(1)}</td>
                            <td className="p-3 text-right">{Number(row.safetyStock || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'slow-moving' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN SLOW & DEAD STOCK', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingDown size={18}/> Slow &amp; Dead Stock</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchSlowMovingReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportSlowMovingExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Stock</th>
                          <th className="text-center p-3">Last Out</th>
                          <th className="text-right p-3">Days</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && slowMovingRows.length === 0 && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && slowMovingRows.map((row, idx) => (
                          <tr key={`${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName}</div>
                            </td>
                            <td className="p-3 text-right">{Number(row.stockQty || 0).toLocaleString()}</td>
                            <td className="p-3 text-center">{row.lastOutAt ? new Date(row.lastOutAt).toLocaleDateString('id-ID') : '-'}</td>
                            <td className="p-3 text-right">{row.daysSinceLastOut ?? '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${row.status === 'Dead' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'inbound-performance' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN PENERIMAAN AKTUAL', reportStart, reportEnd)}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <ArrowDownUp size={18} />
                          Modul Laporan Penerimaan Aktual
                        </h3>
                        <p className="text-xs text-slate-500">
                          Satu layar untuk panduan input, laporan jadwal vs aktual SJ, dan grafik KPI supplier. Filter tanggal dan supplier berlaku di semua tab.
                        </p>
                      </div>
                      <div className="flex gap-2 items-center print:hidden">
                        <button onClick={fetchInboundPerformanceReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                        <button onClick={handleExportInboundPerformanceExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                        <select
                          className="border rounded px-2 py-1 text-xs text-slate-700"
                          value={reportPrintOrientation}
                          onChange={(e) => setReportPrintOrientation(e.target.value)}
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                        <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 print:hidden">
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Tanggal awal</label>
                        <input type="date" className="border p-2 rounded w-full text-sm" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Tanggal akhir</label>
                        <input type="date" className="border p-2 rounded w-full text-sm" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500">Cari supplier (opsional)</label>
                        <SearchableSelectDropdown
                          value={reportSupplier}
                          options={masterSupplierOptions}
                          placeholder="Cari supplier..."
                          searchPlaceholder="Ketik kode / nama supplier"
                          emptyText="Supplier tidak ditemukan."
                          className="w-full"
                          onChange={(nextValue) => setReportSupplier(nextValue || '')}
                        />
                      </div>
                      <div className="flex items-end">
                        <button onClick={fetchInboundPerformanceReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan Filter</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 print:hidden">
                      {[
                        { id: 'guide', label: 'Panduan Input' },
                        { id: 'transaction', label: 'Laporan Jadwal vs Aktual SJ' },
                        { id: 'kpi', label: 'Grafik KPI Supplier' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInboundReportTab(tab.id)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            inboundReportTab === tab.id
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {inboundReportTab === 'guide' && (
                      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                            Panduan Input Penerimaan Aktual
                          </div>
                          <h4 className="mt-3 text-xl font-bold text-slate-900">Input data tetap dilakukan di menu Penerimaan Aktual</h4>
                          <p className="mt-2 text-sm text-slate-600">
                            Tab ini menjadi panduan kerja agar tim PPIC dan gudang melihat alur yang sama antara input, laporan transaksi, dan KPI supplier.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">1. Pilih No PO</div>
                              <div className="mt-1 text-sm text-slate-700">Dropdown No PO hanya menampilkan PO OPEN/PARTIAL dengan sisa incoming &gt; 0.</div>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">2. Isi SJ / DO</div>
                              <div className="mt-1 text-sm text-slate-700">Nomor Surat Jalan / DO wajib diisi dan dicek real-time agar tidak duplikat.</div>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">3. Simpan</div>
                              <div className="mt-1 text-sm text-slate-700">Setelah simpan, nomor lot dan histori mutasi tetap bisa ditelusuri dari laporan.</div>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="text-sm font-semibold text-slate-900">Ringkasan filter aktif</div>
                          <div className="mt-4 space-y-3 text-sm text-slate-600">
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-slate-200">
                              <span>Periode laporan</span>
                              <span className="font-semibold text-slate-900">{formatPrintDate(reportStart)} s/d {formatPrintDate(reportEnd)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-slate-200">
                              <span>Supplier</span>
                              <span className="font-semibold text-slate-900">
                                {masterSupplierOptions.find((option) => option.value === reportSupplier)?.label || 'Semua supplier'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-slate-200">
                              <span>Jumlah transaksi</span>
                              <span className="font-semibold text-slate-900">{formatCount(inboundPerformanceRows.length)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {inboundReportTab === 'transaction' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Grafik Harian Tepat Waktu vs Terlambat</div>
                              <div className="text-xs text-slate-500">Setiap titik mengikuti tanggal jadwal di rentang filter yang dipilih.</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatCount(inboundDailyTrend.reduce((sum, row) => sum + Number(row.total || 0), 0))} baris transaksi ditampilkan
                            </div>
                          </div>
                          <div className="h-[320px] px-2 py-4">
                            {reportLoading ? (
                              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memuat...
                              </div>
                            ) : inboundDailyTrend.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                Tidak ada data untuk grafik.
                              </div>
                            ) : (
                              <SafeResponsiveContainer>
                                <LineChart data={inboundDailyTrend} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                  <Tooltip
                                    formatter={(value, name) => [formatCount(value), name]}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.dateKey || '-'}
                                  />
                                  <Legend />
                                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                                  <Line type="monotone" dataKey="onTime" name="Tepat Waktu" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                  <Line type="monotone" dataKey="late" name="Terlambat" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                </LineChart>
                              </SafeResponsiveContainer>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="text-left p-3">Supplier</th>
                                <th className="text-left p-3">No PO</th>
                                <th className="text-left p-3">No SJ / DO</th>
                                <th className="text-left p-3">Item</th>
                                <th className="text-center p-3">Jadwal</th>
                                <th className="text-center p-3">Aktual SJ</th>
                                <th className="text-right p-3">Qty Jadwal</th>
                                <th className="text-right p-3">Qty Aktual</th>
                                <th className="text-center p-3">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportLoading && (
                                <tr><td colSpan="9" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                              )}
                              {!reportLoading && inboundPerformanceRows.length === 0 && (
                                <tr><td colSpan="9" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                              )}
                              {!reportLoading && inboundPerformanceRows.map((row, idx) => (
                                <tr key={`${row.poNumber}-${idx}`} className="border-t">
                                  <td className="p-3">{resolveInboundSupplierMeta(row).name}</td>
                                  <td className="p-3">{row.poNumber}</td>
                                  <td className="p-3">{row.doNumber || '-'}</td>
                                  <td className="p-3">{row.item}</td>
                                  <td className="p-3 text-center">{row.requestDate ? new Date(row.requestDate).toLocaleDateString('id-ID') : '-'}</td>
                                  <td className="p-3 text-center">{row.arrivalDate ? new Date(row.arrivalDate).toLocaleDateString('id-ID') : '-'}</td>
                                  <td className="p-3 text-right">{Number(row.requestQty || 0).toLocaleString()}</td>
                                  <td className="p-3 text-right">{Number(row.receivedQty || 0).toLocaleString()}</td>
                                  <td className="p-3 text-center">{row.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {inboundReportTab === 'kpi' && (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Total Baris</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">{formatCount(inboundPerformanceRows.length)}</div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Tepat Waktu</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">
                              {formatCount(inboundPerformanceRows.filter((row) => normalizeInboundStatus(row?.status).includes('ontime') || normalizeInboundStatus(row?.status).includes('on-time')).length)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Terlambat</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">
                              {formatCount(inboundPerformanceRows.filter((row) => normalizeInboundStatus(row?.status).includes('late')).length)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Rasio Terlambat</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">
                              {inboundPerformanceRows.length
                                ? `${((inboundPerformanceRows.filter((row) => normalizeInboundStatus(row?.status).includes('late')).length / inboundPerformanceRows.length) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Rapor Supplier</div>
                              <div className="text-xs text-slate-500">Distribusi Tepat Waktu dan Terlambat untuk supplier yang sedang difilter.</div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Top {Math.min(8, inboundSupplierChartRows.length)} supplier dengan keterlambatan tertinggi
                            </div>
                          </div>
                          <div className="h-[320px] px-2 py-4">
                            {reportLoading ? (
                              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memuat...
                              </div>
                            ) : inboundSupplierChartRows.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                Tidak ada data supplier untuk grafik.
                              </div>
                            ) : (
                              <SafeResponsiveContainer>
                                <ComposedChart data={inboundSupplierChartRows} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="supplier" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                  <Tooltip
                                    formatter={(value, name) => [formatCount(value), name]}
                                    labelFormatter={(label) => label}
                                  />
                                  <Legend />
                                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
                                  <Bar dataKey="onTime" name="Tepat Waktu" fill="#16a34a" radius={[6, 6, 0, 0]} />
                                  <Bar dataKey="late" name="Terlambat" fill="#dc2626" radius={[6, 6, 0, 0]} />
                                </ComposedChart>
                              </SafeResponsiveContainer>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="text-left p-3">Supplier</th>
                                <th className="text-right p-3">Total</th>
                                <th className="text-right p-3">Tepat Waktu</th>
                                <th className="text-right p-3">Terlambat</th>
                                <th className="text-right p-3">Tepat Waktu %</th>
                                <th className="text-right p-3">Terlambat %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportLoading && (
                                <tr><td colSpan="6" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                              )}
                              {!reportLoading && inboundSupplierKpiRows.length === 0 && (
                                <tr><td colSpan="6" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                              )}
                              {!reportLoading && inboundSupplierKpiRows.map((row) => (
                                <tr key={row.supplierKey || row.supplier} className="border-t">
                                  <td className="p-3 font-medium text-slate-900">{row.supplier}</td>
                                  <td className="p-3 text-right">{formatCount(row.total)}</td>
                                  <td className="p-3 text-right text-emerald-600">{formatCount(row.onTime)}</td>
                                  <td className="p-3 text-right text-rose-600">{formatCount(row.late)}</td>
                                  <td className="p-3 text-right">{row.onTimeRate.toFixed(1)}%</td>
                                  <td className="p-3 text-right">{row.lateRate.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'fifo-violations' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN FIFO VIOLATIONS', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={18}/> FIFO Violation Log</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchFifoViolationReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportFifoViolationExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Item</th>
                          <th className="text-center p-3">Batch Dipakai</th>
                          <th className="text-center p-3">Batch Tertua</th>
                          <th className="text-left p-3">Reason</th>
                          <th className="text-center p-3">Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && fifoViolationRows.length === 0 && (
                          <tr><td colSpan="5" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && fifoViolationRows.map((row, idx) => (
                          <tr key={`${row.id}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName || '-'}</div>
                            </td>
                            <td className="p-3 text-center">{row.chosenBatchNo || '-'}</td>
                            <td className="p-3 text-center">{row.oldestBatchNo || '-'}</td>
                            <td className="p-3">{row.reason || '-'}</td>
                            <td className="p-3 text-center">{row.createdAt ? new Date(row.createdAt).toLocaleString('id-ID') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'inventory-value' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN INVENTORY VALUE', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Coins size={18}/> Inventory Value</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchInventoryValueReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportInventoryValueExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="mb-4 text-sm">
                    <span className="text-slate-500">Total Inventory Value: </span>
                    <span className="font-semibold text-slate-900">{inventoryValueTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Stock</th>
                          <th className="text-right p-3">Price</th>
                          <th className="text-right p-3">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="4" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && inventoryValueRows.length === 0 && (
                          <tr><td colSpan="4" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && inventoryValueRows.map((row, idx) => (
                          <tr key={`${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName}</div>
                            </td>
                            <td className="p-3 text-right">{Number(row.stockQty || 0).toLocaleString()}</td>
                            <td className="p-3 text-right">{Number(row.price || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-semibold">{Number(row.value || 0).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'supplier-shortage' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {(() => {
                    const range = buildMonthRange(supplierShortageMonth, supplierShortageYear);
                    return renderReportHeader('LAPORAN SHORTAGE SUPPLIER', range.start || reportStart, range.end || reportEnd);
                  })()}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={18}/> Report Shortage Supplier</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchSupplierShortageReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportSupplierShortageExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bulan</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={supplierShortageMonth}
                        onChange={(e) => setSupplierShortageMonth(e.target.value)}
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tahun</label>
                      <input
                        type="number"
                        className="border p-2 rounded w-full text-sm"
                        value={supplierShortageYear}
                        onChange={(e) => setSupplierShortageYear(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Supplier</label>
                      <SearchableSelectDropdown
                        value={supplierShortageSupplier}
                        options={masterSupplierOptions}
                        placeholder="Semua Supplier"
                        searchPlaceholder="Ketik kode / nama supplier"
                        emptyText="Supplier tidak ditemukan."
                        className="w-full"
                        onChange={(nextValue) => setSupplierShortageSupplier(nextValue || '')}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchSupplierShortageReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  <div className="mb-3 print:hidden text-xs text-slate-500">
                    Supplier aktif: <span className="font-semibold text-slate-700">{masterSupplierOptions.find((option) => option.value === supplierShortageSupplier)?.label || 'Semua Supplier'}</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Total Supplier</div>
                      <div className="mt-1 text-xl font-bold leading-tight text-slate-900">{Number(supplierShortageSummary?.totalSuppliers || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Item Shortage</div>
                      <div className="mt-1 text-xl font-bold leading-tight text-slate-900">{Number(supplierShortageSummary?.totalItems || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-rose-500">Urgent</div>
                      <div className="mt-1 text-xl font-bold leading-tight text-rose-700">{Number(supplierShortageSummary?.urgentItems || 0).toLocaleString('id-ID')}</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-amber-600">Total Shortage Qty</div>
                      <div className="mt-1 text-xl font-bold leading-tight text-amber-700">{Number(supplierShortageSummary?.totalShortageQty || 0).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-[1200px] w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Supplier</th>
                          <th className="text-left p-3">Item</th>
                          <th className="text-right p-3">Stock</th>
                          <th className="text-right p-3">Safety</th>
                          <th className="text-right p-3">Plan</th>
                          <th className="text-right p-3">Shortage</th>
                          <th className="text-right p-3">Daily Usage</th>
                          <th className="text-right p-3">Coverage</th>
                          <th className="text-right p-3">Lead Time</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="10" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && supplierShortageRows.length === 0 && (
                          <tr><td colSpan="10" className="p-4 text-center text-gray-400">Tidak ada data shortage supplier.</td></tr>
                        )}
                        {!reportLoading && supplierShortageRows.map((row, idx) => (
                          <tr key={`${row.supplierName}-${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.supplierName || '-'}</div>
                              <div className="text-xs text-slate-500">{row.supplierId || '-'}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName}</div>
                              <div className="text-[11px] text-slate-400">{row.partNo || '-'} / {row.typePack || '-'}</div>
                            </td>
                            <td className="p-3 text-right">{Number(row.stockQty || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right">{Number(row.safetyStock || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right">{Number(row.planQty || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-semibold text-rose-700">{Number(row.shortageQty || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right">{Number(row.dailyUsageQty || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right">{row.coverageDays == null ? '-' : Number(row.coverageDays).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right">{Number(row.leadTimeDays || 0).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                row.status === 'URGENT'
                                  ? 'border-rose-200 bg-rose-100 text-rose-700'
                                  : row.status === 'LOW STOCK'
                                    ? 'border-amber-200 bg-amber-100 text-amber-700'
                                    : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}
                              >
                                {row.status || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'raw-material-ledger' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader(
                    ledgerTitle,
                    rawMaterialLedgerMeta?.start || '',
                    rawMaterialLedgerMeta?.end || '',
                  )}
                  <div className="flex gap-2 items-center print:hidden">
                    <button onClick={() => handlePrintReport('landscape')} className="px-3 py-2 text-sm bg-slate-900 text-white rounded flex items-center gap-2">
                      <Printer size={16} /> Print / PDF
                    </button>
                    <button
                      onClick={handleExportRawMaterialLedgerExcel}
                      className="px-3 py-2 text-sm bg-emerald-600 text-white rounded flex items-center gap-2"
                    >
                      Excel
                    </button>
                    <span className="text-xs text-slate-500">Template A4 Landscape</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 mt-3 print:hidden">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Periode</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={rawMaterialLedgerPeriodType}
                        onChange={(e) => setRawMaterialLedgerPeriodType(e.target.value)}
                      >
                        <option value="monthly">Bulanan</option>
                        <option value="yearly">Tahunan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Kategori Item</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={ledgerCategory}
                        onChange={(e) => setRawMaterialLedgerCategory(e.target.value)}
                      >
                        {ledgerCategoryOptions.map((option) => (
                          <option key={option.value || option.label} value={option.value} disabled={option.disabled}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Lokasi (Opsional)</label>
                      <input
                        className="border p-2 rounded w-full text-sm"
                        list="ledger-location-options"
                        placeholder="Contoh: Bending / Gudang FG"
                        value={rawMaterialLedgerLocation}
                        onChange={(e) => setRawMaterialLedgerLocation(e.target.value)}
                      />
                      <datalist id="ledger-location-options">
                        {locationOptions.map((loc) => (
                          <option key={`ledger-loc-${loc}`} value={loc} />
                        ))}
                      </datalist>
                    </div>
                    {rawMaterialLedgerPeriodType === 'monthly' ? (
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Bulan</label>
                        <input
                          type="month"
                          className="border p-2 rounded w-full text-sm"
                          value={rawMaterialLedgerMonth}
                          onChange={(e) => setRawMaterialLedgerMonth(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Tahun</label>
                        <input
                          type="number"
                          min="2000"
                          className="border p-2 rounded w-full text-sm"
                          value={rawMaterialLedgerYear}
                          onChange={(e) => setRawMaterialLedgerYear(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="flex items-end">
                      <button
                        onClick={fetchRawMaterialLedgerReport}
                        disabled={rawMaterialLedgerLoading}
                        className="px-3 py-2 text-sm bg-slate-900 text-white rounded w-full"
                      >
                        {rawMaterialLedgerLoading ? 'Memuat...' : 'Tampilkan'}
                      </button>
                    </div>
                    <div className="flex items-end text-xs text-slate-500">
                      {ledgerNote}
                    </div>
                  </div>
                  {rawMaterialLedgerError && (
                    <div className="mt-2 text-xs text-red-600">{rawMaterialLedgerError}</div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-2 text-left">No</th>
                          <th className="p-2 text-left">Uniq / Part Number</th>
                          <th className="p-2 text-left">Nama Item</th>
                          <th className="p-2 text-left">Satuan</th>
                          <th className="p-2 text-right">Saldo Awal</th>
                          <th className="p-2 text-right">Total Masuk (IN)</th>
                          <th className="p-2 text-right">Total Keluar (OUT)</th>
                          <th className="p-2 text-right">Saldo Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawMaterialLedgerLoading && (
                          <tr>
                            <td colSpan="8" className="p-3 text-center text-gray-400">Memuat...</td>
                          </tr>
                        )}
                        {!rawMaterialLedgerLoading && rawMaterialLedgerRows.length === 0 && (
                          <tr>
                            <td colSpan="8" className="p-3 text-center text-gray-400">Belum ada data mutasi.</td>
                          </tr>
                        )}
                        {!rawMaterialLedgerLoading && rawMaterialLedgerRows.map((row, idx) => (
                          <tr key={`rm-ledger-${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2">{row.itemCode || '-'}{row.partNo ? ` / ${row.partNo}` : ''}</td>
                            <td className="p-2">{row.itemName || '-'}</td>
                            <td className="p-2">{row.unit || '-'}</td>
                            <td className="p-2 text-right">{Number(row.openingBalance || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.totalIn || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.totalOut || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.closingBalance || 0).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'all-mutations' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader(
                    'ALL LAPORAN MUTASI',
                    allMutationStart,
                    allMutationEnd,
                  )}
                  <div className="flex gap-2 items-center print:hidden">
                    <button onClick={() => handlePrintReport('landscape')} className="px-3 py-2 text-sm bg-slate-900 text-white rounded flex items-center gap-2">
                      <Printer size={16} /> Print / PDF
                    </button>
                    <span className="text-xs text-slate-500">Template A4 Landscape</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 mt-3 print:hidden">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Start Date</label>
                      <input
                        type="date"
                        className="border p-2 rounded w-full text-sm"
                        value={allMutationStart}
                        onChange={(e) => setAllMutationStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">End Date</label>
                      <input
                        type="date"
                        className="border p-2 rounded w-full text-sm"
                        value={allMutationEnd}
                        onChange={(e) => setAllMutationEnd(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Kategori Item</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={allMutationCategory}
                        onChange={(e) => setAllMutationCategory(e.target.value)}
                      >
                        {allMutationCategoryOptions.map((option) => (
                          <option
                            key={`all-mut-${option.value || option.label}`}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Lokasi (Opsional)</label>
                      <input
                        className="border p-2 rounded w-full text-sm"
                        list="ledger-location-options"
                        placeholder="Contoh: Bending / Gudang FG"
                        value={allMutationLocation}
                        onChange={(e) => setAllMutationLocation(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={fetchAllMutationReport}
                        disabled={allMutationLoading}
                        className="px-3 py-2 text-sm bg-slate-900 text-white rounded w-full"
                      >
                        {allMutationLoading ? 'Memuat...' : 'Tampilkan'}
                      </button>
                    </div>
                  </div>
                  {allMutationError && (
                    <div className="mt-2 text-xs text-red-600">{allMutationError}</div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-2 text-left">Tanggal</th>
                          <th className="p-2 text-left">Kode Item</th>
                          <th className="p-2 text-left">Nama Item</th>
                          <th className="p-2 text-left">Kategori Item</th>
                          <th className="p-2 text-left">Lokasi</th>
                          <th className="p-2 text-right">Saldo Awal</th>
                          <th className="p-2 text-right">Qty Masuk (In)</th>
                          <th className="p-2 text-right">Qty Keluar (Out)</th>
                          <th className="p-2 text-right">Saldo Akhir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMutationLoading && (
                          <tr>
                            <td colSpan="9" className="p-3 text-center text-gray-400">Memuat...</td>
                          </tr>
                        )}
                        {!allMutationLoading && allMutationRows.length === 0 && (
                          <tr>
                            <td colSpan="9" className="p-3 text-center text-gray-400">Belum ada data mutasi.</td>
                          </tr>
                        )}
                        {!allMutationLoading && allMutationRows.map((row, idx) => (
                          <tr key={`all-mutation-${row.itemCode}-${row.date}-${idx}`} className="border-t">
                            <td className="p-2">{formatPrintDate(row.date)}</td>
                            <td className="p-2">{row.itemCode || '-'}</td>
                            <td className="p-2">{row.itemName || '-'}</td>
                            <td className="p-2">{row.category || '-'}</td>
                            <td className="p-2">{row.location || '-'}</td>
                            <td className="p-2 text-right">{Number(row.openingBalance || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.qtyIn || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.qtyOut || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{Number(row.closingBalance || 0).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'sasaran-mutu' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope quality-sps-report">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle size={18}/> Laporan Sasaran Mutu</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchQualityObjectivesReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportQualityObjectivesExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <button onClick={() => handlePrintReport('landscape')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF Landscape</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 print:hidden">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">Supplier</label>
                      <SearchableSelectDropdown
                        value={qualityObjectivesSupplier}
                        options={[{ value: '', label: 'ALL - Semua Supplier' }, ...masterSupplierOptions]}
                        placeholder="ALL - Semua Supplier"
                        onChange={(value) => setQualityObjectivesSupplier(value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bulan Awal</label>
                      <select
                        className="border p-2 rounded w-full text-sm bg-white"
                        value={qualityObjectivesMonthStart}
                        onChange={(e) => setQualityObjectivesMonthStart(e.target.value)}
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bulan Akhir</label>
                      <select
                        className="border p-2 rounded w-full text-sm bg-white"
                        value={qualityObjectivesMonthEnd}
                        onChange={(e) => setQualityObjectivesMonthEnd(e.target.value)}
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tahun</label>
                      <input
                        type="number"
                        className="border p-2 rounded w-full text-sm"
                        value={qualityObjectivesYear}
                        onChange={(e) => {
                          const nextYear = e.target.value;
                          setQualityObjectivesYear(nextYear);
                          const currentMonthPart = String(qualityObjectivesMonth || '').slice(5, 7) || '01';
                          if (nextYear) setQualityObjectivesMonth(`${nextYear}-${currentMonthPart}`);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchQualityObjectivesReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>

                  <div className="quality-sps-sheet">
                    <div className="quality-sps-header">
                      <div className="quality-sps-brand">
                        <img src={logoPrl} alt="PT. Matra Roda Piranti" />
                        <div className="quality-sps-company">PT. Matra Roda Piranti</div>
                        <div className="quality-sps-dept">Production Planning & Inventory Control</div>
                      </div>
                      <div className="quality-sps-title">
                        <div>SASARAN MUTU PPIC</div>
                        <span>TAHUN {qualitySpsYear}</span>
                      </div>
                      <div className="quality-sps-meta">
                        <div className="quality-sps-meta-row">
                          <span>Supplier</span>
                          <b>{qualitySpsSupplierLabel}</b>
                        </div>
                        <div className="quality-sps-meta-row">
                          <span>Periode</span>
                          <b>{qualityMonthRangeText}</b>
                        </div>
                      </div>
                    </div>

                    {reportLoading ? (
                      <div className="py-8 text-center text-sm text-slate-500">Memuat laporan sasaran mutu...</div>
                    ) : (
                      <>
                        {renderQualitySpsTable()}
                        <div className="quality-sps-chart">
                          <SafeResponsiveContainer>
                            <ComposedChart data={qualitySpsChartRows} margin={{ top: 18, right: 42, bottom: 34, left: 10 }}>
                              <CartesianGrid stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#334155' }} interval={0} axisLine={{ stroke: '#94a3b8' }} tickLine={{ stroke: '#94a3b8' }} />
                              <YAxis yAxisId="qty" tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(value) => Number(value || 0).toLocaleString('id-ID')} axisLine={{ stroke: '#94a3b8' }} tickLine={{ stroke: '#94a3b8' }} />
                              <YAxis yAxisId="percent" orientation="right" domain={[0, 120]} tick={{ fontSize: 10, fill: '#334155' }} tickFormatter={(value) => `${value}%`} axisLine={{ stroke: '#94a3b8' }} tickLine={{ stroke: '#94a3b8' }} />
                              <Tooltip formatter={(value, name) => {
                                if (name === '%') return [`${Number(value || 0).toFixed(0)}%`, name];
                                return [Number(value || 0).toLocaleString('id-ID'), name];
                              }} />
                              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 10, color: '#334155' }} />
                              <Bar yAxisId="qty" dataKey="incomingQty" name="Total Incoming (Pcs)" fill="#2563eb" barSize={22}>
                                <LabelList dataKey="incomingQty" position="insideBottom" angle={-90} formatter={(value) => (value ? formatSpsQty(value) : '')} fill="#ffffff" fontSize={10} />
                              </Bar>
                              <Bar yAxisId="qty" dataKey="dnOrderQty" name="Total DN Order (Pcs)" fill="#f97316" barSize={22}>
                                <LabelList dataKey="dnOrderQty" position="insideBottom" angle={-90} formatter={(value) => (value ? formatSpsQty(value) : '')} fill="#ffffff" fontSize={10} />
                              </Bar>
                              <Line yAxisId="percent" type="monotone" dataKey="percent" name="%" stroke="#475569" strokeWidth={2.2} dot={{ r: 3, fill: '#475569' }} connectNulls={false}>
                                <LabelList dataKey="percent" position="top" formatter={(value) => (value ? `${Math.round(value)}%` : '')} fill="#111827" fontSize={10} fontWeight={700} />
                              </Line>
                            </ComposedChart>
                          </SafeResponsiveContainer>
                        </div>
                        {renderQualitySpsSignatures()}
                      </>
                    )}
                  </div>
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'qc-report' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {renderReportHeader('LAPORAN QUALITY CONTROL', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={18}/> Laporan QC</h3>
                      <p className="text-xs text-slate-500 mt-1">Incoming RN, Material NG Line, Production NG, Return, correction review, dan Mill Sheet.</p>
                    </div>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchQcReport} disabled={qcReportLoading} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">
                        {qcReportLoading ? 'Memuat...' : 'Refresh'}
                      </button>
                      <button onClick={handleExportQcReportExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <button onClick={() => handlePrintReport('landscape')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF Landscape</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tanggal Awal</label>
                      <input
                        type="date"
                        className="border p-2 rounded w-full text-sm"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tanggal Akhir</label>
                      <input
                        type="date"
                        className="border p-2 rounded w-full text-sm"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">Supplier</label>
                      <SearchableSelectDropdown
                        value={reportSupplier}
                        options={[{ value: '', label: 'ALL - Semua Supplier' }, ...masterSupplierOptions]}
                        placeholder="ALL - Semua Supplier"
                        onChange={(value) => setReportSupplier(value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchQcReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>

                  <div className="mb-4 rounded border bg-slate-50 p-3 text-xs text-slate-600">
                    <b>Scope:</b> {qcSupplierLabel} | Periode {formatPrintDate(reportStart)} s/d {formatPrintDate(reportEnd)}
                  </div>

                  {qcReportError && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{qcReportError}</div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-900 text-white p-3 rounded border border-slate-900">
                      <div className="text-xs text-slate-300 uppercase">Item Datang</div>
                      <div className="font-bold text-xl">{formatCount(qcSummary.incomingItemCount)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Qty Datang</div>
                      <div className="font-bold text-xl">{formatQuantity(qcSummary.incomingReceivedQty)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Qty NG</div>
                      <div className="font-bold text-xl text-rose-600">{formatQuantity(qcSummary.incomingNgQty)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Total PPM</div>
                      <div className="font-bold text-xl text-indigo-700">{formatCount(qcSummary.incomingPpm)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Total Case</div>
                      <div className="font-bold text-xl">{formatCount(qcSummary.totalCases)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Open Case</div>
                      <div className="font-bold text-xl text-amber-600">{formatCount(qcSummary.openCases)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Release Rate</div>
                      <div className="font-bold text-xl text-emerald-600">{formatPercent(qcSummary.releaseRate)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Reject/Return</div>
                      <div className="font-bold text-xl text-rose-600">{formatCount((qcSummary.rejectCount || 0) + (qcSummary.returnSupplierCount || 0))}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Case PPM</div>
                      <div className="font-bold text-xl">{formatCount(qcSummary.defectPpm)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Aging Open</div>
                      <div className="font-bold text-xl">{Number(qcSummary.avgOpenAgingDays || 0).toFixed(1)} hari</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Incoming QC</div>
                      <div className="font-bold">{formatCount(qcSummary.incomingCases)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Material NG Line</div>
                      <div className="font-bold text-rose-700">{formatCount(qcSummary.materialLineNg)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Production NG</div>
                      <div className="font-bold text-orange-700">{formatCount(qcSummary.productionNg)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Hold</div>
                      <div className="font-bold text-amber-700">{formatCount(qcSummary.holdCount)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Correction Review</div>
                      <div className="font-bold">{formatCount(qcSummary.correctionReviewCount)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <div className="text-xs text-gray-400 uppercase">Mill Sheet Open</div>
                      <div className="font-bold text-purple-700">{formatCount((qcMillsheet.waitingQc || 0) + (qcMillsheet.pendingReceipts || 0))}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden mb-6">
                    <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">Seluruh Item Datang dan PPM</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="p-2 text-left">Supplier</th>
                            <th className="p-2 text-left">Item</th>
                            <th className="p-2 text-left">Part No</th>
                            <th className="p-2 text-right">RN</th>
                            <th className="p-2 text-left">Datang Terakhir</th>
                            <th className="p-2 text-right">Qty Datang</th>
                            <th className="p-2 text-right">Qty OK</th>
                            <th className="p-2 text-right">Qty NG</th>
                            <th className="p-2 text-right">PPM</th>
                            <th className="p-2 text-left">QC Status</th>
                            <th className="p-2 text-left">Defect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qcReportLoading && (
                            <tr><td colSpan="11" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                          )}
                          {!qcReportLoading && (qcReportData.incomingItemRows || []).length === 0 && (
                            <tr><td colSpan="11" className="p-4 text-center text-slate-400">Belum ada item datang pada periode ini.</td></tr>
                          )}
                          {!qcReportLoading && (qcReportData.incomingItemRows || []).map((row) => (
                            <tr key={`qc-incoming-${row.supplierCode}-${row.itemCode}`} className="border-t">
                              <td className="p-2">
                                <div className="font-semibold">{row.supplierCode || '-'}</div>
                                <div className="text-[11px] text-slate-500">{row.supplierName || '-'}</div>
                              </td>
                              <td className="p-2">
                                <div className="font-semibold">{row.itemCode || '-'}</div>
                                <div className="text-[11px] text-slate-500">{row.itemName || '-'}</div>
                              </td>
                              <td className="p-2">{row.partNo || '-'}</td>
                              <td className="p-2 text-right">{formatCount(row.rnCount)}</td>
                              <td className="p-2">{formatPrintDate(row.lastReceivedAt)}</td>
                              <td className="p-2 text-right">{formatQuantity(row.receivedQty)}</td>
                              <td className="p-2 text-right text-emerald-700">{formatQuantity(row.qtyOk)}</td>
                              <td className="p-2 text-right text-rose-700">{formatQuantity(row.qtyNg)}</td>
                              <td className="p-2 text-right font-semibold">{formatCount(row.ppm)}</td>
                              <td className="p-2">{row.qcStatus || '-'}</td>
                              <td className="p-2">{row.defectCategory || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="mb-3 text-sm font-semibold text-slate-800">Trend QC Bulanan</div>
                      <div className="h-72">
                        <SafeResponsiveContainer>
                          <ComposedChart data={qcMonthlyChartRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="count" allowDecimals={false} />
                            <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <Tooltip formatter={(value, name) => (name === 'Release Rate' ? `${Number(value || 0).toFixed(1)}%` : formatCount(value))} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar yAxisId="count" dataKey="totalCases" name="Total Case" fill="#334155" barSize={20} />
                            <Bar yAxisId="count" dataKey="openCases" name="Open" fill="#f59e0b" barSize={20} />
                            <Bar yAxisId="count" dataKey="rejectCount" name="Reject" fill="#e11d48" barSize={20} />
                            <Line yAxisId="rate" type="monotone" dataKey="releaseRate" name="Release Rate" stroke="#059669" strokeWidth={2} />
                            <ReferenceLine yAxisId="rate" y={95} stroke="#16a34a" strokeDasharray="4 4" />
                          </ComposedChart>
                        </SafeResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-3">
                      <div className="mb-3 text-sm font-semibold text-slate-800">Disposition QC</div>
                      <div className="h-72">
                        <SafeResponsiveContainer>
                          <ComposedChart data={qcDispositionChartRows} layout="vertical" margin={{ left: 30, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="label" width={115} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => formatCount(value)} />
                            <Bar dataKey="totalCases" name="Case" fill="#4f46e5" barSize={18}>
                              <LabelList dataKey="totalCases" position="right" formatter={(value) => formatCount(value)} fontSize={11} />
                            </Bar>
                          </ComposedChart>
                        </SafeResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">Performance QC Supplier</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">Supplier</th>
                              <th className="p-2 text-right">Case</th>
                              <th className="p-2 text-right">Open</th>
                              <th className="p-2 text-right">NG Line</th>
                              <th className="p-2 text-right">Reject</th>
                              <th className="p-2 text-right">Closure</th>
                              <th className="p-2 text-center">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qcReportLoading && (
                              <tr><td colSpan="7" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.supplierRows || []).length === 0 && (
                              <tr><td colSpan="7" className="p-4 text-center text-slate-400">Belum ada data supplier QC.</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.supplierRows || []).map((row) => (
                              <tr key={`qc-supplier-${row.supplierCode}`} className="border-t">
                                <td className="p-2">
                                  <div className="font-semibold">{row.supplierCode || '-'}</div>
                                  <div className="text-[11px] text-slate-500">{row.supplierName || '-'}</div>
                                </td>
                                <td className="p-2 text-right">{formatCount(row.totalCases)}</td>
                                <td className="p-2 text-right text-amber-700">{formatCount(row.openCases)}</td>
                                <td className="p-2 text-right text-rose-700">{formatCount(row.materialLineNg)}</td>
                                <td className="p-2 text-right text-red-700">{formatCount(row.rejectCases)}</td>
                                <td className="p-2 text-right">{formatPercent(row.closureRate)}</td>
                                <td className="p-2 text-center">
                                  <span className={`inline-flex min-w-14 justify-center rounded px-2 py-1 font-bold ${getQcScoreClass(row.qualityScore)}`}>
                                    {formatPercent(row.qualityScore)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">Top Defect</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">Defect</th>
                              <th className="p-2 text-right">Case</th>
                              <th className="p-2 text-right">Qty Defect</th>
                              <th className="p-2 text-right">Major</th>
                              <th className="p-2 text-right">Critical</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qcReportLoading && (
                              <tr><td colSpan="5" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.topDefects || []).length === 0 && (
                              <tr><td colSpan="5" className="p-4 text-center text-slate-400">Belum ada defect tercatat.</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.topDefects || []).map((row) => (
                              <tr key={`qc-defect-${row.defect}`} className="border-t">
                                <td className="p-2 font-semibold">{row.defect}</td>
                                <td className="p-2 text-right">{formatCount(row.totalCases)}</td>
                                <td className="p-2 text-right">{formatQuantity(row.defectQty)}</td>
                                <td className="p-2 text-right text-orange-700">{formatCount(row.major)}</td>
                                <td className="p-2 text-right text-red-700">{formatCount(row.critical)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="mb-3 text-sm font-semibold">Mill Sheet Control</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded bg-slate-50 p-3"><div className="text-xs text-slate-400">Dokumen</div><b>{formatCount(qcMillsheet.totalDocuments)}</b></div>
                        <div className="rounded bg-amber-50 p-3"><div className="text-xs text-amber-600">Waiting QC</div><b>{formatCount(qcMillsheet.waitingQc)}</b></div>
                        <div className="rounded bg-emerald-50 p-3"><div className="text-xs text-emerald-600">Approved</div><b>{formatCount(qcMillsheet.approved)}</b></div>
                        <div className="rounded bg-rose-50 p-3"><div className="text-xs text-rose-600">Rejected</div><b>{formatCount(qcMillsheet.rejected)}</b></div>
                        <div className="rounded bg-purple-50 p-3"><div className="text-xs text-purple-600">RN Pending</div><b>{formatCount(qcMillsheet.pendingReceipts)}</b></div>
                        <div className="rounded bg-red-50 p-3"><div className="text-xs text-red-600">Overdue</div><b>{formatCount(qcMillsheet.overdueReceipts)}</b></div>
                      </div>
                    </div>
                    <div className="lg:col-span-2 rounded-lg border overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">Open Case Aging</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">Tanggal</th>
                              <th className="p-2 text-left">Case</th>
                              <th className="p-2 text-left">Source</th>
                              <th className="p-2 text-left">Item</th>
                              <th className="p-2 text-left">Supplier</th>
                              <th className="p-2 text-right">Qty</th>
                              <th className="p-2 text-left">Defect</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qcReportLoading && (
                              <tr><td colSpan="8" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.openCases || []).length === 0 && (
                              <tr><td colSpan="8" className="p-4 text-center text-slate-400">Tidak ada open case.</td></tr>
                            )}
                            {!qcReportLoading && (qcReportData.openCases || []).map((row) => (
                              <tr key={`qc-open-${row.id}`} className="border-t">
                                <td className="p-2">{formatPrintDate(row.eventAt || row.createdAt)}</td>
                                <td className="p-2 font-semibold">{row.caseNumber || '-'}</td>
                                <td className="p-2">{qcSourceLabels[row.sourceType] || row.sourceType || '-'}</td>
                                <td className="p-2">
                                  <div className="font-semibold">{row.itemCode || '-'}</div>
                                  <div className="text-[11px] text-slate-500">{row.itemName || '-'}</div>
                                </td>
                                <td className="p-2">{row.supplierCode || row.supplier || '-'}</td>
                                <td className="p-2 text-right">{formatQuantity(row.qty)}</td>
                                <td className="p-2">{row.defectCategory || row.defectDescription || '-'}</td>
                                <td className="p-2">
                                  <span className="rounded bg-amber-50 px-2 py-1 text-amber-700 font-semibold">{row.status || '-'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'capacity-planning' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {(() => {
                    const range = buildMonthRange(capacityPlanningMonth, capacityPlanningYear);
                    return renderReportHeader('LAPORAN CAPACITY PLANNING', range.start || reportStart, range.end || reportEnd);
                  })()}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={18}/> Capacity Planning</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchCapacityPlanningReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportCapacityPlanningExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bulan</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={capacityPlanningMonth}
                        onChange={(e) => setCapacityPlanningMonth(e.target.value)}
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tahun</label>
                      <input
                        type="number"
                        className="border p-2 rounded w-full text-sm"
                        value={capacityPlanningYear}
                        onChange={(e) => setCapacityPlanningYear(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchCapacityPlanningReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  {capacityPlanningData?.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Plan Qty</div>
                        <div className="font-bold">{formatQuantity(capacityPlanningData.summary.totalPlannedQty)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Actual Qty</div>
                        <div className="font-bold">{formatQuantity(capacityPlanningData.summary.totalActualQty)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Plan Load Hours</div>
                        <div className="font-bold text-indigo-600">{formatQuantity(capacityPlanningData.summary.totalPlannedLoadHours)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Actual Load Hours</div>
                        <div className="font-bold text-emerald-600">{formatQuantity(capacityPlanningData.summary.totalActualLoadHours)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Work Centers</div>
                        <div className="font-bold">{formatCount(capacityPlanningData.summary.workCenters)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Tanggal</div>
                        <div className="font-bold">{formatCount(capacityPlanningData.summary.dates)}</div>
                      </div>
                    </div>
                  )}
                  <div className="mb-6 rounded-lg border bg-white p-3">
                    <div className="mb-3 text-sm font-semibold text-slate-700">Load Harian Total</div>
                    <div className="h-72">
                      <SafeResponsiveContainer>
                        <ComposedChart data={capacityDailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor((capacityDailyChartData.length || 1) / 12))} />
                          <YAxis tickFormatter={(value) => `${value}`} />
                          <Tooltip formatter={(value) => formatQuantity(value)} />
                          <Legend />
                          <ReferenceLine y={capacityPerDayHours} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Capacity/Day', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
                          <Bar dataKey="plannedLoadHours" fill="#3b82f6" name="Planned Load" />
                          <Bar dataKey="actualLoadHours" fill="#f59e0b" name="Actual Load" />
                          <Line type="monotone" dataKey="capacityHours" stroke="#ef4444" strokeWidth={2} dot={false} name="Capacity/Day" />
                        </ComposedChart>
                      </SafeResponsiveContainer>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
                    <div className="lg:col-span-2 rounded-lg border bg-white p-3">
                      <label className="text-xs font-semibold text-gray-500">Work Center Detail</label>
                      <select
                        className="mt-1 border p-2 rounded w-full text-sm"
                        value={capacityPlanningWorkCenter}
                        onChange={(e) => setCapacityPlanningWorkCenter(e.target.value)}
                      >
                        {capacityWorkCenterRows.length === 0 && <option value="">Tidak ada work center</option>}
                        {capacityWorkCenterRows.map((row) => (
                          <option key={row.workCenter} value={row.workCenter}>
                            {row.workCenter} - {formatQuantity(row.totalLoadHours)} jam
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Shift / Hari</label>
                          <input
                            type="number"
                            min="1"
                            max="3"
                            className="mt-1 border p-2 rounded w-full text-sm"
                            value={capacityPlanningShiftCount}
                            onChange={(e) => setCapacityPlanningShiftCount(Math.min(3, Math.max(1, Number(e.target.value) || 1)))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Jam / Shift</label>
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            className="mt-1 border p-2 rounded w-full text-sm"
                            value={capacityPlanningShiftHours}
                            onChange={(e) => setCapacityPlanningShiftHours(Math.max(0.5, Number(e.target.value) || 8))}
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Chart di bawah dibaca dari `schedule.request_date` dan `production_orders.production_date`.
                      </div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Work Days</div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">{formatCount(capacityWorkingDays)}</div>
                      <div className="mt-2 text-xs text-slate-500">Perhitungan mengikuti konfigurasi hari kerja bila tersedia, lalu fallback ke Senin-Jumat.</div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Load / Period</div>
                      <div className="mt-1 text-2xl font-bold text-indigo-600">{formatQuantity(capacitySelectedLoadHours)}</div>
                      <div className="mt-2 text-xs text-slate-500">Total load work center terpilih dalam periode ini.</div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Utilization</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-600">{formatPercent(capacityUtilization)}</div>
                        <div className="mt-2 text-xs text-slate-500">Dibandingkan dengan kapasitas {formatQuantity(capacityPerDayHours)} jam/hari.</div>
                    </div>
                  </div>
                  {capacitySelectedChartData.length > 0 && (
                    <div className="mb-6 rounded-lg border bg-white p-3">
                      <div className="mb-3 text-sm font-semibold text-slate-700">Load Harian Work Center Terpilih</div>
                      <div className="h-80">
                        <SafeResponsiveContainer>
                          <ComposedChart data={capacitySelectedChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor((capacitySelectedChartData.length || 1) / 12))} />
                            <YAxis tickFormatter={(value) => `${value}`} />
                            <Tooltip formatter={(value) => formatQuantity(value)} />
                            <Legend />
                            <ReferenceLine y={capacityPerDayHours} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Capacity/Day', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
                            <Bar dataKey="plannedLoadHours" fill="#3b82f6" name="Planned Load" />
                            <Bar dataKey="actualLoadHours" fill="#f59e0b" name="Actual Load" />
                            <Line type="monotone" dataKey="capacityHours" stroke="#ef4444" strokeWidth={2} dot={false} name="Capacity/Day" />
                          </ComposedChart>
                        </SafeResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {capacitySelectedChartData.length > 0 && (
                    <div className="mb-6 rounded-lg border bg-white overflow-x-auto">
                      <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">Detail Harian Work Center Terpilih</div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-3 text-left">Tanggal</th>
                            <th className="p-3 text-right">Planned Load</th>
                            <th className="p-3 text-right">Actual Load</th>
                            <th className="p-3 text-right">Capacity</th>
                            <th className="p-3 text-right">Utilization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capacitySelectedChartData.map((row, idx) => {
                            const utilization = row.capacityHours > 0 ? ((Number(row.plannedLoadHours || 0) + Number(row.actualLoadHours || 0)) / Number(row.capacityHours || 0)) * 100 : 0;
                            return (
                              <tr key={`${row.date}-${idx}`} className="border-t">
                                <td className="p-3 font-medium">{row.date}</td>
                                <td className="p-3 text-right">{formatQuantity(row.plannedLoadHours)}</td>
                                <td className="p-3 text-right">{formatQuantity(row.actualLoadHours)}</td>
                                <td className="p-3 text-right">{formatQuantity(row.capacityHours)}</td>
                                <td className="p-3 text-right">{formatPercent(utilization)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border overflow-x-auto">
                      <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">Work Center Load</div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-3 text-left">Work Center</th>
                            <th className="p-3 text-right">Planned Load</th>
                            <th className="p-3 text-right">Actual Load</th>
                            <th className="p-3 text-right">Total Load</th>
                            <th className="p-3 text-left">Processes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportLoading && (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                          )}
                          {!reportLoading && (!capacityPlanningData?.workCenters || capacityPlanningData.workCenters.length === 0) && (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                          )}
                          {!reportLoading && (capacityPlanningData?.workCenters || []).map((row, idx) => (
                            <tr key={`${row.workCenter || 'wc'}-${idx}`} className="border-t">
                              <td className="p-3 font-medium">{row.workCenter || '-'}</td>
                              <td className="p-3 text-right">{formatQuantity(row.plannedLoadHours)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.actualLoadHours)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.totalLoadHours)}</td>
                              <td className="p-3 text-xs text-slate-600">{Array.isArray(row.processNames) && row.processNames.length > 0 ? row.processNames.join(', ') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-white rounded-lg border overflow-x-auto">
                      <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">Item Lead Time & Routing</div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-3 text-left">Item</th>
                            <th className="p-3 text-left">Type</th>
                            <th className="p-3 text-right">Planned Qty</th>
                            <th className="p-3 text-right">Actual Qty</th>
                            <th className="p-3 text-right">Lead Time / Unit (Jam)</th>
                            <th className="p-3 text-right">Planned Load</th>
                            <th className="p-3 text-right">Actual Load</th>
                            <th className="p-3 text-left">Routing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportLoading && (
                            <tr><td colSpan="7" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                          )}
                          {!reportLoading && (!capacityPlanningData?.rows || capacityPlanningData.rows.length === 0) && (
                            <tr><td colSpan="7" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                          )}
                          {!reportLoading && (capacityPlanningData?.rows || []).map((row, idx) => (
                            <tr key={`${row.itemCode || 'item'}-${idx}`} className="border-t">
                              <td className="p-3">
                                <div className="font-semibold">{row.itemCode || '-'}</div>
                                <div className="text-xs text-slate-500">{row.itemName || '-'}</div>
                              </td>
                              <td className="p-3">{row.itemType || '-'}</td>
                              <td className="p-3 text-right">{formatQuantity(row.plannedQty)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.actualQty)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.unitLeadTimeHours)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.plannedLoadHours)}</td>
                              <td className="p-3 text-right">{formatQuantity(row.actualLoadHours)}</td>
                              <td className="p-3 text-xs text-slate-600">
                                <div>{row.routingSummary || '-'}</div>
                                {Array.isArray(row.workCenters) && row.workCenters.length > 0 && (
                                  <div className="mt-1 text-[11px] text-slate-400">
                                    {row.workCenters.map((wc) => `${wc.workCenter}: ${formatQuantity(wc.loadHours)} jam`).join(' | ')}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'outstanding-prl' && canViewReport && (
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {(() => {
                    const range = buildMonthRange(outstandingPrlMonth, outstandingPrlYear);
                    return renderReportHeader('LAPORAN OUTSTANDING PRL', range.start || reportStart, range.end || reportEnd);
                  })()}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><ListChecks size={18}/> Outstanding PRL</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchOutstandingPrlReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportOutstandingPrlExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
                      <select
                        className="border rounded px-2 py-1 text-xs text-slate-700"
                        value={reportPrintOrientation}
                        onChange={(e) => setReportPrintOrientation(e.target.value)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                      <button onClick={handlePrintReport} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 print:hidden">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Bulan</label>
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={outstandingPrlMonth}
                        onChange={(e) => setOutstandingPrlMonth(e.target.value)}
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Tahun</label>
                      <input
                        type="number"
                        className="border p-2 rounded w-full text-sm"
                        value={outstandingPrlYear}
                        onChange={(e) => setOutstandingPrlYear(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchOutstandingPrlReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Item</th>
                          <th className="text-left p-3">Model</th>
                          <th className="text-left p-3">UOM</th>
                          <th className="text-left p-3">Type Pack</th>
                          <th className="text-right p-3">Plan Qty</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="6" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && outstandingPrlRows.length === 0 && (
                          <tr><td colSpan="6" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && outstandingPrlRows.map((row, idx) => (
                          <tr key={`${row.itemCode}-${idx}`} className="border-t">
                            <td className="p-3">
                              <div className="font-semibold">{row.itemCode}</div>
                              <div className="text-xs text-slate-500">{row.itemName}</div>
                            </td>
                            <td className="p-3">{getModelCodeText(row.model)}</td>
                            <td className="p-3">{row.uom || '-'}</td>
                            <td className="p-3">{row.typePack || '-'}</td>
                            <td className="p-3 text-right">{Number(row.planQty || 0).toLocaleString()}</td>
                            <td className="p-3 text-center">{String(row.status || 'pending').toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderReportSignatures()}
                  <div className="report-page-footer print-only" />
                </div>
              )}

              {reportTab === 'inbound-matrix' && canViewReport && (
                <TabReportInbound
                  schedules={schedules}
                  ensureSchedulesLoaded={ensureSchedulesLoaded}
                  scheduleLoading={scheduleLoading}
                  masterVendors={masterVendors}
                />
              )}

            </div>
            )}

    </>
  );
};

export default TabReports;
