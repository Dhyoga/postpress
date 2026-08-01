import { describe, expect, it } from "vitest";
import { GraphApiError, AUTH_ERROR_CODE } from "./errors";
import { isRetryableError, nextRetryAt, hasRetriesLeft, RETRY_BACKOFF_MINUTES } from "./retry";

describe("isRetryableError", () => {
  it("does not retry auth errors (code 190)", () => {
    expect(isRetryableError(new GraphApiError("token invalid", { code: AUTH_ERROR_CODE }))).toBe(false);
  });

  it("retries other Graph API errors", () => {
    expect(isRetryableError(new GraphApiError("server hiccup", { code: 1 }))).toBe(true);
  });

  it("retries plain network errors", () => {
    expect(isRetryableError(new Error("fetch failed"))).toBe(true);
  });
});

describe("nextRetryAt", () => {
  it("follows the 1/5/25 minute backoff schedule", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    expect(nextRetryAt(1, from)).toEqual(new Date("2026-08-01T00:01:00Z"));
    expect(nextRetryAt(2, from)).toEqual(new Date("2026-08-01T00:05:00Z"));
    expect(nextRetryAt(3, from)).toEqual(new Date("2026-08-01T00:25:00Z"));
  });

  it("returns null once past the retry budget", () => {
    expect(nextRetryAt(4)).toBeNull();
  });
});

describe("hasRetriesLeft", () => {
  it("matches the length of the backoff schedule", () => {
    for (let i = 0; i < RETRY_BACKOFF_MINUTES.length; i += 1) {
      expect(hasRetriesLeft(i)).toBe(true);
    }
    expect(hasRetriesLeft(RETRY_BACKOFF_MINUTES.length)).toBe(false);
  });
});
