import crypto from 'node:crypto';

export const newId = () => crypto.randomUUID();

/** Wrap async route handlers so rejected promises reach the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Mongo document -> API JSON ( _id -> id, hide internal fields ). */
export function serialize(doc, hide = []) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  for (const key of hide) delete rest[key];
  return { id: _id, ...rest };
}

export function serializeMany(docs, hide = []) {
  return docs.map((d) => serialize(d, hide));
}

/** Recursively drop keys that start with "$" or contain "." (Mongo operator-injection guard). */
export function cleanDeep(value, depth = 0) {
  if (depth > 12) return null;
  if (Array.isArray(value)) return value.map((v) => cleanDeep(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = cleanDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function toStr(v, max = 20000) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

export function toInt(v, def = 0, min = 0, max = 100) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export function toArray(v, max = 500) {
  return Array.isArray(v) ? cleanDeep(v.slice(0, max)) : [];
}

export function toObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? cleanDeep(v) : {};
}

/** Simple in-memory rate limiter (per key). */
export function rateLimiter({ windowMs, max, keyFn, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}
