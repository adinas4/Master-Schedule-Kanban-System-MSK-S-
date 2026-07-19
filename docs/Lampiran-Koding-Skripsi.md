# Lampiran Koding Skripsi

Dokumen ini berisi potongan koding inti yang bisa dipakai sebagai lampiran skripsi.
Fokusnya adalah menu yang paling penting dan paling panjang logikanya:

- Kanban Board
- BOM
- PRL
- Item

## Daftar File Utama

| Menu | File |
|---|---|
| Kanban Board | `src/tabs/TabKanban.jsx` |
| BOM | `src/components/BomManager.jsx` |
| PRL | `src/tabs/TabPrl.jsx` |
| Item | `src/tabs/TabMasterRef.jsx` |
| API Item | `server/index.js` |

## A. Kanban Board

**File:** `src/tabs/TabKanban.jsx`

Potongan ini menunjukkan struktur menu Kanban, tab yang tampil untuk produksi dan non-produksi, status aktif, kategori dashboard, dan perhitungan health request.

```jsx
const kanbanBoardTabs = isProductionUser
  ? [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'empty', label: 'Kanban Kosong' },
    { key: 'scan', label: 'Scan QR' },
  ]
  : [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'items', label: 'Kanban Items' },
    { key: 'requests', label: 'Requests' },
    { key: 'dn', label: 'DN Register' },
    { key: 'delivery', label: 'Delivery', disabled: !canOpenDeliveryTab, disabledTitle: 'Delivery hanya tersedia untuk role schedule.' },
    { key: 'receiving', label: 'Receiving Notes' },
    { key: 'empty', label: 'Kanban Kosong' },
    { key: 'scan', label: 'Scan QR' },
    { key: 'production', label: 'Produksi', disabled: !canProduction, disabledTitle: 'Produksi hanya tersedia untuk role produksi.' },
  ];

const kanbanActiveStatusMeta = useMemo(() => ([
  { key: 'triggered', label: 'Triggered', tone: 'border-amber-200 bg-amber-50 text-amber-700', shortLabel: 'Menunggu action', nextAction: 'Review request' },
  { key: 'requested', label: 'Requested', tone: 'border-indigo-200 bg-indigo-50 text-indigo-700', shortLabel: 'Antrian request', nextAction: 'Approve / reject' },
  { key: 'approved', label: 'Approved', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', shortLabel: 'Siap DN', nextAction: 'Create DN' },
  { key: 'dn_created', label: 'DN Issued', tone: 'border-blue-200 bg-blue-50 text-blue-700', shortLabel: 'DN terbit', nextAction: 'Create schedule' },
  { key: 'scheduled', label: 'Scheduled', tone: 'border-sky-200 bg-sky-50 text-sky-700', shortLabel: 'Jadwal jalan', nextAction: 'Monitor dispatch' },
  { key: 'in_transit', label: 'In Transit', tone: 'border-violet-200 bg-violet-50 text-violet-700', shortLabel: 'Sedang perjalanan', nextAction: 'Prepare receiving' },
  { key: 'receiving', label: 'Receiving/QC', tone: 'border-orange-200 bg-orange-50 text-orange-700', shortLabel: 'Proses inbound', nextAction: 'Finalize receiving' },
]), []);

const kanbanActiveStatusSet = useMemo(
  () => new Set(kanbanActiveStatusMeta.map((meta) => meta.key)),
  [kanbanActiveStatusMeta],
);

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
    return rawValue === code || rawValue === name || rawValue.includes(code) || rawValue.includes(name);
  });
  if (masterCategory) return String(masterCategory.code || masterCategory.name || '').trim().toLowerCase();
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

const kanbanDashboardRows = useMemo(() => {
  const filterKey = String(kanbanDashboardCategoryFilter || 'all').trim().toLowerCase();
  if (filterKey === 'all') return kanbanActiveRows;
  return kanbanActiveRows.filter((row) => resolveKanbanDashboardCategory(row) === filterKey);
}, [kanbanActiveRows, kanbanDashboardCategoryFilter, masterItemsByCode]);

const getKanbanNextAction = (row) => {
  const statusKey = String(row?.status || '').trim().toLowerCase();
  if (statusKey === 'triggered' || statusKey === 'requested') return 'Approve / reject';
  if (statusKey === 'approved') return row?.dn_id ? 'Create schedule' : 'Create DN';
  if (statusKey === 'dn_created') return row?.schedule_id ? 'Monitor schedule' : 'Create schedule';
  if (statusKey === 'scheduled') return 'Monitor dispatch';
  if (statusKey === 'in_transit') return 'Receiving / check-in';
  if (statusKey === 'receiving') return 'Finalize QC / close';
  if (statusKey === 'fifo') return 'Consume from FIFO';
  if (statusKey === 'closed') return 'Closed';
  if (statusKey === 'rejected') return 'Rejected';
  return '-';
};
```

