import { Router } from 'express';
import { employees, addAuditLog } from '../data/store.js';
import { provisionEmployee, revokeEmployeeAccess } from '../services/identityMock.js';
import { verifyHmacSignature } from '../middlewares/hmacAuth.js';

const router = Router();

/**
 * POST /api/webhooks/hr-events
 * Menerima webhook M2M dari SaaS HR Eksternal (Workday / BambooHR)
 * Diproteksi secara kriptografis oleh HMAC-SHA256
 */
router.post('/hr-events', verifyHmacSignature, (req, res) => {
  const { eventType, data } = req.body;

  if (!eventType || !data) {
    return res.status(400).json({
      success: false,
      message: 'Payload webhook tidak valid. Field eventType dan data wajib ada.'
    });
  }

  // 1. Event Karyawan Baru (Auto-Provisioning)
  if (eventType === 'EMPLOYEE_HIRED') {
    const { fullName, personalEmail, department, role } = data;
    const newEmployee = provisionEmployee({ fullName, personalEmail, department, role });
    employees.unshift(newEmployee);

    addAuditLog({
      action: 'WEBHOOK_PROVISION_SUCCESS',
      targetUser: newEmployee.companyEmail,
      actor: 'External-HR-Webhook (HMAC-Verified)',
      status: 'SUCCESS',
      details: `Automated M2M onboarding. Role [${role}]. MFA Enforced: ${newEmployee.mfaEnforced}`
    });

    return res.status(201).json({
      success: true,
      message: 'Webhook diproses: Karyawan berhasil diprovisi.',
      employee: newEmployee
    });
  }

  // 2. Event Pemutusan Kerja / Resign (Auto-Offboarding)
  if (eventType === 'EMPLOYEE_TERMINATED') {
    const { employeeId } = data;
    const index = employees.findIndex(e => e.id === employeeId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    }

    const revoked = revokeEmployeeAccess(employees[index]);
    employees[index] = revoked;

    addAuditLog({
      action: 'WEBHOOK_OFFBOARD_SUCCESS',
      targetUser: revoked.companyEmail,
      actor: 'External-HR-Webhook (HMAC-Verified)',
      status: 'SUCCESS',
      details: 'Automated M2M offboarding: Login disabled, RBAC groups purged, sessions destroyed.'
    });

    return res.json({
      success: true,
      message: 'Webhook diproses: Akses karyawan berhasil dicabut instan.',
      employee: revoked
    });
  }

  return res.status(400).json({ success: false, message: `eventType '${eventType}' tidak dikenal.` });
});

export default router;