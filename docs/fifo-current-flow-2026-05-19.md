# Diagram Alur FIFO Sistem Saat Ini

Dokumen ini merangkum alur FIFO yang **benar-benar berjalan saat ini** di sistem, dipisahkan menjadi:

- flow bisnis
- flow database
- flow API/UI

Catatan penting:

- Source of truth FIFO operasional ada di `stock_batches` dan `stock_movements`.
- Halaman `FIFO Management` di frontend saat ini adalah read-model yang dibangun dari `receive_notes`, bukan sumber saldo batch riil.
- Kartu stok lot lebih akurat untuk audit FIFO karena membaca pergerakan `stock_movements` per `batch_id`.
- Untuk receipt yang terkait `schedule`, `stock_batches.schedule_id` masih `unique`, sehingga beberapa receipt pada schedule yang sama cenderung terakumulasi ke batch yang sama.

## 1. Flow Bisnis

```mermaid
flowchart TD
  A[Operator scan kanban kosong atau manual consume] --> B[Backend consume stok dengan FIFO]
  B --> C{Stok cukup dan batch tidak expired?}
  C -- Tidak --> X[Transaksi ditolak]
  C -- Ya --> D[Qty keluar dicatat per batch tertua]
  D --> E[Inventory ledger dicatat sebagai PRODUCTION]
  E --> F{Item memakai alur request kanban?}
  F -- Tidak --> G[Consumption selesai]
  F -- Ya --> H[Buat kanban request baru]
  H --> I[Approval admin]
  I --> J[Buat DN atau schedule inbound]
  J --> K[Barang in transit]
  K --> L[Proses receiving]
  L --> M{QC status = OK?}
  M -- Tidak --> N[RN tersimpan, stok tidak masuk FIFO aktif]
  M -- Ya --> O[Bentuk atau update batch FIFO]
  O --> P[Stok on hand bertambah]
  P --> Q[Lot siap dipakai untuk consumption berikutnya]
  Q --> R[Request dapat dipindah ke status fifo lalu closed]
```

## 2. Flow Database

```mermaid
flowchart TD
  subgraph Outbound["A. Consumption / Outbound"]
    O1[POST scan kanban kosong atau manual consume] --> O2[Ambil batch tersedia dari stock_batches]
    O2 --> O3[Urutkan sesuai fifo_method]
    O3 --> O4[Cek expired_date]
    O4 --> O5[Update stock_batches.qty_out]
    O5 --> O6[Insert stock_movements direction = out]
    O6 --> O7[Insert inventory_ledgers transaction_type = PRODUCTION]
    O7 --> O8[Insert kanban_requests bila item ikut replenishment]
  end

  subgraph Inbound["B. Receiving / Inbound"]
    I1[POST receive schedule atau DN receive] --> I2[Insert receive_notes atau receive_note_headers/items]
    I2 --> I3{qc_status = ok?}
    I3 -- Tidak --> I4[Simpan dokumen receive saja]
    I3 -- Ya --> I5[Insert atau update stock_batches.qty_in]
    I5 --> I6[Insert stock_movements direction = in]
    I6 --> I7[Update items.qty_on_hand]
    I7 --> I8[Insert inventory_ledgers transaction_type = RECEIVING]
  end

  subgraph Reversal["C. Batalkan / Reversal RN"]
    R1[Reversal RN oleh admin] --> R2[Lock batch terkait]
    R2 --> R3{qty_out batch sudah > 0?}
    R3 -- Ya --> R4[Tolak reversal otomatis]
    R3 -- Tidak --> R5[Kurangi stock_batches.qty_in; set 0 bila habis]
    R5 --> R6[Insert stock_movements reason = receipt_reverse]
    R6 --> R7[Kurangi items.qty_on_hand]
    R7 --> R8[Insert inventory_ledgers transaction_type = REVERSAL]
    R8 --> R9[Update schedule: received_qty berkurang, actual SJ/tanggal kosong bila qty 0]
  end
```

Relasi praktis tabel yang paling berpengaruh ke FIFO:

- `receive_notes` / `receive_note_headers` / `receive_note_items`: dokumen penerimaan.
- `stock_batches`: saldo fisik per batch/lot FIFO.
- `stock_movements`: histori masuk/keluar per batch.
- `inventory_ledgers`: saldo ledger item level.
- `kanban_requests`: permintaan replenishment setelah stok dipotong.
- `items.qty_on_hand`: angka on-hand ringkas di master item.

## 3. Flow API/UI

```mermaid
flowchart TD
  subgraph Frontend["Frontend"]
    F1[Tab Kanban<br/>scan empty kanban] --> F2[Call API /api/kanban/empty atau /api/kanban/scan]
    F3[Manual stock consume] --> F4[Call API /api/stock/consume]
    F5[Tab Inbound<br/>receive schedule] --> F6[Call API /api/schedules/:id/receive]
    F7[Bulk DN receive] --> F8[Call API /api/receive-notes/merge]
    F9[Tab FIFO Management] --> F10[Load /api/receive-notes]
    F11[Tab Inventory - Kartu Stok per Lot] --> F12[Load /api/stock/batches/list]
    F12 --> F13[Load /api/stock-card/lot]
  end

  subgraph Backend["Backend"]
    B1[consumeStockFifo] --> B2[stock_batches + stock_movements + inventory_ledgers]
    B3[receive endpoint] --> B4[receive_notes + stock_batches + stock_movements + inventory_ledgers]
    B5[report/audit lot] --> B6[stock_movements per batch_id]
  end

  F2 --> B1
  F4 --> B1
  F6 --> B3
  F8 --> B3
  F10 --> B4
  F13 --> B5
```

Penjelasan per layar:

- `Tab Kanban`
  - memicu pengurangan stok FIFO yang riil lewat backend
  - setelah itu bisa membuat `kanban_requests`

- `Tab Inbound`
  - memicu pembentukan batch FIFO saat receiving `qc_status = ok`
  - inilah pintu utama stok masuk ke FIFO aktif

- `Tab FIFO Management`
  - menampilkan lot dari `receive_notes`
  - berguna untuk visual monitoring
  - bukan sumber saldo batch paling akurat

- `Tab Inventory > Kartu Stok per Lot`
  - membaca `stock_batches` dan `stock_movements`
  - ini layar audit FIFO yang paling dekat ke transaksi riil

## 4. Batasan Implementasi Saat Ini

```mermaid
flowchart TD
  A[UI FIFO Management] --> B[Lot dibentuk dari receive_notes]
  C[Backend FIFO aktual] --> D[Saldo batch dari stock_batches]
  D --> E[Movement audit dari stock_movements]
  B -. tidak selalu sama .-> D
  F[Receive berulang pada schedule yang sama] --> G[Masih bisa akumulasi ke satu batch karena schedule_id unique]
```

Implikasi:

- bila ingin audit lot yang benar-benar terpakai, gunakan data `stock_batches` + `stock_movements`
- bila ingin tampilan lot per event receipt, implementasi sekarang belum sepenuhnya memecah batch per receipt untuk schedule-linked stock