## B. BOM

**File:** `src/components/BomManager.jsx`

Potongan ini memperlihatkan inti klasifikasi BOM, penentuan bucket item, pembuatan snapshot routing, dan penyimpanan BOM.

```jsx
const BOM_BUCKET_META = {
  FG: { label: 'FG', badgeClass: 'bg-indigo-100 text-indigo-700' },
  SUB_ASSY: { label: 'Sub-Assy', badgeClass: 'bg-orange-100 text-orange-700' },
  CP: { label: 'Child Part', badgeClass: 'bg-orange-100 text-orange-700' },
  RM: { label: 'Raw Material', badgeClass: 'bg-emerald-100 text-emerald-700' },
  INDIRECT: { label: 'Indirect Material', badgeClass: 'bg-purple-100 text-purple-700' },
};

const inferBomBucketFromText = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (bucketAliasPatterns.FG.some((pattern) => pattern.test(text))) return 'FG';
  if (bucketAliasPatterns.SUB_ASSY.some((pattern) => pattern.test(text))) return 'SUB_ASSY';
  if (bucketAliasPatterns.CP.some((pattern) => pattern.test(text))) return 'CP';
  if (bucketAliasPatterns.RM.some((pattern) => pattern.test(text))) return 'RM';
  if (bucketAliasPatterns.INDIRECT.some((pattern) => pattern.test(text))) return 'INDIRECT';
  return '';
};

const categoryBucketByKey = useMemo(() => {
  const map = new Map();
  (masterCategories || []).forEach((category) => {
    const code = String(category.code || category.id || '').trim();
    const name = String(category.name || code || '').trim();
    const inferredBucket = inferBomBucketFromText([code, name].filter(Boolean).join(' '));
    if (!inferredBucket) return;
    if (code) map.set(normalizeBucketKey(code), inferredBucket);
    if (name) map.set(normalizeBucketKey(name), inferredBucket);
  });
  return map;
}, [masterCategories]);

const masterItemsByBucket = useMemo(() => {
  const buckets = {
    FG: [],
    SUB_ASSY: [],
    CP: [],
    RM: [],
    INDIRECT: [],
  };
  (masterItemsNormalized || []).forEach((item) => {
    const bucket = getBomItemBucket(item);
    if (bucket && buckets[bucket]) {
      buckets[bucket].push(item);
    }
  });
  return buckets;
}, [masterItemsNormalized, categoryBucketByKey, categoryNameByCode]);

const buildProcessRoutingSnapshot = (codes) => (
  (codes || [])
    .map((value, index) => {
      const rawValue = String(value || '').trim();
      if (!rawValue) return null;
      const resolved = processMap.get(rawValue) || processMap.get(rawValue.toLowerCase());
      const code = resolved?.code || rawValue;
      const name = resolved?.name || rawValue;
      return {
        code,
        name,
        processType: String(resolved?.process_type || resolved?.processType || '').trim(),
        appliesToLevel: resolved?.applies_to_level || resolved?.appliesToLevel || 'All',
        workCenter: resolved?.work_center || resolved?.workCenter || '',
        sequence: Number.isFinite(Number(resolved?.sequence)) ? Number(resolved.sequence) : index + 1,
        standardTime: Number.isFinite(Number(resolved?.standard_time ?? resolved?.standardTime))
          ? Number(resolved?.standard_time ?? resolved?.standardTime)
          : 0,
      };
    })
    .filter(Boolean)
);

const normalizeBomHeaderState = (overrides = {}) => ({
  parentCode: '',
  bomVersion: '',
  revisionNo: 1,
  effectiveStartDate: todayDateInput,
  effectiveEndDate: '',
  reference: '',
  headerId: null,
  ...overrides,
});

const handleSaveBom = async (event) => {
  event.preventDefault();
  const parentCode = String(bomHeader.parentCode || '').trim();
  if (!parentCode) {
    alert('Parent Item wajib diisi.');
    return;
  }
  const validLines = bomLines.filter((line) => String(line.childCode || '').trim());
  if (validLines.length === 0) {
    alert('Minimal 1 komponen harus diisi.');
    return;
  }
  const payload = {
    parentCode,
    bomVersion: String(bomHeader.bomVersion || '').trim(),
    revisionNo: Number(bomHeader.revisionNo) || 1,
    effectiveStartDate: String(bomHeader.effectiveStartDate || '').trim(),
    effectiveEndDate: String(bomHeader.effectiveEndDate || '').trim(),
    reference: String(bomHeader.reference || '').trim(),
    lines: validLines.map((line) => ({
      childCode: String(line.childCode || '').trim(),
      description: String(line.description || '').trim(),
    })),
  };
  if (!apiFetch) {
    alert('API belum tersedia untuk menyimpan BOM.');
    return;
  }
  if (!allowEdit) {
    alert('Anda tidak memiliki akses untuk mengubah Master BOM.');
    return;
  }
  setBomSaving(true);
  try {
    await apiFetch('/api/bom', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshBomRelations();
    setIsFormOpen(false);
  } finally {
    setBomSaving(false);
  }
};
```

