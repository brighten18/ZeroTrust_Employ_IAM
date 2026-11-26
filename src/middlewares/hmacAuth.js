import crypto from 'crypto';
import { addAuditLog } from '../data/store.js';

export function verifyHmacSignature(req, res, next) {
  const secret = process.env.HMAC_SECRET;
  const signature = req.headers['x-signature-sha256'];
  const timestamp = req.headers['x-timestamp'];

  // 1. Cek keberadaan header keamanan
  if (!signature || !timestamp) {
    addAuditLog({
      action: 'SECURITY_ALERT_UNAUTHORIZED',
      targetUser: 'API_GATEWAY',
      actor: req.ip,
      status: 'BLOCKED',
      details: 'Missing HMAC signature or timestamp header.'
    });

    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Header x-signature-sha256 dan x-timestamp wajib disertakan.'
    });
  }

  // 2. Proteksi Replay Attack (Maksimal perbedaan waktu 5 menit = 300.000 ms)
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
    addAuditLog({
      action: 'SECURITY_ALERT_REPLAY_ATTACK',
      targetUser: 'API_GATEWAY',
      actor: req.ip,
      status: 'BLOCKED',
      details: `Request expired. Difference: ${Math.abs(currentTime - requestTime)}ms`
    });

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Request kedaluwarsa (potensi Replay Attack terdeteksi).'
    });
  }

  // 3. Hitung Expected HMAC Signature
  // Formula: HMAC-SHA256(timestamp + JSON.stringify(body), secret)
  const payloadString = timestamp + (Object.keys(req.body || {}).length > 0 ? JSON.stringify(req.body) : '');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  // 4. Bandingkan dengan timingSafeEqual (Mencegah Side-Channel / Timing Attacks)
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    addAuditLog({
      action: 'SECURITY_ALERT_TAMPERING',
      targetUser: 'API_GATEWAY',
      actor: req.ip,
      status: 'BLOCKED',
      details: 'Invalid cryptographic signature. Payload may have been modified in transit.'
    });

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Validasi HMAC Signature gagal (Integritas data diragukan).'
    });
  }

  // Verifikasi berhasil, lanjutkan ke route handler
  next();
}