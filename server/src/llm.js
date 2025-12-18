/**
 * File: src/llm.js
 * Purpose: Abstraction layer for generating study guides using OpenAI's Chat Completions API.
 *          Provides both:
 *            - generateStudyGuide: from a topic string
 *            - generateStudyGuideFromText: from extracted PDF text
 *          If no API key is configured or if a request fails, returns mock guides.
 *
 * Environment variables:
 *   OPENAI_API_KEY   → required for real calls (otherwise falls back to mocks)
 *   OPENAI_MODEL     → optional, defaults to "gpt-4o-mini"
 *   OPENAI_BASE_URL  → optional, defaults to "https://api.openai.com/v1"
 */

import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

//////////////////////////////////////////////////////
// 1) Generate guide from a typed topic             //
//////////////////////////////////////////////////////

export async function generateStudyGuide({ topic, level = "high school", questions = 8 }) {
  // If no API key: return fallback mock guide
  if (!API_KEY) return mockGuide(topic, level, questions);

  // Prompt instructions
  const system = `You generate study guides as structured JSON only. Return keys:
title, outline[], sections[{heading, summary, key_terms[], example}],
quiz[{question, options[], answer_index, explanation}]. Keep it concise and factual.`;

  const user = `Topic: ${topic}\nLevel: ${level}\nQuestions: ${questions}\n`;

  // Call OpenAI Chat Completions API
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    // On failure: swallow error and return mock guide
    await res.text();
    return mockGuide(topic, level, questions);
  }

  // Parse response JSON safely
  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    return mockGuide(topic, level, questions);
  }
}

//////////////////////////////////////////////////////
// 2) Generate guide from extracted PDF text        //
//////////////////////////////////////////////////////

export async function generateStudyGuideFromText({ title = "Study Guide", level = "high school", questions = 8, sourceText }) {
  if (!API_KEY) return mockFromText(title, level, questions, sourceText);

  const system = `You are a tutor. Create a study guide STRICTLY based on the provided source text.
Return JSON only with keys:
title, outline[], sections[{heading, summary, key_terms[], example}],
quiz[{question, options[], answer_index, explanation}].
Do NOT use outside knowledge. Keep to ~2 sections and 6-10 quiz questions.`;

  const user = `Title: ${title}\nLevel: ${level}\nQuestions: ${questions}\n\nSource text:\n"""${(sourceText||"").slice(0,12000)}"""`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) return mockFromText(title, level, questions, sourceText);

  const data = await res.json();
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    return mockFromText(title, level, questions, sourceText);
  }
}

//////////////////////////////////////////////////////
// 3) Mock fallback generators                      //
//////////////////////////////////////////////////////

// Simple mock for topic-based guides
function mockGuide(topic, level, questions) {
  const q = Math.max(3, Math.min(questions, 20));
  const quiz = Array.from({ length: q }).map((_, i) => ({
    q: `${topic}: sample question ${i + 1}?`,
    choices: ["A", "B", "C", "D"],
    answerIndex: i % 4,
    explanation: "This is a mock explanation.",
  }));

  return {
    title: `${topic} — Quick Study Guide (${level})`,
    outline: ["Overview", "Key Concepts", "Examples", "Practice"],
    sections: [
      {
        heading: "Overview",
        summary: `High-level summary of ${topic}.`,
        key_terms: ["Term 1", "Term 2"],
        example: "Short example.",
      },
      {
        heading: "Key Concepts",
        summary: "Most testable points.",
        key_terms: ["Concept A", "Concept B"],
        example: "Worked idea.",
      },
    ],
    quiz,
  };
}

// Mock for PDF-based guides (derives terms & questions from raw text)
function mockFromText(title, level, questions, text) {
  const sents = (text || "")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 30);

  const keyTerms = Array.from(
    new Set((text?.match(/\b[A-Z][a-zA-Z-]{3,}\b/g) || []).slice(0, 10))
  );

  const outline = sents.slice(0, 4).map((s, i) => `Point ${i + 1}: ${s.slice(0, 60)}…`);

  const sections = [
    {
      heading: "Overview",
      summary: sents.slice(0, 5).join(" "),
      key_terms: keyTerms.slice(0, 5),
      example: sents[5] || "",
    },
    {
      heading: "Key Concepts",
      summary: sents.slice(6, 12).join(" "),
      key_terms: keyTerms.slice(5, 10),
      example: sents[12] || "",
    },
  ];

  const qn = Math.max(3, Math.min(questions, 12));
  const quiz = Array.from({ length: qn }).map((_, i) => {
    const sent = sents[(i * 2) % (sents.length || 1)] || "This is a fact.";
    const stem = sent
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .slice(0, 6)
      .join(" ");
    const correct = (keyTerms[i % keyTerms.length] || "Correct").toString();
    const distractors = ["Option A", "Option B", "Option C"].map((d, j) =>
      j === 0 ? keyTerms[(i + 3) % keyTerms.length] || "Alt 1" : d
    );
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    const answer_index = options.indexOf(correct);
    return {
      question: `${stem} … ?`,
      options,
      answer_index,
      explanation: "Based on source text selection.",
    };
  });

  return { title: `${title} — From PDF (${level})`, outline, sections, quiz };
}
