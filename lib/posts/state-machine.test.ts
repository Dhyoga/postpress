import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isDeletable, POST_TRANSITIONS } from "./state-machine";

describe("canTransition", () => {
  it("allows staying in the same status", () => {
    expect(canTransition("draft", "draft")).toBe(true);
  });

  it("allows the documented happy path", () => {
    expect(canTransition("draft", "generating")).toBe(true);
    expect(canTransition("generating", "needs_review")).toBe(true);
    expect(canTransition("needs_review", "approved")).toBe(true);
    expect(canTransition("approved", "publishing")).toBe(true);
    expect(canTransition("publishing", "published")).toBe(true);
  });

  it("allows a rejected draft to be regenerated", () => {
    expect(canTransition("needs_review", "rejected")).toBe(true);
    expect(canTransition("rejected", "draft")).toBe(true);
  });

  it("allows a failed job to be retried or reset", () => {
    expect(canTransition("failed", "draft")).toBe(true);
    expect(canTransition("failed", "publishing")).toBe(true);
  });

  it("rejects transitions out of the terminal published status", () => {
    expect(canTransition("published", "draft")).toBe(false);
    expect(POST_TRANSITIONS.published).toHaveLength(0);
  });

  it("rejects skipping straight from draft to published", () => {
    expect(canTransition("draft", "published")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("throws a human-readable message for an illegal transition", () => {
    expect(() => assertTransition("published", "draft")).toThrow(/draft/);
  });

  it("does not throw for a legal transition", () => {
    expect(() => assertTransition("approved", "needs_review")).not.toThrow();
  });
});

describe("isDeletable", () => {
  it("allows deleting drafts and rejected posts", () => {
    expect(isDeletable("draft")).toBe(true);
    expect(isDeletable("rejected")).toBe(true);
  });

  it("blocks deleting anything already in the review/publish pipeline", () => {
    expect(isDeletable("needs_review")).toBe(false);
    expect(isDeletable("approved")).toBe(false);
    expect(isDeletable("published")).toBe(false);
  });
});
