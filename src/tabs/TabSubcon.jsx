import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Factory, RefreshCw, Truck, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import logoPrl from '../assets/kop-mrp.png';

const TabSubcon = (props) => {
  const {
    mainTab,
    apiFetch,
    masterVendors,
    masterItems,
    masterProcesses,
    canEditSchedules,
    canViewReport,
    formatDateID,
    formatNumber0,
    showToastMessage,
  } = props;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);
  const subconVendors = useMemo(() => (
    masterVendors.filter((vendor) => String(vendor.type || '').toLowerCase().includes('subcon'))
  ), [masterVendors]);
  const rawItems = useMemo(() => (
    masterItems.filter((item) => String(item.type || '').toLowerCase().includes('raw'))
  ), [masterItems]);
  const finishedItems = useMemo(() => (
    masterItems.filter((item) => String(item.type || '').toLowerCase().includes('finished'))
  ), [masterItems]);
  const processMap = useMemo(() => {
    const map = new Map();
    (masterProcesses || []).forEach((process) => {
      const code = String(process.code || '').trim();
      const name = String(process.name || '').trim();
      if (code) map.set(code.toLowerCase(), process);
      if (name) map.set(name.toLowerCase(), process);
    });
    return map;
  }, [masterProcesses]);

  const resolveProcessStep = useCallback((step) => {
    if (!step) return null;
    if (typeof step === 'object') {
      const code = String(step.code || step.processCode || '').trim();
      if (code) {
        return processMap.get(code.toLowerCase()) || step;
      }
      return step;
    }
    const raw = String(step || '').trim();
    if (!raw) return null;
    return processMap.get(raw.toLowerCase()) || { code: raw, name: raw, process_type: '' };
  }, [processMap]);

  const formatRoutingStep = useCallback((step) => {
    const resolved = resolveProcessStep(step);
    if (!resolved) return '';
    const processType = String(resolved.process_type || resolved.processType || '').trim();
    const workCenter = String(resolved.work_center || resolved.workCenter || '').trim();
    const sequence = Number.isFinite(Number(resolved.sequence)) ? Number(resolved.sequence) : null;
    const standardTime = Number.isFinite(Number(resolved.standard_time ?? resolved.standardTime))
      ? Number(resolved.standard_time ?? resolved.standardTime)
      : null;
    const parts = [
      processType ? `[${processType}]` : '',
      resolved.code,
      resolved.name,
      workCenter ? `WC ${workCenter}` : '',
      sequence !== null ? `Seq ${sequence}` : '',
      standardTime !== null ? `${standardTime}s` : '',
    ].filter(Boolean);
    return parts.join(' • ');
  }, [resolveProcessStep]);

  const subconRoutingItems = useMemo(() => {
    return (masterItems || [])
      .map((item) => {
        const routingSteps = Array.isArray(item.process_routing) && item.process_routing.length
          ? item.process_routing
          : Array.isArray(item.process_flow) && item.process_flow.length
            ? item.process_flow
            : [];
        if (routingSteps.length === 0) return null;
        const resolvedSteps = routingSteps.map((step) => resolveProcessStep(step)).filter(Boolean);
        const hasSubcon = resolvedSteps.some((step) => {
          const text = [
            step?.process_type || step?.processType || '',
            step?.name || '',
            step?.code || '',
          ].join(' ').toLowerCase();
          return text.includes('subcon');
        });
        if (!hasSubcon) return null;
        return {
          ...item,
          routingSteps: resolvedSteps,
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(left.code || '').localeCompare(String(right.code || '')));
  }, [masterItems, resolveProcessStep]);

  const [subconTab, setSubconTab] = useState('delivery');
  const [deliveryForm, setDeliveryForm] = useState({
    vendorId: '',
    itemCode: '',
    qty: '',
    date: today,
    reference: '',
    notes: '',
  });
  const [deliveryFilter, setDeliveryFilter] = useState({ vendorId: '', start: '', end: '' });
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryRefAuto, setDeliveryRefAuto] = useState(true);

  const [receiptForm, setReceiptForm] = useState({
    vendorId: '',
    productCode: '',
    qty: '',
    date: today,
    reference: '',
    notes: '',
  });
  const [receiptFilter, setReceiptFilter] = useState({ vendorId: '', start: '', end: '' });
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptResult, setReceiptResult] = useState(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [loadDoOpen, setLoadDoOpen] = useState(false);
  const [loadDoVendor, setLoadDoVendor] = useState('');
  const [loadDoSearch, setLoadDoSearch] = useState('');
  const [loadDoRows, setLoadDoRows] = useState([]);
  const [loadDoLoading, setLoadDoLoading] = useState(false);
  const [selectedDo, setSelectedDo] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [stockFilterVendor, setStockFilterVendor] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockRows, setStockRows] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({
    vendorId: '',
    itemCode: '',
    start: monthRange.start,
    end: monthRange.end,
  });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerHeader, setLedgerHeader] = useState(null);
  const [ledgerError, setLedgerError] = useState('');
  const [opnameSaving, setOpnameSaving] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [opnameForm, setOpnameForm] = useState({
    vendorId: '',
    itemCode: '',
    actualQty: '',
    date: today,
    notes: '',
  });
  const [printOpen, setPrintOpen] = useState(false);
  const [printDelivery, setPrintDelivery] = useState(null);

  const deliveryRefAutoRef = React.useRef(deliveryRefAuto);

  const notify = useCallback((message) => {
    if (typeof showToastMessage === 'function') showToastMessage(message);
    else alert(message);
  }, [showToastMessage]);

  useEffect(() => {
    if (typeof document === 'undefined') return () => {};
    document.body.classList.toggle('kanban-print-active', printOpen);
    return () => document.body.classList.remove('kanban-print-active');
  }, [printOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const existingStyle = document.getElementById('subcon-print-page-style');
    if (printOpen) {
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'subcon-print-page-style';
        style.textContent = '@media print { @page { size: A4 portrait; margin: 8mm 10mm 12mm 10mm; } }';
        document.head.appendChild(style);
      }
    } else {
      existingStyle?.remove();
    }
    const handleAfterPrint = () => {
      document.getElementById('subcon-print-page-style')?.remove();
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      document.getElementById('subcon-print-page-style')?.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printOpen]);

  useEffect(() => {
    deliveryRefAutoRef.current = deliveryRefAuto;
  }, [deliveryRefAuto]);

  const formatNumber = useCallback((value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value ?? '';
    const isWhole = Math.abs(num - Math.round(num)) < 1e-6;
    if (isWhole && formatNumber0) return formatNumber0(num);
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }, [formatNumber0]);

  const formatDateLabel = useCallback((value) => {
    if (formatDateID) return formatDateID(value);
    return value || '-';
  }, [formatDateID]);

  const fetchSubconSjPreview = useCallback(async (dateValue, vendorValue) => {
    try {
      const params = new URLSearchParams();
      if (dateValue) params.set('date', dateValue);
      if (vendorValue) params.set('vendor', vendorValue);
      const query = params.toString();
      const data = await apiFetch(`/api/subcon/deliveries/next-number${query ? `?${query}` : ''}`);
      return data?.sjNumber || '';
    } catch (error) {
      console.error('Gagal ambil SJ Subcon preview:', error);
      return '';
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!showDeliveryForm || !deliveryRefAuto) return () => {};
    let active = true;
    (async () => {
      const nextRef = await fetchSubconSjPreview(deliveryForm.date, deliveryForm.vendorId);
      if (!active || !nextRef || !deliveryRefAutoRef.current) return;
      setDeliveryForm((prev) => {
        if (!deliveryRefAutoRef.current) return prev;
        if (prev.reference === nextRef) return prev;
        return { ...prev, reference: nextRef };
      });
    })();
    return () => {
      active = false;
    };
  }, [showDeliveryForm, deliveryRefAuto, deliveryForm.date, deliveryForm.vendorId, fetchSubconSjPreview]);

  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const params = new URLSearchParams();
      if (deliveryFilter.vendorId) params.set('vendor', deliveryFilter.vendorId);
      if (deliveryFilter.start) params.set('start', deliveryFilter.start);
      if (deliveryFilter.end) params.set('end', deliveryFilter.end);
      const query = params.toString();
      const data = await apiFetch(`/api/subcon/deliveries${query ? `?${query}` : ''}`);
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      notify(error.message || 'Gagal memuat delivery Subcon.');
    } finally {
      setDeliveriesLoading(false);
    }
  }, [apiFetch, deliveryFilter, notify]);

  const loadReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    try {
      const params = new URLSearchParams();
      if (receiptFilter.vendorId) params.set('vendor', receiptFilter.vendorId);
      if (receiptFilter.start) params.set('start', receiptFilter.start);
      if (receiptFilter.end) params.set('end', receiptFilter.end);
      const query = params.toString();
      const data = await apiFetch(`/api/subcon/receipts${query ? `?${query}` : ''}`);
      setReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      notify(error.message || 'Gagal memuat receipt Subcon.');
    } finally {
      setReceiptsLoading(false);
    }
  }, [apiFetch, receiptFilter, notify]);

  const loadOpenDeliveries = useCallback(async () => {
    setLoadDoLoading(true);
    try {
      const params = new URLSearchParams();
      if (loadDoVendor) params.set('vendor', loadDoVendor);
      const query = params.toString();
      const data = await apiFetch(`/api/subcon/deliveries/open${query ? `?${query}` : ''}`);
      setLoadDoRows(Array.isArray(data) ? data : []);
    } catch (error) {
      notify(error.message || 'Gagal memuat DO Subcon.');
    } finally {
      setLoadDoLoading(false);
    }
  }, [apiFetch, loadDoVendor, notify]);

  const loadStockCard = useCallback(async () => {
    if (!canViewReport) return;
    setStockLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockFilterVendor) params.set('vendor', stockFilterVendor);
      const query = params.toString();
      const data = await apiFetch(`/api/subcon/stock-card${query ? `?${query}` : ''}`);
      setStockRows(Array.isArray(data) ? data : []);
    } catch (error) {
      notify(error.message || 'Gagal memuat stock card Subcon.');
    } finally {
      setStockLoading(false);
    }
  }, [apiFetch, canViewReport, stockFilterVendor, notify]);

  const loadStockLedger = useCallback(async () => {
    if (!canViewReport) return;
    const vendorValue = String(ledgerFilter.vendorId || '').trim();
    const itemValue = String(ledgerFilter.itemCode || '').trim();
    if (!vendorValue || !itemValue) {
      setLedgerRows([]);
      setLedgerHeader(null);
      setLedgerError('');
      return;
    }
    setLedgerLoading(true);
    setLedgerError('');
    try {
      const params = new URLSearchParams();
      params.set('vendor', vendorValue);
      params.set('itemCode', itemValue);
      if (ledgerFilter.start) params.set('start', ledgerFilter.start);
      if (ledgerFilter.end) params.set('end', ledgerFilter.end);
      const data = await apiFetch(`/api/subcon/stock-ledger?${params.toString()}`);
      setLedgerHeader(data?.header || null);
      setLedgerRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (error) {
      setLedgerRows([]);
      setLedgerHeader(null);
      setLedgerError(error.message || 'Gagal memuat kartu stok Subcon.');
    } finally {
      setLedgerLoading(false);
    }
  }, [apiFetch, canViewReport, ledgerFilter, notify]);

  useEffect(() => {
    if (mainTab !== 'subcon') return;
    if (subconTab === 'delivery') loadDeliveries();
    if (subconTab === 'receipt') loadReceipts();
    if (subconTab === 'stock-card') loadStockCard();
  }, [mainTab, subconTab, loadDeliveries, loadReceipts, loadStockCard]);

  useEffect(() => {
    if (!loadDoOpen) return;
    loadOpenDeliveries();
  }, [loadDoOpen, loadOpenDeliveries]);

  const itemsByCode = useMemo(() => {
    const map = new Map();
    masterItems.forEach((item) => map.set(item.code, item));
    return map;
  }, [masterItems]);

  const getStatusBadgeClass = useCallback((statusValue) => {
    const status = String(statusValue || 'OPEN').trim().toUpperCase();
    if (status === 'OPEN') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'CLOSED' || status === 'CLOSE') return 'bg-slate-100 text-slate-600 border-slate-200';
    if (status.startsWith('PARTIAL')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }, []);

  const vendorNameById = useMemo(() => {
    const map = new Map();
    masterVendors.forEach((vendor) => map.set(vendor.id, vendor.name || vendor.id));
    return map;
  }, [masterVendors]);

  const buildKanbanCards = useCallback((row) => {
    if (!row) return [];
    const item = itemsByCode.get(row.item_code) || {};
    const qtyTotal = Number(row.qty || 0);
    const packQty = Number(item.pack_qty || 0);
    const partNo = item.part_no || row.item_code;
    const itemName = item.name || row.item_name || row.item_code;
    const qrValue = partNo || row.item_code;
    const totalCards = packQty > 0 ? Math.max(1, Math.ceil(qtyTotal / packQty)) : 1;
    return Array.from({ length: totalCards }).map((_, idx) => {
      const remaining = qtyTotal - packQty * idx;
      const cardQty = packQty > 0 ? (idx === totalCards - 1 ? Math.max(remaining, 0) : packQty) : qtyTotal;
      return {
        id: `${row.id}-${idx + 1}`,
        seq: idx + 1,
        total: totalCards,
        partNo,
        itemName,
        cardQty,
        qrValue,
      };
    });
  }, [itemsByCode]);

  const doSuggestions = useMemo(() => {
    if (!selectedDo) return [];
    const options = [];
    const suggestedType = String(selectedDo.suggested_product_type || '').toLowerCase();
    if (selectedDo.suggested_product_code && suggestedType.includes('finished')) {
      options.push({
        code: selectedDo.suggested_product_code,
        name: selectedDo.suggested_product_name,
        unit: selectedDo.suggested_product_unit,
        usagePerUnit: Number(selectedDo.usage_per_unit || 0),
      });
    }
    (selectedDo.alternatives || []).forEach((alt) => {
      const altType = String(alt.parentType || '').toLowerCase();
      if (!altType.includes('finished')) return;
      options.push({
        code: alt.parentCode,
        name: alt.parentName,
        unit: alt.parentUnit,
        usagePerUnit: Number(alt.usagePerUnit || 0),
      });
    });
    return options.filter((opt) => opt.code);
  }, [selectedDo]);

  const filteredLoadDoRows = useMemo(() => {
    const term = String(loadDoSearch || '').trim().toLowerCase();
    if (!term) return loadDoRows;
    return (loadDoRows || []).filter((row) => {
      const haystack = [
        row.sj_number,
        row.vendor_name,
        row.vendor_id,
        row.status,
        row.item_code,
        row.item_name,
        row.suggested_product_code,
        row.suggested_product_name,
      ]
        .filter(Boolean)
        .map((val) => String(val).toLowerCase());
      return haystack.some((val) => val.includes(term));
    });
  }, [loadDoRows, loadDoSearch]);

  const finishedDropdownOptions = useMemo(() => {
    const map = new Map();
    doSuggestions.forEach((opt) => {
      map.set(opt.code, { ...opt, usagePerUnit: opt.usagePerUnit });
    });
    finishedItems.forEach((item) => {
      if (!map.has(item.code)) {
        map.set(item.code, {
          code: item.code,
          name: item.name,
          unit: item.unit,
          usagePerUnit: null,
        });
      }
    });
    return Array.from(map.values());
  }, [doSuggestions, finishedItems]);

  const maxFgFromDo = useMemo(() => {
    if (!selectedDo || !selectedSuggestion?.usagePerUnit) return null;
    const remaining = Number(selectedDo.remaining_qty || 0);
    const usage = Number(selectedSuggestion.usagePerUnit || 0);
    if (!Number.isFinite(remaining) || !Number.isFinite(usage) || usage <= 0) return null;
    return Math.floor(remaining / usage);
  }, [selectedDo, selectedSuggestion]);

  const qtyExceedsDo = useMemo(() => {
    if (!selectedDo || maxFgFromDo === null) return false;
    const qtyNumber = Number(receiptForm.qty);
    if (!Number.isFinite(qtyNumber)) return false;
    return qtyNumber > maxFgFromDo + 1e-6;
  }, [selectedDo, maxFgFromDo, receiptForm.qty]);

  const handleSubmitDelivery = async () => {
    if (!canEditSchedules) {
      notify('Anda tidak memiliki akses untuk mengirim Subcon.');
      return;
    }
    const qtyNumber = Number(deliveryForm.qty);
    if (!deliveryForm.vendorId || !deliveryForm.itemCode || !Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      notify('Vendor, Item RM, dan Qty wajib diisi.');
      return;
    }
    setDeliverySaving(true);
    try {
      const payload = {
        vendorId: deliveryForm.vendorId,
        itemCode: deliveryForm.itemCode,
        qty: qtyNumber,
        deliveryDate: deliveryForm.date || today,
        reference: deliveryForm.reference,
        notes: deliveryForm.notes,
      };
      const result = await apiFetch('/api/subcon/deliveries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const sjNumber = result?.delivery?.sj_number || '-';
      notify(`RM terkirim ke Subcon. SJ ${sjNumber}. Qty ${formatNumber(qtyNumber)}.`);
      setDeliveryForm((prev) => ({ ...prev, qty: '', reference: '', notes: '' }));
      setDeliveryRefAuto(true);
      if (result?.consumed?.length) {
        notify(`Stok main terpotong ${formatNumber(qtyNumber)} (FIFO).`);
      }
      await loadDeliveries();
    } catch (error) {
      notify(error.message || 'Gagal kirim RM ke Subcon.');
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!canEditSchedules) {
      notify('Anda tidak memiliki akses untuk menerima Subcon.');
      return;
    }
    const qtyNumber = Number(receiptForm.qty);
    if (!receiptForm.vendorId || !receiptForm.productCode || !Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      notify('Vendor, Produk FG, dan Qty wajib diisi.');
      return;
    }
    setReceiptSaving(true);
    try {
      const payload = {
        vendorId: receiptForm.vendorId,
        productCode: receiptForm.productCode,
        qty: qtyNumber,
        receiptDate: receiptForm.date || today,
        reference: receiptForm.reference,
        notes: receiptForm.notes,
        deliveryId: selectedDo?.id || null,
      };
      const result = await apiFetch('/api/subcon/receipts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setReceiptResult(result || null);
      notify(`FG diterima. Qty ${formatNumber(qtyNumber)}.`);
      setReceiptForm((prev) => ({ ...prev, qty: '', reference: '', notes: '' }));
      setSelectedDo(null);
      setSelectedSuggestion(null);
      await loadReceipts();
    } catch (error) {
      if (String(error?.message || '').includes('Bahan baku di DO ini tidak cukup')) {
        notify(error.message);
        return;
      }
      notify(error.message || 'Gagal menerima FG dari Subcon.');
    } finally {
      setReceiptSaving(false);
    }
  };

  const handleSaveOpname = async () => {
    if (!canEditSchedules) {
      notify('Anda tidak memiliki akses untuk input stock opname.');
      return;
    }
    const qtyNumber = Number(opnameForm.actualQty);
    if (!opnameForm.vendorId || !opnameForm.itemCode || !Number.isFinite(qtyNumber)) {
      notify('Vendor, Item RM, dan Actual Qty wajib diisi.');
      return;
    }
    setOpnameSaving(true);
    try {
      await apiFetch('/api/subcon/opname', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: opnameForm.vendorId,
          itemCode: opnameForm.itemCode,
          actualQty: qtyNumber,
          opnameDate: opnameForm.date || today,
          notes: opnameForm.notes,
        }),
      });
      notify('Stock opname tersimpan.');
      setOpnameForm((prev) => ({ ...prev, actualQty: '', notes: '' }));
      await loadStockCard();
    } catch (error) {
      notify(error.message || 'Gagal menyimpan stock opname.');
    } finally {
      setOpnameSaving(false);
    }
  };

  if (mainTab !== 'subcon') return null;

  const activePrintRow = printDelivery || null;
  const printItem = activePrintRow ? (itemsByCode.get(activePrintRow.item_code) || {}) : {};
  const printVendorName = activePrintRow
    ? (activePrintRow.vendor_name || vendorNameById.get(activePrintRow.vendor_id) || activePrintRow.vendor_id || '-')
    : '-';
  const printCards = activePrintRow ? buildKanbanCards(activePrintRow) : [];
  const printUnit = printItem.unit || activePrintRow?.item_unit || '-';
  const printPackQty = Number(printItem.pack_qty || 0);
  const printPartNo = printItem.part_no || activePrintRow?.item_code || '-';
  const printItemName = printItem.name || activePrintRow?.item_name || activePrintRow?.item_code || '-';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">Subcontracting (Maklon)</div>
          <div className="text-xs text-slate-500">Virtual warehouse &amp; backflush monitoring untuk vendor Subcon.</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'routing', label: 'BOM Routing Subcon', icon: <Factory size={14} /> },
          { key: 'delivery', label: 'Subcon Delivery', icon: <Truck size={14} /> },
          { key: 'receipt', label: 'Subcon Receipt', icon: <Factory size={14} /> },
          { key: 'stock-card', label: 'Subcon Stock Card', icon: <RefreshCw size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubconTab(tab.key)}
            className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-2 ${
              subconTab === tab.key
                ? 'bg-slate-900 text-white border-slate-900 shadow'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <datalist id="subcon-vendor-options">
        {subconVendors.map((vendor) => (
          <option key={`vendor-${vendor.id}`} value={vendor.id}>{vendor.name}</option>
        ))}
      </datalist>

      {subconTab === 'routing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="text-sm font-semibold">BOM Routing dengan Proses Subcon</div>
                <div className="text-xs text-slate-500">Daftar item master yang punya langkah proses `Subcon` di routing BOM.</div>
              </div>
              <div className="text-xs text-slate-500">
                Total: {subconRoutingItems.length} item
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-left p-2">Kategori</th>
                    <th className="text-left p-2">Routing</th>
                  </tr>
                </thead>
                <tbody>
                  {subconRoutingItems.map((item) => (
                    <tr key={item.code} className="border-t align-top">
                      <td className="p-2">
                        <div className="font-semibold text-slate-700">{item.code}</div>
                        <div className="text-slate-500">{item.name || '-'}</div>
                      </td>
                      <td className="p-2 text-slate-600">{item.type || '-'}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {(item.routingSteps || []).map((step, index) => {
                            const label = formatRoutingStep(step);
                            const isSubcon = String(step?.process_type || step?.processType || step?.name || '').toLowerCase().includes('subcon');
                            return (
                              <span
                                key={`${item.code}-${index}`}
                                className={`rounded-full px-2 py-0.5 text-[10px] border ${isSubcon ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                              >
                                {label || step?.code || '-'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subconRoutingItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400">
                        Belum ada item master dengan routing Subcon.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subconTab === 'delivery' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-semibold">Kirim Bahan (RM) ke Subcon</div>
              {!showDeliveryForm && (
                <button
                  type="button"
                  onClick={() => setShowDeliveryForm(true)}
                  className="px-2.5 py-1 rounded border text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Input
                </button>
              )}
            </div>
            {showDeliveryForm && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-3">
                  <input
                    className="border rounded px-3 py-2"
                    list="subcon-vendor-options"
                    placeholder="Vendor Subcon (id/nama)"
                    value={deliveryForm.vendorId}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, vendorId: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2"
                    list="subcon-rm-options"
                    placeholder="Item RM (kode/nama)"
                    value={deliveryForm.itemCode}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, itemCode: e.target.value }))}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border rounded px-3 py-2"
                    placeholder="Qty RM"
                    value={deliveryForm.qty}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, qty: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="border rounded px-3 py-2"
                    value={deliveryForm.date}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2 bg-slate-50 text-slate-600"
                    placeholder="Reference / DO (Auto)"
                    value={deliveryForm.reference}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDeliveryForm((prev) => ({ ...prev, reference: nextValue }));
                      setDeliveryRefAuto(!nextValue);
                    }}
                    readOnly
                    title="Otomatis dari Master Config (SJ Subcon)"
                  />
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Notes"
                    value={deliveryForm.notes}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <datalist id="subcon-rm-options">
                  {(rawItems.length ? rawItems : masterItems).map((item) => (
                    <option key={`rm-${item.code}`} value={item.code}>{item.name}</option>
                  ))}
                </datalist>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={handleSubmitDelivery}
                    disabled={deliverySaving}
                    className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-70"
                  >
                    {deliverySaving ? 'Menyimpan...' : 'Kirim RM'}
                  </button>
                  <button
                    onClick={() => {
                      setDeliveryForm({ vendorId: '', itemCode: '', qty: '', date: today, reference: '', notes: '' });
                      setDeliveryRefAuto(true);
                    }}
                    className="px-3 py-1.5 rounded border"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeliveryForm(false)}
                    className="px-3 py-1.5 rounded border"
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm font-semibold">Riwayat Delivery</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <input
                  className="border rounded px-2 py-1"
                  list="subcon-vendor-options"
                  placeholder="Filter Vendor"
                  value={deliveryFilter.vendorId}
                  onChange={(e) => setDeliveryFilter((prev) => ({ ...prev, vendorId: e.target.value }))}
                />
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={deliveryFilter.start}
                  onChange={(e) => setDeliveryFilter((prev) => ({ ...prev, start: e.target.value }))}
                />
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={deliveryFilter.end}
                  onChange={(e) => setDeliveryFilter((prev) => ({ ...prev, end: e.target.value }))}
                />
                <button onClick={loadDeliveries} className="px-3 py-1 rounded bg-slate-900 text-white">Refresh</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">SJ No.</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-left p-2">Item RM</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Reference</th>
                    <th className="text-left p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveriesLoading && (
                    <tr><td colSpan="8" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                  )}
                  {!deliveriesLoading && deliveries.length === 0 && (
                    <tr><td colSpan="8" className="p-4 text-center text-slate-400">Belum ada delivery.</td></tr>
                  )}
                  {!deliveriesLoading && deliveries.map((row) => (
                    <tr key={`delivery-${row.id}`} className="border-t">
                      <td className="p-2">{formatDateLabel(row.delivery_date)}</td>
                      <td className="p-2">{row.sj_number || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(row.status)}`}>
                          {String(row.status || 'OPEN').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{row.vendor_name || row.vendor_id}</td>
                      <td className="p-2">{row.item_code} - {row.item_name}</td>
                      <td className="p-2">{formatNumber(row.qty)}</td>
                      <td className="p-2">{row.reference || '-'}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintDelivery(row);
                            setPrintOpen(true);
                          }}
                          className="px-2 py-1 rounded border text-[10px] hover:bg-slate-50"
                        >
                          Print SJ &amp; Kanban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subconTab === 'receipt' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-semibold">Terima Hasil FG (Backflush)</div>
              {!showReceiptForm && (
                <button
                  type="button"
                  onClick={() => setShowReceiptForm(true)}
                  className="px-2.5 py-1 rounded border text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Input
                </button>
              )}
            </div>
            {showReceiptForm && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoadDoVendor(receiptForm.vendorId || '');
                      setLoadDoOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800"
                  >
                    AMBIL DARI DO / LOAD DO
                  </button>
                  {selectedDo && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDo(null);
                        setSelectedSuggestion(null);
                      }}
                      className="px-3 py-2 rounded border text-xs"
                    >
                      Clear DO
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-3">
                  <input
                    className="border rounded px-3 py-2"
                    list="subcon-vendor-options"
                    placeholder="Vendor Subcon (id/nama)"
                    value={receiptForm.vendorId}
                    onChange={(e) => {
                      if (selectedDo) return;
                      setReceiptForm((prev) => ({ ...prev, vendorId: e.target.value }));
                    }}
                    readOnly={!!selectedDo}
                  />
                  {selectedDo ? (
                    <select
                      className="border rounded px-3 py-2"
                      value={selectedSuggestion?.code || receiptForm.productCode || ''}
                      onChange={(e) => {
                        const next = finishedDropdownOptions.find((opt) => opt.code === e.target.value);
                        setSelectedSuggestion(next?.usagePerUnit ? next : null);
                        if (next?.code) {
                          setReceiptForm((prev) => ({ ...prev, productCode: next.code }));
                          if (selectedDo?.remaining_qty && next?.usagePerUnit) {
                            const max = Number(selectedDo.remaining_qty || 0) / Number(next.usagePerUnit || 1);
                            const safeMax = Number.isFinite(max) ? Math.floor(max) : '';
                            setReceiptForm((prev) => ({ ...prev, qty: safeMax }));
                          }
                        }
                      }}
                    >
                      <option value="">Pilih FG (Finished)</option>
                      {finishedDropdownOptions.map((opt) => (
                        <option key={`fg-${opt.code}`} value={opt.code}>{opt.code} - {opt.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="border rounded px-3 py-2"
                      list="subcon-fg-options"
                      placeholder="Produk FG (kode/nama)"
                      value={receiptForm.productCode}
                      onChange={(e) => setReceiptForm((prev) => ({ ...prev, productCode: e.target.value }))}
                    />
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border rounded px-3 py-2"
                    placeholder="Qty FG"
                    value={receiptForm.qty}
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, qty: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="border rounded px-3 py-2"
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Reference / DO"
                    value={receiptForm.reference}
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, reference: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Notes"
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <datalist id="subcon-fg-options">
                  {(finishedItems.length ? finishedItems : masterItems.filter((item) => String(item.type || '').toLowerCase().includes('finished'))).map((item) => (
                    <option key={`fg-${item.code}`} value={item.code}>{item.name}</option>
                  ))}
                </datalist>
                {selectedDo && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="border rounded p-3 bg-slate-50">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">DO Terpilih</div>
                      <div className="text-sm font-semibold">{selectedDo.sj_number || '-'}</div>
                    </div>
                    <div className="border rounded p-3 bg-slate-50">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">Total RM di Gudang Virtual</div>
                      <div className="text-sm font-semibold">{formatNumber(selectedDo.virtual_stock || 0)}</div>
                    </div>
                    <div className="border rounded p-3 bg-slate-50">
                      <div className="text-[10px] uppercase text-slate-500 mb-1">RM dari DO Terpilih (Sisa)</div>
                      <div className="text-sm font-semibold">{formatNumber(selectedDo.remaining_qty || 0)}</div>
                    </div>
                  </div>
                )}
                {selectedDo && maxFgFromDo !== null && (
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${qtyExceedsDo ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {qtyExceedsDo
                      ? `Bahan Baku di DO ini tidak cukup! Maksimal FG: ${formatNumber(maxFgFromDo)}. Sisa diambil dari stok virtual lain?`
                      : `Estimasi maksimal FG dari DO ini: ${formatNumber(maxFgFromDo)}.`}
                  </div>
                )}
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={handleSubmitReceipt}
                    disabled={receiptSaving}
                    className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-70"
                  >
                    {receiptSaving ? 'Menyimpan...' : 'Terima FG'}
                  </button>
                  <button
                    onClick={() => {
                      setReceiptForm({ vendorId: '', productCode: '', qty: '', date: today, reference: '', notes: '' });
                      setSelectedDo(null);
                      setSelectedSuggestion(null);
                    }}
                    className="px-3 py-1.5 rounded border"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceiptForm(false)}
                    className="px-3 py-1.5 rounded border"
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>

          {receiptResult && (
            <div className="bg-white rounded-xl border p-4 text-xs">
              <div className="font-semibold mb-2">Detail Backflush</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="border rounded p-2">
                  <div className="text-slate-500 mb-2">RM Terpakai (BOM)</div>
                  {(receiptResult.backflush || []).length === 0 && (
                    <div className="text-slate-400">Tidak ada data backflush.</div>
                  )}
                  {(receiptResult.backflush || []).map((row, idx) => (
                    <div key={`bf-${idx}`} className="flex items-center justify-between">
                      <span>{row.itemCode}</span>
                      <span className="font-medium">{formatNumber(row.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border rounded p-2">
                  <div className="text-slate-500 mb-2">Selisih Buku (Shortage)</div>
                  {(receiptResult.shortages || []).length === 0 && (
                    <div className="text-slate-400">Tidak ada shortage.</div>
                  )}
                  {(receiptResult.shortages || []).map((row, idx) => (
                    <div key={`short-${idx}`} className="flex items-center justify-between">
                      <span>{row.itemCode}</span>
                      <span className="font-medium">{formatNumber(row.shortage)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm font-semibold">Riwayat Receipt</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <input
                  className="border rounded px-2 py-1"
                  list="subcon-vendor-options"
                  placeholder="Filter Vendor"
                  value={receiptFilter.vendorId}
                  onChange={(e) => setReceiptFilter((prev) => ({ ...prev, vendorId: e.target.value }))}
                />
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={receiptFilter.start}
                  onChange={(e) => setReceiptFilter((prev) => ({ ...prev, start: e.target.value }))}
                />
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={receiptFilter.end}
                  onChange={(e) => setReceiptFilter((prev) => ({ ...prev, end: e.target.value }))}
                />
                <button onClick={loadReceipts} className="px-3 py-1 rounded bg-slate-900 text-white">Refresh</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-left p-2">FG</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="text-left p-2">Backflush</th>
                    <th className="text-left p-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptsLoading && (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                  )}
                  {!receiptsLoading && receipts.length === 0 && (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-400">Belum ada receipt.</td></tr>
                  )}
                  {!receiptsLoading && receipts.map((row) => (
                    <tr key={`receipt-${row.id}`} className="border-t">
                      <td className="p-2">{formatDateLabel(row.receipt_date)}</td>
                      <td className="p-2">{row.vendor_name || row.vendor_id}</td>
                      <td className="p-2">{row.product_code} - {row.product_name}</td>
                      <td className="p-2">{formatNumber(row.qty)}</td>
                      <td className="p-2">{formatNumber(row.total_backflush || 0)}</td>
                      <td className="p-2">{row.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loadDoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="text-sm font-semibold">Ambil dari DO Subcon</div>
              <button onClick={() => setLoadDoOpen(false)} className="text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-4 border-b bg-slate-50">
              <div className="flex flex-wrap gap-2 text-xs">
                <input
                  className="border rounded px-2 py-1"
                  list="subcon-vendor-options"
                  placeholder="Filter Vendor"
                  value={loadDoVendor}
                  onChange={(e) => setLoadDoVendor(e.target.value)}
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Cari SJ/Vendor/Item"
                  value={loadDoSearch}
                  onChange={(e) => setLoadDoSearch(e.target.value)}
                />
                <button onClick={loadOpenDeliveries} className="px-3 py-1 rounded bg-slate-900 text-white">Refresh</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2">No. SJ</th>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">Item RM</th>
                    <th className="text-left p-2">Qty Kirim</th>
                    <th className="text-left p-2">Sisa DO</th>
                    <th className="text-left p-2">FG Suggest</th>
                    <th className="text-left p-2">Max FG</th>
                    <th className="text-left p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadDoLoading && (
                    <tr><td colSpan="10" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                  )}
                  {!loadDoLoading && filteredLoadDoRows.length === 0 && (
                    <tr><td colSpan="10" className="p-4 text-center text-slate-400">Tidak ada DO terbuka.</td></tr>
                  )}
                  {!loadDoLoading && filteredLoadDoRows.map((row) => (
                    <tr key={`do-${row.id}`} className="border-t">
                      <td className="p-2">{row.sj_number || '-'}</td>
                      <td className="p-2">{row.vendor_name || row.vendor_id}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(row.status)}`}>
                          {String(row.status || 'OPEN').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{formatDateLabel(row.delivery_date)}</td>
                      <td className="p-2">{row.item_code} - {row.item_name}</td>
                      <td className="p-2">{formatNumber(row.qty)}</td>
                      <td className="p-2">{formatNumber(row.remaining_qty)}</td>
                      <td className="p-2">{row.suggested_product_code ? `${row.suggested_product_code}` : '-'}</td>
                      <td className="p-2">{formatNumber(row.max_fg_qty || 0)}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            const suggestedType = String(row.suggested_product_type || '').toLowerCase();
                            const suggestion = row.suggested_product_code && suggestedType.includes('finished')
                              ? {
                                code: row.suggested_product_code,
                                name: row.suggested_product_name,
                                unit: row.suggested_product_unit,
                                usagePerUnit: Number(row.usage_per_unit || 0),
                              }
                              : null;
                            setSelectedDo(row);
                            setSelectedSuggestion(suggestion);
                            setReceiptForm((prev) => ({
                              ...prev,
                              vendorId: row.vendor_id,
                              productCode: suggestion?.code || '',
                              qty: suggestion?.usagePerUnit
                                ? Math.floor(Number(row.remaining_qty || 0) / Number(suggestion.usagePerUnit || 1))
                                : '',
                              reference: row.sj_number || prev.reference,
                            }));
                            setLoadDoOpen(false);
                          }}
                          className="px-2 py-1 rounded border text-[10px] hover:bg-slate-50"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subconTab === 'stock-card' && (
        !canViewReport ? (
          <div className="bg-white rounded-xl border p-6 text-sm text-slate-500">
            Anda tidak memiliki akses untuk melihat laporan Subcon.
          </div>
        ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-semibold">Input Stock Opname</div>
              {!showStockForm && (
                <button
                  type="button"
                  onClick={() => setShowStockForm(true)}
                  className="px-2.5 py-1 rounded border text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Input
                </button>
              )}
            </div>
            {showStockForm && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-3">
                  <input
                    className="border rounded px-3 py-2"
                    list="subcon-vendor-options"
                    placeholder="Vendor Subcon (id/nama)"
                    value={opnameForm.vendorId}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, vendorId: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2"
                    list="subcon-opname-options"
                    placeholder="Item RM (kode/nama)"
                    value={opnameForm.itemCode}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, itemCode: e.target.value }))}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded px-3 py-2"
                    placeholder="Actual Qty"
                    value={opnameForm.actualQty}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, actualQty: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="border rounded px-3 py-2"
                    value={opnameForm.date}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Notes"
                    value={opnameForm.notes}
                    onChange={(e) => setOpnameForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <datalist id="subcon-opname-options">
                  {(rawItems.length ? rawItems : masterItems).map((item) => (
                    <option key={`op-${item.code}`} value={item.code}>{item.name}</option>
                  ))}
                </datalist>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={handleSaveOpname}
                    disabled={opnameSaving}
                    className="px-3 py-1.5 rounded bg-slate-900 text-white disabled:opacity-70"
                  >
                    {opnameSaving ? 'Menyimpan...' : 'Simpan Opname'}
                  </button>
                  <button
                    onClick={() => setOpnameForm({ vendorId: '', itemCode: '', actualQty: '', date: today, notes: '' })}
                    className="px-3 py-1.5 rounded border"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStockForm(false)}
                    className="px-3 py-1.5 rounded border"
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm font-semibold">Kartu Stok Detail (Subcon)</div>
              <button
                type="button"
                onClick={loadStockLedger}
                className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs"
                disabled={!ledgerFilter.vendorId || !ledgerFilter.itemCode || ledgerLoading}
              >
                {ledgerLoading ? 'Memuat...' : 'Load'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] gap-2 text-xs items-end">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Vendor</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  list="subcon-vendor-options"
                  placeholder="Vendor Subcon (id/nama)"
                  value={ledgerFilter.vendorId}
                  onChange={(e) => setLedgerFilter((prev) => ({ ...prev, vendorId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Item RM</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  list="subcon-ledger-items"
                  placeholder="Item RM (kode/nama)"
                  value={ledgerFilter.itemCode}
                  onChange={(e) => setLedgerFilter((prev) => ({ ...prev, itemCode: e.target.value }))}
                />
                <datalist id="subcon-ledger-items">
                  {(rawItems.length ? rawItems : masterItems).map((item) => (
                    <option key={`ledger-${item.code}`} value={item.code}>{item.name}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={ledgerFilter.start}
                  onChange={(e) => setLedgerFilter((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={ledgerFilter.end}
                  onChange={(e) => setLedgerFilter((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>

            {ledgerError && (
              <div className="mt-2 text-xs text-red-600">{ledgerError}</div>
            )}

            {ledgerHeader && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                <div className="border rounded p-3">
                  <div className="text-[10px] uppercase text-slate-400">Vendor</div>
                  <div className="font-semibold">{ledgerHeader.vendor_name || ledgerHeader.vendor_id}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-[10px] uppercase text-slate-400">Item</div>
                  <div className="font-semibold">{ledgerHeader.item_name || ledgerHeader.item_code}</div>
                  <div className="text-[10px] text-slate-500">{ledgerHeader.item_code}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-[10px] uppercase text-slate-400">UoM</div>
                  <div className="font-semibold">{ledgerHeader.unit || '-'}</div>
                </div>
              </div>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2 border">Date</th>
                    <th className="text-left p-2 border">Doc Ref</th>
                    <th className="text-left p-2 border">Reason</th>
                    <th className="text-right p-2 border">In</th>
                    <th className="text-right p-2 border">Out</th>
                    <th className="text-right p-2 border">Balance</th>
                    <th className="text-left p-2 border">User</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading && (
                    <tr><td colSpan="7" className="p-3 text-center text-slate-400">Memuat...</td></tr>
                  )}
                  {!ledgerLoading && ledgerRows.length === 0 && (
                    <tr><td colSpan="7" className="p-3 text-center text-slate-400">Belum ada transaksi.</td></tr>
                  )}
                  {!ledgerLoading && ledgerRows.map((row) => (
                    <tr key={`ledger-${row.id}`} className="border-t">
                      <td className="p-2 border">{row.date ? new Date(row.date).toLocaleString('id-ID') : '-'}</td>
                      <td className="p-2 border">{row.reference_doc || '-'}</td>
                      <td className="p-2 border">{row.reason || row.direction || '-'}</td>
                      <td className="p-2 border text-right">{formatNumber(row.qty_in || 0)}</td>
                      <td className="p-2 border text-right">{formatNumber(row.qty_out || 0)}</td>
                      <td className="p-2 border text-right">{formatNumber(row.balance || 0)}</td>
                      <td className="p-2 border">{row.username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm font-semibold">Subcon Stock Card</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <input
                  className="border rounded px-2 py-1"
                  list="subcon-vendor-options"
                  placeholder="Filter Vendor"
                  value={stockFilterVendor}
                  onChange={(e) => setStockFilterVendor(e.target.value)}
                />
                <button onClick={loadStockCard} className="px-3 py-1 rounded bg-slate-900 text-white">Refresh</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-left p-2">Item RM</th>
                    <th className="text-left p-2">Dikirim</th>
                    <th className="text-left p-2">Sudah Jadi FG</th>
                    <th className="text-left p-2">Sisa Buku</th>
                    <th className="text-left p-2">Stok Opname</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLoading && (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-400">Memuat...</td></tr>
                  )}
                  {!stockLoading && stockRows.length === 0 && (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-400">Belum ada data.</td></tr>
                  )}
                  {!stockLoading && stockRows.map((row, idx) => (
                    <tr key={`stock-${row.vendor_id}-${row.item_code}-${idx}`} className="border-t">
                      <td className="p-2">{row.vendor_name || row.vendor_id}</td>
                      <td className="p-2">{row.item_code} - {row.item_name}</td>
                      <td className="p-2">{formatNumber(row.delivered_qty)}</td>
                      <td className="p-2">{formatNumber(row.backflush_qty)}</td>
                      <td className="p-2">{formatNumber(row.book_qty)}</td>
                      <td className="p-2">{formatNumber(row.actual_qty || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {printOpen && activePrintRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none kanban-print-page">
            <div className="p-4 border-b flex justify-between items-center print:hidden">
              <div className="text-sm font-semibold">Surat Jalan Subcon</div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border rounded">Print</button>
                <button onClick={() => { setPrintOpen(false); setPrintDelivery(null); }} className="text-slate-500"><X size={18} /></button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0 kanban-print-scroll">
              <div className="space-y-6">
                <div className="kanban-page border border-slate-200 p-6 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={logoPrl} alt="Logo" className="h-12 w-auto" />
                      <div>
                        <div className="text-sm font-bold text-slate-900">PT MATRA LOGISTIK</div>
                        <div className="text-[10px] text-slate-500">Master Schedule &amp; Kanban System</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">SURAT JALAN SUBCON (DELIVERY ORDER)</div>
                      <div className="mt-1">No. {activePrintRow.sj_number || '-'}</div>
                      <div>Tanggal: {formatDateLabel(activePrintRow.delivery_date)}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Tujuan</div>
                      <div className="font-semibold">{printVendorName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Referensi</div>
                      <div className="font-semibold">{activePrintRow.reference || '-'}</div>
                    </div>
                  </div>
                  <table className="min-w-full mt-4 text-[11px] border border-slate-200">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left p-2 border-b">No</th>
                        <th className="text-left p-2 border-b">Kode Barang (RM)</th>
                        <th className="text-left p-2 border-b">Nama Barang</th>
                        <th className="text-left p-2 border-b">Qty Kirim</th>
                        <th className="text-left p-2 border-b">Satuan</th>
                        <th className="text-left p-2 border-b">Peruntukan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2">1</td>
                        <td className="p-2">{activePrintRow.item_code}</td>
                        <td className="p-2">{printItemName}</td>
                        <td className="p-2">{formatNumber(activePrintRow.qty)}</td>
                        <td className="p-2">{printUnit}</td>
                        <td className="p-2">{activePrintRow.notes || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-8 grid grid-cols-3 gap-4 text-center text-[10px]">
                    <div className="border border-slate-200 p-3 h-24 flex flex-col justify-between">
                      <div className="font-semibold">Pengirim / Gudang</div>
                      <div className="text-slate-400">Tanda Tangan</div>
                    </div>
                    <div className="border border-slate-200 p-3 h-24 flex flex-col justify-between">
                      <div className="font-semibold">Supir / Ekspedisi</div>
                      <div className="text-slate-400">Tanda Tangan</div>
                    </div>
                    <div className="border border-slate-200 p-3 h-24 flex flex-col justify-between">
                      <div className="font-semibold">Penerima / Subcon</div>
                      <div className="text-slate-400">Tanda Tangan</div>
                    </div>
                  </div>
                </div>

                <div className="kanban-page border border-slate-200 p-6 text-xs">
                  <div className="text-center text-sm font-bold text-slate-900">MATERIAL TAG (SUBCON)</div>
                  <div className="mt-2 text-center text-[10px] text-slate-500">Vendor: {printVendorName}</div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {printCards.map((card) => (
                      <div key={card.id} className="border border-slate-300 p-3 text-[11px]">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Card {card.seq} / {card.total}</span>
                          <span>Qty/Box: {printPackQty > 0 ? formatNumber(printPackQty) : '-'}</span>
                        </div>
                        <div className="mt-2 font-semibold">{card.partNo}</div>
                        <div className="text-[10px] text-slate-600">{card.itemName}</div>
                        <div className="mt-2 text-[10px]">Qty Tag: {formatNumber(card.cardQty)}</div>
                        <div className="mt-3 flex items-center gap-3">
                          <QRCodeCanvas value={card.qrValue} size={72} />
                          <div className="text-[10px]">
                            <div className="font-semibold">QR Data</div>
                            <div>{card.qrValue}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {printCards.length === 0 && (
                      <div className="col-span-2 text-center text-slate-400">Tidak ada kartu.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabSubcon;
