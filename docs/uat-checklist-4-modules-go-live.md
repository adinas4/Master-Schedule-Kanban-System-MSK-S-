# UAT Checklist: 4 Modules + Go-Live

## Inventory
- [ ] On hand stock matches expected stock for 5 sample items.
- [ ] Reserved qty is shown correctly after reservation data exists.
- [ ] Available qty = on hand - reserved.
- [ ] Low stock item is highlighted.
- [ ] Negative availability item is highlighted.
- [ ] Inventory export works.
- [ ] Inventory detail lot view loads without error.

## Kanban Board
- [ ] Request list loads without 500 error.
- [ ] Aging badge appears per request.
- [ ] Reject action requires reason.
- [ ] Manual close requires reason.
- [ ] Overdue/exception filters work.
- [ ] DN-created request still visible with correct status.
- [ ] Kanban event history remains intact after status change.

## PRL
- [ ] Monthly PRL data loads for selected year.
- [ ] Outstanding PRL report returns non-empty data for known month.
- [ ] Shortage-related PRL rows sort to the top.
- [ ] Suggested qty fields do not break existing PRL data.
- [ ] PRL export works.

## Master Ref
- [ ] Duplicate item code warning appears.
- [ ] Duplicate vendor/location warning appears.
- [ ] Missing mandatory field warning appears before save.
- [ ] Existing master edit still saves correctly.
- [ ] Item with transaction history does not break after edit.

## Report Shortage Supplier
- [x] Report menu entry is visible for `viewReport` role.
- [x] Month/year filter returns correct period.
- [x] Supplier shortage rows load without error.
- [x] Excel export downloads successfully.
- [ ] PDF print layout works on A4.
- [x] Summary totals match table totals.
- [x] At least 3 sample items have verified shortage calculation.
- [x] Supplier security filter on report endpoint (`supplierId`) is enforced.
- [ ] Evidence reviewed in browser for final sign-off.

## Role and Access
- [ ] Admin can open `Pengaturan` and `Audit Trail`.
- [ ] Non-admin cannot open `Audit Trail`.
- [ ] Supplier role cannot see internal reports that are restricted.

## Go-Live Readiness
- [ ] Backend starts cleanly on target host.
- [ ] Frontend can call backend using target URL.
- [ ] Login works after deployment.
- [ ] Backup job runs and output is accessible.
- [ ] Restore procedure tested on non-production database.
- [ ] Smoke test passes:
  - login
  - inbound list
  - kanban request list
  - inventory page
  - reports page

## UAT Sign-Off
- [ ] Planner sign-off
- [ ] Warehouse sign-off
- [ ] Admin sign-off
- [ ] IT/Hosting sign-off
- [ ] Management preview sign-off for shortage report
