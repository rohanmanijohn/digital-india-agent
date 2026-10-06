import { useEffect, useState } from "react";
import { api } from "../api.js";

const RQS = [
  {
    id: "RQ1",
    title: "Agent vs VADER and XLM-R on sentiment",
    tables: [["rq1_gold_metrics", "rq1_proxy_stars_metrics"], ["rq1_gold_by_language", "rq1_proxy_stars_by_language"]],
    figures: ["rq1_gold_agent_confusion.png", "rq1_proxy_stars_agent_confusion.png"],
  },
  {
    id: "RQ2",
    title: "Which service aspects drive negative feedback",
    tables: [["rq2_aspect_by_sentiment"], ["rq2_logit_odds_ratios"]],
    figures: ["rq2_negative_share_by_aspect.png"],
  },
  {
    id: "RQ3",
    title: "Satisfaction across service categories",
    tables: [["rq3_rating_by_category"]],
    figures: ["rq3_rating_by_category.png"],
  },
  {
    id: "RQ4",
    title: "Does RAG make replies more grounded",
    tables: [["rq4_paired_tests"]],
    figures: ["rq4_groundedness_difference.png"],
  },
];

// "## RQ1 - ..." sections of the auto-generated results_summary.md
function splitSummary(md) {
  const out = {};
  md.split(/\n(?=## )/).forEach((block) => {
    const m = block.match(/^## (RQ\d)/);
    if (m) out[m[1]] = block.replace(/^## .*\n/, "").trim();
  });
  return out;
}

const fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(3)) : v ?? "—");

function DataTable({ rows }) {
  const cols = Object.keys(rows[0]);
  return (
    <div className="table-wrap">
      <table className="compact-wide">
        <thead><tr>{cols.map((c) => <th key={c}>{c.replaceAll("_", " ")}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} className={typeof r[c] === "number" ? "num" : ""}>{fmt(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Progress({ label, done, total }) {
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="stat">
      <div className="stat-value">{done.toLocaleString()} <span className="muted small">/ {total.toLocaleString()}</span></div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function ResearchPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.research().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { progress, tables, figures, summary } = data;
  const sections = splitSummary(summary);
  const ss = tables.sample_size;

  return (
    <>
      <div className="stats">
        <Progress label="reviews analysed by the agent" done={progress.analyzed} total={progress.sample_size} />
        <Progress label="gold labels checked by researcher (AI-labelled, disclosed)" done={progress.gold_labelled} total={progress.gold_size} />
        <Progress label="RAG vs no-RAG pairs (RQ4)" done={progress.rq4_pairs} total={progress.rq4_target} />
      </div>

      {ss && (
        <section className="card wide">
          <h2>Sample size (α = .05, power = .80)</h2>
          <DataTable rows={ss} />
          <p className="muted small">Final minimum sample size = largest across RQs = {Math.max(...ss.map((r) => r["Minimum N"])).toLocaleString()}.</p>
        </section>
      )}

      {RQS.map((rq) => {
        const tbls = rq.tables.map((alts) => alts.find((t) => tables[t])).filter(Boolean);
        const fig = rq.figures.find((f) => figures.includes(f));
        const isProxy = tbls.some((t) => t.includes("proxy"));
        const text = sections[rq.id];
        const pending = !tbls.length && !fig;
        return (
          <section key={rq.id} className="card wide">
            <div className="card-head">
              <h2><span className="rq-tag">{rq.id}</span> {rq.title}</h2>
              {pending ? <span className="badge neutral">pending</span>
                : isProxy ? <span className="badge warn">preliminary (star-rating proxy)</span>
                : <span className="badge positive">results</span>}
            </div>
            {pending && <p className="muted">{text || "No results yet."}</p>}
            {!pending && (
              <div className="rq-grid">
                <div className="rq-tables">
                  {tbls.map((t) => (
                    <div key={t}>
                      <h3>{t.replaceAll("_", " ")}</h3>
                      <DataTable rows={tables[t]} />
                    </div>
                  ))}
                </div>
                {fig && <img className="figure" src={`/api/figures/${fig}`} alt={`${rq.id} figure`} />}
              </div>
            )}
            {text && !pending && (
              <details>
                <summary>Test statistics</summary>
                <pre className="test-output">{text}</pre>
              </details>
            )}
          </section>
        );
      })}
    </>
  );
}
