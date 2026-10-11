// End-to-end API smoke test. Usage: API_URL=http://localhost:5000 node server/test/smoke.mjs
// Optional: FIXTURES=/path/with/resume.pdf+resume.docx  LOG_FILE=/path/to/server.log (for password-reset flow)
import fs from 'node:fs';

const BASE = process.env.API_URL || 'http://localhost:5000';
const FIX = process.env.FIXTURES || '';
const LOG = process.env.LOG_FILE || '';
let pass = 0, fail = 0;

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}

const stamp = Date.now();
const emailA = `alice_${stamp}@example.com`;
const emailB = `bob_${stamp}@example.com`;

console.log('\n# Auth');
let r = await api('POST', '/api/auth/signup', { body: { email: 'nope', password: 'secret123' } });
check('rejects invalid email', r.status === 400);
r = await api('POST', '/api/auth/signup', { body: { email: emailA, password: '123' } });
check('rejects short password', r.status === 400);
r = await api('POST', '/api/auth/signup', { body: { email: emailA, password: 'secret123', full_name: 'Alice A' } });
check('signup ok', r.status === 201 && r.data.token && r.data.user.email === emailA && !r.data.user.password_hash, JSON.stringify(r.data));
const A = r.data.token; const userA = r.data.user;
check('user has id + full_name', userA.id && userA.full_name === 'Alice A');
r = await api('POST', '/api/auth/signup', { body: { email: emailA.toUpperCase(), password: 'secret123' } });
check('duplicate email (case-insensitive) -> 409', r.status === 409);
r = await api('POST', '/api/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
check('NoSQL-injection login rejected', r.status === 400);
r = await api('POST', '/api/auth/login', { body: { email: emailA, password: 'wrong' } });
check('wrong password -> 401', r.status === 401 && /invalid/i.test(r.data.error));
r = await api('POST', '/api/auth/login', { body: { email: emailA, password: 'secret123' } });
check('login ok', r.status === 200 && r.data.token);
r = await api('GET', '/api/auth/me', { token: A });
check('/me returns user', r.status === 200 && r.data.user.id === userA.id);
r = await api('GET', '/api/auth/me');
check('/me without token -> 401', r.status === 401);
r = await api('GET', '/api/auth/me', { token: 'garbage' });
check('/me with bad token -> 401', r.status === 401);
r = await api('PATCH', '/api/profile', { token: A, body: { full_name: 'Alice Updated', email: 'hack@x.com', password_hash: 'x' } });
check('profile update (only allowed fields)', r.status === 200 && r.data.user.full_name === 'Alice Updated' && r.data.user.email === emailA);

r = await api('POST', '/api/auth/signup', { body: { email: emailB, password: 'secret123', full_name: 'Bob' } });
const B = r.data.token;

console.log('\n# Resumes');
r = await api('GET', '/api/resumes');
check('resumes need auth', r.status === 401);
const pdfPath = FIX + '/resume.pdf', docxPath = FIX + '/resume.docx';
let resumeId;
if (FIX && fs.existsSync(pdfPath)) {
  const pdfBytes = fs.readFileSync(pdfPath);
  let form = new FormData(); form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'resume.pdf');
  r = await api('POST', '/api/resumes', { token: A, form });
  check('upload PDF', r.status === 201 && r.data.resume.file_name === 'resume.pdf' && r.data.resume.file_url.startsWith('/api/resumes/'), JSON.stringify(r.data));
  check('extracted_text not leaked', r.data.resume && r.data.resume.extracted_text === undefined);
  resumeId = r.data.resume.id;
  r = await api('GET', `/api/resumes/${resumeId}/file`, { token: A });
  check('download returns identical bytes', r.status === 200 && Buffer.compare(r.data, pdfBytes) === 0 && r.headers.get('content-type') === 'application/pdf');
  r = await api('GET', `/api/resumes/${resumeId}/file`, { token: B });
  check("other user can't download (404)", r.status === 404);
  r = await api('POST', `/api/resumes/${resumeId}/analyze`, { token: B });
  check("other user can't analyze (404)", r.status === 404);
  r = await api('POST', `/api/resumes/${resumeId}/analyze`, { token: A });
  check('analyze returns scores', r.status === 200 && typeof r.data.overall_score === 'number' && Array.isArray(r.data.strengths), JSON.stringify(r.data));
  r = await api('GET', '/api/resumes', { token: A });
  check('list shows analyzed score saved', r.status === 200 && r.data.resumes.length === 1 && r.data.resumes[0].score > 0);
  r = await api('POST', '/api/ai/job-match', { token: A, body: { jobDescription: 'Node developer', resumeId } });
  check('job-match with resumeId works', r.status === 200 && typeof r.data.match_percentage === 'number');
}
if (FIX && fs.existsSync(docxPath)) {
  let form = new FormData(); form.append('file', new Blob([fs.readFileSync(docxPath)]), 'resume.docx');
  r = await api('POST', '/api/resumes', { token: A, form });
  check('upload DOCX', r.status === 201);
}
let form = new FormData(); form.append('file', new Blob(['hello']), 'notes.txt');
r = await api('POST', '/api/resumes', { token: A, form });
check('rejects .txt upload', r.status === 400, JSON.stringify(r.data));
r = await api('POST', '/api/resumes', { token: A, form: new FormData() });
check('rejects missing file', r.status === 400);
form = new FormData(); form.append('file', new Blob([Buffer.alloc(5 * 1024 * 1024)]), 'big.pdf');
r = await api('POST', '/api/resumes', { token: A, form });
check('rejects >4MB', r.status === 400 && /large/i.test(r.data.error), JSON.stringify(r.data));

