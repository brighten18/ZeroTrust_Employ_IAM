import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.js'; // <-- Tambahkan
import employeeRoutes from './src/routes/employees.js';
import auditRoutes from './src/routes/audit.js';
import webhookRoutes from './src/routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mounting API Routes
app.use('/api/auth', authRoutes); // <-- Tambahkan
app.use('/api/employees', employeeRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Zero-Trust IAM Orchestrator',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  console.log(`Zero-Trust IAM Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah digunakan. Coba ganti PORT di file .env.`);
  } else {
    console.error('Server error:', err);
  }
});