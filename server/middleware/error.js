import { HttpError } from '../utils.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 4MB)' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'This record already exists' });
  }
  console.error('[server error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
