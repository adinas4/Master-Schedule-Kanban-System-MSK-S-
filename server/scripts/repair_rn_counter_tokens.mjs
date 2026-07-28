import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env" });

const COMMIT = process.argv.includes("--commit");
const TOKEN_PATTERN = /\/\{\s*COUNTER(?:\s*:\s*\d+)?\s*\}/gi;
const RN_PATTERN = /^(\d+)(\/RN\/.+)$/i;

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "user",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const cleanCounterToken = (value) => String(value || "").replace(TOKEN_PATTERN, "").trim();

const nextAvailableRn = (desired, used) => {
  if (!used.has(desired)) return desired;
  const match = desired.match(RN_PATTERN);
  if (!match) {
    let suffix = 2;
    let candidate = `${desired}-FIX${suffix}`;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${desired}-FIX${suffix}`;
    }
    return candidate;
  }
  const rnSuffix = match[2];
  let maxCounter = 0;
  for (const value of used) {
    const existingMatch = String(value || "").match(RN_PATTERN);
    if (!existingMatch || existingMatch[2] !== rnSuffix) continue;
    maxCounter = Math.max(maxCounter, Number(existingMatch[1] || 0));
  }
  let counter = maxCounter + 1;
  let candidate = `${String(counter).padStart(match[1].length, "0")}${rnSuffix}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${String(counter).padStart(match[1].length, "0")}${rnSuffix}`;
  }
  return candidate;
};

const makeMappings = async (client, tableName) => {
  const dateColumn = tableName === "receive_notes" ? "received_at" : "created_at";
  const allRows = await client.query(`select id, rn_number from ${tableName}`);
  const used = new Set(
    allRows.rows
      .map((row) => String(row.rn_number || "").trim())
      .filter((value) => value && !value.toUpperCase().includes("{COUNTER}"))
  );
  const badRows = await client.query(
    `select id, rn_number from ${tableName} where rn_number like '%{COUNTER}%' order by ${dateColumn} asc, id asc`
  );
  const mappings = [];
  for (const row of badRows.rows) {
    const oldNumber = String(row.rn_number || "").trim();
    const desired = cleanCounterToken(oldNumber);
    const newNumber = nextAvailableRn(desired, used);
    used.add(newNumber);
    mappings.push({
      tableName,
      id: row.id,
      oldNumber,
      newNumber,
      collisionResolved: newNumber !== desired,
    });
  }
  return mappings;
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const legacyMappings = await makeMappings(client, "receive_notes");
    const headerMappings = await makeMappings(client, "receive_note_headers");
    const mappings = [...legacyMappings, ...headerMappings];

    for (const mapping of mappings) {
      if (mapping.tableName === "receive_notes") {
        await client.query("update receive_notes set rn_number = $1 where id = $2", [
          mapping.newNumber,
          mapping.id,
        ]);
      } else {
        await client.query(
          "update receive_note_headers set rn_number = $1, do_number = case when do_number = $2 then $1 else regexp_replace(coalesce(do_number, ''), '/\\\\{COUNTER\\\\}', '', 'gi') end where id = $3",
          [mapping.newNumber, mapping.oldNumber, mapping.id]
        );
      }

      await client.query("update quality_cases set source_doc = $1 where source_doc = $2", [
        mapping.newNumber,
        mapping.oldNumber,
      ]);
      await client.query("update inventory_ledgers set reference_doc = $1 where reference_doc = $2", [
        mapping.newNumber,
        mapping.oldNumber,
      ]);
      await client.query("update stock_batches set do_number = $1 where do_number = $2", [
        mapping.newNumber,
        mapping.oldNumber,
      ]);
      await client.query("update stock_batches set batch_no = replace(batch_no, $2, $1) where batch_no like '%' || $2 || '%'", [
        mapping.newNumber,
        mapping.oldNumber,
      ]);
    }

    const remaining = await client.query(`
      select 'receive_notes' as table_name, count(*)::int as count from receive_notes where rn_number like '%{COUNTER}%'
      union all select 'receive_note_headers', count(*)::int from receive_note_headers where rn_number like '%{COUNTER}%'
      union all select 'receive_note_headers_do', count(*)::int from receive_note_headers where do_number like '%{COUNTER}%'
      union all select 'quality_cases', count(*)::int from quality_cases where source_doc like '%{COUNTER}%'
      union all select 'inventory_ledgers', count(*)::int from inventory_ledgers where reference_doc like '%{COUNTER}%'
      union all select 'stock_batches_do', count(*)::int from stock_batches where do_number like '%{COUNTER}%'
      union all select 'stock_batches_batch', count(*)::int from stock_batches where batch_no like '%{COUNTER}%'
    `);

    const summary = {
      mode: COMMIT ? "commit" : "dry-run",
      mappings: mappings.length,
      collisionResolved: mappings.filter((mapping) => mapping.collisionResolved).length,
      samples: mappings.slice(0, 20),
      remaining: remaining.rows,
    };

    if (COMMIT) {
      await client.query("commit");
    } else {
      await client.query("rollback");
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
