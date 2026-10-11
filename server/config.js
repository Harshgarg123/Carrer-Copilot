import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

// Load <project>/.env (does not override variables already set in the shell)
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

/** Remove accidental wrapping quotes / whitespace from env values. */
function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^["']+|["']+$/g, '').trim();
}

export const config = {
  port: Number(clean(process.env.PORT)) || 5000,
  mongoUri: clean(process.env.MONGODB_URI).replace(/^MONGODB_URI\s*=\s*/i, '').replace(/^["']+|["']+$/g, ''),
  mongoDb: clean(process.env.MONGODB_DB) || 'ai_career_copilot',
  jwtSecret: clean(process.env.JWT_SECRET),
  jwtExpiresIn: clean(process.env.JWT_EXPIRES_IN) || '7d',
  groqApiKey: clean(process.env.GROQ_API_KEY),
  groqApiUrl: clean(process.env.GROQ_API_URL) || 'https://api.groq.com/openai/v1/chat/completions',
  // Groq retired the Llama 3.1 8B / 3.3 70B models (Aug 2026); override these if Groq changes models again.
  groqModelFast: clean(process.env.GROQ_MODEL_FAST) || 'openai/gpt-oss-120b',
  groqModelSmart: clean(process.env.GROQ_MODEL_SMART) || 'openai/gpt-oss-120b',
  // On Vercel the production domain is provided automatically; otherwise default to the Vite dev URL
  clientOrigin:
    clean(process.env.CLIENT_ORIGIN) ||
    (clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${clean(process.env.VERCEL_PROJECT_PRODUCTION_URL)}` : 'http://localhost:5173'),
  smtp: {
    host: clean(process.env.SMTP_HOST),
    port: Number(clean(process.env.SMTP_PORT)) || 587,
    user: clean(process.env.SMTP_USER),
    pass: clean(process.env.SMTP_PASS),
    from: clean(process.env.SMTP_FROM) || 'AI Career Copilot <no-reply@aicareercopilot.local>',
  },
  isProduction: process.env.NODE_ENV === 'production',
};

export function assertConfig() {
  const problems = [];
  if (!config.mongoUri) {
    problems.push('MONGODB_URI is missing. Add it to the .env file in the project root.');
  } else if (!/^mongodb(\+srv)?:\/\//.test(config.mongoUri)) {
    problems.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".');
  }
  if (!config.jwtSecret || config.jwtSecret.length < 16) {
    problems.push('JWT_SECRET is missing or too short (use at least 16 random characters).');
  }
  if (problems.length) {
    throw new Error('Invalid server configuration:\n - ' + problems.join('\n - '));
  }
}
