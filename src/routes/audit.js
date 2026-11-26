import { Router } from 'express';
import { getAuditLogs } from '../data/store.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: getAuditLogs() });
});

export default router;