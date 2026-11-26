import { Router } from 'express';
import crypto from 'crypto';
import { addAuditLog } from '../data/store.js';

const router = Router();

// Akun Admin Statis untuk Portal HR
const ADMIN_USER = {
  email: 'admin@zerotrust.corp',
  password: 'AdminPassword2026!',
  mfaSecret: '123456' // Simulasi 6-digit TOTP code
};

// In-memory token store dengan waktu kedaluwarsa (15 menit)
export const activeAdminTokens = new Set();

/**
 * POST /api/auth/login
 * Memverifikasi Kredensial Admin + Simulasi Kode MFA
 */
router.post('/login', (req, res) => {
  const { email, password, mfaCode } = req.body;

  // Verifikasi Kredensial & MFA Code
  if (email !== ADMIN_USER.email || password !== ADMIN_USER.password || mfaCode !== ADMIN_USER.mfaSecret) {
    addAuditLog({
      action: 'ADMIN_LOGIN_FAILED',
      targetUser: email || 'UNKNOWN',
      actor: req.ip,
      status: 'BLOCKED',
      details: 'Invalid admin credentials or invalid MFA token provided.'
    });

    return res.status(401).json({
      success: false,
      message: 'Autentikasi gagal: Email, password, atau kode MFA salah.'
    });
  }

  // Generate short-lived session token
  const token = `ZT-ADMIN-SESSION-${crypto.randomBytes(16).toString('hex')}`;
  activeAdminTokens.add(token);

  // Auto-expire token setelah 15 menit
  setTimeout(() => {
    activeAdminTokens.delete(token);
  }, 15 * 60 * 1000);

  addAuditLog({
    action: 'ADMIN_LOGIN_SUCCESS',
    targetUser: email,
    actor: req.ip,
    status: 'SUCCESS',
    details: 'Zero-Trust Admin Session authenticated via Password + MFA.'
  });

  res.json({
    success: true,
    message: 'Login Admin berhasil. Sesi diverifikasi.',
    token,
    expiresIn: '15m'
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    activeAdminTokens.delete(token);
  }

  addAuditLog({
    action: 'ADMIN_LOGOUT',
    targetUser: 'admin@zerotrust.corp',
    actor: req.ip,
    status: 'SUCCESS',
    details: 'Admin session terminated explicitly.'
  });

  res.json({ success: true, message: 'Logout berhasil.' });
});

export default router;