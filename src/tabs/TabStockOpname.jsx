import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, FileSpreadsheet, Play, Printer, Sparkles, Upload } from 'lucide-react';
import logoPrl from '../assets/kop-mrp.png';

const buildDefaultPeriod = () => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = months[now.getMonth()] || 'Jan';
  return `${label}-${now.getFullYear()}`;
};

const normalizeStockOpnameMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['scan', 'scan_lot', 'scan-lot', 'lot'].includes(normalized)) return 'scan_lot';
  if (['fallback', 'manual', 'fallback_count'].includes(normalized)) return 'fallback';
  return 'blind_count';
};

const getStockOpnameModeLabel = (value) => {
  const mode = normalizeStockOpnameMode(value);
  if (mode === 'scan_lot') return 'Scan Lot';
  if (mode === 'fallback') return 'Fallback';
  return 'Blind Count';
};

const getStockOpnameStatusLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const TabStockOpname = (props) => {
  const {
    apiFetch,
    ensureXlsx,
    formatNumber0,
    formatRupiah,
    masterLocations = [],
    masterWarehouses = [],
    ensureAiConfigured,
    canUseAI,
    showToastMessage,
  } = props;

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [periodInput, setPeriodInput] = useState(buildDefaultPeriod());
  const [sessionModeInput, setSessionModeInput] = useState('blind_count');
  const [sessionLocationId, setSessionLocationId] = useState('');
  const [stockOpnameOpenSession, setStockOpnameOpenSession] = useState(null);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [showSystemQty, setShowSystemQty] = useState(true);
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printMode, setPrintMode] = useState('report');
  const [blankoScope, setBlankoScope] = useState('warehouse');
  const [blankoTarget, setBlankoTarget] = useState('');
  const [tallyScope, setTallyScope] = useState('warehouse');
  const [tallyTarget, setTallyTarget] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const normalizeValue = (value) => String(value ?? '').trim().toLowerCase();
  const getProcessLocationTypeLabel = (location) => {
    const raw = String(location?.line_description || location?.lineDescription || '').trim();
    if (/production\s*line/i.test(raw)) return 'Production Line';
    if (/work\s*center/i.test(raw)) return 'Work Center';
    return raw;
  };
  const isProcessLocation = (location) => {
    const typeLabel = getProcessLocationTypeLabel(location);
    return typeLabel === 'Production Line' || typeLabel === 'Work Center';
  };
  const getProcessLocationLabel = (location) => {
    if (!location) return '-';
    const typeLabel = getProcessLocationTypeLabel(location);
    const laneLabel = String(location.fifo_lane || location.fifoLane || '').trim();
    const labelParts = [location.id, typeLabel, laneLabel].filter(Boolean);
    return labelParts.join(' - ');
  };
  const getWarehouseLocationTypeLabel = (location) => {
    const raw = String(
      location?.line_description
      || location?.lineDescription
      || location?.type
      || location?.category
      || '',
    ).trim();
    if (/warehouse/i.test(raw)) return 'Warehouse';
    return raw;
  };
  const getLocationTargetLabel = (location) => {
    if (!location) return '-';
    const parts = [location.id, getProcessLocationTypeLabel(location), location.fifo_lane || location.machine_note || ''].filter(Boolean);
    return parts.join(' - ');
  };
  const getSessionLocationLabel = (location) => {
    if (!location) return '-';
    const locationId = String(location.id || '').trim();
    const locationName = String(location.name || location.location_name || location.line_description || location.lineDescription || '').trim();
    return [locationId, locationName].filter(Boolean).join(' - ');
  };
  const getSessionPeriodLabel = (session) => String(session?.opnamePeriod || session?.period || '').trim();
  const masterLocationById = useMemo(() => {
    const map = new Map();
    (masterLocations || []).forEach((location) => {
      const key = normalizeValue(location.id);
      if (key) map.set(key, location);
    });
    return map;
  }, [masterLocations]);
  useEffect(() => {
    if (sessionLocationId) return;
    const firstLocation = (masterLocations || [])[0];
    if (firstLocation?.id) {
      setSessionLocationId(String(firstLocation.id));
    }
  }, [masterLocations, sessionLocationId]);
  const matchAnyValue = (sourceValue, candidates = []) => {
    const normalizedSource = normalizeValue(sourceValue);
    if (!normalizedSource) return false;
    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeValue(candidate);
      return normalizedCandidate && normalizedCandidate === normalizedSource;
    });
  };
  const resolveRowLocation = (row) => {
    const byId = masterLocationById.get(normalizeValue(row.locationId));
    if (byId) return byId;
    return (masterLocations || []).find((location) => {
      const candidates = [
        location.id,
        location.line_description,
        location.lineDescription,
        location.category,
      ];
      return matchAnyValue(row.locationId, candidates)
        || matchAnyValue(row.locationName, candidates);
    }) || null;
  };
  const resolveRowProcessLocation = (row) => {
    const rowValue = row.lineProduction || row.locationName || row.locationId || '';
    return (masterLocations || []).find((location) => {
      if (!isProcessLocation(location)) return false;
      const candidates = [
        location.id,
        location.line_description,
        location.lineDescription,
        location.fifo_lane,
        location.fifoLane,
      ];
      const normalizedRowValue = normalizeValue(rowValue);
      return candidates
        .map((candidate) => normalizeValue(candidate))
        .filter(Boolean)
        .some((candidate) => normalizedRowValue.includes(candidate));
    }) || null;
  };
  const buildTargetOptions = (scope) => {
    if (scope === 'wip') {
      return (masterLocations || [])
        .filter(isProcessLocation)
        .map((location) => {
          const typeLabel = getProcessLocationTypeLabel(location);
          return {
            value: `location:${location.id}`,
            label: getProcessLocationLabel(location),
            type: typeLabel,
            source: location,
          };
        });
    }

    const warehouseOptions = (masterWarehouses || []).map((warehouse) => ({
      value: `warehouse:${warehouse.id}`,
      label: `Warehouse - ${warehouse.id} - ${warehouse.name}`,
      type: 'Warehouse',
      source: warehouse,
    }));
    const locationOptions = (masterLocations || [])
      .filter((location) => getWarehouseLocationTypeLabel(location) === 'Warehouse')
      .map((location) => ({
        value: `location:${location.id}`,
        label: `Location - ${getLocationTargetLabel(location)}`,
        type: 'Warehouse',
        source: location,
      }));
    return [...warehouseOptions, ...locationOptions];
  };
  const filterRowsByTarget = (rowsSource, scope, targetValue) => {
    if (!targetValue) return rowsSource;
    const selectedValue = String(targetValue || '').trim();
    if (!selectedValue) return rowsSource;
    if (selectedValue.startsWith('warehouse:')) {
      const warehouseId = selectedValue.replace('warehouse:', '');
      return rowsSource.filter((row) => {
        const directLocation = resolveRowLocation(row);
        if (matchAnyValue(row.locationId, [warehouseId])) return true;
        if (matchAnyValue(row.locationName, [warehouseId])) return true;
        if (directLocation && matchAnyValue(directLocation.warehouse_id, [warehouseId])) return true;
        return false;
      });
    }
    if (scope === 'wip') {
      const locationId = selectedValue.replace('location:', '');
      const selectedLocation = masterLocationById.get(normalizeValue(locationId));
      if (!selectedLocation) return rowsSource;
      const selectedLabel = getProcessLocationLabel(selectedLocation);
      return rowsSource.filter((row) => {
        const rowValue = normalizeValue(row.lineProduction || row.locationName || row.locationId || '');
        const signatures = [
          selectedLocation.id,
          selectedLocation.line_description,
          selectedLocation.lineDescription,
          selectedLocation.fifo_lane,
          selectedLocation.fifoLane,
          selectedLabel,
        ]
          .map((item) => normalizeValue(item))
          .filter(Boolean);
        return signatures.some((signature) => rowValue.includes(signature));
      });
    }
    const locationId = selectedValue.replace('location:', '');
    const selectedLocation = masterLocationById.get(normalizeValue(locationId));
    return rowsSource.filter((row) => {
      if (matchAnyValue(row.locationId, [locationId])) return true;
      if (matchAnyValue(row.locationName, [locationId])) return true;
      if (!selectedLocation) return false;
      if (selectedLocation.warehouse_id && resolveRowLocation(row)?.warehouse_id === selectedLocation.warehouse_id) {
        return true;
      }
      return false;
    });
  };
  const blankoTargetOptions = useMemo(() => buildTargetOptions(blankoScope), [blankoScope, masterLocations, masterWarehouses]);
  const selectedBlankoTarget = useMemo(
    () => blankoTargetOptions.find((option) => option.value === blankoTarget) || null,
    [blankoTargetOptions, blankoTarget],
  );
  const tallyTargetOptions = useMemo(() => buildTargetOptions(tallyScope), [tallyScope, masterLocations, masterWarehouses]);
  const selectedTallyTarget = useMemo(
    () => tallyTargetOptions.find((option) => option.value === tallyTarget) || null,
    [tallyTargetOptions, tallyTarget],
  );
  const printTitle = printMode === 'blanko' ? 'BLANKO STOCK OPNAME' : 'LAPORAN HITUNGAN FISIK';
  const printScopeLabel = printMode === 'blanko'
    ? (blankoScope === 'wip' ? 'SO WIP' : 'SO Gudang')
    : '';
  const printTargetLabel = printMode === 'blanko' ? (selectedBlankoTarget?.label || '') : '';

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionError('');
    try {
      const data = await apiFetch('/api/stock-opname/sessions');
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      setSessionError(error.message || 'Gagal memuat session.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal memuat session.');
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadOpenSession = async () => {
    try {
      const data = await apiFetch('/api/stock-opname/sessions/open');
      setStockOpnameOpenSession(data || null);
    } catch (error) {
      setStockOpnameOpenSession(null);
    }
  };

  const loadItems = async (sessionId) => {
    if (!sessionId) return;
    setItemsLoading(true);
    setItemsError('');
    try {
      const data = await apiFetch(`/api/stock-opname/sessions/${sessionId}/lines`);
      const mapped = (Array.isArray(data) ? data : []).map((row) => ({
        id: row.id,
        itemCode: row.item_code,
        itemName: row.item_name || row.itemName || '',
        partNo: row.part_no || '-',
        locationName: row.location_name || row.locationName || row.line_production || row.lineProduction || row.location_id || row.locationId || '',
        locationId: row.location_id || '',
        lineProduction: row.line_production || row.lineProduction || '',
        unit: row.unit || '',
        snp: Number(row.snapshot_qty ?? row.snapshotQty ?? row.snp ?? 0),
        price: Number(row.price || 0),
        bookQty: Number(row.snapshot_qty ?? row.snapshotQty ?? row.book_qty ?? row.bookQty ?? 0),
        inputBox: Number(row.input_box || row.inputBox || 0),
        inputLoose: Number(row.input_loose || row.inputLoose || 0),
        countedQty: Number(row.counted_qty ?? row.countedQty ?? 0),
        lotNo: row.lot_no || row.lotNo || '',
        scanMode: row.scan_mode || row.scanMode || '',
        scanSource: row.scan_source || row.scanSource || '',
        scanValue: row.scan_value || row.scanValue || '',
        reason: row.remarks || row.reason || '',
        hidden: false,
      }));
      setRows(mapped);
    } catch (error) {
      setRows([]);
      setItemsError(error.message || 'Gagal memuat item.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal memuat item.');
      }
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadOpenSession();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setRows([]);
      return;
    }
    const session = sessions.find((item) => item.id === selectedSessionId) || null;
    setSelectedSession(session);
    loadItems(selectedSessionId);
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (selectedSessionId) return;
    if (stockOpnameOpenSession?.id) {
      setSelectedSessionId(stockOpnameOpenSession.id);
      return;
    }
    if (sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, stockOpnameOpenSession?.id, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) return;
    setSessionModeInput(normalizeStockOpnameMode(selectedSession.mode));
    if (selectedSession.locationId) {
      setSessionLocationId(String(selectedSession.locationId));
    }
  }, [selectedSession]);

  const sessionMode = normalizeStockOpnameMode(selectedSession?.mode || sessionModeInput);
  const isScanLotMode = sessionMode === 'scan_lot';

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    const handleAfterPrint = () => {
      body.classList.remove('stockopname-print-active');
      document.getElementById('stockopname-print-page-style')?.remove();
    };
    if (showPrint) {
      body.classList.add('stockopname-print-active');
    } else {
      body.classList.remove('stockopname-print-active');
      document.getElementById('stockopname-print-page-style')?.remove();
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      body.classList.remove('stockopname-print-active');
      document.getElementById('stockopname-print-page-style')?.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [showPrint]);

  const visibleRows = useMemo(() => rows.filter((row) => !row.hidden), [rows]);

  const computedRows = useMemo(() => visibleRows.map((row) => {
    const snpValue = Number(row.snp || 0);
    const inputBox = Number(row.inputBox || 0);
    const inputLoose = Number(row.inputLoose || 0);
    const countedQty = Number.isFinite(Number(row.countedQty)) ? Number(row.countedQty) : 0;
    const actualQty = sessionMode === 'scan_lot'
      ? countedQty
      : inputBox * snpValue + inputLoose;
    const snapshotQty = Number(row.bookQty || 0);
    const difference = actualQty - snapshotQty;
    return { ...row, countedQty: actualQty, actualQty, snapshotQty, difference };
  }), [visibleRows, sessionMode]);

  const rowValidationMap = useMemo(() => {
    const map = new Map();
    computedRows.forEach((row) => {
      const issues = [];
      const lotNo = String(row.lotNo || '').trim();
      const countedQty = Number(row.countedQty);
      const inputBox = Number(row.inputBox || 0);
      const inputLoose = Number(row.inputLoose || 0);
      const reason = String(row.reason || '').trim();

      if (isScanLotMode) {
        if (!lotNo) issues.push('Lot No wajib diisi');
        if (!Number.isFinite(countedQty) || countedQty < 0) issues.push('Qty fisik tidak valid');
      } else {
        if (!Number.isFinite(inputBox) || inputBox < 0) issues.push('KBN/Box tidak valid');
        if (!Number.isFinite(inputLoose) || inputLoose < 0) issues.push('Remain tidak valid');
      }

      if (row.difference !== 0 && !reason) {
        issues.push('Reason wajib diisi saat ada selisih');
      }

      map.set(row.id, issues);
    });
    return map;
  }, [computedRows, isScanLotMode]);

  const hasRowValidationIssues = useMemo(
    () => Array.from(rowValidationMap.values()).some((issues) => Array.isArray(issues) && issues.length > 0),
    [rowValidationMap],
  );

  const varianceCount = useMemo(
    () => computedRows.filter((row) => row.difference !== 0).length,
    [computedRows],
  );

  const totalDiffValue = useMemo(() => {
    return computedRows.reduce((sum, row) => {
      if (!row.price) return sum;
      return sum + row.difference * Number(row.price || 0);
    }, 0);
  }, [computedRows]);
  const totalActualQty = useMemo(
    () => computedRows.reduce((sum, row) => sum + Number(row.actualQty || 0), 0),
    [computedRows],
  );
  const totalDiffQty = useMemo(
    () => computedRows.reduce((sum, row) => sum + Number(row.difference || 0), 0),
    [computedRows],
  );
  const blankoRows = useMemo(
    () => filterRowsByTarget(computedRows, blankoScope, selectedBlankoTarget?.value),
    [computedRows, blankoScope, selectedBlankoTarget, masterLocationById],
  );
  const tallyRows = useMemo(
    () => filterRowsByTarget(computedRows, tallyScope, selectedTallyTarget?.value),
    [computedRows, tallyScope, selectedTallyTarget, masterLocationById],
  );
  const tallyVarianceCount = useMemo(
    () => tallyRows.filter((row) => row.difference !== 0).length,
    [tallyRows],
  );
  const tallyTotalDiffValue = useMemo(
    () => tallyRows.reduce((sum, row) => {
      if (!row.price) return sum;
      return sum + row.difference * Number(row.price || 0);
    }, 0),
    [tallyRows],
  );
  const filteredBlankoRows = printMode === 'blanko' ? blankoRows : computedRows;
  const blankoSectionRows = useMemo(() => {
    if (printMode !== 'blanko') return [];
    const grouped = new Map();
    filteredBlankoRows.forEach((row) => {
      const resolvedLocation = resolveRowLocation(row);
      const resolvedProcessLocation = resolveRowProcessLocation(row);
      let groupLabel = '';
      if (blankoScope === 'wip') {
        groupLabel = resolvedProcessLocation
          ? `WIP - ${getLocationTargetLabel(resolvedProcessLocation)}`
          : `WIP - ${row.lineProduction || row.locationName || row.locationId || 'Unassigned'}`;
      } else {
        groupLabel = resolvedLocation
          ? `${getWarehouseLocationTypeLabel(resolvedLocation)} - ${getLocationTargetLabel(resolvedLocation)}`
          : row.locationName || row.locationId || selectedBlankoTarget?.label || 'Warehouse';
      }
      const key = normalizeValue(groupLabel) || 'default';
      if (!grouped.has(key)) {
        grouped.set(key, { label: groupLabel, rows: [] });
      }
      grouped.get(key).rows.push(row);
    });
    return Array.from(grouped.values()).sort((left, right) => left.label.localeCompare(right.label, 'id'));
  }, [printMode, filteredBlankoRows, blankoScope, selectedBlankoTarget, masterLocationById]);

  const handleStartSession = async () => {
    const period = String(periodInput || '').trim();
    const locationId = String(sessionLocationId || '').trim();
    if (!period) {
      setSessionError('Period wajib diisi.');
      return;
    }
    if (!locationId) {
      setSessionError('Location wajib dipilih.');
      return;
    }
    setSessionError('');
    try {
      const selectedLocation = (masterLocations || []).find((location) => String(location.id || '').trim() === locationId) || null;
      const result = await apiFetch('/api/stock-opname/sessions', {
        method: 'POST',
        body: JSON.stringify({
          period,
          locationId,
          locationName: selectedLocation?.name || selectedLocation?.location_name || '',
          mode: sessionModeInput,
        }),
      });
      await loadSessions();
      await loadOpenSession();
      setSelectedSessionId(result?.id || null);
    } catch (error) {
      setSessionError(error.message || 'Gagal start session.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal start session.');
      }
    }
  };

  const handleUploadBatch = async () => {
    if (!selectedSessionId) return;
    if (uploading) return;
    if (computedRows.length === 0) {
      setItemsError('Tidak ada item untuk diupload.');
      if (showToastMessage) {
        showToastMessage('Tidak ada item untuk diupload.');
      }
      return;
    }
    const invalidRow = computedRows.find((row) => (rowValidationMap.get(row.id) || []).length > 0);
    if (invalidRow) {
      const firstIssue = rowValidationMap.get(invalidRow.id)?.[0] || 'Data baris belum valid.';
      setItemsError(`Item ${invalidRow.itemCode}: ${firstIssue}.`);
      if (showToastMessage) {
        showToastMessage(`Item ${invalidRow.itemCode}: ${firstIssue}.`);
      }
      return;
    }
    setUploading(true);
    setItemsError('');
    try {
      const payload = computedRows.map((row) => ({
        itemCode: row.itemCode,
        itemName: row.itemName || '',
        partNo: row.partNo || '',
        unit: row.unit || '',
        locationId: row.locationId || selectedSession?.locationId || '',
        locationName: row.locationName || selectedSession?.locationName || '',
        lotNo: sessionMode === 'scan_lot' ? String(row.lotNo || '').trim() : '',
        batchId: row.batchId || null,
        countedQty: sessionMode === 'scan_lot'
          ? Number(row.countedQty || row.actualQty || 0)
          : Number(row.actualQty || 0),
        snapshotQty: Number(row.snapshotQty ?? row.bookQty ?? 0),
        scanMode: sessionMode,
        scanSource: sessionMode === 'scan_lot' ? 'scan' : 'manual',
        scanValue: sessionMode === 'scan_lot' ? String(row.lotNo || '').trim() : '',
        qualityStatus: 'ok',
        reason: row.reason || '',
        remarks: row.reason || '',
      }));
      const result = await apiFetch(`/api/stock-opname/sessions/${selectedSessionId}/lines`, {
        method: 'POST',
        body: JSON.stringify({ items: payload, mode: sessionMode }),
      });
      await loadSessions();
      await loadOpenSession();
      await loadItems(selectedSessionId);
      alert(result?.ok ? 'Data stock opname tersimpan.' : 'Data stock opname tersimpan.');
    } catch (error) {
      setItemsError(error.message || 'Gagal upload SO.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal upload SO.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedSessionId) return;
    if (finalizing) return;
    if (hasRowValidationIssues) {
      setItemsError('Lengkapi validasi baris terlebih dahulu sebelum finalize.');
      if (showToastMessage) {
        showToastMessage('Lengkapi validasi baris terlebih dahulu sebelum finalize.');
      }
      return;
    }
    const ok = window.confirm('Finalize & Post? Stok akan disesuaikan.');
    if (!ok) return;
    setFinalizing(true);
    setItemsError('');
    try {
      await apiFetch(`/api/stock-opname/sessions/${selectedSessionId}/post`, { method: 'POST' });
      await loadSessions();
      await loadOpenSession();
      await loadItems(selectedSessionId);
      alert('Stock Opname POSTED.');
    } catch (error) {
      setItemsError(error.message || 'Gagal finalize SO.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal finalize SO.');
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleRowChange = (id, key, value) => {
    setRows((prev) => prev.map((row) => (
      row.id === id ? { ...row, [key]: value } : row
    )));
  };

  const normalizeAiList = (value) => {
    if (Array.isArray(value)) return value.filter((item) => String(item || '').trim());
    if (!value) return [];
    return [String(value)];
  };

  const handleAnalyzeVariance = async () => {
    if (!selectedSessionId || aiLoading) return;
    if (!canUseAI) {
      if (showToastMessage) {
        showToastMessage('Anda tidak memiliki akses AI.');
      }
      return;
    }
    const ready = await ensureAiConfigured?.();
    if (!ready) return;
    const varianceRows = computedRows.filter((row) => Number(row.difference || 0) !== 0);
    if (varianceRows.length === 0) {
      if (showToastMessage) {
        showToastMessage('Tidak ada selisih untuk dianalisis.');
      }
      return;
    }
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const payload = {
        pageKey: 'stock_opname_variance',
        title: `Stock Opname ${getSessionPeriodLabel(selectedSession) || ''}`,
        filters: {
          period: getSessionPeriodLabel(selectedSession) || '',
          status: selectedSession?.status || '',
          mode: selectedSession?.mode || sessionMode,
        },
        columns: [
          { key: 'itemCode', label: 'Kode Item' },
          { key: 'itemName', label: 'Nama Item' },
          { key: 'location', label: 'Lokasi Virtual' },
          { key: 'bookQty', label: 'Stok Sistem' },
          { key: 'snp', label: 'SNP' },
          { key: 'inputBox', label: 'Input KBN/Box' },
          { key: 'inputLoose', label: 'Input Eceran/Remain' },
          { key: 'lotNo', label: 'Lot No' },
          { key: 'countedQty', label: 'Qty Fisik' },
          { key: 'actualQty', label: 'Total Fisik' },
          { key: 'difference', label: 'Selisih' },
          { key: 'reason', label: 'Catatan' },
        ],
        rows: varianceRows.map((row) => ({
          itemCode: row.itemCode,
          itemName: row.itemName,
          location: row.locationName,
          bookQty: Number(row.bookQty || 0),
          snp: Number(row.snp || 0),
          inputBox: Number(row.inputBox || 0),
          inputLoose: Number(row.inputLoose || 0),
          lotNo: row.lotNo || '',
          countedQty: Number(row.countedQty || 0),
          actualQty: Number(row.actualQty || 0),
          difference: Number(row.difference || 0),
          reason: row.reason || '',
        })),
      };
      const data = await apiFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data?.error) throw new Error(data.error);
      setAiResult({
        anomalies: normalizeAiList(data?.anomalies),
        insights: normalizeAiList(data?.insights),
        actions: normalizeAiList(data?.actions),
      });
    } catch (error) {
      setAiError(error.message || 'Gagal menjalankan analisis AI.');
      if (showToastMessage) {
        showToastMessage(error.message || 'Gagal menjalankan analisis AI.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportBlankoExcel = async () => {
    const exportSourceRows = selectedBlankoTarget ? blankoRows : computedRows;
    if (!exportSourceRows.length) {
      setItemsError('Tidak ada item untuk diexport.');
      if (showToastMessage) {
        showToastMessage('Tidak ada item untuk diexport.');
      }
      return;
    }
    const XLSX = await ensureXlsx?.();
    if (!XLSX) return;
    const exportRows = selectedBlankoTarget
      ? exportSourceRows.map((row, index) => ({
        No: index + 1,
        'Kode Item': row.itemCode,
        'Nama Item': row.itemName || '',
        'Lokasi Virtual': row.locationName || '',
        'Kategori SO': printScopeLabel,
        Target: printTargetLabel,
        'SNP (Qty/KBN)': Number(row.snp || 0),
        'Input KBN/Box': '',
        'Input Eceran/Remain': '',
        'Lot No': '',
        'Qty Fisik': '',
        'Total Fisik': '',
        Selisih: '',
        Status: '',
        Catatan: '',
      }))
      : exportSourceRows.map((row, index) => isScanLotMode ? ({
        No: index + 1,
        'Kode Item': row.itemCode,
        'Nama Item': row.itemName || '',
        'Lokasi Virtual': row.locationName || '',
        'Stok Sistem': Number(row.bookQty || 0),
        'Lot No': row.lotNo || '',
        'Qty Fisik': Number(row.actualQty || 0),
        Selisih: Number(row.difference || 0),
        Status: row.difference === 0 ? 'Cocok' : 'Selisih',
        Catatan: row.reason || '',
      }) : ({
        No: index + 1,
        'Kode Item': row.itemCode,
        'Nama Item': row.itemName || '',
        'Lokasi Virtual': row.locationName || '',
        'Stok Sistem': Number(row.bookQty || 0),
        'SNP (Qty/KBN)': Number(row.snp || 0),
        'Input KBN/Box': Number(row.inputBox || 0),
        'Input Eceran/Remain': Number(row.inputLoose || 0),
        'Total Fisik': Number(row.actualQty || 0),
        Selisih: Number(row.difference || 0),
        Status: row.difference === 0 ? 'Cocok' : 'Selisih',
        Catatan: row.reason || '',
      }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedBlankoTarget ? 'Blanko SO' : (isScanLotMode ? 'Scan Lot' : 'Blind Count'));
    const periodTag = getSessionPeriodLabel(selectedSession) ? String(getSessionPeriodLabel(selectedSession)).replace(/\s+/g, '_') : 'SO';
    const dateTag = new Date().toISOString().split('T')[0];
    const scopeTag = selectedBlankoTarget ? normalizeValue(printScopeLabel).replace(/\s+/g, '_') : (isScanLotMode ? 'scan_lot' : 'blind_count');
    XLSX.writeFile(wb, `Stock_Opname_${scopeTag}_${periodTag}_${dateTag}.xlsx`);
  };

  const handlePrintCurrentView = () => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('stockopname-print-page-style')) {
      const pageStyle = document.createElement('style');
      pageStyle.id = 'stockopname-print-page-style';
      pageStyle.textContent = '@page { size: A4 portrait; margin: 8mm 10mm 42mm 10mm; }';
      document.head.appendChild(pageStyle);
    }
    document.body.classList.add('stockopname-print-active');
    window.requestAnimationFrame(() => window.print());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">Stock Opname</div>
          <div className="text-xs text-slate-500">Snapshot, tally, dan posting penyesuaian stok.</div>
        </div>
      </div>

      {stockOpnameOpenSession && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Stock Opname sedang OPEN ({getSessionPeriodLabel(stockOpnameOpenSession)}). Hindari input produksi/receiving sampai selesai.
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="text-sm font-semibold">Start Session</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Period</label>
            <input
              className="border p-2 rounded w-full text-sm"
              placeholder="Feb-2026"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Location</label>
            <select
              className="border p-2 rounded w-full text-sm bg-white"
              value={sessionLocationId}
              onChange={(e) => setSessionLocationId(e.target.value)}
            >
              <option value="">Pilih location</option>
              {(masterLocations || []).map((location) => (
                <option key={location.id} value={location.id}>
                  {getSessionLocationLabel(location)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Mode</label>
            <select
              className="border p-2 rounded w-full text-sm bg-white"
              value={sessionModeInput}
              onChange={(e) => setSessionModeInput(normalizeStockOpnameMode(e.target.value))}
            >
              <option value="blind_count">Blind Count</option>
              <option value="scan_lot">Scan Lot</option>
              <option value="fallback">Fallback</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleStartSession}
            className="px-4 py-2 bg-slate-900 text-white rounded text-xs flex items-center gap-2"
          >
            <Play size={14} /> Start Stock Opname
          </button>
        </div>
        <div className="text-[11px] text-slate-500">
          {sessionModeInput === 'scan_lot'
            ? 'Mode Scan Lot menuntut input Lot No dan Qty fisik per baris.'
            : 'Mode Blind Count fokus ke input KBN/Box + remain, lalu sistem hitung total fisik.'}
        </div>
        {sessionError && <div className="text-xs text-red-600">{sessionError}</div>}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">SO Sessions</div>
          <button
            type="button"
            onClick={loadSessions}
            className="px-3 py-1.5 text-xs border rounded"
          >
            Refresh
          </button>
        </div>
        {sessionsLoading && (
          <div className="text-xs text-slate-400">Memuat session...</div>
        )}
        {!sessionsLoading && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left p-2">Session</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Mode</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Items</th>
                  <th className="text-right p-2">Lines</th>
                  <th className="text-right p-2">Variance</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t">
                    <td className="p-2 font-semibold">{session.sessionNo || session.session_no || '-'}</td>
                    <td className="p-2">{session.locationName || session.location_name || '-'}</td>
                    <td className="p-2">{getStockOpnameModeLabel(session.mode)}</td>
                    <td className="p-2">{getStockOpnameStatusLabel(session.status)}</td>
                    <td className="p-2 text-right">{formatNumber0(session.itemCount || session.item_count || 0)}</td>
                    <td className="p-2 text-right">{formatNumber0(session.lineCount || session.line_count || 0)}</td>
                    <td className="p-2 text-right">{formatNumber0(session.varianceCount || session.variance_count || 0)}</td>
                    <td className="p-2">{session.createdAt || session.created_at ? new Date(session.createdAt || session.created_at).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="px-3 py-1.5 text-xs border rounded"
                      >
                        Pilih
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan="9" className="p-3 text-center text-slate-400">Belum ada session.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Tally Input</div>
            <div className="text-xs text-slate-500">
              {selectedSession ? `Session ${getSessionPeriodLabel(selectedSession)} (${getStockOpnameStatusLabel(selectedSession.status)}) - ${getStockOpnameModeLabel(selectedSession.mode)}` : 'Pilih session terlebih dahulu.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSystemQty((prev) => !prev)}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
            >
              {showSystemQty ? <EyeOff size={12} /> : <Eye size={12} />}
              {showSystemQty ? 'Hide Stok Sistem' : 'Show Stok Sistem'}
            </button>
            <button
              type="button"
              onClick={handleUploadBatch}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded flex items-center gap-2"
              disabled={!selectedSessionId || uploading || hasRowValidationIssues}
            >
              <Upload size={12} />
              {uploading ? 'Uploading...' : 'Upload Batch SO'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintMode('report');
                setShowPrint(true);
              }}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <Printer size={12} />
              Print Laporan
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintMode('blanko');
                setBlankoScope('warehouse');
                setBlankoTarget('');
                setShowPrint(true);
              }}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <Printer size={12} />
              Print Blanko
            </button>
            <button
              type="button"
              onClick={handleExportBlankoExcel}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0}
            >
              <FileSpreadsheet size={12} />
              Export Excel Blanko
            </button>
            <button
              type="button"
              onClick={handleAnalyzeVariance}
              className="px-3 py-1.5 text-xs border rounded flex items-center gap-2"
              disabled={!selectedSessionId || computedRows.length === 0 || aiLoading}
            >
              <Sparkles size={12} />
              {aiLoading ? 'Menganalisis...' : 'Analisis AI'}
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded flex items-center gap-2"
              disabled={!selectedSessionId || finalizing || hasRowValidationIssues}
            >
              <CheckCircle size={12} />
              {finalizing ? 'Posting...' : 'Finalize & Post'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_auto] gap-3 items-start lg:items-center">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Kategori SO</label>
              <select
                className="border rounded px-3 py-2 w-full h-10 text-xs bg-white"
                value={tallyScope}
                onChange={(e) => {
                  const nextScope = e.target.value;
                  setTallyScope(nextScope);
                  setTallyTarget('');
                }}
              >
                <option value="warehouse">SO Gudang</option>
                <option value="wip">SO WIP</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Target</label>
              <select
                className="border rounded px-3 py-2 w-full h-10 text-xs bg-white"
                value={tallyTarget}
                onChange={(e) => setTallyTarget(e.target.value)}
              >
                <option value="">Semua target</option>
                {tallyTargetOptions.length === 0 && (
                  <option value="" disabled>Data target belum tersedia</option>
                )}
                {tallyTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="mt-1 text-[10px] text-slate-500">
                {tallyScope === 'warehouse'
                  ? 'Filter tampilan item berdasarkan Warehouse / Location.'
                  : 'Filter tampilan item berdasarkan Production Line / Work Center.'}
              </div>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center lg:justify-end gap-2 self-center">
              <button
                type="button"
                onClick={() => {
                  setTallyScope('warehouse');
                  setTallyTarget('');
                }}
                className="px-3 py-2 h-10 text-xs border rounded bg-white whitespace-nowrap"
              >
                Reset Filter
              </button>
              <div className="px-3 py-2 h-10 flex items-center rounded border border-slate-200 bg-white text-[11px] text-slate-500 whitespace-nowrap">
                {tallyRows.length} / {computedRows.length} item tampil
              </div>
            </div>
          </div>
        </div>

        {itemsError && <div className="text-xs text-red-600">{itemsError}</div>}

        {hasRowValidationIssues && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Lengkapi Lot No / Qty fisik / Reason sesuai mode sebelum upload atau finalize.
          </div>
        )}

        {itemsLoading && <div className="text-xs text-slate-400">Memuat item...</div>}

        {!itemsLoading && selectedSessionId && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px] border">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left p-3 border">Kode Item</th>
                  <th className="text-left p-3 border w-[180px]">Lokasi Virtual (Proses)</th>
                  {showSystemQty && (
                    <th className="text-right p-3 border w-[130px]">Stok Sistem</th>
                  )}
                  {sessionMode === 'scan_lot' ? (
                    <>
                      <th className="text-left p-3 border w-[180px]">Lot No</th>
                      <th className="text-right p-3 border w-[130px]">Qty Fisik</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right p-3 border w-[120px]">SNP (Qty/KBN)</th>
                      <th className="text-right p-3 border w-[130px]">Input KBN / Box</th>
                      <th className="text-right p-3 border w-[150px]">Input Eceran / Remain</th>
                    </>
                  )}
                  <th className="text-right p-3 border w-[140px]">Total Fisik</th>
                  <th className="text-right p-3 border w-[130px]">Selisih</th>
                  <th className="text-center p-3 border w-[130px]">Status</th>
                  <th className="text-left p-3 border w-[180px]">Catatan</th>
                  <th className="text-center p-3 border w-[70px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {tallyRows.map((row) => {
                  const diff = row.difference;
                  const diffTone = diff === 0 ? '' : diff > 0 ? 'text-emerald-600' : 'text-rose-600';
                  const isDiff = diff !== 0;
                  const snpValue = Number(row.snp || 0);
                  const snpMissing = !Number.isFinite(snpValue) || snpValue <= 0;
                  const rowIssues = rowValidationMap.get(row.id) || [];
                  return (
                    <tr key={row.id} className={`border-t ${isDiff ? 'bg-rose-50' : ''}`}>
                      <td className="p-3 border">
                        <div className="font-semibold">{row.itemCode}</div>
                        <div className="text-[10px] text-slate-500">{row.itemName}</div>
                        <div className="text-[10px] text-slate-400">{row.partNo}</div>
                      </td>
                      <td className="p-3 border text-[11px] text-slate-600">
                        {row.locationName || '-'}
                      </td>
                      {showSystemQty && (
                        <td className="p-3 border text-right">{formatNumber0(row.bookQty)}</td>
                      )}
                      {sessionMode === 'scan_lot' ? (
                        <>
                          <td className="p-3 border">
                            <input
                              type="text"
                              className={`border rounded px-2 py-2 w-full text-[12px] ${rowIssues.some((issue) => issue.includes('Lot No')) ? 'border-amber-400 bg-amber-50' : ''}`}
                              value={row.lotNo}
                              onChange={(e) => handleRowChange(row.id, 'lotNo', e.target.value)}
                              placeholder="Scan / isi lot"
                            />
                            {rowIssues.some((issue) => issue.includes('Lot No')) && (
                              <div className="mt-1 text-[10px] text-amber-600">{rowIssues.find((issue) => issue.includes('Lot No'))}</div>
                            )}
                          </td>
                          <td className="p-3 border text-right">
                            <input
                              type="number"
                              className={`border rounded px-2 py-2 w-full text-right text-[12px] ${rowIssues.some((issue) => issue.includes('Qty fisik')) ? 'border-amber-400 bg-amber-50' : ''}`}
                              value={row.countedQty}
                              min={0}
                              onChange={(e) => handleRowChange(row.id, 'countedQty', Number(e.target.value || 0))}
                            />
                            {rowIssues.some((issue) => issue.includes('Qty fisik')) && (
                              <div className="mt-1 text-[10px] text-amber-600">{rowIssues.find((issue) => issue.includes('Qty fisik'))}</div>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 border text-right">
                            {formatNumber0(row.snp)}
                          </td>
                          <td className="p-3 border text-right">
                            <input
                              type="number"
                              className={`border rounded px-2 py-2 w-full text-right text-[12px] ${snpMissing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                              value={row.inputBox}
                              min={0}
                              disabled={snpMissing}
                              onChange={(e) => handleRowChange(row.id, 'inputBox', Number(e.target.value || 0))}
                            />
                            {snpMissing && (
                              <div className="mt-1 text-[10px] text-rose-500">Master SNP 0</div>
                            )}
                          </td>
                          <td className="p-3 border text-right">
                            <input
                              type="number"
                              className="border rounded px-2 py-2 w-full text-right text-[12px]"
                              value={row.inputLoose}
                              min={0}
                              onChange={(e) => handleRowChange(row.id, 'inputLoose', Number(e.target.value || 0))}
                            />
                          </td>
                        </>
                      )}
                      <td className="p-3 border text-right text-[13px] font-semibold">{formatNumber0(row.actualQty)}</td>
                      <td className={`p-3 border text-right text-[13px] font-semibold ${diffTone}`}>
                        {diff > 0 ? `+${formatNumber0(diff)}` : formatNumber0(diff)}
                      </td>
                      <td className="p-3 border text-center">
                        {diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                            <CheckCircle size={12} /> Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-semibold">
                            <AlertTriangle size={12} /> Selisih
                          </span>
                        )}
                      </td>
                          <td className="p-3 border">
                            <input
                              className={`border rounded px-2 py-2 w-full text-[11px] ${rowIssues.some((issue) => issue.includes('Reason wajib')) ? 'border-rose-400 bg-rose-50' : ''}`}
                              value={row.reason}
                              onChange={(e) => handleRowChange(row.id, 'reason', e.target.value)}
                              placeholder={isDiff ? 'Wajib isi reason' : ''}
                            />
                            {rowIssues.some((issue) => issue.includes('Reason wajib')) && (
                              <div className="mt-1 text-[10px] text-rose-600">{rowIssues.find((issue) => issue.includes('Reason wajib'))}</div>
                            )}
                          </td>
                      <td className="p-3 border text-center">
                        <button
                          type="button"
                          onClick={() => handleRowChange(row.id, 'hidden', true)}
                          className="px-2 py-1 text-[10px] border rounded"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tallyRows.length === 0 && (
                  <tr><td colSpan={sessionMode === 'scan_lot' ? (showSystemQty ? 10 : 9) : (showSystemQty ? 11 : 10)} className="p-3 text-center text-slate-400">Belum ada item.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!itemsLoading && !selectedSessionId && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
            Pilih session di atas agar item tally muncul.
          </div>
        )}

        {tallyRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">Variance: {tallyVarianceCount} item</div>
            {Math.abs(tallyTotalDiffValue) > 0 && (
              <div className="font-semibold">Total Value Selisih: {formatRupiah(tallyTotalDiffValue)}</div>
            )}
          </div>
        )}
      </div>

      {showPrint && (
        <div className="stockopname-print-scope fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:static print:bg-white print:p-0 print:items-start print:justify-start">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none">
            <div className="p-4 border-b flex justify-between items-center print:hidden">
              <div className="text-sm font-semibold">
                {printMode === 'blanko' ? 'Blanko Stock Opname' : 'Laporan Hitungan Fisik'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCurrentView}
                  className="px-3 py-1.5 text-xs border rounded disabled:opacity-50"
                  disabled={printMode === 'blanko' && !selectedBlankoTarget}
                >
                  Print / PDF
                </button>
                <button onClick={() => setShowPrint(false)} className="text-slate-500">Tutup</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0">
              <div className="bg-white p-4 text-black stockopname-print-sheet">
                <div className="hidden print:block mb-4">
                  <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3">
                        <img src={logoPrl} alt="Logo MRP" className="h-12 w-auto object-contain" />
                          <div>
                            <div className="text-lg font-bold tracking-wide text-slate-900">{printTitle}</div>
                            <div className="text-[11px] text-slate-600">Master Schedule &amp; Kanban System (MSK-S)</div>
                            <div className="mt-1 text-[11px] text-slate-600">
                              <span className="font-semibold">Mode:</span> {getStockOpnameModeLabel(selectedSession?.mode || sessionMode)}
                            </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            <span className="font-semibold">Period:</span> {getSessionPeriodLabel(selectedSession) || '-'}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            <span className="font-semibold">Status:</span> {selectedSession?.status || '-'}
                          </div>
                          {printMode === 'blanko' && (
                            <div className="mt-1 text-[11px] text-slate-700">
                              <span className="font-semibold">{printScopeLabel}</span>
                              {printTargetLabel ? ` - ${printTargetLabel}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 md:text-right">
                        <div>
                          <span className="font-semibold">Print Date:</span>{' '}
                          {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div>
                          <span className="font-semibold">Scope:</span>{' '}
                          {printMode === 'blanko' ? printScopeLabel : 'Laporan Hitungan Fisik'}
                        </div>
                        {printMode === 'blanko' && (
                          <div>
                            <span className="font-semibold">Target:</span> {printTargetLabel || '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between border-b pb-3 mb-3 print:hidden">
                  <div>
                  <div className="text-lg font-bold">{printTitle}</div>
                    <div className="text-xs text-slate-600">Mode: {getStockOpnameModeLabel(selectedSession?.mode || sessionMode)}</div>
                    <div className="text-xs text-slate-600">Period: {getSessionPeriodLabel(selectedSession) || '-'}</div>
                    <div className="text-xs text-slate-600">Status: {selectedSession?.status || '-'}</div>
                    {printMode === 'blanko' && (
                      <div className="mt-1 text-xs text-slate-600">
                        <span className="font-semibold">{printScopeLabel}</span>
                        {printTargetLabel ? ` - ${printTargetLabel}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 text-right">
                    Print Date: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                {printMode === 'blanko' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-4 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Kategori SO</label>
                        <select
                          className="border rounded px-3 py-2 w-full text-xs bg-white"
                          value={blankoScope}
                          onChange={(e) => {
                            const nextScope = e.target.value;
                            setBlankoScope(nextScope);
                            setBlankoTarget('');
                          }}
                        >
                          <option value="warehouse">SO Gudang</option>
                          <option value="wip">SO WIP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">Target</label>
                        <select
                          className="border rounded px-3 py-2 w-full text-xs bg-white"
                          value={blankoTarget}
                          onChange={(e) => setBlankoTarget(e.target.value)}
                        >
                          <option value="">Pilih target</option>
                          {blankoTargetOptions.length === 0 && (
                            <option value="" disabled>Data target belum tersedia</option>
                          )}
                          {blankoTargetOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {blankoScope === 'warehouse'
                            ? 'Pilih Warehouse atau Location untuk SO Gudang.'
                            : 'Pilih Production Line atau Work Center untuk SO WIP.'}
                        </div>
                      </div>
                    </div>
                    {selectedBlankoTarget && (
                      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                        <div className="font-semibold uppercase tracking-wide">Kelompok Target</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{printScopeLabel}</div>
                        <div className="mt-0.5">{printTargetLabel}</div>
                      </div>
                    )}
                    <div className="hidden print:block mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
                      <div className="grid grid-cols-2 gap-4 text-[11px]">
                        <div>
                          <div className="uppercase tracking-wide text-slate-400">Kategori SO</div>
                          <div className="mt-1 font-semibold text-slate-900">{printScopeLabel}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-slate-400">Target</div>
                          <div className="mt-1 font-semibold text-slate-900">{printTargetLabel}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-slate-400">Periode</div>
                          <div className="mt-1 font-semibold text-slate-900">{getSessionPeriodLabel(selectedSession) || '-'}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide text-slate-400">Status</div>
                          <div className="mt-1 font-semibold text-slate-900">{selectedSession?.status || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {printMode === 'blanko' && !selectedBlankoTarget && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Pilih target terlebih dahulu sebelum print blanko.
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px] border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-2 border">No</th>
                        <th className="text-left p-2 border">Kode Item</th>
                        <th className="text-left p-2 border">Lokasi Virtual</th>
                        {printMode !== 'blanko' && (
                          <th className="text-right p-2 border">Stok Sistem</th>
                        )}
                        {printMode === 'blanko' ? (
                          <>
                            <th className="text-right p-2 border">SNP</th>
                            <th className="text-right p-2 border">KBN/Box</th>
                            <th className="text-right p-2 border">Remain</th>
                            <th className="text-right p-2 border">Total Fisik</th>
                            <th className="text-right p-2 border">Selisih</th>
                            <th className="text-center p-2 border">Status</th>
                            <th className="text-left p-2 border">Catatan</th>
                          </>
                        ) : isScanLotMode ? (
                          <>
                            <th className="text-left p-2 border">Lot No</th>
                            <th className="text-right p-2 border">Qty Fisik</th>
                            <th className="text-right p-2 border">Selisih</th>
                            <th className="text-center p-2 border">Status</th>
                            <th className="text-left p-2 border">Catatan</th>
                          </>
                        ) : (
                          <>
                            <th className="text-right p-2 border">SNP</th>
                            <th className="text-right p-2 border">KBN/Box</th>
                            <th className="text-right p-2 border">Remain</th>
                            <th className="text-right p-2 border">Total Fisik</th>
                            <th className="text-right p-2 border">Selisih</th>
                            <th className="text-center p-2 border">Status</th>
                            <th className="text-left p-2 border">Catatan</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {printMode === 'blanko' && blankoSectionRows.map((section, sectionIndex) => (
                        <React.Fragment key={`blanko-section-${section.label}-${sectionIndex}`}>
                          <tr className="bg-slate-100">
                            <td colSpan={10} className="p-2 border font-semibold text-slate-700">
                              {section.label}
                            </td>
                          </tr>
                          {section.rows.map((row, index) => (
                            <tr key={row.id} className="border-t">
                              <td className="p-2 border">{index + 1}</td>
                              <td className="p-2 border font-semibold">{row.itemCode}</td>
                              <td className="p-2 border">{row.locationName || '-'}</td>
                              <td className="p-2 border text-right">{formatNumber0(row.snp)}</td>
                              <td className="p-2 border text-right" />
                              <td className="p-2 border text-right" />
                              <td className="p-2 border text-right" />
                              <td className="p-2 border text-right" />
                              <td className="p-2 border text-center">-</td>
                              <td className="p-2 border">-</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {printMode !== 'blanko' && filteredBlankoRows.map((row, index) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2 border">{index + 1}</td>
                          <td className="p-2 border font-semibold">{row.itemCode}</td>
                          <td className="p-2 border">{row.locationName || '-'}</td>
                          <td className="p-2 border text-right">{formatNumber0(row.bookQty)}</td>
                          {isScanLotMode ? (
                            <>
                              <td className="p-2 border">{row.lotNo || '-'}</td>
                              <td className="p-2 border text-right">{formatNumber0(row.actualQty)}</td>
                              <td className="p-2 border text-right">{row.difference > 0 ? `+${formatNumber0(row.difference)}` : formatNumber0(row.difference)}</td>
                              <td className="p-2 border text-center">{row.difference === 0 ? 'Cocok' : 'Selisih'}</td>
                              <td className="p-2 border">{row.reason || '-'}</td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 border text-right">{formatNumber0(row.snp)}</td>
                              <td className="p-2 border text-right">{formatNumber0(row.inputBox)}</td>
                              <td className="p-2 border text-right">{formatNumber0(row.inputLoose)}</td>
                              <td className="p-2 border text-right">{formatNumber0(row.actualQty)}</td>
                              <td className="p-2 border text-right">{row.difference > 0 ? `+${formatNumber0(row.difference)}` : formatNumber0(row.difference)}</td>
                              <td className="p-2 border text-center">{row.difference === 0 ? 'Cocok' : 'Selisih'}</td>
                              <td className="p-2 border">{row.reason || '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {filteredBlankoRows.length === 0 && (
                        <tr><td colSpan={printMode !== 'blanko' ? (isScanLotMode ? 9 : 11) : 10} className="p-3 text-center text-slate-400">Belum ada data.</td></tr>
                      )}
                    </tbody>
                    {filteredBlankoRows.length > 0 && printMode !== 'blanko' && (
                      <tfoot>
                        <tr className="bg-slate-50">
                          {isScanLotMode ? (
                            <>
                              <td className="p-2 border text-right font-semibold" colSpan="5">Total</td>
                              <td className="p-2 border text-right font-semibold">{formatNumber0(totalActualQty)}</td>
                              <td className="p-2 border text-right font-semibold">{totalDiffQty > 0 ? `+${formatNumber0(totalDiffQty)}` : formatNumber0(totalDiffQty)}</td>
                              <td className="p-2 border" colSpan="2" />
                            </>
                          ) : (
                            <>
                              <td className="p-2 border text-right font-semibold" colSpan="7">Total</td>
                              <td className="p-2 border text-right font-semibold">{formatNumber0(totalActualQty)}</td>
                              <td className="p-2 border text-right font-semibold">{totalDiffQty > 0 ? `+${formatNumber0(totalDiffQty)}` : formatNumber0(totalDiffQty)}</td>
                              <td className="p-2 border" colSpan="2" />
                            </>
                          )}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <div className="hidden print:block stockopname-signature-bar mt-8">
                  <div className="grid grid-cols-4 gap-3 text-center text-[11px] text-slate-700">
                    {['Penghitung', 'Pencatat', 'Checker', 'Approval'].map((label) => (
                      <div key={label} className="rounded-xl border border-slate-300 bg-white px-3 py-3">
                        <div className="font-semibold uppercase tracking-wide text-slate-700">{label}</div>
                        <div className="my-10 border-b border-slate-400" />
                        <div className="text-[10px] text-slate-500">Nama / Tanda Tangan</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="text-sm font-semibold">Analisis AI - Stock Opname</div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-500">Tutup</button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto bg-slate-50">
              {aiLoading && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  AI sedang menganalisis pola selisih...
                </div>
              )}
              {aiError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {aiError}
                </div>
              )}
              {!aiLoading && !aiError && aiResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-rose-100 bg-white p-4">
                    <div className="text-xs font-semibold text-rose-600 mb-2">Anomali Utama</div>
                    {aiResult.anomalies.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.anomalies.map((item, idx) => (
                          <li key={`anom-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Tidak ada anomali.</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-white p-4">
                    <div className="text-xs font-semibold text-amber-600 mb-2">Insight AI</div>
                    {aiResult.insights.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.insights.map((item, idx) => (
                          <li key={`ins-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Belum ada insight.</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-white p-4">
                    <div className="text-xs font-semibold text-emerald-600 mb-2">Rekomendasi Aksi</div>
                    {aiResult.actions.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {aiResult.actions.map((item, idx) => (
                          <li key={`act-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-400">Belum ada rekomendasi.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabStockOpname;
