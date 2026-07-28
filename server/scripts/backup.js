import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env"), override: false });

const projectRoot = path.resolve(__dirname, "..", "..");
const backupDir = path.resolve(projectRoot, process.env.BACKUP_DIR || "backups");
const dbName = process.env.PGDATABASE || "monitoring_supplier";
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30);

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const filename = `${dbName}_${stamp}.dump`;
const fullPath = path.join(backupDir, filename);

fs.mkdirSync(backupDir, { recursive: true });

const env = {
  ...process.env,
  PGPASSWORD: process.env.PGPASSWORD || "",
};

const args = databaseUrl
  ? ["-Fc", "-f", fullPath, databaseUrl]
  : [
    "-h",
    process.env.PGHOST || "localhost",
    "-p",
    String(process.env.PGPORT || 5432),
    "-U",
    process.env.PGUSER || "postgres",
    "-Fc",
    "-f",
    fullPath,
    dbName,
  ];

const cleanupOldBackups = () => {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".dump")) continue;
    const target = path.join(backupDir, entry.name);
    const stat = fs.statSync(target);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(target);
      console.log(`Deleted old backup: ${target}`);
    }
  }
};

const child = spawn("pg_dump", args, { env, stdio: "inherit" });

child.on("exit", (code) => {
  if (code === 0) {
    cleanupOldBackups();
    console.log(`Backup created: ${fullPath}`);
  } else {
    console.error(`Backup failed with code ${code}`);
    process.exit(code);
  }
});
