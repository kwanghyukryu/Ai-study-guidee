/**
 * File: src/routes/generate.js
 * Purpose: Create a new study guide from a typed topic (non-PDF path).
 *
 * Endpoint:
 *   POST /api/generate
 *   Body (JSON):
 *     {
 *       userId?: number         // defaults to 1
 *       topic: string           // required, min length 2
 *       level?: string          // defaults to "high school"
 *       questions?: number      // int 3..20, defaults to 8
 *     }
 *
 * Behavior:
 *   - Validates request with Zod (friendly 400 on invalid input).
 *   - Calls `generateStudyGuide({ topic, level, questions })` to get a content object.
 *   - Persists the guide via Prisma. `content` is stored as a JSON string in DB.
 *   - Returns `{ guide }` with `content` as a JS object (not a string) for the client.
 */

//////////////////////////
// 1) Imports & setup   //
//////////////////////////

import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateStudyGuide } from "../llm.js";

const router = express.Router();

//////////////////////////////////////////////////////
// 2) Request body validation schema (Zod)          //
//////////////////////////////////////////////////////

/**
 * bodySchema
 * - userId: default 1 (pre-auth convenience)
 * - topic: required, at least 2 characters
 * - level: default "high school"
 * - questions: integer in [3, 20], default 8
 */
const bodySchema = z.object({
  userId: z.number().default(1),
  topic: z.string().min(2),
  level: z.string().default("high school"),
  questions: z.number().int().min(3).max(20).default(8),
});

/////////////////////////////
// 3) Route: POST /        //
/////////////////////////////

/**
 * Create a study guide from a topic.
 * - Validates body
 * - Generates content via LLM helper
 * - Saves to DB (content stored as string)
 * - Responds with the saved row, but `content` as an object
 */
router.post("/", async (req, res) => {
  // Validate input; return 400 with details if invalid
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, topic, level, questions } = parsed.data;

  try {
    // Ask the LLM layer to produce the guide structure/content
    const contentObj = await generateStudyGuide({ topic, level, questions });

    // Persist the row. Note: store content as a string for DB compatibility.
    const dbGuide = await prisma.studyGuide.create({
      data: { userId, topic, level, content: JSON.stringify(contentObj) },
    });

    // Return the guide with content as an object (nicer for the client)
    res.json({ guide: { ...dbGuide, content: contentObj } });
  } catch (e) {
    // Generic error to avoid leaking internals
    res.status(500).json({ error: "Failed to generate guide." });
  }
});

//////////////////////////
// 4) Export the router //
//////////////////////////

export default router;
