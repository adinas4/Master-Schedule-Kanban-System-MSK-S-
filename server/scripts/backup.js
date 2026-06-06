import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const backupDir = process.env.BACKUP_DIR || "backups";
const dbName = process.env.PGDATABASE || "monitoring_supplier";

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const filename = `${dbName}_${stamp}.dump`;
const fullPath = path.resolve(backupDir, filename);

fs.mkdirSync(backupDir, { recursive: true });

const env = {
  ...process.env,
  PGPASSWORD: process.env.PGPASSWORD || "",
};

const args = ["-Fc", "-f", fullPath, dbName];
const child = spawn("pg_dump", args, { env, stdio: "inherit" });

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Backup created: ${fullPath}`);
  } else {
    console.error(`Backup failed with code ${code}`);
    process.exit(code);
  }
});
