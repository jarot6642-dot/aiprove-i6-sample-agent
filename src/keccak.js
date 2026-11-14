// keccak.js — pure-JS Keccak-256 (the hash behind Ethereum's keccak256).
// No dependencies. Written from the Keccak-f[1600] spec: rate 1088 bits,
// capacity 512 bits, suffix 0x01, 24 rounds. Deliberately self-contained so
// this agent needs no npm install and no native crypto provider for hashing.
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n, 0x000000000000808bn,
  0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an, 0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const R = [
  [0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56], [27, 20, 39, 8, 14],
];
const MASK = (1n << 64n) - 1n;
const rotl = (x, n) => ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK;

function keccakF(state) {
  for (let round = 0; round < 24; round++) {
    // Theta
    const C = new Array(5);
    for (let x = 0; x < 5; x++)
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    const D = new Array(5);
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) state[x + 5 * y] ^= D[x];
    // Rho + Pi
    const B = new Array(25);
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++)
        B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(state[x + 5 * y], R[x][y]);
    // Chi
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++)
        state[x + 5 * y] = B[x + 5 * y] ^ (~B[(x + 1) % 5 + 5 * y] & B[(x + 2) % 5 + 5 * y]);
    // Iota
    state[0] ^= RC[round];
  }
}

// data: Uint8Array -> 32-byte keccak-256 digest (Uint8Array)
export function keccak256(data) {
  const state = new Array(25).fill(0n);
  const rate = 136; // bytes
  let off = 0;
  while (off + rate <= data.length) {
    for (let i = 0; i < rate; i++) {
      const lane = i >> 3, shift = BigInt((i & 7) * 8);
      state[lane] ^= BigInt(data[off + i]) << shift;
    }
    keccakF(state);
    off += rate;
  }
  // pad10*1, suffix 0x01
  const block = new Uint8Array(rate);
  block.set(data.subarray(off));
  block[data.length - off] = 0x01;
  block[rate - 1] |= 0x80;
  for (let i = 0; i < rate; i++) {
    const lane = i >> 3, shift = BigInt((i & 7) * 8);
    state[lane] ^= BigInt(block[i]) << shift;
  }
  keccakF(state);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++)
    out[i] = Number((state[i >> 3] >> BigInt((i & 7) * 8)) & 0xffn);
  return out;
}

export const hex = (bytes) => Buffer.from(bytes).toString("hex");
export const unhex = (h) => new Uint8Array(Buffer.from(h.replace(/^0x/, ""), "hex"));
