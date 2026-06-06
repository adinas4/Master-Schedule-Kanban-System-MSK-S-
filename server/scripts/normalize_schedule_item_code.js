import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const argSet = new Set(args);
const dryRun = argSet.has("--dry-run");
const looseMatch = argSet.has("--loose");
const fuzzyMatch = argSet.has("--fuzzy");
const skipAlignExisting = argSet.has("--skip-align-existing");

const resolveArgValue = (prefix) => {
  const matched = args.find((arg) => arg.startsWith(prefix));
  if (!matched) return null;
  const parts = matched.split("=");
  return parts.length > 1 ? parts.slice(1).join("=").trim() : "";
};

const limitArg = resolveArgValue("--limit");
const limit = limitArg ? Number(limitArg) : null;
const minPartLenArg = resolveArgValue("--min-part-len");
const minPartLen = minPartLenArg ? Number(minPartLenArg) : 5;

const conflictsFileArg = resolveArgValue("--conflicts-file");
const defaultConflictsPath = path.join(__dirname, "normalize_schedule_item_conflicts.csv");
const conflictsFile = conflictsFileArg ? path.resolve(conflictsFileArg) : defaultConflictsPath;
const summaryFileArg = resolveArgValue("--summary-file");
const defaultSummaryPath = path.join(__dirname, "normalize_schedule_item_summary.csv");
const summaryFile = summaryFileArg ? path.resolve(summaryFileArg) : defaultSummaryPath;

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "monitoring_supplier",
});

const normalizeText = (value) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const normalizeLoose = (value) => String(value ?? "")
  .toLowerCase()
  .replace(/[ø]/g, "d")
  .replace(/,/g, ".")
  .replace(/[^a-z0-9.]+/g, "")
  .trim();

