# SOP A4 Sistem Admin Kanban

## Alur Singkat
Login -> cek role/permission -> master data -> kanban setting -> auto/manual/scan request -> approval -> DN -> receiving -> closed

## Role Inti

| Role | Fokus |
|---|---|
| Admin | Full control |
| PPIC | Master, PRL, kanban |
| Warehouse | Schedule, delivery, receiving |
| Production | Scan QR, empty kanban |
| Purchasing | Vendor, PRL, supplier |
| Management | Monitoring, report |
| Supplier | Data supplier sendiri |

## Checklist Master Item

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

## Checklist Kanban Setting

- `itemCode`
- `active = true`
- `lotQty > 0`
- `minQty`
- `defaultSupplier`
- `dropZone`
- `cycleX`, `cycleY`, `cycleZ`
- `workHours`
- `safetyHours`
- `leadTimeDays`
- `maxQty`

## Gate Auto-Trigger

- stok `< minQty`
- belum ada request aktif untuk item itu
- `lotQty` valid
- supplier dari master referensi item terisi
- supplier bukan role `Schedule`

## Gate Manual Request

- pilih `kanbanId` dari Master Kanban agar item/on hand/qty ikut terisi
- `itemCode` terisi
- `requestQty` terisi
- `onHand` terisi
- setelah request dibuat, klik tombol `Scan` pada baris request untuk membawa Kanban ID ke tab Scan
- catatan request menyimpan `kanban: <Kanban ID>` agar kartu yang sama bisa dilacak
- user `production` tidak boleh manual, hanya scan

## Gate Scan / DN

- `kanbanId` valid dan bisa dipetakan ke `itemCode`
- qty kanban tersedia
- PRL bulan berjalan eligible
- request status `approved`
- supplier ada
- vendor role `Delivery Note`
- `Create Schedule` hanya untuk vendor role `Schedule`; vendor role `Delivery Note` diproses lewat DN Register/Delivery tanpa popup schedule

## Status Request

`triggered` -> `requested` -> `approved` -> `dn_created` -> `scheduled` -> `in_transit` -> `receiving` -> `fifo` -> `closed`

## Koreksi Receiving / Inbound

- RN `posted` tidak diedit langsung.
- Salah input item/qty/SJ/tanggal harus lewat **Batalkan/Reversal RN** di `Kanban Board > Receiving Notes`.
- Reversal membalik stok, ledger, sisa PO, dan actual Inbound Schedule.
- Jika schedule kembali qty `0`, sistem mengosongkan tanggal datang dan nomor SJ/DO agar bisa input ulang.
- RN asli tetap menjadi audit dengan status `reversed`; nomor SJ/DO bisa dipakai lagi setelah reversal.
- Jika stok dari RN sudah terpakai keluar, reversal otomatis ditolak.

## Tanda Masalah

- request tidak muncul: cek `active`, `minQty`, stok, `lotQty`, supplier, role vendor
- request macet di approval: cek status dan role approver
- DN gagal: cek `approved`, supplier, dan role vendor `Delivery Note`
- scan gagal: cek mapping `kanbanId`, qty, dan PRL

## Referensi Kode

- Role & menu: `src/App.jsx`
- Kanban board: `src/tabs/TabKanban.jsx`
- Validasi request & DN: `server/index.js`
