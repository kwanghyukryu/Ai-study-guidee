/**
 * File: GradeCalculator.jsx
 * Purpose: Simple weighted-average percentage calculator.
 *
 * UX:
 * - User enters any number of rows (Assignment name optional).
 * - Each row has: Grade (%) and Weight.
 * - Clicking "= Calculate" shows the weighted average to the nearest tenth (one decimal).
 *
 * Notes:
 * - Inputs accept free text; blank/invalid values are coerced to 0 via `toNum`.
 * - Weight can be any scale (e.g., 1–5, or 0–100); the calculator divides by the sum of weights.
 * - Rounds to the nearest tenth using Math.round(avg * 10) / 10, then `.toFixed(1)`.
 */

import React, { useMemo, useState } from "react";

//////////////////////////
// Helpers & seed rows  //
//////////////////////////

// Returns a new empty row object (kept as a function to avoid accidental shared refs)
const emptyRow = () => ({ name: "", grade: "", weight: "" });

// Start with three empty rows for convenience
const initialRows = [emptyRow(), emptyRow(), emptyRow(), ];

/**
 * toNum
 * Safely parse a numeric input string into a finite number.
 * If the input is blank/invalid, returns 0 so the reducer math won’t NaN-out.
 */
function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

//////////////////////////
// Component (default)  //
//////////////////////////

export default function GradeCalculator() {
  // All calculator rows live here
  const [rows, setRows] = useState(initialRows);

  // Final displayed result string (e.g., "87.3"); "..." when empty
  const [result, setResult] = useState("");

  /**
   * update
   * Update a single cell in the i-th row.
   * Uses functional setState to avoid stale closures and map to immutably update only that row.
   */
  function update(i, key, val) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }

  /**
   * addRow
   * Append a new, empty row to the bottom.
   */
  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }

  /**
   * sumW / sumGW computed values
   * - sumW: sum of all weights
   * - sumGW: sum of (grade * weight)
   * We memoize so typing in one input won’t recompute unnecessarily for unrelated state.
   */
  const { sumW, sumGW } = useMemo(() => {
    const w = rows.reduce((a, r) => a + toNum(r.weight), 0);
    const gw = rows.reduce((a, r) => a + toNum(r.grade) * toNum(r.weight), 0);
    return { sumW: w, sumGW: gw };
  }, [rows]);

  /**
   * calculate
   * Computes weighted average = sum(grade * weight) / sum(weight)
   * Rounds to the nearest tenth and displays with one decimal (e.g., "92.6").
   * Edge case: if total weight is 0 or negative, result is "0.0".
   */
  function calculate() {
    if (sumW <= 0) {
      setResult("0.0");
      return;
    }
    const avg = sumGW / sumW;                  // weighted average
    const rounded = Math.round(avg * 10) / 10; // nearest tenth
    setResult(rounded.toFixed(1));             // always show one decimal place
  }

  //////////////////
  // Render (UI)  //
  //////////////////

  return (
    <div className="space-y-4">
      {/* Entry grid: Assignment | Grade (%) | Weight */}
      <div className="card">
        <div className="grid grid-cols-[1fr,10rem,8rem] gap-3 items-end">
          <div className="font-semibold">Assignment (optional)</div>
          <div className="font-semibold">Grade (%)</div>
          <div className="font-semibold">Weight</div>

          {rows.map((r, i) => (
            <React.Fragment key={i}>
              {/* Assignment name (free text) */}
              <input
                className="input"
                value={r.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder=""
              />
              {/* Grade (%) — accepts decimals, parsed via toNum */}
              <input
                className="input"
                value={r.grade}
                onChange={(e) => update(i, "grade", e.target.value)}
                inputMode="decimal"
                placeholder=""
              />
              {/* Weight — accepts decimals, parsed via toNum */}
              <input
                className="input"
                value={r.weight}
                onChange={(e) => update(i, "weight", e.target.value)}
                inputMode="decimal"
                placeholder=""
              />
            </React.Fragment>
          ))}
        </div>

        {/* Row controls */}
        <div className="mt-4 flex gap-3">
          <button className="btn" onClick={addRow}>+ Add row</button>
          <button className="btn" onClick={calculate}>= Calculate</button>
        </div>
      </div>

      {/* Result panel */}
      <div className="card">
        <div className="font-semibold mb-1">Average grade</div>
        <div className="text-2xl font-semibold">{result || "..."}</div>
      </div>
    </div>
  );
}
