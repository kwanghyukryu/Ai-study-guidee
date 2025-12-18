/**
 * File: src/routes/guides.js
 * Purpose: Handle study guide generation (via OpenAI) and retrieval.
 *
 * Endpoints:
 *   POST   /api/guides/generate   → generate a new guide from a topic (calls OpenAI)
 *   GET    /api/guides            → list all guides (history view)
 *   GET    /api/guides/:id        → fetch a specific guide by id (with parsed content)
 *
 * Notes:
 * - Uses Prisma to persist guides.
 * - Each guide stores `content` as a JSON string in DB; endpoints parse it back for client.
 * - For demo, userId is defaulted to 1 and a placeholder User is upserted if missing.
 * - Relies on `OPENAI_API_KEY` and optional `OPENAI_MODEL` from environment.
 */

import express from "express";
import { prisma } from "../db.js";
import OpenAI from "openai";

const router = express.Router();

// OpenAI client (requires API key in env)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * parseJSON(s)
 * Attempt to safely parse JSON. Handles:
 *   - plain JSON string
 *   - JSON fenced in ```json ... ``` or ``` ... ```
 * Throws if still invalid.
 */
function parseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {}
  const m =
    s.match(/```json([\s\S]*?)```/i) ||
    s.match(/```([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  throw new Error("Model did not return strict JSON.");
}

/** ---------------------------
 *  POST /api/guides/generate
 *  Generate a new study guide from a topic.
 *  Body (JSON):
 *    {
 *      topic: string,             // required
 *      level?: string = "high school",
 *      numQuestions?: number = 8,
 *      userId?: number = 1
 *    }
 * ---------------------------- */
router.post("/generate", async (req, res) => {
  try {
    const {
      topic,
      level = "high school",
      numQuestions = 8,
      userId = 1,
    } = req.body || {};

    // Validation: must have a topic string
    if (!topic) return res.status(400).json({ error: "topic is required" });

    if (!process.env.OPENAI_API_KEY)
      return res
        .status(500)
        .json({ error: "OpenAI key missing on server" });

    // Ensure demo user exists (no-op if already there)
    await prisma.user.upsert({
      where: { id: Number(userId) },
      update: {},
      create: {
        id: Number(userId),
        email: `user${userId}@local`,
        name: `User ${userId}`,
      },
    });

    // Build the LLM prompt
    const prompt = [
      `Create a concise study guide about "${topic}" for ${level} students.`,
      `Return STRICT JSON with this shape:`,
      `{
        "title": string,
        "outline": string[],
        "sections": [
          {"title": string, "summary": string, "keyTerms": string[], "example": string}
        ],
        "quiz": [
          {"q": string, "choices": [string,string,string,string], "answerIndex": 0|1|2|3}
        ]
      }`,
      `Number of quiz questions: ${numQuestions}.`,
    ].join("\n");

    // Call OpenAI (chat completion with JSON mode)
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a helpful tutor. Reply with STRICT JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    // Parse JSON response (robust to code fencing)
    const content = parseJSON(resp.choices[0].message.content);

    // Save to DB (content stored as string)
    const saved = await prisma.studyGuide.create({
      data: {
        userId: Number(userId),
        topic: String(topic),
        level: String(level),
        content: JSON.stringify(content),
      },
    });

    // Respond with parsed content
    res.json({ guide: { ...saved, content } });
  } catch (err) {
    console.error("topic generate error:", err);
    res.status(500).json({ error: "Failed to generate" });
  }
});

/** ---------------------------
 *  GET /api/guides
 *  List all guides (history).
 *  Returns: { guides: [{ id, topic, level, createdAt }...] }
 * ---------------------------- */
router.get("/", async (_req, res) => {
  const guides = await prisma.studyGuide.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, level: true, createdAt: true },
  });
  res.json({ guides });
});

/** ---------------------------
 *  GET /api/guides/:id
 *  Get a single guide by id (with parsed content).
 * ---------------------------- */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const g = await prisma.studyGuide.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ error: "not found" });

  let content = null;
  try {
    content = JSON.parse(g.content);
  } catch {}

  res.json({ guide: { ...g, content } });
});

export default router;
