import { Router } from 'express';
import { col } from '../db.js';
import { wrap, newId, toStr } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';
import { groqChat, groqJson, groqText, contentOf, parseJson, hasGroq, MODEL_FAST, MODEL_SMART } from '../services/groq.js';

const router = Router();
router.use(requireAuth);

const FAST = MODEL_FAST;
const SMART = MODEL_SMART;

const asArray = (v) => (Array.isArray(v) ? v : []);
const strArray = (v) => asArray(v).map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));

// ───────────────────────── AI Mentor ─────────────────────────
router.post('/ai-mentor', wrap(async (req, res) => {
  const message = toStr(req.body?.message, 4000);
  const history = asArray(req.body?.history).slice(-10);
  if (!message) return res.status(400).json({ error: 'Message is required' });

  if (!hasGroq()) {
    return res.json({ response: "Hello! I'm your AI Career Mentor. I can help you with career guidance, resume tips, interview preparation, and skill development. What would you like to know?" });
  }

  const systemPrompt = `You are an AI Career Mentor for software developers. Provide helpful, actionable advice on:
- Career guidance
- Resume optimization
- Interview preparation
- Technical skills
- Job search strategies

Be concise and encouraging.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
    { role: 'user', content: message },
  ];
  const response = await groqText({ model: FAST, messages, max_tokens: 1024, temperature: 0.7 });
  res.json({ response });
}));

// ───────────────────────── Resume text helper (job match) ─────────────────────────
async function resumeTextFor(userId, resumeId) {
  if (typeof resumeId !== 'string' || !resumeId) return '';
  const r = await col('resumes').findOne({ _id: resumeId, user_id: userId }, { projection: { extracted_text: 1 } });
  return r?.extracted_text || '';
}

// ───────────────────────── Job match ─────────────────────────
router.post('/job-match', wrap(async (req, res) => {
  const jobDescription = toStr(req.body?.jobDescription, 30000);
  const jobTitle = toStr(req.body?.jobTitle, 200);
  const company = toStr(req.body?.company, 200);
  if (!jobDescription) return res.status(400).json({ error: 'Job description is required' });

  if (!hasGroq()) {
    return res.json({
      match_percentage: 68,
      matched_skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
      missing_skills: ['TypeScript', 'AWS', 'Docker', 'CI/CD', 'PostgreSQL'],
      suggestions: ['Consider adding TypeScript to your skill set', 'Gain experience with cloud platforms like AWS', 'Learn containerization with Docker', 'Add experience with CI/CD pipelines'],
    });
  }

  const systemPrompt = `You are a job matching expert. Compare the job description with the candidate's profile and return JSON with:
1. match_percentage (0-100)
2. matched_skills (array of strings)
3. missing_skills (array of strings)
4. suggestions (array of strings)

Return valid JSON only.`;

  const resume =
    toStr(req.body?.resumeText, 30000) ||
    (await resumeTextFor(req.userId, req.body?.resumeId)) ||
    'Software Developer skilled in JavaScript, React, Node.js, SQL, Python, Git';

  const result = await groqJson({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job: ${jobTitle || 'Software Engineer'} at ${company || 'Company'}\n\nJD:\n${jobDescription}\n\nCandidate:\n${resume.slice(0, 12000)}` },
      ],
      max_tokens: 1024,
      temperature: 0.5,
      json: true,
    });
  const pct = Number(result.match_percentage);
  res.json({
    match_percentage: Number.isFinite(pct) && pct > 0 ? Math.min(100, Math.round(pct)) : 65,
    matched_skills: strArray(result.matched_skills),
    missing_skills: strArray(result.missing_skills),
    suggestions: strArray(result.suggestions),
  });
}));

