// Vercel serverless entry point: runs the same Express app as `npm start`, but connects to MongoDB lazily.
// vercel.json rewrites every /api/* request to this function (the original URL is preserved for Express).
import { assertConfig, config } from '../server/config.js';
import { connectDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let app;

function fail(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

export default async function handler(req, res) {
  try {
    assertConfig();
  } catch (err) {
    console.error(err.message);
    const missing = [];
    if (!config.mongoUri) missing.push('MONGODB_URI');
    if (!config.jwtSecret || config.jwtSecret.length < 16) missing.push('JWT_SECRET');
    return fail(res, 500, `Server is not configured. Add these Environment Variables in Vercel and redeploy: ${missing.join(', ') || 'MONGODB_URI, JWT_SECRET'}.`);
  }

  try {
    await connectDb(); // cached between invocations of a warm function
  } catch (err) {
    console.error(err.message); // full details are in the Vercel function logs
    return fail(res, 503, err.dbHint || 'Could not connect to the database. Check MONGODB_URI and the Atlas settings.');
  }

  app ??= createApp();
  return app(req, res);
}
