/**
 * File: StudyGuideView.jsx
 * Purpose: Read-only viewer for a generated Study Guide.
 *
 * What it renders:
 *  - Title: c.title → guide.topic → "Study Guide"
 *  - Optional Outline: bulleted list if present
 *  - Sections: each with heading, summary, optional key terms, optional example
 *
 * Assumptions:
 *  - `guide.content` is already a JS object (not a JSON string). Upstream code
 *    should parse JSON if the server returns `content` as a string.
 *
 * Props:
 *  - guide?: {
 *      topic?: string,
 *      content?: {
 *        title?: string,
 *        outline?: string[],
 *        sections?: Array<{
 *          heading?: string,
 *          summary?: string,
 *          key_terms?: string[],
 *          example?: string
 *        }>
 *      }
 *    }
 */

//////////////////////////
// 1) Imports
//////////////////////////
import React from "react";

//////////////////////////
// 2) Component
//////////////////////////
export default function StudyGuideView({ guide }){
  // Early empty state: nothing to render until a guide exists.
  if (!guide) return <p className="text-slate-500">No guide yet — generate one.</p>;

  // Pull the content object (default to {} if missing)
  const c = guide.content || {};
  // Outline is an array of strings we show as a bulleted list
  const outline = c.outline || [];
  // Sections are the main content blocks (heading + summary + extras)
  const sections = c.sections || [];

  return (
    <div className="space-y-4">
      {/* Title fallback order: content.title → guide.topic → generic */}
      <h3 className="text-xl font-semibold">
        {c.title || guide.topic || "Study Guide"}
      </h3>

      {/* Optional Outline block (only if we have items) */}
      {outline.length>0 && (
        <div>
          <h4 className="font-semibold mb-1">Outline</h4>
          <ul className="list-disc pl-5 text-sm">
            {outline.map((o,i)=><li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {/* Sections list: one boxed card per section */}
      {sections.map((s,i)=>(
        <div key={i} className="rounded-xl border p-3 bg-white">
          <h5 className="font-semibold">{s.heading}</h5>
          <p className="text-sm mt-1">{s.summary}</p>

          {/* Key terms line (shown only when non-empty) */}
          {s.key_terms?.length>0 && (
            <p className="text-xs mt-2">
              <span className="font-semibold">Key terms:</span> {s.key_terms.join(", ")}
            </p>
          )}

          {/* Optional example block (preformatted for readability) */}
          {s.example && (
            <pre className="bg-slate-50 rounded p-2 mt-2 text-xs overflow-auto">
              {s.example}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
