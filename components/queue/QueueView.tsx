"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { NewPostModal } from "@/components/posts/NewPostModal";
import { useRegisterTopbarAction } from "@/components/dashboard/TopbarAction";
import { TabBar } from "@/components/ui/TabBar";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateId } from "@/lib/format";
import { QUEUE_STATUSES } from "@/lib/status";
import { QueueDetailModal } from "./QueueDetailModal";

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "review", label: "Menunggu review" },
  { value: "approved", label: "Disetujui" },
  { value: "draft", label: "Draf" },
] as const;

type QueueFilter = (typeof FILTERS)[number]["value"];

export function QueueView() {
  const { posts } = usePosts();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useRegisterTopbarAction("Buat post baru", () => setPostModalOpen(true));

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setDetailId(openId);
  }, [searchParams]);

  const rows = posts
    .filter((p) => QUEUE_STATUSES.includes(p.status))
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
          {rows.length ? (
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
          ) : (
            <tr>
              <td colSpan={4}>
                <div className="empty">
                  <strong>Tidak ada yang cocok</strong>
                  <p>Tidak ada draf dengan status ini di antrean.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <NewPostModal open={postModalOpen} onClose={() => setPostModalOpen(false)} />
      <QueueDetailModal postId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}