const extractFirstTokenKey = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const token = raw.split(/\s+/)[0] || "";
  return token.replace(/[^a-z0-9_-]+/gi, "").toLowerCase();
};

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const tableCheck = await client.query(
      "select to_regclass('items') as items, to_regclass('schedules') as schedules",
    );
    const tablesReady = tableCheck.rows[0]?.items && tableCheck.rows[0]?.schedules;
    if (!tablesReady) {
      await client.query("rollback");
      console.error("Table items/schedules belum ada. Jalankan migrasi (start API) dulu.");
      process.exitCode = 1;
      return;
    }

    const itemsResult = await client.query(
      "select code, name, part_no from items",
    );

    const codeMap = new Map();
    const nameMap = new Map();
    const partMap = new Map();
    const fuzzyNameMap = new Map();
    const fuzzyPartMap = new Map();
    const partCandidates = [];

    const pushMap = (map, key, code) => {
      if (!key) return;
      const entry = map.get(key);
      if (entry) {
        entry.add(code);
        return;
      }
      map.set(key, new Set([code]));
    };

    for (const item of itemsResult.rows) {
      const code = String(item.code || "").trim();
      if (!code) continue;
      codeMap.set(code.toLowerCase(), code);

      const nameKey = normalizeText(item.name);
      if (nameKey) pushMap(nameMap, nameKey, code);

      const looseNameKey = normalizeLoose(item.name);
      if (looseNameKey) pushMap(fuzzyNameMap, looseNameKey, code);

      const partKey = normalizeText(item.part_no);
      if (partKey) {
        pushMap(partMap, partKey, code);
        if (partKey.length >= minPartLen) {
          partCandidates.push({ partKey, code });
        }
      }

      const loosePartKey = normalizeLoose(item.part_no);
      if (loosePartKey) pushMap(fuzzyPartMap, loosePartKey, code);
    }

    const limitClause = Number.isFinite(limit) && limit > 0 ? "limit " + Math.floor(limit) : "";
    const scheduleResult = await client.query(
      `
      select s.id, s.po_number, s.item, s.item_code
      from schedules s
      left join items i on i.code = s.item_code
      where (s.item_code is null or trim(s.item_code) = '' or i.code is null)
        and s.item is not null
        and trim(s.item) <> ''
      order by s.id asc
      ${limitClause}
      `,
    );

    let matchedByCode = 0;
    let matchedByCodeToken = 0;
    let matchedByName = 0;
    let matchedByPart = 0;
    let matchedByLoosePart = 0;
    let matchedByFuzzyName = 0;
    let matchedByFuzzyPart = 0;
    let skippedAmbiguous = 0;
    let skippedNoMatch = 0;

    const updates = [];
    const summaryRows = [];
    const conflicts = [];

    const addConflict = (entry) => {
      conflicts.push({
        schedule_id: entry.scheduleId || "",
        po_number: entry.poNumber || "",
        item_original: entry.itemOriginal || "",
        reason: entry.reason || "",
        candidates: entry.candidates || "",
        match_source: entry.matchSource || "",
      });
    };

    for (const schedule of scheduleResult.rows) {
      const itemOriginal = String(schedule.item || "");
      const itemKey = normalizeText(itemOriginal);
      if (!itemKey) {
        skippedNoMatch += 1;
        addConflict({ scheduleId: schedule.id, poNumber: schedule.po_number, itemOriginal, reason: "empty_item" });
        continue;
      }

      let matchedCode = null;
      let matchSource = null;

      const tokenKey = extractFirstTokenKey(itemOriginal);
      const tokenHit = tokenKey ? codeMap.get(tokenKey) : null;
      if (tokenHit) {
        matchedCode = tokenHit;
        matchSource = "code_token";
      } else {
        const codeHit = codeMap.get(itemKey);
        if (codeHit) {
          matchedCode = codeHit;
          matchSource = "code";
        } else {
        const nameSet = nameMap.get(itemKey);
        if (nameSet && nameSet.size === 1) {
          matchedCode = [...nameSet][0];
          matchSource = "name";
        } else if (nameSet && nameSet.size > 1) {
          skippedAmbiguous += 1;
          addConflict({
            scheduleId: schedule.id,
            poNumber: schedule.po_number,
            itemOriginal,
            reason: "ambiguous_name",
            candidates: [...nameSet].join("|"),
            matchSource: "name",
          });
          continue;
        } else {
          const partSet = partMap.get(itemKey);
          if (partSet && partSet.size === 1) {
            matchedCode = [...partSet][0];
            matchSource = "part_no";
          } else if (partSet && partSet.size > 1) {
            skippedAmbiguous += 1;
            addConflict({
              scheduleId: schedule.id,
              poNumber: schedule.po_number,
              itemOriginal,
              reason: "ambiguous_part_no",
              candidates: [...partSet].join("|"),
              matchSource: "part_no",
            });
            continue;
          } else if (looseMatch) {
            const looseMatches = partCandidates.filter((entry) => itemKey.includes(entry.partKey));
            const uniqueCodes = new Set(looseMatches.map((entry) => entry.code));
            if (uniqueCodes.size === 1) {
              matchedCode = [...uniqueCodes][0];
              matchSource = "part_no_contains";
            } else if (uniqueCodes.size > 1) {
              skippedAmbiguous += 1;
              addConflict({
                scheduleId: schedule.id,
                poNumber: schedule.po_number,
                itemOriginal,
                reason: "ambiguous_part_no_contains",
                candidates: [...uniqueCodes].join("|"),
                matchSource: "part_no_contains",
              });
              continue;
            }
          }

          if (!matchedCode && fuzzyMatch) {
            const fuzzyKey = normalizeLoose(itemOriginal);
            if (fuzzyKey) {
              const fuzzyNameSet = fuzzyNameMap.get(fuzzyKey);
              if (fuzzyNameSet && fuzzyNameSet.size === 1) {
                matchedCode = [...fuzzyNameSet][0];
                matchSource = "name_fuzzy";
              } else if (fuzzyNameSet && fuzzyNameSet.size > 1) {
                skippedAmbiguous += 1;
                addConflict({
                  scheduleId: schedule.id,
                  poNumber: schedule.po_number,
                  itemOriginal,
                  reason: "ambiguous_name_fuzzy",
                  candidates: [...fuzzyNameSet].join("|"),
                  matchSource: "name_fuzzy",
                });
                continue;
              } else {
                const fuzzyPartSet = fuzzyPartMap.get(fuzzyKey);
                if (fuzzyPartSet && fuzzyPartSet.size === 1) {
                  matchedCode = [...fuzzyPartSet][0];
                  matchSource = "part_no_fuzzy";
                } else if (fuzzyPartSet && fuzzyPartSet.size > 1) {
                  skippedAmbiguous += 1;
                  addConflict({
                    scheduleId: schedule.id,
                    poNumber: schedule.po_number,
                    itemOriginal,
                    reason: "ambiguous_part_no_fuzzy",
                    candidates: [...fuzzyPartSet].join("|"),
                    matchSource: "part_no_fuzzy",
                  });
                  continue;
                }
              }
            }
          }
        }
      }
      }

      if (!matchedCode) {
        skippedNoMatch += 1;
        addConflict({
          scheduleId: schedule.id,
          poNumber: schedule.po_number,
          itemOriginal,
          reason: "no_match",
        });
        continue;
      }

      updates.push({
        scheduleId: schedule.id,
        itemCode: matchedCode,
      });
      summaryRows.push({
        schedule_id: schedule.id,
        po_number: schedule.po_number,
        item_original: itemOriginal,
        item_code: matchedCode,
        match_source: matchSource,
      });

      if (matchSource === "code") matchedByCode += 1;
      else if (matchSource === "code_token") matchedByCodeToken += 1;
      else if (matchSource === "name") matchedByName += 1;
      else if (matchSource === "part_no") matchedByPart += 1;
      else if (matchSource === "part_no_contains") matchedByLoosePart += 1;
      else if (matchSource === "name_fuzzy") matchedByFuzzyName += 1;
      else if (matchSource === "part_no_fuzzy") matchedByFuzzyPart += 1;
    }

    let alignedCount = 0;
    if (!skipAlignExisting) {
      const alignCountResult = await client.query(
        `
        select count(*)::int as total
        from schedules s
        join items i on i.code = s.item_code
        where s.item is null or trim(s.item) = '' or s.item <> s.item_code
        `,
      );
      alignedCount = Number(alignCountResult.rows[0]?.total || 0);
    }

    if (!dryRun) {
      for (const update of updates) {
        await client.query(
          "update schedules set item_code = $1, item = $1, updated_at = now() where id = $2",
          [update.itemCode, update.scheduleId],
        );
      }

      if (!skipAlignExisting && alignedCount > 0) {
        await client.query(
          `
          update schedules s
          set item = s.item_code, updated_at = now()
          from items i
          where s.item_code = i.code
            and (s.item is null or trim(s.item) = '' or s.item <> s.item_code)
          `,
        );
      }
    }

    await client.query(dryRun ? "rollback" : "commit");

    console.log("Normalize Schedule Item Summary");
    console.log(`- Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`- Matched by code: ${matchedByCode}`);
    console.log(`- Matched by code token: ${matchedByCodeToken}`);
    console.log(`- Matched by name: ${matchedByName}`);
    console.log(`- Matched by part_no: ${matchedByPart}`);
    if (looseMatch) console.log(`- Matched by part_no contains: ${matchedByLoosePart}`);
    if (fuzzyMatch) {
      console.log(`- Matched by fuzzy name: ${matchedByFuzzyName}`);
      console.log(`- Matched by fuzzy part_no: ${matchedByFuzzyPart}`);
    }
    console.log(`- Skipped (ambiguous): ${skippedAmbiguous}`);
    console.log(`- Skipped (no match): ${skippedNoMatch}`);
    if (!skipAlignExisting) console.log(`- Align item -> item_code: ${alignedCount}`);
    console.log(`- Updates prepared: ${updates.length}`);

    if (summaryRows.length > 0) {
      const headers = ["schedule_id", "po_number", "item_original", "item_code", "match_source"];
      const rows = [headers.join(",")];
      summaryRows.forEach((row) => rows.push(headers.map((key) => escapeCsv(row[key])).join(",")));
      fs.writeFileSync(summaryFile, rows.join("\n"), "utf8");
      console.log(`Summary CSV: ${summaryFile}`);
    }

    if (conflicts.length > 0) {
      const headers = ["schedule_id", "po_number", "item_original", "reason", "candidates", "match_source"];
      const rows = [headers.join(",")];
      conflicts.forEach((row) => rows.push(headers.map((key) => escapeCsv(row[key])).join(",")));
      fs.writeFileSync(conflictsFile, rows.join("\n"), "utf8");
      console.log(`Conflicts: ${conflicts.length}`);
      console.log(`Conflict CSV: ${conflictsFile}`);
      conflicts.slice(0, 20).forEach((row) => console.log(row));
      if (conflicts.length > 20) {
        console.log(`... ${conflicts.length - 20} more`);
      }
    }
  } catch (error) {
    await client.query("rollback");
    console.error("Normalize schedule item failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
