"use client";

import { usePosts } from "@/components/posts/PostsProvider";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDateId } from "@/lib/format";

/** `post.error` bisa berisi kalimat ringkas + detail teknis provider (LLM)
 * dipisah newline — lihat `lib/llm/client.ts` `extractErrorDetail`. Pesan lama
 * (satu baris, tanpa detail) tetap didukung karena split ini no-op untuknya. */
function errorSummary(error: string): string {
  return error.split("\n", 1)[0];
}

function errorDetail(error: string): string | null {
  const idx = error.indexOf("\n");
  if (idx === -1) return null;
  const rest = error.slice(idx + 1).trim();
  return rest || null;
}

export function HistoryDetailModal({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const { posts, generatePost, publishNow } = usePosts();
  const toast = useToast();
  const post = postId ? (posts.find((p) => p.id === postId) ?? null) : null;

  async function handleRetry() {
    if (!post) return;
    // Post yang sudah punya slide berarti sempat lolos generate & disetujui —
    // gagalnya di tahap publish, jadi "Coba lagi" harus lanjut nyoba publish
    // lagi, bukan generate ulang dari nol (buang konten yang sudah oke).
    const isPublishRetry = post.slideKinds.length > 0;
    toast(isPublishRetry ? "Mencoba publish ulang ke Instagram..." : "Membuat ulang lewat LLM + render...");
    try {
      if (isPublishRetry) {
        await publishNow(post.id);
        toast("Berhasil dipublish ke Instagram.");
      } else {
        await generatePost(post.id);
        toast("Selesai dibuat ulang, masuk ke Antrean untuk direview.");
      }
    } catch (err) {
      const fallback = isPublishRetry ? "Gagal publish. Coba lagi." : "Gagal membuat ulang. Coba lagi.";
      toast(err instanceof Error && err.message ? err.message : fallback);
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
            {post.status === "failed" && post.error ? (
              <>
                <p className="alert">{errorSummary(post.error)}</p>
                {errorDetail(post.error) ? <pre className="alert-detail">{errorDetail(post.error)}</pre> : null}
              </>
            ) : null}
            <div className="timeline">
              {(post.logs ?? []).map((log, i) => (
                <div className="timeline__row" key={i}>
                  <span className="timeline__detail">{log.message}</span>
                  <span className="timeline__time">{log.time} WIB</span>
                  <span
                    className={log.ok ? "chip chip--approved" : "chip chip--failed"}
                    style={{ fontSize: 9.5 }}
                  >
                    {log.ok ? "ok" : "gagal"}
                  </span>
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
