"use client";

import { useCallback, useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { NewPostModal } from "@/components/posts/NewPostModal";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { useToast } from "@/components/ui/Toast";
import { StatusChip } from "@/components/ui/StatusChip";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { SlideCard } from "@/components/slides/SlideCard";
import { useApi } from "@/lib/hooks/use-api";
import { formatDateId } from "@/lib/format";
import type { PostStatus } from "@/lib/mock/types";
import type { ProofSlideContent } from "@/lib/mock/proof-sheet";

type Post = {
  id: string;
  topic: string;
  status: PostStatus;
  template: string;
  date?: string | null;
  time?: string | null;
  caption?: string | null;
  tags?: string | null;
  type?: string;
};

type DashboardStats = {
  label: string;
  value: string;
  meta: string;
  valueSuffix?: string;
};

export function TodayView() {
  const { loading: postsLoading, updateStatus, generatePost } = usePosts();
  const { data: statsRes, loading: statsLoading } = useApi<{ stats: DashboardStats[] }>("/api/dashboard/stats");
  const { data: proofRes, loading: slidesLoading, refetch: refetchProof } = useApi<{ post: Post | null; slides: ProofSlideContent[] }>(
    "/api/dashboard/proof-sheet",
  );
  const toast = useToast();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const [savingCaption, setSavingCaption] = useState(false);

  const openPostModal = useCallback(() => setPostModalOpen(true), []);
  useRegisterTopbarAction("Buat post baru", openPostModal);

  const loading = postsLoading || statsLoading || slidesLoading;
  const stats = statsRes?.stats ?? [];
  const proofSlides = proofRes?.slides ?? [];
  const featured = proofRes?.post ?? null;

  async function handleSaveCaption() {
    if (!featured || captionDraft === null) return;
    setSavingCaption(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(featured.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caption: captionDraft }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCaptionDraft(null);
      refetchProof();
      toast("Caption disimpan.");
    } catch {
      toast("Gagal menyimpan caption.");
    } finally {
      setSavingCaption(false);
    }
  }

  function handleApprove() {
    if (!featured) return;
    updateStatus(featured.id, "approved");
    toast(`Disetujui.`);
  }
  function handleReject() {
    if (!featured) return;
    updateStatus(featured.id, "needs_review");
    toast("Draf ditolak, dikembalikan ke status review.");
  }
  async function handleRegenerate() {
    if (!featured) return;
    toast("Membuat draf lewat LLM + render...");
    try {
      await generatePost(featured.id);
      toast("Draf selesai dibuat, siap direview.");
    } catch {
      toast("Gagal membuat draf. Coba lagi.");
    }
  }

  if (loading) {
    return (
      <section className="view">
        <section className="stats">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="stat" key={i}>
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-6 w-16 mt-[9px]" />
              <SkeletonBlock className="h-3 w-32 mt-1" />
            </div>
          ))}
        </section>
        <section className="proof">
          <div className="proof__head">
            <div>
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-7 w-72 mt-[9px]" />
            </div>
          </div>
          <div className="strip">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-[215px] w-[172px] flex-none rounded-[3px]" />
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <>
      <section className="view">
        <section className="stats">
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <div className="stat__label eyebrow">{stat.label}</div>
              <div className="stat__value">
                {stat.value} {stat.valueSuffix ? <em>{stat.valueSuffix}</em> : null}
              </div>
              <div className="stat__meta">{stat.meta}</div>
            </div>
          ))}
        </section>

        {featured ? (
          <section className="proof">
            <div className="proof__head">
              <div>
                <div className="proof__label eyebrow">Proof sheet</div>
                <h1 className="proof__title">{featured.topic}</h1>
              </div>
              <div className="proof__spacer" />
              <StatusChip status={featured.status} />
            </div>

            <div className="strip" tabIndex={0} role="group" aria-label="Pratinjau slide">
              {proofSlides.map((slide, i) => (
                <SlideCard key={i} content={slide} index={i + 1} total={proofSlides.length} />
              ))}
            </div>

            <div className="proof__body">
              <div>
                <textarea
                  className="caption caption--editable"
                  style={{ width: "100%", resize: "vertical", minHeight: 72 }}
                  value={captionDraft ?? featured.caption ?? ""}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  maxLength={2200}
                  aria-label="Caption"
                />
                {captionDraft !== null && captionDraft !== (featured.caption ?? "") ? (
                  <button type="button" className="btn btn--ghost btn--sm" disabled={savingCaption} onClick={handleSaveCaption}>
                    {savingCaption ? "Menyimpan..." : "Simpan caption"}
                  </button>
                ) : null}
                <p className="caption__tags">{featured.tags ?? ""}</p>
              </div>
              <div className="proof__side">
                <p className="proof__spec">
                  Template &nbsp; <b>{featured.template}</b>
                  <br />
                  Kanvas &nbsp;&nbsp;&nbsp; <b>1080 &times; 1350</b>
                  <br />
                  Slide &nbsp;&nbsp;&nbsp;&nbsp; <b>{proofSlides.length}</b>
                  <br />
                  Tayang &nbsp;&nbsp;&nbsp; <b>{featured.date ? formatDateId(featured.date, featured.time ?? "") : "-"}</b>
                </p>
                <button type="button" className="btn btn--primary" onClick={handleApprove}>
                  Setujui &amp; jadwalkan
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleRegenerate}>
                  Buat ulang
                </button>
                <button type="button" className="btn btn--quiet" onClick={handleReject}>
                  Tolak draf ini
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="empty">
            <strong>Belum ada draf untuk hari ini</strong>
            <p>
              Cron generate:daily belum jalan atau belum ada tema di rencana konten untuk
              tanggal ini. Buat post manual kalau mau langsung mulai.
            </p>
            <button type="button" className="btn btn--primary btn--sm" onClick={openPostModal}>
              Buat post baru
            </button>
          </div>
        )}
      </section>

      <NewPostModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />
    </>
  );
}
