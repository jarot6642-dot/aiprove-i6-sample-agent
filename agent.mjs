// agent.mjs — BrightAgent's sample agent for the AIProve Arena.
// Zero dependencies, Node >= 18 (global fetch only). Architecture: a small
// step-runner. Each step lives in src/steps/NN-name.mjs, exports { name, run },
// and runs in order against one shared context object. Adding a bounty means
// adding a step, not rewriting the loop.
//
// What it does, end to end (from https://aiprove.fun/skill.md):
//   01 fetch skill.md            02 health check
//   03 challenge -> 04 EIP-191 personal_sign (hand-rolled keccak-256 +
//      secp256k1 in src/, no ethers, no npm) -> 05 verify -> session token
//   06 read target bounty        07 enter (free)     08 build payload
//   09 submit                    10 verify in /api/me/submissions
//
// The private key is NEVER in this repo. It is read from a file path passed
// as --key-file (or the AGENT_PRIVATE_KEY env var) and never printed.
//
// Usage:
//   node agent.mjs --key-file /path/to/key.txt [--bounty forecast-btc-7d]
//   node agent.mjs --key-file /path/to/key.txt --self-submit \
//       --repo-url https://github.com/jarot6642-dot/aiprove-i6-sample-agent \
//       --commit <sha> --transcript-file /path/to/transcript.log
import { readFileSync } from "node:fs";
import { log } from "./src/http.js";
import { addressFromKey, unhex } from "./src/secp256k1.js";

const ADDRESS = "0x39DecE9D582bDca82559f0be39c6C58B82C223f5";
const HANDLE = "BrightAgent";
const DEFAULT_BOUNTY = "forecast-btc-7d";
const SELF_SUBMIT_BOUNTY = "sample-agent-skillmd";

function usage() {
  console.log(`BrightAgent sample agent — AIProve Arena (node, zero dependencies)

Usage:
  node agent.mjs --key-file <path> [--bounty <slug>] [--api <base-url>]
  node agent.mjs --key-file <path> --self-submit --repo-url <url> --commit <sha>
                 [--transcript-file <path>] [--api <base-url>]

Defaults: --bounty ${DEFAULT_BOUNTY}  --api https://aiprove.fun
The key file must contain the raw hex private key (with or without 0x),
and must live OUTSIDE this repo. It is never printed or committed.
Exit code 0 = clean loop, submission verified in /api/me/submissions.`);
}

function parseArgs(argv) {
  const opts = { bounty: DEFAULT_BOUNTY, api: process.env.API_BASE_URL || "https://aiprove.fun" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--key-file") opts.keyFile = argv[++i];
    else if (a === "--bounty") opts.bounty = argv[++i];
    else if (a === "--api") opts.api = argv[++i];
    else if (a === "--self-submit") opts.mode = "self-submit";
    else if (a === "--repo-url") opts.repoUrl = argv[++i];
    else if (a === "--commit") opts.commit = argv[++i];
    else if (a === "--transcript-file") opts.transcriptFile = argv[++i];
    else if (a === "--help" || a === "-h") { usage(); process.exit(0); }
    else if (!a.startsWith("--") && !opts.bountyPos) { opts.bounty = a; opts.bountyPos = true; }
    else { console.error(`unknown argument: ${a}`); usage(); process.exit(2); }
  }
  return opts;
}

function loadKey(opts) {
  let raw = "";
  if (opts.keyFile) raw = readFileSync(opts.keyFile, "utf8").trim();
  else if (process.env.AGENT_PRIVATE_KEY) raw = process.env.AGENT_PRIVATE_KEY.trim();
  else { console.error("error: pass --key-file <path> or set AGENT_PRIVATE_KEY"); process.exit(2); }
  raw = raw.replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    console.error("error: key file must contain exactly one 64-hex-char private key");
    process.exit(2);
  }
  const keyBytes = unhex(raw);
  const addr = addressFromKey(keyBytes);
  if (addr.toLowerCase() !== ADDRESS.toLowerCase()) {
    console.error(`error: key file is for ${addr}, but this agent only runs as ${ADDRESS}`);
    process.exit(2);
  }
  return keyBytes;
}

const STEP_FILES = [
  "01-skill.mjs", "02-health.mjs", "03-challenge.mjs", "04-sign.mjs",
  "05-verify.mjs", "06-bounty.mjs", "07-enter.mjs", "08-build.mjs",
  "09-submit.mjs", "10-status.mjs",
];

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const mode = opts.mode || "forecast";
  if (mode === "self-submit") opts.bounty = SELF_SUBMIT_BOUNTY;
  const keyBytes = loadKey(opts);
  const ctx = {
    api: opts.api.replace(/\/$/, ""),
    address: ADDRESS,
    handle: HANDLE,
    bounty: opts.bounty,
    mode,
    repoUrl: opts.repoUrl,
    commit: opts.commit,
    transcriptFile: opts.transcriptFile,
    keyBytes,
    token: null,
  };
  log("agent", `BrightAgent (${ADDRESS}) — mode=${mode}, bounty=${ctx.bounty}, api=${ctx.api}`);
  log("agent", `key loaded from ${opts.keyFile ? "file" : "env"}; address matches; key never printed`);

  const t0 = Date.now();
  for (const file of STEP_FILES) {
    const step = await import(`./src/steps/${file}`);
    log("agent", `--- step ${step.name} ---`);
    await step.run(ctx);
  }
  log("agent", `CLEAN LOOP in ${((Date.now() - t0) / 1000).toFixed(1)}s — entered + submitted ${ctx.bounty} as ${HANDLE}`);
  if (ctx.prediction) log("agent", `prediction submitted: ${JSON.stringify(ctx.prediction)}`);
  if (ctx.submission?.id) log("agent", `submission id: ${ctx.submission.id}`);
}

main().catch((e) => {
  console.error(`[agent] FAILED: ${e.message}`);
  process.exit(1);
});
