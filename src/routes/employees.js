import { Router } from 'express';
import { getAllEmployees, insertEmployee, revokeEmployeeInDb, addAuditLog } from '../data/store.js';
import { provisionEmployee } from '../services/identityMock.js';
import { sendTemporaryCredentialsEmail } from '../services/notification.js';
import { activeAdminTokens } from './auth.js';

const router = Router();

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Sesi admin tidak valid atau telah kedaluwarsa.'
    });
  }
  next();
}

// GET: Ambil dari database SQL
router.get('/', requireAdminAuth, (req, res) => {
  res.json({ success: true, data: getAllEmployees() });
});

// POST: Onboarding -> Simpan ke database SQL
router.post('/onboard', requireAdminAuth, (req, res) => {
  const { fullName, personalEmail, department, role } = req.body;

  if (!fullName || !personalEmail || !department || !role) {
    return res.status(400).json({
      success: false,
      message: 'Parameter fullName, personalEmail, department, dan role wajib diisi.'
    });
  }

  const newEmployee = provisionEmployee({ fullName, personalEmail, department, role });
  insertEmployee(newEmployee); // Simpan permanen ke SQL

  const dispatchResult = sendTemporaryCredentialsEmail({
    fullName: newEmployee.fullName,
    personalEmail: newEmployee.personalEmail,
    companyEmail: newEmployee.companyEmail,
    tempPassword: newEmployee.tempPassword,
    role: newEmployee.role,
    mfaEnforced: newEmployee.mfaEnforced
  });

  addAuditLog({
    action: 'USER_PROVISIONED',
    targetUser: newEmployee.companyEmail,
    actor: 'HR-Admin (Authenticated)',
    status: 'SUCCESS',
    details: `Role [${role}] assigned with groups [${newEmployee.assignedGroups.join(', ')}]. MFA: ${newEmployee.mfaEnforced}`
  });

  res.status(201).json({
    success: true,
    message: 'Karyawan berhasil diprovisi dan disimpan ke Database SQL.',
    data: newEmployee,
    notificationDispatch: dispatchResult
  });
});

// POST: Offboarding -> Update status di database SQL
router.post('/:id/revoke', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const revoked = revokeEmployeeInDb(id);

  if (!revoked) {
    return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
  }

  addAuditLog({
    action: 'USER_OFFBOARDED',
    targetUser: revoked.companyEmail,
    actor: 'Security-Officer (Authenticated)',
    status: 'SUCCESS',
    details: 'Login disabled, all RBAC groups cleared, active sessions terminated.'
  });

  res.json({
    success: true,
    message: 'Akses karyawan berhasil dicabut secara instan.',
    data: revoked
  });
});

export default router;