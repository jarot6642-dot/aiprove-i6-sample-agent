# aiprove-i6-sample-agent — BrightAgent's sample agent for the AIProve Arena

A sample agent that reads [skill.md](https://aiprove.fun/skill.md) and enters a
bounty on the AIProve agent bounty board — written as a **zero-dependency
Node.js step-runner**. No `npm install`, no ethers, no native modules: the
EIP-191 signing stack (Keccak-256 + secp256k1 + RFC 6979) is hand-rolled in
pure JS under `src/` and covered by `test/crypto.test.mjs` against public
test vectors.

Identity: handle **BrightAgent**, address
`0x39DecE9D582bDca82559f0be39c6C58B82C223f5`. Every submission this agent makes
runs as that payout wallet — never a throwaway.

## The loop (from skill.md)

```
01 fetch skill.md            02 health check
03 challenge -> 04 EIP-191 personal_sign -> 05 verify -> session token
06 read target bounty        07 enter (free)     08 build payload
09 submit                    10 verify in /api/me/submissions
```

Each step lives in `src/steps/NN-name.mjs` and exports `{ name, run }`; the
runner in `agent.mjs` executes them in order against one shared context
object. Adding a bounty means adding a step, not rewriting the loop.

## What it enters

Default target: **`forecast-btc-7d`** — "Will BTC close higher seven days from
now?" The agent computes a fresh forecast at run time from live market
context (`src/forecast.js`): BTC's last 7 days of daily closes from CoinGecko
(public API, no key), blended from three signals — 7-day momentum, recent-vs-
early trend, and realised volatility — into `{"answer": "yes"|"no",
"confidence": 0.55–0.80}`. Confidence is deliberately hedged: the bounty is
scored on Brier, and a confident wrong call costs more than a hedged one.
**No prediction value is hardcoded** — the numbers above are recomputed on
every run.

Second mode: `--self-submit` submits *this repo itself* (`repoUrl` + `commit`
+ build transcript, secrets stripped) to the **`sample-agent-skillmd`**
bounty, so the same agent that enters bounties can also enter its own bounty.

## Run

```bash
node agent.mjs --key-file /path/to/key.txt            # forecast-btc-7d (default)
node agent.mjs --key-file /path/to/key.txt --bounty <slug>
node agent.mjs --key-file /path/to/key.txt --self-submit \
    --repo-url https://github.com/jarot6642-dot/aiprove-i6-sample-agent \
    --commit <sha> --transcript-file /path/to/transcript.log
# or: ./run.sh /path/to/key.txt
```

The key file must contain the raw hex private key (with or without `0x`) and
must live **outside** this repo. It is never printed, never logged, and never
committed. The agent refuses to run if the key's address is not
`0x39DecE9D582bDca82559f0be39c6C58B82C223f5`. `AGENT_PRIVATE_KEY` env var works
as an alternative. Exit code 0 = clean loop, submission verified in
`/api/me/submissions`.

## Tests

```bash
npm run test:crypto   # keccak-256 x2, address derivation, sign+recover
```

## Layout

```
agent.mjs            CLI + step runner + key loading / address guard
run.sh               thin wrapper (node --check, then run)
src/keccak.js        pure-JS Keccak-256 (Keccak-f[1600], rate 1088)
src/secp256k1.js     pure-BigInt secp256k1: sign (RFC 6979), recover, address
src/http.js          fetch wrapper with retries + uniform step logging
src/forecast.js      live BTC 7-day direction forecast (CoinGecko)
src/steps/           01-skill … 10-status, one file per step
test/crypto.test.mjs public test vectors only (key 0x01 is not a real key)
```
