import { describe, expect, it } from "vitest";
import { renderSvg } from "./render";
import { MAX_LENGTH_FIXTURES } from "./fixtures";
import { TEMPLATE_META, validateSlideContent } from "./registry";

describe("renderSvg snapshots", () => {
  for (const meta of TEMPLATE_META) {
    it(`renders ${meta.id} at max-length content without throwing`, async () => {
      const svg = await renderSvg(meta.id, MAX_LENGTH_FIXTURES[meta.id]);
      expect(svg).toContain("<svg");
      expect(svg).toMatchSnapshot();
    });
  }
});

describe("validateSlideContent", () => {
  it("rejects content over a slot's character limit instead of letting it overflow silently", () => {
    expect(() => validateSlideContent("cover", { ...MAX_LENGTH_FIXTURES.cover, title: "x".repeat(61) })).toThrow();
  });

  it("rejects missing required slots", () => {
    expect(() => validateSlideContent("cta", { headline: "Cukup ini saja" })).toThrow();
  });

  it("accepts content exactly at the limit", () => {
    expect(() => validateSlideContent("cta", { headline: "x".repeat(50), handle: "@x" })).not.toThrow();
  });

  it("throws for an unknown template id", () => {
    expect(() => validateSlideContent("does-not-exist", {})).toThrow();
  });
});
