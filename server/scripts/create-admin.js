import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: false });

const normalizeUsername = (value) => String(value || "").trim();

const getPostgresSslConfig = () => {
  const sslMode = String(process.env.PGSSLMODE || "").trim().toLowerCase();
  const rejectUnauthorized = String(process.env.PGSSL_REJECT_UNAUTHORIZED || "").trim().toLowerCase();
  if (["disable", "false", "off", "0"].includes(sslMode)) return false;
  if (["no-verify", "allow-invalid"].includes(sslMode) || rejectUnauthorized === "false") {
    return { rejectUnauthorized: false };
  }
  if (["require", "verify-ca", "verify-full"].includes(sslMode) || process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT) {
    return { rejectUnauthorized: true };
  }
  return false;
};

const getPostgresConfig = () => {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const ssl = getPostgresSslConfig();
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ...(ssl ? { ssl } : {}),
    };
  }
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "monitoring_supplier",
    ...(ssl ? { ssl } : {}),
  };
};

const defaultAdminPermissions = {
  viewReport: true,
  viewScorecard: true,
  viewMaster: true,
  manageMaster: true,
  manageVendors: true,
  manageItems: true,
  viewPrl: true,
  prlProcess: true,
  prlImport: true,
  editSchedules: true,
  deleteRecords: true,
  importExport: true,
  useAI: true,
  manageUsers: true,
  resetAll: true,
  production: true,
};

const username = normalizeUsername(process.env.INITIAL_ADMIN_USERNAME);
const password = String(process.env.INITIAL_ADMIN_PASSWORD || "");
const displayName = String(process.env.INITIAL_ADMIN_NAME || "").trim();

if (!username || !password) {
  console.error("INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD are required.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const pool = new pg.Pool(getPostgresConfig());

try {
  const existing = await pool.query(
    "select id from users where lower(username) = lower($1) limit 1",
    [username],
  );
  if (existing.rows.length > 0) {
    console.error("Admin user was not created because the username already exists.");
    process.exitCode = 2;
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
      insert into users (username, password_hash, role, permissions)
      values ($1, $2, 'admin', $3)
      returning id, username, role, supplier_id, created_at
      `,
      [username, passwordHash, defaultAdminPermissions],
    );
    const created = result.rows[0];
    console.log(JSON.stringify({
      created: true,
      id: created.id,
      username: created.username,
      name: displayName || null,
      role: created.role,
      supplierId: created.supplier_id || null,
      active: true,
      createdAt: created.created_at,
    }));
  }
} catch (error) {
  console.error("Failed to create initial admin:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
