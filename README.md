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
```

Frontend (`.env` di root):

```
VITE_API_BASE=
VITE_ADMIN_WHATSAPP_NUMBER=6285183220938
```

Kosongkan `VITE_API_BASE` untuk auto-detect host browser saat backend ada di port `4000` pada mesin/LAN yang sama. Jika ingin override manual, isi dengan URL penuh seperti `http://192.168.1.194:4000`.
Isi `VITE_ADMIN_WHATSAPP_NUMBER` dengan nomor Admin/IT format digit tanpa spasi atau simbol, misalnya `6285183220938`.

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

## Railway Deployment

Arsitektur yang dipakai untuk Railway adalah satu application service plus satu PostgreSQL service. Frontend React dibuild menjadi `dist/`, lalu backend Express menyajikan file statis tersebut dan tetap melayani API di service yang sama. Pola ini paling sederhana untuk repo ini karena hanya perlu satu domain production, CORS lebih mudah dikunci, dan refresh halaman React tidak 404.

### A. Persiapan Akun Railway

1. Buat akun di Railway.
2. Hubungkan akun Railway ke GitHub.
3. Pastikan repository ini sudah berada di GitHub dan branch deployment siap dipilih.

### B. Hubungkan Repository GitHub

1. Di Railway, pilih `New Project`.
2. Pilih `Deploy from GitHub repo`.
3. Pilih repository `Master-Schedule-Kanban-System-MSK-S-`.
4. Pilih branch deployment, misalnya `deployment/railway-production`.

### C. Buat PostgreSQL Railway

1. Di project Railway yang sama, klik `New`.
2. Pilih `Database` lalu `PostgreSQL`.
3. Setelah database dibuat, hubungkan service aplikasi ke PostgreSQL agar Railway menyediakan `DATABASE_URL`.

### D. Service Backend + Frontend

Gunakan satu service aplikasi dari root repository.

Railway akan membaca `railway.json`:

```text
Build command: npm run build:railway
Pre-deploy command: npm run migrate:railway
Start command: npm run start:railway
Health check path: /health
```

Jika mengisi manual di Railway, gunakan nilai yang sama.

### E. Root Directory

Gunakan root directory repository:

```text
/
```

Jangan gunakan `server/` sebagai root service karena frontend perlu dibuild dari root.

### F. Environment Variables

Isi variable berikut di Railway application service:

```text
NODE_ENV=production
PORT=<disediakan Railway, boleh tidak diisi manual>
DATABASE_URL=<otomatis dari Railway PostgreSQL>
JWT_SECRET=<isi secret panjang dan acak>
FRONTEND_URL=https://<domain-app-railway-anda>
VITE_API_BASE=
SESSION_INACTIVITY_TIMEOUT_MINUTES=15
DEFAULT_RESET_PASSWORD=<password reset default internal>
SERVE_FRONTEND=true
UPLOAD_DIR=/data/uploads
```

Optional jika memakai email:

```text
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM=
```

Untuk local development, gunakan fallback PostgreSQL:

```text
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=
PGDATABASE=monitoring_supplier
```

### G. DATABASE_URL

Jika PostgreSQL Railway sudah linked, `DATABASE_URL` biasanya tersedia otomatis. Aplikasi akan memakai `DATABASE_URL` lebih dulu. Jika kosong, aplikasi fallback ke `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, dan `PGDATABASE`.

SSL PostgreSQL aktif otomatis saat `NODE_ENV=production` atau Railway environment terdeteksi. Gunakan `PGSSLMODE=disable` hanya untuk database lokal yang tidak mendukung SSL. Gunakan `PGSSLMODE=no-verify` hanya jika provider mewajibkan SSL tetapi sertifikatnya tidak dapat diverifikasi.

### H. FRONTEND_URL dan VITE_API_BASE

Karena frontend disajikan oleh backend yang sama, isi:

```text
FRONTEND_URL=https://<domain-app-railway-anda>
VITE_API_BASE=
```

`VITE_API_BASE` dikosongkan agar browser memakai relative path `/api`. Jika frontend dipisah ke service/domain lain, isi `VITE_API_BASE=https://<domain-backend>` dan isi `FRONTEND_URL=https://<domain-frontend>`.

### I. Migration

