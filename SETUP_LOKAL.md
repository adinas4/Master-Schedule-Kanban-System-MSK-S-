# Panduan Setup Lokal

Panduan ini untuk menjalankan proyek Monitoring Supplier & Kanban MRP System di laptop atau server lokal.

---

## Prerequisites

- Node.js v18+ atau lebih baru
- PostgreSQL v12+ atau lebih baru
- Git
- PowerShell untuk script otomasi Windows

Cek versi:

```bash
node --version
npm --version
psql --version
```

---

## Step 1: Clone Repository

```bash
git clone https://github.com/adinas4/Master-Schedule-Kanban-System-MSK-S-.git
cd Master-Schedule-Kanban-System-MSK-S-
```

---

## Step 2: Install Dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
cd server
npm install
cd ..
```

---

## Step 3: Setup Database PostgreSQL

### 3a. Buat Database Baru

Buka terminal atau PostgreSQL CLI:

```bash
psql -U postgres
```

```sql
CREATE DATABASE monitoring_supplier;
\q
```

### 3b. Setup Environment Variables

Buat file `server/.env`:

```env
PORT=4000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=monitoring_supplier
JWT_SECRET=your_secret_key_here
BACKUP_DIR=backups
BACKUP_RETENTION_DAYS=30
BACKUP_CLOUD_DIR=
```

Ganti `your_password_here` dengan password PostgreSQL lokal.

Buat file `.env` di root folder:

```env
VITE_API_BASE=
```

Biarkan kosong agar frontend otomatis memakai backend di `localhost:4000`.

---

## Step 4: Jalankan Aplikasi

Terminal 1, jalankan backend:

```bash
cd server
npm run start
```

Expected output:

```text
Server running on http://localhost:4000
```

Terminal 2, jalankan frontend:

```bash
npm run host
```

Expected output:

```text
VITE v7.x.x ready in xxx ms
Local:   http://localhost:3000/
Network: http://192.168.x.x:3000/
```

---

## Akses Aplikasi

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

Launcher tanpa terminal:

```text
start-monitoring-supplier-tray.vbs
```

Launcher ini menampilkan icon di hidden tray Windows. Klik kanan icon `Monitoring Supplier` untuk membuka aplikasi, melihat status, atau restart service.

Login awal:

```text
Username: admin
Password: admin123
```

---

## Backup Otomatis

Backup manual lengkap, termasuk database PostgreSQL dan folder `server/uploads`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\auto-backup.ps1 -RetentionDays 30
```

Pasang jadwal backup otomatis harian jam 23:00:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-backup-task.ps1 -At 23:00 -RetentionDays 30
```

Jika ingin backup ikut tersalin ke cloud, isi `BACKUP_CLOUD_DIR` di `server/.env` dengan folder sinkronisasi cloud, misalnya folder OneDrive atau Google Drive Desktop.

Di mesin ini konfigurasi yang disarankan:

```env
BACKUP_CLOUD_DIR=C:\Users\matra\OneDrive\Monitoring Supplier Backups
```

Jika `BACKUP_CLOUD_DIR` kosong, script akan mencoba otomatis memakai folder OneDrive atau Google Drive Desktop yang sudah login di Windows.

---

## Akses Online Cloudflare Tunnel

Gunakan Cloudflare Tunnel agar aplikasi lokal bisa diakses online tanpa memindahkan database dan tanpa membuka port router.

1. Buka `https://dash.cloudflare.com/?to=/:account/zero-trust/networks/tunnels`.
2. Login Cloudflare.
3. Masuk ke `Zero Trust > Networks > Tunnels`.
4. Buat tunnel baru, misalnya `monitoring-supplier-local`.
5. Pilih connector `Windows`.
6. Copy token atau command install yang diberikan Cloudflare.
7. Jalankan salah satu command berikut di folder project:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-cloudflare-tunnel.ps1 -Token "TOKEN_DARI_CLOUDFLARE"
```

atau:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-cloudflare-tunnel.ps1 -InstallCommand "COMMAND_INSTALL_DARI_CLOUDFLARE"
```

Saat menambahkan `Public hostname` di Cloudflare:

```text
Service Type: HTTP
URL: http://localhost:3000
```

Frontend dan API akan tetap memakai service lokal. Database tetap di PostgreSQL lokal.

---

## Verifikasi Setup

Cek apakah semua berjalan baik:

1. Frontend terbuka: http://localhost:3000
2. Bisa login memakai user awal
3. Dashboard muncul

Jika ada error, cek:

```bash
curl http://localhost:4000/health
psql -U postgres -d monitoring_supplier -c "SELECT 1"
```

---

## Troubleshooting

### Error: Connection refused on port 4000

Backend belum running. Jalankan:

```bash
cd server
npm run start
```

### Error: PGPASSWORD

Password PostgreSQL salah. Cek nilai `PGPASSWORD` di `server/.env`.

### Error: database monitoring_supplier does not exist

Database belum dibuat. Jalankan:

```bash
psql -U postgres -c "CREATE DATABASE monitoring_supplier;"
```

### Port 3000 atau 4000 sudah terpakai

Matikan service lama atau ubah port sesuai kebutuhan.

---

## Informasi Lanjut

- Lihat `README.md` untuk dokumentasi lengkap.
- Docs tambahan ada di folder `docs/`.
- Database schema ada di folder `docs/`.
