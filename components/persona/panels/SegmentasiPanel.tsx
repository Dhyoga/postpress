"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import type { Segment } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";
import { SegmentModal } from "../SegmentModal";

export function SegmentasiPanel() {
  const { segments, saveSegments, loading } = usePersona();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = editingId ? (segments.find((s) => s.id === editingId) ?? null) : null;

  function openAdd() {
    setEditingId(null);
    setModalOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }
  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await saveSegments(segments.filter((s) => s.id !== id));
      toast("Segmen dihapus.");
    } catch {
      toast("Gagal menghapus segmen. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function handleSave(data: Omit<Segment, "id">, id?: string) {
    setBusy(true);
    try {
      const next = id
        ? segments.map((s) => (s.id === id ? { ...s, ...data } : s))
        : [...segments, { ...data, id: `seg-${Date.now()}` }];
      await saveSegments(next);
      toast(id ? "Segmen diperbarui." : "Segmen baru ditambahkan.");
    } catch {
      toast("Gagal menyimpan segmen. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const rows = [
      ["Nama Segmen", "Prioritas", "Deskripsi", "Pain Point", "Kebutuhan"],
      [
        "Freelancer pemula 0-2 tahun",
        "Utama",
        "Baru lepas kerja kantoran",
        "Takut pasang harga",
        "Contoh angka konkret",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Segmentasi");
    XLSX.writeFile(wb, "template-segmentasi-postpress.xlsx");
  }

  // Parse .xlsx murni di browser (SheetJS) sesuai agents.md aturan #6 — hasil parse
  // wajib lewat jalur create/update yang sama dengan input manual (saveSegments →
  // POST /api/persona/segments), bukan endpoint bulk terpisah.
  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!(data instanceof ArrayBuffer)) throw new Error("Buffer file tidak valid.");
        const wb = XLSX.read(new Uint8Array(data), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        const newSegments: Segment[] = [];
        rows.forEach((row, i) => {
          const name = String(row["Nama Segmen"] ?? "").trim();
          if (!name) return;
          newSegments.push({
            id: `seg-${Date.now()}-${i}`,
            name,
            tier: (String(row["Prioritas"] ?? "Sekunder").trim() || "Sekunder") as Segment["tier"],
            description: String(row["Deskripsi"] ?? ""),
            painPoint: String(row["Pain Point"] ?? ""),
            need: String(row["Kebutuhan"] ?? ""),
          });
        });
        if (newSegments.length) {
          setBusy(true);
          try {
            await saveSegments([...segments, ...newSegments]);
          } finally {
            setBusy(false);
          }
        }
        toast(
          newSegments.length
            ? `${newSegments.length} segmen diimpor dari Excel.`
            : 'Tidak ada baris valid di file itu. Cek kolom "Nama Segmen".',
        );
      } catch {
        toast("Gagal membaca file. Pastikan formatnya sesuai template.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="settings-card">
      <div className="settings-card__title">Segmentasi</div>
      <p className="settings-card__desc">
        Siapa yang kita tulisi. Boleh lebih dari satu segmen &mdash; tandai mana yang utama.
      </p>

      <div className="plan-list" style={{ marginTop: 16 }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div className="segment-card" key={i}>
              <div className="segment-card__body">
                <SkeletonBlock className="h-4 w-1/2" />
                <SkeletonBlock className="h-3 w-full mt-[10px]" />
                <SkeletonBlock className="h-3 w-2/3 mt-2" />
              </div>
            </div>
          ))
        ) : segments.length ? (
          segments.map((s) => (
            <div className="segment-card" key={s.id}>
              <div className="segment-card__body">
                <div className="segment-card__name">
                  {s.name} <span className="badge">{s.tier}</span>
                </div>
                <div className="segment-card__meta">
                  {s.description}
                  <br />
                  <b>Pain point:</b> {s.painPoint}
                  <br />
                  <b>Kebutuhan:</b> {s.need}
                </div>
              </div>
              <div className="segment-card__actions">
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => openEdit(s.id)}>
                  Ubah
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  disabled={busy}
                  onClick={() => handleDelete(s.id)}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <strong>Belum ada segmen</strong>
            <p>Tambahkan minimal satu segmen supaya rencana konten tahu sedang menulis untuk siapa.</p>
            <button type="button" className="btn btn--primary btn--sm" onClick={openAdd}>
              Tambah segmen
            </button>
          </div>
        )}
      </div>

      <div className="settings-card__foot">
        <button type="button" className="btn btn--ghost btn--sm" onClick={openAdd}>
          + Tambah segmen
        </button>
      </div>

      <div className="excel-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={downloadTemplate}>
          Unduh template Excel
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} />
      </div>

      <SegmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}
