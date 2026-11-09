import { Router } from 'express';
import { col } from '../db.js';
import { HttpError, newId, wrap, serialize, serializeMany, toStr, toInt, toArray, toObject } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { refreshCareerStats } from '../services/stats.js';

const router = Router();
router.use(requireAuth);

const VALID_SOURCES = ['resume', 'skills', 'github', 'role', 'general'];

/**
 * Allow-listed record types. Only these collections / fields can be written from the client;
 * user_id always comes from the verified JWT (so users can only touch their own data).
 */
const TYPES = {
  job_matches: {
    required: ['job_description'],
    build: (b) => ({
      resume_id: typeof b.resume_id === 'string' && b.resume_id ? b.resume_id : null,
      job_description: toStr(b.job_description, 30000),
      job_title: toStr(b.job_title, 200),
      company: toStr(b.company, 200),
      match_percentage: toInt(b.match_percentage),
      matched_skills: toArray(b.matched_skills),
      missing_skills: toArray(b.missing_skills),
      suggestions: toArray(b.suggestions),
    }),
  },
  cover_letters: {
    required: ['content'],
    build: (b) => ({
      resume_id: typeof b.resume_id === 'string' && b.resume_id ? b.resume_id : null,
      job_match_id: typeof b.job_match_id === 'string' && b.job_match_id ? b.job_match_id : null,
      content: toStr(b.content, 30000),
      job_title: toStr(b.job_title, 200),
      company: toStr(b.company, 200),
    }),
  },
  skill_gap_analyses: {
    required: ['target_role'],
    build: (b) => ({
      current_skills: toArray(b.current_skills),
      target_role: toStr(b.target_role, 200),
      missing_skills: toArray(b.missing_skills),
      priority_skills: toArray(b.priority_skills),
      recommendations: toArray(b.recommendations),
    }),
  },
  learning_roadmaps: {
    required: ['target_role'],
    build: (b) => ({
      target_role: toStr(b.target_role, 200),
      milestones: toArray(b.milestones),
      estimated_duration: toStr(b.estimated_duration, 100),
      progress: toInt(b.progress),
    }),
  },
  github_analyses: {
    required: ['github_url', 'username'],
    build: (b) => ({
      github_url: toStr(b.github_url, 500),
      username: toStr(b.username, 100),
      profile_data: toObject(b.profile_data),
      strengths: toArray(b.strengths),
      weaknesses: toArray(b.weaknesses),
      recommendations: toArray(b.recommendations),
      score: toInt(b.score),
    }),
  },
  project_analyses: {
    required: ['repo_url', 'repo_name'],
    build: (b) => ({
      repo_url: toStr(b.repo_url, 500),
      repo_name: toStr(b.repo_name, 200),
      technologies: toArray(b.technologies),
      summary: toStr(b.summary, 5000),
      strengths: toArray(b.strengths),
      weaknesses: toArray(b.weaknesses),
      recommendations: toArray(b.recommendations),
      quality_score: toInt(b.quality_score),
    }),
  },
  generated_questions: {
    required: ['source'],
    build: (b) => ({
      source: VALID_SOURCES.includes(b.source) ? b.source : 'general',
      source_id: typeof b.source_id === 'string' && b.source_id ? b.source_id : null,
      category: toStr(b.category, 200) || 'general',
      questions: toArray(b.questions),
    }),
  },
};

function getType(req) {
  const type = TYPES[req.params.type];
  if (!type) throw new HttpError(404, 'Unknown record type');
  return type;
}

// Create
router.post('/:type', wrap(async (req, res) => {
  const type = getType(req);
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  for (const f of type.required) {
    if (body[f] === undefined || body[f] === null || body[f] === '') throw new HttpError(400, `"${f}" is required`);
  }
  const doc = { _id: newId(), user_id: req.userId, ...type.build(body), created_at: new Date() };
  if (req.params.type === 'learning_roadmaps') doc.updated_at = doc.created_at;

  await col(req.params.type).insertOne(doc);
  if (['learning_roadmaps', 'skill_gap_analyses', 'cover_letters'].includes(req.params.type)) {
    await refreshCareerStats(req.userId).catch(() => {});
  }
  res.status(201).json({ record: serialize(doc) });
}));

// List (newest first)
router.get('/:type', wrap(async (req, res) => {
  getType(req);
  const limit = toInt(req.query.limit, 50, 1, 200);
  const docs = await col(req.params.type).find({ user_id: req.userId }).sort({ created_at: -1 }).limit(limit).toArray();
  res.json({ records: serializeMany(docs) });
}));

// Delete
router.delete('/:type/:id', wrap(async (req, res) => {
  getType(req);
  const result = await col(req.params.type).deleteOne({ _id: req.params.id, user_id: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Record not found');
  res.json({ ok: true });
}));

export default router;
