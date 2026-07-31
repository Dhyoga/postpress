"use client";

import { useEffect, useState } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Plan, PostType, TemplateId } from "@/lib/mock/types";

const TEMPLATE_OPTIONS: TemplateId[] = ["cover_list", "point_grid", "quote", "cta_only"];

export function PlanModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Plan | null;
  onSave: (data: Omit<Plan, "id">, id?: string) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [type, setType] = useState<PostType>("carousel");
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [template, setTemplate] = useState<TemplateId>("cover_list");

  useEffect(() => {
    if (!open) return;
    setDate(editing?.date ?? "");
    setType(editing?.type ?? "carousel");
    setTopic(editing?.topic ?? "");
    setAngle(editing?.angle ?? "");
    setTemplate(editing?.template ?? "cover_list");
  }, [open, editing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !topic.trim()) {
      toast("Tanggal dan topik wajib diisi.");
      return;
    }
    onSave({ date, type, topic: topic.trim(), angle: angle.trim(), template }, editing?.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="plan-modal-title">
      <ModalHeader
        titleId="plan-modal-title"
        title={editing ? "Ubah tema" : "Tambah tema"}
        subtitle="Tema masuk ke rencana konten, belum jadi draf gambar."
        onClose={onClose}
      />
      <form className="modal__body" onSubmit={handleSubmit}>
        <div className="field__row">
          <div className="field">
            <label htmlFor="plan-date">Tanggal</label>
            <input
              type="date"
              id="plan-date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="plan-type">Jenis</label>
            <select id="plan-type" value={type} onChange={(e) => setType(e.target.value as PostType)}>
              <option value="carousel">Carousel</option>
              <option value="single">Single post</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="plan-topic">Topik</label>
          <input
            type="text"
            id="plan-topic"
            placeholder="mis. Cara menghitung rate per jam"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="plan-angle">Sudut pandang</label>
          <textarea
            id="plan-angle"
            placeholder="mis. Rumus sederhana + contoh angka nyata"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="plan-template">Template</label>
          <select
            id="plan-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateId)}
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <p className="field__hint">Menentukan layout Satori yang dipakai saat render.</p>
        </div>
        <div className="modal__foot">
          <button type="submit" className="btn btn--primary">
            Simpan tema
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
