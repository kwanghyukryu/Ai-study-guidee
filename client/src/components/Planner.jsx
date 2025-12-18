/**
 * File: Planner.jsx
 * Purpose: Month-view calendar with a simple event CRUD workflow.
 * 
 * What it does:
 * - Renders a monthly grid (including leading/trailing days from adjacent months).
 * - Fetches events for the visible date range and groups them by day.
 * - Clicking a day opens a modal to create a new event at that date.
 * - Clicking an existing event opens the same modal pre-filled for editing.
 * - Supports create, update, delete via ../lib/calendarApi.
 *
 * Key ideas:
 * - The visible range is computed as the full weeks that cover the month
 *   (startOfWeek(startOfMonth) → endOfWeek(endOfMonth)), so the grid is always
 *   a whole number of weeks (rows).
 * - Events are memo-grouped into a Map keyed by "yyyy-MM-dd" for quick lookup
 *   when rendering each day cell.
 * - A lightweight modal is shown with <EventForm/> for both create & edit.
 */

import React, { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format, isSameMonth, isToday } from "date-fns";
import { listEvents, createEvent, updateEvent, deleteEvent } from "../lib/calendarApi";
import EventForm from "./EventForm.jsx";

export default function Planner(){
  // The first day of the month currently being viewed
  const [month, setMonth] = useState(startOfMonth(new Date()));
  // All events fetched for the current visible range
  const [events, setEvents] = useState([]);
  // Date used to seed the EventForm when creating a new event
  const [selectedDate, setSelectedDate] = useState(null);
  // The event we're editing (null when creating)
  const [editing, setEditing] = useState(null); // event or null
  // Controls whether the EventForm modal is open
  const [showForm, setShowForm] = useState(false);

  /**
   * Compute the full visible range for the calendar grid:
   * - Begin on the Sunday of the week containing the 1st of the month
   * - End on the Saturday of the week containing the last day of the month
   * This ensures a complete grid of whole weeks.
   */
  const range = useMemo(()=>{
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const to   = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return { from, to };
  }, [month]);

  /**
   * Fetch events whenever the visible range changes.
   * The API expects ISO strings; we store the returned events in state.
   */
  useEffect(()=>{
    (async ()=>{
      const { events } = await listEvents({ from: range.from.toISOString(), to: range.to.toISOString() });
      setEvents(events);
    })();
  }, [range.from, range.to]);

  /**
   * Build a Map keyed by "yyyy-MM-dd" → [events…] for fast lookup per day cell.
   * Called inside useMemo below to avoid re-computing on every render.
   */
  function byDayMap(){
    const m = new Map();
    events.forEach(ev=>{
      const key = format(new Date(ev.start), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(ev);
    });
    return m;
  }

  // Memoize the day→events mapping; recompute only when `events` changes
  const dayEvents = useMemo(byDayMap, [events]);

  /**
   * Build a flat list of all Date objects that will be rendered as cells
   * (from `range.from` to `range.to`, inclusive), advancing by 1 day.
   */
  const days = useMemo(()=>{
    const out = [];
    let d = range.from;
    while (d <= range.to){ out.push(d); d = addDays(d, 1); }
    return out;
  }, [range]);

  // Open the form to create a new event on a given date
  function openCreate(date){
    setSelectedDate(date);
    setEditing(null);
    setShowForm(true);
  }

  // Open the form to edit an existing event
  function openEdit(ev){
    setEditing(ev);
    setSelectedDate(new Date(ev.start));
    setShowForm(true);
  }

  /**
   * Handle create or update from the EventForm.
   * - If `editing` is set, update that event and replace it in local state.
   * - Otherwise, create a new event (demo userId=1) and prepend it to state.
   * - Close the modal afterward.
   */
  async function onCreateOrUpdate(payload){
    if (editing) {
      const { event } = await updateEvent(editing.id, payload);
      setEvents(evts => evts.map(e => e.id === event.id ? event : e));
    } else {
      const { event } = await createEvent({ userId: 1, ...payload });
      setEvents(evts => [event, ...evts]);
    }
    setShowForm(false);
  }

  /**
   * Handle delete from the EventForm while editing.
   * - Remove the event from local state and close the modal.
   */
  async function onDelete(){
    if (!editing) return;
    await deleteEvent(editing.id);
    setEvents(evts => evts.filter(e => e.id !== editing.id));
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Header: month navigator + "Today" button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={()=>setMonth(addMonths(month, -1))}>&larr;</button>
          <div className="text-xl font-semibold">{format(month, "MMMM yyyy")}</div>
          <button className="btn" onClick={()=>setMonth(addMonths(month, 1))}>&rarr;</button>
        </div>
        <button className="btn" onClick={()=>{ setMonth(startOfMonth(new Date())); }}>Today</button>
      </div>

      {/* Weekday header row */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>

      {/* Month grid: each cell is a day; opacity lowered for days outside current month */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const items = dayEvents.get(key) || [];
          return (
            <div key={key} className={`rounded-xl border p-2 min-h-[120px] bg-white ${isSameMonth(d, month) ? "opacity-100" : "opacity-60"}`}>
              {/* Day number button; clicking creates a new event on that date */}
              <div className="flex items-center justify-between">
                <button
                  className={`text-xs font-semibold px-2 py-1 rounded ${isToday(d) ? "bg-slate-900 text-white" : "bg-slate-100"}`}
                  onClick={()=>openCreate(d)}
                  title="Add event"
                >
                  {format(d, "d")}
                </button>
              </div>

              {/* Up to 3 events shown per day; clicking opens the editor */}
              <div className="mt-2 space-y-1">
                {items.slice(0, 3).map(ev => (
                  <button key={ev.id}
                          className="w-full text-left text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                          onClick={()=>openEdit(ev)}
                          title={`${new Date(ev.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} ${ev.title}`}>
                    {timeRange(ev)} · {ev.title}
                  </button>
                ))}
                {/* Overflow indicator if there are more than 3 events */}
                {items.length > 3 && <div className="text-[10px] text-slate-500">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Drawer with the EventForm (used for both create and edit) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{editing ? "Edit event" : "New event"}</h3>
              <button className="btn" onClick={()=>setShowForm(false)}>Close</button>
            </div>
            <EventForm
              initial={editing}
              dateHint={selectedDate}
              onSubmit={onCreateOrUpdate}
              onCancel={()=>setShowForm(false)}
              onDelete={onDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * timeRange(ev)
 * Formats a compact "HH:mm–HH:mm" range in the user's locale.
 * Uses the event's start/end datetimes.
 */
function timeRange(ev){
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const fmt = (d)=> d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  return `${fmt(s)}–${fmt(e)}`;
}
