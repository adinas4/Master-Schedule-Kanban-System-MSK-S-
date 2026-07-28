import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env"), override: false });

const dbName = process.env.PGDATABASE || "monitoring_supplier";
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const restoreFile = process.argv[2] || process.env.RESTORE_FILE;

if (!restoreFile) {
  console.error("Restore file path is required. Example: npm run restore -- backups/file.dump");
  process.exit(1);
}

const fullPath = path.resolve(restoreFile);
if (!fs.existsSync(fullPath)) {
  console.error(`Restore file not found: ${fullPath}`);
  process.exit(1);
}

const env = {
  ...process.env,
  PGPASSWORD: process.env.PGPASSWORD || "",
};

const args = databaseUrl
  ? ["--clean", "--if-exists", "-d", databaseUrl, fullPath]
  : [
    "--clean",
    "--if-exists",
    "-h",
    process.env.PGHOST || "localhost",
    "-p",
    String(process.env.PGPORT || 5432),
    "-U",
    process.env.PGUSER || "postgres",
    "-d",
    dbName,
    fullPath,
  ];
const child = spawn("pg_restore", args, { env, stdio: "inherit" });

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Restore completed from: ${fullPath}`);
  } else {
    console.error(`Restore failed with code ${code}`);
    process.exit(code);
  }
});
