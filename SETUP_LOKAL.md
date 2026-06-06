# 🚀 Panduan Setup Lokal (Local Development)

Panduan ini untuk menjalankan proyek **Monitoring Supplier & Kanban MRP System** di laptop Anda sendiri.

---

## 📋 Prerequisites (Yang Perlu Diinstall Dulu)

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **PostgreSQL** v12+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

Cek versi:
```bash
node --version
npm --version
psql --version
```

---

## 🔧 Step 1: Clone Repository

```bash
git clone https://github.com/adinas4/Master-Schedule-Kanban-System-MSK-S-.git
cd Master-Schedule-Kanban-System-MSK-S-
```

---

## 📦 Step 2: Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

---

## ⚙️ Step 3: Setup Database PostgreSQL

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

**Backend** - Buat file `server/.env`:

```
PORT=4000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=monitoring_supplier
JWT_SECRET=your_secret_key_here
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
BACKUP_DIR=backups
```

> ⚠️ **Ganti `your_password_here` dengan password PostgreSQL Anda**

**Frontend** - Buat file `.env` di root folder:

```
VITE_API_BASE=
```

Biarkan kosong agar otomatis auto-detect backend di `localhost:4000`

---

## ▶️ Step 4: Jalankan Aplikasi

### Terminal 1 - Jalankan Backend:

```bash
cd server
npm run start
```

Expected output:
```
Server running on http://localhost:4000
```

### Terminal 2 - Jalankan Frontend (baru):

```bash
npm run host
```

Expected output:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

---

## 🌐 Akses Aplikasi

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000

### Login Credentials:
```
Username: admin
Password: admin123
```

---

## 🧪 Verifikasi Setup

Cek apakah semua berjalan baik:

1. **Frontend terbuka?** → Buka http://localhost:3000
2. **Bisa login?** → Gunakan admin/admin123
3. **Dashboard muncul?** → Data sample ada?

Jika ada error, cek:

```bash
# Cek backend running
curl http://localhost:4000

# Cek database connection
psql -U postgres -d monitoring_supplier -c "SELECT 1"
```

---

## 🛑 Troubleshooting

### Error: "Connection refused on port 4000"
```bash
# Backend tidak running. Pastikan:
cd server && npm run start
```

### Error: "PGPASSWORD"
```bash
# Password PostgreSQL salah. Cek di server/.env
# Atau reset password PostgreSQL
```

### Error: "database monitoring_supplier does not exist"
```bash
# Database belum dibuat. Jalankan:
psql -U postgres -c "CREATE DATABASE monitoring_supplier;"
```

### Port 3000/4000 sudah terpakai?
```bash
# Ganti port di package.json atau script
npm run start -- --port 5000
```

---

## 📚 Informasi Lebih Lanjut

- Lihat `README.md` untuk dokumentasi lengkap
- Docs ada di folder `docs/`
- Database schema ada di `docs/`

---

## ✅ Selesai!

Sekarang Anda bisa mulai testing dan development! 🎉

Jika ada pertanyaan, buka issue di GitHub atau hubungi tim development.
