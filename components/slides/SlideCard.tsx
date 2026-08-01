import type { ProofSlideContent } from "@/lib/mock/proof-sheet";

// eslint-disable-next-line @next/next/no-img-element -- gambar JPEG hasil render
// disajikan dari R2 (domain eksternal), bukan aset lokal Next.js.
export function SlideCard({
  content,
  index,
  total,
}: {
  content: ProofSlideContent;
  index: number;
  total: number;
}) {
  return (
    <figure className="slide">
      <div className="slide__frame">
        {content.imageUrl ? (
          <img className="slide__img" src={content.imageUrl} alt={content.heading || `Slide ${index}`} />
        ) : (
          <div className={`slide__canvas slide__canvas--${content.kind}`}>
            <div className="slide__kicker">{content.kicker}</div>
            <div className="slide__h">{content.heading}</div>
            <div className="slide__p">{content.body}</div>
          </div>
        )}
      </div>
      <figcaption className="slide__meta">
        <span>
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <span>{content.kind}</span>
      </figcaption>
    </figure>
  );
}
