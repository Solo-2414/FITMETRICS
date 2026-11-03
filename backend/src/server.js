import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import planRoutes from './routes/plans.js';
import clerkRoutes from './routes/clerk.js';
import attendanceRoutes from './routes/attendance.js';
import adminRoutes from './routes/admin.js';
import memberRoutes from './routes/member.js';
import { startEmailJobs } from './jobs/emailJobs.js';
import { paymongoWebhookRouter } from './routes/paymongo.js';
import publicRoutes from './routes/public.js';
import videoRoutes from './routes/videos.js';
import { mapDatabaseError } from './lib/errorMapper.js';
import publicCheckinRoutes from './routes/publicCheckin.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const configuredClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = new Set([configuredClientUrl]);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use('/api/paymongo/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120 }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', publicCheckinRoutes);
app.use('/api', videoRoutes);
app.use('/api', paymongoWebhookRouter);
app.use('/api', userRoutes);
app.use('/api', planRoutes);
app.use('/api', clerkRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', adminRoutes);
app.use('/api', memberRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const mapped = mapDatabaseError(err);
  const status = err.statusCode || 500;
  const response = { error: err.publicMessage || mapped.message, code: mapped.code };
  if (process.env.NODE_ENV !== 'production' && err.message) response.debug = err.message;
  res.status(status).json(response);
});

app.listen(PORT, () => console.log(`FITMETRICS API running on http://localhost:${PORT}`));
startEmailJobs();
