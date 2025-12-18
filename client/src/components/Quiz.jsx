/**
 * File: Quiz.jsx
 * Purpose: Render a multiple-choice practice quiz from the most recent study guide
 *          (or a provided one). Shows per-question feedback and a summary score.
 *
 * How it finds a quiz (when no `guide` prop is passed):
 *   1) Try `localStorage.lastGuide` and use it if it actually contains a quiz.
 *   2) Fetch `/api/guides`, then walk newest → oldest; pick the first guide that has a quiz.
 *   3) If none have a quiz, fall back to the latest guide and show a hint.
 *
 * Quiz shape tolerance:
 *   - Accepts `quiz: [{ q, choices, answerIndex }]`
 *   - Accepts `quiz: [{ question, options, answer_index }]` (snake_case)
 *   - Accepts `questions: [...]` with a mix of keys (q/question/prompt, choices/options/answers, etc.)
 *   - Accepts letter/text answers (e.g., "B" or "sodium") and resolves them to an index.
 *
 * UI behavior:
 *   - Before submit: selecting an option highlights it.
 *   - After submit: correct choices turn green; your wrong choice (if any) turns red.
 *   - A result card shows raw score and percent; a "Retake" button resets selections.
 */

import React, { useEffect, useMemo, useState } from "react";

//////////////////////////////
// Config / environment var //
//////////////////////////////

// Base URL for API calls; falls back to relative paths when unset.
const BASE = import.meta.env.VITE_API_URL || "";

// Utility: map 0 → 'A', 1 → 'B', ...
const letter = (i) => String.fromCharCode(65 + i);

///////////////////////////////////////////////
// Normalization helpers (accept many shapes) //
///////////////////////////////////////////////

/**
 * normalizeQuizFrom(root)
 * Accepts many common quiz shapes and returns a normalized array of:
 *   { q: string, choices: string[], answerIndex: number }
 *
 * Supported inputs:
 *   - root.quiz: [{ q, choices, answerIndex }]
 *   - root.quiz: [{ question, options, answer_index }]         (snake_case)
 *   - root.questions: same variants as above
 * Also supports answer as a letter ("A"…"F") or as exact choice text.
 */
function normalizeQuizFrom(root) {
  // Choose source array: prefer `quiz`, else `questions`, else empty.
  const arr = Array.isArray(root?.quiz)
    ? root.quiz
    : Array.isArray(root?.questions)
    ? root.questions
    : [];

  // Normalize every item to the canonical shape.
  return arr.map((it = {}) => {
    // Question text (try several keys; default empty string)
    const q =
      it.q ?? it.question ?? it.prompt ?? "";

    // Choices array (try several keys; default empty array)
    const choices =
      it.choices ?? it.options ?? it.answers ?? [];

    // Numeric index (prefer explicit numeric keys if available)
    let answerIndex =
      (typeof it.answerIndex === "number" ? it.answerIndex : null) ??
      (typeof it.correctIndex === "number" ? it.correctIndex : null) ??
      (typeof it.answer_index === "number" ? it.answer_index : null) ??
      (typeof it.correct === "number" ? it.correct : null);

    // If we didn't find a numeric index, try to infer from letter or text answer.
    if (answerIndex == null) {
      const ansText =
        (typeof it.answer === "string" && it.answer.trim()) ||
        (typeof it.correctAnswer === "string" && it.correctAnswer.trim()) ||
        null;

      if (ansText) {
        // Letter → index (A→0, B→1, …)
        const asLetter = ansText.toUpperCase().replace(/[^A-Z]/g, "");
        const idxFromLetter = ["A", "B", "C", "D", "E", "F"].indexOf(asLetter);
        if (idxFromLetter >= 0) answerIndex = idxFromLetter;

        // Exact text match against choices (case/whitespace normalized)
        if (answerIndex == null && Array.isArray(choices) && choices.length) {
          const idxFromText = choices.findIndex(
            (c) => String(c).trim().toLowerCase() === ansText.toLowerCase()
          );
          if (idxFromText >= 0) answerIndex = idxFromText;
        }
      }
    }

    // Safe fallback so the UI remains interactive even if answer is missing.
    if (answerIndex == null) answerIndex = 0;

    return { q, choices, answerIndex };
  });
}

/**
 * extractQuestions(guide)
 * Resolves `guide.content` (stringified JSON or object) and returns the
 * normalized array of quiz questions. Returns [] if parsing/shape fails.
 */
function extractQuestions(guide) {
  try {
    if (!guide) return [];
    // Server stores quiz under `guide.content` (string or object). Accept both.
    let root = guide.content ?? guide;
    if (typeof root === "string") {
      try { root = JSON.parse(root); } catch { return []; }
    }
    // Normalize and validate.
    const quiz = normalizeQuizFrom(root);
    if (!Array.isArray(quiz)) return [];
    return quiz.filter(
      q => q && typeof q.q === "string" && Array.isArray(q.choices) && Number.isInteger(q.answerIndex)
    );
  } catch {
    return [];
  }
}

// Convenience check used during bootstrap.
function hasQuiz(guide) { return extractQuestions(guide).length > 0; }

/////////////////////////
// Component: <Quiz /> //
/////////////////////////

