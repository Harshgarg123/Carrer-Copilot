import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { Binary } from 'mongodb';
import { col } from '../db.js';
import { HttpError, newId, wrap, serialize, serializeMany } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { extractResumeText, toPlainBuffer } from '../services/resumeText.js';
import { analyzeResumeText } from '../services/resumeAnalysis.js';
import { logActivity } from '../services/activity.js';
import { refreshCareerStats } from '../services/stats.js';

const router = Router();
router.use(requireAuth);

// 4MB: Vercel serverless functions reject request bodies above ~4.5MB (and it fits MongoDB's 16MB document limit)
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);
const HIDDEN = ['extracted_text'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new HttpError(400, 'Please upload a PDF or DOCX file'));
    cb(null, true);
  },
});

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
};

// List resumes (newest first)
router.get('/', wrap(async (req, res) => {
  const docs = await col('resumes')
    .find({ user_id: req.userId }, { projection: { extracted_text: 0 } })
    .sort({ created_at: -1 })
    .toArray();
  res.json({ resumes: serializeMany(docs, HIDDEN) });
}));

// Upload a resume (multipart/form-data, field "file")
router.post('/', upload.single('file'), wrap(async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, 'No file uploaded');

  const ext = path.extname(file.originalname).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  const id = newId();
  const now = new Date();

  const extracted_text = await extractResumeText(file.buffer, file.originalname, contentType);

  const resume = {
    _id: id,
    user_id: req.userId,
    file_name: file.originalname.slice(0, 255),
    file_url: `/api/resumes/${id}/file`,
    extracted_data: {},
    extracted_text,
    score: 0,
    ats_score: 0,
    created_at: now,
    updated_at: now,
  };

  await col('resume_files').insertOne({
    _id: id,
    user_id: req.userId,
    content_type: contentType,
    size: file.size,
    data: new Binary(file.buffer),
    created_at: now,
  });
  try {
    await col('resumes').insertOne(resume);
  } catch (err) {
    await col('resume_files').deleteOne({ _id: id }).catch(() => {});
    throw err;
  }

  await logActivity(req.userId, { activity_type: 'resume_upload', title: `Uploaded resume: ${resume.file_name}` });
  await refreshCareerStats(req.userId).catch(() => {});

  res.status(201).json({ resume: serialize(resume, HIDDEN) });
}));

// Download / view the original file
router.get('/:id/file', wrap(async (req, res) => {
  const resume = await col('resumes').findOne({ _id: req.params.id, user_id: req.userId }, { projection: { file_name: 1 } });
  const fileDoc = resume && (await col('resume_files').findOne({ _id: req.params.id, user_id: req.userId }));
  if (!resume || !fileDoc) throw new HttpError(404, 'Resume file not found');

  const buf = toPlainBuffer(fileDoc.data);
  res.set('Content-Type', fileDoc.content_type || 'application/octet-stream');
  res.set('Content-Length', String(buf.length));
  res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(resume.file_name)}`);
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(buf);
}));

// Analyze a resume with AI, then save scores + analysis
router.post('/:id/analyze', wrap(async (req, res) => {
  const resume = await col('resumes').findOne({ _id: req.params.id, user_id: req.userId });
  if (!resume) throw new HttpError(404, 'Resume not found');

  let text = resume.extracted_text || '';
  if (!text) {
    // Older upload / extraction failed earlier: try again from the stored file
    const fileDoc = await col('resume_files').findOne({ _id: resume._id });
    if (fileDoc) {
      const buf = toPlainBuffer(fileDoc.data);
      text = await extractResumeText(buf, resume.file_name, fileDoc.content_type);
      if (text) await col('resumes').updateOne({ _id: resume._id }, { $set: { extracted_text: text } });
    }
  }
  if (!text) {
    throw new HttpError(422, 'Could not read any text from this file. Please upload a text-based PDF or a DOCX file (scanned images and legacy .doc files are not supported).');
  }

  const analysis = await analyzeResumeText(text);
  const now = new Date();

  await col('resume_analyses').insertOne({
    _id: newId(),
    resume_id: resume._id,
    user_id: req.userId,
    ...analysis,
    created_at: now,
  });
  await col('resumes').updateOne(
    { _id: resume._id },
    { $set: { score: analysis.overall_score, ats_score: analysis.ats_score, updated_at: now } }
  );
  await logActivity(req.userId, {
    activity_type: 'resume_analysis',
    title: `Analyzed resume: ${resume.file_name}`,
    metadata: { score: analysis.overall_score },
  });
  await refreshCareerStats(req.userId).catch(() => {});

  res.json(analysis);
}));

// Delete a resume (+ its file and analyses; job matches / cover letters keep a null reference)
router.delete('/:id', wrap(async (req, res) => {
  const result = await col('resumes').deleteOne({ _id: req.params.id, user_id: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Resume not found');
  await Promise.all([
    col('resume_files').deleteOne({ _id: req.params.id }),
    col('resume_analyses').deleteMany({ resume_id: req.params.id, user_id: req.userId }),
    col('job_matches').updateMany({ resume_id: req.params.id, user_id: req.userId }, { $set: { resume_id: null } }),
    col('cover_letters').updateMany({ resume_id: req.params.id, user_id: req.userId }, { $set: { resume_id: null } }),
    col('mock_interviews').updateMany({ resume_id: req.params.id, user_id: req.userId }, { $set: { resume_id: null } }),
  ]);
  await refreshCareerStats(req.userId).catch(() => {});
  res.json({ ok: true });
}));

export default router;
