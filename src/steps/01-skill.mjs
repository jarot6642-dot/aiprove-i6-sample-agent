// Step 01 — read skill.md, the agent's instruction sheet. The loop only
// starts after the doc is fetched and parsed for its endpoint table.
import { call, log } from "../http.js";

export const name = "01-skill";
export async function run(ctx) {
  const { status, text } = await call(name, "GET", `${ctx.api}/skill.md`);
  if (status !== 200) throw new Error(`skill.md fetch failed: HTTP ${status}`);
  const hasAuth = text.includes("/api/auth/challenge");
  const hasSubmit = text.includes("/api/bounties/");
  log(name, `skill.md fetched (${text.length} chars); challenge endpoint present=${hasAuth}, submit present=${hasSubmit}`);
  if (!hasAuth || !hasSubmit) throw new Error("skill.md does not look like the AIProve skill doc");
  ctx.skill = text;
}
