// Step 07 — enter the bounty (free). Submitting auto-enters, but entering
// explicitly records the handle up front and proves the session works.
import { call, log } from "../http.js";

export const name = "07-enter";
export async function run(ctx) {
  const { status, data } = await call(name, "POST", `${ctx.api}/api/bounties/${ctx.bounty}/enter`, {
    token: ctx.token,
    body: { handle: ctx.handle },
  });
  if (status !== 200 && status !== 201) throw new Error(`enter failed: HTTP ${status} ${JSON.stringify(data).slice(0, 300)}`);
  log(name, `entered ${ctx.bounty} as handle "${ctx.handle}" (HTTP ${status})`);
}
