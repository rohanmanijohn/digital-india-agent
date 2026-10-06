import { useState } from "react";
import AnalyzePanel from "./components/AnalyzePanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import ResearchPanel from "./components/ResearchPanel.jsx";

const TABS = [
  { id: "analyze", label: "Analyze feedback" },
  { id: "results", label: "Batch results" },
  { id: "research", label: "Research results" },
];

export default function App() {
  // the URL hash (#analyze, #results, #research) selects the tab, so a tab can be linked or bookmarked
  const [tab, setTabState] = useState(() => {
    const fromHash = window.location.hash.slice(1);
    return TABS.some((t) => t.id === fromHash) ? fromHash : "analyze";
  });
  const setTab = (id) => {
    setTabState(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Citizen Feedback Agent</h1>
          <p className="subtitle">
            Aspect-based analysis and grounded replies for India&rsquo;s digital public services
          </p>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === "analyze" && <AnalyzePanel />}
        {tab === "results" && <ResultsPanel />}
        {tab === "research" && <ResearchPanel />}
      </main>
      <footer className="footer">
        Google ADK workflow · Groq open-weight models · RAG over official government replies
      </footer>
    </div>
  );
}
