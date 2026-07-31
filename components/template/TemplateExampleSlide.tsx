import type { TemplateExampleSlide as TemplateExampleSlideData } from "@/lib/mock/templates";
import { BLOCKS } from "@/lib/mock/templates";

export function TemplateExampleSlideCard({
  slide,
  index,
  total,
}: {
  slide: TemplateExampleSlideData;
  index: number;
  total: number;
}) {
  const block = BLOCKS[slide.block];

  return (
    <figure className="slide">
      <div className="slide__frame">
        <div className={`slide__canvas ${block.canvasClass}`}>
          {slide.block === "cover" ? (
            <>
              <div className="slide__kicker">{slide.eyebrow}</div>
              <div className="slide__h">{slide.title}</div>
              <div className="slide__p">{slide.subtitle}</div>
            </>
          ) : slide.block === "point" ? (
            <>
              <div className="slide__kicker">{slide.index}</div>
              <div className="slide__h">{slide.heading}</div>
              <div className="slide__p">{slide.body}</div>
            </>
          ) : slide.block === "quote" ? (
            <>
              <div className="slide__h" style={{ fontSize: 15 }}>
                &ldquo;{slide.quote}&rdquo;
              </div>
              <div className="slide__p" style={{ marginTop: 12 }}>
                {slide.attribution}
              </div>
            </>
          ) : (
            <>
              <div className="slide__kicker">Ajakan</div>
              <div className="slide__h">{slide.headline}</div>
              <div className="slide__p">{slide.handle}</div>
            </>
          )}
        </div>
      </div>
      <figcaption className="slide__meta">
        <span>
          {index} / {total}
        </span>
        <span>{slide.block}</span>
      </figcaption>
    </figure>
  );
}
