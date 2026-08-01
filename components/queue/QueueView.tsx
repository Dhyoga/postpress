"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { NewPostModal } from "@/components/posts/NewPostModal";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { TabBar } from "@/components/ui/TabBar";
import { StatusChip } from "@/components/ui/StatusChip";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { useTabQuery } from "@/lib/hooks/use-tab-query";
import { formatDateId } from "@/lib/format";
import { QUEUE_STATUSES } from "@/lib/status";
import { QueueDetailModal } from "./QueueDetailModal";

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "needs_review", label: "Menunggu review" },
  { value: "approved", label: "Disetujui" },
  { value: "draft", label: "Draf" },
] as const;

type QueueFilter = (typeof FILTERS)[number]["value"];
const FILTER_VALUES = FILTERS.map((f) => f.value) as QueueFilter[];

export function QueueView() {
  const { posts, loading } = usePosts();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useTabQuery<QueueFilter>("filter", FILTER_VALUES, "all");
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useRegisterTopbarAction("Buat post baru", () => setPostModalOpen(true));

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setDetailId(openId);
  }, [searchParams]);

  const queued = posts.filter((p) => QUEUE_STATUSES.includes(p.status));
  const rows = queued
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Antrean</h1>
          <p>Draf yang belum tayang &mdash; menunggu di-generate, ditinjau, atau dijadwalkan.</p>
        </div>
        <TabBar
          items={FILTERS}
          active={filter}
          onChange={(value) => setFilter(value as QueueFilter)}
          ariaLabel="Filter antrean"
        />
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
            {loading ? (
              <SkeletonTableRows rows={4} />
            ) : rows.length ? (
              rows.map((p) => (
                <tr key={p.id} className="is-clickable" onClick={() => setDetailId(p.id)}>
                  <td className="t-when">{formatDateId(p.date, p.time)}</td>
                  <td className="hide-sm t-type">{p.type}</td>
                  <td className="t-topic">{p.topic}</td>
                  <td>
                    <StatusChip status={p.status} />
                  </td>
                </tr>
              ))
            ) : queued.length ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <strong>Tidak ada yang cocok</strong>
                    <p>Tidak ada draf dengan status ini. Coba filter &quot;Semua&quot; untuk lihat semua draf di antrean.</p>
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <strong>Antrean kosong</strong>
                    <p>Belum ada draf yang menunggu. Buat post baru untuk mulai mengisi antrean.</p>
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

      <NewPostModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />
      <QueueDetailModal postId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}
