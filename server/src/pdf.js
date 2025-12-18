/**
 * File: src/pdf.js
 * Purpose: Utility for extracting plain text from a PDF buffer.
 *
 * Notes:
 * - Uses `pdf-parse` (Node library) for text extraction.
 * - OCR (scanned image PDFs) is not supported — only text-based PDFs will yield content.
 * - Cleans up line breaks and whitespace for more consistent downstream processing.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Dynamically load pdf-parse implementation
//   • Prefer internal "lib/pdf-parse.js" (avoids the test harness in index.js)
//   • Fallback: plain `pdf-parse` if internal path changes in future versions
let pdfParse;
try {
  pdfParse = require("pdf-parse/lib/pdf-parse.js");
} catch {
  pdfParse = require("pdf-parse"); // fallback
}

/**
 * extractPdfText
 * @param {Buffer} buffer - The PDF file contents in memory
 * @returns {Promise<string>} Cleaned-up extracted text
 *
 * Process:
 *  1. pdfParse(buffer) → returns { text, ... }
 *  2. Normalize:
 *     - remove CR (\r)
 *     - remove trailing spaces before newlines
 *     - collapse 3+ newlines → 2 newlines
 *     - trim leading/trailing whitespace
 */
export async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);

  const text = (data.text || "")
    .replace(/\r/g, "")         // remove carriage returns
    .replace(/[ \t]+\n/g, "\n") // strip trailing spaces before newlines
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();

  return text;
}
