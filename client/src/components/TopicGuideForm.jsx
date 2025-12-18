/**
 * File: TopicGuideForm.jsx
 * Purpose: Small form for generating a study guide from a typed topic (non-PDF path).
 *
 * Behavior:
 * - Tracks {topic, level, questions} plus simple loading/error UI state.
 * - On submit: POSTs to the app API via `createGuide(...)` and, on success,
 *   calls `onGenerated(guide)` so the parent can render the new guide/preview.
 *
 * Props:
 * - onGenerated?: (guide: any) => void
 *     Optional callback invoked with the created `guide` returned by the API.
 *
 * Notes:
 * - `userId` is hard-coded to 1 while auth is not yet integrated.
 * - `questions` is coerced to a Number before sending to the API.
 * - The submit button disables and shows "Generating…" while the request is in flight.
 */

import React, { useState } from "react";
import { createGuide } from "../lib/api";

export default function TopicGuideForm({ onGenerated }) {
  //////////////////////////////
  // Local (controlled) state //
  //////////////////////////////
  const [topic, setTopic] = useState("");                 // user-typed topic/title
  const [level, setLevel] = useState("high school");      // audience level preset
  const [questions, setQuestions] = useState(8);          // desired # of quiz questions
  const [loading, setLoading] = useState(false);          // disables submit while generating
  const [error,   setError]   = useState(null);           // error message (if request fails)

  /**
   * handleSubmit
   * Intercepts form submission, triggers the createGuide API call,
   * and passes the resulting guide back up via onGenerated.
   */
  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call API: create a guide from the typed topic (no PDF here)
      const { guide } = await createGuide({
        userId: 1,
        topic,
        level,
        questions: Number(questions), // ensure numeric type
      });

      // Notify parent so it can update Preview/History/etc.
      onGenerated?.(guide);
    } catch (e) {
      // Surface any server/network error
      setError(e.message);
    } finally {
      // Always stop the loading state
      setLoading(false);
    }
  }

  //////////////////
  // Render (UI)  //
  //////////////////
  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {/* Topic (required) */}
      <div>
        <label className="label">Topic</label>
        <input
          className="input"
          value={topic}
          onChange={e=>setTopic(e.target.value)}
          placeholder="e.g., Photosynthesis"
          required
        />
      </div>

      {/* Options row: Level + # Questions */}
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

      {/* Error message (if any) */}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Submit */}
      <button className="btn" disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
