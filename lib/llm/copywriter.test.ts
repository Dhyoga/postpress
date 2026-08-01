import { describe, expect, it } from "vitest";
import { findForbiddenWords, slideSkeleton } from "./copywriter";
import type { Copy } from "./schemas/copy";
import type { Theme } from "./schemas/plan";

const copy: Copy = {
  slides: [
    { kind: "cover", eyebrow: "PANDUAN", title: "Diskon gila-gilaan", subtitle: "Jangan sampai kehabisan" },
    { kind: "point", index: "01", heading: "Heading", body: "Body biasa" },
    { kind: "cta", headline: "Ayo mulai", handle: "@brand" },
  ],
  caption: "Caption netral tanpa kata terlarang.",
  hashtags: ["a", "b", "c", "d", "e"],
};

describe("findForbiddenWords", () => {
  it("returns nothing when no forbidden word appears anywhere", () => {
    expect(findForbiddenWords(copy, ["obralan", "murahan"])).toEqual([]);
  });

  it("finds a forbidden word inside a slide slot", () => {
    expect(findForbiddenWords(copy, ["diskon"])).toEqual(["diskon"]);
  });

  it("finds a forbidden word inside the caption", () => {
    const withCaption: Copy = { ...copy, caption: "Ini kata terlarang: obralan besar-besaran" };
    expect(findForbiddenWords(withCaption, ["obralan"])).toEqual(["obralan"]);
  });

  it("matches case-insensitively", () => {
    expect(findForbiddenWords(copy, ["DISKON"])).toEqual(["DISKON"]);
  });

  it("ignores blank entries in the forbidden list", () => {
    expect(findForbiddenWords(copy, ["", "   "])).toEqual([]);
  });
});

describe("slideSkeleton", () => {
  it("uses exactly the chosen template for a single post", () => {
    const theme: Theme = { date: "2026-08-03", topic: "t", angle: "a", type: "single", template: "quote" };
    expect(slideSkeleton(theme)).toEqual(["quote"]);
  });

  it("always uses the fixed cover/point/point/point/cta skeleton for a carousel", () => {
    const theme: Theme = { date: "2026-08-03", topic: "t", angle: "a", type: "carousel", template: "point" };
    expect(slideSkeleton(theme)).toEqual(["cover", "point", "point", "point", "cta"]);
  });
});
