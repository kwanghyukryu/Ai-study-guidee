Study Assistant Web Application
Overview

This project is a full-stack study assistant web application designed to help students generate study guides, practice material, and manage academic planning in one place. It combines an interactive React frontend with a Node.js and Express backend, integrates AI-generated study content, and supports features such as quizzes, flashcards, grade calculation, and a study planner.

The application is modular, extensible, and built to function even without an active AI API key during development.

Features

Generate study guides from a topic or uploaded PDF

Preview and review generated study guides

Practice quizzes based on generated content

Track performance statistics and quiz attempts

Create and review flashcards

Plan study sessions and academic events

Calculate weighted and percentage grades

Persistent history of generated guides

Tech Stack
Frontend

React (Vite)

JSX component architecture

Tailwind CSS styling

Client-side state management with hooks

Backend

Node.js with Express

Prisma ORM

SQLite (development database)

RESTful API design

AI and File Processing

OpenAI Chat Completions API (optional, with mock fallback)

Multer for file uploads

pdf-parse for PDF text extraction

Project Structure
client/
├── App.jsx
├── main.jsx
├── index.js
├── components/
│   ├── EventForm.jsx
│   ├── Flashcards.jsx
│   ├── GradeCalculator.jsx
│   ├── Planner.jsx
│   ├── HistorySidebar.jsx
│   ├── PdfGuideForm.jsx
│   ├── Quiz.jsx
│   ├── Stats.jsx
│   ├── StudyGuideForm.jsx
│   ├── StudyGuideView.jsx
│   └── TopicGuideForm.jsx

server/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── llm.js
│   ├── pdf.js
│   └── routes/
│       ├── generate.js
│       ├── generateFromPdf.js
│       ├── guides.js
│       ├── attempts.js
│       ├── stats.js
│       ├── flashcards.js
│       └── events.js

Application Flow

The user generates a study guide from a topic or PDF.

The backend processes the request, optionally calling the OpenAI API.

Generated content is stored in the database as serialized JSON.

The frontend displays the guide and enables practice quizzes.

Quiz attempts are saved and aggregated into performance statistics.

Flashcards and planner events can be managed independently.

Setup and Installation
Prerequisites

Node.js (v18 or later recommended)

npm or yarn

Backend Setup
cd server
npm install


Create a .env file:

PORT=5001
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=your_key_here


Start the server:

npm run dev

Frontend Setup
cd client
npm install
npm run dev


The frontend runs by default at http://localhost:5173.

Environment Variables
Variable	Purpose
PORT	API server port
CLIENT_ORIGIN	Allowed CORS origin
DATABASE_URL	Prisma database connection
OPENAI_API_KEY	Enables real AI generation
OPENAI_MODEL	Optional model override

If OPENAI_API_KEY is not set, the application returns mock study guides so development can continue.

API Overview

POST /api/generate – Generate study guide from topic

POST /api/generate-from-pdf – Generate study guide from PDF

GET /api/guides – Retrieve guide history

GET /api/guides/:id – Retrieve a specific guide

POST /api/attempts – Save quiz results

GET /api/stats – Aggregate performance statistics

POST /api/flashcards – Manage flashcard decks and cards

POST /api/events – Manage planner events

Design Considerations

Content is stored as JSON strings to ensure SQLite compatibility

Mock AI responses allow full functionality without API keys

User authentication is intentionally minimal for development simplicity

Routes are modularized for scalability and clarity

Future Improvements

User authentication and authorization

PostgreSQL support with JSONB fields

Background job queue for long PDF processing

OCR support for scanned PDFs

Deployment-ready configuration