## C. PRL

**File:** `src/tabs/TabPrl.jsx`

Potongan ini menjelaskan filter PRL, filter model/kategori, dan fitur supplier preview.

```jsx
const filteredModelOptions = useMemo(() => {
  const keyword = modelFilterQuery.trim().toLowerCase();
  if (!keyword) return masterModels;
  return masterModels.filter((model) => (
    String(model.code || '').toLowerCase().includes(keyword)
    || String(model.name || '').toLowerCase().includes(keyword)
  ));
}, [masterModels, modelFilterQuery]);

const categoryOptions = useMemo(() => {
  if (masterCategories.length > 0) {
    return masterCategories.map((category) => ({ code: category.code, name: category.name }));
  }
  return prlCategoryOptions.map((category) => ({ code: category, name: '' }));
}, [masterCategories, prlCategoryOptions]);

const filteredCategoryOptions = useMemo(() => {
  const keyword = categoryFilterQuery.trim().toLowerCase();
  if (!keyword) return categoryOptions;
  return categoryOptions.filter((category) => (
    String(category.code || '').toLowerCase().includes(keyword)
    || String(category.name || '').toLowerCase().includes(keyword)
  ));
}, [categoryOptions, categoryFilterQuery]);

const toggleModelFilter = (code) => {
  const selected = prlFilters.model || [];
  if (selected.includes(code)) {
    setPrlFilters({ ...prlFilters, model: selected.filter((value) => value !== code) });
  } else {
    setPrlFilters({ ...prlFilters, model: [...selected, code] });
  }
};

const toggleCategoryFilter = (code) => {
  const selected = prlFilters.category || [];
  if (selected.includes(code)) {
    setPrlFilters({ ...prlFilters, category: selected.filter((value) => value !== code) });
  } else {
    setPrlFilters({ ...prlFilters, category: [...selected, code] });
  }
};

const supplierPreviewCacheKey = useMemo(() => {
  const year = String(prlFilters?.year || currentYear || new Date().getFullYear()).trim();
  const month = String(prlFilters?.month || prlActiveMonthKey || '').trim().toLowerCase();
  const supplierKey = String(prlFilters?.supplier || '').trim().toLowerCase() || 'all';
  if (!year || !month) return '';
  return `${year}:${month}:${supplierKey}`;
}, [currentYear, prlActiveMonthKey, prlFilters?.month, prlFilters?.supplier, prlFilters?.year]);

const prefetchSupplierPreview = useCallback(async (targetCacheKey, { showPreparing = false } = {}) => {
  if (!apiFetch || !targetCacheKey) return null;
  if (supplierPreviewPrefetchRef.current.key === targetCacheKey && supplierPreviewInitialReport) {
    return supplierPreviewInitialReport;
  }
  const [year, month, supplierKey] = targetCacheKey.split(':');
  if (!year || !month) return null;
  const requestId = supplierPreviewPrefetchRef.current.requestId + 1;
  supplierPreviewPrefetchRef.current.requestId = requestId;
  if (showPreparing) setSupplierPreviewPreparing(true);
  try {
    const params = new URLSearchParams();
    params.set('year', year);
    params.set('month', month);
    if (supplierKey && supplierKey !== 'all' && prlFilters.supplier) {
      params.set('supplier', prlFilters.supplier);
    }
    const report = await apiFetch(`/api/prl/report?${params.toString()}`);
    const cachedReport = report ? { ...report, __previewCacheKey: targetCacheKey } : null;
    supplierPreviewPrefetchRef.current.key = targetCacheKey;
    setSupplierPreviewInitialReport(cachedReport);
    return cachedReport;
  } catch {
    if (requestId !== supplierPreviewPrefetchRef.current.requestId) return null;
    supplierPreviewPrefetchRef.current.key = targetCacheKey;
    setSupplierPreviewInitialReport(null);
    return null;
  } finally {
    if (showPreparing) setSupplierPreviewPreparing(false);
  }
}, [apiFetch, prlFilters.supplier, supplierPreviewInitialReport]);
```

