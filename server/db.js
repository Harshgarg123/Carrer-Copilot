import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client = null;
let db = null;

/** MongoDB collection names. */
export const COLLECTIONS = [
  'users',
  'password_resets',
  'resumes',
  'resume_files',
  'resume_analyses',
  'job_matches',
  'cover_letters',
  'mock_interviews',
  'interview_questions',
  'skill_gap_analyses',
  'learning_roadmaps',
  'github_analyses',
  'project_analyses',
  'generated_questions',
  'user_activities',
  'user_custom_roles',
  'career_stats',
];

/** Short, secret-free explanation of why a MongoDB connection failed (safe to show to users). */
export function describeDbError(err) {
  const text = `${err?.name || ''} ${err?.codeName || ''} ${err?.message || ''} ${err?.code || ''}`;
  if (/bad auth|authentication failed|AuthenticationFailed|Unauthorized/i.test(text) || err?.code === 18) {
    return 'Database login failed: the username or password in MONGODB_URI is wrong. Check the database user in Atlas > Database Access (special characters in the password must be URL-encoded).';
  }
  if (/querySrv|ENOTFOUND|EBADNAME|getaddrinfo/i.test(text)) {
    return 'Database host not found: check the cluster address in MONGODB_URI (it should look like mongodb+srv://user:password@cluster0.xxxxx.mongodb.net).';
  }
  if (/ssl|tls|certificate/i.test(text)) {
    return 'Secure connection to the database failed. Check MONGODB_URI and that the Atlas cluster is running.';
  }
  if (/ServerSelection|timed out|timeout|ReplicaSetNoPrimary|ECONNREFUSED|ETIMEDOUT|ECONNRESET/i.test(text)) {
    return 'Could not reach the database. In MongoDB Atlas > Network Access add 0.0.0.0/0 (it takes about a minute to become Active) and make sure the cluster is not paused.';
  }
  return 'Could not connect to the database. Check MONGODB_URI and the Atlas settings.';
}

let connecting = null;

async function openConnection() {
  const c = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    maxPoolSize: 10,
    maxIdleTimeMS: 60000,
  });
  try {
    await c.connect();
    const database = c.db(config.mongoDb);
    await database.command({ ping: 1 });
    return { c, database };
  } catch (err) {
    try { await c.close(); } catch { /* ignore */ }
    throw err;
  }
}

// Errors that retrying cannot fix
const isPermanent = (err) => /bad auth|authentication failed|AuthenticationFailed|querySrv|ENOTFOUND|EBADNAME/i.test(`${err?.message} ${err?.codeName}`);

export async function connectDb() {
  if (db) return db;
  // Concurrent callers (e.g. several requests hitting a cold serverless instance) share one attempt
  if (connecting) return connecting;

  connecting = (async () => {
    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { c, database } = await openConnection();
        client = c;
        db = database;
        break;
      } catch (err) {
        lastErr = err;
        if (isPermanent(err)) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!db) {
      const err = lastErr;
      err.dbHint = describeDbError(err);
      err.message =
        `Could not connect to MongoDB: ${err.message}\n` +
        '  - Check MONGODB_URI (username / password / host).\n' +
        '  - On MongoDB Atlas, open "Network Access" and allow your IP address (or 0.0.0.0/0 for development / Vercel).\n' +
        '  - Make sure the database user has read/write permission and the cluster is not paused.';
      throw err;
    }
    // Index creation must never block or break the app (it only speeds up queries / enforces uniqueness)
    await ensureIndexes(db);
    return db;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null; // success: `db` is cached; failure: the next request tries again
  }
}

export function getDb() {
  if (!db) throw new Error('Database is not connected yet');
  return db;
}

export function col(name) {
  return getDb().collection(name);
}

export async function closeDb() {
  if (client) await client.close();
  client = null;
  db = null;
}

async function ensureIndexes(database) {
  const c = (n) => database.collection(n);
  const specs = [
    ['users', { email: 1 }, { unique: true }],
    ['resumes', { user_id: 1, created_at: -1 }],
    ['resume_analyses', { resume_id: 1 }],
    ['job_matches', { user_id: 1, created_at: -1 }],
    ['cover_letters', { user_id: 1, created_at: -1 }],
    ['mock_interviews', { user_id: 1, created_at: -1 }],
    ['interview_questions', { interview_id: 1, question_order: 1 }],
    ['skill_gap_analyses', { user_id: 1, created_at: -1 }],
    ['learning_roadmaps', { user_id: 1, created_at: -1 }],
    ['github_analyses', { user_id: 1, created_at: -1 }],
    ['project_analyses', { user_id: 1, created_at: -1 }],
    ['generated_questions', { user_id: 1, created_at: -1 }],
    ['user_activities', { user_id: 1, created_at: -1 }],
    ['user_custom_roles', { user_id: 1, role_key: 1 }, { unique: true }],
    ['career_stats', { user_id: 1 }, { unique: true }],
    ['password_resets', { token_hash: 1 }],
    // Auto-delete expired password-reset tokens
    ['password_resets', { expires_at: 1 }, { expireAfterSeconds: 0 }],
  ];
  const results = await Promise.allSettled(specs.map(([name, keys, opts]) => c(name).createIndex(keys, opts)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[db] Could not create index on ${specs[i][0]}:`, r.reason?.message);
  });
}
