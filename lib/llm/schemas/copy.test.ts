import { describe, expect, it } from "vitest";
import { CopySchema, SlideSchema } from "./copy";

const validCover = { kind: "cover", eyebrow: "PANDUAN", title: "Judul", subtitle: "Subjudul" };
const validPoint = { kind: "point", index: "01", heading: "Heading", body: "Body" };
const validCta = { kind: "cta", headline: "Ayo mulai", handle: "@brand" };

describe("SlideSchema", () => {
  it("accepts a valid cover slide", () => {
    expect(SlideSchema.safeParse(validCover).success).toBe(true);
  });

  it("rejects a slide whose slot exceeds the registry character limit", () => {
    const result = SlideSchema.safeParse({ ...validCover, title: "x".repeat(61) });
    expect(result.success).toBe(false);
  });

  it("rejects a slide missing a required slot", () => {
    const { subtitle: _subtitle, ...withoutSubtitle } = validCover;
    expect(SlideSchema.safeParse(withoutSubtitle).success).toBe(false);
  });

  it("rejects an unknown slide kind", () => {
    const result = SlideSchema.safeParse({ kind: "not_a_template", foo: "bar" });
    expect(result.success).toBe(false);
  });
});

describe("CopySchema", () => {
  const base = { slides: [validCover, validPoint, validCta], caption: "Caption singkat", hashtags: ["a", "b", "c", "d", "e"] };

  it("accepts a well-formed copy payload", () => {
    expect(CopySchema.safeParse(base).success).toBe(true);
  });

  it("rejects fewer than 5 hashtags", () => {
    const result = CopySchema.safeParse({ ...base, hashtags: ["a", "b"] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 15 hashtags", () => {
    const result = CopySchema.safeParse({ ...base, hashtags: Array.from({ length: 16 }, (_, i) => `tag${i}`) });
    expect(result.success).toBe(false);
  });

  it("rejects a caption over 2200 characters", () => {
    const result = CopySchema.safeParse({ ...base, caption: "x".repeat(2201) });
    expect(result.success).toBe(false);
  });

  it("rejects an empty slides array", () => {
    const result = CopySchema.safeParse({ ...base, slides: [] });
    expect(result.success).toBe(false);
  });
});
