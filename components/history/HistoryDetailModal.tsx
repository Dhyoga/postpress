"use client";

import { usePosts } from "@/components/posts/PostsProvider";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDateId } from "@/lib/format";

export function HistoryDetailModal({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const { posts, generatePost } = usePosts();
  const toast = useToast();
  const post = postId ? (posts.find((p) => p.id === postId) ?? null) : null;

  async function handleRetry() {
    if (!post) return;
    toast("Membuat ulang lewat LLM + render...");
    try {
      await generatePost(post.id);
      toast("Selesai dibuat ulang, masuk ke Antrean untuk direview.");
    } catch {
      toast("Gagal membuat ulang. Coba lagi.");
    }
    onClose();
  }

  return (
    <Modal open={!!post} onClose={onClose} labelledBy="hd-title">
      {post ? (
        <>
          <ModalHeader
            titleId="hd-title"
            title={post.topic}
            subtitle={`${formatDateId(post.date, post.time)} · ${post.type} · ${post.template}`}
            onClose={onClose}
          />
          <div className="modal__body">
            {post.status === "failed" && post.error ? <p className="alert">{post.error}</p> : null}
            <div className="timeline">
              {(post.logs ?? []).map((log, i) => (
                <div className="timeline__row" key={i}>
                  <span className="timeline__phase">{log.phase}</span>
                  <span className="timeline__time">{log.time}</span>
                  <span
                    className={log.ok ? "chip chip--approved" : "chip chip--failed"}
                    style={{ fontSize: 9.5 }}
                  >
                    {log.ok ? "ok" : "gagal"}
                  </span>
                  <span className="timeline__detail">{log.detail ?? ""}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="modal__foot">
            {post.status === "published" ? (
              <a
                className="btn btn--ghost"
                href={post.igLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat di Instagram
              </a>
            ) : post.status === "failed" ? (
              <button type="button" className="btn btn--primary" onClick={handleRetry}>
                Coba lagi
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
