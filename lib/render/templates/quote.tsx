import React from "react";
import type { ReactElement } from "react";
import type { SlideContent } from "../types";
import { CANVAS, COLORS, FONTS } from "../theme";

/** Slide kutipan. Slot: quote (<=140), attribution (<=40). */
export function QuoteTemplate(content: SlideContent): ReactElement {
  const quote = content.quote ?? "";
  const attribution = content.attribution ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS.width,
        height: CANVAS.height,
        padding: CANVAS.padding,
        backgroundColor: COLORS.ink,
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: 140,
          color: COLORS.magenta,
          lineHeight: 1,
        }}
      >
        &ldquo;
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.2,
            color: COLORS.paperHi,
          }}
        >
          {quote}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 96, height: 4, backgroundColor: COLORS.ultra, marginBottom: 24 }} />
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.mono,
            fontWeight: 400,
            fontSize: 32,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: COLORS.slate,
          }}
        >
          {attribution}
        </div>
      </div>
    </div>
  );
}
