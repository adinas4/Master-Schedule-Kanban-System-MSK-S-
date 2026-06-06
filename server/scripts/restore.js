import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const dbName = process.env.PGDATABASE || "monitoring_supplier";
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

const args = ["--clean", "--if-exists", "-d", dbName, fullPath];
const child = spawn("pg_restore", args, { env, stdio: "inherit" });

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Restore completed from: ${fullPath}`);
  } else {
    console.error(`Restore failed with code ${code}`);
    process.exit(code);
  }
});
