/**
 * File: src/routes/stats.js
 * Purpose: Compute and return user performance statistics based on quiz attempts.
 *
 * Endpoint:
 *   GET /api/stats?userId=#
 *
 * Query params:
 *   userId?: number   → defaults to 1 if not provided
 *
 * Response JSON:
 *   {
 *     overall: number,       // overall average score across all attempts (%)
 *     attempts: number,      // total number of attempts
 *     topicStats: [          // per-topic averages
 *       {
 *         topic: string,
 *         average: number,   // average percentage for that topic
 *         attempts: number   // how many attempts on that topic
 *       },
 *       ...
 *     ],
 *     last30: [              // attempts from the last 30 days
 *       {
 *         date: "YYYY-MM-DD",
 *         pct: number        // percentage score for that attempt
 *       },
 *       ...
 *     ]
 *   }
 *
 * Notes:
 * - All stats are derived from Attempt rows in the database.
 * - Percentages are rounded to one decimal place.
 * - The `last30` series is intended for plotting (e.g., a line chart).
 */

import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

/**
 * GET /
 * Compute stats for a given user.
 */
router.get("/", async (req, res) => {
  // Default userId = 1 for demo/testing if not provided
  const userId = Number(req.query.userId || 1);

  try {
    // Load all attempts by this user
    const all = await prisma.attempt.findMany({ where: { userId } });

    //////////////////////////////
    // 1) Overall average       //
    //////////////////////////////
    const overall = all.reduce(
      (a, x) => ({
        sumScore: a.sumScore + x.score,
        sumTotal: a.sumTotal + x.total,
      }),
      { sumScore: 0, sumTotal: 0 }
    );

    const overallPct = overall.sumTotal
      ? (overall.sumScore / overall.sumTotal) * 100
      : 0;

    //////////////////////////////
    // 2) Per-topic averages    //
    //////////////////////////////
    const byTopicMap = all.reduce((m, a) => {
      // Create accumulator if topic not yet seen
      m[a.topic] ??= { topic: a.topic, sumScore: 0, sumTotal: 0, count: 0 };

      // Add this attempt’s contribution
      m[a.topic].sumScore += a.score;
      m[a.topic].sumTotal += a.total;
      m[a.topic].count++;

      return m;
    }, {});

    const topicStats = Object.values(byTopicMap)
      .map((t) => ({
        topic: t.topic,
        average: t.sumTotal
          ? +(100 * t.sumScore / t.sumTotal).toFixed(1)
          : 0,
        attempts: t.count,
      }))
      .sort((a, b) => a.topic.localeCompare(b.topic));

    //////////////////////////////
    // 3) Last 30 days series   //
    //////////////////////////////
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const last30 = all
      .filter((a) => a.createdAt >= since)
      .map((a) => ({
        date: a.createdAt.toISOString().slice(0, 10), // YYYY-MM-DD
        pct: +((100 * a.score) / a.total).toFixed(1),
      }));

    //////////////////////////////
    // Response                 //
    //////////////////////////////
    res.json({
      overall: +overallPct.toFixed(1),
      attempts: all.length,
      topicStats,
      last30,
    });
  } catch {
    res.status(500).json({ error: "Failed to compute stats." });
  }
});

export default router;
