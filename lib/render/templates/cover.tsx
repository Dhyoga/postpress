import React from "react";
import type { ReactElement } from "react";
import type { SlideContent } from "../types";
import { CANVAS, COLORS, FONTS } from "../theme";

/** Slide pembuka carousel. Slot: eyebrow (<=20), title (<=60), subtitle (<=90). */
export function CoverTemplate(content: SlideContent): ReactElement {
  const eyebrow = content.eyebrow ?? "";
  const title = content.title ?? "";
  const subtitle = content.subtitle ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS.width,
        height: CANVAS.height,
        padding: CANVAS.padding,
        backgroundColor: COLORS.paper,
        fontFamily: FONTS.body,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: 14, height: 14, backgroundColor: COLORS.ultra }} />
        <div
          style={{
            display: "flex",
            marginLeft: 16,
            fontFamily: FONTS.mono,
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLORS.ultra,
          }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.05,
            color: COLORS.ink,
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: COLORS.rule, marginBottom: 32 }} />
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.body,
            fontWeight: 400,
            fontSize: 40,
            lineHeight: 1.3,
            color: COLORS.slate,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
