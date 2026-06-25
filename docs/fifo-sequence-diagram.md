# Sequence Diagram Menu FIFO

Dokumen ini menggambarkan alur aktual menu **Management FIFO** berdasarkan implementasi saat ini.

## Catatan Implementasi

- Menu FIFO dibuka dari tab `Management FIFO`.
- Operasi utama FIFO saat ini adalah:
  - pilih item kanban,
  - `Auto Receive`,
  - `Auto Issue`,
  - hapus lot.
- **Saat ini alur FIFO masih berjalan di state React (`fifoLots`, `inventoryItems`) dan belum memanggil API backend khusus FIFO**.

Referensi utama:
- `src/tabs/TabFifo.jsx`
- `src/App.jsx`

## 1) Sequence Utama Menu FIFO

```mermaid
sequenceDiagram
    actor User as User
    participant UI as TabFifo.jsx
    participant App as App.jsx
    participant Inv as inventoryItems (state)
    participant Lots as fifoLots (state)

    User->>UI: Buka menu Management FIFO
    UI->>App: Render dashboard FIFO
    App->>Inv: Hitung stok item terpilih
    App->>Lots: Hitung lot FIFO aktif/depleted
    App-->>UI: Tampilkan summary + daftar item kanban

    User->>UI: Pilih Kanban Item
    UI->>App: setSelectedFifoKanban(kanbanId)
    App->>Lots: Filter lot by kanbanId
    App-->>UI: Tampilkan daftar lot urut FIFO
```

## 2) Sequence Auto Receive

```mermaid
sequenceDiagram
    actor User as User
    participant UI as TabFifo.jsx
    participant App as App.jsx
    participant Inv as inventoryItems (state)
    participant Lots as fifoLots (state)

    User->>UI: Klik "Auto Receive"
    UI->>App: handleFifoReceive()

    App->>App: Validasi selectedFifoKanban
    alt Kanban belum dipilih
        App-->>User: Alert "Pilih kanban terlebih dahulu."
    else Kanban dipilih
        App->>Inv: Cari inventory item by kanbanId
        App->>App: Ambil kanbanQty/minQty sebagai autoQty
        alt autoQty tidak tersedia
            App-->>User: Alert "Kanban Qty belum tersedia."
        else autoQty tersedia
            App->>Lots: Hitung next FIFO sequence
            App->>App: Generate lotNumber, batchNumber, rnNumber, dnNumber
            App->>Lots: Tambah newLot ke fifoLots
            App->>Inv: Tambah onHand = onHand + autoQty
            App-->>UI: Refresh summary dan tabel lot
        end
    end
```

## 3) Sequence Auto Issue

```mermaid
sequenceDiagram
    actor User as User
    participant UI as TabFifo.jsx
    participant App as App.jsx
    participant Inv as inventoryItems (state)
    participant Lots as fifoLots (state)

    User->>UI: Klik "Auto Issue"
    UI->>App: handleFifoIssue()

    App->>App: Validasi selectedFifoKanban
    alt Kanban belum dipilih
        App-->>User: Alert "Pilih kanban terlebih dahulu."
    else Kanban dipilih
        App->>Inv: Ambil kanbanQty sebagai issueQty
        alt issueQty tidak tersedia
            App-->>User: Alert "Kanban Qty belum tersedia."
        else issueQty tersedia
            App->>Lots: Hitung fifoTotalStock
            alt stok tidak cukup
                App-->>User: Alert "Stok tidak cukup."
            else stok cukup
                loop Urut lot FIFO paling awal
                    App->>Lots: Kurangi remainingQty lot aktif
                    App->>Lots: Jika 0, ubah status jadi Depleted
                end
                App->>Inv: Kurangi onHand = onHand - issueQty
                App-->>UI: Refresh summary dan tabel lot
            end
        end
    end
```

## 4) Sequence Hapus Lot FIFO

```mermaid
sequenceDiagram
    actor User as User
    participant UI as TabFifo.jsx
    participant App as App.jsx
    participant Lots as fifoLots (state)

    User->>UI: Klik ikon hapus pada lot
    UI->>App: handleFifoDelete(lotId)
    App->>User: Konfirmasi hapus
    alt User batal
        App-->>UI: Tidak ada perubahan
    else User setuju
        App->>Lots: Hapus lot dari fifoLots
        App-->>UI: Refresh tabel lot
    end
```

## 5) Alur Status Terkait FIFO di Kanban

Status request yang terkait dengan FIFO di alur kanban:

```text
requested/approved
-> dn_created
-> scheduled
-> in_transit
-> receiving
-> fifo
-> closed
```

Catatan:
- Pada menu Kanban, status `receiving` mengarah ke proses penerimaan.
- Setelah material masuk dan dipakai dalam kontrol stok, status dapat bergerak ke `fifo` lalu `closed`.
- Namun menu `Management FIFO` sendiri saat ini lebih berfungsi sebagai simulasi/operasional berbasis state frontend.
