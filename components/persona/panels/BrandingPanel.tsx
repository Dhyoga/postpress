"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { ContentMix } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";

const MIX_ROWS: { key: keyof ContentMix; label: string }[] = [
  { key: "edukasi", label: "Edukasi" },
  { key: "studiKasus", label: "Studi kasus" },
  { key: "promosi", label: "Promosi" },
  { key: "hiburan", label: "Hiburan" },
];

export function BrandingPanel() {
  const { persona, setPersona } = usePersona();
  const toast = useToast();
  const [draft, setDraft] = useState(persona.branding);
  const [savedTag, setSavedTag] = useState("");

  const mixSum = MIX_ROWS.reduce((sum, { key }) => sum + (draft.mix[key] || 0), 0);

  function handleMixChange(key: keyof ContentMix, value: number) {
    setDraft((prev) => ({ ...prev, mix: { ...prev.mix, [key]: value } }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPersona((prev) => ({ ...prev, branding: draft }));
    setSavedTag("Tersimpan.");
    toast("Branding disimpan.");
    setTimeout(() => setSavedTag(""), 2500);
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
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
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
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
                className="qa-input mix-row__value"
                value={draft.mix[key]}
                onChange={(e) => handleMixChange(key, Number.parseInt(e.target.value, 10) || 0)}
              />
            </div>
          ))}
        </div>
        <p className="field__hint" style={mixSum !== 100 ? { color: "#D4006E" } : undefined}>
          {mixSum === 100 ? "Total 100% — pas." : `Total ${mixSum}%, idealnya 100%.`}
        </p>

        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="pb-frequency">Frekuensi posting / minggu</label>
          <input
            type="number"
            id="pb-frequency"
            min={1}
            max={21}
            value={draft.frequency}
            onChange={(e) =>
              setDraft((p) => ({ ...p, frequency: Number.parseInt(e.target.value, 10) || 0 }))
            }
          />
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