console.log('\n# Records (allow-listed, user-scoped)');
const samples = {
  job_matches: { job_description: 'JD', job_title: 'Dev', company: 'Acme', match_percentage: 80, matched_skills: ['a'], missing_skills: ['b'], suggestions: ['c'], resume_id: resumeId || null },
  cover_letters: { content: 'Dear...', job_title: 'Dev', company: 'Acme' },
  skill_gap_analyses: { current_skills: ['js'], target_role: 'SRE', missing_skills: [{ skill: 'k8s' }], priority_skills: ['k8s'], recommendations: ['x'] },
  learning_roadmaps: { target_role: 'SRE', milestones: [{ week: 1, title: 't', objectives: [], resources: [] }], estimated_duration: '3 months', progress: 0 },
  github_analyses: { github_url: 'https://github.com/x', username: 'x', profile_data: { public_repos: 2 }, strengths: [], weaknesses: [], recommendations: [], score: 70 },
  project_analyses: { repo_url: 'https://github.com/x/y', repo_name: 'x/y', technologies: ['js'], summary: 's', strengths: [], weaknesses: [], recommendations: [], quality_score: 75 },
  generated_questions: { source: 'role', category: 'SRE', questions: [{ question: 'q' }] },
};
for (const [type, body] of Object.entries(samples)) {
  r = await api('POST', `/api/records/${type}`, { token: A, body: { ...body, user_id: 'attacker', _id: 'evil' } });
  check(`create ${type}`, r.status === 201 && r.data.record.user_id === userA.id && r.data.record.id !== 'evil', JSON.stringify(r.data));
}
r = await api('POST', '/api/records/users', { token: A, body: { email: 'x' } });
check('unknown record type -> 404', r.status === 404);
r = await api('POST', '/api/records/cover_letters', { token: A, body: {} });
check('missing required field -> 400', r.status === 400);
r = await api('POST', '/api/records/job_matches', { token: A, body: { job_description: 'x', matched_skills: [{ $where: '1' }] } });
check('operator keys stripped from nested data', r.status === 201 && !JSON.stringify(r.data).includes('$where'));
r = await api('GET', '/api/records/cover_letters', { token: B });
check("other user sees none of A's records", r.status === 200 && r.data.records.length === 0);
r = await api('GET', '/api/records/cover_letters', { token: A });
const clId = r.data.records[0]?.id;
r = await api('DELETE', `/api/records/cover_letters/${clId}`, { token: B });
check("other user can't delete (404)", r.status === 404);
r = await api('DELETE', `/api/records/cover_letters/${clId}`, { token: A });
check('owner deletes', r.status === 200);

console.log('\n# Activities & custom roles');
r = await api('POST', '/api/activities', { token: A, body: { activity_type: 'test', title: 'Did a thing', metadata: { a: 1 } } });
check('log activity', r.status === 201);
r = await api('POST', '/api/activities', { token: A, body: {} });
check('activity validation', r.status === 400);
r = await api('POST', '/api/custom-roles', { token: A, body: { role_name: 'Site Reliability Engineer' } });
check('add custom role', r.status === 201);
r = await api('POST', '/api/custom-roles', { token: A, body: { role_name: 'site reliability engineer' } });
check('duplicate role (case-insens.) -> 409', r.status === 409);
r = await api('POST', '/api/custom-roles', { token: B, body: { role_name: 'Site Reliability Engineer' } });
check('same role allowed for another user', r.status === 201);
r = await api('GET', '/api/custom-roles', { token: A });
check('list roles', r.status === 200 && r.data.roles.length === 1 && r.data.roles[0] === 'Site Reliability Engineer');
r = await api('DELETE', '/api/custom-roles?role_name=' + encodeURIComponent('Site Reliability Engineer'), { token: A });
r = await api('GET', '/api/custom-roles', { token: A });
check('delete role', r.data.roles.length === 0);

console.log('\n# Mock interviews');
r = await api('POST', '/api/interviews', { token: A, body: { role: 'Backend Developer', experience_level: 'senior', difficulty: 'hard' } });
check('start interview', r.status === 201 && r.data.interview.status === 'in_progress', JSON.stringify(r.data));
const iid = r.data.interview.id;
r = await api('POST', `/api/interviews/${iid}/questions`, { token: B, body: { question: 'q', score: 50 } });
check("other user can't add question (404)", r.status === 404);
await api('POST', `/api/interviews/${iid}/questions`, { token: A, body: { question: 'Q1?', category: 'Technical', difficulty: 'easy', user_answer: 'a', score: 80, strengths: ['s'] } });
r = await api('POST', `/api/interviews/${iid}/questions`, { token: A, body: { question: 'Q2?', difficulty: 'bogus', score: 60 } });
check('add questions (invalid difficulty normalised)', r.status === 201 && r.data.question.difficulty === 'medium');
r = await api('POST', `/api/interviews/${iid}/complete`, { token: A, body: { total_score: 1 } });
check('complete = average of saved scores (70)', r.status === 200 && r.data.total_score === 70, JSON.stringify(r.data));

