"use client";

import { useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { TabBar } from "@/components/ui/TabBar";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDateId } from "@/lib/format";
import { HistoryDetailModal } from "./HistoryDetailModal";

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "published", label: "Terbit" },
  { value: "failed", label: "Gagal" },
] as const;

type HistoryFilter = (typeof FILTERS)[number]["value"];

export function HistoryView() {
  const { posts } = usePosts();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = posts
    .filter((p) => p.status === "published" || p.status === "failed")
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Riwayat</h1>
          <p>Percobaan publikasi yang sudah selesai &mdash; berhasil tayang atau gagal.</p>
        </div>
        <TabBar
          items={FILTERS}
          active={filter}
          onChange={(value) => setFilter(value as HistoryFilter)}
          ariaLabel="Filter riwayat"
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Tayang</th>
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
                <td className="t-topic">
                  {p.topic}
                  {p.status === "failed" && p.error ? (
                    <span className="t-err">{p.error}</span>
                  ) : null}
                </td>
                <td>
                  <StatusChip status={p.status} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>
                <div className="empty">
                  <strong>Belum ada riwayat</strong>
                  <p>Tidak ada percobaan publikasi dengan status ini.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <HistoryDetailModal postId={detailId} onClose={() => setDetailId(null)} />
    </section>
  );
}
