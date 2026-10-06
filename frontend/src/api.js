async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return body;
}

export const api = {
  apps: () => request("/apps"),
  randomReview: (appName) =>
    request(`/reviews/random?min_words=8${appName ? `&app_name=${encodeURIComponent(appName)}` : ""}`),
  analyze: (payload) => request("/analyze", { method: "POST", body: JSON.stringify(payload) }),
  results: () => request("/results"),
  stats: () => request("/stats"),
  research: () => request("/research"),
};
