import type { SlideBlockKind } from "@/lib/mock/types";

export function MiniSlide({
  kind,
  index,
  total,
  imageUrl,
}: {
  kind: SlideBlockKind;
  index: number;
  total: number;
  imageUrl?: string | null;
}) {
  if (kind === "upload" && imageUrl) {
    return (
      <div className="mini-slide mini-slide--upload">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`Gambar ${index}/${total}`} className="mini-slide__img" />
        <div className="mini-slide__k">
          {index}/{total}
        </div>
      </div>
    );
  }

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
