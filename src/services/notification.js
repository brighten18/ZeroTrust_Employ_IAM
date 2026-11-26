import { addAuditLog } from '../data/store.js';

/**
 * Simulasi Pengiriman Email Kredensial Sementara ke Email Pribadi Karyawan
 * (Di production: menggunakan AWS SES, SendGrid, atau SMTP Enterprise)
 */
export function sendTemporaryCredentialsEmail({ fullName, personalEmail, companyEmail, tempPassword, role, mfaEnforced }) {
  const emailPayload = {
    to: personalEmail,
    subject: 'Selamat Datang di ZeroTrust Corp - Kredensial Akun Kantor Anda',
    sentAt: new Date().toISOString(),
    content: `
Halo ${fullName},

Akun kantor Anda telah berhasil diprovisi pada direktori identitas Zero-Trust IAM.
Berikut kredensial login sementara Anda:

- Username Kantor: ${companyEmail}
- Temporary Password: ${tempPassword}
- Role Akses: ${role}
- Kebijakan MFA: ${mfaEnforced ? 'WAJIB DIKONFIGURASI PADA LOGIN PERTAMA' : 'Standard'}

PERHATIAN KEAMANAN (ZERO-TRUST POLICY):
Password di atas bersifat sementara dan kedaluwarsa dalam 24 jam.
Anda wajib segera mengganti password serta mendaftarkan aplikasi Authenticator (MFA)
pada saat melakukan login perdana.
    `.trim()
  };

  // Log simulasi pengiriman ke terminal backend
  console.log('\n================ NOTIFICATION SERVICE (EMAIL DISPATCH) ================');
  console.log(`[DISPATCH SUCCESS] Mengirim kredensial ke email pribadi: ${personalEmail}`);
  console.log(`[TARGET USER] ${companyEmail} | Temp Password: ${tempPassword}`);
  console.log('=======================================================================\n');

  // Catat event pengiriman kredensial ke Audit Log
  addAuditLog({
    action: 'CREDENTIALS_DISPATCHED',
    targetUser: companyEmail,
    actor: 'Notification-Service',
    status: 'SUCCESS',
    details: `Temporary credentials securely sent to personal email [${personalEmail}]. MFA Setup required.`
  });

  return emailPayload;
}