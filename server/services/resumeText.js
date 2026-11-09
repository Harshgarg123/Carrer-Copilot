import './pdfPolyfills.js';
import mammoth from 'mammoth';
// Legacy (CommonJS) build of pdf.js works in plain Node.js without a canvas.
// A static import lets Vercel's bundler include the package in the serverless function.
import pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

const MAX_CHARS = 30000;
const MAX_PAGES = 30;
const MIN_TEXT_CHARS = 30; // below this we treat the PDF as image-only

/** Return a standalone Uint8Array copy of a Buffer / BSON Binary / typed array. */
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
  // new Uint8Array(typedArray) copies only the viewed bytes (correct even for pooled Buffers)
  return Buffer.from(new Uint8Array(src));
}

async function pdfToText(buffer) {
  const plain = toPlainBuffer(buffer);
  const text = await pdfTextLayer(plain);
  if (normalize(text).length >= MIN_TEXT_CHARS) return text;

  // No usable text layer -> probably a scanned / image-only PDF. Try OCR.
  try {
    console.warn('[resume] PDF has no text layer, falling back to OCR');
    const { ocrPdf } = await import('./ocr.js');
    return await ocrPdf(pdfjs, plain);
  } catch (err) {
    console.warn('[resume] OCR fallback failed:', err.message);
    return text;
  }
}

async function pdfTextLayer(plain) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(plain),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
  try {
    let text = '';
    const pages = Math.min(doc.numPages, MAX_PAGES);
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        text += item.str + (item.hasEOL ? '\n' : ' ');
      }
      text += '\n';
    }
    return text;
  } finally {
    await doc.destroy().catch(() => {});
  }
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
    console.warn('[resume] text extraction failed:', err.message);
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
