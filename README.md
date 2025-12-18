# Study Assistant Web Application

## Overview

This project is a full-stack study assistant web application designed to help students generate, practice, and organize academic content in one centralized platform. The application supports study guide generation from topics or PDFs, quiz-based practice, flashcards, performance analytics, academic planning, and grade calculation.

The system uses a React frontend paired with a Node.js and Express backend. AI-powered content generation is supported, with a mock fallback so the application remains fully functional during development without an API key.

---

## System Architecture

The application follows a client–server architecture:

1. The React frontend provides an interactive interface for study creation, review, and planning.
2. The backend exposes RESTful API endpoints for guide generation, quizzes, statistics, flashcards, and planner events.
3. Study content is generated using an AI layer when configured.
4. Generated content is stored in a database and retrieved for preview and practice.
5. Quiz attempts and planner data are persisted and aggregated for dashboard insights.

---

## Features

- Generate study guides from a topic or uploaded PDF
- Preview and review generated study guides
- Practice quizzes generated from study content
- Track quiz attempts and performance statistics
- Create and manage flashcards
- Study planner with calendar-style events
- Percentage and weighted grade calculator
- Persistent history of generated guides

---

## Tech Stack

Frontend:
- React (Vite)
- JSX
- Tailwind CSS
- React Hooks

Backend:
- Node.js
- Express
- Prisma ORM
- SQLite (development)

AI and File Processing:
- OpenAI Chat Completions API (optional)
- Multer for file uploads
- pdf-parse for PDF text extraction

---

## Project Structure

client/
- App.jsx
- main.jsx
- index.js
- components/
  - EventForm.jsx
  - Flashcards.jsx
  - GradeCalculator.jsx
  - Planner.jsx
  - HistorySidebar.jsx
  - PdfGuideForm.jsx
  - Quiz.jsx
  - Stats.jsx
  - StudyGuideForm.jsx
  - StudyGuideView.jsx
  - TopicGuideForm.jsx

server/
- src/
  - index.js
  - db.js
  - llm.js
  - pdf.js
  - routes/
    - generate.js
    - generateFromPdf.js
    - guides.js
    - attempts.js
    - stats.js
    - flashcards.js
    - events.js

---

## Application Flow

1. The user generates a study guide from a topic or PDF.
2. The backend validates the request and generates content using the AI layer or a mock generator.
3. Study guide content is stored as serialized JSON in the database.
4. The frontend displays the guide for preview and practice.
5. Quiz results are saved and aggregated into performance statistics.
6. Flashcards and planner events are managed independently.

---

## Setup and Installation

Prerequisites:
- Node.js (v18 or later recommended)
- npm

Backend setup:
- Navigate to the server directory
- Install dependencies
- Configure environment variables
- Start the development server

Environment variables:
- PORT=5001
- CLIENT_ORIGIN=http://localhost:5173
- DATABASE_URL=file:./dev.db
- OPENAI_API_KEY=your_key_here

Frontend setup:
- Navigate to the client directory
- Install dependencies
- Start the development server

The frontend runs at http://localhost:5173 by default.

---

## API Overview

- POST /api/generate – Generate study guide from topic
- POST /api/generate-from-pdf – Generate study guide from PDF
- GET /api/guides – Retrieve guide history
- GET /api/guides/:id – Retrieve a specific guide
- POST /api/attempts – Save quiz results
- GET /api/stats – Retrieve aggregated performance statistics
- GET /api/flashcards – Manage flashcard decks and cards
- GET /api/events – Manage planner events

---

## Design Considerations

- Study guide content is stored as JSON strings for SQLite compatibility
- Mock AI responses ensure full functionality without external dependencies
- Backend routes are modular for scalability and maintainability
- Authentication is intentionally minimal for development simplicity

---

## Future Improvements

- User authentication and authorization
- PostgreSQL support with JSONB fields
- OCR support for scanned PDFs
- Background job processing for large uploads
- Production-ready deployment configuration

---

