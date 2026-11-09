import { col } from '../db.js';
import { newId } from '../utils.js';

/** Compute dashboard statistics live from the source collections (always up to date, no manual upkeep). */
export async function computeCareerStats(userId) {
  const [resumes, interviews, coverLetters, roadmaps, skillGaps] = await Promise.all([
    col('resumes').find({ user_id: userId }, { projection: { score: 1, ats_score: 1 } }).toArray(),
    col('mock_interviews').find({ user_id: userId, status: 'completed' }, { projection: { total_score: 1 } }).toArray(),
    col('cover_letters').countDocuments({ user_id: userId }),
    col('learning_roadmaps').countDocuments({ user_id: userId }),
    col('skill_gap_analyses').countDocuments({ user_id: userId }),
  ]);

  const resume_score = resumes.length ? Math.max(...resumes.map((r) => r.score || 0)) : 0;
  const ats_score = resumes.length ? Math.max(...resumes.map((r) => r.ats_score || 0)) : 0;
  const interview_score = interviews.length
    ? Math.round(interviews.reduce((sum, i) => sum + (i.total_score || 0), 0) / interviews.length)
    : 0;
  const learning_progress = Math.min(roadmaps * 20 + skillGaps * 10, 100);
  const skills_improved = Math.min(skillGaps * 10, 100);
  const job_readiness = Math.min(
    Math.round(resume_score * 0.35 + ats_score * 0.25 + interview_score * 0.25 + Math.min(coverLetters * 10, 15)),
    100
  );

  return {
    resume_score,
    ats_score,
    job_readiness,
    interview_score,
    skills_improved,
    learning_progress,
    total_interviews: interviews.length,
    total_resumes: resumes.length,
    total_cover_letters: coverLetters,
  };
}

/** Compute and persist (upsert) the stats document for a user. */
export async function refreshCareerStats(userId) {
  const stats = await computeCareerStats(userId);
  const now = new Date();
  await col('career_stats').updateOne(
    { user_id: userId },
    { $set: { ...stats, updated_at: now }, $setOnInsert: { _id: newId(), created_at: now } },
    { upsert: true }
  );
  return stats;
}
