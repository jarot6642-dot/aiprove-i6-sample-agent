// Crypto self-test: keccak-256 + secp256k1 + EIP-191 against public test
// vectors. The key used here (0x01) is the standard public test vector, not
// a real key. Run: npm run test:crypto
import assert from "node:assert";
import { keccak256, hex } from "../src/keccak.js";
import { addressFromKey, personalSign, recoverAddress, unhex } from "../src/secp256k1.js";

// keccak256("") — canonical vector
assert.equal(
  hex(keccak256(new Uint8Array(0))),
  "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
  "keccak256 empty",
);
// keccak256("hello") — canonical vector
assert.equal(
  hex(keccak256(new TextEncoder().encode("hello"))),
  "1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",
  "keccak256 hello",
);
// address of private key 0x01 — canonical vector
const key1 = new Uint8Array(32);
key1[31] = 0x01;
assert.equal(
  addressFromKey(key1).toLowerCase(),
  "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf",
  "address of key 0x01",
);
// sign + recover round-trip
const sig = personalSign(key1, "hello aiprove");
assert.match(sig, /^0x[0-9a-f]{130}$/);
const msg = new TextEncoder().encode("hello aiprove");
const prefix = new TextEncoder().encode(`\u0019Ethereum Signed Message:\n${msg.length}`);
const payload = new Uint8Array(prefix.length + msg.length);
payload.set(prefix);
payload.set(msg, prefix.length);
const digest = keccak256(payload);
const recovered = recoverAddress(digest, {
  r: BigInt("0x" + sig.slice(2, 66)),
  s: BigInt("0x" + sig.slice(66, 130)),
  v: parseInt(sig.slice(130, 132), 16),
});
assert.equal(recovered.toLowerCase(), "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf", "recover matches");
console.log("crypto self-test: all 4 vectors pass (keccak x2, address, sign+recover)");
