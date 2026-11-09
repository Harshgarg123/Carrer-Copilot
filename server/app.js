import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config, ROOT_DIR } from './config.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRouter, { profileRouter } from './routes/auth.js';
import resumesRouter from './routes/resumes.js';
import recordsRouter from './routes/records.js';
import activitiesRouter from './routes/activities.js';
import customRolesRouter from './routes/customRoles.js';
import dashboardRouter from './routes/dashboard.js';
import interviewsRouter from './routes/interviews.js';
import aiRouter from './routes/ai.js';
import { hasGroq } from './services/groq.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const origins = config.clientOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, ai: hasGroq() }));

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/records', recordsRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/custom-roles', customRolesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/interviews', interviewsRouter);
  app.use('/api/ai', aiRouter);

  app.use('/api', notFound);

  // Production: serve the built React app (npm run build) from the same server
  const dist = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
