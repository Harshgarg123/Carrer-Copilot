import { Router } from 'express';
import { col } from '../db.js';
import { HttpError, wrap, serializeMany, toInt, toStr } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

const router = Router();
router.use(requireAuth);

router.get('/', wrap(async (req, res) => {
  const limit = toInt(req.query.limit, 10, 1, 100);
  const docs = await col('user_activities').find({ user_id: req.userId }).sort({ created_at: -1 }).limit(limit).toArray();
  res.json({ activities: serializeMany(docs) });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  if (!toStr(b.activity_type, 100) || !toStr(b.title, 300)) throw new HttpError(400, 'activity_type and title are required');
  await logActivity(req.userId, b);
  res.status(201).json({ ok: true });
}));

export default router;
