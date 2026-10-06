import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { SentimentBadge } from "./ResultView.jsx";

const label = (s) => s.replaceAll("_", " ");

export default function ResultsPanel() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [appFilter, setAppFilter] = useState("");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.results(), api.stats()])
      .then(([r, s]) => { setRows(r); setStats(s); })
      .catch((e) => setError(e.message));
  }, []);

  const apps = useMemo(() => [...new Set(rows.map((r) => r.app_name))].sort(), [rows]);
  const shown = appFilter ? rows.filter((r) => r.app_name === appFilter) : rows;

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;
  if (stats.processed === 0) {
    return <p className="muted">No batch results yet. Run <code>python run_agent.py --n 40 --min-words 8</code>.</p>;
  }

  return (
    <>
      <div className="stats">
        <Stat value={stats.processed} label="reviews processed" />
        <Stat value={stats.responded} label="replies drafted" />
        <Stat value={stats.check_pass_rate == null ? "—" : `${Math.round(stats.check_pass_rate * 100)}%`} label="passed independent check" />
        <Stat value={stats.human_review} label="flagged for human review" />
      </div>

      <section className="card wide">
        <div className="card-head">
          <h2>Processed reviews</h2>
          <select value={appFilter} onChange={(e) => setAppFilter(e.target.value)} aria-label="Filter by app">
            <option value="">All apps</option>
            {apps.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>App</th><th>Rating</th><th>Sentiment</th><th>Severity</th><th>Negative aspects</th><th>Reply</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <Fragment key={r.review_id}>
                  <tr className="clickable" onClick={() => setOpen(open === r.review_id ? null : r.review_id)}>
                    <td>{r.app_name}</td>
                    <td>{r.rating}★</td>
                    <td><SentimentBadge value={r.analysis.overall_sentiment} /></td>
                    <td>{r.analysis.severity}/5</td>
                    <td>{r.analysis.aspects.filter((a) => a.sentiment === "negative").map((a) => label(a.aspect)).join(", ") || "—"}</td>
                    <td>
                      {!r.response ? <span className="muted">not needed</span>
                        : r.needs_human_review ? <span className="badge negative">human review</span>
                        : <span className="badge positive">passed</span>}
                    </td>
                  </tr>
                  {open === r.review_id && (
                    <tr className="detail">
                      <td colSpan={6}>
                        <p><strong>Review:</strong> {r.text}</p>
                        {r.response && (
                          <>
                            <p><strong>Reply</strong> (to {r.response.route_to}): {r.response.reply}</p>
                            <p className="muted small">Checker: {r.check.reason}</p>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card wide">
        <h2>Most-mentioned negative aspects</h2>
        <table className="compact">
          <tbody>
            {Object.entries(stats.negative_aspects).map(([k, v]) => (
              <tr key={k}><td>{label(k)}</td><td className="num">{v}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
