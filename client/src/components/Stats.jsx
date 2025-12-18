/**
 * File: Stats.jsx
 * Purpose: Display aggregate performance stats and simple visuals.
 *
 * What it shows:
 *  - KPI tiles: overall average %, total attempts, number of topics.
 *  - (When not compact) two charts:
 *      • Bar chart of average by topic
 *      • Line chart of daily scores for the last 30 days
 *
 * Data source:
 *  - Uses getStats(userId) from ../lib/api
 *    Expected shape (example):
 *      {
 *        overall: 87,                // number (percent)
 *        attempts: 12,               // total attempts
 *        topicStats: [               // array for bar chart
 *          { topic: "Biology", average: 85 },
 *          ...
 *        ],
 *        last30: [                   // array for line chart
 *          { date: "2025-09-01", pct: 92 },
 *          ...
 *        ]
 *      }
 *
 * Props:
 *  - compact: boolean (default false)
 *      When true, only the KPI tiles are rendered (no charts).
 */

import { useEffect, useState } from "react";
import { getStats } from "../lib/api";
import {
  LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

export default function Stats({ compact=false }){
  // Holds stats payload from the API
  const [data, setData] = useState(null);
  // Holds an error message (if the API call fails)
  const [error, setError] = useState(null);

  // Fetch stats once on mount for userId=1 (demo user)
  useEffect(()=>{
    getStats(1).then(setData).catch(e=>setError(e.message));
  },[]);

  // Error and loading states
  if (error) return <p className="text-red-600 text-sm">Stats error: {error}</p>;
  if (!data) return <p className="text-slate-500 text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Overall Avg" value={`${data.overall}%`} />
        <Stat label="# Attempts" value={data.attempts} />
        <Stat label="# Topics" value={data.topicStats.length} />
      </div>

      {/* Charts only when not in compact mode */}
      {!compact && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Bar: average by topic */}
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-semibold mb-2">By Topic</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.topicStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0,100]} />
                <Tooltip />
                {/* Default series uses 'average' from each topic object */}
                <Bar dataKey="average" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line: daily scores for the last 30 days */}
          <div className="rounded-xl border p-4 bg-white">
            <h3 className="font-semibold mb-2">Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.last30}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0,100]} />
                <Tooltip />
                {/* Monotone line of percentage over time */}
                <Line type="monotone" dataKey="pct" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Stat
 * Small tile showing a label and a big value (used for KPIs).
 *
 * @param {Object} props
 * @param {string} props.label - Tile caption (e.g., "Overall Avg")
 * @param {string|number} props.value - Display value (e.g., "87%")
 */
function Stat({ label, value }){
  return (
    <div className="rounded-xl border p-4 text-center bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
