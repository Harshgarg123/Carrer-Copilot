import mammoth from 'mammoth';

const MAX_CHARS = 30000;
const MAX_PAGES = 30;

/** Return a standalone Buffer copy of a Buffer / BSON Binary / typed array. */
export function toPlainBuffer(input) {
  let src;
  if (input instanceof Uint8Array) {
    src = input;
  } else if (input?.buffer) {
    // BSON Binary: valid bytes are [0, position)
    const len = typeof input.position === 'number' ? input.position : input.buffer.length;
    src = input.buffer.subarray(0, len);
  } else {
    src = Buffer.from(input);
  }
  return Buffer.from(new Uint8Array(src));
}

/**
 * Extract text from a PDF using unpdf (works on Vercel serverless).
 * No native deps, no worker files, no canvas.
 */
async function pdfToText(buffer) {
  const plain = toPlainBuffer(buffer);
  const data = new Uint8Array(plain);

  const { extractText } = await import('unpdf');
  const result = await extractText(data, { mergePages: true });

  let text = '';
  if (typeof result?.text === 'string') {
    text = result.text;
  } else if (Array.isArray(result?.text)) {
    text = result.text.slice(0, MAX_PAGES).join('\n');
  }
  return text;
}

/** Extract plain text from a PDF/DOCX buffer. Returns '' when nothing could be read. */
export async function extractResumeText(buffer, fileName = '', mimeType = '') {
  const name = fileName.toLowerCase();
  try {
    if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
      return normalize(await pdfToText(buffer));
    }
    if (name.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer: toPlainBuffer(buffer) });
      return normalize(result.value);
    }
  } catch (err) {
    console.warn('[resume] text extraction failed:', err?.message || err);
  }
  return '';
}

function normalize(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
}