import crypto from 'crypto';

// Pemetaan Kebijakan RBAC & Security Posture
const RBAC_POLICIES = {
  Developer: {
    groups: ['GitHub-Org-Members', 'AWS-Dev-Role'],
    mfaRequired: true
  },
  Finance: {
    groups: ['ERP-Finance-System', 'Banking-ReadOnly-Role'],
    mfaRequired: true
  },
  'Staff Umum': {
    groups: ['Google-Workspace-Core', 'HR-Portal-User'],
    mfaRequired: false
  }
};

/**
 * Menghasilkan email kantor otomatis dari nama lengkap
 * Contoh: "Budi Santoso" -> "budi.santoso@zerotrust.corp"
 */
export function generateCompanyEmail(fullName) {
  const sanitized = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .join('.');
  return `${sanitized}@zerotrust.corp`;
}

/**
 * Menghasilkan temporary password acak dengan entropi tinggi
 */
export function generateTemporaryPassword() {
  return `ZT#${crypto.randomBytes(4).toString('hex').toUpperCase()}!${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Logika Provisi Akun Baru (Onboarding)
 */
export function provisionEmployee({ fullName, personalEmail, department, role }) {
  const policy = RBAC_POLICIES[role] || RBAC_POLICIES['Staff Umum'];
  const companyEmail = generateCompanyEmail(fullName);
  const tempPassword = generateTemporaryPassword();

  return {
    id: `EMP-${Date.now().toString().slice(-4)}`,
    fullName,
    personalEmail,
    companyEmail,
    department,
    role,
    status: 'Active',
    assignedGroups: [...policy.groups],
    mfaEnforced: policy.mfaRequired,
    activeSessions: 1, // Sesi default terbuat saat login awal
    tempPassword, // Disimulasikan dikirim ke personalEmail
    createdAt: new Date().toISOString()
  };
}

/**
 * Logika Pencabutan Akses Instan (Offboarding / Zero-Trust Revocation)
 */
export function revokeEmployeeAccess(employee) {
  return {
    ...employee,
    status: 'Revoked',
    assignedGroups: [], // Hapus seluruh grup RBAC
    activeSessions: 0,  // Hancurkan seluruh token dan sesi aktif
    revokedAt: new Date().toISOString()
  };
}