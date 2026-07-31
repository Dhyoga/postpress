"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { PersonaColors } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";

const COLOR_ROWS: { key: keyof PersonaColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "text", label: "Teks" },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function VisualPanel() {
  const { persona, setPersona } = usePersona();
  const toast = useToast();
  const [draft, setDraft] = useState(persona.visual);
  const [savedTag, setSavedTag] = useState("");

  function setColor(key: keyof PersonaColors, hex: string) {
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: hex } }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPersona((prev) => ({ ...prev, visual: draft }));
    setSavedTag("Tersimpan.");
    toast("Visual disimpan.");
    setTimeout(() => setSavedTag(""), 2500);
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <div className="settings-card__title">Visual</div>
      <p className="settings-card__desc">
        Warna dan tipografi yang nanti dipetakan ke template render. Format font untuk Satori
        wajib .ttf/.otf, bukan .woff2.
      </p>

      <div style={{ marginTop: 14 }}>
        {COLOR_ROWS.map(({ key, label }) => (
          <div className="color-row" key={key}>
            <input
              type="color"
              className="color-row__swatch"
              value={HEX_RE.test(draft.colors[key]) ? draft.colors[key] : "#000000"}
              onChange={(e) => setColor(key, e.target.value.toUpperCase())}
            />
            <span className="color-row__label">{label}</span>
            <input
              type="text"
              className="qa-input color-row__hex"
              value={draft.colors[key]}
              onChange={(e) => setColor(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="persona-sub">
        <div className="persona-sub__title">Tipografi</div>
        <div className="field__row" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="font-display">Font display</label>
            <input
              type="text"
              id="font-display"
              value={draft.fonts.display}
              onChange={(e) => setDraft((d) => ({ ...d, fonts: { ...d.fonts, display: e.target.value } }))}
            />
          </div>
          <div className="field">
            <label htmlFor="font-body">Font body</label>
            <input
              type="text"
              id="font-body"
              value={draft.fonts.body}
              onChange={(e) => setDraft((d) => ({ ...d, fonts: { ...d.fonts, body: e.target.value } }))}
            />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 280 }}>
          <label htmlFor="font-mono">Font mono</label>
          <input
            type="text"
            id="font-mono"
            value={draft.fonts.mono}
            onChange={(e) => setDraft((d) => ({ ...d, fonts: { ...d.fonts, mono: e.target.value } }))}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="visual-larangan">Larangan visual</label>
        <textarea
          id="visual-larangan"
          placeholder="mis. jangan pakai stock photo generik"
          value={draft.larangan}
          onChange={(e) => setDraft((d) => ({ ...d, larangan: e.target.value }))}
        />
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
