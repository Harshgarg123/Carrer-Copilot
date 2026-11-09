import { Router } from 'express';
import { col } from '../db.js';
import { HttpError, newId, wrap, toStr } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', wrap(async (req, res) => {
  const docs = await col('user_custom_roles').find({ user_id: req.userId }).sort({ created_at: 1 }).toArray();
  res.json({ roles: docs.map((d) => d.role_name) });
}));

router.post('/', wrap(async (req, res) => {
  const role_name = toStr(req.body?.role_name, 100);
  if (!role_name) throw new HttpError(400, 'Role name is required');
  try {
    await col('user_custom_roles').insertOne({
      _id: newId(),
      user_id: req.userId,
      role_name,
      role_key: role_name.toLowerCase(),
      created_at: new Date(),
    });
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'This role already exists');
    throw err;
  }
  res.status(201).json({ role_name });
}));

router.delete('/', wrap(async (req, res) => {
  const role_name = toStr(typeof req.query.role_name === 'string' ? req.query.role_name : '', 100);
  if (!role_name) throw new HttpError(400, 'Role name is required');
  await col('user_custom_roles').deleteOne({ user_id: req.userId, role_key: role_name.toLowerCase() });
  res.json({ ok: true });
}));

export default router;
