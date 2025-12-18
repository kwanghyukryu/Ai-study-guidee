/**
 * File: src/routes/attempts.js
 * Purpose: Persist a quiz/practice attempt for a user.
 *
 * Endpoint:
 *   POST /api/attempts
 *   Body (JSON):
 *     {
 *       userId?: number         // defaults to 1 if omitted
 *       studyGuideId?: number   // optional link to a StudyGuide
 *       topic: string           // required topic name/title
 *       score: number           // required integer, >= 0
 *       total: number           // required integer, >= 1
 *     }
 *
 * Behavior:
 *   - Validates the incoming body with Zod.
 *   - On success: creates an Attempt row via Prisma and returns { attempt }.
 *   - On validation error: returns 400 with Zod error details (flattened).
 *   - On DB error: returns 500 with a generic message.
 */

//////////////////////////
// 1) Imports & setup   //
//////////////////////////

import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const router = express.Router();

////////////////////////////////////////
// 2) Request body validation (Zod)   //
////////////////////////////////////////

/**
 * bodySchema
 * Defines and enforces the expected shape of the request body.
 *
 * Notes:
 * - userId defaults to 1 to keep things working pre-auth.
 * - studyGuideId is optional so attempts can be recorded
 *   even for ad-hoc quizzes not tied to a saved guide.
 * - topic must be a non-empty string.
 * - score must be an integer >= 0.
 * - total must be an integer >= 1.
 */
const bodySchema = z.object({
  userId: z.number().default(1),
  studyGuideId: z.number().optional(),
  topic: z.string().min(1),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

/////////////////////////////
// 3) Routes (CRUD: Create) //
/////////////////////////////

/**
 * POST /
 * Creates a new Attempt record.
 */
router.post("/", async (req, res) => {
  // Validate body; return 400 with details if invalid
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Destructure validated values
  const { userId, studyGuideId, topic, score, total } = parsed.data;

  try {
    // Insert Attempt row
    const attempt = await prisma.attempt.create({
      data: { userId, studyGuideId, topic, score, total },
    });

    // Success response
    res.json({ attempt });
  } catch (e) {
    // Generic error to avoid leaking internals
    res.status(500).json({ error: "Failed to save attempt." });
  }
});

//////////////////////////
// 4) Export the router //
//////////////////////////

export default router;
