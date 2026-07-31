"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import type { ContentMix } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";

const MIX_ROWS: { key: keyof ContentMix; label: string }[] = [
  { key: "edukasi", label: "Edukasi" },
  { key: "studiKasus", label: "Studi kasus" },
  { key: "promosi", label: "Promosi" },
  { key: "hiburan", label: "Hiburan" },
];

type BrandingErrors = { name?: string; mix?: string; frequency?: string };

export function BrandingPanel() {
  const { persona, setPersona, loading } = usePersona();
  const toast = useToast();
  const [draft, setDraft] = useState(persona.branding);
  const [savedTag, setSavedTag] = useState("");
  const [errors, setErrors] = useState<BrandingErrors>({});

  const mixSum = MIX_ROWS.reduce((sum, { key }) => sum + (draft.mix[key] || 0), 0);

  function handleMixChange(key: keyof ContentMix, value: number) {
    setDraft((prev) => ({ ...prev, mix: { ...prev.mix, [key]: value } }));
  }

  function validate(): BrandingErrors {
    const next: BrandingErrors = {};
    if (!draft.name.trim()) next.name = "Isi nama brand dulu.";
    const outOfRange = MIX_ROWS.some(({ key }) => draft.mix[key] < 0 || draft.mix[key] > 100);
    if (outOfRange) next.mix = "Tiap persentase bauran konten harus di antara 0 dan 100.";
    if (draft.frequency < 1 || draft.frequency > 21) {
      next.frequency = "Frekuensi posting harus di antara 1 dan 21 kali per minggu.";
    }
    return next;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPersona((prev) => ({ ...prev, branding: draft }));
    setSavedTag("Tersimpan.");
    toast("Branding disimpan.");
    setTimeout(() => setSavedTag(""), 2500);
  }

  if (loading) {
    return (
      <div className="settings-card">
        <div className="settings-card__title">Branding</div>
        <SkeletonBlock className="h-3 w-2/3 mt-2" />
        <SkeletonBlock className="h-10 w-full mt-4" />
        <SkeletonBlock className="h-10 w-full mt-4" />
        <SkeletonBlock className="h-20 w-full mt-4" />
      </div>
    );
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit} noValidate>
      <div className="settings-card__title">Branding</div>
      <p className="settings-card__desc">
        Identitas dasar brand: siapa kita, janji apa yang kita pegang, batasan gaya bahasa.
      </p>

      <div className="field__row">
        <div className="field">
          <label htmlFor="pb-name">Nama brand</label>
          <input
            type="text"
            id="pb-name"
            className={errors.name ? "border-magenta" : undefined}
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <FieldError message={errors.name} />
        </div>
        <div className="field">
          <label htmlFor="pb-tagline">Tagline</label>
          <input
            type="text"
            id="pb-tagline"
            value={draft.tagline}
            onChange={(e) => setDraft((p) => ({ ...p, tagline: e.target.value }))}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pb-positioning">Positioning</label>
        <textarea
          id="pb-positioning"
          placeholder="Kami bantu X melakukan Y dengan Z"
          value={draft.positioning}
          onChange={(e) => setDraft((p) => ({ ...p, positioning: e.target.value }))}
        />
      </div>
      <div className="field__row">
        <div className="field">
          <label htmlFor="pb-dos">Selalu lakukan</label>
          <textarea
            id="pb-dos"
            value={draft.dos}
            onChange={(e) => setDraft((p) => ({ ...p, dos: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="pb-donts">Hindari</label>
          <textarea
            id="pb-donts"
            value={draft.donts}
            onChange={(e) => setDraft((p) => ({ ...p, donts: e.target.value }))}
          />
        </div>
      </div>

      <div className="persona-sub">
        <div className="persona-sub__title">Bauran &amp; ritme konten</div>
        <p className="persona-sub__desc">
          Kompas acuan supaya rencana konten harian tidak melenceng. Total idealnya 100%.
        </p>

        <div style={{ marginTop: 14 }}>
          {MIX_ROWS.map(({ key, label }) => (
            <div className="mix-row" key={key}>
              <span className="mix-row__label">{label}</span>
              <div className="mix-row__bar-wrap">
                <div className="mix-row__bar" style={{ width: `${Math.min(draft.mix[key], 100)}%` }} />
              </div>
              <input
                type="number"
                min={0}
                max={100}
                className={`qa-input mix-row__value${errors.mix ? " border-magenta" : ""}`}
                value={draft.mix[key]}
                onChange={(e) => handleMixChange(key, Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>
          ))}
        </div>
        <p className={mixSum !== 100 ? "field__hint text-magenta" : "field__hint"}>
          {mixSum === 100 ? "Total 100% — pas." : `Total ${mixSum}%, idealnya 100%.`}
        </p>
        <FieldError message={errors.mix} />

        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="pb-frequency">Frekuensi posting / minggu</label>
          <input
            type="number"
            id="pb-frequency"
            className={errors.frequency ? "border-magenta" : undefined}
            min={1}
            max={21}
            value={draft.frequency}
            onChange={(e) =>
              setDraft((p) => ({ ...p, frequency: Number.parseInt(e.target.value, 10) || 0 }))
            }
          />
          <FieldError message={errors.frequency} />
        </div>
      </div>

      <div className="settings-card__foot">
        <button type="submit" className="btn btn--primary btn--sm">
          Simpan
        </button>
        <span className="saved-tag">{savedTag}</span>
      </div>
    </form>
  );
}
