import { Router } from 'express';
import { col } from '../db.js';
import { HttpError, newId, wrap, serialize, serializeMany, toStr, toInt, toArray } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';
import { refreshCareerStats } from '../services/stats.js';

const router = Router();
router.use(requireAuth);

const LEVELS = ['junior', 'mid', 'senior', 'lead'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

async function ownInterview(req) {
  const interview = await col('mock_interviews').findOne({ _id: req.params.id, user_id: req.userId });
  if (!interview) throw new HttpError(404, 'Interview not found');
  return interview;
}

router.get('/', wrap(async (req, res) => {
  const docs = await col('mock_interviews').find({ user_id: req.userId }).sort({ created_at: -1 }).limit(50).toArray();
  res.json({ interviews: serializeMany(docs) });
}));

// Start an interview session
router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const role = toStr(b.role, 150);
  if (!role) throw new HttpError(400, 'Role is required');

  const interview = {
    _id: newId(),
    user_id: req.userId,
    resume_id: typeof b.resume_id === 'string' && b.resume_id ? b.resume_id : null,
    role,
    experience_level: LEVELS.includes(b.experience_level) ? b.experience_level : 'mid',
    difficulty: DIFFICULTIES.includes(b.difficulty) ? b.difficulty : 'medium',
    total_score: 0,
    feedback: '',
    status: 'in_progress',
    created_at: new Date(),
    completed_at: null,
  };
  await col('mock_interviews').insertOne(interview);
  await logActivity(req.userId, { activity_type: 'interview_start', title: `Started ${role} interview practice` });
  res.status(201).json({ interview: serialize(interview) });
}));

// Save one answered question
router.post('/:id/questions', wrap(async (req, res) => {
  const interview = await ownInterview(req);
  const b = req.body || {};
  const question = toStr(b.question, 3000);
  if (!question) throw new HttpError(400, 'Question is required');

  const now = new Date();
  const doc = {
    _id: newId(),
    interview_id: interview._id,
    user_id: req.userId,
    question,
    category: toStr(b.category, 100) || 'technical',
    difficulty: DIFFICULTIES.includes(b.difficulty) ? b.difficulty : 'medium',
    user_answer: toStr(b.user_answer, 20000),
    ideal_answer: toStr(b.ideal_answer, 20000),
    score: toInt(b.score),
    strengths: toArray(b.strengths),
    weaknesses: toArray(b.weaknesses),
    suggestions: toArray(b.suggestions),
    question_order: toInt(b.question_order, 0, 0, 1000),
    created_at: now,
    answered_at: now,
  };
  await col('interview_questions').insertOne(doc);
  res.status(201).json({ question: serialize(doc) });
}));

// Finish the interview: total score = average of saved question scores (falls back to the client value)
router.post('/:id/complete', wrap(async (req, res) => {
  const interview = await ownInterview(req);
  const answered = await col('interview_questions')
    .find({ interview_id: interview._id }, { projection: { score: 1 } })
    .toArray();

  const total_score = answered.length
    ? Math.round(answered.reduce((s, q) => s + (q.score || 0), 0) / answered.length)
    : toInt(req.body?.total_score);

  await col('mock_interviews').updateOne(
    { _id: interview._id },
    { $set: { status: 'completed', completed_at: new Date(), total_score, feedback: toStr(req.body?.feedback, 5000) } }
  );
  await logActivity(req.userId, {
    activity_type: 'interview_complete',
    title: `Completed ${interview.role} interview practice`,
    metadata: { score: total_score, role: interview.role },
  });
  await refreshCareerStats(req.userId).catch(() => {});
  res.json({ total_score });
}));

export default router;
