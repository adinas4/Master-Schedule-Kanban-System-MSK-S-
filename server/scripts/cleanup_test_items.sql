-- Cleanup script for TEST-* items and related data.
-- WARNING: Review before running in production.
-- This script is intended for a one-time cleanup during go-live.

BEGIN;

-- Collect all test item codes.
CREATE TEMP TABLE tmp_test_items AS
SELECT code
FROM items
WHERE code ILIKE 'TEST-%';

-- Collect related kanban requests and delivery notes.
CREATE TEMP TABLE tmp_test_requests AS
SELECT id
FROM kanban_requests
WHERE item_code IN (SELECT code FROM tmp_test_items);

CREATE TEMP TABLE tmp_test_dns AS
SELECT id
FROM delivery_notes
WHERE request_id IN (SELECT id FROM tmp_test_requests);

-- Collect schedules referencing test items.
CREATE TEMP TABLE tmp_test_schedules AS
SELECT id
FROM schedules
WHERE item IN (SELECT code FROM tmp_test_items)
   OR item ILIKE 'TEST-%';

-- Delete child rows that would block FK deletes.
DELETE FROM delivery_note_items
WHERE dn_id IN (SELECT id FROM tmp_test_dns);

DELETE FROM kanban_cards
WHERE dn_id IN (SELECT id FROM tmp_test_dns)
   OR item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM dn_receive_scans
WHERE dn_id IN (SELECT id FROM tmp_test_dns)
   OR item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM receive_note_items
WHERE origin_dn_id IN (SELECT id FROM tmp_test_dns)
   OR item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM receive_notes
WHERE dn_id IN (SELECT id FROM tmp_test_dns)
   OR schedule_id IN (SELECT id FROM tmp_test_schedules);

DELETE FROM kanban_events
WHERE request_id IN (SELECT id FROM tmp_test_requests);

DELETE FROM delivery_notes
WHERE id IN (SELECT id FROM tmp_test_dns);

DELETE FROM kanban_requests
WHERE id IN (SELECT id FROM tmp_test_requests);

DELETE FROM inbound_cards
WHERE schedule_id IN (SELECT id FROM tmp_test_schedules);

DELETE FROM schedules
WHERE id IN (SELECT id FROM tmp_test_schedules);

-- Stock and inventory records.
DELETE FROM stock_movements
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM production_consumption
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM stock_batches
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM inventory_ledgers
WHERE item_id IN (SELECT code FROM tmp_test_items);

DELETE FROM so_items
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM fifo_violations
WHERE item_code IN (SELECT code FROM tmp_test_items);

-- Subcon flows.
DELETE FROM subcon_backflush_lines
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM subcon_stock_movements
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM subcon_stock_opname
WHERE item_code IN (SELECT code FROM tmp_test_items);

DELETE FROM subcon_receipts
WHERE product_code IN (SELECT code FROM tmp_test_items);

DELETE FROM subcon_deliveries
WHERE item_code IN (SELECT code FROM tmp_test_items);

-- Production orders and PRL.
DELETE FROM production_orders
WHERE product_code IN (SELECT code FROM tmp_test_items);

DELETE FROM prl_records
WHERE item_code IN (SELECT code FROM tmp_test_items);

-- Finally delete master items (cascades handle bom, settings, suppliers/customers).
DELETE FROM items
WHERE code IN (SELECT code FROM tmp_test_items);

COMMIT;
