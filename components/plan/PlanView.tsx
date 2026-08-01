"use client";

import { useCallback, useMemo, useState } from "react";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/hooks/use-api";
import { formatDateId } from "@/lib/format";
import type { Theme } from "@/lib/llm/schemas/plan";
import { PlanModal } from "./PlanModal";

type ContentPlanRow = { id: string; periodStart: string; periodEnd: string; themes: Theme[] };

type PlanRow = Theme & { rowId: string; planId: string; themeIndex: number };

function flattenPlans(plans: ContentPlanRow[]): PlanRow[] {
  const rows: PlanRow[] = [];
  for (const plan of plans) {
    plan.themes.forEach((theme, themeIndex) => {
      rows.push({ ...theme, rowId: `${plan.id}:${themeIndex}`, planId: plan.id, themeIndex });
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function PlanView() {
  const { data, loading, refetch } = useApi<{ plans: ContentPlanRow[] }>("/api/plans");
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const plans = useMemo(() => data?.plans ?? [], [data]);
  const rows = useMemo(() => flattenPlans(plans), [plans]);
  const editing = editingRowId ? (rows.find((r) => r.rowId === editingRowId) ?? null) : null;

  const openAdd = useCallback(() => {
    setEditingRowId(null);
    setModalOpen(true);
  }, []);
  useRegisterTopbarAction("Tambah tema", openAdd);

  function openEdit(rowId: string) {
    setEditingRowId(rowId);
    setModalOpen(true);
  }

  async function handleDelete(row: PlanRow) {
    const plan = plans.find((p) => p.id === row.planId);
    if (!plan) return;
    const nextThemes = plan.themes.filter((_, i) => i !== row.themeIndex);
    try {
      const res =
        nextThemes.length === 0
          ? await fetch(`/api/plans/${row.planId}`, { method: "DELETE" })
          : await fetch(`/api/plans/${row.planId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ themes: nextThemes }),
            });
      if (!res.ok) throw new Error(String(res.status));
      toast("Tema dihapus dari rencana.");
      refetch();
    } catch {
      toast("Gagal menghapus tema.");
    }
  }

  async function handleSave(theme: Theme) {
    try {
      if (editing) {
        const plan = plans.find((p) => p.id === editing.planId);
        if (!plan) throw new Error("Rencana tidak ditemukan");
        const nextThemes = plan.themes.map((t, i) => (i === editing.themeIndex ? theme : t));
        const res = await fetch(`/api/plans/${editing.planId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ themes: nextThemes }),
        });
        if (!res.ok) throw new Error(String(res.status));
        toast("Tema diperbarui.");
      } else {
        const iso = new Date(`${theme.date}T00:00:00.000Z`).toISOString();
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ periodStart: iso, periodEnd: iso, themes: [theme] }),
        });
        if (!res.ok) throw new Error(String(res.status));
        toast("Tema baru ditambahkan ke rencana.");
      }
      refetch();
    } catch {
      toast("Gagal menyimpan tema.");
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
      ) : rows.length ? (
        <div className="plan-list">
          {rows.map((row) => (
            <div className="plan-card" key={row.rowId}>
              <div className="plan-card__date">{formatDateId(row.date)}</div>
              <div className="plan-card__body">
                <div className="plan-card__topic">{row.topic}</div>
                <div className="plan-card__angle">{row.angle || "Belum ada sudut pandang."}</div>
                <div className="plan-card__badges">
                  <span className="badge">{row.type}</span>
                  <span className="badge">{row.template}</span>
                </div>
              </div>
              <div className="plan-card__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(row.rowId)}>
                  Ubah
                </button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDelete(row)}>
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
          <button type="button" className="btn btn--primary btn--sm" onClick={openAdd}>
            Tambah tema
          </button>
        </div>
      )}

      <PlanModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} onSave={handleSave} />
    </section>
  );
}
