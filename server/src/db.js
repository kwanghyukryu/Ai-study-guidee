/**
 * File: src/db.js
 * Purpose: Initialize and export a shared Prisma client instance
 *          for database access across the server routes.
 *
 * Notes:
 * - PrismaClient manages the DB connection pool.
 * - We create one instance and export it (singleton pattern).
 * - On process termination (SIGINT, SIGTERM), we disconnect
 *   cleanly to avoid leaving open DB connections.
 */

import { PrismaClient } from "@prisma/client";

// Create a single PrismaClient instance
export const prisma = new PrismaClient();

/**
 * Graceful shutdown handlers
 * Ensures Prisma disconnects before process exits.
 */
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
