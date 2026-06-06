# 📖 Tutorial Clone & Jalankan Proyek dari GitHub

Panduan lengkap untuk **clone dan menjalankan** proyek Monitoring Supplier di laptop Anda.

---

## 📋 Yang Anda Butuhkan Sebelum Mulai

Pastikan sudah install:

1. **Git** - [Download di sini](https://git-scm.com/download)
2. **Node.js v18+** - [Download di sini](https://nodejs.org/)
3. **PostgreSQL 12+** - [Download di sini](https://www.postgresql.org/download/)

### Verifikasi instalasi:
```bash
git --version
node --version
npm --version
psql --version
```

---

## 🚀 STEP 1: Clone Repository dari GitHub

Buka **Command Prompt** atau **PowerShell** dan jalankan:

```bash
git clone https://github.com/adinas4/Master-Schedule-Kanban-System-MSK-S-.git
```

**Output yang diharapkan:**
```
Cloning into 'Master-Schedule-Kanban-System-MSK-S-'...
remote: Enumerating objects: 120, done.
...
Unpacking objects: 100% (120/120), done.
```

### Masuk ke folder project:
```bash
cd Master-Schedule-Kanban-System-MSK-S-
```

---

## 📦 STEP 2: Install Dependencies

### 2a. Install Frontend Dependencies:

```bash
npm install
```

**Tunggu sampai selesai** (±2-3 menit, tergantung internet)

### 2b. Install Backend Dependencies:

```bash
cd server
npm install
cd ..
```

**Output akan terlihat seperti:**
```
added XXX packages in X seconds
```

---

## 🗄️ STEP 3: Setup Database PostgreSQL

### 3a. Buat Database Baru

**Cara 1: Menggunakan pgAdmin (Graphical)**
1. Buka **pgAdmin** (Aplikasi GUI PostgreSQL)
2. Expand **Servers** → klik kanan di **Databases**
3. Pilih **Create** → **Database**
4. Nama: `monitoring_supplier`
5. Klik **Save**

**Cara 2: Menggunakan Command Line**
```bash
psql -U postgres
```

Kemudian di prompt psql:
```sql
CREATE DATABASE monitoring_supplier;
\q
```

**Verifikasi database sudah dibuat:**
```bash
psql -U postgres -l | findstr monitoring_supplier
```

---

## ⚙️ STEP 4: Setup Environment Variables

### 4a. Backend Environment - Buat file `server/.env`

**Lokasi:** Buka folder `server/` dan buat file baru bernama `.env`

**Isi file `server/.env`:**
```
PORT=4000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=monitoring_supplier
JWT_SECRET=your_secret_key_12345
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
BACKUP_DIR=backups
```

> ⚠️ **PENTING:** Ganti `your_password_here` dengan **password PostgreSQL Anda** (yang Anda atur saat install PostgreSQL)

### 4b. Frontend Environment - Buat file `.env` di root

**Lokasi:** Di folder utama project (Master-Schedule-Kanban-System-MSK-S-)

**Isi file `.env`:**
```
VITE_API_BASE=
```

**Catatan:** Biarkan kosong agar otomatis detect backend di localhost:4000

---

## ✅ STEP 5: Jalankan Aplikasi

### 5a. Terminal 1 - Jalankan Backend

```bash
cd server
npm run start
```

**Tunggu sampai muncul:**
```
Server running on http://localhost:4000
```

### 5b. Terminal 2 - Jalankan Frontend

Buka **terminal/command prompt BARU** (jangan close terminal pertama!)

```bash
npm run host
```

**Tunggu sampai muncul:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

---

## 🌐 STEP 6: Akses Aplikasi

### Buka Browser dan Akses:

```
http://localhost:3000
```

### Login dengan:
- **Username:** `admin`
- **Password:** `admin123`

---

## 📸 Verifikasi Semuanya Berfungsi

✅ Pastikan:
1. Browser terbuka aplikasi tanpa error
2. Bisa login dengan admin/admin123
3. Dashboard menampilkan data (atau kosong tapi tidak error)
4. Terminal backend tidak menunjukkan error merah

---

## 🛑 Troubleshooting - Jika Ada Error

### ❌ Error: "Cannot find module..."
**Solusi:**
```bash
npm install
cd server
npm install
cd ..
```

### ❌ Error: "ECONNREFUSED on port 4000"
**Backend tidak jalan.** Pastikan:
```bash
cd server
npm run start
```

### ❌ Error: "database monitoring_supplier does not exist"
**Database belum dibuat.** Jalankan:
```bash
psql -U postgres -c "CREATE DATABASE monitoring_supplier;"
```

### ❌ Error: "PGPASSWORD invalid"
**Password PostgreSQL salah.** Cek:
1. Buka `server/.env`
2. Cek `PGPASSWORD=` - pastikan sesuai password saat install PostgreSQL
3. Jika lupa, reset di pgAdmin atau gunakan `postgres` sebagai default

### ❌ Error: "Port 3000 sudah digunakan"
**Port sudah dipakai.** Gunakan port lain:
```bash
npm run host -- --port 5000
```
Akses: `http://localhost:5000`

### ❌ Error: "Cannot GET /" di browser
**Frontend belum jalan.** Pastikan sudah jalankan:
```bash
npm run host
```

---

## 📝 Struktur Folder Yang Perlu Dipahami

```
Master-Schedule-Kanban-System-MSK-S-/
│
├── src/                          # Frontend React code
│   ├── components/               # React components
│   ├── tabs/                     # Main tab modules
│   └── App.jsx                   # Main app
│
├── server/                       # Backend Node.js/Express
│   ├── index.js                  # Server entry point
│   ├── .env                      # Backend config (jangan commit!)
│   └── scripts/                  # Database scripts
│
├── docs/                         # Documentation & diagrams
├── public/                       # Static files
│
├── .env                          # Frontend config
├── .env.example                  # Template config
├── .gitignore                    # Git ignore rules
├── package.json                  # Frontend dependencies
└── SETUP_LOKAL.md               # Detailed setup guide
```

---

## 🔄 Workflow Sehari-hari (Development)

Setiap kali ingin develop/test:

**Terminal 1:**
```bash
cd server
npm run start
```

**Terminal 2:**
```bash
npm run host
```

Aplikasi siap di: `http://localhost:3000`

---

## 📚 File Penting Untuk Dibaca

Setelah clone, baca file-file ini untuk pemahaman:

- `README.md` - Dokumentasi lengkap proyek
- `SETUP_LOKAL.md` - Guide setup detail
- `docs/` - Schema database, design docs
- `.env.example` - Template environment variables

---

## ✨ Selesai!

Sekarang Anda siap untuk:
- ✅ Development local
- ✅ Testing fitur
- ✅ Debugging issue
- ✅ Membuat pull request

---

## 🆘 Masih Ada Masalah?

Jika stuck, cek:

1. **Pastikan Terminal tidak di-close** (jalankan di 2 terminal berbeda)
2. **Cek .env file** (pastikan password PostgreSQL benar)
3. **Cek PORT** (pastikan 3000 & 4000 tidak terpakai)
4. **Restart services:**
   ```bash
   # Stop (Ctrl+C di masing-masing terminal)
   # Mulai ulang npm run start dan npm run host
   ```

---

## 📞 Butuh Bantuan?

Hubungi tim development atau buat Issue di GitHub:
https://github.com/adinas4/Master-Schedule-Kanban-System-MSK-S-/issues

---

**Happy Coding! 🚀**
