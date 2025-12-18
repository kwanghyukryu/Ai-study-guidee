const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function listEvents({ from, to, userId = 1 }) {
  const url = new URL(`${API}/api/events`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to load events");
  return r.json();
}

export async function createEvent(data) {
  const r = await fetch(`${API}/api/events`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error("Failed to create event");
  return r.json();
}

export async function updateEvent(id, data) {
  const r = await fetch(`${API}/api/events/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error("Failed to update event");
  return r.json();
}

export async function deleteEvent(id) {
  const r = await fetch(`${API}/api/events/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete event");
  return r.json();
}
