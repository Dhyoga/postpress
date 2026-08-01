import React from "react";
import type { ReactElement } from "react";
import type { SlideContent } from "../types";
import { CANVAS, COLORS, FONTS } from "../theme";

/** Slide poin isi carousel. Slot: index (<=2), heading (<=45), body (<=160). */
export function PointTemplate(content: SlideContent): ReactElement {
  const index = content.index ?? "";
  const heading = content.heading ?? "";
  const body = content.body ?? "";

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
      <div
        style={{
          display: "flex",
          fontFamily: FONTS.mono,
          fontWeight: 400,
          fontSize: 48,
          color: COLORS.magenta,
        }}
      >
        {index.padStart(2, "0")}
      </div>

      <div style={{ display: "flex", width: 96, height: 6, backgroundColor: COLORS.ultra, marginTop: 24, marginBottom: 48 }} />

      <div
        style={{
          display: "flex",
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: 72,
          lineHeight: 1.1,
          color: COLORS.ink,
        }}
      >
        {heading}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "flex-end" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONTS.body,
            fontWeight: 400,
            fontSize: 42,
            lineHeight: 1.4,
            color: COLORS.slate,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
