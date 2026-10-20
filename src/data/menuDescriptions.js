export const MAIN_MENU_DESCRIPTIONS = {
  dashboard: 'Ringkasan kondisi operasional dan informasi penting lintas modul.',
  monitoring: 'Kelola jadwal kedatangan, penerimaan, dan tindak lanjut supplier.',
  'field-receiving': 'Catat penerimaan barang berdasarkan delivery note supplier.',
  'field-production': 'Jalankan aktivitas produksi dan pemakaian material.',
  quality: 'Periksa mutu material masuk, hold, reject, dan klaim supplier.',
  kanban: 'Kelola request, pengiriman, penerimaan, dan status kartu kanban.',
  fifo: 'Pantau urutan pemakaian lot agar material tertua digunakan lebih dulu.',
  inventory: 'Pantau saldo, reservasi, ketersediaan, lot, dan kartu stok.',
  andon: 'Tampilkan kondisi dan peringatan produksi pada layar monitoring.',
  subcon: 'Kelola pengiriman dan penerimaan material proses subcontractor.',
  prl: 'Kelola rencana kebutuhan part per model dan periode.',
  masterref: 'Kelola data acuan yang digunakan oleh seluruh transaksi.',
  settings: 'Atur pengguna, hak akses, dan konfigurasi sistem.',
  audit: 'Telusuri riwayat aktivitas dan perubahan data pengguna.',
  reports: 'Baca dan ekspor ringkasan operasional untuk analisis dan audit.',
};

export const REPORT_GROUP_DESCRIPTIONS = {
  supplier: 'Kinerja, target, dan pemenuhan kebutuhan oleh supplier.',
  inventory: 'Posisi, pergerakan, umur, dan nilai persediaan.',
  inbound: 'PO, penerimaan, serta ketepatan pengiriman material.',
  quality: 'Hasil inspeksi dan performa mutu material supplier.',
  prl: 'Realisasi terhadap rencana kebutuhan part yang sudah dirilis.',
  production: 'Beban kerja dan kecukupan kapasitas produksi.',
};

export const REPORT_DESCRIPTIONS = {
  rekap: 'Merangkum pemenuhan PO supplier dari jadwal, aktual datang, kuantitas, dan kualitas.',
  scorecard: 'Menilai kinerja supplier per periode berdasarkan delivery, kuantitas, dan kualitas.',
  'sasaran-mutu': 'Memantau pencapaian indikator mutu terhadap target yang ditetapkan.',
  'supplier-shortage': 'Menunjukkan kekurangan material per supplier yang perlu segera ditindaklanjuti.',
  'stock-coverage': 'Menghitung perkiraan berapa lama stok dapat memenuhi kebutuhan.',
  'stock-by-customer': 'Merangkum saldo stok berdasarkan kategori dan customer.',
  'slow-moving': 'Mengidentifikasi stok yang lambat bergerak atau sudah tidak bergerak.',
  'item-summary': 'Menampilkan ringkasan transaksi dan posisi kuantitas untuk setiap barang.',
  'fifo-violations': 'Mencatat pemakaian material yang tidak mengikuti urutan lot FIFO.',
  'inventory-value': 'Menghitung jumlah dan nilai persediaan berdasarkan data stok.',
  'all-mutations': 'Menelusuri seluruh histori material masuk, keluar, dan penyesuaian stok.',
  'rn-report': 'Menampilkan detail penerimaan material berdasarkan nomor Receive Note (RN).',
  'master-po-report': 'Memantau nilai, kuantitas, penerimaan, dan sisa setiap Purchase Order.',
  'inbound-performance': 'Membandingkan jadwal dengan kedatangan aktual untuk mengukur performa inbound.',
  'inbound-matrix': 'Memetakan rencana dan realisasi pengiriman harian dalam bentuk matriks.',
  'qc-report': 'Merangkum hasil QC, jumlah OK/NG, defect, PPM, dan status kasus mutu.',
  'outstanding-prl': 'Menunjukkan kebutuhan PRL yang belum terpenuhi atau belum selesai diproses.',
  'capacity-planning': 'Membandingkan beban produksi dengan kapasitas tersedia per hari atau work center.',
};

export const getMainMenuDescription = (key) => MAIN_MENU_DESCRIPTIONS[key] || '';
export const getReportDescription = (key) => REPORT_DESCRIPTIONS[key] || '';
