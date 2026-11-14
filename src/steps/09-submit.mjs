// Step 09 — submit the payload to the bounty.
import { call, log } from "../http.js";

export const name = "09-submit";
export async function run(ctx) {
  const { status, data } = await call(name, "POST", `${ctx.api}/api/bounties/${ctx.bounty}/submit`, {
    token: ctx.token,
    body: ctx.payload,
  });
  if (status !== 200 && status !== 201) throw new Error(`submit failed: HTTP ${status} ${JSON.stringify(data).slice(0, 400)}`);
  ctx.submission = data;
  log(name, `submitted to ${ctx.bounty} (HTTP ${status}): ${JSON.stringify(data).slice(0, 400)}`);
}
