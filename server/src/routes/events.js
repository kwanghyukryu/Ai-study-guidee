/**
 * File: src/routes/events.js
 * Purpose: Calendar Events CRUD for the Planner feature.
 *
 * Endpoints:
 *   GET    /api/events           → list events overlapping a given range
 *   POST   /api/events           → create a new event
 *   PATCH  /api/events/:id       → update fields of an existing event
 *   DELETE /api/events/:id       → delete an event
 *
 * Data model expectations (Prisma):
 *   Event { id, userId, title, description?, start: DateTime, end: DateTime, allDay: Boolean }
 *   User  { id, email, name, ... }
 *
 * Notes:
 * - Dates are handled as ISO strings over the wire; converted to JS Date on the server.
 * - The GET route returns any event that overlaps the [from, to] window (not only strictly inside).
 * - POST upserts a demo user if `userId` doesn’t exist yet (pre-auth convenience).
 */

import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

/**
 * parseISO(d)
 * Safely parse an incoming date value to a JS Date.
 * Returns `null` if the input is invalid (so callers can 400 gracefully).
 */
function parseISO(d) {
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

/** ---------------------------
 *  GET /api/events
 *  List events overlapping a range.
 *  Query:
 *    userId?: number  (defaults to 1)
 *    from?:   ISODate (default = now - 45 days)
 *    to?:     ISODate (default = now + 45 days)
 *  Overlap condition: start <= to AND end >= from
 * ---------------------------- */
router.get("/", async (req, res) => {
  const userId = Number(req.query.userId || 1);

  // Default window is ±45 days around "now" if not provided.
  const from =
    parseISO(req.query.from) ||
    new Date(Date.now() - 45 * 24 * 3600 * 1000);

  const to =
    parseISO(req.query.to) ||
    new Date(Date.now() + 45 * 24 * 3600 * 1000);

  // Overlap query: events that start before the end AND end after the start.
  const events = await prisma.event.findMany({
    where: {
      userId,
      AND: [{ start: { lte: to } }, { end: { gte: from } }],
    },
    orderBy: [{ start: "asc" }],
  });

  res.json({ events });
});

/** ---------------------------
 *  POST /api/events
 *  Create a new event.
 *  Body (JSON):
 *    {
 *      userId?: number = 1,
 *      title: string,
 *      description?: string,
 *      start: ISODate,
 *      end:   ISODate,
 *      allDay?: boolean = false
 *    }
 *  Validations:
 *   - title, start, end are required
 *   - start/end must be valid; end must be after start
 *   - Creates demo User if not present (via upsert)
 * ---------------------------- */
router.post("/", async (req, res) => {
  try {
    const {
      userId = 1,
      title,
      description = "",
      start,
      end,
      allDay = false,
    } = req.body || {};

    if (!title || !start || !end) {
      return res
        .status(400)
        .json({ error: "title, start, end are required" });
    }

    const s = parseISO(start);
    const e = parseISO(end);
    if (!s || !e) {
      return res
        .status(400)
        .json({ error: "Invalid date format for start or end" });
    }
    if (e <= s) {
      return res
        .status(400)
        .json({ error: "End time must be after start time" });
    }

    // Ensure the user exists (demo-friendly). No-op if already present.
    await prisma.user.upsert({
      where: { id: Number(userId) },
      update: {},
      create: {
        id: Number(userId),
        email: `user${userId}@local`,
        name: `User ${userId}`,
      },
    });

    // Create the event
    const ev = await prisma.event.create({
      data: {
        userId: Number(userId),
        title: String(title),
        description: description ? String(description) : null,
        start: s,
        end: e,
        allDay: Boolean(allDay),
      },
    });

    res.json({ event: ev });
  } catch (e) {
    console.error("Create event error:", e);
    res.status(500).json({ error: "Failed to create event" });
  }
});

/** ---------------------------
 *  PATCH /api/events/:id
 *  Update an event (partial).
 *  Body (JSON) — any subset of:
 *    { title?, description?, start?, end?, allDay? }
 *  Validations:
 *   - start/end (if provided) must be valid ISO dates
 * ---------------------------- */
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = {};

    if (req.body.title !== undefined) {
      data.title = String(req.body.title);
    }

    if (req.body.description !== undefined) {
      data.description = req.body.description
        ? String(req.body.description)
        : null;
    }

    if (req.body.start !== undefined) {
      const s = parseISO(req.body.start);
      if (!s) return res.status(400).json({ error: "Invalid start date" });
      data.start = s;
    }

    if (req.body.end !== undefined) {
      const e = parseISO(req.body.end);
      if (!e) return res.status(400).json({ error: "Invalid end date" });
      data.end = e;
    }

    if (req.body.allDay !== undefined) {
      data.allDay = Boolean(req.body.allDay);
    }

    const ev = await prisma.event.update({ where: { id }, data });
    res.json({ event: ev });
  } catch (e) {
    console.error("Update event error:", e);
    res.status(500).json({ error: "Failed to update event" });
  }
});

/** ---------------------------
 *  DELETE /api/events/:id
 *  Remove an event.
 * ---------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.event.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete event error:", e);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
