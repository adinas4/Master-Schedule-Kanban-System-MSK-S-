# Monitoring Supplier & Kanban MRP System

Sistem MRP/Inventory Control berbasis Kanban & FIFO untuk mengelola jadwal kedatangan, master data, PRL, dan pergerakan stok. Fokus utama: data master sebagai Single Source of Truth, transaksi terukur, dan alur Kanban-DN-RN-FIFO yang konsisten.

## Project Overview

- Domain: Supply, scheduling, kanban, FIFO inventory, PRL planning.
- Core flow: Scan Kanban Kosong (Cut Stock) -> Request -> DN -> In Transit -> RN -> FIFO -> Inventory.
- Target: Multi-supplier/customer per item + perencanaan PRL berbasis Working Days.

### Tech Stack

- Frontend: React + Vite + Tailwind (UI), Recharts (chart), QR Scanner.
- Backend: Node.js + Express.
- Database: PostgreSQL.

## Setup & Installation

### 1) Clone & Install

```bash
git clone <repo-url>
cd monitoring-supplier
npm install
cd server
npm install
```

### 2) Environment Variables

Server (`server/.env`):

```
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/monitoring_supplier
JWT_SECRET=change_this_secret
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
```

Frontend (`.env` di root):

```
VITE_API_BASE=
```

Kosongkan `VITE_API_BASE` untuk auto-detect host browser saat backend ada di port `4000` pada mesin/LAN yang sama. Jika ingin override manual, isi dengan URL penuh seperti `http://192.168.1.194:4000`.

### 3) Run Local

Backend:

```bash
cd server
npm run start
```

Frontend:

```bash
cd ..
npm run host
```

Vite now runs with `--host --port 3000`, so any device on the same LAN can reach it via `http://HOST_IP:3000`.

### 4) Desktop Launcher

Use the supplied `start-monitoring-supplier.bat` to enter the project folder and run `npm run host` (it pauses on error so the CMD window stays open). A shortcut on the desktop already points to this batch file with the project folder as its working directory.

### 5) Background / Auto start (PM2)

PM2 keeps the frontend alive even after reboots:

```bash
npm install -g pm2 pm2-windows-startup
cd c:\Users\matra\monitoring-supplier
pm2 delete monitoring-supplier       # cleanup previous run
pm2 start npm.cmd --name monitoring-supplier --interpreter cmd -- run host
pm2-startup install                 # register PM2 as a Windows startup task
pm2 save                            # persist the process list
```

- `pm2 status` shows the process health; check `monitoring-supplier` stays in the `online` state and that the CPU / memory columns look reasonable (`README.md:76`).  
- Use `pm2 logs monitoring-supplier --lines 50` to trace recent startup messages and confirm there are no `SyntaxError` entries in the error log.
- Ports and host addressing mirror the `npm run host` behavior (LAN accessible on port 3000).

### 4) Production Build (Frontend)

```bash
npm run build
npm run preview
```

## System Modules (Per Tab)

### Dashboard

- Menampilkan ringkasan kesehatan stok, alert critical, dan data integrity.
- Widget alert mengambil data FIFO vs Min Stock.
- Grafik KPI dan summary jadwal supplier.

### Monitoring Supplier

- Inbound Schedule (Plan vs Actual) untuk kedatangan.
- Bulk Receive (Batch): input No. SJ + Tgl Tiba sekali untuk beberapa item.
- Auto-generate Kartu Kanban inbound dari schedule (print & scan untuk RN).
- Split manual dengan toleransi 10% (lihat Business Logic).
- Duplicate protection untuk input jadwal & nomor SJ.
- Export/Print inbound schedule.

### Kanban Board

- Status alur: `triggered -> requested -> approved -> dn_created -> scheduled -> in_transit -> receiving -> fifo -> closed/rejected`.
- Auto-trigger jika stok di bawah minimum.
- Scan QR/Barcode (camera/manual), proses request, dan tracking status.
- DN dibuat dari config format; RN saat receiving.
- Scan kanban kosong langsung mengurangi stok on hand dan membuat request baru.
- History kanban kosong dan DN/Receiving dengan virtualized list.

### FIFO

- FIFO lots dibentuk dari receiving notes.
- Issue/Receive FIFO manual untuk memindahkan stok per lot.
- Status lot: Active/Depleted, dengan data expiry & quality.

### Inventory

- Ringkasan stok per item, kategori, lokasi, supplier, dan safety level.
- Detail inventory menampilkan lot FIFO per item.
- Virtualized table untuk dataset besar.

### PRL (Part Requirement List)

- VOL/DAY dihitung otomatis dengan rumus `Qty Bulan Aktif / Working Days`.
- Working Days disimpan di Config (`master_config.working_days`).
- Import/Export PRL via Excel.

### Master Referensi

- Master utama: Org, Vendor, Customer, Item, Location, Packing, Category, Config.
- Item mendukung multi-supplier/customer dengan share %.
- Category dipakai global (Item, PRL filter, Kanban grouping).