console.log('\n# Dashboard');
r = await api('GET', '/api/dashboard', { token: A });
check('dashboard stats', r.status === 200 && r.data.stats.total_interviews === 1 && r.data.stats.interview_score === 70 && r.data.stats.total_cover_letters === 0, JSON.stringify(r.data.stats));
check('dashboard resume stats', !FIX || (r.data.stats.total_resumes >= 1 && r.data.stats.resume_score > 0));
check('dashboard activities', r.data.activities.length > 0 && r.data.activities[0].created_at);
r = await api('GET', '/api/dashboard', { token: B });
check('new user has zeroed stats', r.data.stats.total_interviews === 0 && r.data.stats.job_readiness === 0);

console.log('\n# AI endpoints');
const ai = async (name, body) => api('POST', `/api/ai/${name}`, { token: A, body });
r = await ai('ai-mentor', { message: 'hi', history: [{ role: 'user', content: 'x' }] });
check('ai-mentor', r.status === 200 || r.status === 500, r.status);
r = await ai('ai-mentor', {}); check('ai-mentor validates', r.status === 400);
r = await ai('cover-letter', { jobTitle: 'Dev', company: 'Acme', jobDescription: 'x' }); check('cover-letter', r.status === 200 && r.data.content);
r = await ai('generate-interview', { role: 'Dev', experienceLevel: 'mid', difficulty: 'medium' }); check('generate-interview', r.status === 200 && r.data.questions.length >= 5 && r.data.questions[0].id);
r = await ai('generate-questions', { source: 'skills', skill: 'React' }); check('generate-questions', r.status === 200 && r.data.questions.length >= 5);
r = await ai('evaluate-answer', { question: 'What is a closure?', answer: 'ddddddddddddddddddd' }); check('evaluate-answer gibberish capped <=5', r.status === 200 && r.data.score <= 5, JSON.stringify(r.data));
r = await ai('evaluate-answer', {}); check('evaluate-answer validates', r.status === 400);
r = await ai('skill-gap', { currentSkills: ['js'], targetRole: 'SRE' }); check('skill-gap', r.status === 200 && Array.isArray(r.data.missing_skills));
r = await ai('roadmap', { currentSkills: ['js'], targetRole: 'SRE', duration: '3 months' }); check('roadmap', r.status === 200 && r.data.milestones.length > 0);
r = await ai('github-analysis', { username: 'octocat' }); check('github-analysis', r.status === 200 && 'score' in r.data);
r = await ai('project-analysis', { repoName: 'a/b', repoUrl: 'https://github.com/a/b' }); check('project-analysis', r.status === 200 && 'quality_score' in r.data);
r = await api('POST', '/api/ai/roadmap', { body: {} }); check('AI endpoints need auth', r.status === 401);

console.log('\n# Password reset');
r = await api('POST', '/api/auth/forgot-password', { body: { email: 'ghost_' + stamp + '@example.com' } });
check('unknown email gets same ok response', r.status === 200 && r.data.ok);
r = await api('POST', '/api/auth/forgot-password', { body: { email: emailA } });
check('forgot-password ok', r.status === 200);
if (LOG && fs.existsSync(LOG)) {
  await new Promise((res) => setTimeout(res, 300));
  const m = [...fs.readFileSync(LOG, 'utf8').matchAll(/reset-password\?token=([a-f0-9]+)/g)].pop();
  check('reset link printed to console', !!m);
  if (m) {
    r = await api('POST', '/api/auth/reset-password', { body: { token: 'bad', password: 'newpass123' } });
    check('bad token rejected', r.status === 400);
    r = await api('POST', '/api/auth/reset-password', { body: { token: m[1], password: 'newpass123' } });
    check('reset ok', r.status === 200);
    r = await api('POST', '/api/auth/reset-password', { body: { token: m[1], password: 'another123' } });
    check('token is single-use', r.status === 400);
    r = await api('POST', '/api/auth/login', { body: { email: emailA, password: 'secret123' } });
    check('old password no longer works', r.status === 401);
    r = await api('POST', '/api/auth/login', { body: { email: emailA, password: 'newpass123' } });
    check('new password works', r.status === 200);
  }
}

console.log('\n# Resume deletion');
if (resumeId) {
  r = await api('DELETE', `/api/resumes/${resumeId}`, { token: B });
  check("other user can't delete (404)", r.status === 404);
  r = await api('DELETE', `/api/resumes/${resumeId}`, { token: A });
  check('owner deletes resume', r.status === 200);
  r = await api('GET', `/api/resumes/${resumeId}/file`, { token: A });
  check('file removed too', r.status === 404);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
