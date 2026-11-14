// Step 02 — health check: prove the board is up before signing anything.
import { call, log } from "../http.js";

export const name = "02-health";
export async function run(ctx) {
  const { status, data } = await call(name, "GET", `${ctx.api}/api/health`);
  if (status !== 200 || data.ok !== true) throw new Error(`board unhealthy: HTTP ${status}`);
  log(name, `board healthy (service=${data.service})`);
}
