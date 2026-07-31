import { describe, expect, it } from "vitest";
import { formatDateId } from "./format";

describe("formatDateId", () => {
  it("formats a date without time", () => {
    expect(formatDateId("2026-08-01")).toBe("01 Agu");
  });

  it("formats a date with time appended", () => {
    expect(formatDateId("2026-08-01", "19:00")).toBe("01 Agu · 19:00");
  });
});
