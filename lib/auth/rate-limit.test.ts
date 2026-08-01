import { describe, expect, it } from "vitest";
import { clearLoginAttempts, isLoginRateLimited, recordLoginAttempt } from "./rate-limit";

describe("login rate limiter", () => {
  it("allows attempts under the threshold", () => {
    const user = `user-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      expect(isLoginRateLimited(user)).toBe(false);
      recordLoginAttempt(user);
    }
    expect(isLoginRateLimited(user)).toBe(false);
  });

  it("blocks after 5 failed attempts within the window", () => {
    const user = `user-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordLoginAttempt(user);
    expect(isLoginRateLimited(user)).toBe(true);
  });

  it("clearing attempts (successful login) resets the counter", () => {
    const user = `user-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordLoginAttempt(user);
    expect(isLoginRateLimited(user)).toBe(true);
    clearLoginAttempts(user);
    expect(isLoginRateLimited(user)).toBe(false);
  });

  it("rate limits are tracked per username", () => {
    const a = `user-a-${Math.random()}`;
    const b = `user-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordLoginAttempt(a);
    expect(isLoginRateLimited(a)).toBe(true);
    expect(isLoginRateLimited(b)).toBe(false);
  });
});
