"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { useApi } from "@/lib/hooks/use-api";
import type { PostType } from "@/lib/mock/types";
import { usePosts } from "./PostsProvider";

type PostErrors = { date?: string; topic?: string };

export function NewPostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPost } = usePosts();
  const toast = useToast();
  const router = useRouter();
  const { data: templatesRes } = useApi<{ templates: Array<{ id: string; name: string }> }>("/api/templates");
  const templateOptions = useMemo(() => templatesRes?.templates ?? [], [templatesRes]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<PostType>("carousel");
  const [template, setTemplate] = useState("");
  const [errors, setErrors] = useState<PostErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) return;
    setDate("");
    setTime("19:00");
    setTopic("");
    setType("carousel");
    setTemplate("");
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!template && templateOptions.length > 0) setTemplate(templateOptions[0].id);
  }, [template, templateOptions]);

  function validate(): PostErrors {
    const next: PostErrors = {};
    if (!date) next.date = "Pilih tanggal tayang dulu.";
    if (!topic.trim()) next.topic = "Isi topik dulu.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !template) return;

    setSubmitting(true);
    try {
      await addPost({
        type,
        template,
        topic: topic.trim(),
        scheduledFor: new Date(`${date}T${time || "19:00"}:00+07:00`).toISOString(),
      });
      onClose();
      toast("Draf baru ditambahkan ke Antrean.");
      router.push("/dashboard/queue");
    } catch {
      toast("Gagal menambahkan post. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="post-modal-title">
      <ModalHeader
        titleId="post-modal-title"
        title="Buat post baru"
        subtitle="Masuk ke Antrean sebagai draf, belum di-generate."
        onClose={onClose}
      />
      <form className="modal__body" onSubmit={handleSubmit} noValidate>
        <div className="field__row">
          <div className="field">
            <label htmlFor="post-date">Tanggal tayang</label>
            <input
              type="date"
              id="post-date"
              className={errors.date ? "border-magenta" : undefined}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <FieldError message={errors.date} />
          </div>
          <div className="field">
            <label htmlFor="post-time">Jam</label>
            <input
              type="time"
              id="post-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="post-topic">Topik</label>
          <input
            type="text"
            id="post-topic"
            placeholder="mis. Template invoice yang bisa kamu pakai"
            className={errors.topic ? "border-magenta" : undefined}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <FieldError message={errors.topic} />
        </div>
        <div className="field__row">
          <div className="field">
            <label htmlFor="post-type">Jenis</label>
            <select id="post-type" value={type} onChange={(e) => setType(e.target.value as PostType)}>
              <option value="carousel">Carousel</option>
              <option value="single">Single post</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="post-template">Template</label>
            <select
              id="post-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              disabled={templateOptions.length === 0}
            >
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal__foot">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Menambahkan..." : "Tambah ke antrean"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
