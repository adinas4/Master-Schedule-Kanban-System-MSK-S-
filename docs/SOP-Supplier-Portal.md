# SOP Supplier Portal

Dokumen ini menjelaskan penggunaan Supplier Portal untuk supplier yang login ke sistem.

## 1. Tujuan

Supplier Portal digunakan untuk:

- melihat daftar PO dan sisa order;
- melihat PRL yang sudah dirilis sebagai referensi kebutuhan supplier;
- memantau jadwal kedatangan;
- tracking DN sampai proses RN dan QC;
- mencetak DN cover dan label incoming supplier;
- upload dan melengkapi Mill Sheet;
- memakai AI untuk ringkasan PO/PRL, delivery, DN, Mill Sheet, dan performa;
- melihat laporan performa supplier masing-masing, termasuk QC incoming dan line claim material.

## 2. Alur Operasional

1. Buka menu `Supplier Portal`.
2. Masuk tab `PO / PRL` untuk cek PO, qty order, qty terima, sisa PO, dan PRL yang sudah dirilis.
3. Masuk tab `Jadwal Kedatangan` untuk cek tanggal rencana, status kedatangan, dan nomor SJ/DO.
4. Masuk tab `Tracking DN` untuk cek progress delivery: DN, Kirim, RN, QC, dan Selesai.
5. Buka detail DN, lalu klik `Label 1 DN` untuk cetak cover DN dan label package.
6. Jika Mill Sheet belum siap saat kirim, tetap kirim barang lalu lengkapi dokumen di tab `Mill Sheet` sesuai tenggang.
7. Setelah barang dikirim, diterima, dan dicek QC, cek tab `Laporan` untuk melihat performa supplier.
8. Jika material yang sudah release kemudian NG di line produksi, supplier dapat melihat dampaknya sebagai `Line Claim` pada performa.
9. Gunakan tombol `AI` untuk bertanya ringkasan data supplier sendiri, misalnya PRL rilis bulan ini, DN pending, jadwal late, atau Mill Sheet yang belum approve.

## 3. PO / PRL

Tab `PO / PRL` memiliki dua bagian:

- `Daftar PO`: PO resmi yang sudah masuk ke supplier, termasuk qty order, qty terima, sisa PO, qty terjadwal, dan detail line PO.
- `PRL Rilis Supplier`: forecast PRL yang sudah dirilis internal dengan status `RILIS`.

Catatan operasional:

- PRL tampil di portal setelah menu PRL internal dirilis.
- PRL adalah referensi kebutuhan forecast. Pengiriman tetap mengikuti PO/DN dan jadwal yang berlaku.
- Filter pencarian pada tab `PO / PRL` berlaku untuk PO dan PRL.
- Print/export dari tab ini menghasilkan rekap gabungan PO dan PRL.

## 4. SOP Label Incoming

| Kondisi | Tindakan |
| --- | --- |
| Semua item dikirim sesuai DN | Klik `Qty = DN Semua`, cek lot, lalu print. |
| Hanya item tertentu perlu custom package | Centang item, isi `Custom Package Bulk`, lalu klik `Apply Dipilih`. |
| Qty aktual berbeda dari DN | Edit `Qty Kirim Aktual` pada baris item terkait. |
| Lot perlu diganti | Edit `Lot Supplier` per item atau gunakan `Lot Dipilih`. |
| Custom package kosong | Sistem otomatis mengikuti SNP item. |
| Custom package berisi satu angka, contoh `70` | Sistem membuat label per 70 dan sisa otomatis. |
| Custom package berisi beberapa angka, contoh `70,70,40` | Sistem memakai list package manual tersebut. |

## 5. SOP Mill Sheet

| Kondisi | Tindakan |
| --- | --- |
| Mill Sheet sudah tersedia sebelum kirim | Upload di tab `Mill Sheet` sesuai DN/item, lalu tunggu review QC. |
| Mill Sheet belum siap saat barang dikirim | Barang tetap boleh dikirim dan diterima. RN dan stok tidak diblokir, tetapi dokumen wajib dilengkapi sesuai tenggang. |
| File salah upload atau ditolak QC | Upload ulang versi yang benar pada DN/item yang sama. |
| Dokumen melewati tenggang | Status dokumen menjadi perhatian QC dan masuk catatan performa/disiplin supplier. |

## 6. AI Supplier Portal

AI di Supplier Portal membaca konteks supplier yang sedang login saja.

Data yang bisa diringkas:

- PO dan sisa order;
- PRL yang sudah rilis;
- jadwal kedatangan dan status on time/late/too early;
- DN dan progress RN/QC;
- status Mill Sheet;
- laporan performa supplier.

Contoh pertanyaan:

- `PRL apa saja yang sudah rilis bulan ini?`
- `DN mana yang belum selesai?`
- `Jadwal mana yang terlambat minggu ini?`
- `Mill Sheet apa yang belum approve QC?`
- `Apa penyebab score supplier saya turun?`

## 7. Laporan Performa Supplier

Tab `Laporan` hanya menampilkan data supplier yang sedang login.

KPI yang ditampilkan:

- `Total Score`: gabungan ketepatan waktu, fulfillment qty, QC incoming, dan line claim material.
- `Ketepatan Waktu`: persentase jadwal yang datang on time.
- `Fulfillment Qty`: perbandingan qty diterima terhadap qty rencana.
- `QC + Line Claim`: kualitas berdasarkan log QC incoming dan klaim material yang ditemukan di line produksi.
- `Ringkasan DN`: status DN completed, pending, dan selisih/reject.

Supplier dapat filter periode, refresh, print, export CSV, dan export Excel dari tab laporan.
