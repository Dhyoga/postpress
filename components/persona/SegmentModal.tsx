"use client";

import { useEffect, useState } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Segment, SegmentTier } from "@/lib/mock/persona";

export function SegmentModal({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Segment | null;
  onSave: (data: Omit<Segment, "id">, id?: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [tier, setTier] = useState<SegmentTier>("Sekunder");
  const [desc, setDesc] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [need, setNeed] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setTier(editing?.tier ?? "Sekunder");
    setDesc(editing?.desc ?? "");
    setPainPoint(editing?.painPoint ?? "");
    setNeed(editing?.need ?? "");
  }, [open, editing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Nama segmen wajib diisi.");
      return;
    }
    onSave(
      { name: name.trim(), tier, desc: desc.trim(), painPoint: painPoint.trim(), need: need.trim() },
      editing?.id,
    );
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="segment-modal-title">
      <ModalHeader
        titleId="segment-modal-title"
        title={editing ? "Ubah segmen" : "Tambah segmen"}
        subtitle="Satu audiens yang jadi target tulisan."
        onClose={onClose}
      />
      <form className="modal__body" onSubmit={handleSubmit}>
        <div className="field__row">
          <div className="field">
            <label htmlFor="segment-name">Nama segmen</label>
            <input
              type="text"
              id="segment-name"
              placeholder="mis. Freelancer pemula 0-2 tahun"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="segment-tier">Prioritas</label>
            <select
              id="segment-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as SegmentTier)}
            >
              <option value="Utama">Utama</option>
              <option value="Sekunder">Sekunder</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="segment-desc">Deskripsi</label>
          <textarea id="segment-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="segment-pain">Pain point</label>
          <textarea
            id="segment-pain"
            value={painPoint}
            onChange={(e) => setPainPoint(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="segment-need">Kebutuhan</label>
          <textarea id="segment-need" value={need} onChange={(e) => setNeed(e.target.value)} />
        </div>
        <div className="modal__foot">
          <button type="submit" className="btn btn--primary">
            Simpan segmen
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
