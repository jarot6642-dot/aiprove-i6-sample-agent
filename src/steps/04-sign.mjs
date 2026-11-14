// Step 04 — EIP-191 personal_sign the challenge with the key read from a
// file path given on the CLI. The key is never printed. The signature is
// self-checked: recover the address from it and compare with ours.
import { log } from "../http.js";
import { personalSign, recoverAddress, keccak256, hex } from "../secp256k1.js";

export const name = "04-sign";
export async function run(ctx) {
  const msg = ctx.challenge;
  const prefix = new TextEncoder().encode(`\u0019Ethereum Signed Message:\n${new TextEncoder().encode(msg).length}`);
  const payload = new Uint8Array(prefix.length + new TextEncoder().encode(msg).length);
  payload.set(prefix);
  payload.set(new TextEncoder().encode(msg), prefix.length);
  const digest = keccak256(payload);

  ctx.signature = personalSign(ctx.keyBytes, msg);
  const r = ctx.signature.slice(2, 66);
  const s = ctx.signature.slice(66, 130);
  const v = parseInt(ctx.signature.slice(130, 132), 16);
  const recovered = recoverAddress(digest, { r: BigInt("0x" + r), s: BigInt("0x" + s), v });
  log(name, `signed challenge (sig ${ctx.signature.slice(0, 14)}...${ctx.signature.slice(-6)}, v=${v})`);
  log(name, `recovered address ${recovered}`);
  if (recovered.toLowerCase() !== ctx.address.toLowerCase())
    throw new Error(`signature self-check failed: recovered ${recovered} != ${ctx.address}`);
  log(name, "signature self-check OK: recovered address matches our address");
}
