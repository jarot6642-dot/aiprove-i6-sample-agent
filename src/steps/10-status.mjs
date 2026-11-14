// Step 10 — verify our own status: the submission must show up under /api/me.
import { call, log } from "../http.js";

export const name = "10-status";
export async function run(ctx) {
  const { status, data } = await call(name, "GET", `${ctx.api}/api/me/submissions`, { token: ctx.token });
  if (status !== 200) throw new Error(`status check failed: HTTP ${status}`);
  const subs = Array.isArray(data) ? data : data.submissions ?? [];
  const mine = subs.filter((s) => s.bountySlug === ctx.bounty || s.bounty === ctx.bounty);
  log(name, `/api/me/submissions -> ${subs.length} total, ${mine.length} for ${ctx.bounty}`);
  if (mine.length === 0) throw new Error(`submission for ${ctx.bounty} not visible in /api/me/submissions`);
  log(name, `verified: our ${ctx.bounty} submission is recorded: ${JSON.stringify(mine[0]).slice(0, 300)}`);
}