// ───────────────────────── Cover letter ─────────────────────────
router.post('/cover-letter', wrap(async (req, res) => {
  const jobTitle = toStr(req.body?.jobTitle, 200);
  const company = toStr(req.body?.company, 200);
  const jobDescription = toStr(req.body?.jobDescription, 30000);
  const additionalInfo = toStr(req.body?.additionalInfo, 5000);

  if (!hasGroq()) {
    return res.json({
      content: `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle || 'Software Engineer'} position at ${company || 'your company'}. With my experience in software development and passion for creating innovative solutions, I am excited about the opportunity to contribute to your team.

In my previous roles, I have successfully delivered projects that improved system performance and user experience. My technical skills and collaborative approach make me well-suited for this position.

I am particularly drawn to ${company || 'your company'} for its commitment to innovation and excellence. I would welcome the opportunity to bring my expertise and enthusiasm to your team.

Thank you for considering my application. I look forward to discussing how I can contribute to your continued success.

Best regards`,
    });
  }

  const content = await groqText({
      model: FAST,
      messages: [
        { role: 'system', content: 'You are an expert cover letter writer. Create a professional, personalized cover letter that is concise (max 300 words). Write in a warm, professional tone.' },
        { role: 'user', content: `Write a cover letter for:\nJob: ${jobTitle}\nCompany: ${company}\nJD: ${jobDescription}\nAdditional: ${additionalInfo || 'N/A'}` },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });
  res.json({ content });
}));

// ───────────────────────── Interview questions ─────────────────────────
function fallbackInterviewQuestions(role, difficulty) {
  return [
    { id: newId(), question: `Walk me through your background and what drew you to ${role}.`, category: 'Behavioral', difficulty: 'easy', hint: 'Keep it concise' },
    { id: newId(), question: `What's the most complex technical challenge you've faced as a ${role}?`, category: 'Technical', difficulty, hint: 'Use the STAR method' },
    { id: newId(), question: 'How do you ensure code quality and maintainability in your projects?', category: 'Technical', difficulty: 'medium', hint: 'Mention testing and code review' },
    { id: newId(), question: 'Describe a time you had to learn a new technology quickly under pressure.', category: 'Behavioral', difficulty: 'medium', hint: 'Focus on your learning process' },
    { id: newId(), question: `How would you design a scalable system for a core feature in a ${role} product?`, category: 'System Design', difficulty: 'hard', hint: 'Think about scalability and failure modes' },
  ];
}

router.post('/generate-interview', wrap(async (req, res) => {
  const role = toStr(req.body?.role, 150) || 'Software Engineer';
  const experienceLevel = toStr(req.body?.experienceLevel || req.body?.experience_level, 30) || 'mid';
  const difficulty = toStr(req.body?.difficulty, 30) || 'medium';
  const fallback = () => res.json({ questions: fallbackInterviewQuestions(role, difficulty), interviewId: newId() });

  if (!hasGroq()) return fallback();

  const systemPrompt = `You are an expert technical interviewer at a top tech company.
Generate exactly 5 interview questions tailored to the role and experience level.

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "question": "full interview question text",
      "category": "Technical | Behavioral | System Design | Problem Solving | Leadership",
      "difficulty": "easy | medium | hard",
      "hint": "one-line hint for the candidate"
    }
  ]
}

Rules:
- ALL questions must be SPECIFIC to the "${role}" role — no generic questions
- Mix: 2 Technical + 1 Behavioral + 1 System Design + 1 Problem Solving
- junior=easy/medium, mid=medium, senior/lead=medium/hard
- Each question answerable in 2-5 minutes verbally`;

  try {
    const { ok, data } = await groqChat({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Role: ${role}\nExperience Level: ${experienceLevel}\nDifficulty: ${difficulty}` },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      json: true,
    });
    if (!ok) return fallback();
    const parsed = parseJson(contentOf(data));
    let raw = [];
    if (Array.isArray(parsed.questions)) raw = parsed.questions;
    else if (parsed.questions && typeof parsed.questions === 'object') raw = Object.values(parsed.questions);
    if (raw.length === 0) return fallback();

    const questions = raw.slice(0, 5).map((q) => ({
      id: newId(),
      question: String(q?.question || 'Describe your approach to a challenging problem.'),
      category: String(q?.category || 'Technical'),
      difficulty: String(q?.difficulty || difficulty),
      hint: String(q?.hint || 'Take your time and think out loud.'),
    }));
    // If the model returned too few questions, top up from the built-in set
    for (const q of fallbackInterviewQuestions(role, difficulty)) {
      if (questions.length >= 5) break;
      questions.push(q);
    }
    res.json({ questions, interviewId: newId() });
  } catch (err) {
    console.error('[generate-interview]', err.message);
    fallback();
  }
}));

// ───────────────────────── Evaluate answer ─────────────────────────
function classifyAnswer(answer) {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();

  if (trimmed.length < 15) return { type: 'empty', detail: 'The response is fewer than 15 characters — nothing meaningful provided.' };

  const noSpaces = lower.replace(/\s/g, '');
  const freq = {};
  for (const ch of noSpaces) freq[ch] = (freq[ch] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  if (noSpaces.length > 8 && maxFreq / noSpaces.length > 0.5) {
    return { type: 'gibberish', detail: `Keyboard mash detected: ${Math.round((maxFreq / noSpaces.length) * 100)}% of characters are the same letter. This is not an answer.` };
  }

  const words = lower.split(/\s+/).filter(Boolean);
  const unique = new Set(words);
  if (words.length > 5 && unique.size / words.length < 0.25) {
    return { type: 'repetitive', detail: `Word spam detected: only ${unique.size} unique words out of ${words.length} total. This is not an answer.` };
  }

  const vowels = (lower.match(/[aeiou]/g) || []).length;
  const consonants = (lower.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  const letters = vowels + consonants;
  if (letters > 15 && vowels / letters < 0.12) return { type: 'gibberish', detail: 'Response contains almost no vowels — not readable language.' };

  return { type: 'real', detail: '' };
}

router.post('/evaluate-answer', wrap(async (req, res) => {
  const question = toStr(req.body?.question, 3000);
  const answerText = toStr(req.body?.answer, 20000);
  if (!question) return res.status(400).json({ error: 'question is required' });

  const classification = classifyAnswer(answerText);
  const maxAllowed = classification.type === 'real' ? 100 : 5;

  if (!hasGroq()) {
    if (classification.type !== 'real') {
      return res.json({
        score: 0,
        strengths: [],
        weaknesses: [classification.detail, 'No technical content found.'],
        suggestions: [`Please genuinely attempt: "${question.substring(0, 80)}…"`],
        verdict: 'no_attempt',
      });
    }
    const uWords = new Set(answerText.toLowerCase().split(/\s+/).filter(Boolean));
    const score = uWords.size >= 50 ? 58 : uWords.size >= 25 ? 45 : uWords.size >= 12 ? 32 : 20;
    return res.json({
      score,
      strengths: ['Contains genuine content'],
      weaknesses: ['AI evaluator not configured — score is estimated'],
      suggestions: ['Set GROQ_API_KEY in the server .env for accurate evaluation'],
      verdict: 'fallback_heuristic',
    });
  }

  const answerBlock =
    classification.type === 'real'
      ? `Candidate's answer:\n${answerText}`
      : `⚠ ANSWER QUALITY ALERT — ${classification.detail}\n\nCandidate's raw input:\n${answerText}`;

  const systemPrompt = `
You are a FAANG interviewer.

Your FIRST task is NOT scoring.

Your FIRST task is:

"Would a human interviewer consider this answer to be answering the question?"

If NO:

score MUST be between 0 and 10.

Examples:

Question:
What is null vs undefined?

Answer:
I optimized frontend performance using lazy loading.

Score: 0

Question:
Design a checkout flow in React.

Answer:
I improved application performance by reducing bundle size.

Score: 0

Question:
What are CSS Grid pitfalls?

Answer:
I optimized frontend performance.

Score: 0

Question:
Tell me about a time you optimized frontend performance.

Answer:
I optimized bundle size, lazy loaded components and reduced render cycles.

Score: 80+

RULES:

1. Being technical is NOT enough.
2. Being well written is NOT enough.
3. Being software related is NOT enough.
4. The answer must specifically answer THIS question.
5. If the answer would fail an interview because it ignored the question, score <= 10.

Return JSON:

{
  "relevance": number,
  "score": number,
  "strengths": [],
  "weaknesses": [],
  "suggestions": [],
  "verdict": ""
}
`;

  // If the AI is unavailable this throws a 502, so the UI shows an error and lets the user retry
  // (instead of silently recording a score of 0 for a real answer).
  const result = await groqJson({
    model: SMART,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Question: ${question}\n\n${answerBlock}` },
    ],
    max_tokens: 1200,
    temperature: 0.1,
    reasoning_effort: 'medium',
  });

  const relevance = Number(result.relevance || 0);
  let score = Number(result.score || 0);
  if (!Number.isFinite(score)) score = 0;
  if (relevance < 20) score = Math.min(score, 20);
  if (relevance === 0) score = 0;
  // Hard cap: gibberish/empty detected locally → AI cannot give more than 5
  const finalScore = Math.max(0, Math.min(maxAllowed, Math.round(score)));

  res.json({
    relevance,
    score: finalScore,
    strengths: strArray(result.strengths),
    weaknesses: strArray(result.weaknesses),
    suggestions: strArray(result.suggestions),
    verdict: result.verdict || 'poor',
  });
}));

// ───────────────────────── Generate questions ─────────────────────────
function fallbackQuestions(source, targetRole, skill) {
  const topic = source === 'role' ? targetRole : source === 'skills' ? skill : 'Software Engineering';
  return [
    { id: newId(), question: `What are the core responsibilities of a ${topic} professional?`, category: 'Behavioral', difficulty: 'easy', hint: 'Focus on day-to-day responsibilities' },
    { id: newId(), question: `Explain a key technical concept fundamental to ${topic}.`, category: 'Technical', difficulty: 'medium', hint: 'Use clear examples' },
    { id: newId(), question: `How would you architect a scalable system relevant to ${topic}?`, category: 'System Design', difficulty: 'hard', hint: 'Consider scalability and trade-offs' },
    { id: newId(), question: `Describe a challenging project you worked on related to ${topic}.`, category: 'Behavioral', difficulty: 'medium', hint: 'Use the STAR method' },
    { id: newId(), question: `What are the best practices and common pitfalls in ${topic}?`, category: 'Technical', difficulty: 'medium', hint: 'Draw from real experience' },
  ];
}

router.post('/generate-questions', wrap(async (req, res) => {
  const source = toStr(req.body?.source, 30) || 'general';
  const targetRole = toStr(req.body?.targetRole, 150);
  const skill = toStr(req.body?.skill, 150);

  const topic = source === 'role' ? targetRole || 'Software Engineer' : source === 'skills' ? skill || 'JavaScript' : 'general software engineering';
  const fallback = () => res.json({ questions: fallbackQuestions(source, targetRole || 'Software Engineer', skill || 'JavaScript') });

  if (!hasGroq()) return fallback();

  const sourceContext =
    source === 'role'
      ? `for someone interviewing for the role: ${topic}`
      : source === 'skills'
        ? `focused specifically on the skill: ${topic}`
        : 'general software engineering interview questions';

  const systemPrompt = `You are an expert technical interviewer. Generate exactly 8 interview questions ${sourceContext}.

Return ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "question": "full interview question text",
      "category": "Technical | Behavioral | System Design | Problem Solving | Leadership | Process",
      "difficulty": "easy | medium | hard",
      "hint": "one-line hint to guide the candidate"
    }
  ]
}

Rules:
- ALL questions must be SPECIFIC and relevant to: ${topic}
- Mix difficulties: 2 easy + 4 medium + 2 hard
- Mix categories: 3 Technical + 2 Behavioral + 1 System Design + 1 Problem Solving + 1 Process
- No generic or vague questions
- Each question should be answerable in 2-5 minutes`;

  try {
    const { ok, data } = await groqChat({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 8 interview questions ${sourceContext}.` },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      json: true,
    });
    if (!ok) return fallback();
    const parsed = parseJson(contentOf(data));
    let raw = [];
    if (Array.isArray(parsed.questions)) raw = parsed.questions;
    else if (parsed.questions && typeof parsed.questions === 'object') raw = Object.values(parsed.questions);
    if (raw.length === 0) return fallback();

    const questions = raw.slice(0, 8).map((q) => ({
      id: newId(),
      question: String(q?.question || 'Describe your experience with this topic.'),
      category: String(q?.category || 'Technical'),
      difficulty: String(q?.difficulty || 'medium'),
      hint: String(q?.hint || 'Take your time and structure your answer.'),
    }));
    // If the model returned too few questions, top up from the built-in set
    for (const q of fallbackQuestions(source, targetRole || 'Software Engineer', skill || 'JavaScript')) {
      if (questions.length >= 5) break;
      questions.push(q);
    }
    res.json({ questions });
  } catch (err) {
    console.error('[generate-questions]', err.message);
    fallback();
  }
}));

