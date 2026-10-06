const STEPS = [
  { id: "analyze", label: "Analyze", hint: "sentiment, aspects, severity" },
  { id: "retrieve", label: "Retrieve", hint: "official guidance (RAG)" },
  { id: "draft", label: "Draft", hint: "grounded reply + routing" },
  { id: "check", label: "Check", hint: "independent judge model" },
  { id: "finalize", label: "Done", hint: "" },
];

export default function PipelineTrace({ trace, loading }) {
  const visited = new Set(trace ?? []);
  const redrafted = trace?.includes("redraft");
  const skipped = trace && !visited.has("retrieve");

  return (
    <ol className="trace">
      {STEPS.map((s) => {
        let state = "idle";
        if (loading) state = "running";
        else if (visited.has(s.id)) state = "done";
        else if (trace) state = "skipped";
        return (
          <li key={s.id} className={`step ${state}`}>
            <span className="dot" aria-hidden />
            <span className="step-label">
              {s.label}
              {s.id === "draft" && redrafted && <span className="badge warn">redrafted</span>}
            </span>
            <span className="step-hint">
              {state === "skipped" && skipped ? "not needed (no actionable complaint)" : s.hint}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
