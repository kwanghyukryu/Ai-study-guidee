/**
 * File: src/routes/generateFromPdf.js
 * Purpose: Create a study guide by uploading a PDF. The server:
 *   1) Accepts a PDF upload (multipart/form-data, field name "file")
 *   2) Extracts text from the PDF
 *   3) Asks the LLM layer to build a study guide from that text
 *   4) Persists the guide (content stored as JSON string in DB)
 *   5) Returns the saved guide with `content` as a JS object
 *
 * Route (mounted by the app, e.g. at /api/generateFromPdf):
 *   POST /            with multipart/form-data:
 *     - file: PDF binary (required)
 *     - userId?: number  (defaults to 1 if missing)
 *     - level?: string   (defaults to "high school")
 *     - questions?: number (clamped between 3–20; default 8)
 *     - topic?: string   (falls back to uploaded filename or "From PDF")
 *
 * Responses:
 *   200 { guide: { ... , content: <object> } }
 *   400 { error: "..." }   → missing/invalid inputs or unreadable PDF
 *   500 { error: "..." }   → unexpected server/LLM/DB error
 */

import express from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { extractPdfText } from "../pdf.js";
import { generateStudyGuideFromText } from "../llm.js";

const router = express.Router();

/**
 * Multer configuration:
 * - memoryStorage(): keeps file in RAM buffer (no temp files on disk)
 * - limits.fileSize: 30 MB cap to prevent huge uploads
 * - fileFilter: only accept PDFs (mimetype check)
 *
 * Note: On non-PDF, we signal Multer's own error type with
 *       LIMIT_UNEXPECTED_FILE for the "file" field.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }
    cb(null, true);
  }
});

/**
 * POST /
 * Handles a single PDF upload (field name: "file"), then:
 *   - derives user inputs (userId, level, questions, topic)
 *   - upserts a demo user so DB constraints aren't violated pre-auth
 *   - extracts text from the PDF buffer
 *   - generates study guide content from the text
 *   - writes StudyGuide row to DB with stringified content
 *   - returns the saved row with content as an object
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // Derive inputs with sensible defaults/clamps
    const userId = Number(req.body.userId || 1);
    const level = String(req.body.level || "high school");
    const questions = Math.min(20, Math.max(3, Number(req.body.questions || 8)));
    const topic = (req.body.topic || req.file?.originalname || "From PDF").toString();

    // Guard: the file field is required
    if (!req.file) return res.status(400).json({ error: "PDF file missing (field should be 'file')." });

    // Ensure a user row exists (demo-friendly before real auth)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `user${userId}@local`, name: `User ${userId}` }
    });

    // Extract text content from the uploaded PDF bytes
    const text = await extractPdfText(req.file.buffer);
    if (!text) return res.status(400).json({ error: "Could not read text from PDF (is it a scanned image?)." });

    // Ask the LLM layer to synthesize a study guide from raw text
    const contentObj = await generateStudyGuideFromText({ title: topic, level, questions, sourceText: text });

    // Persist guide (store JSON as a string for DB portability)
    const dbGuide = await prisma.studyGuide.create({ data: { userId, topic, level, content: JSON.stringify(contentObj) } });

    // Respond with content as an object for client convenience
    res.json({ guide: { ...dbGuide, content: contentObj } });
  } catch (e) {
    // Log for server diagnostics; return a generic error to the client
    console.error(e);
    res.status(500).json({ error: "Failed to generate guide from PDF." });
  }
});

export default router;
