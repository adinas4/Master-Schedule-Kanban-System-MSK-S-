import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Filter, Loader2, Printer, Table2, TrendingUp } from 'lucide-react';
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const pad2 = (value) => String(value).padStart(2, '0');

const toDateKey = (value) => {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toMonthKey = (value) => {
  const dateKey = toDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : '';
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return '-';
  const [yearText, monthText] = monthKey.split('-');
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText);
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11 || !Number.isFinite(year)) return '-';
  return `${MONTH_NAMES_ID[monthIndex]} ${year}`;
};

const formatDayLabel = (dateKey) => {
  if (!dateKey) return '-';
  const [yearText, monthText, dayText] = dateKey.split('-');
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return '-';
  const monthLabel = MONTH_NAMES_ID[monthIndex]?.slice(0, 3) || '-';
  return `${day}/${monthLabel}`;
};

const formatShortWeekday = (dateKey) => {
  if (!dateKey) return '-';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date);
};

const formatQty = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

const applyCellStyle = (sheet, address, style) => {
  if (!sheet || !address || !sheet[address]) return;
  sheet[address].s = style;
};

const MATRIX_COL_WIDTHS = {
  index: 36,
  po: 98,
  supplier: 144,
  doNumber: 116,
  partCode: 86,
  partName: 150,
  unit: 60,
  type: 62,
  day: 46,
  total: 74,
};

const MATRIX_LEFT_OFFSETS = {
  index: 0,
  po: 36,
  supplier: 134,
  doNumber: 278,
  partCode: 394,
  partName: 544,
  unit: 604,
  type: 666,
};

const stickyCellStyle = (left, width, zIndex = 20) => ({
  position: 'sticky',
  left,
  zIndex,
  width,
  minWidth: width,
  maxWidth: width,
});

const formatTitleCase = (value) => String(value || '').trim();

const normalizeScheduleRow = (row, index = 0) => {
  const poNumber = formatTitleCase(row?.poNumber ?? row?.po_number ?? row?.po ?? '');
  const supplierName = formatTitleCase(row?.supplierName ?? row?.supplier_name ?? row?.supplier ?? '');
  const itemCode = formatTitleCase(row?.itemCode ?? row?.item_code ?? row?.item ?? row?.partCode ?? row?.part_code ?? '');
  const itemName = formatTitleCase(row?.itemName ?? row?.item_name ?? row?.name ?? row?.description ?? '');
  const doNumber = formatTitleCase(row?.doNumber ?? row?.do_number ?? row?.doNo ?? row?.do_no ?? row?.sjNumber ?? row?.sj_number ?? '');
  const requestDate = toDateKey(row?.requestDate ?? row?.request_date ?? row?.plannedDate ?? row?.planned_date ?? row?.planDate ?? row?.plan_date ?? '');
  const arrivalDate = toDateKey(
    row?.arrivalDate
    ?? row?.arrival_date
    ?? row?.receivedDate
    ?? row?.received_date
    ?? row?.receivedAt
    ?? row?.received_at
    ?? row?.actualDate
    ?? row?.actual_date
    ?? '',
  );
  const requestQty = Number(
    row?.requestQty
    ?? row?.request_qty
    ?? row?.plannedQty
    ?? row?.planned_qty
    ?? row?.qtyOrder
    ?? row?.qty_order
    ?? row?.qtyRequest
    ?? row?.qty_request
    ?? 0,
  ) || 0;
  const receivedQty = Number(
    row?.receivedQty
    ?? row?.received_qty
    ?? row?.qtyTiba
    ?? row?.qty_tiba
    ?? row?.actualQty
    ?? row?.actual_qty
    ?? row?.qtyActual
    ?? row?.qty_actual
    ?? 0,
  ) || 0;
  const unit = formatTitleCase(row?.unit ?? row?.uom ?? row?.uom_name ?? row?.uomName ?? '');
  const groupKey = `${poNumber}||${itemCode || itemName || `ITEM-${index + 1}`}`;

  return {
    id: row?.id ?? `${groupKey}||${requestDate || 'NO-DATE'}||${index}`,
    poNumber,
    supplierName,
    itemCode,
    itemName,
    doNumber,
    requestDate,
    arrivalDate,
    requestQty,
    receivedQty,
    unit,
    groupKey,
    requestMonthKey: requestDate ? requestDate.slice(0, 7) : '',
    arrivalMonthKey: arrivalDate ? arrivalDate.slice(0, 7) : '',
  };
};