Migration dijalankan oleh Railway sebelum deploy melalui:

```bash
npm run migrate:railway
```

Migration memakai mekanisme `ensureSchema()` yang idempotent: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`, dan index `IF NOT EXISTS`. Migration dapat dijalankan ulang. Jangan jalankan script cleanup manual di production.

### J. Admin Pertama

Jika database baru belum punya user admin, buat admin pertama dengan script one-time:

```text
INITIAL_ADMIN_USERNAME=<username admin>
INITIAL_ADMIN_PASSWORD=<password awal yang kuat>
INITIAL_ADMIN_NAME=<nama tampilan opsional>
npm run create-admin
```

Script menolak username yang sudah ada dan tidak berjalan otomatis saat startup. Hapus `INITIAL_ADMIN_PASSWORD` dari Railway variables setelah admin berhasil dibuat. Jangan commit password admin ke repository.

### K. Health Check

Railway health check memakai:

```text
/health
```

Endpoint ini tidak butuh autentikasi dan tidak bergantung pada database. Untuk cek database dari browser/admin, gunakan:

```text
/api/health
```

### L. Upload dan Railway Volume

Railway filesystem biasa bersifat ephemeral. File di `server/uploads` bisa hilang saat redeploy/restart jika tidak memakai volume.

Solusi yang disiapkan:

1. Buat Railway Volume.
2. Mount volume ke path `/data`.
3. Isi environment variable:

```text
UPLOAD_DIR=/data/uploads
```

Aplikasi membuat folder upload otomatis saat startup. Jika belum memakai volume, upload tetap berjalan, tetapi tidak persisten.

### M. Auto Deploy

Aktifkan auto-deploy Railway dari branch deployment. Setiap push ke branch tersebut akan menjalankan install, build, migration, lalu start.

### N. Log Deployment

Di Railway:

1. Buka service aplikasi.
2. Buka tab `Deployments`.
3. Klik deployment terbaru.
4. Baca log build, pre-deploy, dan runtime.

Cari pesan:

```text
Database migration completed.
API listening on http://0.0.0.0:<PORT>
```

### O. Rollback

Di tab `Deployments`, pilih deployment yang sebelumnya berhasil lalu gunakan fitur rollback/redeploy dari Railway. Jika rollback terkait database, restore backup PostgreSQL yang sesuai sebelum membuka aplikasi untuk user.

### P. Backup dan Restore PostgreSQL

Backup manual:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Restore manual:

```bash
psql "$DATABASE_URL" < backup.sql
```

Untuk script lokal repo:

```bash
cd server
npm run backup
npm run restore
```

Pastikan file backup tidak berisi data sensitif sebelum dibagikan dan jangan commit dump database.

### Q. Custom Domain dan HTTPS

1. Di Railway service, buka `Settings` atau `Networking`.
2. Tambahkan custom domain.
3. Ikuti instruksi DNS Railway.
4. Setelah aktif, Railway menyediakan HTTPS otomatis.
5. Update `FRONTEND_URL` menjadi custom domain HTTPS.

### R. Troubleshooting

- Build gagal di dependency server: pastikan `npm run build:railway` menjalankan `npm --prefix server install`.
- Health check gagal: pastikan service start command `npm run start:railway` dan path `/health`.
- Login gagal setelah deploy: cek `JWT_SECRET`, user admin, dan koneksi database.
- Database gagal konek: cek `DATABASE_URL` sudah linked dari PostgreSQL Railway.
- CORS error: cek `FRONTEND_URL` sama persis dengan domain browser, tanpa slash belakang.
- Refresh halaman 404: pastikan `SERVE_FRONTEND=true` dan folder `dist/` terbentuk saat build.
- Upload hilang setelah redeploy: pasang Railway Volume dan set `UPLOAD_DIR=/data/uploads`.
- Kamera QR tidak aktif: browser membutuhkan HTTPS atau localhost; gunakan domain Railway HTTPS.

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

## Dokumen Praktis AI

- [AI Praktis untuk Perancangan Modul](docs/ai-praktis-perancangan-modul.md)
- [Task breakdown backend/frontend/database](docs/task-breakdown-backend-frontend-database.md)
- [Schema lock 4 modules](docs/schema-lock-4-modules-2026-03.md)

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
