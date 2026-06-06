# Schema Lock V1 - 4 Modules

Date locked: 13 March 2026

## Implemented in code

### Inventory
- `inventory_reservations`
- `inventory_allocations`

### Kanban
- `kanban_requests.sla_due_at`
- `kanban_requests.exception_code`
- `kanban_requests.exception_note`

### PRL
- `prl_records.source_type`
- `prl_records.source_ref`
- `prl_records.suggested_qty`
- `prl_records.approved_qty`
- `prl_records.approved_by`
- `prl_records.approved_at`
- `prl_records.due_date`
- `prl_records.priority_score`

## Deferred to V2

### Master Ref
- item version history table
- vendor capability history table
- formal completeness score persistence

### Kanban
- dedicated SLA policy table
- escalation queue table

### Inventory
- reservation source enum normalization
- location-aware allocation table if warehouse granularity becomes mandatory

## Design notes
- Schema lock is additive only.
- No destructive migration in current sprint.
- Existing tables remain backward-compatible with current UI.
- New fields can be populated gradually after UAT.
