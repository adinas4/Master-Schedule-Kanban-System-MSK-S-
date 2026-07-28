import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const sourceFilterArg = resolveArgValue("--source");
const sourceFilter = (sourceFilterArg || "ACTUAL_DRIVEN,LEGACY_SCHEDULE")
  .split(",")
  .map((value) => String(value || "").trim())
  .filter(Boolean);

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const normalizeText = (value) => String(value || "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();
const normalizePoNumber = (value) => normalizeText(value).toUpperCase();
const normalizeItemCode = (value) => normalizeText(value).toUpperCase();
const normalizeDoNumber = (value) => normalizeText(value).replace(/\s+/g, " ").trim().toUpperCase();

const getScheduleStatusFromActual = ({ requestDate, arrivalDate }) => {
  if (!arrivalDate) return "Pending";
  const reqKey = formatDateOnly(requestDate);
  const arrKey = formatDateOnly(arrivalDate);
  if (!reqKey || !arrKey) return "Pending";
  const diffDays = Math.round((new Date(`${arrKey}T00:00:00`) - new Date(`${reqKey}T00:00:00`)) / 86400000);
  if (diffDays >= -1 && diffDays <= 0) return "On Time";
  return arrKey > reqKey ? "Late" : "Too Early";
};

const refreshPoHeaderStatus = async (client, poNumber) => {
  const normalized = normalizePoNumber(poNumber);
  if (!normalized) return;
  await client.query(
    `
    update po_headers
    set status = case
      when not exists (
        select 1
        from po_lines
        where po_number = $1
          and qty_order > qty_received
      ) then 'closed'
      when exists (
        select 1
        from po_lines
        where po_number = $1
          and qty_received > 0
      ) then 'partial'
      else 'open'
    end,
    updated_at = now()
    where po_number = $1
    `,
    [normalized],
  );
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const receiptResult = await client.query(
      `
      select
        h.id as rn_id,
        h.supplier,
        h.do_number,
        h.po_number,
        h.document_date,
        h.posted_at,
        h.created_at,
        h.source,
        i.id as rn_item_id,
        i.line_no,
        i.item_code,
        i.received_qty,
        i.schedule_id as current_schedule_id,
        i.po_line_id as current_po_line_id,
        i.match_basis as current_match_basis,
        i.match_status as current_match_status,
        i.arrival_date as current_arrival_date
      from receive_note_headers h
      join receive_note_items i on i.rn_id = h.id
      where h.status = 'posted'
        and h.source = any($1::text[])
      order by coalesce(h.document_date, h.posted_at::date, h.created_at::date) asc, coalesce(h.posted_at, h.created_at) asc, h.id asc, i.line_no asc, i.id asc
      `,
      [sourceFilter],
    );

    const receipts = receiptResult.rows || [];
    if (receipts.length === 0) {
      await client.query("rollback");
      console.log("No posted receipt rows matched the repair scope.");
      return;
    }

    const poNumbers = Array.from(
      new Set(
        receipts
          .map((row) => normalizePoNumber(row.po_number))
          .filter(Boolean),
      ),
    );

    const vendorResult = await client.query(
      `select id, name from master_vendors`,
    );
    const vendorLookup = new Map();
    (vendorResult.rows || []).forEach((vendor) => {
      const idKey = normalizeLower(vendor.id);
      const nameKey = normalizeLower(vendor.name);
      if (idKey) vendorLookup.set(idKey, vendor);
      if (nameKey) vendorLookup.set(nameKey, vendor);
    });

    const scheduleResult = await client.query(
      `
      select
        s.id,
        s.supplier_id,
        s.supplier,
        s.po_number,
        s.po_line_id,
        coalesce(s.item_code, s.item) as item_code,
        s.request_date,
        s.request_qty,
        s.received_qty,
        s.arrival_date,
        s.do_number,
        s.status,
        s.actual_locked,
        ph.po_date
      from schedules s
      left join po_headers ph on ph.po_number = s.po_number
      where s.po_number = any($1::text[])
      `,
      [poNumbers],
    );
    const scheduleStates = (scheduleResult.rows || []).map((row) => ({
      id: Number(row.id),
      supplierId: normalizeLower(row.supplier_id),
      supplierName: normalizeLower(row.supplier),
      poNumber: normalizePoNumber(row.po_number),
      poLineId: row.po_line_id ? Number(row.po_line_id) : null,
      itemCode: normalizeItemCode(row.item_code),
      requestDate: formatDateOnly(row.request_date),
      requestQty: Number(row.request_qty || 0),
      poDate: formatDateOnly(row.po_date),
      outstanding: Math.max(0, Number(row.request_qty || 0)),
      receivedQty: 0,
      firstArrivalDate: null,
      firstDoNumber: null,
      firstReceiptOrder: null,
      latestQcStatus: null,
      latestMatchBasis: null,
      latestMatchStatus: null,
    }));
    const scheduleById = new Map(scheduleStates.map((row) => [row.id, row]));

    const poLineResult = await client.query(
      `
      select
        pl.id,
        pl.po_number,
        pl.line_no,
        pl.item_code,
        pl.qty_order,
        pl.qty_received,
        ph.supplier_id,
        mv.name as supplier_name,
        ph.po_date
      from po_lines pl
      join po_headers ph on ph.po_number = pl.po_number
      left join master_vendors mv on mv.id = ph.supplier_id
      where pl.po_number = any($1::text[])
      `,
      [poNumbers],
    );
    const poLineStates = (poLineResult.rows || []).map((row) => ({
      id: Number(row.id),
      poNumber: normalizePoNumber(row.po_number),
      lineNo: Number(row.line_no || 0),
      itemCode: normalizeItemCode(row.item_code),
      supplierId: normalizeLower(row.supplier_id),
      supplierName: normalizeLower(row.supplier_name),
      poDate: formatDateOnly(row.po_date),
      qtyOrder: Number(row.qty_order || 0),
      outstanding: Math.max(0, Number(row.qty_order || 0)),
      receivedQty: 0,
    }));
    const poLineById = new Map(poLineStates.map((row) => [row.id, row]));

    const buildSupplierAliases = (supplierValue) => {
      const key = normalizeText(supplierValue);
      if (!key) return [];
      const aliases = new Set([normalizeLower(key)]);
      const vendor = vendorLookup.get(normalizeLower(key));
      if (vendor) {
        if (vendor.id) aliases.add(normalizeLower(vendor.id));
        if (vendor.name) aliases.add(normalizeLower(vendor.name));
      }
      return Array.from(aliases).filter(Boolean);
    };

    const matchSupplier = (aliases, rowSupplierId, rowSupplierName) => {
      const tokens = [rowSupplierId, rowSupplierName].map((value) => normalizeLower(value)).filter(Boolean);
      if (tokens.length === 0) return false;
      return tokens.some((token) => aliases.includes(token));
    };

    const selectScheduleCandidate = (line, supplierAliases, arrivalDate) => {
      const poNumber = normalizePoNumber(line.po_number);
      const itemCode = normalizeItemCode(line.item_code);
      const linePoLineId = line.current_po_line_id ? Number(line.current_po_line_id) : null;
      const candidates = scheduleStates
        .filter((row) => {
          if (row.outstanding <= 0) return false;
          if (row.poNumber !== poNumber) return false;
          if (row.itemCode !== itemCode) return false;
          if (["CANCELLED", "REJECTED", "CLOSED"].includes(String(row.status || "").toUpperCase())) return false;
          if (!matchSupplier(supplierAliases, row.supplierId || row.supplierName, row.supplierName)) return false;
          return true;
        })
        .sort((left, right) => {
          const leftExact = arrivalDate && left.requestDate === arrivalDate ? 0 : 1;
          const rightExact = arrivalDate && right.requestDate === arrivalDate ? 0 : 1;
          if (leftExact !== rightExact) return leftExact - rightExact;
          const leftDiff = arrivalDate && left.requestDate ? Math.abs(new Date(`${left.requestDate}T00:00:00`).getTime() - new Date(`${arrivalDate}T00:00:00`).getTime()) : Number.MAX_SAFE_INTEGER;
          const rightDiff = arrivalDate && right.requestDate ? Math.abs(new Date(`${right.requestDate}T00:00:00`).getTime() - new Date(`${arrivalDate}T00:00:00`).getTime()) : Number.MAX_SAFE_INTEGER;
          if (leftDiff !== rightDiff) return leftDiff - rightDiff;
          const leftLineBias = linePoLineId && Number(left.poLineId || 0) === linePoLineId ? 0 : 1;
          const rightLineBias = linePoLineId && Number(right.poLineId || 0) === linePoLineId ? 0 : 1;
          if (leftLineBias !== rightLineBias) return leftLineBias - rightLineBias;
          if (left.requestDate !== right.requestDate) return String(left.requestDate || "").localeCompare(String(right.requestDate || ""));
          return Number(left.id || 0) - Number(right.id || 0);
        });
      return candidates[0] || null;
    };

    const selectPoLineCandidate = (line, supplierAliases) => {
      const poNumber = normalizePoNumber(line.po_number);
      const itemCode = normalizeItemCode(line.item_code);
      const linePoLineId = line.current_po_line_id ? Number(line.current_po_line_id) : null;
      const candidates = poLineStates
        .filter((row) => {
          if (row.outstanding <= 0) return false;
          if (row.poNumber !== poNumber) return false;
          if (row.itemCode !== itemCode) return false;
          if (!matchSupplier(supplierAliases, row.supplierId || row.supplierName, row.supplierName)) return false;
          return true;
        })
        .sort((left, right) => {
          const leftBias = linePoLineId && Number(left.id || 0) === linePoLineId ? 0 : 1;
          const rightBias = linePoLineId && Number(right.id || 0) === linePoLineId ? 0 : 1;
          if (leftBias !== rightBias) return leftBias - rightBias;
          if (left.poDate !== right.poDate) return String(left.poDate || "").localeCompare(String(right.poDate || ""));
          if (left.lineNo !== right.lineNo) return left.lineNo - right.lineNo;
          return left.id - right.id;
        });
      return candidates[0] || null;
    };

    const plannedRows = [];
    const scheduleAdjustmentMap = new Map();
    const poLineAdjustmentMap = new Map();
    const receiptAllocationRows = [];
    let repairedRows = 0;
    let fallbackRows = 0;

    for (const line of receipts) {
      const qty = Number(line.received_qty || 0);
      if (!(qty > 0)) continue;
      const arrivalDate = formatDateOnly(line.current_arrival_date || line.document_date || line.posted_at || line.created_at);
      const supplierAliases = buildSupplierAliases(line.supplier);
      const scheduleCandidate = selectScheduleCandidate(line, supplierAliases, arrivalDate);
      const poLineCandidate = scheduleCandidate ? null : selectPoLineCandidate(line, supplierAliases);
      const selected = scheduleCandidate || poLineCandidate || null;
      if (!selected) {
        fallbackRows += 1;
        continue;
      }

      repairedRows += 1;
      const allocationType = scheduleCandidate ? "schedule" : "po_line";
      const scheduleId = scheduleCandidate ? scheduleCandidate.id : null;
      const poLineId = scheduleCandidate?.poLineId || line.current_po_line_id || (poLineCandidate ? poLineCandidate.id : null);
      const poNumber = normalizePoNumber(line.po_number);
      const doNumber = normalizeDoNumber(line.do_number);
      const plannedDate = scheduleCandidate?.requestDate || poLineCandidate?.poDate || arrivalDate;

      if (scheduleCandidate) {
        scheduleCandidate.outstanding = Math.max(0, scheduleCandidate.outstanding - qty);
        scheduleCandidate.receivedQty += qty;
        if (!scheduleCandidate.firstArrivalDate && arrivalDate) {
          scheduleCandidate.firstArrivalDate = arrivalDate;
          scheduleCandidate.firstDoNumber = doNumber || null;
          scheduleCandidate.firstReceiptOrder = Number(line.rn_id || 0) * 100000 + Number(line.line_no || 0);
        }
        scheduleCandidate.latestQcStatus = scheduleCandidate.latestQcStatus || line.current_match_status || "matched";
        scheduleCandidate.latestMatchBasis = "schedule";
        scheduleCandidate.latestMatchStatus = line.current_match_status || "matched";
        const existing = scheduleAdjustmentMap.get(scheduleCandidate.id) || {
          receivedQty: 0,
          arrivalDate: null,
          doNumber: null,
          poNumber,
          requestDate: scheduleCandidate.requestDate,
          requestQty: scheduleCandidate.requestQty,
        };
        existing.receivedQty += qty;
        if (!existing.arrivalDate && arrivalDate) existing.arrivalDate = arrivalDate;
        if (!existing.doNumber && doNumber) existing.doNumber = doNumber;
        scheduleAdjustmentMap.set(scheduleCandidate.id, existing);
      }

      if (poLineId) {
        const poLineState = poLineById.get(Number(poLineId));
        if (poLineState) {
          poLineState.outstanding = Math.max(0, poLineState.outstanding - qty);
          poLineState.receivedQty += qty;
        const existing = poLineAdjustmentMap.get(poLineState.id) || { receivedQty: 0 };
          existing.receivedQty += qty;
          poLineAdjustmentMap.set(poLineState.id, existing);
        }
      }

      plannedRows.push({
        rnItemId: Number(line.rn_item_id),
        rnId: Number(line.rn_id),
        scheduleId,
        poLineId,
        allocationType,
        poNumber,
        doNumber,
        plannedDate,
        requestDate: scheduleCandidate?.requestDate || null,
        poDate: scheduleCandidate?.poDate || poLineCandidate?.poDate || null,
        allocatedQty: qty,
      });

      receiptAllocationRows.push({
        rnId: Number(line.rn_id),
        rnItemId: Number(line.rn_item_id),
        supplier: line.supplier,
        doNumber,
        poNumber,
        sourceType: allocationType,
        scheduleId,
        poLineId,
        itemCode: normalizeItemCode(line.item_code),
        plannedDate,
        requestDate: scheduleCandidate?.requestDate || null,
        poDate: scheduleCandidate?.poDate || poLineCandidate?.poDate || null,
        availableBefore: scheduleCandidate ? Number(scheduleCandidate.requestQty || 0) : Number(poLineCandidate?.qtyOrder || 0),
        allocatedQty: qty,
        availableAfter: scheduleCandidate ? Math.max(0, Number(scheduleCandidate.requestQty || 0) - qty) : Math.max(0, Number(poLineCandidate?.qtyOrder || 0) - qty),
      });
    }

    if (plannedRows.length === 0) {
      await client.query("rollback");
      console.log("No eligible posted receipt rows found for repair.");
      return;
    }

    if (!dryRun) {
      const touchedHeaders = Array.from(new Set(plannedRows.map((row) => row.rnId)));
      const touchedItems = plannedRows.map((row) => row.rnItemId);
      await client.query(
        `delete from receipt_allocations where rn_id = any($1::int[])`,
        [touchedHeaders],
      );

      for (const row of plannedRows) {
        await client.query(
          `
          update receive_note_items
          set schedule_id = $1,
              po_line_id = $2,
              match_basis = case when $3 = 'schedule' then 'schedule' else coalesce(match_basis, 'po_line') end
          where id = $4
          `,
          [row.scheduleId, row.poLineId, row.allocationType, row.rnItemId],
        );
      }

      for (const row of receiptAllocationRows) {
        await client.query(
          `
          insert into receipt_allocations
            (rn_id, rn_item_id, supplier, do_number, po_number, source_type, schedule_id, po_line_id, item_code, planned_date, request_date, po_date, available_before, allocated_qty, available_after, created_by)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,null)
          `,
          [
            row.rnId,
            row.rnItemId,
            row.supplier,
            row.doNumber,
            row.poNumber,
            row.sourceType,
            row.scheduleId,
            row.poLineId,
            row.itemCode,
            row.plannedDate,
            row.requestDate,
            row.poDate,
            row.availableBefore,
            row.allocatedQty,
            row.availableAfter,
          ],
        );
      }

      for (const schedule of scheduleStates) {
        const adjustment = scheduleAdjustmentMap.get(schedule.id);
        const receivedQty = adjustment ? Number(adjustment.receivedQty || 0) : 0;
        const arrivalDate = adjustment?.arrivalDate || null;
        const doNumber = adjustment?.doNumber || null;
        const status = receivedQty <= 0
          ? "PENDING"
          : receivedQty < Number(schedule.requestQty || 0)
            ? "PARTIAL"
            : "RECEIVED";
        await client.query(
          `
          update schedules
          set received_qty = $1,
              arrival_date = $2,
              do_number = $3,
              actual_locked = case when $1 > 0 then true else false end,
              status = $4,
              updated_at = now()
          where id = $5
          `,
          [receivedQty, arrivalDate, doNumber, status, schedule.id],
        );
      }

      for (const poLine of poLineStates) {
        const adjustment = poLineAdjustmentMap.get(poLine.id);
        const receivedQty = adjustment ? Number(adjustment.receivedQty || 0) : 0;
        if (receivedQty === Number(poLine.receivedQty || 0)) continue;
        await client.query(
          `
          update po_lines
          set qty_received = $1
          where id = $2
          `,
          [receivedQty, poLine.id],
        );
      }

      for (const poNumber of poNumbers) {
        await refreshPoHeaderStatus(client, poNumber);
      }
    }

    await client.query("commit");

    console.log("Repair actual receipts allocation");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Source filter: ${sourceFilter.join(", ")}`);
    console.log(`- Receipt rows scanned: ${receipts.length}`);
    console.log(`- Receipt rows repaired: ${repairedRows}`);
    console.log(`- Fallback rows skipped: ${fallbackRows}`);
    console.log(`- PO affected: ${poNumbers.length}`);
    console.log(`- Planned allocation rows: ${plannedRows.length}`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("Repair actual receipts allocation failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
