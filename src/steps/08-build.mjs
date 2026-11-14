// Step 08 — build the payload.
//   forecast mode: compute a fresh BTC 7-day direction forecast from live
//   CoinGecko closes (see src/forecast.js).
//   self-submit mode: load the repo@commit + transcript that prove this
//   agent built itself, for the sample-agent-skillmd bounty.
import { log } from "../http.js";
import { computeForecast } from "../forecast.js";
import { readFileSync } from "node:fs";

export const name = "08-build";
export async function run(ctx) {
  if (ctx.mode === "self-submit") {
    if (!ctx.repoUrl || !ctx.commit) throw new Error("self-submit needs --repo-url and --commit");
    let transcript = "";
    if (ctx.transcriptFile) {
      transcript = readFileSync(ctx.transcriptFile, "utf8");
      // Strip anything that looks like a secret before it ever leaves the box.
      transcript = transcript.replace(/0x[0-9a-fA-F]{64}/g, "[REDACTED-KEY]");
    }
    ctx.payload = { repoUrl: ctx.repoUrl, commit: ctx.commit, transcript, handle: ctx.handle };
    log(name, `self-submit payload ready: repo=${ctx.repoUrl} commit=${ctx.commit.slice(0, 12)} transcript=${transcript.length} chars (secrets stripped)`);
    return;
  }
  ctx.prediction = await computeForecast();
  ctx.payload = { prediction: ctx.prediction, handle: ctx.handle };
}
