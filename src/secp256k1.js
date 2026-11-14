// secp256k1.js — minimal pure-BigInt secp256k1: point math, RFC 6979
// deterministic ECDSA signing, and public-key recovery (for v).
// No dependencies; only Node's built-in HMAC-SHA256 is used for the RFC 6979
// nonce derivation. The private key never leaves this module except as the
// signing input — it is never logged.
import { createHmac } from "node:crypto";
import { keccak256, hex, unhex } from "./keccak.js";

export const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export const G = {
  x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
};

const mod = (a, m = P) => ((a % m) + m) % m;
const inv = (a, m = P) => {
  let [oldR, r] = [mod(a, m), m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return mod(oldS, m);
};

export function pointAdd(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.x === b.x && mod(a.y + b.y) === 0n) return null;
  const m = a.x === b.x && a.y === b.y
    ? (3n * a.x * a.x) * inv(2n * a.y)
    : (mod(b.y - a.y)) * inv(mod(b.x - a.x));
  const mm = mod(m);
  const x = mod(mm * mm - a.x - b.x);
  return { x, y: mod(mm * (a.x - x) - a.y) };
}

export function scalarMult(k, point = G) {
  let out = null;
  let add = point;
  while (k > 0n) {
    if (k & 1n) out = pointAdd(out, add);
    add = pointAdd(add, add);
    k >>= 1n;
  }
  return out;
}

const toBytes32 = (n) => {
  const b = new Uint8Array(32);
  let v = mod(n, N);
  for (let i = 31; i >= 0; i--) { b[i] = Number(v & 0xffn); v >>= 8n; }
  return b;
};

// Public key (uncompressed, 65 bytes) for a 32-byte private key.
export function publicKey(privBytes) {
  const d = BigInt("0x" + hex(privBytes));
  const pt = scalarMult(d);
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(toBytes32(pt.x), 1);
  out.set(toBytes32(pt.y), 33);
  return out;
}

// Ethereum address (0x…) for a 32-byte private key.
export function addressFromKey(privBytes) {
  const pub = publicKey(privBytes).subarray(1); // drop 0x04
  return "0x" + hex(keccak256(pub).subarray(12));
}

// RFC 6979 deterministic nonce for (privKey, hash).
function deterministicK(privBytes, hashBytes) {
  let v = new Uint8Array(32).fill(0x01);
  let k = new Uint8Array(32).fill(0x00);
  const hmac = (key, ...parts) => createHmac("sha256", Buffer.from(key))
    .update(Buffer.concat(parts.map((p) => Buffer.from(p)))).digest();
  k = hmac(k, v, new Uint8Array([0x00]), privBytes, hashBytes);
  v = hmac(k, v);
  k = hmac(k, v, new Uint8Array([0x01]), privBytes, hashBytes);
  v = hmac(k, v);
  for (;;) {
    v = hmac(k, v);
    const cand = BigInt("0x" + hex(v));
    if (cand >= 1n && cand < N) return cand;
    k = hmac(k, v, new Uint8Array([0x00]));
    v = hmac(k, v);
  }
}

// Sign a 32-byte digest. Returns { r, s, v } with v in {27, 28}.
// Low-s enforced (s <= N/2), as Ethereum signers do.
export function signDigest(privBytes, hashBytes) {
  const d = BigInt("0x" + hex(privBytes));
  const z = BigInt("0x" + hex(hashBytes));
  const k = deterministicK(privBytes, hashBytes);
  const R = scalarMult(k);
  let r = mod(R.x, N);
  let s = mod(inv(k, N) * (z + r * d), N);
  let recid = (R.y & 1n) === 0n ? 0 : 1;
  if (s > N / 2n) { s = N - s; recid ^= 1; }
  return { r, s, v: recid + 27 };
}

// Recover the signer address from a digest + signature (self-check).
export function recoverAddress(hashBytes, { r, s, v }) {
  const recid = v - 27;
  const x = r + BigInt(recid >> 1) * N;
  if (x >= P) throw new Error("invalid recovery id");
  const alpha = mod(mod(x * x * x) + 7n);
  let y = modPow(alpha, (P + 1n) / 4n);
  if ((y & 1n) !== BigInt(recid & 1)) y = P - y;
  const z = BigInt("0x" + hex(hashBytes));
  const rInv = inv(r, N);
  const u1 = mod(-z * rInv, N);
  const u2 = mod(s * rInv, N);
  const pt = pointAdd(scalarMult(u1), scalarMult(u2, { x, y }));
  const pub = new Uint8Array(64);
  pub.set(toBytes32(pt.x), 0);
  pub.set(toBytes32(pt.y), 32);
  return "0x" + hex(keccak256(pub).subarray(12));
}

function modPow(base, exp) {
  let out = 1n;
  let b = mod(base);
  while (exp > 0n) {
    if (exp & 1n) out = mod(out * b);
    b = mod(b * b);
    exp >>= 1n;
  }
  return out;
}

// EIP-191 personal_sign of a UTF-8 message. Returns a 0x hex signature.
export function personalSign(privBytes, message) {
  const msg = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode(`\u0019Ethereum Signed Message:\n${msg.length}`);
  const payload = new Uint8Array(prefix.length + msg.length);
  payload.set(prefix);
  payload.set(msg, prefix.length);
  const digest = keccak256(payload);
  const { r, s, v } = signDigest(privBytes, digest);
  return "0x" + hex(toBytes32(r)) + hex(toBytes32(s)) + v.toString(16).padStart(2, "0");
}

export { unhex };
