# Tutorial Hosting Aplikasi dengan Database yang Sudah Ada

Panduan ini menjelaskan cara menyiapkan dan menjalankan aplikasi **Monitoring Supplier & Kanban MRP System** di server atau mesin hosting dengan database PostgreSQL yang sudah tersedia.

## 1. Prasyarat

Pastikan server/mesin hosting Anda memiliki:

- Node.js v18+ terinstal
- npm terinstal
- Database PostgreSQL tersedia dan bisa diakses
- Akses ke folder aplikasi (clone repo atau copy file)
- Port terbuka untuk frontend dan backend sesuai kebutuhan

> Jika ingin hosting frontend di server yang sama, Anda bisa menggunakan `npm run build` dan `serve` atau Nginx. Jika ingin menggunakan `vite preview`, itu cocok untuk staging/testing tetapi bukan produksi terbaik.

## 2. Clone atau copy repositori

```bash
git clone https://github.com/adinas4/Master-Schedule-Kanban-System-MSK-S-.git
cd Master-Schedule-Kanban-System-MSK-S-
```

Jika Anda sudah memiliki file di server, cukup pastikan semua file terbaru sudah ada.

## 3. Install dependencies

### 3a. Frontend

```bash
npm install
```

### 3b. Backend

```bash
cd server
npm install
cd ..
```

## 4. Siapkan database yang sudah ada

Karena Anda sudah punya database, cukup gunakan konfigurasi PostgreSQL yang sesuai pada file backend.

### 4a. Buat file `server/.env`

Isi `server/.env` dengan informasi koneksi database Anda:

```text
PORT=4000
PGHOST=alamat_db_anda
PGPORT=5432
PGUSER=user_db_anda
PGPASSWORD=password_db_anda
PGDATABASE=nama_database_anda
JWT_SECRET=secret_anda
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
BACKUP_DIR=backups
```

Jika database berada di mesin lain, ganti `PGHOST` dengan alamat host database tersebut.

### 4b. Pastikan database dapat diakses

Tes koneksi dari server:

```bash
psql "host=alamat_db_anda port=5432 user=user_db_anda password=password_db_anda dbname=nama_database_anda" -c "SELECT 1;"
```

Jika berhasil, berarti backend bisa terhubung.

## 5. Konfigurasi frontend

Buat file `.env` di folder root aplikasi:

```text
VITE_API_BASE=http://alamat_server_anda:4000
```

Untuk mode LAN HTTPS bawaan repo ini, `VITE_API_BASE` bersifat opsional karena frontend sudah memakai proxy `/api` ke backend.

Untuk hosting di server yang sama tanpa proxy, Anda dapat menggunakan:

```text
VITE_API_BASE=http://localhost:4000
```

Jika frontend dijalankan pada host yang berbeda dari backend, ganti `http://localhost:4000` menjadi URL backend yang bisa diakses.

## 6. Build frontend untuk produksi

Jalankan di root repo:

```bash
npm run build
```

Akan terbentuk folder `dist/` berisi file statis frontend.

## 7. Jalankan backend

### Opsi 1: Jalankan langsung

```bash
cd server
npm run start
```

### Opsi 2: Jalankan dengan PM2 (direkomendasikan untuk hosting)

Install PM2 jika belum:

```bash
npm install -g pm2
```

Jalankan backend:

```bash
cd server
pm2 start npm --name monitoring-supplier-server -- run start
pm2 save
```

Dengan PM2, aplikasi backend akan tetap berjalan meskipun terminal ditutup.

## 8. Host frontend

### Opsi 1: Serve statis dengan `serve`

Install package `serve`:

```bash
npm install -g serve
```

Jalankan:

```bash
serve -s dist -l 3000
```

### Opsi 2: Gunakan Nginx/Apache untuk serve file statis

Jika Anda ingin setup produksi yang lebih baik, gunakan Nginx untuk serve `dist/` dan proxy `api` ke backend.

Contoh konfigurasi Nginx sederhana:

```
server {
  listen 80;
  server_name domain_atau_ip_anda;

  root /path/ke/monitoring-supplier/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection keep-alive;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Sesuaikan `server_name` dan `root` dengan server Anda.

### Opsi 3: Jalankan frontend dengan Vite preview untuk staging

```bash
npm run preview -- --host 0.0.0.0 --port 3000
```

Tetapi untuk produksi, lebih baik gunakan file statis dari `dist/`.

### Opsi 4: Mode LAN HTTPS untuk kamera QR

Untuk kebutuhan kamera di browser, jalankan frontend dengan HTTPS bawaan repo:

```bash
npm run host
```

Lalu buka:

- `https://localhost:3000`
- `https://192.168.1.194:3000`

Di mesin dev, repo ini juga menyediakan launcher browser yang membuka URL HTTPS dengan flag dev agar sertifikat lokal tidak menghambat akses.

## 9. Akses aplikasi

Buka browser dan kunjungi:

- Frontend: `https://alamat_server_anda:3000` untuk mode LAN HTTPS
- Backend API: `http://alamat_server_anda:4000`

Jika menggunakan Nginx, frontend akan diakses melalui domain atau IP tanpa port jika Anda menggunakan port 80.

## 10. Tips tambahan

- Pastikan port 4000 dan 3000 tidak diblokir oleh firewall.
- Jika backend berada di server lain, pastikan backend dapat diakses oleh frontend dari jaringan yang sama.
- Jangan masukkan file `server/.env` ke GitHub.
- Jika ingin automatic restart, gunakan PM2:

```bash
pm2 startup
pm2 save
```

---

## 11. Contoh environment untuk hosting dengan database yang sudah ada

Jika database Anda sudah tersedia di host `db.example.com`:

`server/.env`:
```
PORT=4000
PGHOST=db.example.com
PGPORT=5432
PGUSER=monitor_user
PGPASSWORD=monitor_pass
PGDATABASE=monitoring_supplier
JWT_SECRET=secret_anda
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
BACKUP_DIR=backups
```

`.env` root frontend:
```
VITE_API_BASE=http://domain_anda:4000
```

---

## 12. Troubleshooting

- `ECONNREFUSED` ke database: cek `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, dan akses jaringan ke DB.
- `Cannot GET /` di browser: pastikan frontend sudah build dan dikonfigurasi untuk serve `dist/`.
- Error CORS: backend harus menerima request dari origin frontend. Jika backend menolak, sesuaikan konfigurasi CORS di `server/index.js`.
- `Cannot POST /api/receive-notes/check-do`: backend live belum memuat source terbaru. Restart proses API yang menjalankan `server/index.js` atau redeploy backend, lalu cek lagi status `POST /api/receive-notes/check-do` harusnya `401/403`, bukan `404`.

---

Selamat! Sekarang aplikasi Anda bisa di-host dengan menggunakan database PostgreSQL yang sudah ada.
