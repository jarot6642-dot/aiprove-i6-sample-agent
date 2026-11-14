// http.js — one tiny fetch wrapper shared by every step: retries on
// transient failures, uniform step logging, JSON-or-text responses.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function log(step, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${step}] ${msg}`);
}

export async function call(step, method, url, { token = null, body = null, tries = 3 } = {}) {
  const headers = { "content-type": "application/json", "user-agent": "aiprove-i6-sample-agent/1.0 (node, zero-dep)" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  let lastErr = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
      log(step, `${method} ${url.replace(/^https?:\/\/[^/]+/, "")} -> HTTP ${res.status}`);
      return { status: res.status, ok: res.ok, data, text };
    } catch (e) {
      lastErr = e;
      log(step, `attempt ${attempt}/${tries} failed: ${e.message}; retrying in ${2 * attempt}s`);
      await sleep(2000 * attempt);
    }
  }
  throw lastErr;
}
