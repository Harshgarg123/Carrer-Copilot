// Pre-deployment check:  npm run check
// Verifies your .env (or environment) works BEFORE you push to Git / Vercel:
//   configuration, MongoDB connection + read/write permission, and the Groq key + model.
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT_DIR } from './config.js';
import { connectDb, closeDb, col, describeDbError } from './db.js';
import { groqJson, hasGroq, MODEL_FAST, MODEL_SMART } from './services/groq.js';

let failures = 0;
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const bad = (msg, hint) => {
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
  if (hint) console.log(`      → ${hint}`);
};
const warn = (msg) => console.log(`  \x1b[33m!\x1b[0m ${msg}`);
const title = (t) => console.log(`\n${t}`);

async function main() {
  console.log('AI Career Copilot - pre-deployment check');

  // ── 1. Project files Vercel needs
  title('1. Project files');
  for (const f of ['api/index.js', 'vercel.json', 'package.json', 'server/app.js']) {
    fs.existsSync(path.join(ROOT_DIR, f)) ? ok(f) : bad(`${f} is missing`, 'Commit the whole project (including the api/ folder) to Git.');
  }

  // ── 2. Configuration
  title('2. Configuration');
  if (!config.mongoUri) bad('MONGODB_URI is not set');
  else if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) bad('MONGODB_URI must start with mongodb+srv:// or mongodb://', 'Remove quotes and any "MONGODB_URI=" prefix from the value.');
  else ok('MONGODB_URI is set');
  config.jwtSecret.length >= 16 ? ok('JWT_SECRET is set') : bad('JWT_SECRET is missing or shorter than 16 characters');
  hasGroq() ? ok('GROQ_API_KEY is set') : bad('GROQ_API_KEY is not set', 'AI features will not work without it.');
  ok(`AI models: ${MODEL_FAST}${MODEL_SMART !== MODEL_FAST ? ' / ' + MODEL_SMART : ''}`);

  // ── 3. MongoDB
  title('3. MongoDB');
  if (config.mongoUri && /^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    try {
      const u = new URL(config.mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
      ok(`host ${u.hostname}, user ${decodeURIComponent(u.username) || '(none)'}`);
    } catch {
      bad('MONGODB_URI could not be parsed', 'If the password contains @ : / ? # % characters, URL-encode them (e.g. @ becomes %40).');
    }
    try {
      await connectDb();
      ok(`connected (database "${config.mongoDb}")`);
      const id = `check-${Date.now()}`;
      await col('_healthcheck').insertOne({ _id: id, at: new Date() });
      const found = await col('_healthcheck').findOne({ _id: id });
      await col('_healthcheck').deleteOne({ _id: id });
      found ? ok('read/write permission works') : bad('wrote a test document but could not read it back');
    } catch (err) {
      bad('could not connect / write', err.dbHint || describeDbError(err));
      console.log(`      (technical detail: ${String(err.message).split('\n')[0]})`);
    }
  } else {
    warn('skipped (fix the configuration first)');
  }

  // ── 4. Groq
  title('4. Groq AI');
  if (hasGroq()) {
    const started = Date.now();
    try {
      const reply = await groqJson({
        model: MODEL_FAST,
        messages: [
          { role: 'system', content: 'Reply with a JSON object only.' },
          { role: 'user', content: 'Return JSON: {"status":"ok"}' },
        ],
        max_tokens: 50,
        temperature: 0,
      });
      reply?.status ? ok(`${MODEL_FAST} answered in ${((Date.now() - started) / 1000).toFixed(1)}s`) : bad('the model answered but not with the expected JSON');
    } catch (err) {
      bad(`AI call failed: ${err.message}`);
    }
  } else {
    warn('skipped (no GROQ_API_KEY)');
  }

  await closeDb().catch(() => {});

  console.log('\n' + '─'.repeat(60));
  if (failures) {
    console.log(`\x1b[31m${failures} problem(s) found.\x1b[0m Fix them, then run "npm run check" again.\n`);
    process.exit(1);
  }
  console.log('\x1b[32mAll checks passed.\x1b[0m');
  console.log('\nLast thing before you deploy (this cannot be checked from your computer):');
  console.log('  MongoDB Atlas → Network Access must list 0.0.0.0/0 (status Active),');
  console.log('  because Vercel connects from changing IP addresses.\n');
}

main().catch((err) => {
  console.error('Check failed unexpectedly:', err);
  process.exit(1);
});
