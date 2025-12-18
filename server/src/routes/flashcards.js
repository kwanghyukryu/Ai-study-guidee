/**
 * File: src/routes/flashcards.js
 * Purpose: REST API for the Flashcards feature (decks & cards).
 *
 * Endpoints:
 *   GET    /api/flashcards/decks               → list decks for a user (sorted by updatedAt desc)
 *   POST   /api/flashcards/decks               → create a new deck
 *   GET    /api/flashcards/decks/:id           → get a single deck with its cards
 *   POST   /api/flashcards/decks/:id/cards     → add a new card to a deck
 *   PATCH  /api/flashcards/cards/:cardId       → update an existing card (front/back)
 *   DELETE /api/flashcards/cards/:cardId       → delete a card
 *
 * Notes:
 * - Uses Prisma models: User, Deck, Card (assumed schema with relations).
 * - Demo-friendly: if creating a deck for a userId that doesn't exist, we upsert a placeholder User.
 * - After creating/updating/deleting a card, the parent deck's updatedAt is bumped for sorting.
 */

import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

//////////////////////////////////////////////
// List all decks for a user (newest first) //
//////////////////////////////////////////////

// list decks for a user
router.get("/decks", async (req, res) => {
  // Default userId to 1 if not provided
  const userId = Number(req.query.userId || 1);

  // Fetch decks for the user, sorted by most recently updated
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
  });

  res.json({ decks });
});

//////////////////////
// Create a new deck //
//////////////////////

// create a deck
router.post("/decks", async (req, res) => {
  const { userId = 1, title } = req.body || {};

  // Minimal validation: title is required
  if (!title) return res.status(400).json({ error: "title required" });

  // Ensure the user exists (no-op if present). This keeps the demo usable pre-auth.
  await prisma.user.upsert({
    where: { id: Number(userId) },
    update: {},
    create: { id: Number(userId), email: `user${userId}@local`, name: `User ${userId}` },
  });

  // Create the deck, associating it with the user
  const deck = await prisma.deck.create({
    data: { userId: Number(userId), title: String(title) },
  });

  res.json({ deck });
});

/////////////////////////////////////////
// Fetch a single deck with its cards  //
/////////////////////////////////////////

// get a deck w/ cards
router.get("/decks/:id", async (req, res) => {
  const id = Number(req.params.id);

  // Load deck and include its cards (oldest first by createdAt)
  const deck = await prisma.deck.findUnique({
    where: { id },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });

  if (!deck) return res.status(404).json({ error: "deck not found" });
  res.json({ deck });
});

/////////////////////
// Add a card to it //
/////////////////////

// add a card
router.post("/decks/:id/cards", async (req, res) => {
  const deckId = Number(req.params.id);
  const { front, back } = req.body || {};

  // Validate required fields
  if (!front || !back) return res.status(400).json({ error: "front and back required" });

  // Create the card under the deck
  const card = await prisma.card.create({
    data: { deckId, front: String(front), back: String(back) },
  });

  // Bump deck's updatedAt so it floats to the top in lists
  await prisma.deck.update({ where: { id: deckId }, data: { updatedAt: new Date() } });

  res.json({ card });
});

//////////////////////////////////////////
// Update a card's front/back (partial) //
//////////////////////////////////////////

// update a card
router.patch("/cards/:cardId", async (req, res) => {
  const cardId = Number(req.params.cardId);
  const data = {};

  // Only update fields that are provided
  if (req.body.front !== undefined) data.front = String(req.body.front);
  if (req.body.back  !== undefined) data.back  = String(req.body.back);

  // Update the card
  const card = await prisma.card.update({ where: { id: cardId }, data });

  // Touch the parent deck's updatedAt to reflect activity
  await prisma.deck.update({ where: { id: card.deckId }, data: { updatedAt: new Date() } });

  res.json({ card });
});

//////////////////////
// Delete a card     //
//////////////////////

// delete a card
router.delete("/cards/:cardId", async (req, res) => {
  const cardId = Number(req.params.cardId);

  // Delete and capture the deleted row to find its deckId
  const card = await prisma.card.delete({ where: { id: cardId } });

  // Touch the parent deck's updatedAt after deletion
  await prisma.deck.update({ where: { id: card.deckId }, data: { updatedAt: new Date() } });

  res.json({ ok: true });
});

export default router;
