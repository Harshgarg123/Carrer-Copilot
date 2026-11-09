import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { col } from '../db.js';
import { config } from '../config.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { HttpError, newId, wrap, serialize, toStr, rateLimiter } from '../utils.js';
import { refreshCareerStats } from '../services/stats.js';
import { sendPasswordResetEmail } from '../services/mailer.js';

const router = Router();
const HIDDEN = ['password_hash'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Brute-force protection: strict per (IP + account), generous per IP (shared networks / NAT)
const perAccountLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => `${req.ip}:${typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''}`,
  message: 'Too many attempts. Please try again in a few minutes.',
});
const perIpLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyFn: (req) => `${req.ip}`,
  message: 'Too many requests. Please try again in a few minutes.',
});
const authLimiter = [perIpLimiter, perAccountLimiter];

function readEmail(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new HttpError(400, 'Please enter a valid email address');
  }
  return email;
}

function readPassword(body) {
  const password = typeof body?.password === 'string' ? body.password : '';
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(400, 'Password is too long (max 72 characters)');
  return password;
}

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

router.post('/signup', authLimiter, wrap(async (req, res) => {
  const email = readEmail(req.body);
  const password = readPassword(req.body);
  const full_name = toStr(req.body?.full_name, 120);

  const now = new Date();
  const user = {
    _id: newId(),
    email,
    password_hash: await bcrypt.hash(password, 10),
    full_name,
    avatar_url: '',
    created_at: now,
    updated_at: now,
  };

  if (await col('users').findOne({ email }, { projection: { _id: 1 } })) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  try {
    await col('users').insertOne(user);
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this email already exists');
    throw err;
  }

  // Create the initial career_stats document for the new account
  await refreshCareerStats(user._id).catch((e) => console.warn('[stats] init failed:', e.message));

  res.status(201).json({ token: signToken(user._id), user: serialize(user, HIDDEN) });
}));

router.post('/login', authLimiter, wrap(async (req, res) => {
  const email = readEmail(req.body);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const user = await col('users').findOne({ email });
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');

  res.json({ token: signToken(user._id), user: serialize(user, HIDDEN) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await col('users').findOne({ _id: req.userId });
  if (!user) throw new HttpError(401, 'Account not found. Please sign in again.');
  res.json({ user: serialize(user, HIDDEN) });
}));

router.post('/forgot-password', authLimiter, wrap(async (req, res) => {
  const email = readEmail(req.body);
  const user = await col('users').findOne({ email });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await col('password_resets').deleteMany({ user_id: user._id });
    await col('password_resets').insertOne({
      _id: newId(),
      user_id: user._id,
      token_hash: sha256(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date(),
    });
    const link = `${config.clientOrigin.replace(/\/$/, '')}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(email, link);
    } catch (err) {
      console.error('[mail] failed to send reset email:', err.message);
    }
  }
  // Same response whether or not the account exists (prevents account enumeration)
  res.json({ ok: true });
}));

router.post('/reset-password', authLimiter, wrap(async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = readPassword(req.body);
  if (!token) throw new HttpError(400, 'Reset token is missing');

  const record = await col('password_resets').findOne({ token_hash: sha256(token) });
  if (!record || record.expires_at < new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired');
  }

  await col('users').updateOne(
    { _id: record.user_id },
    { $set: { password_hash: await bcrypt.hash(password, 10), updated_at: new Date() } }
  );
  await col('password_resets').deleteMany({ user_id: record.user_id });
  res.json({ ok: true });
}));

export default router;

// ---- Profile (mounted at /api/profile) ----
export const profileRouter = Router();

profileRouter.get('/', requireAuth, wrap(async (req, res) => {
  const user = await col('users').findOne({ _id: req.userId });
  if (!user) throw new HttpError(401, 'Account not found. Please sign in again.');
  res.json({ user: serialize(user, HIDDEN) });
}));

profileRouter.patch('/', requireAuth, wrap(async (req, res) => {
  const updates = { updated_at: new Date() };
  if (typeof req.body?.full_name === 'string') updates.full_name = toStr(req.body.full_name, 120);
  if (typeof req.body?.avatar_url === 'string') updates.avatar_url = toStr(req.body.avatar_url, 1000);

  const result = await col('users').findOneAndUpdate(
    { _id: req.userId },
    { $set: updates },
    { returnDocument: 'after' }
  );
  const user = result?.value !== undefined ? result.value : result; // driver v5/v6 compatibility
  if (!user) throw new HttpError(404, 'Account not found');
  res.json({ user: serialize(user, HIDDEN) });
}));
