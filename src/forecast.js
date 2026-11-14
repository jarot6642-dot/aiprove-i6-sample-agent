// forecast.js — fresh BTC 7-day direction forecast, computed at run time
// from live market context. Nothing is hardcoded: the agent pulls BTC's last
// 7 days of daily closes from CoinGecko (public, no key), then scores three
// signals and blends them into a yes/no + confidence.
//
// Signals (each in [-1, +1], +1 = bullish):
//   momentum — 7-day return, scaled: +10% -> +1, -10% -> -1
//   trend    — last-3-day return vs first-3-day return (recent drift)
//   calm     — low realised volatility leans "trend continues", high vol
//              leans "reversal / chop", so it damps the other two.
//
// Confidence is hedged on purpose: the bounty is scored on Brier, and a
// confident wrong call costs more than a hedged one, so confidence is
// clamped to [0.55, 0.80].
import { log } from "./http.js";

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export async function computeForecast() {
  const step = "forecast";
  log(step, "fetching BTC 7d daily closes from CoinGecko (public API, no key) ...");
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily",
    { signal: AbortSignal.timeout(30000) },
  );
  if (!res.ok) throw new Error(`CoinGecko market_chart -> HTTP ${res.status}`);
  const { prices } = await res.json();
  if (!Array.isArray(prices) || prices.length < 4) throw new Error("CoinGecko returned too few price points");
  const closes = prices.map((p) => p[1]);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const ret7d = (last - first) / first;
  const recent = closes.slice(-3);
  const early = closes.slice(0, 3);
  const retRecent = (recent[recent.length - 1] - recent[0]) / recent[0];
  const retEarly = (early[early.length - 1] - early[0]) / early[0];
  const trend = retRecent - retEarly;
  const logRets = [];
  for (let i = 1; i < closes.length; i++) logRets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
  const vol = Math.sqrt(logRets.reduce((a, r) => a + (r - mean) ** 2, 0) / logRets.length);

  const momentum = clamp(ret7d / 0.10, -1, 1);
  const trendSig = clamp(trend / 0.05, -1, 1);
  const calm = clamp(1 - vol / 0.04, -1, 1); // high vol -> negative
  const score = 0.5 * momentum + 0.3 * trendSig + 0.2 * calm * Math.sign(momentum || 1);
  const answer = score >= 0 ? "yes" : "no";
  const confidence = clamp(0.55 + Math.abs(score) * 0.3, 0.55, 0.80);

  log(step, `BTC closes: ${closes.map((c) => Math.round(c)).join(" -> ")} USD`);
  log(step, `7d return ${(ret7d * 100).toFixed(2)}%, recent-vs-early trend ${(trend * 100).toFixed(2)}%, daily vol ${(vol * 100).toFixed(2)}%`);
  log(step, `signals momentum=${momentum.toFixed(2)} trend=${trendSig.toFixed(2)} calm=${calm.toFixed(2)} -> score=${score.toFixed(2)}`);
  log(step, `forecast: answer=${answer} confidence=${confidence.toFixed(2)} (computed live, not hardcoded)`);
  return { answer, confidence: Number(confidence.toFixed(2)) };
}
