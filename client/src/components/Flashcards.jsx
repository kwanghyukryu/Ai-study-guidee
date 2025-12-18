/**
 * File: Flashcards.jsx
 * Purpose: End-to-end Flashcards feature for your app.
 *          - Left pane: list of decks and quick "create deck" form
 *          - Right pane: tabs to Build (add/remove cards) or Study (flip, prev/next, shuffle)
 *
 * Data flow:
 *  - Reads/writes via ../lib/flashApi (listDecks, createDeck, getDeck, addCard, deleteCard).
 *  - Keeps a lightweight client state of decks, selected deck id, and the currently loaded deck.
 *
 * UX notes:
 *  - Selecting a deck loads it (cards included) into the right pane.
 *  - "Build" lets you add new cards (Front/Back) and delete existing ones.
 *  - "Study" shows one card at a time with Front/Back toggle, Prev/Next, and Randomize.
 *
 * Styling:
 *  - Uses Tailwind utility classes and your shared "card" / "btn" / "input" / "label" styles.
 */

import React, { useEffect, useMemo, useState } from "react";
import { listDecks, createDeck, getDeck, addCard, deleteCard } from "../lib/flashApi";

/////////////////////////////
// DeckList (left sidebar) //
/////////////////////////////

/**
 * DeckList
 * Renders the list of available decks and a small input to create a new deck.
 *
 * Props:
 * - decks: Array<{ id, title, createdAt, updatedAt? }>
 * - activeId: number | null - currently selected deck id
 * - onSelect: (deckId: number) => void - called when user clicks a deck
 * - onCreate: (title: string) => Promise<void> - called to create a new deck
 */
