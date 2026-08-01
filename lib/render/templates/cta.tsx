import React from "react";
import type { ReactElement } from "react";
import type { SlideContent } from "../types";
import { CANVAS, COLORS, FONTS } from "../theme";

/** Slide penutup carousel (call to action). Slot: headline (<=50), handle (<=30). */
export function CtaTemplate(content: SlideContent): ReactElement {
  const headline = content.headline ?? "";
  const handle = content.handle ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS.width,
        height: CANVAS.height,
        padding: CANVAS.padding,
        backgroundColor: COLORS.ultra,
        fontFamily: FONTS.body,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.1,
            color: COLORS.paperHi,
          }}
        >
          {headline}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: 14, height: 14, backgroundColor: COLORS.magenta }} />
        <div
          style={{
            display: "flex",
            marginLeft: 16,
            fontFamily: FONTS.mono,
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: 2,
            color: COLORS.paperHi,
          }}
        >
          {handle}
        </div>
      </div>
    </div>
  );
}
