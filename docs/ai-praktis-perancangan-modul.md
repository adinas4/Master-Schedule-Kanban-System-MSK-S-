# AI Praktis untuk Perancangan Modul

Dokumen ini contoh kerja nyata untuk memakai AI sebagai asisten desain, coding, dan testing pada satu modul.

## Tujuan

- Mengubah kebutuhan bisnis yang masih kasar menjadi desain yang bisa diimplementasikan.
- Menjaga supaya ERD, API, dan test case tetap konsisten.
- Mengurangi revisi bolak-balik antara analis, backend, frontend, dan QA.

## Pola Kerja

### 1) Tulis kebutuhan bisnis

Mulai dari masalah yang ingin diselesaikan, bukan dari tabel atau endpoint.

Contoh:

- Modul: `Report Shortage Supplier`
- Tujuan: menampilkan shortage per supplier per bulan.
- Sumber data: `prl_records`, `item_suppliers`, `stock_batches`, `subcon_stock_movements`, `supplier_lead_time_stats`.

### 2) Minta AI ubah ke spesifikasi

Prompt yang dipakai:

```text
Ubah kebutuhan ini menjadi spesifikasi teknis singkat:
- tujuan bisnis
- scope
- rule bisnis
- input
- output
- non-goals

Kebutuhan:
[tempel kebutuhan bisnis]
```

Output yang diharapkan:

- daftar rule yang eksplisit
- batasan data
- field yang wajib ada
- asumsi yang harus dikonfirmasi

### 3) Minta AI susun ERD atau skema tabel

Prompt yang dipakai:

```text
Rancang ERD untuk modul ini berdasarkan skema yang sudah ada.
Jangan buat tabel baru kalau bisa reuse.
Tentukan:
- tabel utama
- tabel relasi
- kolom kunci
- index yang perlu
- constraint yang dibutuhkan
```

Checklist yang harus keluar:

- tabel mana yang menjadi source of truth
- relasi antar tabel
- kolom filter utama
- potensi unique key

### 4) Minta AI definisikan API contract

Prompt yang dipakai:

```text
Rancang API contract untuk modul ini.
Tulis:
- endpoint
- method
- query params
- response shape
- error cases
- contoh payload
```

Contoh kontrak untuk modul shortage supplier:

- `GET /api/reports/supplier-shortage`
- query: `month`, `year`, `supplierId`
- response: summary, rows, filters, metadata

### 5) Minta AI buat test case dulu

Prompt yang dipakai:

```text
Buat test case dari spesifikasi ini.
Kelompokkan:
- happy path
- edge cases
- invalid input
- permission check
- regression risk
```

Contoh test case:

- data shortage muncul saat stok di bawah kebutuhan
- supplier filter hanya mengembalikan supplier terpilih
- request tanpa `month` atau `year` ditolak
- data test item tidak ikut dihitung

### 6) Baru implementasi kode

Urutan kerja yang aman:

- backend query dan service logic
- endpoint validation
- frontend table/filter/export
- test dan verifikasi hasil

### 7) Minta AI review hasil diff

Prompt yang dipakai:

```text
Review perubahan ini dari sisi bug, regression, dan missing test.
Fokus pada:
- logika perhitungan
- validasi input
- keamanan akses
- performa query
```

## Contoh Nyata Di Repo Ini

### Modul: `Report Shortage Supplier`

#### Input bisnis

- laporan bulanan shortage per supplier
- dipakai buyer dan management
- harus bisa difilter per bulan, tahun, dan supplier

#### Desain data

- `prl_records` untuk demand
- `item_suppliers` dan `items.vendor_id` untuk mapping supplier
- `stock_batches` dan `subcon_stock_movements` untuk stock snapshot
- `supplier_lead_time_stats` untuk lead time fallback

#### Output API

- total supplier
- total item
- urgent item
- total shortage qty
- detail per item per supplier

#### Test minimum

- satu item dengan shortage dihitung benar
- item tanpa supplier mapping masuk ke `Unassigned`
- supplier filter membatasi hasil
- data test item tidak muncul

## Template Prompt Siap Pakai

### Prompt spesifikasi

```text
Saya punya modul [nama modul].
Tolong ubah menjadi spesifikasi teknis yang bisa langsung diimplementasikan.
Gunakan format:
1. tujuan
2. scope
3. rule bisnis
4. data source
5. output
6. edge case
7. non-goals
```

### Prompt ERD

```text
Berikut spesifikasi modulnya.
Rancang ERD yang minimal dan konsisten dengan skema existing.
Prioritas:
- reuse tabel lama
- tambahkan tabel baru hanya jika wajib
- sebutkan relasi dan index penting
```

### Prompt API

```text
Dari spesifikasi ini, buat contract API yang rapi.
Sertakan:
- route
- method
- query/body
- response schema
- error response
- permission yang dibutuhkan
```

### Prompt test

```text
Buat daftar test case untuk modul ini.
Minimal cover:
- normal flow
- invalid input
- permission
- data kosong
- boundary condition
```

## Aturan Pakai AI

- Jangan langsung minta AI menulis code sebelum rule bisnis jelas.
- Jangan anggap output AI benar sebelum dibandingkan dengan data nyata.
- Jangan bikin tabel baru kalau tabel existing masih cukup.
- Jangan skip test untuk logic yang menyentuh stok, supplier, atau receiving.

## Referensi Internal

- [Task breakdown backend/frontend/database](./task-breakdown-backend-frontend-database.md)
- [Schema lock 4 modules](./schema-lock-4-modules-2026-03.md)

