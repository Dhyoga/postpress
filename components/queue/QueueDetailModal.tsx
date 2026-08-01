"use client";

import { usePosts } from "@/components/posts/PostsProvider";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MiniSlide } from "@/components/slides/MiniSlide";
import { formatDateId } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";

export function QueueDetailModal({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const { posts, updateStatus, removePost, generatePost } = usePosts();
  const toast = useToast();
  const post = postId ? (posts.find((p) => p.id === postId) ?? null) : null;

  function handleApprove() {
    if (!post) return;
    updateStatus(post.id, "approved");
    toast(`Disetujui, dijadwalkan tayang ${formatDateId(post.date, post.time)}.`);
    onClose();
  }
  function handleUnapprove() {
    if (!post) return;
    updateStatus(post.id, "needs_review");
    toast("Persetujuan dibatalkan, kembali ke review.");
    onClose();
  }
  function handleReject() {
    if (!post) return;
    updateStatus(post.id, "draft");
    toast("Draf ditolak, dikembalikan ke status draf.");
    onClose();
  }
  async function handleRegenerate() {
    if (!post) return;
    toast("Membuat draf lewat LLM + render...");
    try {
      await generatePost(post.id);
      toast("Draf selesai dibuat, siap direview.");
    } catch {
      toast("Gagal membuat draf. Coba lagi.");
    }
    onClose();
  }
  function handleDelete() {
    if (!post) return;
    removePost(post.id);
    toast("Draf dihapus dari antrean.");
    onClose();
  }

  return (
    <Modal open={!!post} onClose={onClose} labelledBy="qd-title">
      {post ? (
        <>
          <ModalHeader
            titleId="qd-title"
            title={post.topic}
            subtitle={`${formatDateId(post.date, post.time)} · ${post.type}`}
            onClose={onClose}
          />
          <div className="modal__body">
            <div className="mini-strip">
              {post.slideKinds.map((kind, i) => (
                <MiniSlide key={i} kind={kind} index={i + 1} total={post.slideKinds.length} />
              ))}
            </div>
            <p className="caption" style={{ fontSize: 13, maxWidth: "none" }}>
              {post.caption}
            </p>
            <p className="proof__spec" style={{ marginTop: 14 }}>
              Template &nbsp; <b>{post.template}</b>
              <br />
              Status &nbsp;&nbsp;&nbsp; <b>{STATUS_LABEL[post.status]}</b>
            </p>
          </div>
          <div className="modal__foot">
            {post.status === "needs_review" ? (
              <>
                <button type="button" className="btn btn--primary" onClick={handleApprove}>
                  Setujui &amp; jadwalkan
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleRegenerate}>
                  Buat ulang
                </button>
                <button type="button" className="btn btn--quiet" onClick={handleReject}>
                  Tolak draf ini
                </button>
              </>
            ) : post.status === "approved" ? (
              <button type="button" className="btn btn--ghost" onClick={handleUnapprove}>
                Batalkan persetujuan
              </button>
            ) : post.status === "draft" ? (
              <>
                <button type="button" className="btn btn--primary" onClick={handleRegenerate}>
                  Generate sekarang
                </button>
                <button type="button" className="btn btn--danger" onClick={handleDelete}>
                  Hapus draf
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