## D. Item

**File:** `src/tabs/TabMasterRef.jsx`

Potongan ini memperlihatkan logika master item: klasifikasi kategori, routing proses, upload gambar item, dan penambahan model cepat.

```jsx
const getItemCategoryCode = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const matched = (masterCategories || []).find((category) => (
    String(category.code || '').trim().toLowerCase() === raw.toLowerCase()
    || String(category.name || '').trim().toLowerCase() === raw.toLowerCase()
  ));
  if (matched) return String(matched.code || '').trim();
  const lowered = raw.toLowerCase();
  const matchedByKeyword = (masterCategories || []).find((category) => {
    const code = String(category.code || '').trim().toLowerCase();
    const name = String(category.name || '').trim().toLowerCase();
    return (
      (lowered.includes('raw') && (code.includes('raw') || name.includes('raw'))) ||
      (lowered.includes('indirect') && (code.includes('indirect') || name.includes('indirect'))) ||
      (lowered.includes('consum') && (code.includes('consum') || name.includes('consum'))) ||
      (lowered.includes('subcon') && (code.includes('subcon') || name.includes('subcon'))) ||
      (lowered.includes('child') && (code.includes('child') || name.includes('child'))) ||
      (lowered.includes('sub assy') && (code.includes('sub') || name.includes('sub'))) ||
      (lowered.includes('subassy') && (code.includes('sub') || name.includes('sub'))) ||
      (lowered.includes('fin') && (code.includes('fg') || name.includes('finish') || name.includes('fg')))
    );
  });
  return matchedByKeyword ? String(matchedByKeyword.code || '').trim() : raw;
};

const itemProcessRoutingRows = useMemo(() => {
  const rows = Array.isArray(itemMasterForm?.processRouting) && itemMasterForm.processRouting.length > 0
    ? itemMasterForm.processRouting
    : [{
      processCode: '',
      processName: '',
      workCenter: '',
      processType: '',
      appliesToLevel: 'All',
      sequence: 1,
      cycleTimeSeconds: '',
    }];
  return rows;
}, [itemMasterForm?.processRouting]);

const updateItemProcessRoutingRow = (rowIndex, patch) => {
  setItemMasterForm((prev) => {
    const nextRows = Array.isArray(prev.processRouting) ? [...prev.processRouting] : [];
    while (nextRows.length <= rowIndex) {
      nextRows.push({
        processCode: '',
        processName: '',
        workCenter: '',
        processType: '',
        appliesToLevel: 'All',
        sequence: nextRows.length + 1,
        cycleTimeSeconds: '',
      });
    }
    nextRows[rowIndex] = { ...nextRows[rowIndex], ...patch };
    return { ...prev, processRouting: nextRows };
  });
};

const handleItemProcessRoutingChange = (rowIndex, value) => {
  const processCode = String(value || '').trim();
  const matchedProcess = (masterProcesses || []).find((process) => String(process.code || '').trim() === processCode) || null;
  const currentRow = Array.isArray(itemMasterForm?.processRouting) ? itemMasterForm.processRouting[rowIndex] : null;
  updateItemProcessRoutingRow(rowIndex, {
    processCode,
    processName: matchedProcess?.name || processCode,
    workCenter: String(matchedProcess?.work_center || '').trim(),
    processType: String(matchedProcess?.process_type || '').trim(),
    appliesToLevel: String(matchedProcess?.applies_to_level || 'All').trim() || 'All',
    cycleTimeSeconds: String(currentRow?.cycleTimeSeconds || '').trim() || String(matchedProcess?.standard_time ?? ''),
  });
};

const handleItemImageUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const itemCode = masterEditingItemCode || itemMasterForm?.code;
  if (!itemCode) {
    setItemImageError('Isi kode item terlebih dahulu.');
    if (itemImageInputRef.current) itemImageInputRef.current.value = '';
    return;
  }
  const hasExistingItem = (masterItems || []).some((item) => item.code === itemCode);
  if (!hasExistingItem && !masterEditingItemCode) {
    setItemImageError('Simpan item terlebih dahulu sebelum upload.');
    if (itemImageInputRef.current) itemImageInputRef.current.value = '';
    return;
  }
  setItemImageUploading(true);
  setItemImageError('');
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiFetch(`/api/master/items/${encodeURIComponent(itemCode)}/image`, {
      method: 'POST',
      body: formData,
    });
    const imageUrl = response?.imageUrl || response?.image_url || '';
    const imageThumbUrl = response?.imageThumbUrl || response?.image_thumb_url || '';
    setItemMasterForm((prev) => ({
      ...prev,
      imageUrl: imageUrl || prev.imageUrl,
      imageThumbUrl: imageThumbUrl || prev.imageThumbUrl,
    }));
    if (imageThumbUrl || imageUrl) {
      setItemImagePreview(imageThumbUrl || imageUrl);
    }
  } finally {
    setItemImageUploading(false);
    if (itemImageInputRef.current) itemImageInputRef.current.value = '';
  }
};
```

