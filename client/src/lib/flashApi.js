const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function listDecks(userId=1){
  const r = await fetch(`${BASE}/api/flashcards/decks?userId=${userId}`);
  if(!r.ok) throw new Error("Failed to list decks");
  return r.json();
}
export async function createDeck(title, userId=1){
  const r = await fetch(`${BASE}/api/flashcards/decks`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ title, userId })
  });
  if(!r.ok) throw new Error("Failed to create deck");
  return r.json();
}
export async function getDeck(id){
  const r = await fetch(`${BASE}/api/flashcards/decks/${id}`);
  if(!r.ok) throw new Error("Deck not found");
  return r.json();
}
export async function addCard(deckId, front, back){
  const r = await fetch(`${BASE}/api/flashcards/decks/${deckId}/cards`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ front, back })
  });
  if(!r.ok) throw new Error("Failed to add card");
  return r.json();
}
export async function updateCard(cardId, data){
  const r = await fetch(`${BASE}/api/flashcards/cards/${cardId}`, {
    method:"PATCH", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  if(!r.ok) throw new Error("Failed to update card");
  return r.json();
}
export async function deleteCard(cardId){
  const r = await fetch(`${BASE}/api/flashcards/cards/${cardId}`, { method:"DELETE" });
  if(!r.ok) throw new Error("Failed to delete card");
  return r.json();
}
