"use client";

import { useState } from "react";
import { usePosts } from "@/components/posts/PostsProvider";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useApi } from "@/lib/hooks/use-api";
import { getTemplateInfo } from "./template-info";
import { TemplateDetailModal } from "./TemplateDetailModal";

export type TemplateRow = { id: string; name: string; slots: Record<string, number> };

export function TemplateView() {
  const { posts, loading: postsLoading } = usePosts();
  const { data, loading: templatesLoading } = useApi<{ templates: TemplateRow[] }>("/api/templates");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const loading = postsLoading || templatesLoading;
  const templates = data?.templates ?? [];

  return (
    <section className="view">
      <div className="panel-head">
        <div>
          <h1>Template</h1>
          <p>
            Slot teks tiap template yang dipakai saat merender. LLM cuma mengisi teks di slot
            ini &mdash; layoutnya sendiri sudah dikunci di kode.
          </p>
        </div>
      </div>

      <div className="tpl-note">
        <span>&#9432;</span>
        <span>
          <b>Kenapa tidak bisa diedit di sini:</b> Satori cuma mendukung subset CSS terbatas
          (flexbox saja, tanpa grid). Template yang digenerate bebas gampang jebol, jadi tiap
          layout ditulis dan diuji manual di kode. Untuk mengubah struktur, minta developer
          mengubahnya di <code>lib/render/templates/</code>. Post carousel selalu memakai
          kerangka tetap cover &rarr; point &rarr; point &rarr; point &rarr; cta; post single
          memakai salah satu template di bawah berdiri sendiri.
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
              const info = getTemplateInfo(t.id);
              const usage = posts.filter((p) => p.template === t.id).length;
              const previewKind = t.id === "quote" ? "point" : t.id;
              return (
                <div className="tpl-card" key={t.id}>
                  <div className="tpl-card__preview">
                    <div className={`mini-slide mini-slide--${previewKind}`}>
                      <div className="mini-slide__k">1/1</div>
                      <div className="mini-slide__h">{t.name}</div>
                    </div>
                  </div>
                  <div className="tpl-card__body">
                    <div className="tpl-card__head">
                      <span className="tpl-card__name">{t.name}</span>
                      <span className="tpl-card__id">{t.id}</span>
                    </div>
                    <p className="tpl-card__desc">{info.desc}</p>
                    <div className="tpl-card__meta">
                      <span className="tpl-card__usage">dipakai di {usage} post</span>
                    </div>
                    <div className="tpl-specs">
                      <div className="tpl-spec-row">
                        <span className="tpl-spec-row__block">{t.id}</span>
                        <span className="tpl-spec-row__fields">
                          {Object.entries(t.slots).map(([name, max], fi) => (
                            <span key={name}>
                              {fi > 0 ? ", " : ""}
                              <b>{name}</b> &le;{max}
                            </span>
                          ))}
                        </span>
                      </div>
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

      <TemplateDetailModal
        template={templates.find((t) => t.id === previewId) ?? null}
        onClose={() => setPreviewId(null)}
      />
    </section>
  );
}
