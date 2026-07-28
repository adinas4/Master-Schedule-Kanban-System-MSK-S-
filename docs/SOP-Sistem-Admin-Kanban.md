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
- Sebelum stok benar-benar dipakai produksi, incoming dari RN atau Inbound wajib masuk proses `Quality Control > Incoming RN` untuk sampling QC.
- Jika sampling incoming OK, QC release barang sehingga stok batch dapat digunakan.
- Jika raw material NG ditemukan setelah release saat proses line produksi, jangan batalkan RN dan jangan kembalikan ke Incoming QC. Buat kasus baru di `Quality Control > Material NG Line`.
- Pada Material NG Line, pilih item raw material, ketik/cari batch FIFO/RN, isi qty NG, line/proses/operator/shift, kategori defect, dan detail defect.
- Saat kasus Material NG Line disimpan, sistem menahan stok batch terkait. Disposition yang dipakai: `Sortir`, `Return`, `Scrap`, `Rework`, atau `Use As Is`.
- Performance supplier menghitung dua sumber kualitas: QC incoming sampling dan line claim material yang lolos sampling tetapi NG di proses.
- Jika ada masalah, request bisa `rejected` atau dihapus sesuai izin.
- RN yang sudah `posted` tidak boleh diedit langsung dan tidak menjadi data mentah.
- Jika salah input item, qty, nomor SJ/DO, atau tanggal aktual, lakukan **Batalkan/Reversal RN** dari menu `Kanban Board > Receiving Notes`.
- Reversal wajib memakai alasan koreksi, misalnya `Salah input BR45, seharusnya BR50`.
- Setelah reversal berhasil:
  - RN asli berubah status menjadi `reversed` sebagai audit/history.
  - Sistem membuat dokumen reversal resmi.
  - Stok batch dan ledger dibalik.
  - Data actual di Inbound Schedule ikut dibatalkan: `received_qty` kembali sesuai sisa, dan jika qty menjadi 0 maka `arrival_date` serta `do_number` dikosongkan.
  - Nomor SJ/DO yang sama boleh dipakai lagi untuk input ulang penerimaan yang benar.
- Di `Quality Control > Incoming RN`, RN reversal atau RN yang sudah dibatalkan hanya boleh diproses sebagai `Close Review`.
- QC tidak boleh klik `Release`, `Hold`, `Reject`, atau `Return` untuk RN batal/reversal karena dokumen tersebut adalah bukti koreksi, bukan penerimaan barang baru.
- Checklist `Close Review` RN batal:
  - alasan reversal jelas;
  - stok batch dan ledger sudah dibalik;
  - sisa PO/schedule sudah kembali benar;
  - jika barang fisik tetap diterima, penerimaan dibuat ulang dengan RN baru yang benar.
- Jika masalahnya defect/NG material, jangan batalkan RN. Pakai proses QC `Hold`, `Reject`, atau `Return Supplier` supaya histori kualitas supplier tetap tercatat.
- Jika masalahnya duplicate RN, batalkan RN duplicate, link/rujuk ke RN valid pada catatan, lalu tutup review QC sebagai koreksi duplicate.
- Jika stok batch dari RN tersebut sudah dipakai keluar (`qty_out > 0`), reversal otomatis ditolak. Lakukan pengecekan mutasi stok dulu sebelum koreksi.
- Untuk SOP harian, gunakan reversal, bukan hapus fisik. Hapus fisik hanya untuk admin pada data yang memang belum perlu audit dan belum berdampak transaksi.

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

