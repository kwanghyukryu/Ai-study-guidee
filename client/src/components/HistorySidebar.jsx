/**
 * File: HistorySidebar.jsx
 * Purpose: Sidebar that lists previously generated study guides.
 *          Lets the user re-open any guide by clicking it.
 *
 * Layout:
 * - Hidden on small screens (`hidden md:block`), fixed width on md+ (`w-64`).
 * - Sticky card container so the list stays visible while main content scrolls.
 *
 * Props:
 * - items:    Array<{ id: number, topic: string, createdAt: string | Date }>
 *             Guides to render in the history list (newest-first is ideal, but not required).
 * - activeId: number | null
 *             The currently-selected guide id (for highlighting the active row).
 * - onSelect: (id: number) => void
 *             Called when a guide row is clicked.
 * - onRefresh: () => void
 *             Called when the "Refresh" button is clicked (parent should reload history).
 */

import React from "react";

export default function HistorySidebar({ items, activeId, onSelect, onRefresh }) {
  return (
    // Hidden on small screens; visible from md breakpoint; fixed 16rem width
    <aside className="hidden md:block w-64">
      {/* Sticky container so the panel stays in view as the page scrolls */}
      <div className="card sticky top-4">
        {/* Header row: title + manual refresh control */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">History</h2>
          <button className="text-xs underline" onClick={onRefresh}>Refresh</button>
        </div>

        {/* Scrollable list with compact spacing; right padding so scrollbar doesn’t overlay text */}
        <ul className="space-y-1 max-h-[70vh] overflow-auto pr-1">
          {/* Empty state when no guides have been created yet */}
          {items?.length === 0 && (
            <li className="text-sm text-slate-500">No guides yet.</li>
          )}

          {/* Render each guide as a button-like row; highlight the active one */}
          {items?.map((g) => (
            <li key={g.id}>
              <button
                className={`w-full text-left px-2 py-2 rounded-lg border transition ${
                  activeId === g.id
                    ? "bg-slate-900 text-white border-slate-900"     // active selection styling
                    : "border-slate-200 hover:bg-slate-50"            // default + hover
                }`}
                onClick={() => onSelect(g.id)}
              >
                {/* Topic/title on first line; truncate to keep rows tidy */}
                <div className="font-medium truncate">{g.topic || "Untitled"}</div>

                {/* Timestamp on second line; small + subtle */}
                <div className="text-[11px] opacity-70">
                  {new Date(g.createdAt).toLocaleString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