// ───────────────────────── Skill gap ─────────────────────────
router.post('/skill-gap', wrap(async (req, res) => {
  const currentSkills = strArray(req.body?.currentSkills).slice(0, 100);
  const targetRole = toStr(req.body?.targetRole, 150);

  if (!hasGroq()) {
    return res.json({
      missing_skills: ['System Design', 'Cloud Architecture', 'CI/CD', 'Container Orchestration', 'Distributed Systems'],
      priority_skills: ['System Design', 'Cloud Architecture', 'CI/CD'],
      recommendations: ['Focus on learning system design principles', 'Get hands-on experience with AWS or GCP', 'Build projects using containerization', 'Contribute to open source projects'],
    });
  }

  const result = await groqJson({
      model: FAST,
      messages: [
        { role: 'system', content: `You are a career skills analyst. Analyze the gap between current skills and target role. Return JSON with:\n1. missing_skills (array)\n2. priority_skills (array of top 3)\n3. recommendations (array)` },
        { role: 'user', content: `Current skills: ${currentSkills.join(', ')}\nTarget role: ${targetRole || 'Senior Software Engineer'}` },
      ],
      max_tokens: 1024,
      temperature: 0.5,
      json: true,
    });
  res.json({
    missing_skills: result.missing_skills || [],
    priority_skills: result.priority_skills || [],
    recommendations: result.recommendations || [],
  });
}));

