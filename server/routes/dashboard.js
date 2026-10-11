import { Router } from 'express';
import { col } from '../db.js';
import { wrap, serializeMany } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { refreshCareerStats } from '../services/stats.js';

const router = Router();
router.use(requireAuth);

router.get('/', wrap(async (req, res) => {
  const [stats, activities] = await Promise.all([
    refreshCareerStats(req.userId),
    col('user_activities')
      .find({ user_id: req.userId }, { projection: { activity_type: 1, title: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray(),
  ]);
  res.json({ stats, activities: serializeMany(activities) });
}));

export default router;
