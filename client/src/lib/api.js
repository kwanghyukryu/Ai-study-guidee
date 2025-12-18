const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function createGuide(payload) {
  const r = await fetch(`${API}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("Failed to generate guide"); return r.json();
}
export async function createGuideFromPdf(formData) {
  const r = await fetch(`${API}/api/generate-from-pdf`, { method: "POST", body: formData });
  if (!r.ok) { const t = await r.text().catch(()=> ""); throw new Error(t || "Failed to generate guide from PDF"); }
  return r.json();
}
export async function listGuides(userId = 1) {
  const r = await fetch(`${API}/api/guides?userId=${userId}`); if (!r.ok) throw new Error("Failed to list guides"); return r.json();
}
export async function getGuide(id) {
  const r = await fetch(`${API}/api/guides/${id}`); if (!r.ok) throw new Error("Failed to load guide"); return r.json();
}
export async function saveAttempt(payload) {
  const r = await fetch(`${API}/api/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("Failed to save attempt"); return r.json();
}
export async function getStats(userId = 1) {
  const r = await fetch(`${API}/api/stats?userId=${userId}`); if (!r.ok) throw new Error("Failed to fetch stats"); return r.json();
}