// ───────────────────────── Roadmap ─────────────────────────
router.post('/roadmap', wrap(async (req, res) => {
  const currentSkills = strArray(req.body?.currentSkills).slice(0, 100);
  const targetRole = toStr(req.body?.targetRole, 150);
  const duration = toStr(req.body?.duration, 50);
  const skillsList = currentSkills.join(', ');

  const defaultMilestones = [
    { week: 1, title: 'Foundation Building', objectives: ['Set up development environment', 'Review core concepts', 'Create study plan'], resources: ['Documentation', 'Online courses'] },
    { week: 2, title: 'Core Skills Development', objectives: ['Learn fundamental frameworks', 'Build practice projects', 'Code review best practices'], resources: ['Tutorials', 'GitHub examples'] },
    { week: 3, title: 'Advanced Topics', objectives: ['Deep dive into advanced concepts', 'System design practice', 'Performance optimization'], resources: ['Architecture blogs', 'Case studies'] },
    { week: 4, title: 'Portfolio & Practice', objectives: ['Complete portfolio project', 'Mock interviews', 'Resume refinement'], resources: ['Interview prep sites', 'Portfolio templates'] },
  ];

  if (!hasGroq()) return res.json({ milestones: defaultMilestones, estimated_duration: duration || '3 months' });

  const systemPrompt = `You are a personalized learning roadmap generator.

CRITICAL RULES:
1. The user ALREADY KNOWS the skills listed under "Current Skills". Do NOT include those skills as learning objectives. Do NOT suggest tutorials, courses, or practice for skills they already have.
2. Only generate milestones for NEW skills, tools, concepts, or gaps that the user needs to reach the target role and does NOT already know.
3. Each milestone must be meaningfully different — covering a new topic or skill area.
4. Keep objectives specific and actionable.
5. Resources should be real, specific learning materials (e.g. "MDN Web Docs", "CS50 on edX", "Eloquent JavaScript") — not generic labels like "Online courses".

Return a JSON object with:
- milestones: array of { week: number, title: string, objectives: string[], resources: string[] }
- estimated_duration: string`;

  const userMessage = `Current Skills (ALREADY KNOWN — do NOT teach these): ${skillsList}
Target Role: ${targetRole}
Desired Duration: ${duration}

Generate a roadmap that only covers what this person still needs to learn to become a ${targetRole}. Skip everything they already know.`;

  const result = await groqJson({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2048,
      temperature: 0.7,
      json: true,
    });
  res.json({
    milestones: result.milestones || defaultMilestones,
    estimated_duration: result.estimated_duration || duration || '3 months',
  });
}));