## E. API Pendukung Item

**File:** `server/index.js`

Route ini penting kalau kamu ingin menampilkan sumber data item dari backend dan menjelaskan filter kategori item pada skripsi.

```js
app.get("/api/master/items", authenticate, requireMasterRead, async (req, res) => {
  try {
    const bucket = String(req.query.bucket || req.query.category || '').trim().toLowerCase();
    const search = String(req.query.q || req.query.search || '').trim().toLowerCase();
    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);
    const hasLimit = Number.isFinite(limit) && limit > 0;
    const hasOffset = Number.isFinite(offset) && offset >= 0;
    const limitClause = hasLimit
      ? `limit ${Math.min(Math.floor(limit), 1000)}${hasOffset ? ` offset ${Math.floor(offset)}` : ""}`
      : "";
    const useSqlPaging = hasLimit && !bucket && !search;
    const result = await pool.query(`select * from items where code not ilike 'TEST-%' order by code ${useSqlPaging ? limitClause : ""}`);
    const matchesBucket = (row) => {
      if (!bucket) return true;
      const code = String(row.code || '').trim().toUpperCase();
      const text = [row.type, row.category, code].filter(Boolean).join(' ').toLowerCase();
      const bucketMap = {
        fg: [/^fg[-_]/i, /\bfg\b/i, /finished\s*goods?/i, /\bbarang\s*jadi\b/i, /final\s*goods?/i],
        subassy: [/^sa[-_]/i, /^sub[-_]/i, /\bsub[- ]?assy\b/i, /\bsub[- ]?assembly\b/i, /\bsubassy\b/i],
        cp: [/^cp[-_]/i, /\bcp\b/i, /child\s*part/i, /childpart/i, /component/i],
        rm: [/^rm[-_]/i, /\brm\b/i, /raw\s*material/i, /raw\b/i, /bahan\s*baku/i],
        indirect: [/^im[-_]/i, /\bim\b/i, /indirect\s*material/i, /\bindirect\b/i, /consumable/i],
      };
      const patterns = bucketMap[bucket] || [];
      return patterns.some((pattern) => pattern.test(code) || pattern.test(text));
    };
    const filteredRows = result.rows.filter((row) => (
      matchesBucket(row)
      && (!search || String(row.code || '').toLowerCase().includes(search) || String(row.name || '').toLowerCase().includes(search))
    ));
    res.json(useSqlPaging ? result.rows : (hasLimit ? filteredRows.slice(Math.max(0, Math.floor(offset || 0)), Math.max(0, Math.floor(offset || 0)) + Math.min(Math.floor(limit), 1000)) : filteredRows));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Catatan Format Skripsi

Kalau kamu mau hasilnya mirip contoh gambar:

1. Pindahkan isi file ini ke Word.
2. Pakai font `Courier New` atau `Consolas` untuk blok kode.
3. Beri judul per lampiran:
   - `Lampiran A. Kanban Board`
   - `Lampiran B. BOM`
   - `Lampiran C. PRL`
   - `Lampiran D. Item`
4. Untuk tiap lampiran, sisipkan 1-2 halaman kode yang paling penting, bukan seluruh file.

