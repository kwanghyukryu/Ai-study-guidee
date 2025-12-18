import React, { useEffect, useState, useCallback } from "react";
import TopicGuideForm from "./components/TopicGuideForm.jsx";
import PdfGuideForm from "./components/PdfGuideForm.jsx";
import StudyGuideView from "./components/StudyGuideView.jsx";
import Quiz from "./components/Quiz.jsx";
import Stats from "./components/Stats.jsx";
import HistorySidebar from "./components/HistorySidebar.jsx";
import Planner from "./components/Planner.jsx";
import GradeCalculator from "./components/GradeCalculator.jsx";
import Flashcards from "./components/Flashcards.jsx";
import { listGuides, getGuide } from "./lib/api";

function TabButton({ value, active, onClick, children }) {
  const base = "inline-flex items-center rounded-full px-5 py-2.5 font-semibold border transition";
  const on  = "bg-slate-900 text-white border-slate-900";
  const off = "bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-300";
  return (
    <button type="button" role="tab" aria-selected={active===value}
      className={`${base} ${active===value ? on : off}`} onClick={()=>onClick(value)}>
      {children}
    </button>
  );
}

export default function App() {
  // keep default tab as-is; change if you want to land on dashboard: useState("dashboard")
  const [active, setActive] = useState("create"); // dashboard | create | preview | practice | planner | grades
  const [guide, setGuide] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const loadHistory = useCallback(async () => {
    try { const { guides } = await listGuides(1); setHistory(guides); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSelect(id) {
    try {
      const { guide } = await getGuide(id);
      setGuide(guide); setActiveId(id); setActive("preview");
    } catch (e) { console.error(e); }
  }

  async function handleGenerated(g) {
    setGuide(g); setActiveId(g.id ?? null); setActive("preview");
    await loadHistory();
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Tabs: Dashboard first (left-most) */}
      <header className="flex items-center gap-3" role="tablist" aria-label="Sections">
        <TabButton value="dashboard" active={active} onClick={setActive}>Dashboard</TabButton>
        <TabButton value="create"    active={active} onClick={setActive}>Create</TabButton>
        <TabButton value="preview"   active={active} onClick={setActive}>Preview</TabButton>
        <TabButton value="practice"  active={active} onClick={setActive}>Practice</TabButton>
        <TabButton value="flash"     active={active} onClick={setActive}>Flashcards</TabButton>
        <TabButton value="planner"   active={active} onClick={setActive}>Planner</TabButton>
        <TabButton value="grades"    active={active} onClick={setActive}>Grades</TabButton>
  

      </header>

      {/* Only the Dashboard layout includes the History sidebar */}
      {active === "dashboard" ? (
        <div className="md:grid md:grid-cols-[16rem,1fr] md:gap-6">
          <HistorySidebar
            items={history}
            activeId={activeId}
            onSelect={handleSelect}
            onRefresh={loadHistory}
          />
          <main className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Performance Dashboard</h2>
              <Stats />
            </div>
          </main>
        </div>
      ) : (
        <main className="space-y-6">
          {active === "create" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Generate from Topic</h2>
                <TopicGuideForm onGenerated={handleGenerated} />
              </div>
              <div className="card">
                <h2 className="text-lg font-semibold mb-3">Generate from PDF</h2>
                <PdfGuideForm onGenerated={handleGenerated} />
              </div>
            </div>
          )}

          {active === "preview" && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Preview</h2>
              <StudyGuideView guide={guide} />
              {!guide && (
                <p className="text-slate-500 text-sm mt-2">
                  No guide yet — go to <button className="underline" onClick={()=>setActive("create")}>Create</button>.
                </p>
              )}
            </div>
          )}

          {active === "practice" && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Practice Quiz</h2>
              <Quiz guide={guide} onCompleted={()=>setActive("dashboard")} />
              {!guide && (
                <p className="text-slate-500 text-sm mt-2">
                  No guide yet — generate one in <button className="underline" onClick={()=>setActive("create")}>Create</button>.
                </p>
              )}
            </div>
          )}

          {active === "planner" && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Planner</h2>
              <Planner />
            </div>
          )}

          {active === "grades" && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Percentage Grade Calculator</h2>
              <GradeCalculator />
            </div>
          )}

          {active === "flash" && (
            <Flashcards />
          )}

        </main>
      )}
    </div>
  );
}
