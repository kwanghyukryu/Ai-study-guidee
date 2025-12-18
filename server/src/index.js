/**
 * File: src/index.js
 * Purpose: Main entrypoint for the Express server.
 *
 * Responsibilities:
 * - Load environment variables
 * - Set up middleware (CORS, JSON body parsing)
 * - Mount all route modules (/api/*)
 * - Provide a health-check endpoint
 * - Global error handling (incl. Multer errors)
 * - Start the server on configured PORT
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

// Import route modules
import generateRouter from "./routes/generate.js";
import attemptsRouter from "./routes/attempts.js";
import statsRouter from "./routes/stats.js";
import generateFromPdfRouter from "./routes/generateFromPdf.js";
import guidesRouter from "./routes/guides.js";
import flashcardsRouter from "./routes/flashcards.js";
import eventsRouter from "./routes/events.js";

// Load .env variables into process.env
dotenv.config();

//////////////////////////
// App initialization   //
//////////////////////////

const app = express();

/**
 * Middleware stack
 */

// CORS: allow client (default http://localhost:5173) to call API
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
    credentials: false, // not using cookies
  })
);

// Parse JSON bodies up to 2 MB
app.use(express.json({ limit: "2mb" }));

//////////////////////////
// Routes               //
//////////////////////////

// Simple health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Study guide generation (topic)
app.use("/api/generate", generateRouter);

// Study guide generation (from PDF upload)
app.use("/api/generate-from-pdf", generateFromPdfRouter);

// Quiz attempts
app.use("/api/attempts", attemptsRouter);

// Stats and analytics
app.use("/api/stats", statsRouter);

// Guide history / retrieval
app.use("/api/guides", guidesRouter);

// Flashcards (decks & cards)
app.use("/api/flashcards", flashcardsRouter);

// Planner events (calendar)
app.use("/api/events", eventsRouter);

//////////////////////////
// Error handling       //
//////////////////////////

// Global JSON error handler (covers Multer + JSON body parsing errors)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ error: "PDF too large. Max 30 MB." });
    if (err.code === "LIMIT_UNEXPECTED_FILE")
      return res.status(400).json({ error: "Only PDF files are allowed." });
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  if (err?.type === "entity.too.large")
    return res.status(413).json({ error: "Request body too large." });

  console.error(err);
  res.status(500).json({ error: "Server error." });
});

//////////////////////////
// Start server         //
//////////////////////////

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API ready on :${PORT}`));