export default function Quiz({ guide }) {
  // When parent doesn't pass a guide, we load one lazily here:
  const [loadedGuide, setLoadedGuide] = useState(null);
  const [loading, setLoading] = useState(false);

  // Small status string so you can see where the quiz came from (localStorage/history).
  const [debugInfo, setDebugInfo] = useState("");

  /**
   * Bootstrap data (only if `guide` prop is not provided):
   *   1) Try localStorage.lastGuide and ensure it has a quiz.
   *   2) Fetch /api/guides, walk newest→oldest; pick first guide with a quiz.
   *   3) If none have a quiz, load latest guide (shows "No quiz found" hint).
   */
  useEffect(() => {
    if (guide) return; // Parent provided a guide; nothing to fetch.

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1) LocalStorage
        const saved = localStorage.getItem("lastGuide");
        if (saved) {
          try {
            const g = JSON.parse(saved);
            if (hasQuiz(g)) {
              if (!cancelled) {
                setLoadedGuide(g);
                setDebugInfo("Loaded quiz from localStorage.");
                return;
              }
            }
          } catch {}
        }

        // 2) Walk history (newest → oldest) looking for the first guide with a quiz.
        const base = BASE || "";
        const list = await fetch(`${base}/api/guides`).then(r => r.json()).catch(() => null);
        const arr = list?.guides || [];

        for (const item of arr) {
          const detail = await fetch(`${base}/api/guides/${item.id}`)
            .then(r => r.json())
            .catch(() => null);
          const g = detail?.guide;
          if (g && hasQuiz(g)) {
            if (!cancelled) {
              setLoadedGuide(g);
              localStorage.setItem("lastGuide", JSON.stringify(g));
              setDebugInfo(`Loaded quiz from guide #${item.id} (${item.topic}).`);
            }
            return;
          }
        }

        // 3) Fallback: load latest, even if it has no quiz (so user sees the hint).
        if (arr[0]) {
          const latest = await fetch(`${base}/api/guides/${arr[0].id}`)
            .then(r => r.json())
            .catch(() => null);
          if (!cancelled && latest?.guide) {
            setLoadedGuide(latest.guide);
            setDebugInfo("No guide with quiz found; loaded latest guide without quiz.");
          }
        } else {
          setDebugInfo("No guides exist yet.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [guide]);

  // Use provided guide if present; otherwise the one we loaded.
  const effectiveGuide = guide || loadedGuide;

  // Compute normalized questions from the guide (memoized).
  const questions = useMemo(() => extractQuestions(effectiveGuide), [effectiveGuide]);

  // User selections (per-question), submission state, and computed score.
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Whenever the question set changes, reset the attempt state.
  useEffect(() => {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
    setScore(0);
  }, [questions.length]);

  //////////////////
  // Empty states //
  //////////////////

  if (loading && !effectiveGuide) {
    return <div className="rounded-2xl border bg-white p-5 text-slate-600 text-sm">Loading…</div>;
  }

  if (!questions.length) {
    return (
      <div className="rounded-2xl border bg-white p-5 space-y-2">
        <p className="text-slate-600 text-sm">
          No quiz found — generate a study guide first (Topic or PDF), then come back to Practice.
        </p>
        {debugInfo && <p className="text-xs text-slate-400">Debug: {debugInfo}</p>}
      </div>
    );
  }

  ///////////////////////////
  // Interaction callbacks //
  ///////////////////////////

  // Pick an answer for question `qi`.
  function select(qi, ci) {
    const copy = answers.slice();
    copy[qi] = ci;
    setAnswers(copy);
  }

  // Evaluate the attempt, compute score, and reveal feedback highlights.
  function submit() {
    const s = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
    setScore(s);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Reset to try again.
  function reset() {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
    setScore(0);
  }

  //////////////
  // Render   //
  //////////////

  return (
    <div className="space-y-6">
      {/* Result summary (shown after submit) */}
      {submitted && (
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-semibold mb-1">Your Result</h3>
          <p className="text-slate-700">
            Score: <span className="font-semibold">{score}</span> / {questions.length} (
            <span className="font-semibold">{Math.round((score / questions.length) * 100)}</span>%)
          </p>
          <div className="mt-3"><button className="btn" onClick={reset}>Retake</button></div>
        </div>
      )}

      {/* Question list */}
      {questions.map((q, qi) => {
        const selected = answers[qi];
        const correct = q.answerIndex;
        const base = "w-full text-left rounded-lg border px-3 py-2";

        return (
          <div key={qi} className="rounded-2xl border bg-white p-5">
            {/* Question text */}
            <div className="font-semibold mb-2">{qi + 1}. {q.q}</div>

            {/* Choices */}
            <div className="space-y-2">
              {q.choices.map((choice, ci) => {
                // Base button class + conditional feedback styling
                let cls = base + " hover:bg-slate-50";
                if (submitted) {
                  if (ci === correct) cls = base + " border-green-500 bg-green-50";
                  if (selected === ci && ci !== correct) cls = base + " border-red-500 bg-red-50";
                } else if (selected === ci) {
                  cls = base + " border-slate-900 bg-slate-100";
                }

                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={submitted}
                    onClick={() => select(qi, ci)}
                    className={cls}
                  >
                    <span className="mr-2 text-xs font-semibold opacity-70">{letter(ci)})</span>
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* After submit: show the correct answer (and your choice if wrong) */}
            {submitted && (
              <div className="mt-3 text-sm text-slate-600">
                Correct answer: <span className="font-semibold">{letter(correct)}) {q.choices[correct]}</span>
                {selected !== correct && selected !== null && (
                  <> — Your answer: <span className="font-semibold">{letter(selected)}) {q.choices[selected]}</span></>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Submit button (hidden after submit; replaced by Retake in the summary) */}
      {!submitted && (
        <div className="flex justify-end">
          <button className="btn" onClick={submit}>Submit</button>
        </div>
      )}
    </div>
  );
}
