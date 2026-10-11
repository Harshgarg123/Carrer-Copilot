import { config } from '../config.js';
import { HttpError } from '../utils.js';

export const hasGroq = () => Boolean(config.groqApiKey);
export const MODEL_FAST = config.groqModelFast;
export const MODEL_SMART = config.groqModelSmart;

// gpt-oss models are "reasoning" models: they spend part of the output budget on hidden reasoning
const isReasoningModel = (model) => /gpt-oss/i.test(model);
const REASONING_HEADROOM = 2000;

/**
 * Call Groq chat completions.
 * Returns { ok, status, data } - never throws on HTTP errors (only on network failure/timeouts).
 */
export async function groqChat({
  model,
  messages,
  max_tokens = 1024,
  temperature = 0.5,
  json = false,
  reasoning_effort = 'low',
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  const body = { model, messages, temperature };
  if (isReasoningModel(model)) {
    body.max_completion_tokens = max_tokens + REASONING_HEADROOM;
    body.reasoning_effort = reasoning_effort;
  } else {
    body.max_tokens = max_tokens;
  }
  if (json) body.response_format = { type: 'json_object' };

  try {
    const res = await fetch(config.groqApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    if (!res.ok) console.error('[groq] HTTP', res.status, JSON.stringify(data)?.slice(0, 300));
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export const contentOf = (data) => data?.choices?.[0]?.message?.content;

/** Parse JSON from a model reply, tolerating ```json fences. Returns {} on failure. */
export function parseJson(text) {
  if (!text || typeof text !== 'string') return {};
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json|```/gi, '').trim();
    try { return JSON.parse(cleaned); } catch { /* fall through */ }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* ignore */ }
    }
    return {};
  }
}

/** Turn a failed Groq response into a message that tells the user what to do. */
function aiErrorMessage({ status, data }) {
  const code = data?.error?.code;
  if (code === 'model_not_found' || code === 'model_decommissioned') {
    return 'The configured AI model is no longer available. Set GROQ_MODEL_FAST / GROQ_MODEL_SMART in the server .env to a current Groq model.';
  }
  if (status === 401) return 'The AI service rejected the API key. Check GROQ_API_KEY in the server .env.';
  if (status === 429) return 'The AI service is rate-limited right now. Please wait a moment and try again.';
  return `The AI service returned an error (${status}). Please try again.`;
}

async function callOrThrow(opts) {
  let res;
  try {
    res = await groqChat(opts);
  } catch (err) {
    console.error('[groq] request failed:', err.message);
    throw new HttpError(502, 'Could not reach the AI service. Please try again.');
  }
  if (!res.ok) throw new HttpError(502, aiErrorMessage(res));
  return res;
}

/** Ask for a JSON object. Throws HttpError(502) instead of returning fake data when the AI fails. */
export async function groqJson(opts) {
  const res = await callOrThrow({ ...opts, json: true });
  const parsed = parseJson(contentOf(res.data));
  if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
    console.error('[groq] unreadable JSON reply:', String(contentOf(res.data)).slice(0, 200));
    throw new HttpError(502, 'The AI returned an unreadable response. Please try again.');
  }
  return parsed;
}

/** Ask for plain text. Throws HttpError(502) when the AI fails or returns nothing. */
export async function groqText(opts) {
  const res = await callOrThrow(opts);
  const text = contentOf(res.data);
  if (!text || !String(text).trim()) throw new HttpError(502, 'The AI returned an empty response. Please try again.');
  return String(text);
}
