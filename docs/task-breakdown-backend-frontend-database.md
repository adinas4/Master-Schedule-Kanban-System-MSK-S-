# Task Breakdown: Backend, Frontend, Database

## Track A: Report Shortage Supplier

### Backend
- Add `GET /api/reports/supplier-shortage`.
- Compute monthly shortage from `prl_records`.
- Join supplier mapping from `item_suppliers`, `items.vendor_id`, `master_vendors`.
- Include stock snapshot from `stock_batches` and `subcon_stock_movements`.
- Include lead time from `supplier_lead_time_stats` fallback to master data.
- Return summary:
  - total suppliers
  - total items
  - urgent items
  - total shortage qty

### Frontend
- Add menu entry in `Laporan`.
- Add report page in `TabReports`.
- Add month/year filter.
- Add refresh, Excel export, PDF print.
- Show status badge:
  - `URGENT`
  - `LOW STOCK`
  - `SHORTAGE`

### Database
- No destructive migration.
- Reuse existing:
  - `prl_records`
  - `item_suppliers`
  - `supplier_lead_time_stats`
  - `stock_batches`
  - `subcon_stock_movements`

## Track B: Schema Lock V1

### Inventory
- Create `inventory_reservations`.
- Create `inventory_allocations`.
- Add indexes for item, source, reservation status.

### Kanban
- Add `sla_due_at` to `kanban_requests`.
- Add `exception_code` to `kanban_requests`.
- Add `exception_note` to `kanban_requests`.

### PRL
- Add `source_type`, `source_ref`.
- Add `suggested_qty`, `approved_qty`.
- Add `approved_by`, `approved_at`.
- Add `due_date`, `priority_score`.

### Master Ref
- No new table in current sprint.
- Governance rules handled first in UI and validation layer.
- Versioning table deferred until post quick-wins review.

## Track C: Quick Wins (23 March 2026 - 27 March 2026)

### Inventory
- Backend:
  - expose availability calculation endpoint or payload enrichment.
- Frontend:
  - show `Reserved` and `Available`.
  - alert badge for negative availability.
- Database:
  - start persisting reservations.

### Kanban Board
- Backend:
  - expose SLA and exception data.
- Frontend:
  - aging badge per row.
  - quick filter for overdue and blocked.
- Database:
  - use `sla_due_at`, `exception_code`, `exception_note`.

### PRL
- Backend:
  - expose urgency fields.
- Frontend:
  - priority sort and status grouping.
- Database:
  - populate `priority_score`, `due_date`.

### Master Ref
- Backend:
  - stronger duplicate and completeness validation.
- Frontend:
  - warnings before save/import.
- Database:
  - no schema change required for quick wins.

## Track D: Hosting / Go-Live

### Backend
- validate `.env` completeness.
- test backup and restore.
- verify auth token expiry behavior.
- verify report endpoints on target environment.

### Frontend
- verify `VITE_API_BASE` strategy.
- test LAN and hosted URL.
- check menu access by role.

### Database
- backup before migration.
- dry-run additive schema startup.
- verify startup on real snapshot data.

## Track E: April Kanban Backlog (Planned Only)

Status:
- backlog April / batch berikutnya
- bukan fokus implementasi minggu berjalan

### Feature 1: Visual Andon on Kanban Card

#### Backend
- expose deterministic urgency state untuk setiap request:
  - `safe`
  - `warning`
  - `critical`
- combine dari:
  - `sla_due_at`
  - exception / overdue state
  - `available stock < required qty`
- return reason code agar warna card tidak hanya cosmetic.

#### Frontend
- card / row Kanban berubah warna otomatis:
  - merah = critical
  - kuning = warning
  - hijau = safe
- tetap readable dari jarak jauh.
- sediakan legend singkat di board.

#### Database
- reuse `kanban_requests.sla_due_at`.
- reuse / extend `exception_code`, `exception_note`.
- tidak perlu tabel baru pada fase awal.

### Feature 2: Wave Picking / Grouping

#### Backend
- endpoint untuk create picking batch dari beberapa request terpilih.
- validasi:
  - request status masih eligible
  - item / area sesuai rule grouping
  - request belum masuk batch aktif lain

#### Frontend
- multi-select request di board.
- action `Group for Picking`.
- preview batch sebelum confirm.
- print / export worksheet picking gudang.

#### Database
- kandidat additive:
  - `kanban_pick_batches`
  - `kanban_pick_batch_items`
- jika ingin fase paling ringan, bisa mulai dari draft service + payload in-memory dulu lalu persist saat rule stabil.

### Feature 3: Auto-Trigger Draft PRL from Kanban Shortage

#### Backend
- saat request Kanban dibuat / disetujui, hitung shortage terhadap `Available`.
- jika `Available < required`, create PRL draft untuk selisihnya.
- simpan relasi:
  - `source_type = kanban_request`
  - `source_ref = request_id`
- guard anti-duplicate draft.

#### Frontend
- tampilkan indicator bahwa request memicu draft PRL.
- buyer/planner bisa trace draft PRL balik ke request Kanban asal.

#### Database
- pakai field PRL yang sudah direncanakan:
  - `source_type`
  - `source_ref`
  - `suggested_qty`
  - `due_date`
  - `priority_score`

### Feature 4: Print E-Kanban Tag

#### Backend
- bila perlu, endpoint render payload print per request / batch.
- payload minimum:
  - QR code value
  - item code / item name
  - qty
  - destination area

#### Frontend
- tombol print kecil di card Kanban.
- layout print format label / struk kecil.
- harus cepat untuk operasi gudang, bukan dokumen A4 formal.

#### Database
- tidak wajib schema baru pada fase awal.
- cukup reuse data request, item, dan tujuan area.

### Suggested Execution Order

1. Lock formula `Available` dan reservation source.
2. Stabilkan SLA + exception state di `kanban_requests`.
3. Implement auto-trigger draft PRL.
4. Implement visual Andon.
5. Implement wave picking/grouping.
6. Implement E-Kanban tag print.

### Main Risks

- warna Andon salah jika formula `Available` belum single-source.
- auto-trigger PRL berpotensi double draft tanpa idempotency/source guard.
- grouping gudang bisa bentrok dengan status request jika locking belum jelas.
- print tag berisiko jadi variasi layout berlebihan jika ukuran label belum dibakukan.
