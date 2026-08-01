"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { usePosts } from "./PostsProvider";

const MAX_IMAGES = 10;
const MAX_CAPTION = 2200;

type PickedImage = { file: File; previewUrl: string };
type FormErrors = { images?: string; caption?: string };

export function ManualUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { uploadManualPost } = usePosts();
  const toast = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<PickedImage[]>([]);
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) return;
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setCaption("");
    setTagInput("");
    setTags([]);
    setDate("");
    setTime("19:00");
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleFilesPicked(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const picked = Array.from(fileList).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addTag() {
    const value = tagInput.trim().replace(/^#/, "");
    if (!value) return;
    if (!tags.includes(value)) setTags((prev) => [...prev, value]);
    setTagInput("");
  }

  function removeTag(value: string) {
    setTags((prev) => prev.filter((t) => t !== value));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (images.length === 0) next.images = "Unggah minimal satu gambar dulu.";
    else if (images.length > MAX_IMAGES) next.images = `Maksimal ${MAX_IMAGES} gambar per post.`;
    if (caption.length > MAX_CAPTION) next.caption = `Caption maksimal ${MAX_CAPTION} karakter.`;
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img.file, img.file.name));
      formData.append("caption", caption.trim());
      formData.append("hashtags", JSON.stringify(tags));
      if (date) {
        formData.append("scheduledFor", new Date(`${date}T${time || "19:00"}:00+07:00`).toISOString());
      }
      await uploadManualPost(formData);
      onClose();
      toast("Post manual diunggah, menunggu review.");
      router.push("/dashboard/queue");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengunggah post. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="manual-upload-title">
      <ModalHeader
        titleId="manual-upload-title"
        title="Upload manual"
        subtitle="Unggah gambar sendiri, tanpa LLM atau render template."
        onClose={onClose}
      />
      <form className="modal__body" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="manual-upload-input">Gambar (1 untuk single post, 2&ndash;{MAX_IMAGES} untuk carousel)</label>
          <input
            ref={fileInputRef}
            id="manual-upload-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => handleFilesPicked(e.target.files)}
          />
          <FieldError message={errors.images} />
          {images.length > 0 ? (
            <div className="upload-grid">
              {images.map((img, i) => (
                <div className="upload-thumb" key={img.previewUrl}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt={`Pratinjau ${i + 1}`} />
                  <div className="upload-thumb__order">{i + 1}</div>
                  <div className="upload-thumb__controls">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Naikkan urutan">
                      &uarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                      aria-label="Turunkan urutan"
                    >
                      &darr;
                    </button>
                    <button type="button" onClick={() => removeImage(i)} aria-label="Hapus gambar">
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="manual-upload-caption">Caption</label>
          <textarea
            id="manual-upload-caption"
            rows={4}
            maxLength={MAX_CAPTION}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis caption untuk post ini..."
          />
          <FieldError message={errors.caption} />
          <p className="field__hint">
            {caption.length}/{MAX_CAPTION} karakter
          </p>
        </div>

        <div className="field">
          <label htmlFor="manual-upload-tag">Tags</label>
          <div className="tag-list">
            {tags.length ? (
              tags.map((t) => (
                <span className="chip-tag" key={t}>
                  #{t}
                  <button type="button" onClick={() => removeTag(t)}>
                    &times;
                  </button>
                </span>
              ))
            ) : (
              <span className="field__hint">Belum ada tag.</span>
            )}
          </div>
          <div className="quick-add">
            <input
              type="text"
              id="manual-upload-tag"
              className="qa-input"
              placeholder="mis. freelance"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={addTag}>
              Tambah
            </button>
          </div>
        </div>

        <div className="field__row">
          <div className="field">
            <label htmlFor="manual-upload-date">Tanggal tayang (opsional)</label>
            <input type="date" id="manual-upload-date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="manual-upload-time">Jam</label>
            <input
              type="time"
              id="manual-upload-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date}
            />
          </div>
        </div>
        <p className="field__hint">
          Kalau tanggal dikosongkan, jadwal bisa diisi belakangan setelah post disetujui.
        </p>

        <div className="modal__foot">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Mengunggah..." : "Unggah post"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
