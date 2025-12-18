/**
 * File: EventForm.jsx
 * Purpose: Small, reusable form for creating/updating calendar events.
 *
 * UX flow:
 * - If `initial` is provided, the form is pre-filled for editing.
 * - If not, the form seeds start/end using `dateHint` (or "today") with
 *   4–5 PM local-time defaults.
 * - On submit, emits normalized ISO datetimes to the parent via `onSubmit`.
 *
 * Props:
 * - initial?: { id?, title, description, start, end }
 *      Existing event data. `start`/`end` can be Date/ISO/string consumable by Date().
 * - dateHint?: Date|string
 *      Used to seed the default start/end when creating a new event.
 * - onSubmit?: (payload: {title, description, start: ISO, end: ISO}) => void
 * - onCancel?: () => void
 * - onDelete?: () => void         // Only rendered when editing (`initial?.id`)
 *
 * Notes on datetime handling:
 * - The native <input type="datetime-local"> expects a local-time string in the
 *   format "YYYY-MM-DDTHH:mm" (no timezone). We therefore:
 *     (a) convert incoming values to that local string for the inputs, and
 *     (b) convert back to ISO strings on submit for consistent server storage.
 */

import React, { useEffect, useState } from "react";

export default function EventForm({ initial, dateHint, onSubmit, onCancel, onDelete }) {
  /////////////////////////////////
  // Local form state (controlled)
  /////////////////////////////////

  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  // Seed start/end for the inputs in *local* datetime-local format
  const [start, setStart] = useState(initial?.start ? toLocalDT(initial.start) : defaultStart(dateHint));
  const [end, setEnd] = useState(initial?.end ? toLocalDT(initial.end) : defaultEnd(dateHint));

  /**
   * If `initial` changes (e.g., user selects a different event to edit),
   * re-hydrate the form fields. We always transform dates to the local
   * datetime-local string so the inputs display correctly.
   */
  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setStart(toLocalDT(initial.start));
      setEnd(toLocalDT(initial.end));
    }
  }, [initial]);

  /**
   * Handle form submit:
   * - Prevent page reload
   * - Emit normalized payload
   *   (convert local "YYYY-MM-DDTHH:mm" back to ISO for persistence)
   */
  function submit(e) {
    e.preventDefault();
    onSubmit?.({
      title,
      description,
      start: toISO(start),
      end: toISO(end),
    });
  }

  ///////////////////////////////////////
  // Render: simple stacked form layout
  ///////////////////////////////////////

  return (
    <form className="space-y-3" onSubmit={submit}>
      {/* Title (required) */}
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Start / End grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start</label>
          <input
            className="input"
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">End</label>
          <input
            className="input"
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Optional notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="btn" type="submit">Save</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        {/* Show Delete only when editing an existing event */}
        {initial?.id && (
          <button type="button" className="btn" onClick={onDelete}>Delete</button>
        )}
      </div>
    </form>
  );
}

///////////////////////////////////////////
// Date helpers (no behavior changes)
///////////////////////////////////////////

/**
 * defaultStart(dateHint?)
 * Creates a local datetime string for the datetime-local input.
 * Defaults to 4:00 PM local time on dateHint (or today if absent).
 */
function defaultStart(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(16, 0, 0, 0); // 16:00 local
  return toLocalDT(d);
}

/**
 * defaultEnd(dateHint?)
 * Similar to defaultStart but defaults to 5:00 PM.
 */
function defaultEnd(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(17, 0, 0, 0); // 17:00 local
  return toLocalDT(d);
}

/**
 * toLocalDT(value)
 * Convert any Date/parseable value into the "YYYY-MM-DDTHH:mm" local string
 * that <input type="datetime-local"> expects (no timezone suffix).
 */
function toLocalDT(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * toISO(local)
 * Convert the datetime-local string back into an ISO string for storage.
 * (The Date constructor treats the input as local time and converts to UTC.)
 */
function toISO(local) {
  return new Date(local).toISOString();
}
