import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Loader2, Printer, RefreshCw, Search, Users, X } from 'lucide-react';
import logoMatra from '../assets/logo-matra.png';
import logoPrl from '../assets/kop-mrp.png';
import { buildModelMap, formatModelCodes, parseModelCodes } from '../utils/modelUtils';

const monthLabelMap = {
  jan: 'JAN',
  feb: 'FEB',
  mar: 'MAR',
  apr: 'APR',
  may: 'MAY',
  jun: 'JUN',
  jul: 'JUL',
  aug: 'AUG',
  sep: 'SEP',
  oct: 'OCT',
  nov: 'NOV',
  dec: 'DEC',
};

const monthKeyToIndex = {
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

const pad2 = (value) => String(value).padStart(2, '0');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatNumber = (value, digits = 0) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  const fixed = numeric.toFixed(digits);
  return digits > 0 ? fixed.replace(/\.?0+$/, '') : String(Math.round(numeric));
};

const PRL_FORECAST_TIMEOUT_MS = 180000;

const getDefaultFocusPeriod = (sourceYear) => {
  const now = new Date();
  const year = Number(sourceYear) || now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const TabPrlToSupplier = ({
  apiFetch,
  canViewPrl,
  currentYear,
  initialReport,
  masterModels,
  masterVendors,
  prlFilters,
  showToastMessage,
}) => {
  const [supplier, setSupplier] = useState('');
  const [focusPeriod, setFocusPeriod] = useState(getDefaultFocusPeriod(prlFilters?.year || currentYear));
  const [report, setReport] = useState(() => initialReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadSummary, setLoadSummary] = useState(null);
  const [tablePagination, setTablePagination] = useState({ page: 1, perPage: 25 });
  const monthKeyByIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const masterModelMap = useMemo(() => buildModelMap(masterModels || []), [masterModels]);
  const loadReportSeqRef = useRef(0);
  const loadedReportKeyRef = useRef(initialReport?.__previewCacheKey || '');

  useEffect(() => {
    const currentSupplier = String(prlFilters?.supplier || '').trim();
    if (currentSupplier) {
      setSupplier(currentSupplier);
      return;
    }
  }, [prlFilters?.supplier]);

  useEffect(() => {
    const year = String(prlFilters?.year || currentYear || new Date().getFullYear());
    const month = String(prlFilters?.month || '').trim().toLowerCase();
    const monthIndex = monthKeyToIndex[month];
    if (!monthIndex) return;
    setFocusPeriod(`${year}-${pad2(monthIndex)}`);
  }, [currentYear, prlFilters?.month, prlFilters?.year]);

  const focusYear = Number(String(focusPeriod).split('-')[0]) || currentYear;
  const focusMonthIndex = Number(String(focusPeriod).split('-')[1]) - 1;
  const focusMonthKey = monthKeyByIndex[focusMonthIndex] || 'jul';
  const focusMonthLabel = monthLabelMap[focusMonthKey] || 'JUL';
  const currentPreviewCacheKey = useMemo(() => {
    const year = String(focusYear || currentYear || new Date().getFullYear()).trim();
    const month = String(focusMonthKey || '').trim().toLowerCase();
    const supplierKey = String(supplier || '').trim().toLowerCase() || 'all';
    if (!year || !month) return '';
    return `${year}:${month}:${supplierKey}`;
  }, [currentYear, focusMonthKey, focusYear, supplier]);

  const supplierOptions = useMemo(() => {
    const items = Array.isArray(masterVendors) ? masterVendors : [];
    return items
      .map((vendor) => ({ id: String(vendor.id || '').trim(), name: String(vendor.name || '').trim() }))
      .filter((vendor) => vendor.id);
  }, [masterVendors]);

  const selectedSupplierName = useMemo(() => {
    if (!supplier) return 'All Suppliers';
    const vendor = supplierOptions.find((item) => item.id.toLowerCase() === supplier.toLowerCase())
      || supplierOptions.find((item) => item.name.toLowerCase() === supplier.toLowerCase());
    return vendor ? `${vendor.id} - ${vendor.name}` : supplier;
  }, [supplier, supplierOptions]);

  useEffect(() => {
    if (!initialReport) return;
    if (initialReport.__previewCacheKey !== currentPreviewCacheKey) return;
    setReport(initialReport);
    loadedReportKeyRef.current = initialReport.__previewCacheKey || currentPreviewCacheKey;
    setError('');
  }, [currentPreviewCacheKey, initialReport]);

  const resolveModelLabel = useCallback((rawModel) => {
    const modelText = String(rawModel || '').trim();
    if (!modelText) return '-';
    const parsedCodes = parseModelCodes(modelText);
    if (parsedCodes.length > 0) {
      const formatted = formatModelCodes(masterModelMap, parsedCodes);
      if (formatted) return formatted;
    }
    const firstToken = modelText.split(' - ')[0].trim();
    if (firstToken) {
      const mapped = masterModelMap.get(firstToken);
      if (mapped?.code) return mapped.code;
    }
    return modelText;
  }, [masterModelMap]);

  const reportRows = useMemo(() => (Array.isArray(report?.rows) ? report.rows : []), [report?.rows]);
  const monthSlots = useMemo(() => (Array.isArray(report?.monthSlots) ? report.monthSlots : []), [report?.monthSlots]);

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

  const paginatedMeta = useMemo(() => {
    const total = reportRows.length;
    const perPage = Number(tablePagination.perPage || 25);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(1, Number(tablePagination.page || 1)), totalPages);
    const startIndex = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIndex = Math.min(total, page * perPage);
    const rows = reportRows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
    return {
      page,
      perPage,
      total,
      totalPages,
      startIndex,
      endIndex,
      rows,
    };
  }, [reportRows, tablePagination.page, tablePagination.perPage]);

  useEffect(() => {
    setTablePagination((prev) => {
      const totalPages = Math.max(1, Math.ceil(reportRows.length / (prev.perPage || 25)));
      const safePage = Math.min(Math.max(1, prev.page || 1), totalPages);
      if (safePage === prev.page) return prev;
      return { ...prev, page: safePage };
    });
  }, [reportRows.length]);

  useEffect(() => {
    setTablePagination((prev) => ({ ...prev, page: 1 }));
  }, [report?.documentNumber, supplier, focusPeriod]);

  const loadReport = useCallback(async ({ force = false } = {}) => {
    if (!apiFetch) return;
    if (!force && loadedReportKeyRef.current && loadedReportKeyRef.current === currentPreviewCacheKey) {
      return;
    }
    const requestSeq = ++loadReportSeqRef.current;
    setLoading(true);
    setError('');
    setLoadSummary(null);
    try {
      const params = new URLSearchParams();
      params.set('year', String(focusYear));
      params.set('month', focusMonthKey);
      if (supplier) params.set('supplier', supplier);
      const data = await apiFetch(`/api/prl/forecast-preview?${params.toString()}`, {
        timeoutMs: PRL_FORECAST_TIMEOUT_MS,
      });
      if (requestSeq !== loadReportSeqRef.current) return;
      const nextReport = data ? { ...data, __previewCacheKey: currentPreviewCacheKey } : null;
      setReport(nextReport);
      loadedReportKeyRef.current = currentPreviewCacheKey;
      const fetchedRows = Array.isArray(data?.rows) ? data.rows : [];
      const focusMonthRows = fetchedRows.filter((row) => Number(row?.months?.n || 0) > 0);
      const skippedRows = fetchedRows.filter((row) => Number(row?.months?.n || 0) <= 0);
      const summaryMessage = fetchedRows.length > 0
        ? `Kalkulasi BOM selesai. Total Items: ${fetchedRows.length}, Updated: ${focusMonthRows.length}, Skipped: ${skippedRows.length}.`
        : 'Kalkulasi BOM selesai. Tidak ada item yang masuk ke BOM aktif bulan ini.';
      setLoadSummary({
        open: true,
        status: fetchedRows.length > 0 ? 'success' : 'failed',
        message: summaryMessage,
        totalItems: fetchedRows.length,
        updated: focusMonthRows.length,
        skipped: skippedRows.length,
        detailRows: skippedRows.map((row, index) => ({
          rowNumber: index + 1,
          partNo: row?.partNo || row?.itemCode || '-',
          description: row?.description || '-',
          calculatedQty: Number(row?.months?.n || 0),
          reason: 'Calculated qty kosong / tidak masuk BOM aktif bulan ini.',
          note: row?.parentPlanNote || '',
          parentTooltip: Array.isArray(row?.parentPlanParents) && row.parentPlanParents.length > 0
            ? row.parentPlanParents
              .map((parent) => `${parent.parentCode || '-'}${parent.parentName ? ` - ${parent.parentName}` : ''}: ${formatNumber(parent.parentPlanQty || 0, 2)}`)
              .join('\n')
            : '',
        })),
      });
    } catch (requestError) {
      if (requestSeq !== loadReportSeqRef.current) return;
      const message = requestError?.message || 'Gagal memuat forecast supplier.';
      setError(message);
      loadedReportKeyRef.current = '';
      setLoadSummary({
        open: true,
        status: 'failed',
        message,
        totalItems: 0,
        updated: 0,
        skipped: 0,
        detailRows: [],
      });
    } finally {
      if (requestSeq === loadReportSeqRef.current) {
        setLoading(false);
      }
    }
  }, [apiFetch, currentPreviewCacheKey, focusMonthKey, focusYear, supplier]);

  useEffect(() => () => {
    loadReportSeqRef.current += 1;
  }, []);

  useEffect(() => {
    if (!canViewPrl) return;
    if (!focusMonthKey) return;
    if (!supplier && supplierOptions.length === 0) {
      loadReport();
      return;
    }
    if (!supplier && supplierOptions.length > 0) return;
    loadReport();
  }, [canViewPrl, focusMonthKey, loadReport, supplier, supplierOptions.length]);

  const buildPrintHtml = () => {
    if (!report) return '';
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const monthSlots = Array.isArray(report.monthSlots) ? report.monthSlots : [];
    const supplierInfo = report.supplier || {};
    const documentNumber = String(report.documentNumber || '').trim();
    const printDate = String(report.printDate || new Date().toLocaleDateString('id-ID')).trim();
    const rowsHtml = rows.map((row, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="left">
          <div class="part-code">${escapeHtml(row.partNo || row.itemCode || '-')}</div>
          <div class="part-meta">Model: ${escapeHtml(resolveModelLabel(row.model))} | Uniq: ${escapeHtml(row.itemCode || '-')}</div>
          <div class="part-desc">${escapeHtml(row.description || '-')}</div>
        </td>
        <td class="center">${escapeHtml(resolveModelLabel(row.model))}</td>
        <td class="center">${formatNumber(row.snp, 0)}</td>
        <td class="center">${formatNumber(row.qtyDayMinusOne, 2)}</td>
        <td class="center">${formatNumber(row.qtyDayCurrent, 2)}</td>
        <td class="center">${escapeHtml(row.uom || '-')}</td>
        <td class="center">${escapeHtml(row.typePack || '-')}</td>
        <td class="center">${formatNumber(row.weekI, 2)}</td>
        <td class="center">${formatNumber(row.weekII, 2)}</td>
        <td class="center">${formatNumber(row.weekIII, 2)}</td>
        <td class="center">${formatNumber(row.weekIV, 2)}</td>
        <td class="center">${formatNumber(row.months?.nMinus1, 2)}</td>
        <td class="center">${formatNumber(row.months?.n, 2)}</td>
        <td class="center">${formatNumber(row.months?.nPlus1, 2)}</td>
        <td class="center">${formatNumber(row.months?.nPlus2, 2)}</td>
        <td class="center">${formatNumber(row.months?.nPlus3, 2)}</td>
        <td class="center">${row.fluctuation === null || row.fluctuation === undefined ? '-' : `${formatNumber(row.fluctuation, 0)}%`}</td>
      </tr>
    `).join('');
    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentNumber || 'PRL to Supplier')}</title>
        <style>
          @page { size: A4 landscape; margin: 5mm; }
          html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; }
          body { background: #fff; }
          .toolbar { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px 0; }
          .btn { border: 1px solid #94a3b8; background: #fff; color: #0f172a; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
          .btn.primary { background: #0f172a; color: #fff; border-color: #0f172a; }
          .page { padding: 4px 6px 8px; }
          .header { display: grid; grid-template-columns: 1.55fr 0.68fr 1.05fr; gap: 6px; align-items: start; }
          .brand { display: flex; gap: 8px; align-items: flex-start; }
          .brand img { width: 48px; height: 48px; object-fit: contain; }
          .brand-text { font-size: 11px; line-height: 1.05; }
          .brand-title { font-size: 15px; font-weight: 700; margin-bottom: 1px; letter-spacing: 0.2px; }
          .brand-sub { font-size: 9px; color: #334155; line-height: 1.05; }
          .doc-box { border: 1px solid #7c8796; width: 156px; margin: 0 auto; text-align: center; }
          .doc-box .label { background: #6b7280; color: #fff; font-size: 9px; padding: 4px 6px; font-weight: 700; }
          .doc-box .value { padding: 10px 6px; font-size: 13px; font-weight: 700; line-height: 1.15; }
          .period-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 9px; line-height: 1.35; color: #334155; background: #f8fafc; }
          .period-box strong { color: #0f172a; }
          .meta { display: flex; justify-content: space-between; margin: 6px 0 5px; font-size: 9px; line-height: 1.2; }
          .meta-left div { margin-bottom: 1px; }
          .meta-right { text-align: right; }
          .separator { border-top: 1px solid #cbd5e1; margin: 5px 0 6px; }
          .forecast-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
          .forecast-table th, .forecast-table td { border: 1px solid #c8d0da; padding: 2px 3px; font-size: 8px; vertical-align: middle; }
          .forecast-table th { background: #eef2f7; font-size: 8px; font-weight: 700; text-align: center; line-height: 1.05; }
          td.center { text-align: center; }
          td.left { text-align: left; }
          .part-code { font-weight: 700; font-size: 7px; line-height: 1.05; }
          .part-meta { font-size: 6px; color: #475569; margin-top: 1px; line-height: 1.05; }
          .part-desc { font-size: 6px; color: #374151; margin-top: 1px; line-height: 1.05; }
          .foot { margin-top: 5px; font-size: 7px; color: #6b7280; display: flex; justify-content: space-between; }
          @media print {
            .toolbar { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 0; }
            .pagination-component { display: none !important; }
            .forecast-table { font-size: 7.5px; }
            .forecast-table th, .forecast-table td { font-size: 7.5px; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="btn primary" id="printBtn">Cetak Dokumen</button>
          <button class="btn" id="closeBtn">Tutup</button>
        </div>
        <div class="page">
          <div class="header">
            <div class="brand">
              <img src="${logoPrl || logoMatra}" alt="Logo PT Matra Roda Piranti" />
              <div class="brand-text">
                <div class="brand-title">PT. MATRA RODA PIRANTI</div>
                <div class="brand-sub">PRODUCTION CONTROL DEPARTMENT</div>
                <div class="brand-sub">PART PROCUREMENT &amp; LOGISTIC DEPARTMENT</div>
                <div style="margin-top:6px;font-size:10px;line-height:1.25;">
                  <div><strong>FORECAST ORDER</strong></div>
                  <div>MONTH : ${escapeHtml(monthLabelMap[focusMonthKey] || focusMonthKey.toUpperCase())}</div>
                  <div>SUPPLIER : ${escapeHtml(String(supplierInfo.name || selectedSupplierName || 'All Suppliers'))}</div>
                  <div>CODE : ${escapeHtml(String(supplierInfo.code || supplier || 'ALL'))}</div>
                </div>
              </div>
            </div>
            <div class="doc-box">
              <div class="label">#PRL NUMBER</div>
              <div class="value">${escapeHtml(documentNumber)}</div>
            </div>
            <div class="period-box">
              <div><strong>FORECAST ORDER</strong></div>
              <div>MONTH : ${escapeHtml(monthLabelMap[focusMonthKey] || focusMonthKey.toUpperCase())}</div>
              <div>SUPPLIER : ${escapeHtml(String(supplierInfo.name || selectedSupplierName || 'All Suppliers'))}</div>
              <div>CODE : ${escapeHtml(String(supplierInfo.code || supplier || 'ALL'))}</div>
            </div>
          </div>
          <div class="meta">
            <div class="meta-left">
              <div><strong>Working Days:</strong> ${formatNumber(report.workingDays || 0, 0)} HK</div>
              <div><strong>Month Focus:</strong> ${escapeHtml(monthLabelMap[focusMonthKey] || focusMonthKey.toUpperCase())}</div>
              <div><strong>Document No:</strong> ${escapeHtml(documentNumber)}</div>
            </div>
            <div class="meta-right">
              <div>PRINT DATE : ${escapeHtml(printDate)}</div>
              <div>Total Item : ${rows.length}</div>
            </div>
          </div>
          <div class="separator"></div>
          <table class="forecast-table">
            <colgroup>
              <col style="width: 3%;" />
              <col style="width: 18%;" />
              <col style="width: 5%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 5%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
              <col style="width: 4%;" />
            </colgroup>
            <thead>
              <tr>
                <th rowspan="2" style="width: 3%;">No</th>
                <th rowspan="2" style="width: 18%; min-width: 200px;">Part No / Deskripsi</th>
                <th rowspan="2" style="width: 5%;">Model</th>
                <th rowspan="2" style="width: 4%;">SNP</th>
                <th colspan="2" style="width: 8%;">QTY/DAY</th>
                <th rowspan="2" style="width: 4%;">UOM</th>
                <th rowspan="2" style="width: 5%;">Type Pack</th>
                <th colspan="4" style="width: 16%;">QTY/WEEK</th>
                <th rowspan="2" style="width: 4%;">N-1<br>${escapeHtml(monthSlots[0]?.monthLabel || '-')}<br>(${formatNumber(monthSlots[0]?.workingDays || 0, 0)} HK)</th>
                <th rowspan="2" style="width: 4%;">N<br>${escapeHtml(monthSlots[1]?.monthLabel || '-')}<br>(${formatNumber(monthSlots[1]?.workingDays || 0, 0)} HK)</th>
                <th rowspan="2" style="width: 4%;">N+1<br>${escapeHtml(monthSlots[2]?.monthLabel || '-')}<br>(${formatNumber(monthSlots[2]?.workingDays || 0, 0)} HK)</th>
                <th rowspan="2" style="width: 4%;">N+2<br>${escapeHtml(monthSlots[3]?.monthLabel || '-')}<br>(${formatNumber(monthSlots[3]?.workingDays || 0, 0)} HK)</th>
                <th rowspan="2" style="width: 4%;">N+3<br>${escapeHtml(monthSlots[4]?.monthLabel || '-')}<br>(${formatNumber(monthSlots[4]?.workingDays || 0, 0)} HK)</th>
                <th rowspan="2" style="width: 4%;">Fluctuation<br>(N-1 &gt; N)</th>
              </tr>
              <tr>
                <th style="width: 4%;">N-1</th>
                <th style="width: 4%;">N</th>
                <th style="width: 4%;">I</th>
                <th style="width: 4%;">II</th>
                <th style="width: 4%;">III</th>
                <th style="width: 4%;">IV</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="foot">
            <div>Dokumen ini dapat dicetak langsung melalui tombol Cetak Dokumen.</div>
            <div>Forecast supplier ${escapeHtml(String(supplierInfo.code || supplier || 'ALL'))}</div>
          </div>
        </div>
        <script>
          const printBtn = document.getElementById('printBtn');
          const closeBtn = document.getElementById('closeBtn');
          printBtn?.addEventListener('click', () => window.print());
          closeBtn?.addEventListener('click', () => window.close());
        </script>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!report || !Array.isArray(report.rows) || report.rows.length === 0) {
      showToastMessage('Tidak ada data forecast untuk dicetak.');
      return;
    }
    const html = buildPrintHtml();
    if (!html) {
      showToastMessage('Preview cetak gagal disiapkan.');
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.srcdoc = `${html}
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => window.print(), 250);
        });
      </script>
    `;
    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }
    };
    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) return;
      const done = () => {
        cleanup();
      };
      frameWindow.addEventListener('afterprint', done, { once: true });
      try {
        const fontsReady = frameWindow.document?.fonts?.ready;
        if (fontsReady && typeof fontsReady.then === 'function') {
          fontsReady.finally(() => setTimeout(() => frameWindow.print(), 150));
        } else {
          setTimeout(() => frameWindow.print(), 150);
        }
      } catch {
        setTimeout(() => frameWindow.print(), 150);
      }
      setTimeout(done, 15000);
    };
    document.body.appendChild(iframe);
  };

  if (!canViewPrl) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
        Anda tidak memiliki akses untuk melihat PRL to Supplier.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadSummary?.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Ringkasan Kalkulasi BOM</div>
                <div className={`mt-1 text-xs ${loadSummary.status === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {loadSummary.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoadSummary(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                aria-label="Tutup ringkasan"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-4 py-4 text-xs">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Total Items</div>
                <div className="mt-1 font-semibold text-slate-800">{loadSummary.totalItems || 0}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-emerald-600">Updated</div>
                <div className="mt-1 font-semibold text-emerald-700">{loadSummary.updated || 0}</div>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-amber-600">Skipped</div>
                <div className="mt-1 font-semibold text-amber-700">{loadSummary.skipped || 0}</div>
              </div>
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Detail item tanpa qty aktif</div>
              <div className="max-h-[42vh] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Part No</th>
                      <th className="p-2 text-left">Deskripsi</th>
                      <th className="p-2 text-right">Qty Aktif</th>
                      <th className="p-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(loadSummary.detailRows) && loadSummary.detailRows.length > 0 ? (
                      loadSummary.detailRows.map((row, index) => (
                        <tr key={`${row.partNo || 'row'}-${index}`} className="border-t">
                          <td className="p-2">{row.rowNumber || index + 1}</td>
                          <td className="p-2">{row.partNo || '-'}</td>
                          <td className="p-2">{row.description || '-'}</td>
                          <td className="p-2 text-right">{formatNumber(row.calculatedQty || 0, 2)}</td>
                          <td className="p-2">
                            <div>{row.reason || '-'}</div>
                            {row.note && (
                              <div
                                className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                title={row.parentTooltip || row.note}
                              >
                                {row.note}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400">
                          Tidak ada item yang di-skip.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setLoadSummary(null)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">PRL to Supplier</div>
            <div className="text-xs text-slate-500">Hasil BOM explosion resmi per supplier untuk kebutuhan cetak.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadReport({ force: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Muat Ulang
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Printer size={14} /> Cetak ke PDF
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Users size={16} className="text-slate-500" />
            <select
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="">All Suppliers</option>
              {supplierOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.id} - {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Calendar size={16} className="text-slate-500" />
            <input
              type="month"
              value={focusPeriod}
              onChange={(event) => setFocusPeriod(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <Search size={16} className="mr-2 text-slate-500" />
            <div className="leading-tight">
              <div className="font-semibold text-slate-800">{selectedSupplierName}</div>
              <div className="text-xs text-slate-500">Bulan fokus {focusMonthLabel} {focusYear}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/*
          keep the preview inside a single card; print layout below mirrors the physical form.
        */}
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Forecast Preview</div>
              <div className="text-xs text-slate-500">
                {report?.supplier?.name || selectedSupplierName} - {report?.monthLabel || focusMonthLabel} {focusYear}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {loading && reportRows.length === 0 ? 'Memuat data...' : `${reportRows.length} baris`}
            </div>
          </div>
        </div>

        {loading && reportRows.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Memuat forecast supplier...
          </div>
        )}

        {!loading && reportRows.length === 0 && (
          <div className="px-4 py-8 text-sm text-slate-500">
            Belum ada data forecast untuk supplier dan bulan yang dipilih.
          </div>
        )}

        {!loading && reportRows.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[1380px] p-4">
              <div className="grid grid-cols-[1.45fr_0.7fr_1.1fr] gap-3 items-start">
                <div className="flex items-start gap-3">
                  <img src={logoPrl || logoMatra} alt="Logo PT Matra Roda Piranti" className="h-12 w-12 object-contain" />
                  <div className="text-xs leading-tight text-slate-700">
                    <div className="text-base font-bold text-slate-900">PT. MATRA RODA PIRANTI</div>
                    <div>PRODUCTION CONTROL DEPARTMENT</div>
                    <div>PART PROCUREMENT &amp; LOGISTIC DEPARTMENT</div>
                    <div className="mt-2 text-[11px]">
                      <div><span className="font-semibold">FORECAST ORDER</span></div>
                      <div>MONTH : {focusMonthLabel}</div>
                      <div>SUPPLIER : {report?.supplier?.name || selectedSupplierName}</div>
                      <div>CODE : {report?.supplier?.code || supplier || 'ALL'}</div>
                    </div>
                  </div>
                </div>
                <div className="mx-auto w-full max-w-[170px] rounded border border-slate-400 text-center">
                  <div className="bg-slate-500 px-2 py-1 text-[10px] font-bold text-white">#PRL NUMBER</div>
                  <div className="px-3 py-4 text-sm font-semibold text-slate-800">{report?.documentNumber || '-'}</div>
                </div>
              </div>

              <div className="mt-3 flex justify-between text-[11px] text-slate-700">
                <div className="space-y-0.5">
                  <div><span className="font-semibold">Working Days:</span> {formatNumber(report?.workingDays || 0, 0)} HK</div>
                  <div><span className="font-semibold">Month Focus:</span> {report?.monthLabel || focusMonthLabel}</div>
                  <div><span className="font-semibold">Document No:</span> {report?.documentNumber || '-'}</div>
                </div>
                <div className="text-right">
                  <div>PRINT DATE : {report?.printDate || new Date().toLocaleDateString('id-ID')}</div>
                  <div>Total Item : {reportRows.length}</div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-300 pt-3">
                <table className="w-full table-fixed border-collapse text-xs text-slate-800">
                  <colgroup>
                    <col className="w-[3%]" />
                    <col className="w-[18%] min-w-[200px]" />
                    <col className="w-[5%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[5%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                    <col className="w-[4%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100">
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">No</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center min-w-[200px]">Part No / Deskripsi</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">Model</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">SNP</th>
                      <th colSpan={2} className="border border-slate-300 px-1 py-1 text-center">QTY/DAY</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">UOM</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">Type Pack</th>
                      <th colSpan={4} className="border border-slate-300 px-1 py-1 text-center">QTY/WEEK</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N-1<br />{monthSlots[0]?.monthLabel || '-'}<br />({formatNumber(monthSlots[0]?.workingDays || 0, 0)} HK)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N<br />{monthSlots[1]?.monthLabel || '-'}<br />({formatNumber(monthSlots[1]?.workingDays || 0, 0)} HK)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N+1<br />{monthSlots[2]?.monthLabel || '-'}<br />({formatNumber(monthSlots[2]?.workingDays || 0, 0)} HK)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N+2<br />{monthSlots[3]?.monthLabel || '-'}<br />({formatNumber(monthSlots[3]?.workingDays || 0, 0)} HK)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N+3<br />{monthSlots[4]?.monthLabel || '-'}<br />({formatNumber(monthSlots[4]?.workingDays || 0, 0)} HK)</th>
                      <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">Fluctuation</th>
                    </tr>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N-1</th>
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">N</th>
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">I</th>
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">II</th>
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">III</th>
                      <th className="border border-slate-300 px-1 py-1 text-center whitespace-nowrap">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMeta.rows.map((row, index) => (
                      <tr key={`${row.itemCode || row.partNo || index}`} className="odd:bg-white even:bg-slate-50">
                        <td className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap">{paginatedMeta.startIndex + index}</td>
                        <td className="border border-slate-200 px-1 py-1 text-left align-top whitespace-normal break-words">
                          <div className="font-semibold leading-tight">{row.partNo || row.itemCode || '-'}</div>
                          <div className="text-[10px] leading-tight text-slate-600">
                            Model: {resolveModelLabel(row.model)} | Uniq: {row.itemCode || '-'}
                          </div>
                          <div className="text-[10px] leading-tight text-slate-500">{row.description || '-'}</div>
                        </td>
                        <td className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap">{resolveModelLabel(row.model)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.snp, 0)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.qtyDayMinusOne, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.qtyDayCurrent, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap">{row.uom || '-'}</td>
                        <td className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap">{row.typePack || '-'}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.weekI, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.weekII, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.weekIII, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.weekIV, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.months?.nMinus1, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.months?.n, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.months?.nPlus1, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.months?.nPlus2, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right whitespace-nowrap">{formatNumber(row.months?.nPlus3, 2)}</td>
                        <td className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap">
                          {row.fluctuation === null || row.fluctuation === undefined ? '-' : `${formatNumber(row.fluctuation, 0)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination-component mt-3 flex flex-col gap-3 text-[11px] text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={paginatedMeta.perPage}
                      onChange={(event) => setTablePagination({ page: 1, perPage: Number(event.target.value) || 25 })}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700"
                    >
                      {[25, 50, 75, 100].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <span className="text-slate-500">
                      Showing {paginatedMeta.startIndex} to {paginatedMeta.endIndex} of {paginatedMeta.total} entries
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setTablePagination((prev) => ({ ...prev, page: Math.max(1, paginatedMeta.page - 1) }))}
                      disabled={paginatedMeta.page <= 1}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {buildPageSequence(paginatedMeta.page, paginatedMeta.totalPages).map((entry, index) => (
                      entry.type === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-slate-400">...</span>
                      ) : (
                        <button
                          key={`page-${entry.value}`}
                          type="button"
                          onClick={() => setTablePagination((prev) => ({ ...prev, page: entry.value }))}
                          className={`rounded border px-2 py-1 font-semibold ${paginatedMeta.page === entry.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {entry.value}
                        </button>
                      )
                    ))}
                    <button
                      type="button"
                      onClick={() => setTablePagination((prev) => ({ ...prev, page: Math.min(paginatedMeta.totalPages, paginatedMeta.page + 1) }))}
                      disabled={paginatedMeta.page >= paginatedMeta.totalPages}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabPrlToSupplier;