const buildMonthOptions = (rows) => {
  const seen = new Set();
  const options = [];
  rows.forEach((row) => {
    [row.requestMonthKey, row.arrivalMonthKey].forEach((monthKey) => {
      if (!monthKey || seen.has(monthKey)) return;
      seen.add(monthKey);
      options.push({
        value: monthKey,
        label: formatMonthLabel(monthKey),
      });
    });
  });
  return options.sort((left, right) => String(left.value).localeCompare(String(right.value)));
};

const SafeResponsiveContainer = ({ children }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = containerRef.current;
    if (!node) return undefined;
    let raf;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect.width));
      const height = Math.max(0, Math.floor(rect.height));
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    const queueUpdate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateSize);
    };
    queueUpdate();
    window.addEventListener('resize', queueUpdate);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(queueUpdate);
      observer.observe(node);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', queueUpdate);
      if (observer) observer.disconnect();
    };
  }, []);

  const chart = size.width > 0 && size.height > 0 && React.isValidElement(children)
    ? React.cloneElement(children, { width: size.width, height: size.height })
    : null;

  return (
    <div ref={containerRef} className="w-full h-full min-h-[280px]">
      {chart}
    </div>
  );
};

const TabReportInbound = ({
  schedules = [],
  ensureSchedulesLoaded,
  scheduleLoading,
  masterVendors = [],
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [monthKey, setMonthKey] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [poFilter, setPoFilter] = useState('ALL');
  const [meetingMode, setMeetingMode] = useState(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (typeof ensureSchedulesLoaded !== 'function') return;
      setLocalLoading(true);
      try {
        await ensureSchedulesLoaded();
      } finally {
        if (active) setLocalLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [ensureSchedulesLoaded]);

  const normalizedRows = useMemo(
    () => (Array.isArray(schedules) ? schedules.map((row, index) => normalizeScheduleRow(row, index)) : []),
    [schedules],
  );

  useEffect(() => {
    if (monthKey) return;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    setMonthKey(currentMonthKey);
  }, [monthKey]);

  const monthOptions = useMemo(() => {
    const options = buildMonthOptions(normalizedRows);
    const currentMonthKey = monthKey || `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;
    if (!options.some((option) => option.value === currentMonthKey)) {
      options.unshift({
        value: currentMonthKey,
        label: formatMonthLabel(currentMonthKey),
      });
    }
    return options;
  }, [monthKey, normalizedRows]);

  const rowsInMonth = useMemo(
    () => normalizedRows.filter((row) => !monthKey || row.requestMonthKey === monthKey || row.arrivalMonthKey === monthKey),
    [normalizedRows, monthKey],
  );

  const supplierOptions = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(masterVendors) ? masterVendors : [])
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
          id: id.toLowerCase(),
          name: name.toLowerCase(),
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(left.label).localeCompare(String(right.label), 'id'));
  }, [masterVendors]);

  const supplierLookup = useMemo(() => {
    const map = new Map();
    supplierOptions.forEach((option) => {
      map.set(String(option.value || '').toLowerCase(), option);
      if (option.id) map.set(option.id, option);
      if (option.name) map.set(option.name, option);
    });
    return map;
  }, [supplierOptions]);

  useEffect(() => {
    if (supplierFilter === 'ALL') return;
    if (!supplierOptions.some((option) => option.value === supplierFilter)) {
      setSupplierFilter('ALL');
    }
  }, [supplierFilter, supplierOptions]);

  const rowsBySupplier = useMemo(
    () => {
      if (supplierFilter === 'ALL') return rowsInMonth;
      const selected = supplierLookup.get(String(supplierFilter || '').trim().toLowerCase());
      if (!selected) return [];
      return rowsInMonth.filter((row) => {
        const rowKey = String(row.supplierName || '').trim().toLowerCase();
        return rowKey === selected.id || rowKey === selected.name || rowKey === String(selected.value || '').trim().toLowerCase();
      });
    },
    [rowsInMonth, supplierFilter, supplierLookup],
  );

  const poOptions = useMemo(() => {
    const seen = new Map();
    rowsBySupplier.forEach((row) => {
      const key = String(row.poNumber || '').trim() || 'UNKNOWN';
      if (!seen.has(key)) {
        seen.set(key, { value: key, label: row.poNumber || key });
      }
    });
    return Array.from(seen.values()).sort((left, right) => String(left.label).localeCompare(String(right.label), 'id'));
  }, [rowsBySupplier]);

  useEffect(() => {
    if (poFilter === 'ALL') return;
    if (!poOptions.some((option) => option.value === poFilter)) {
      setPoFilter('ALL');
    }
  }, [poFilter, poOptions]);

  const filteredRows = useMemo(
    () => rowsBySupplier.filter((row) => poFilter === 'ALL' || row.poNumber === poFilter),
    [poFilter, rowsBySupplier],
  );

  const daysInMonth = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return 0;
    const [yearText, monthText] = monthKey.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return 0;
    return new Date(year, monthIndex + 1, 0).getDate();
  }, [monthKey]);

  const dayColumns = useMemo(() => {
    if (!daysInMonth) return [];
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = `${monthKey}-${pad2(day)}`;
      return {
        day,
        dateKey,
        label: `${day}`,
        subLabel: formatShortWeekday(dateKey),
        printableLabel: formatDayLabel(dateKey),
      };
    });
  }, [daysInMonth, monthKey]);

  const trendData = useMemo(() => {
    const planMap = new Map();
    const actualMap = new Map();
    filteredRows.forEach((row) => {
      if (row.requestDate) {
        planMap.set(row.requestDate, (planMap.get(row.requestDate) || 0) + Number(row.requestQty || 0));
      }
      if (row.arrivalDate) {
        actualMap.set(row.arrivalDate, (actualMap.get(row.arrivalDate) || 0) + Number(row.receivedQty || 0));
      }
    });
    let runningBalance = 0;
    return dayColumns.map((day) => {
      const planQty = Number(planMap.get(day.dateKey) || 0);
      const actualQty = Number(actualMap.get(day.dateKey) || 0);
      runningBalance += actualQty - planQty;
      return {
        dateKey: day.dateKey,
        label: day.label,
        plan: planQty,
        actual: actualQty,
        balance: runningBalance,
      };
    });
  }, [filteredRows, dayColumns]);

  const matrixGroups = useMemo(() => {
    const grouped = new Map();
    filteredRows.forEach((row, index) => {
      const key = row.groupKey || `${row.poNumber}||${row.itemCode || row.itemName || index}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          poNumber: row.poNumber,
          supplierName: row.supplierName,
          itemCode: row.itemCode,
          itemName: row.itemName,
          unit: row.unit,
          rows: [],
        });
      }
      grouped.get(key).rows.push(row);
    });

    return Array.from(grouped.values())
      .sort((left, right) => {
        const poCompare = String(left.poNumber || '').localeCompare(String(right.poNumber || ''), 'id');
        if (poCompare !== 0) return poCompare;
        return String(left.itemCode || left.itemName || '').localeCompare(String(right.itemCode || right.itemName || ''), 'id');
      })
      .map((group, index) => {
        const planMap = new Map();
        const actualMap = new Map();
        const doNumbers = [];
        group.rows.forEach((row) => {
          if (row.requestDate) {
            planMap.set(row.requestDate, (planMap.get(row.requestDate) || 0) + Number(row.requestQty || 0));
          }
          if (row.arrivalDate) {
            actualMap.set(row.arrivalDate, (actualMap.get(row.arrivalDate) || 0) + Number(row.receivedQty || 0));
          }
          if (row.doNumber) {
            const exists = doNumbers.some((value) => String(value || '').trim().toLowerCase() === String(row.doNumber || '').trim().toLowerCase());
            if (!exists) {
              doNumbers.push(row.doNumber);
            }
          }
        });

        let runningBalance = 0;
        const dayValues = dayColumns.map((day) => {
          const doQty = Number(planMap.get(day.dateKey) || 0);
          const actQty = Number(actualMap.get(day.dateKey) || 0);
          runningBalance += actQty - doQty;
          return {
            dateKey: day.dateKey,
            doQty,
            actQty,
            balanceQty: runningBalance,
          };
        });

        const totalDo = dayValues.reduce((sum, item) => sum + Number(item.doQty || 0), 0);
        const totalAct = dayValues.reduce((sum, item) => sum + Number(item.actQty || 0), 0);
        const totalBalance = dayValues.length ? dayValues[dayValues.length - 1].balanceQty : 0;

        return {
          ...group,
          rowNo: index + 1,
          doNumberLabel: doNumbers.length > 0 ? doNumbers.join(', ') : '-',
          dayValues,
          totals: {
            do: totalDo,
            act: totalAct,
            balance: totalBalance,
          },
        };
      });
  }, [dayColumns, filteredRows]);

  const summaryStats = useMemo(() => {
    const planTotal = trendData.reduce((sum, row) => sum + Number(row.plan || 0), 0);
    const actualTotal = trendData.reduce((sum, row) => sum + Number(row.actual || 0), 0);
    const balanceEnd = trendData.length ? trendData[trendData.length - 1].balance : 0;
    return {
      planTotal,
      actualTotal,
      balanceEnd,
      partCount: matrixGroups.length,
      poCount: new Set(filteredRows.map((row) => row.poNumber).filter(Boolean)).size,
      supplierCount: new Set(filteredRows.map((row) => row.supplierName).filter(Boolean)).size,
    };
  }, [filteredRows, matrixGroups, trendData]);

  const formatSheetRows = async () => {
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default || xlsxModule;
    const workbook = XLSX.utils.book_new();

    const borderThin = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };
    const borderBold = {
      top: { style: 'medium', color: { rgb: '334155' } },
      bottom: { style: 'medium', color: { rgb: '334155' } },
      left: { style: 'medium', color: { rgb: '334155' } },
      right: { style: 'medium', color: { rgb: '334155' } },
    };
    const titleStyle = {
      font: { bold: true, sz: 13, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderBold,
    };
    const metaStyle = {
      font: { bold: true, color: { rgb: '0F172A' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
      border: borderThin,
    };
    const typeDoStyle = {
      font: { bold: true, color: { rgb: '047857' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };
    const typeActStyle = {
      font: { bold: true, color: { rgb: '1D4ED8' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };
    const typeBlcStyle = {
      font: { bold: true, color: { rgb: '334155' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };
    const negativeStyle = {
      font: { bold: true, color: { rgb: 'DC2626' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FEF2F2' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };
    const positiveStyle = {
      font: { bold: true, color: { rgb: '2563EB' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };
    const neutralStyle = {
      font: { color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
    };

    const trendSheet = [
      [`DELIVERY SCHEDULE CONTROL MATRIX & KPI SUPPLIER - ${formatMonthLabel(monthKey)}`],
      [`Supplier`, supplierFilter === 'ALL' ? 'Semua Supplier' : supplierFilter, `No PO`, poFilter === 'ALL' ? 'Semua PO' : poFilter],
      [],
      ['Tanggal', 'Jadwal', 'Aktual', 'Selisih'],
      ...trendData.map((row) => [row.label, row.plan, row.actual, row.balance]),
    ];
    const trendWorksheet = XLSX.utils.aoa_to_sheet(trendSheet);
    trendWorksheet['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    trendWorksheet['!rows'] = [{ hpt: 24 }, { hpt: 20 }, { hpt: 10 }, { hpt: 20 }];
    trendWorksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    trendWorksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }) };
    trendWorksheet['!freeze'] = { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
    applyCellStyle(trendWorksheet, 'A1', titleStyle);
    applyCellStyle(trendWorksheet, 'A2', metaStyle);
    applyCellStyle(trendWorksheet, 'B2', metaStyle);
    applyCellStyle(trendWorksheet, 'C2', metaStyle);
    applyCellStyle(trendWorksheet, 'D2', metaStyle);
    ['A4', 'B4', 'C4', 'D4'].forEach((address) => applyCellStyle(trendWorksheet, address, headerStyle));
    trendData.forEach((row, index) => {
      const excelRow = index + 5;
      applyCellStyle(trendWorksheet, `A${excelRow}`, neutralStyle);
      applyCellStyle(trendWorksheet, `B${excelRow}`, neutralStyle);
      applyCellStyle(trendWorksheet, `C${excelRow}`, neutralStyle);
      applyCellStyle(trendWorksheet, `D${excelRow}`, row.balance < 0 ? negativeStyle : row.balance > 0 ? positiveStyle : neutralStyle);
    });
    XLSX.utils.book_append_sheet(workbook, trendWorksheet, 'Trend');

    const matrixHeader = [
      'No',
      'No PO',
      'Supplier',
      'No SJ / DO',
      'Part Code',
      'Part Name',
      'Unit',
      'Type',
      ...dayColumns.map((day) => day.printableLabel),
      'Total',
    ];

    const matrixRows = [
      [`DELIVERY SCHEDULE CONTROL MATRIX & KPI SUPPLIER - ${formatMonthLabel(monthKey)}`],
      [`Supplier`, supplierFilter === 'ALL' ? 'Semua Supplier' : supplierFilter, `No PO`, poFilter === 'ALL' ? 'Semua PO' : poFilter],
      [],
      matrixHeader,
    ];

    matrixGroups.forEach((group) => {
      ['DO', 'ACT', 'BLC'].forEach((typeLabel, typeIndex) => {
        const rowValues = [
          typeIndex === 0 ? group.rowNo : '',
          typeIndex === 0 ? group.poNumber : '',
          typeIndex === 0 ? group.supplierName : '',
          typeIndex === 0 ? group.doNumberLabel : '',
          typeIndex === 0 ? group.itemCode : '',
          typeIndex === 0 ? group.itemName : '',
          typeIndex === 0 ? group.unit : '',
          typeLabel,
          ...group.dayValues.map((day) => (typeLabel === 'DO' ? day.doQty : typeLabel === 'ACT' ? day.actQty : day.balanceQty)),
          typeLabel === 'DO' ? group.totals.do : typeLabel === 'ACT' ? group.totals.act : group.totals.balance,
        ];
        matrixRows.push(rowValues);
      });
    });

    const matrixWorksheet = XLSX.utils.aoa_to_sheet(matrixRows);
    matrixWorksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      ...dayColumns.map(() => ({ wch: 11 })),
      { wch: 12 },
    ];
    matrixWorksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: matrixHeader.length - 1 } }];
    matrixWorksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 3, c: 0 },
        e: { r: 3, c: matrixHeader.length - 1 },
      }),
    };
    matrixWorksheet['!freeze'] = {
      xSplit: 8,
      ySplit: 4,
      topLeftCell: 'I5',
      activePane: 'bottomRight',
      state: 'frozen',
    };
    matrixWorksheet['!rows'] = [
      { hpt: 24 },
      { hpt: 20 },
      { hpt: 8 },
      { hpt: 24 },
      ...matrixGroups.flatMap(() => ([
        { hpt: 20 },
        { hpt: 20 },
        { hpt: 20 },
      ])),
    ];
    applyCellStyle(matrixWorksheet, 'A1', titleStyle);
    applyCellStyle(matrixWorksheet, 'A2', metaStyle);
    applyCellStyle(matrixWorksheet, 'B2', metaStyle);
    applyCellStyle(matrixWorksheet, 'C2', metaStyle);
    applyCellStyle(matrixWorksheet, 'D2', metaStyle);
    matrixHeader.forEach((_, index) => {
      const columnAddress = XLSX.utils.encode_cell({ r: 3, c: index });
      applyCellStyle(matrixWorksheet, columnAddress, headerStyle);
    });
    matrixGroups.forEach((group, groupIndex) => {
      const baseRow = 4 + (groupIndex * 3);
      const styleByType = [typeDoStyle, typeActStyle, typeBlcStyle];
      styleByType.forEach((style, typeIndex) => {
        const rowAddress = baseRow + typeIndex + 1;
        for (let colIndex = 0; colIndex < matrixHeader.length; colIndex += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowAddress - 1, c: colIndex });
          if (colIndex === 7) {
            applyCellStyle(matrixWorksheet, cellAddress, style);
          } else if (colIndex >= 8 && colIndex < 8 + dayColumns.length && typeIndex === 2) {
            const dayValue = group.dayValues[colIndex - 8];
            const balanceStyle = Number(dayValue?.balanceQty || 0) < 0 ? negativeStyle : Number(dayValue?.balanceQty || 0) > 0 ? positiveStyle : neutralStyle;
            applyCellStyle(matrixWorksheet, cellAddress, balanceStyle);
          } else if (colIndex >= 8 && colIndex < 8 + dayColumns.length && typeIndex !== 2) {
            applyCellStyle(matrixWorksheet, cellAddress, neutralStyle);
          } else if (colIndex === matrixHeader.length - 1) {
            const totalBalanceStyle = typeIndex === 2
              ? (Number(group.totals.balance || 0) < 0 ? negativeStyle : Number(group.totals.balance || 0) > 0 ? positiveStyle : neutralStyle)
              : neutralStyle;
            applyCellStyle(matrixWorksheet, cellAddress, totalBalanceStyle);
          } else {
            applyCellStyle(matrixWorksheet, cellAddress, neutralStyle);
          }
        }
      });
    });
    XLSX.utils.book_append_sheet(workbook, matrixWorksheet, 'Matrix');

    const fileMonth = monthKey || `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;
    XLSX.writeFile(workbook, `Inbound_Matrix_${fileMonth}.xlsx`);
  };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const styleId = 'inbound-report-print-style';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        .inbound-report-host .print-hidden,
        .inbound-report-host .print\\:hidden {
          display: none !important;
        }
        .inbound-report-host {
          background: #fff !important;
        }
        .inbound-report-host .inbound-print-page {
          break-after: page;
          page-break-after: always;
        }
        .inbound-report-host table {
          font-size: 9px !important;
        }
        .inbound-report-host th,
        .inbound-report-host td {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
        }
        @page {
          size: landscape;
          margin: 10mm;
        }
      }
    `;
    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    if (typeof document !== 'undefined') {
      document.body.classList.add('report-print-active');
    }
    const cleanup = () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('report-print-active');
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 800);
  };

  const isLoading = localLoading || scheduleLoading;

  return (
    <div className={`inbound-report-host ${meetingMode ? 'space-y-3' : 'space-y-4'}`}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden inbound-print-page">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
                <TrendingUp size={14} />
                Laporan Penerimaan Aktual
              </div>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Matriks Jadwal vs Aktual SJ
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Jadwal, Aktual SJ, dan selisih harian per part number dengan struktur horizontal siap rapat manajemen.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print-hidden">
              <button
                type="button"
                onClick={() => setMeetingMode((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  meetingMode
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Table2 size={16} />
                {meetingMode ? 'Keluar Mode Rapat' : 'Mode Rapat'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Printer size={16} />
                Cetak Landscape
              </button>
              <button
                type="button"
                onClick={formatSheetRows}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Download size={16} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:grid-cols-3 print-hidden">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter size={12} />
              Bulan laporan
            </span>
            <select
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter size={12} />
              Cari supplier
            </span>
              <SearchableSelectDropdown
                value={supplierFilter === 'ALL' ? '' : supplierFilter}
                options={supplierOptions}
                placeholder="Cari supplier..."
                searchPlaceholder="Ketik kode / nama supplier"
                emptyText="Supplier tidak ditemukan."
                className="w-full"
                onChange={(nextValue) => setSupplierFilter(nextValue || 'ALL')}
              />
            </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter size={12} />
              Cari No PO
            </span>
              <SearchableSelectDropdown
                value={poFilter === 'ALL' ? '' : poFilter}
                options={poOptions}
                placeholder="Cari no PO..."
                searchPlaceholder="Ketik no PO"
                emptyText="No PO tidak ditemukan."
                className="w-full"
                onChange={(nextValue) => setPoFilter(nextValue || 'ALL')}
              />
            </label>
        </div>

        <div className={`grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-5 ${meetingMode ? 'bg-slate-50' : ''}`}>
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">Jumlah Part</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{summaryStats.partCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Total Jadwal</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{formatQty(summaryStats.planTotal)}</div>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Total Aktual</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{formatQty(summaryStats.actualTotal)}</div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Selisih Akhir</div>
            <div className={`mt-1 text-2xl font-bold ${summaryStats.balanceEnd < 0 ? 'text-red-600' : summaryStats.balanceEnd > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
              {formatQty(summaryStats.balanceEnd)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">No PO / Supplier</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {summaryStats.poCount} / {summaryStats.supplierCount}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Tren Harian</div>
            <div className="text-xs text-slate-500">Jadwal, Aktual SJ, dan selisih per tanggal kalender</div>
          </div>
        </div>
        <div className={`${meetingMode ? 'h-[300px]' : 'h-[360px]'} px-2 py-4`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat data jadwal...
            </div>
          ) : (
            <SafeResponsiveContainer>
              <LineChart
                data={trendData}
                margin={{ top: 16, right: 24, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [formatQty(value), name]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row?.dateKey || label;
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="plan" name="Jadwal" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="actual" name="Aktual SJ" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="balance" name="Selisih" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </SafeResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Table2 size={16} />
              Matriks Jadwal Horizontal
            </div>
            <div className="text-xs text-slate-500">
              Setiap part number dipecah menjadi 3 baris: Jadwal, Aktual, dan Selisih.
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Rumus Selisih: Selisih Hari Ini = Selisih Kemarin + Aktual Hari Ini - Jadwal Hari Ini
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`min-w-[1500px] border-separate border-spacing-0 text-xs table-fixed ${meetingMode ? 'bg-white' : ''}`}>
            <colgroup>
              <col style={{ width: `${MATRIX_COL_WIDTHS.index}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.po}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.supplier}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.doNumber}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.partCode}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.partName}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.unit}px` }} />
              <col style={{ width: `${MATRIX_COL_WIDTHS.type}px` }} />
              {dayColumns.map((day) => (
                <col key={day.dateKey} style={{ width: `${MATRIX_COL_WIDTHS.day}px` }} />
              ))}
              <col style={{ width: `${MATRIX_COL_WIDTHS.total}px` }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.index, MATRIX_COL_WIDTHS.index, 30)}>#</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.po, MATRIX_COL_WIDTHS.po, 30)}>No PO</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.supplier, MATRIX_COL_WIDTHS.supplier, 30)}>Supplier</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.doNumber, MATRIX_COL_WIDTHS.doNumber, 30)}>No SJ / DO</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.partCode, MATRIX_COL_WIDTHS.partCode, 30)}>Part Code</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.partName, MATRIX_COL_WIDTHS.partName, 30)}>Part Name</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.unit, MATRIX_COL_WIDTHS.unit, 30)}>Unit</th>
                <th className="sticky z-30 border-b border-r border-slate-700 bg-slate-900 px-1.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.type, MATRIX_COL_WIDTHS.type, 30)}>Jenis</th>
                {dayColumns.map((day) => (
                  <th key={day.dateKey} className="border-b border-r border-slate-700 px-1 py-2 text-center whitespace-nowrap bg-slate-800">
                    <div className="text-[11px] font-bold leading-3">{day.label}</div>
                    <div className="text-[10px] font-normal uppercase tracking-wide text-slate-300">{day.subLabel}</div>
                  </th>
                ))}
                <th className="border-b border-slate-700 px-2 py-3 text-center bg-slate-900 font-semibold uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrixGroups.length === 0 && (
                <tr>
                  <td colSpan={9 + dayColumns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
              {matrixGroups.map((group) => (
                <React.Fragment key={group.key}>
                  {['DO', 'ACT', 'BLC'].map((typeLabel, rowIndex) => {
                    const cellValues = rowIndex === 0
                      ? group.dayValues.map((day) => day.doQty)
                      : rowIndex === 1
                        ? group.dayValues.map((day) => day.actQty)
                        : group.dayValues.map((day) => day.balanceQty);
                    const totalValue = rowIndex === 0
                      ? group.totals.do
                      : rowIndex === 1
                        ? group.totals.act
                        : group.totals.balance;
                    return (
                      <tr
                        key={`${group.key}-${typeLabel}`}
                        className={
                          rowIndex === 0
                            ? 'bg-white'
                            : rowIndex === 1
                              ? 'bg-sky-50'
                              : 'bg-amber-50'
                        }
                      >
                        {rowIndex === 0 && (
                          <>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top font-semibold" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.index, MATRIX_COL_WIDTHS.index)}>
                              {group.rowNo}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top font-semibold break-words text-[11px] leading-snug" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.po, MATRIX_COL_WIDTHS.po)}>
                              {group.poNumber || '-'}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top break-words text-[11px] leading-snug" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.supplier, MATRIX_COL_WIDTHS.supplier)}>
                              {group.supplierName || '-'}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top break-words text-[11px] leading-snug text-slate-700" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.doNumber, MATRIX_COL_WIDTHS.doNumber)}>
                              {group.doNumberLabel || '-'}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top font-semibold text-slate-900 break-words text-[11px] leading-snug" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.partCode, MATRIX_COL_WIDTHS.partCode)}>
                              {group.itemCode || '-'}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top text-slate-700 break-words text-[11px] leading-snug" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.partName, MATRIX_COL_WIDTHS.partName)}>
                              {group.itemName || '-'}
                            </td>
                            <td rowSpan={3} className="sticky z-20 border-b border-r border-slate-300 bg-inherit px-1.5 py-2.5 align-top text-[11px]" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.unit, MATRIX_COL_WIDTHS.unit)}>
                              {group.unit || '-'}
                            </td>
                          </>
                        )}
                        <td className="sticky z-20 border-b border-r border-slate-300 px-1.5 py-2.5 font-semibold bg-inherit" style={stickyCellStyle(MATRIX_LEFT_OFFSETS.type, MATRIX_COL_WIDTHS.type)}>
                          <span className={`inline-flex min-w-[42px] justify-center rounded-md px-1.5 py-1 text-[10px] font-bold tracking-wide border ${
                            typeLabel === 'DO'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : typeLabel === 'ACT'
                                ? 'bg-sky-100 text-sky-700 border-sky-300'
                                : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}>
                            {typeLabel}
                          </span>
                        </td>
                        {cellValues.map((value, cellIndex) => {
                          const isBalance = typeLabel === 'BLC';
                          const isNegative = isBalance && Number(value) < 0;
                          const isPositive = isBalance && Number(value) > 0;
                          return (
                            <td
                              key={`${group.key}-${typeLabel}-${dayColumns[cellIndex]?.dateKey || cellIndex}`}
                              className={`border-b border-r border-slate-300 px-2 py-3 text-center tabular-nums ${
                                isBalance && isNegative
                                  ? 'bg-red-50 text-red-600 font-semibold'
                                  : isBalance && isPositive
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : isBalance
                                      ? 'bg-slate-50 text-slate-700'
                                      : 'text-slate-800'
                              }`}
                            >
                              {formatQty(value)}
                            </td>
                          );
                        })}
                        <td
                          className={`border-b border-slate-200 px-1.5 py-3 text-center tabular-nums font-semibold ${
                            typeLabel === 'BLC'
                              ? (Number(totalValue) < 0 ? 'text-red-600' : Number(totalValue) > 0 ? 'text-blue-600' : 'text-slate-700')
                              : 'text-slate-700'
                          }`}
                        >
                          {formatQty(totalValue)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TabReportInbound;
