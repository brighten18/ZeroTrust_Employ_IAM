import db from './db.js';

/**
 * Mengambil semua karyawan dari database SQL
 */
export function getAllEmployees() {
  const rows = db.prepare('SELECT * FROM employees ORDER BY createdAt DESC').all();
  return rows.map(emp => ({
    ...emp,
    mfaEnforced: Boolean(emp.mfaEnforced),
    assignedGroups: JSON.parse(emp.assignedGroups)
  }));
}

/**
 * Menyimpan karyawan baru ke database SQL
 */
export function insertEmployee(employee) {
  const stmt = db.prepare(`
    INSERT INTO employees (id, fullName, personalEmail, companyEmail, department, role, status, assignedGroups, mfaEnforced, activeSessions, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    employee.id,
    employee.fullName,
    employee.personalEmail,
    employee.companyEmail,
    employee.department,
    employee.role,
    employee.status,
    JSON.stringify(employee.assignedGroups),
    employee.mfaEnforced ? 1 : 0,
    employee.activeSessions,
    employee.createdAt
  );

  return employee;
}

/**
 * Mencabut akses karyawan di database SQL (Offboarding)
 */
export function revokeEmployeeInDb(id) {
  const current = db.prepare('SELECT * FROM employees WHERE id = ?').get();
  if (!current) return null;

  const revokedAt = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE employees 
    SET status = 'Revoked', assignedGroups = '[]', activeSessions = 0, revokedAt = ?
    WHERE id = ?
  `);

  stmt.run(revokedAt, id);

  return {
    ...current,
    status: 'Revoked',
    assignedGroups: [],
    activeSessions: 0,
    revokedAt
  };
}

/**
 * Mengambil jejak audit dari database SQL
 */
export function getAuditLogs() {
  return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all();
}

/**
 * Menambahkan entri baru ke tabel audit_logs
 */
export function addAuditLog({ action, targetUser, actor = 'System', status, details }) {
  const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  const logEntry = {
    id: `LOG-${String(total + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    action,
    targetUser,
    actor,
    status,
    details
  };

  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, targetUser, actor, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    logEntry.id,
    logEntry.timestamp,
    logEntry.action,
    logEntry.targetUser,
    logEntry.actor,
    logEntry.status,
    logEntry.details
  );

  return logEntry;
}