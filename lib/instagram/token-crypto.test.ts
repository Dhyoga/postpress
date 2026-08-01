import { describe, expect, it, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./token-crypto";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = "0".repeat(64);
});

describe("token-crypto", () => {
  it("round-trips a token through encrypt/decrypt", () => {
    const plaintext = "EAAG_super_secret_ig_token_value";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
  });

  it("throws on a tampered ciphertext instead of returning garbage", () => {
    const encrypted = encryptToken("token");
    const [iv, tag, cipher] = encrypted.split(":");
    const tampered = `${iv}:${tag}:${cipher.slice(0, -2)}00`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws a clear error when TOKEN_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    process.env.TOKEN_ENCRYPTION_KEY = saved;
  });
});
