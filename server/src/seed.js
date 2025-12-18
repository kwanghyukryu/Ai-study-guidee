/**
 * File: prisma/seed.js
 * Purpose: Populate the database with an initial demo user for development/testing.
 *
 * Behavior:
 * - Uses Prisma to upsert a user with email = "demo@local".
 * - Ensures a consistent user with id = 1 exists for demo purposes.
 * - Safe to re-run: if user already exists, it won’t duplicate.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Ensure demo user exists (id = 1)
  await prisma.user.upsert({
    where: { email: "demo@local" },
    update: {}, // no-op if found
    create: {
      id: 1,
      email: "demo@local",
      name: "Demo User",
    },
  });

  console.log("✅ Seeded demo user with id=1");
}

// Run and disconnect cleanly
main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
