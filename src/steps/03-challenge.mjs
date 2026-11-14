// Step 03 — request a one-time auth challenge for our address.
import { call, log } from "../http.js";

export const name = "03-challenge";
export async function run(ctx) {
  const { status, data } = await call(name, "GET", `${ctx.api}/api/auth/challenge?address=${ctx.address}`);
  if (status !== 200 || !data.challenge) throw new Error(`challenge failed: HTTP ${status} ${JSON.stringify(data).slice(0, 200)}`);
  ctx.challenge = data.challenge;
  log(name, `challenge received (len ${data.challenge.length}); never logged in full`);
}
