import { describe, expect, it } from "vitest";
import { PlanSchema, ThemeSchema, findRepeatedTopics } from "./plan";

const validTheme = {
  date: "2026-08-03",
  topic: "Cara menghitung rate per jam",
  angle: "Rumus sederhana + contoh angka nyata",
  type: "carousel" as const,
  template: "cover",
};

describe("ThemeSchema", () => {
  it("accepts a well-formed theme", () => {
    expect(ThemeSchema.safeParse(validTheme).success).toBe(true);
  });

  it("rejects a template that isn't in the render registry", () => {
    const result = ThemeSchema.safeParse({ ...validTheme, template: "made_up_template" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = ThemeSchema.safeParse({ ...validTheme, date: "3 Agustus 2026" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty topic", () => {
    const result = ThemeSchema.safeParse({ ...validTheme, topic: "" });
    expect(result.success).toBe(false);
  });
});

describe("PlanSchema", () => {
  it("requires at least one theme", () => {
    expect(PlanSchema.safeParse({ themes: [] }).success).toBe(false);
  });

  it("accepts a full month of themes", () => {
    const themes = Array.from({ length: 31 }, (_, i) => ({ ...validTheme, date: `2026-08-${String(i + 1).padStart(2, "0")}` }));
    expect(PlanSchema.safeParse({ themes }).success).toBe(true);
  });
});

describe("findRepeatedTopics", () => {
  it("flags a topic that already ran in the last 60 days", () => {
    const plan = { themes: [validTheme, { ...validTheme, topic: "Topik baru" }] };
    const repeated = findRepeatedTopics(plan, ["Cara menghitung rate per jam"]);
    expect(repeated).toEqual(["Cara menghitung rate per jam"]);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    const plan = { themes: [{ ...validTheme, topic: "  CARA menghitung RATE per jam  " }] };
    const repeated = findRepeatedTopics(plan, ["cara menghitung rate per jam"]);
    expect(repeated).toHaveLength(1);
  });

  it("returns nothing when no topic overlaps", () => {
    const plan = { themes: [validTheme] };
    expect(findRepeatedTopics(plan, ["Topik lain yang tidak berkaitan"])).toEqual([]);
  });
});
