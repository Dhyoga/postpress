"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { NewPostModal } from "@/components/posts/NewPostModal";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { useToast } from "@/components/ui/Toast";
import { StatusChip } from "@/components/ui/StatusChip";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { SlideCard } from "@/components/slides/SlideCard";
import { useMockQuery } from "@/lib/hooks/use-mock-query";
import { TODAY_PROOF_SLIDES } from "@/lib/mock/proof-sheet";
import { DASHBOARD_STATS } from "@/lib/mock/dashboard-stats";
import { formatDateId } from "@/lib/format";
import { QUEUE_STATUSES } from "@/lib/status";

const FEATURED_POST_ID = "post1";

export function TodayView() {
  const { posts, loading: postsLoading, updateStatus } = usePosts();
  const { data: stats, loading: statsLoading } = useMockQuery(DASHBOARD_STATS);
  const { data: proofSlides, loading: slidesLoading } = useMockQuery(TODAY_PROOF_SLIDES);
  const toast = useToast();
  const router = useRouter();
  const [postModalOpen, setPostModalOpen] = useState(false);

  useRegisterTopbarAction("Buat post baru", () => setPostModalOpen(true));

  const loading = postsLoading || statsLoading || slidesLoading;
  const featured = posts.find((p) => p.id === FEATURED_POST_ID);
  const upcoming = posts
    .filter((p) => QUEUE_STATUSES.includes(p.status) && p.id !== FEATURED_POST_ID)
    .slice(0, 3);

  function handleApprove() {
    if (!featured) return;
    updateStatus(FEATURED_POST_ID, "approved");
    toast(`Disetujui, dijadwalkan tayang ${formatDateId(featured.date, featured.time)}.`);
  }
  function handleReject() {
    if (!featured) return;
    updateStatus(FEATURED_POST_ID, "draft");
    toast("Draf ditolak, dikembalikan ke status draf.");
  }
  function handleRegenerate() {
    toast("Membuat ulang draf... (disimulasikan, tidak memanggil LLM sungguhan)");
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
                <div className="proof__label eyebrow">Proof sheet &middot; Sabtu 1 Agustus</div>
                <h1 className="proof__title">{featured.topic}</h1>
              </div>
              <div className="proof__spacer" />
              <StatusChip status={featured.status} />
            </div>

            <div
              className="strip"
              tabIndex={0}
              role="group"
              aria-label="Pratinjau slide, geser untuk melihat semua"
            >
              {proofSlides.map((slide, i) => (
                <SlideCard key={i} content={slide} index={i + 1} total={proofSlides.length} />
              ))}
            </div>

            <div className="proof__body">
              <div>
                <p className="caption">{featured.caption}</p>
                <p className="caption__tags">{featured.tags}</p>
              </div>
              <div className="proof__side">
                <p className="proof__spec">
                  Template &nbsp; <b>{featured.template}</b>
                  <br />
                  Kanvas &nbsp;&nbsp;&nbsp; <b>1080 &times; 1350</b>
                  <br />
                  Slide &nbsp;&nbsp;&nbsp;&nbsp; <b>{proofSlides.length}</b>
                  <br />
                  Tayang &nbsp;&nbsp;&nbsp; <b>{formatDateId(featured.date, featured.time)} WIB</b>
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
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setPostModalOpen(true)}
            >
              Buat post baru
            </button>
          </div>
        )}

        <section>
          <div className="panel-head" style={{ marginBottom: 14 }}>
            <h1 style={{ fontSize: 19 }}>Berikutnya di antrean</h1>
            <Link href="/dashboard/queue" className="btn btn--quiet btn--sm">
              Lihat semua &rarr;
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Jadwal</th>
                  <th className="hide-sm">Jenis</th>
                  <th>Topik</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length ? (
                  upcoming.map((p) => (
                    <tr
                      key={p.id}
                      className="is-clickable"
                      onClick={() => router.push(`/dashboard/queue?open=${p.id}`)}
                    >
                      <td className="t-when">{formatDateId(p.date, p.time)}</td>
                      <td className="hide-sm t-type">{p.type}</td>
                      <td className="t-topic">{p.topic}</td>
                      <td>
                        <StatusChip status={p.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">
                        <strong>Antrean kosong</strong>
                        <p>Tidak ada draf lain yang menunggu. Tambahkan post baru kapan saja.</p>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => setPostModalOpen(true)}
                        >
                          Buat post baru
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <NewPostModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />
    </>
  );
}
