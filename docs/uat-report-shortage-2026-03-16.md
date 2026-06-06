# UAT Evidence - Report Shortage Supplier

Date: 16 March 2026  
Environment: local (`http://127.0.0.1:4000`, PM2)  
Tester: Codex (API-level verification)

## Scope Executed

1. Auth login admin and access report endpoint.
2. Endpoint period filter (`month`, `year`) behavior.
3. Summary vs detail consistency.
4. Formula verification for 3 sample rows.
5. Supplier security filter behavior.

## Results

### 1) Endpoint accessible with `viewReport` token

- Request: `GET /api/reports/supplier-shortage?month=mar&year=2026`
- Result: PASS
- Evidence:
  - `rows=136`
  - `summary.totalItems=136`
  - `summary.totalSuppliers=3`
  - `summary.totalShortageQty=603207.8`

### 2) Period filter behavior

- Request: `month=jan&year=2026`
- Result: PASS (`rows=135`, `monthKey=jan`, `year=2026`)

- Request: invalid `month=abc&year=2026`
- Result: PASS (fallback to current month key, returned `monthKey=mar`)

- Request: invalid `year=0` with `month=mar`
- Result: PASS (fallback to current year, returned `year=2026`)

### 3) Summary totals match detail rows

- Result: PASS
- Evidence:
  - `summary.totalShortageQty=603207.8`
  - `sum(rows.shortageQty)=603207.8`
  - `summary.urgentItems=0`
  - `count(rows where status='URGENT')=0`
  - `summary.totalSuppliers=3`
  - `count(unique supplierName)=3`

### 4) Formula spot-check (3 items)

Formula check used:
- `expectedShortage = max(planQty + safetyStock - stockQty, 0)`
- Checked only for sample rows where `shortageQty == totalShortage` (single-supplier allocation)

Samples:
- `SP6`: expected `3283`, actual `3283` (PASS)
- `AJ7`: expected `25887`, actual `25887` (PASS)
- `AJ8`: expected `25887`, actual `25887` (PASS)

### 5) Supplier security filter

- Synthetic supplier token with `supplierId='ISTW'`:
  - Result set only contains `supplierId=ISTW` (PASS)
  - `hasOtherSupplier=False` (PASS)

- Supplier token without `supplierId`:
  - Endpoint returns `403` (PASS)

## Pending Manual UI Checks

These still need browser/manual validation:
- PDF print layout on A4.

## UI Automation Checks (Playwright)

- Script: `scripts/uat-report-shortage-ui.cjs`
- Result: PASS
- Verified:
  - Menu `Laporan -> Report Shortage Supplier` visible and clickable for admin (`viewReport`).
  - Table is populated after `Terapkan`.
  - Excel export download succeeded.
- Download evidence:
  - `tmp-downloads/uat_supplier_shortage_1773620086475.xlsx`
