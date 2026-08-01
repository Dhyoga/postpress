import type { SlideBlockKind } from "@/lib/mock/types";

export function MiniSlide({
  kind,
  index,
  total,
}: {
  kind: SlideBlockKind;
  index: number;
  total: number;
}) {
  const label = kind === "cover" ? "Cover" : kind === "cta" ? "CTA" : kind === "quote" ? "Quote" : "0" + index;
  const canvasKind = kind === "quote" ? "point" : kind;
  return (
    <div className={`mini-slide mini-slide--${canvasKind}`}>
      <div className="mini-slide__k">
        {index}/{total}
      </div>
      <div className="mini-slide__h">{label}</div>
    </div>
  );
}
