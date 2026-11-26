import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database disimpan dalam file lokal 'iam.sqlite'
const dbPath = path.join(__dirname, '../../iam.sqlite');
const db = new Database(dbPath);

// Mengaktifkan mode Write-Ahead Logging (WAL) untuk performa tinggi & konkurensi aman
db.pragma('journal_mode = WAL');

// 1. Inisialisasi Skema Tabel SQL
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    personalEmail TEXT NOT NULL,
    companyEmail TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    assignedGroups TEXT NOT NULL,
    mfaEnforced INTEGER NOT NULL,
    activeSessions INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    revokedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    targetUser TEXT NOT NULL,
    actor TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT NOT NULL
  );
`);

// 2. Seed Data Awal (Jika tabel masih kosong)
const count = db.prepare('SELECT COUNT(*) as total FROM employees').get();
if (count.total === 0) {
  const insertInitial = db.prepare(`
    INSERT INTO employees (id, fullName, personalEmail, companyEmail, department, role, status, assignedGroups, mfaEnforced, activeSessions, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInitial.run(
    'EMP-001',
    'Alex Pratama',
    'alex.personal@gmail.com',
    'alex.pratama@zerotrust.corp',
    'Engineering',
    'Developer',
    'Active',
    JSON.stringify(['GitHub-Org-Members', 'AWS-Dev-Role']),
    1,
    2,
    new Date().toISOString()
  );

  const insertLog = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, targetUser, actor, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run(
    'LOG-0001',
    new Date().toISOString(),
    'DATABASE_INIT',
    'SYSTEM',
    'System-Bootstrapper',
    'SUCCESS',
    'SQLite Database initialized and schema migration completed.'
  );
}

export default db;