// ───────────────────────── GitHub analysis ─────────────────────────
router.post('/github-analysis', wrap(async (req, res) => {
  const username = toStr(req.body?.username, 100);

  if (!hasGroq()) {
    return res.json({
      score: 72,
      username: username || 'developer',
      profile_data: { public_repos: 25, followers: 150, following: 80, bio: 'Software Developer' },
      top_languages: ['JavaScript', 'TypeScript', 'Python', 'Go'],
      strengths: ['Active contributor', 'Good project variety', 'Consistent activity'],
      weaknesses: ['Could improve documentation', 'Limited open source contributions', 'Add more detailed READMEs'],
      recommendations: ['Create comprehensive README files', 'Add tests to projects', 'Contribute to popular open source repos', 'Showcase diverse projects'],
    });
  }

  const systemPrompt = `You are a GitHub profile analyzer. Analyze the developer profile and return JSON with:
1. score (0-100)
2. username
3. profile_data (object with public_repos, followers)
4. top_languages (array)
5. strengths (array)
6. weaknesses (array)
7. recommendations (array)`;

  const result = await groqJson({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze GitHub profile for: ${username || 'developer'}` },
      ],
      max_tokens: 1024,
      temperature: 0.5,
      json: true,
    });
  res.json(result);
}));

// ───────────────────────── Project analysis ─────────────────────────
router.post('/project-analysis', wrap(async (req, res) => {
  const repoName = toStr(req.body?.repoName, 200);
  const repoUrl = toStr(req.body?.repoUrl, 500);

  if (!hasGroq()) {
    return res.json({
      quality_score: 75,
      repo_name: repoName || 'project',
      summary: 'A well-structured project demonstrating good software engineering practices.',
      technologies: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      strengths: ['Clean code structure', 'Good test coverage', 'Clear documentation', 'Active development'],
      weaknesses: ['Could add more unit tests', 'Missing CI/CD configuration', 'API documentation could be improved'],
      recommendations: ['Add GitHub Actions for CI/CD', 'Increase test coverage', 'Add API documentation', 'Include contribution guidelines'],
    });
  }

  const systemPrompt = `You are a project quality analyzer. Analyze the repository and return JSON with:
1. quality_score (0-100)
2. repo_name
3. summary (string)
4. technologies (array)
5. strengths (array)
6. weaknesses (array)
7. recommendations (array)`;

  const result = await groqJson({
      model: FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze repository: ${repoName} at ${repoUrl}` },
      ],
      max_tokens: 1024,
      temperature: 0.5,
      json: true,
    });
  res.json(result);
}));

export default router;
