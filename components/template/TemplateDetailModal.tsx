"use client";

import { Modal, ModalHeader } from "@/components/ui/Modal";
import { getTemplateInfo } from "./template-info";
import type { TemplateRow } from "./TemplateView";

function ExampleContent({ templateId, content }: { templateId: string; content: Record<string, string> }) {
  if (templateId === "cover") {
    return (
      <>
        <div className="slide__kicker">{content.eyebrow}</div>
        <div className="slide__h">{content.title}</div>
        <div className="slide__p">{content.subtitle}</div>
      </>
    );
  }
  if (templateId === "point") {
    return (
      <>
        <div className="slide__kicker">{content.index}</div>
        <div className="slide__h">{content.heading}</div>
        <div className="slide__p">{content.body}</div>
      </>
    );
  }
  if (templateId === "quote") {
    return (
      <>
        <div className="slide__h" style={{ fontSize: 15 }}>
          &ldquo;{content.quote}&rdquo;
        </div>
        <div className="slide__p" style={{ marginTop: 12 }}>
          {content.attribution}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="slide__kicker">Ajakan</div>
      <div className="slide__h">{content.headline}</div>
      <div className="slide__p">{content.handle}</div>
    </>
  );
}

export function TemplateDetailModal({
  template,
  onClose,
}: {
  template: TemplateRow | null;
  onClose: () => void;
}) {
  const info = template ? getTemplateInfo(template.id) : null;

  return (
    <Modal open={!!template} onClose={onClose} labelledBy="tp-title" maxWidthClassName="max-w-[640px]">
      {template && info ? (
        <>
          <ModalHeader
            titleId="tp-title"
            title={template.name}
            subtitle={`${template.id} · 1 slide`}
            onClose={onClose}
          />
          <div className="modal__body">
            <div className="strip" style={{ padding: "2px 2px 8px" }}>
              <figure className="slide">
                <div className="slide__frame">
                  <div className={`slide__canvas ${info.canvasClass}`}>
                    <ExampleContent templateId={template.id} content={info.example} />
                  </div>
                </div>
                <figcaption className="slide__meta">
                  <span>01 / 01</span>
                  <span>{template.id}</span>
                </figcaption>
              </figure>
            </div>
            <div className="tpl-specs">
              <div className="tpl-spec-row">
                <span className="tpl-spec-row__block">{template.id}</span>
                <span className="tpl-spec-row__fields">
                  {Object.entries(template.slots).map(([name, max], fi) => (
                    <span key={name}>
                      {fi > 0 ? " · " : ""}
                      <b>{name}</b> &le;{max} karakter
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>
          <div className="modal__foot">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Tutup
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
