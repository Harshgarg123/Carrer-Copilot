// pdf.js only needs these browser classes for *rendering*; we only extract text, so stub them
// to avoid "Cannot polyfill DOMMatrix / Path2D" warnings. Must be imported BEFORE pdfjs-dist.
globalThis.DOMMatrix ??= class DOMMatrix {};
globalThis.Path2D ??= class Path2D {};
