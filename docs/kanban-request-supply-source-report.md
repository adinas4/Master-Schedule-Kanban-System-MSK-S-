# Kanban Request Supply Source

## Tujuan

Konfigurasi `kanban_request_supply_source` menentukan sumber kontrol supply saat Kanban Request diproses. Trigger tetap mengikuti flow Kanban yang sudah ada. Master Kanban tidak menyimpan PO atau PRL.

Nilai konfigurasi:

- `po_master`
- `prl`

## Mode PO Master

Saat mode `po_master`, request untuk item Raw Material, RM, Indirect Material, Consumable, dan SSP divalidasi terhadap PO master.

Aturan proses:

- PO harus berstatus `open` atau `partial`.
- PO tidak boleh `force_closed`.
- PO hanya aktif untuk bulan berjalan berdasarkan `po_date`.
- Jika sudah berganti bulan, PO bulan sebelumnya tidak dipakai untuk proses Kanban Request.
- Qty request tidak boleh melebihi sisa PO aktif.
- Sisa PO dihitung dari qty PO dikurangi qty received dan outstanding schedule.
- Qty yang sudah dipakai oleh Kanban Request aktif lain ikut dianggap reserved.

Jejak di request:

- `supply_source = po_master`
- `supply_ref = nomor PO dan line`
- `po_number`
- `po_line_id`
- `po_qty_remaining_snapshot`
- `supply_qty_remaining_snapshot`

Jika PO tidak cukup, proses approve / approve + DN / create DN ditolak.

## Mode PRL

Saat mode `prl`, request untuk item Raw Material, RM, Indirect Material, Consumable, dan SSP divalidasi terhadap PRL bulan berjalan.

Aturan proses:

- PRL harus tersedia untuk periode bulan berjalan.
- PRL harus berstatus aktif atau manual.
- Qty request tidak boleh melebihi sisa PRL bulan berjalan.
- Sisa PRL dihitung dari rencana PRL dikurangi Kanban Request bulan berjalan yang belum rejected.
- Saat request yang sama sedang divalidasi ulang, qty request itu tidak dihitung dua kali.

Jejak di request:

- `supply_source = prl`
- `supply_ref = PRL:tahun:bulan:id`
- `supply_qty_remaining_snapshot`

Jika PRL belum aktif, belum tersedia, atau sisa PRL tidak cukup, proses approve / approve + DN / create DN ditolak.

## Dampak Operasional

Mode ini hanya mengubah validasi proses request. Pembuatan kartu, Master Kanban, perhitungan Kanban, dan trigger scan/manual tetap berjalan seperti sebelumnya.

Perubahan mode dilakukan dari Master Config: `Kanban Request Supply Source`.
