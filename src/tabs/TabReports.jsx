import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
  Coins,
  FileText,
  Loader2,
  ListChecks,
  Printer,
  Sparkles,
  Star,
  TrendingDown,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import logoMatra from '../assets/logo-matra.png';
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
    mainTab,
    reportTab,
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
    handlePrintQualityObjectives,
    masterAreas,
    masterCategories,
    masterLocations,
    masterProcesses,
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

  const renderReportHeader = (title, periodStart, periodEnd) => (
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
      style.innerHTML = `
        @media print {
          @page {
            size: A4 ${orientation};
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
        const existingStyle = document.querySelector('style[data-report-page]');
        if (existingStyle) existingStyle.remove();
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
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
  const [capacityPlanningWorkCenter, setCapacityPlanningWorkCenter] = useState('');
  const [capacityPlanningShiftCount, setCapacityPlanningShiftCount] = useState(3);
  const [capacityPlanningShiftHours, setCapacityPlanningShiftHours] = useState(8);

  const qualityPeriodLabel = qualityObjectivesData?.period?.label || qualityObjectivesMonth || '-';
  const formatQualityPercent = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };
  const getQualityStatusBadge = (status) => (
    status === 'TERCAPAI'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-rose-100 text-rose-700 border-rose-200'
  );
  const renderQualityTable = (title, rows, nameLabel) => (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <div className="px-4 py-3 border-b bg-slate-50 text-sm font-semibold text-slate-700">{title}</div>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-center w-12">No</th>
            <th className="p-3 text-left">{nameLabel}</th>
            <th className="p-3 text-center">Periode</th>
            <th className="p-3 text-right">Plan Qty</th>
            <th className="p-3 text-right">Actual Qty</th>
            <th className="p-3 text-center">% Pencapaian</th>
            <th className="p-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportLoading && (
            <tr><td colSpan="7" className="p-4 text-center text-gray-400">Memuat...</td></tr>
          )}
          {!reportLoading && (!rows || rows.length === 0) && (
            <tr><td colSpan="7" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
          )}
          {!reportLoading && (rows || []).map((row, idx) => (
            <tr key={`${row.name}-${idx}`} className="border-t">
              <td className="p-3 text-center">{idx + 1}</td>
              <td className="p-3">{row.name}</td>
              <td className="p-3 text-center">{row.period || qualityPeriodLabel}</td>
              <td className="p-3 text-right">{Number(row.planQty || 0).toLocaleString()}</td>
              <td className="p-3 text-right">{Number(row.actualQty || 0).toLocaleString()}</td>
              <td className="p-3 text-center">{formatQualityPercent(row.percent)}%</td>
              <td className="p-3 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${getQualityStatusBadge(row.status)}`}>{row.status || '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
                      <label className="text-xs font-semibold text-gray-500">Supplier (opsional)</label>
                      <input type="text" className="border p-2 rounded w-full text-sm" value={reportSupplier} onChange={(e) => setReportSupplier(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan Filter</button>
                    </div>
                  </div>

                  {reportSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
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
                        <div className="text-xs text-gray-400 uppercase">On Time</div>
                        <div className="font-bold text-green-600">{reportSummary.totalOnTime}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Late</div>
                        <div className="font-bold text-red-600">{reportSummary.totalLate}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Too Early</div>
                        <div className="font-bold text-blue-600">{reportSummary.totalTooEarly}</div>
                      </div>
                      <div className="bg-white p-3 rounded border text-center">
                        <div className="text-xs text-gray-400 uppercase">Pending</div>
                        <div className="font-bold text-yellow-600">{reportSummary.totalPending}</div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Supplier</th>
                          <th className="text-left p-3">No PO</th>
                          <th className="text-right p-3">Qty PO</th>
                          <th className="text-right p-3">Qty Incoming</th>
                          <th className="text-right p-3">On Time</th>
                          <th className="text-right p-3">Late</th>
                          <th className="text-right p-3">Too Early</th>
                          <th className="text-right p-3">Pending</th>
                          <th className="text-right p-3">SNP Tidak Sesuai</th>
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
                            <td className="p-3">{row.supplier}</td>
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
                        <select className="border border-orange-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" value={scorecardFilterSupplier} onChange={(e) => setScorecardFilterSupplier(e.target.value)}>
                        <option value="All">Filter nama supplier</option>
                        {(scorecardSupplierOptions?.length ? scorecardSupplierOptions : getUniqueSuppliers().map((sup) => ({ value: sup, label: sup }))).map((sup) => (
                          <option key={sup.value} value={sup.value}>{sup.label}</option>
                        ))}
                        </select>
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
                              <div className="flex flex-col"><span className="text-green-600 text-[10px] uppercase font-bold">On Time</span><span className="font-bold text-green-700">{sup.onTime}</span></div>
                              <div className="flex flex-col"><span className="text-red-500 text-[10px] uppercase font-bold">Late</span><span className="font-bold text-red-600">{sup.late}</span></div>
                              <div className="flex flex-col"><span className="text-blue-600 text-[10px] uppercase font-bold">Too Early</span><span className="font-bold text-blue-700">{sup.tooEarly}</span></div>
                              <div className="flex flex-col"><span className="text-yellow-600 text-[10px] uppercase font-bold">Pending</span><span className="font-bold text-yellow-700">{sup.pending}</span></div>
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
                  {renderReportHeader('LAPORAN INBOUND PERFORMANCE', reportStart, reportEnd)}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><ArrowDownUp size={18}/> Inbound Performance</h3>
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
                      <label className="text-xs font-semibold text-gray-500">Supplier (opsional)</label>
                      <input type="text" className="border p-2 rounded w-full text-sm" value={reportSupplier} onChange={(e) => setReportSupplier(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchInboundPerformanceReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan Filter</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3">Supplier</th>
                          <th className="text-left p-3">No PO</th>
                          <th className="text-left p-3">Item</th>
                          <th className="text-center p-3">Plan</th>
                          <th className="text-center p-3">Actual</th>
                          <th className="text-right p-3">Order</th>
                          <th className="text-right p-3">Received</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLoading && (
                          <tr><td colSpan="8" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                        )}
                        {!reportLoading && inboundPerformanceRows.length === 0 && (
                          <tr><td colSpan="8" className="p-4 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {!reportLoading && inboundPerformanceRows.map((row, idx) => (
                          <tr key={`${row.poNumber}-${idx}`} className="border-t">
                            <td className="p-3">{row.supplier}</td>
                            <td className="p-3">{row.poNumber}</td>
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
                      <select
                        className="border p-2 rounded w-full text-sm"
                        value={supplierShortageSupplier}
                        onChange={(e) => setSupplierShortageSupplier(e.target.value)}
                      >
                        <option value="">Semua Supplier</option>
                        {supplierShortageSupplierOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchSupplierShortageReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  <div className="mb-3 print:hidden text-xs text-slate-500">
                    Supplier aktif: <span className="font-semibold text-slate-700">{supplierShortageSupplierOptions.find((option) => option.value === supplierShortageSupplier)?.label || 'Semua Supplier'}</span>
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
                <div className="bg-white rounded-xl shadow-sm border p-4 report-print-scope">
                  {(() => {
                    const range = buildMonthInputRange(qualityObjectivesMonth);
                    return renderReportHeader('LAPORAN SASARAN MUTU', range.start || reportStart, range.end || reportEnd);
                  })()}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle size={18}/> Laporan Sasaran Mutu</h3>
                    <div className="flex gap-2 items-center print:hidden">
                      <button onClick={fetchQualityObjectivesReport} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs">Refresh</button>
                      <button onClick={handleExportQualityObjectivesExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">Excel</button>
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
                      <label className="text-xs font-semibold text-gray-500">Periode (Bulan)</label>
                      <input
                        type="month"
                        className="border p-2 rounded w-full text-sm"
                        value={qualityObjectivesMonth}
                        onChange={(e) => setQualityObjectivesMonth(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={fetchQualityObjectivesReport} className="bg-indigo-600 text-white px-4 py-2 rounded w-full text-sm">Terapkan</button>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {renderQualityTable('Inbound Schedule vs Incoming', qualityObjectivesData?.inboundSchedule || [], 'Supplier')}
                    {renderQualityTable('DN vs RN (Akurasi Surat Jalan)', qualityObjectivesData?.dnVsRn || [], 'Supplier')}
                    {renderQualityTable('Delivery vs PRL', qualityObjectivesData?.deliveryVsPrl || [], 'Customer')}
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
                            <td className="p-3">{row.model || '-'}</td>
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
                />
              )}

            </div>
            )}

    </>
  );
};

export default TabReports;
