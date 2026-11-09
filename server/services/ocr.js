// OCR fallback for scanned / image-only PDFs (no text layer).
// Loaded lazily so the app still works if the optional OCR packages are missing.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const MAX_OCR_PAGES = 3;
const SCALE = 2; // ~150 DPI, good accuracy/speed balance

export async function ocrPdf(pdfjs, data) {
  const canvasLib = await import('@napi-rs/canvas');
  // pdf.js needs REAL canvas classes for rendering (the stubs in pdfPolyfills.js are not enough)
  globalThis.DOMMatrix = canvasLib.DOMMatrix;
  globalThis.Path2D = canvasLib.Path2D;
  globalThis.ImageData = canvasLib.ImageData;

  const { createWorker } = await import('tesseract.js');
  const langPath = path.dirname(require.resolve('@tesseract.js-data/eng/package.json')) + '/4.0.0_best_int';
  const worker = await createWorker('eng', 1, {
    langPath,
    gzip: true,
    cachePath: os.tmpdir(), // Vercel only allows writes in /tmp
  });

  const canvasFactory = {
    create(width, height) {
      const canvas = canvasLib.createCanvas(width, height);
      return { canvas, context: canvas.getContext('2d') };
    },
    reset(c, width, height) { c.canvas.width = width; c.canvas.height = height; },
    destroy(c) { c.canvas.width = 0; c.canvas.height = 0; },
  };

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    isEvalSupported: false,
    verbosity: 0,
    canvasFactory,
  }).promise;

  try {
    let text = '';
    const pages = Math.min(doc.numPages, MAX_OCR_PAGES);
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: SCALE });
      const c = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: c.context, viewport, canvasFactory }).promise;
      const png = c.canvas.toBuffer('image/png');
      const { data: result } = await worker.recognize(png);
      text += result.text + '\n';
    }
    return text;
  } finally {
    await doc.destroy().catch(() => {});
    await worker.terminate().catch(() => {});
  }
}
