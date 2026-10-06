const label = (s) => s.replaceAll("_", " ");

export function SentimentBadge({ value }) {
  return <span className={`badge ${value}`}>{value}</span>;
}

export default function ResultView({ result }) {
  const { analysis, response, check, sources, needs_human_review } = result;

  return (
    <>
      <section className="card">
        <h2>Analysis</h2>
        <dl className="kv">
          <dt>Overall sentiment</dt>
          <dd><SentimentBadge value={analysis.overall_sentiment} /></dd>
          <dt>Severity</dt>
          <dd>
            <span className="severity" aria-label={`severity ${analysis.severity} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= analysis.severity ? "pip on" : "pip"} />
              ))}
            </span>{" "}
            {analysis.severity}/5
          </dd>
          <dt>Language</dt>
          <dd>{label(analysis.language)}</dd>
          <dt>Relevant · actionable</dt>
          <dd>{analysis.relevant ? "yes" : "no"} · {analysis.actionable ? "yes" : "no"}</dd>
          <dt>Search query</dt>
          <dd className="mono">{analysis.search_query || "—"}</dd>
        </dl>
        <h3>Aspects</h3>
        {analysis.aspects.length === 0 ? (
          <p className="muted">No specific service aspect mentioned.</p>
        ) : (
          <div className="chips">
            {analysis.aspects.map((a, i) => (
              <span key={i} className={`chip ${a.sentiment}`}>{label(a.aspect)}</span>
            ))}
          </div>
        )}
      </section>

      {response && (
        <section className="card">
          <div className="card-head">
            <h2>Drafted reply</h2>
            {needs_human_review ? (
              <span className="badge negative">needs human review</span>
            ) : (
              <span className="badge positive">passed check</span>
            )}
          </div>
          <p className="muted small">Route to: <strong>{response.route_to}</strong></p>
          <blockquote className="reply">{response.reply}</blockquote>
          <p className="small">
            <strong>Checker:</strong> {check.reason}
          </p>
          <p className="muted small">
            Cited guidance: {response.cited_sources.length ? response.cited_sources.map((n) => `[${n}]`).join(" ") : "none"}
          </p>
        </section>
      )}

      {response && (
        <section className="card wide">
          <h2>Retrieved official guidance</h2>
          {sources.length === 0 ? (
            <p className="muted">
              No official guidance for this app matched. The agent was told not to give contact details.
            </p>
          ) : (
            <ol className="sources">
              {sources.map((s) => (
                <li key={s.n} className={response.cited_sources.includes(s.n) ? "cited" : ""}>
                  <div className="source-meta">
                    [{s.n}] {label(s.source)} · similarity {s.score.toFixed(2)}
                    {response.cited_sources.includes(s.n) && <span className="badge positive">cited</span>}
                  </div>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </>
  );
}
