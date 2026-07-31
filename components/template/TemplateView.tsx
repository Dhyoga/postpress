"use client";

import { useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { MiniSlide } from "@/components/slides/MiniSlide";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useMockQuery } from "@/lib/hooks/use-mock-query";
import { BLOCKS, TEMPLATES } from "@/lib/mock/templates";
import type { TemplateId } from "@/lib/mock/types";
import { TemplateDetailModal } from "./TemplateDetailModal";

export function TemplateView() {
  const { posts, loading: postsLoading } = usePosts();
  const { data: templates, loading: templatesLoading } = useMockQuery(TEMPLATES);
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);
  const loading = postsLoading || templatesLoading;

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Template</h1>
          <p>
            Susunan slide yang dipakai saat merender. LLM cuma mengisi teks di slot ini &mdash;
            layoutnya sendiri sudah dikunci di kode.
          </p>
        </div>
      </div>

      <div className="tpl-note">
        <span>&#9432;</span>
        <span>
          <b>Kenapa tidak bisa diedit di sini:</b> Satori cuma mendukung subset CSS terbatas
          (flexbox saja, tanpa grid). Template yang digenerate bebas gampang jebol, jadi tiap
          layout ditulis dan diuji manual di kode. Untuk mengubah struktur, minta developer
          mengubahnya di <code>lib/render/templates/</code>.
        </span>
      </div>

      <div className="tpl-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div className="tpl-card" key={i}>
                <SkeletonBlock className="h-[130px] w-[52px] flex-none rounded-[3px]" />
                <div className="tpl-card__body">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-full mt-[10px]" />
                  <SkeletonBlock className="h-3 w-4/5 mt-2" />
                </div>
              </div>
            ))
          : templates.map((t) => {
          const usage = posts.filter((p) => p.template === t.id).length;
          const previewBlocks = t.blocks.slice(0, 4);
          return (
            <div className="tpl-card" key={t.id}>
              <div className="tpl-card__preview">
                {previewBlocks.map((b, i) => (
                  <MiniSlide key={i} kind={b} index={i + 1} total={t.blocks.length} />
                ))}
              </div>
              <div className="tpl-card__body">
                <div className="tpl-card__head">
                  <span className="tpl-card__name">{t.name}</span>
                  <span className="tpl-card__id">{t.id}</span>
                </div>
                <p className="tpl-card__desc">{t.desc}</p>
                <div className="tpl-card__meta">
                  <span className="badge">{t.kind}</span>
                  <span className="tpl-card__usage">dipakai di {usage} post</span>
                </div>
                <div className="tpl-specs">
                  {t.blocks.map((b, i) => {
                    const block = BLOCKS[b];
                    return (
                      <div className="tpl-spec-row" key={i}>
                        <span className="tpl-spec-row__block">{b}</span>
                        <span className="tpl-spec-row__fields">
                          {block.fields.map((f, fi) => (
                            <span key={f.name}>
                              {fi > 0 ? ", " : ""}
                              <b>{f.name}</b> &le;{f.limit}
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="tpl-card__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPreviewId(t.id)}
                  >
                    Lihat contoh
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TemplateDetailModal templateId={previewId} onClose={() => setPreviewId(null)} />
    </section>
  );
}
