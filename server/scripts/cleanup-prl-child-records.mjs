import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");

if (fs.existsSync(rootEnvPath)) {
  const lines = fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

const PRL_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const isParentCandidateType = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return text.includes("fg") || text.includes("finish") || text.includes("sub assy") || text.includes("subassy") || text.includes("sub-assy");
};

const countWeekdaysInMonth = (year, monthKey) => {
  const monthIndex = PRL_MONTHS.indexOf(String(monthKey || "").toLowerCase());
  if (monthIndex < 0) return 0;
  const start = new Date(Date.UTC(Number(year), monthIndex, 1));
  const end = new Date(Date.UTC(Number(year), monthIndex + 1, 0));
  let count = 0;
  for (let current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
};

const resolveWorkingDays = async (pool, year, monthKey) => {
  const result = await pool.query("select working_days from master_config where id = 1");
  const configured = Number(result.rows[0]?.working_days || 0);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return countWeekdaysInMonth(year, monthKey) || 22;
};

const main = async () => {
  const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "monitoring_supplier",
  });

  const now = new Date();
  const targetYear = Number(process.env.PRL_YEAR || now.getFullYear());
  const targetMonthKey = String(process.env.PRL_MONTH || PRL_MONTHS[now.getMonth()] || "jan").toLowerCase();
  const workingDays = await resolveWorkingDays(pool, targetYear, targetMonthKey);
  const monthLabel = targetMonthKey.toUpperCase();

  const cleanupResult = await pool.query(
    `
    delete from prl_records pr
    using items i
    where pr.item_code = i.code
      and not (
        lower(coalesce(i.type, '')) ~ '(fg|finish|sub assy|subassy|sub-assy)'
        or exists (
          select 1
          from master_bom_headers h
          where h.parent_code = pr.item_code
        )
      )
    `,
  );

  const directDemandResult = await pool.query(
    `
    select
      pr.item_code,
      case
        when (pr.months ->> $2) ~ '^[0-9]+(\\.[0-9]+)?$'
          then (pr.months ->> $2)::numeric
        else 0
      end as prl_qty,
      i.type as item_type,
      exists (
        select 1
        from master_bom_headers h
        where h.parent_code = pr.item_code
      ) as is_parent_item
    from prl_records pr
    join items i on i.code = pr.item_code
    where pr.year = $1
      and coalesce(pr.status ->> $2, '') in ('active', 'manual')
    `,
    [targetYear, targetMonthKey],
  );

  const parentRows = (directDemandResult.rows || []).filter((row) => Boolean(row.is_parent_item) || isParentCandidateType(row.item_type));
  const parentDemandMap = new Map(parentRows.map((row) => [String(row.item_code || "").trim(), Number(row.prl_qty || 0)]));
  const activeParentRows = parentRows.filter((row) => Number(row.prl_qty || 0) > 0);

  const leafDemandResult = await pool.query(
    `
    with recursive active_headers as (
      select *
      from (
        select
          h.id,
          h.parent_code,
          h.revision_no,
          coalesce(h.effective_start_date, h.effective_date, h.created_at::date, current_date) as start_date,
          coalesce(h.effective_end_date, '9999-12-31'::date) as end_date,
          row_number() over (
            partition by h.parent_code
            order by
              h.revision_no desc nulls last,
              coalesce(h.effective_start_date, h.effective_date, h.created_at::date, current_date) desc,
              h.created_at desc,
              h.id desc
          ) as rn
        from master_bom_headers h
      ) ranked
      where rn = 1
        and start_date <= $2::date
        and end_date >= $2::date
    ),
    released_prl as (
      select
        pr.item_code,
        case
          when (pr.months ->> $3) ~ '^[0-9]+(\\.[0-9]+)?$'
            then (pr.months ->> $3)::numeric
          else 0
        end as prl_qty
      from prl_records pr
      join items i on i.code = pr.item_code
      where pr.year = $1
        and coalesce(pr.status ->> $3, '') in ('active', 'manual')
        and (
          lower(coalesce(i.type, '')) ~ '(fg|finish|sub assy|subassy|sub-assy)'
          or exists (
            select 1
            from master_bom_headers h
            where h.parent_code = pr.item_code
          )
        )
    ),
    bom_tree as (
      select
        rp.item_code as root_parent,
        b.child_code,
        (b.quantity / nullif(coalesce(b.yield_factor, 1), 0)) * rp.prl_qty * (1 + coalesce(b.scrap_factor, 0) / 100) as required_qty,
        array[rp.item_code, b.child_code]::text[] as path
      from released_prl rp
      join active_headers h on h.parent_code = rp.item_code
      join master_bom b on b.header_id = h.id

      union all

      select
        bt.root_parent,
        b.child_code,
        bt.required_qty * (b.quantity / nullif(coalesce(b.yield_factor, 1), 0)) * (1 + coalesce(b.scrap_factor, 0) / 100),
        bt.path || b.child_code
      from bom_tree bt
      join active_headers h on h.parent_code = bt.child_code
      join master_bom b on b.header_id = h.id
      where not (b.child_code = any(bt.path))
    ),
    leaf_demand as (
      select
        bt.child_code as item_code,
        sum(bt.required_qty)::numeric as bom_qty
      from bom_tree bt
      where not exists (
        select 1
        from active_headers h
        where h.parent_code = bt.child_code
      )
      group by bt.child_code
    )
    select * from leaf_demand
    `,
    [targetYear, now.toISOString().slice(0, 10), targetMonthKey],
  );
  const leafDemandMap = new Map((leafDemandResult.rows || []).map((row) => [String(row.item_code || "").trim(), Number(row.bom_qty || 0)]));

  const settingsResult = await pool.query(
    `
    select
      ks.item_code,
      ks.lot_qty,
      ks.work_hours,
      ks.cycle_x,
      ks.cycle_y,
      ks.safety_hours,
      i.type as item_type
    from kanban_settings ks
    join items i on i.code = ks.item_code
    order by ks.item_code asc
    `,
  );

  let updated = 0;
  for (const row of settingsResult.rows || []) {
    const itemCode = String(row.item_code || "").trim();
    const isParent = Boolean(parentDemandMap.has(itemCode) && isParentCandidateType(row.item_type));
    const parentQty = isParent ? Number(parentDemandMap.get(itemCode) || 0) : null;
    const bomQty = Number(leafDemandMap.get(itemCode) || 0);
    const effectiveQty = isParent ? parentQty : (!isParentCandidateType(row.item_type) && bomQty > 0 ? bomQty : null);
    const lotQty = Number(row.lot_qty || 0);
    const workHours = Number(row.work_hours || 0) > 0 ? Number(row.work_hours || 0) : 24;
    const cycleX = Number(row.cycle_x || 0) > 0 ? Number(row.cycle_x || 0) : 1;
    const cycleY = Number(row.cycle_y || 0) > 0 ? Number(row.cycle_y || 0) : 4;
    const safetyHours = Number(row.safety_hours || 0) > 0 ? Number(row.safety_hours || 0) : 48;

    let dailyDemand = null;
    let hourlyDemand = null;
    let regularKanban = null;
    let safetyKanban = null;
    let safetyParts = null;
    let cardCount = null;
    let maxQty = null;

    if (effectiveQty !== null && lotQty > 0 && workingDays > 0) {
      dailyDemand = effectiveQty / workingDays;
      hourlyDemand = dailyDemand / workHours;
      regularKanban = Math.ceil((hourlyDemand * cycleX * cycleY) / lotQty);
      safetyKanban = Math.ceil((hourlyDemand * safetyHours) / lotQty);
      safetyParts = hourlyDemand * safetyHours;
      cardCount = regularKanban + safetyKanban;
      maxQty = cardCount * lotQty;
    }

    await pool.query(
      `
      update kanban_settings
      set
        calculated_prl_qty = $2::numeric,
        calculated_daily_demand = $3::numeric,
        calculated_hourly_demand = $4::numeric,
        calculated_regular_kanban = $5::numeric,
        calculated_safety_kanban = $6::numeric,
        calculated_safety_parts = $7::numeric,
        calculated_working_days = $8::integer,
        calculated_card_count = $9::integer,
        calculated_max_qty = $10::numeric,
        calculated_prl_year = $11::integer,
        calculated_prl_month = $12::text,
        calculated_at = case when $2::numeric is null then null else now() end,
        updated_at = now()
      where item_code = $1
      `,
      [
        itemCode,
        effectiveQty,
        dailyDemand,
        hourlyDemand,
        regularKanban,
        safetyKanban,
        safetyParts,
        effectiveQty === null ? null : workingDays,
        cardCount,
        maxQty,
        effectiveQty === null ? null : targetYear,
        effectiveQty === null ? null : targetMonthKey,
      ],
    );
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        period: `${monthLabel}-${targetYear}`,
        deletedChildPrlRows: cleanupResult.rowCount,
        activeParentRows: activeParentRows.length,
        leafDemandRows: leafDemandMap.size,
        kanbanRowsRefreshed: updated,
      },
      null,
      2,
    ),
  );

  await pool.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