function DeckList({ decks, activeId, onSelect, onCreate }) {
  const [title, setTitle] = useState("");

  return (
    <aside className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Decks</h2>
      </div>

      {/* Scrollable list of decks */}
      <div className="space-y-2 overflow-auto max-h-[60vh] pr-1">
        {decks.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            // Highlight the active deck; otherwise, show subtle hover
            className={`w-full text-left rounded-lg border px-3 py-2 ${
              activeId === d.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            <div className="font-semibold">{d.title}</div>
            <div className="text-xs opacity-70">
              {new Date(d.updatedAt || d.createdAt).toLocaleString()}
            </div>
          </button>
        ))}

        {/* Empty state */}
        {decks.length === 0 && (
          <div className="text-sm text-slate-500">No decks yet.</div>
        )}
      </div>

      {/* Quick-create a new deck */}
      <div className="space-y-2">
        <input
          className="input"
          placeholder="New deck title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button
          className="btn w-full"
          onClick={() => {
            if (title.trim()) {
              onCreate(title.trim());
              setTitle("");
            }
          }}
        >
          + Create Deck
        </button>
      </div>
    </aside>
  );
}

/////////////////////////////////////////
// CardBuilder (build tab on the right) //
/////////////////////////////////////////

/**
 * CardBuilder
 * Form to add new cards to the active deck, and list/delete existing cards.
 *
 * Props:
 * - deck: { id, title, cards?: Array<{ id, front, back }> }
 * - onAdded:  () => Promise<void> - called after a card is added (parent reloads deck)
 * - onDeleted:() => Promise<void> - called after a card is deleted (parent reloads deck)
 */
function CardBuilder({ deck, onAdded, onDeleted }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  // Add a new card using API, then clear inputs and notify parent to refresh
  async function add() {
    if (!front.trim() || !back.trim()) return;
    await addCard(deck.id, front.trim(), back.trim());
    setFront("");
    setBack("");
    await onAdded();
  }

  return (
    <div className="space-y-3">
      {/* Two-column Front/Back inputs on md+ screens; stacked on small screens */}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Front</label>
          <textarea
            className="input"
            rows={4}
            value={front}
            onChange={e => setFront(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Back</label>
          <textarea
            className="input"
            rows={4}
            value={back}
            onChange={e => setBack(e.target.value)}
          />
        </div>
      </div>

      <button className="btn" onClick={add}>Add Card</button>

      {/* Existing cards list */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2">Cards in this deck</h3>
        <div className="space-y-2">
          {deck.cards?.map(c => (
            <div key={c.id} className="rounded-lg border bg-white p-3">
              <div className="text-xs font-semibold mb-1">Front</div>
              <div className="text-sm">{c.front}</div>

              <div className="text-xs font-semibold mt-2 mb-1">Back</div>
              <div className="text-sm">{c.back}</div>

              <div className="mt-2">
                <button
                  className="btn"
                  onClick={async () => {
                    await deleteCard(c.id);
                    await onDeleted();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {/* Empty state for a deck with no cards */}
          {(!deck.cards || deck.cards.length === 0) && (
            <div className="text-sm text-slate-500">No cards yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/////////////////////////////
// Study (study tab, right) //
/////////////////////////////

/**
 * Study
 * Minimal flashcard study UI with:
 *  - Prev/Next navigation
 *  - Show Front/Back toggle
 *  - Randomize order (Fisher–Yates shuffle)
 *
 * Props:
 * - cards: Array<{ id, front, back }>
 */
function Study({ cards }) {
  // `order` holds an array of indices into `cards`, e.g. [2,0,1]
  const [order, setOrder] = useState([]);
  // `idx` is our pointer into `order`
  const [idx, setIdx] = useState(0);
  // Whether to show the back side (true) or front side (false)
  const [showBack, setShowBack] = useState(false);

  // Reset state whenever the input `cards` change
  useEffect(() => {
    setOrder(cards.map((_, i) => i));
    setIdx(0);
    setShowBack(false);
  }, [cards]);

  // Current card, derived via the shuffled `order`
  const current = useMemo(
    () => (order.length ? cards[order[idx]] : null),
    [order, idx, cards]
  );

  // Shuffle to a new random order (Fisher–Yates)
  function shuffle() {
    const arr = cards.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
    setIdx(0);
    setShowBack(false);
  }

  // Advance/rewind one card (wrap-around)
  function next() {
    if (order.length) {
      setIdx((idx + 1) % order.length);
      setShowBack(false);
    }
  }
  function prev() {
    if (order.length) {
      setIdx((idx - 1 + order.length) % order.length);
      setShowBack(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Controls: prev/back-toggle/next/shuffle */}
      <div className="flex items-center gap-2">
        <button className="btn" onClick={prev}>Prev</button>
        <button className="btn" onClick={() => setShowBack(s => !s)}>
          {showBack ? "Show Front" : "Show Back"}
        </button>
        <button className="btn" onClick={next}>Next</button>
        <button className="btn" onClick={shuffle}>Randomize</button>
      </div>

      {/* Card display */}
      <div className="rounded-2xl border bg-white p-6 min-h-[160px]">
        {!current ? (
          <div className="text-slate-500">No cards to study.</div>
        ) : (
          <>
            <div className="text-xs font-semibold mb-2">
              {showBack ? "Back" : "Front"}
            </div>
            {/* whitespace-pre-wrap preserves line breaks the user types */}
            <div className="text-lg leading-relaxed whitespace-pre-wrap">
              {showBack ? current.back : current.front}
            </div>
          </>
        )}
      </div>

      {/* Progress indicator */}
      <div className="text-xs text-slate-500">
        {order.length ? `Card ${idx + 1} of ${order.length}` : ""}
      </div>
    </div>
  );
}

/////////////////////////
// Flashcards (export) //
/////////////////////////

/**
 * Flashcards (default export)
 * Orchestrates the feature:
 *  - Loads deck list on mount
 *  - Loads active deck when selection changes
 *  - Toggles between Build and Study tabs
 */
export default function Flashcards() {
  const [decks, setDecks] = useState([]);        // left pane list
  const [activeId, setActiveId] = useState(null); // selected deck id
  const [deck, setDeck] = useState(null);        // full deck + cards, right pane
  const [tab, setTab] = useState("build");       // "build" | "study"
  const userId = 1;                              // demo user; replace with auth later

  ///////////////////////////////
  // Loading & refreshing data //
  ///////////////////////////////

  // Fetch the list of decks; keep activeId consistent if a deck disappears
  async function refreshDecks() {
    const { decks } = await listDecks(userId);
    setDecks(decks);
    if (activeId && !decks.find(d => d.id === activeId)) setActiveId(null);
  }

  // Fetch a specific deck (with cards) to show in right pane
  async function loadDeck(id) {
    const { deck } = await getDeck(id);
    setDeck(deck);
  }

  // Initial fetch of deck list
  useEffect(() => { refreshDecks().catch(console.error); }, []);

  // Whenever selection changes, load the chosen deck (or clear if none)
  useEffect(() => {
    if (activeId) loadDeck(activeId).catch(console.error);
    else setDeck(null);
  }, [activeId]);

  // Create a new deck, refresh the list, and focus it
  async function createNew(title) {
    const { deck } = await createDeck(title, userId);
    await refreshDecks();
    setActiveId(deck.id);
  }

  ///////////////////
  // Render layout //
  ///////////////////

  return (
    <div className="md:grid md:grid-cols-[16rem,1fr] md:gap-6">
      {/* Left pane: decks list and "create deck" */}
      <div className="card h-fit">
        <DeckList
          decks={decks}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={createNew}
        />
      </div>

      {/* Right pane: deck header + tab bar + content */}
      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {deck ? deck.title : "Select or create a deck"}
            </h2>

            {/* Simple tab toggle, visually dims the inactive tab */}
            {deck && (
              <div className="inline-flex gap-2">
                <button
                  className={`btn ${tab === "build" ? "" : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 !text-slate-600"}`}
                  onClick={() => setTab("build")}
                >
                  Build
                </button>
                <button
                  className={`btn ${tab === "study" ? "" : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 !text-slate-600"}`}
                  onClick={() => setTab("study")}
                >
                  Study
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Build tab: add/delete cards */}
        {deck && tab === "build" && (
          <div className="card">
            <CardBuilder
              deck={deck}
              onAdded={() => loadDeck(deck.id)}
              onDeleted={() => loadDeck(deck.id)}
            />
          </div>
        )}

        {/* Study tab: flip/prev/next/shuffle */}
        {deck && tab === "study" && (
          <div className="card">
            <Study cards={deck.cards || []} />
          </div>
        )}

        {/* Right-pane empty state */}
        {!deck && (
          <div className="card">
            <p className="text-slate-500 text-sm">
              Create a deck on the left, then start adding cards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
