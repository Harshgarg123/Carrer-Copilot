import { config, assertConfig } from './config.js';
import { connectDb, closeDb } from './db.js';
import { createApp } from './app.js';

async function main() {
  assertConfig();
  await connectDb();
  console.log(`[db] Connected to MongoDB (database: ${config.mongoDb})`);

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] API listening on http://localhost:${config.port}`);
    if (!config.groqApiKey) console.warn('[server] GROQ_API_KEY is not set - AI features will return placeholder data.');
  });

  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `[server] Port ${config.port} is already in use. Change PORT in .env.` : err);
    process.exit(1);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close();
    await closeDb().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('\n[server] Failed to start:\n' + err.message + '\n');
  process.exit(1);
});
