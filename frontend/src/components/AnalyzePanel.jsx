import { useEffect, useState } from "react";
import { api } from "../api.js";
import PipelineTrace from "./PipelineTrace.jsx";
import ResultView from "./ResultView.jsx";

export default function AnalyzePanel() {
  const [apps, setApps] = useState([]);
  const [appName, setAppName] = useState("");
  const [text, setText] = useState("");
  const [review, setReview] = useState(null); // set when text came from a scraped review
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.apps().then((a) => {
      setApps(a);
      setAppName(a[0]?.name ?? "");
    }).catch((e) => setError(`Cannot reach the API: ${e.message}`));
  }, []);

  async function loadRandom() {
    setError("");
    try {
      const r = await api.randomReview(appName);
      setReview(r);
      setText(r.text);
      setResult(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.analyze({ text, app_name: appName, review_id: review?.review_id ?? null }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Citizen feedback</h2>
        <label className="field">
          <span>Service / app</span>
          <select value={appName} onChange={(e) => { setAppName(e.target.value); setReview(null); }}>
            {apps.map((a) => (
              <option key={a.app_id} value={a.name}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Review text (English, Hindi or Hinglish)</span>
          <textarea
            rows={6}
            value={text}
            placeholder="e.g. epfo passbook not showing for 3 months, server error every time"
            onChange={(e) => { setText(e.target.value); setReview(null); }}
          />
        </label>
        {review && (
          <p className="muted small">
            Real Play Store review · {review.rating}★ · {review.review_date?.slice(0, 10)} · its own
            official reply is excluded from retrieval
          </p>
        )}
        <div className="actions">
          <button className="secondary" onClick={loadRandom} disabled={loading}>
            Load a real review
          </button>
          <button onClick={run} disabled={loading || text.trim().length < 3 || !appName}>
            {loading ? "Running agent…" : "Run agent"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Agent pipeline</h2>
        <PipelineTrace trace={result?.trace} loading={loading} />
        {result && (
          <p className="muted small">
            {(result.latency_ms / 1000).toFixed(1)} s · analyzer {result.models.analyzer} · responder{" "}
            {result.models.responder} · checker {result.models.checker}
          </p>
        )}
      </section>

      {result && <ResultView result={result} />}
    </div>
  );
}
