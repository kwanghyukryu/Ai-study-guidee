/**
 * File: StudyGuideForm.jsx
 * Purpose: Unified form for generating a study guide either
 *          (a) from a text topic, or (b) from an uploaded PDF.
 *
 * Behavior overview:
 * - Tracks topic, level, desired # of quiz questions, and an optional PDF file.
 * - On submit:
 *    • If a PDF is selected -> builds FormData and calls `createGuideFromPdf`.
 *    • Otherwise            -> sends JSON to `createGuide` using the typed topic.
 * - Emits the created guide to the parent via `onGenerated(guide)`.
 *
 * UX notes:
 * - If a PDF is chosen, the Topic input becomes optional (we’ll derive a title from the filename when empty).
 * - Level and # Questions apply to both topic- and PDF-based generations.
 * - Shows a tiny helper note that scanned PDFs (images only) won’t extract well.
 */

import React, { useState } from "react";
import { createGuide, createGuideFromPdf } from "../lib/api";

export default function StudyGuideForm({ onGenerated }) {
  //////////////////////////////
  // Local (controlled) state //
  //////////////////////////////
  const [topic, setTopic] = useState("");             // typed topic for non-PDF generation
  const [level, setLevel] = useState("high school");  // audience level presets
  const [questions, setQuestions] = useState(8);      // desired number of quiz questions
  const [file, setFile] = useState(null);             // selected PDF File (or null)
  const [loading, setLoading] = useState(false);      // disables submit & shows "Generating…"
  const [error, setError] = useState(null);           // holds any error message

  /**
   * handleSubmit
   * Intercepts form submission and routes the request depending on whether
   * a PDF is selected. Errors are caught and surfaced in the UI.
   */
  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true); 
    setError(null);

    try {
      let resp;

      if (file) {
        // --- PDF path: use multipart/form-data ---
        const fd = new FormData();
        fd.append("file", file);                                   // attach the binary PDF
        fd.append("userId", "1");                                  // demo user id (replace with real auth later)
        fd.append("topic", topic || file.name.replace(/\.pdf$/i, "")); // derive a topic/name if left blank
        fd.append("level", level);
        fd.append("questions", String(questions));                 // ensure string for consistency
        resp = await createGuideFromPdf(fd);
      } else {
        // --- Topic path: simple JSON payload ---
        resp = await createGuide({ 
          userId: 1, 
          topic, 
          level, 
          questions: Number(questions) 
        });
      }

      // Hand the created guide to the parent so it can render Preview/Practice/etc.
      onGenerated(resp.guide);
    } catch (e) {
      // Show any network/server error
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  //////////////////
  // Render (UI)  //
  //////////////////
  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {/* Topic input (required only when no PDF is selected) */}
      <div>
        <label className="label">Topic</label>
        <input
          className="input"
          value={topic}
          onChange={e=>setTopic(e.target.value)}
          placeholder="e.g., Photosynthesis or PDF title"
          required={!file}  // if a PDF is chosen, topic can be empty
        />
      </div>

      {/* Optional PDF upload (takes precedence over text topic when provided) */}
      <div>
        <label className="label">Upload PDF (optional)</label>
        <input
          className="input"
          type="file"
          accept="application/pdf"
          onChange={(e)=>setFile(e.target.files?.[0] || null)}
        />
        <p className="text-xs text-slate-500 mt-1">
          If a PDF is provided, the guide is generated from it (best with selectable text, not scans).
        </p>
      </div>

      {/* Options: Level + # Questions */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Level</label>
          <select
            className="input"
            value={level}
            onChange={e=>setLevel(e.target.value)}
          >
            <option>middle school</option>
            <option>high school</option>
            <option>intro college</option>
            <option>advanced</option>
          </select>
        </div>

        <div>
          <label className="label"># Questions</label>
          <input
            className="input"
            type="number"
            min={3}
            max={20}
            value={questions}
            onChange={e=>setQuestions(e.target.value)}
          />
        </div>
      </div>

      {/* Error feedback (if any) */}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Submit button (disabled while generating) */}
      <button className="btn" disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
