/**
 * File: PdfGuideForm.jsx
 * Purpose: UI form that lets a user upload a PDF and request an AI-generated study guide.
 *
 * Behavior:
 * - Tracks selected file, desired number of quiz questions, loading/error states.
 * - On submit: builds a FormData payload and POSTs via `createGuideFromPdf`.
 * - On success: calls `onGenerated(guide)` so the parent can show the new guide.
 *
 * Props:
 * - onGenerated?: (guide: any) => void
 *     Optional callback invoked with the created guide object returned by the API.
 *
 * Notes:
 * - Accepts only PDF files (via the file input’s `accept="application/pdf"`).
 * - Shows a small helper note that scanned PDFs (images) won’t extract well.
 * - `userId` is hard-coded to "1" for now; swap to real auth when available.
 */

import React, { useState } from "react";
import { createGuideFromPdf } from "../lib/api";

export default function PdfGuideForm({ onGenerated }) {
  //////////////////////////////
  // Local, controlled state  //
  //////////////////////////////
  const [file, setFile] = useState(null);      // the selected PDF File object
  const [questions, setQuestions] = useState(8); // desired # of quiz questions (default 8)
  const [loading, setLoading] = useState(false); // disables button & shows "Generating…"
  const [error, setError] = useState(null);      // error message string (if any)

  /**
   * handleSubmit
   * Intercepts form submit, validates a file is selected,
   * then sends a multipart/form-data request to the server.
   */
  async function handleSubmit(e){
    e.preventDefault();

    // Basic client-side validation: ensure a PDF is chosen
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build multipart payload for file upload
      const fd = new FormData();
      fd.append("file", file);                          // binary PDF
      fd.append("userId", "1");                         // demo user; replace with real user id when auth is wired
      fd.append("questions", String(questions));        // ensure string type for consistency

      // Call API helper; expects { guide } in response
      const { guide } = await createGuideFromPdf(fd);

      // Notify parent so it can render Preview/Practice/etc.
      onGenerated?.(guide);
    } catch (e) {
      // Surface any server/network error to the UI
      setError(e.message);
    } finally {
      // Always stop the loading state, success or fail
      setLoading(false);
    }
  }

  ////////////////////////////
  // Render: simple stacked //
  ////////////////////////////
  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {/* File chooser */}
      <div>
        <label className="label">Upload PDF</label>

        {/* Accept PDF only; grab the first selected file (or null) */}
        <input
          className="input"
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        {/* Helper text: warns about scanned PDFs (image-only) */}
        <p className="text-xs text-slate-500 mt-1">
          The guide will be generated from the PDF’s text (non-scanned PDFs).
        </p>
      </div>

      {/* Options row(s) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label"># Questions</label>

          {/* Numeric input restricted to a reasonable range */}
          <input
            className="input"
            type="number"
            min={3}
            max={20}
            value={questions}
            onChange={e => setQuestions(e.target.value)}
          />
        </div>
      </div>

      {/* Error display (if any) */}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Submit: shows "Generating…" while request is in-flight */}
      <button className="btn" disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
