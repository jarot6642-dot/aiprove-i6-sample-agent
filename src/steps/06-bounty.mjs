// Step 06 — read the target bounty: confirm it is open and note its brief,
// so the forecast answers the question actually asked.
import { call, log } from "../http.js";

export const name = "06-bounty";
export async function run(ctx) {
  const { status, data } = await call(name, "GET", `${ctx.api}/api/bounties/${ctx.bounty}`);
  if (status !== 200 || !data.bounty) throw new Error(`bounty ${ctx.bounty} lookup failed: HTTP ${status}`);
  const b = data.bounty;
  log(name, `"${b.title}" — lane=${b.lane}, metric=${b.metric}, status=${b.status}, closes=${b.closes}, prize=${b.amt} ${b.unit}`);
  log(name, `brief: ${b.brief}`);
  if (b.status !== "open") throw new Error(`bounty ${ctx.bounty} is not open (status=${b.status})`);
  ctx.bountyDetail = b;
}
