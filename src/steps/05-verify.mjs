// Step 05 — exchange the signature for a session token.
import { call, log } from "../http.js";

export const name = "05-verify";
export async function run(ctx) {
  const { status, data } = await call(name, "POST", `${ctx.api}/api/auth/verify`, {
    body: { address: ctx.address, signature: ctx.signature },
  });
  if (status !== 200 || !data.token) throw new Error(`verify failed: HTTP ${status} ${JSON.stringify(data).slice(0, 200)}`);
  ctx.token = data.token;
  log(name, `session token received (masked: ${data.token.slice(0, 10)}...), expiresAt=${data.expiresAt ?? "n/a"}`);
}
