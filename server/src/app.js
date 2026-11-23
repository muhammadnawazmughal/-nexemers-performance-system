import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import dailyRecordRoutes from './routes/dailyRecordRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import targetRoutes from './routes/targetRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import dataRoutes from './routes/dataRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use('/api/v1/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }));
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      success: true,
      service: 'Nexemers Performance API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/teams', teamRoutes);
  app.use('/api/v1/daily-records', dailyRecordRoutes);
  app.use('/api/v1/sales', salesRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/targets', targetRoutes);
  app.use('/api/v1/schedules', scheduleRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1', dataRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: env.nodeEnv === 'production' ? 'Internal server error' : error.message,
    });
  });

  return app;
}