### Config

- Dynamic config: DN/RN format, QR parsing, QC flow, FIFO method, Working Days.
- Edit via modal + helper tokens.

### Reports

- Rekap vendor per periode dan export Excel.
- Summary dan detail per supplier/PO.

### User & Admin

- Admin dapat kelola user dan permission.
- Role non-admin dibatasi sesuai permission.

### AI Tools

- Smart Parse (Gemini) untuk ekstraksi data PO dari teks/foto.
- Chatbot internal untuk tanya data jadwal.
- AI Report ringkas berdasarkan data jadwal.

## Flowchart (IN / OUT)

```mermaid
graph TD
  subgraph "FASE 1: CONSUMPTION (Di Line Produksi)"
    A[User Scan Kanban Kosong] -->|Action 1| B[Kurangi Stock On Hand]
    A -->|Action 2| C[Trigger Auto-Order / Kanban Request]
  end

  C --> D{Approval Admin}

  subgraph "FASE 2: REPLENISHMENT (Dari Supplier/Gudang Utama)"
    D -->|Yes| E[Create Delivery Note - DN]
    E --> F[Barang Dikirim (In Transit)]
    F --> G[Barang Tiba & Scan RN]
    G --> H[Update FIFO & Tambah Stock On Hand]
  end

  H -->|Siklus Berulang| A
```

## Recent Changes & Optimizations

- Refactor jadwal inbound ke `useScheduleStore` agar state tidak menumpuk di `App.jsx`.
- Manual virtualization untuk tabel besar (Inbound, Inventory, Kanban History).
- Input notes di‑commit saat blur untuk mengurangi lag ketik.
- Lazy load library berat (`xlsx`, `qr-scanner`).
- Memoisasi filter jadwal untuk mengurangi render.

## Business Logic (Penting)

### Inbound Schedule & Split (10% Rule)

- Saat Actual Qty < Plan Qty, hitung `Outstanding = Plan - Actual`.
- Threshold toleransi: `Plan * 10%`.
- Jika Outstanding <= 10%: status auto `Completed`, tombol split tidak muncul.
- Jika Outstanding > 10%: status `Partial`, tampil tombol manual `Split Sisa`.
- Split manual membuat baris baru dengan Qty = Outstanding, tanggal = tanggal jadwal induk, status `Pending`.
- Short Close: Plan Qty tidak diubah (tidak ada normalisasi).

### KPI / Scorecard

- Status `Completed` dan `Partial` dihitung sebagai selesai untuk KPI.
- On Time ditentukan oleh `Arrival Date <= Plan Date` (bukan oleh gap qty).
- Split rows dihitung per baris untuk on-time/late.

### FIFO Logic

- FIFO by Lot/Batch + Received Date atau by Received Date (tergantung Config).
- Stok masuk ke `stock_batches` saat receiving dikunci.
- Konsumsi FIFO mengambil batch tertua dulu.

### Auto-Numbering DN/RN

- Format berbasis template dari Config.
- Token umum: `{COUNTER}`, `{YEAR}`, `{YY}`, `{ROMAN_MONTH}`, `{MONTH}`, `{SUPPLIER}`.
- Counter auto-increment; tetap konsisten walau format berubah.

### Duplicate Protection

- Jadwal inbound tidak boleh duplikat (PO + Supplier + Item + Tanggal + Jam).
- Nomor SJ duplikat (SJ + PO + Item + Qty) ditolak.

### Bulk Action & FK Handling

- Bulk update memakai payload ter-sanitasi:
- DN/RN id atau FK invalid akan di-set null untuk menghindari error FK.
- Bulk edit Item mendukung Category, Type Pack, Supplier, Customer, Shelf Life.
- Bulk update Supplier/Customer default share 100%.

## Database Schema (Ringkas)

Tabel inti:

- `schedules`: jadwal kedatangan + actual receiving.
- `stock_batches`: stok masuk per batch (FIFO).
- `items`: master item + category + type_pack.
- `master_categories`, `master_packings`, `master_vendors`, `master_customers`.
- `item_suppliers`, `item_customers` (share allocation).
- `kanban_settings`, `kanban_requests`, `delivery_notes`, `receive_notes`.
- `prl_records`: kebutuhan bulanan per item.
- `master_config`: fifo_method, document_numbering, qc_status, working_days.

## Screenshots

Tambahkan file berikut agar visual README lengkap:

- PRL: `docs/screenshots/prl.png`
- Config: `docs/screenshots/config.png`

Contoh pemakaian:

```
![PRL](docs/screenshots/prl.png)
![Config](docs/screenshots/config.png)
```

## Notes

- Master Category bersifat global. Pastikan mapping kategori konsisten (contoh: RAW, WIP, FIN).
- Working Days boleh JSON per tahun atau flat list. Contoh:

```json
{
  "2026": { "JAN": 22, "FEB": 20, "MAR": 23 }
}
```

Atau list sederhana:

```
JAN=22, FEB=20, MAR=23
```
