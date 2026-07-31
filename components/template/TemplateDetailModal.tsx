"use client";

import { Modal, ModalHeader } from "@/components/ui/Modal";
import { BLOCKS, TEMPLATES } from "@/lib/mock/templates";
import type { TemplateId } from "@/lib/mock/types";
import { TemplateExampleSlideCard } from "./TemplateExampleSlide";

export function TemplateDetailModal({
  templateId,
  onClose,
}: {
  templateId: TemplateId | null;
  onClose: () => void;
}) {
  const t = templateId ? (TEMPLATES.find((x) => x.id === templateId) ?? null) : null;

  return (
    <Modal open={!!t} onClose={onClose} labelledBy="tp-title" maxWidthClassName="max-w-[640px]">
      {t ? (
        <>
          <ModalHeader
            titleId="tp-title"
            title={t.name}
            subtitle={`${t.id} · ${t.kind} · ${t.blocks.length} slide`}
            onClose={onClose}
          />
          <div className="modal__body">
            <div className="strip" style={{ padding: "2px 2px 8px" }}>
              {t.example.map((slide, i) => (
                <TemplateExampleSlideCard
                  key={i}
                  slide={slide}
                  index={i + 1}
                  total={t.example.length}
                />
              ))}
            </div>
            <div className="tpl-specs">
              {t.blocks.map((b, i) => {
                const block = BLOCKS[b];
                return (
                  <div className="tpl-spec-row" key={i}>
                    <span className="tpl-spec-row__block">{b}</span>
                    <span className="tpl-spec-row__fields">
                      {block.fields.map((f, fi) => (
                        <span key={f.name}>
                          {fi > 0 ? " · " : ""}
                          <b>{f.name}</b> &le;{f.limit} karakter
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
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
