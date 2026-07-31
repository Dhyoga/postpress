"use client";

import { useState } from "react";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useIsMockEmpty, useMockQuery } from "@/lib/hooks/use-mock-query";
import { formatDateId } from "@/lib/format";
import { MOCK_PLANS, MOCK_PLANS_EMPTY } from "@/lib/mock/posts";
import type { Plan } from "@/lib/mock/types";
import { PlanModal } from "./PlanModal";

export function PlanView() {
  const isEmpty = useIsMockEmpty();
  const { data: seedPlans, loading } = useMockQuery(isEmpty ? MOCK_PLANS_EMPTY : MOCK_PLANS);
  const [plans, setPlans] = useState<Plan[]>(seedPlans);
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useRegisterTopbarAction("Tambah tema", () => {
    setEditingId(null);
    setModalOpen(true);
  });

  const editing = editingId ? (plans.find((p) => p.id === editingId) ?? null) : null;

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }
  function handleDelete(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast("Tema dihapus dari rencana.");
  }
  function handleSave(data: Omit<Plan, "id">, id?: string) {
    if (id) {
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("Tema diperbarui.");
    } else {
      setPlans((prev) =>
        [...prev, { ...data, id: `plan-${Date.now()}` }].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      );
      toast("Tema baru ditambahkan ke rencana.");
    }
  }

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Rencana konten</h1>
          <p>
            Tema yang sudah disusun untuk minggu berjalan. LLM memakai ini sebagai bahan sebelum
            menulis tiap slide.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="plan-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="plan-card" key={i}>
              <SkeletonBlock className="h-4 w-[62px]" />
              <div className="plan-card__body">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/2 mt-[7px]" />
              </div>
            </div>
          ))}
        </div>
      ) : plans.length ? (
        <div className="plan-list">
          {plans.map((p) => (
            <div className="plan-card" key={p.id}>
              <div className="plan-card__date">{formatDateId(p.date)}</div>
              <div className="plan-card__body">
                <div className="plan-card__topic">{p.topic}</div>
                <div className="plan-card__angle">{p.angle || "Belum ada sudut pandang."}</div>
                <div className="plan-card__badges">
                  <span className="badge">{p.type}</span>
                  <span className="badge">{p.template}</span>
                </div>
              </div>
              <div className="plan-card__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(p.id)}>
                  Ubah
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(p.id)}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <strong>Belum ada tema</strong>
          <p>
            Rencana konten kosong untuk periode ini. Tambahkan tema supaya cron generate:daily
            punya bahan untuk ditulis.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setEditingId(null);
              setModalOpen(true);
            }}
          >
            Tambah tema
          </button>
        </div>
      )}

      <PlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSave={handleSave}
      />
    </section>
  );
}
