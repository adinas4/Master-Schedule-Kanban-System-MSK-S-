# SOP Sistem Admin Kanban

## Tujuan
Menjelaskan alur kerja end-to-end sistem dari setup master sampai request, DN, receiving, dan report. SOP ini mengikuti implementasi role dan menu yang ada saat ini.

## Role dan Fokus

| Role | Fokus utama | Akses inti |
|---|---|---|
| Admin | Kontrol penuh | User, master, PRL, schedule, audit, report, settings |
| PPIC | Planning dan master | Master, item, PRL, schedule, kanban |
| Warehouse | Operasi gudang | Schedule, receiving, delivery, kanban |
| Production | Lapangan | Scan QR, empty kanban, produksi |
| Purchasing | Supplier dan PRL | Vendor, PRL, schedule, report |
| Management | Monitoring | Dashboard dan report |
| Supplier | Portal supplier | Data supplier sendiri |
| User umum | Akses dasar | Sesuai permission yang diberikan |

Referensi implementasi role dan permission ada di `src/App.jsx` dan `server/index.js`.

## Alur End-to-End

### 1) Setup Admin
- Admin buat user dan role.
- Admin memastikan permission sesuai fungsi kerja.
- Admin cek master data dan konfigurasi umum.

### 2) Master Data
- Input `Master Item`.
- Input `Master Vendor`, `Location`, `Category`, `Packing`, `Model`, `Process`, `Customer`, `Warehouse`, `Area`, `Delivery`, `Plant`.
- Pastikan item punya data dasar yang lengkap sebelum masuk kanban.

### 3) Kanban Setup
- Buat atau generate `Kanban Setting` dari item master.
- Isi parameter minimum:
  - `itemCode`
  - `active = true`
  - `lotQty > 0`
  - `minQty`
  - `defaultSupplier`
  - `dropZone`
- Parameter tambahan yang disarankan:
  - `maxQty`
  - `leadTimeDays`
  - `safetyFactor`
  - `regularKanban`
  - `safetyHours`
  - `workHours`
  - `cycleX`, `cycleY`, `cycleZ`

### 4) Request Kanban
- Request bisa muncul dari:
  - auto-trigger saat stok di bawah minimum
  - manual request
  - scan QR / kanban kosong
- Status awal request: `requested`.
- Request aktif tidak boleh dobel untuk item yang sama.

### 5) Approval
- User dengan `editSchedules` melakukan review request.
- Request manual hanya bisa di-approve oleh `supervisor` atau `admin`.
- Status valid untuk approval: `triggered` atau `requested`.

### 6) DN dan Delivery
- Request harus `approved` sebelum dibuat DN.
- Supplier harus diisi.
- Vendor supplier harus role `Delivery Note`.
- Setelah DN dibuat, request berpindah ke status `dn_created`.

### 7) Receiving dan Close
- Warehouse menerima barang berdasarkan DN.
- Status lanjut ke `scheduled`, `in_transit`, `receiving`, `fifo`, lalu `closed`.
- Jika ada masalah, request bisa `rejected` atau dihapus sesuai izin.

### 8) Reporting
- Management dan role yang diberi akses melihat dashboard dan report.
- Admin dapat audit dan reset sesuai permission.

## Checklist Validasi Penting

### Master Item
- `code`
- `name`
- `type`
- `unit`
- `packQty > 0`
- `safety_stock`
- `vendorId` atau `supplier_name`
- `locationId` atau `lineProduction`
- `leadTimeDays`
- `orderLotSize`
- `maxDeliveryPerRit`

### Kanban Setting
- `itemCode`
- `active = true`
- `lotQty > 0`
- `minQty`
- `defaultSupplier`
- `dropZone`

### Auto-Trigger
- Stok `< minQty`
- Tidak ada request aktif untuk item itu
- `lotQty` valid
- `defaultSupplier` ada
- Supplier bukan role `Schedule`

### DN / Scan
- Request status `approved`
- Supplier terisi
- Vendor supplier role `Delivery Note`
- Untuk scan, `kanbanId` harus bisa dipetakan ke `itemCode`
- PRL bulan berjalan harus eligible untuk reorder

## Gate per Role

- Admin: bisa semua modul.
- PPIC: setup master, PRL, dan kanban.
- Warehouse: schedule, delivery, receiving.
- Production: scan QR, empty kanban, produksi.
- Purchasing: vendor dan PRL.
- Management: dashboard dan report.
- Supplier: hanya data milik supplier sendiri.

## Referensi Kode
- Role dan permission: `src/App.jsx`
- Menu Kanban dan subtab: `src/App.jsx`, `src/tabs/TabKanban.jsx`
- Auto-trigger dan validasi request: `server/index.js`
- Validasi form master item dan kanban setting: `src/App.jsx`

