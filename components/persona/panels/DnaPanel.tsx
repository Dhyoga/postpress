"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import type { GayaJudul, IstilahAsing, Sapaan, VoicePair } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";

export function DnaPanel() {
  const { persona, setPersona, loading } = usePersona();
  const toast = useToast();
  const dna = persona.dna;

  const [pillarInput, setPillarInput] = useState("");
  const [draft, setDraft] = useState({
    values: dna.values,
    sapaan: dna.sapaan,
    istilahAsing: dna.istilahAsing,
    formatTanggal: dna.formatTanggal,
    formatAngka: dna.formatAngka,
    gayaJudul: dna.gayaJudul,
  });
  const [savedTag, setSavedTag] = useState("");

  function addPillar() {
    const value = pillarInput.trim();
    if (!value) {
      toast("Isi sifat suara dulu sebelum menambah.");
      return;
    }
    setPersona((prev) =>
      prev.dna.pillars.includes(value)
        ? prev
        : { ...prev, dna: { ...prev.dna, pillars: [...prev.dna.pillars, value] } },
    );
    setPillarInput("");
  }
  function removePillar(value: string) {
    setPersona((prev) => ({
      ...prev,
      dna: { ...prev.dna, pillars: prev.dna.pillars.filter((p) => p !== value) },
    }));
  }
  function addPair() {
    setPersona((prev) => ({
      ...prev,
      dna: { ...prev.dna, pairs: [...prev.dna.pairs, { do: "", dont: "" }] },
    }));
  }
  function removePair(index: number) {
    setPersona((prev) => ({
      ...prev,
      dna: { ...prev.dna, pairs: prev.dna.pairs.filter((_, i) => i !== index) },
    }));
  }
  function updatePair(index: number, field: keyof VoicePair, value: string) {
    setPersona((prev) => ({
      ...prev,
      dna: {
        ...prev.dna,
        pairs: prev.dna.pairs.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
      },
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPersona((prev) => ({ ...prev, dna: { ...prev.dna, ...draft } }));
    setSavedTag("Tersimpan.");
    toast("DNA disimpan.");
    setTimeout(() => setSavedTag(""), 2500);
  }

  if (loading) {
    return (
      <div className="settings-card">
        <div className="settings-card__title">DNA</div>
        <SkeletonBlock className="h-3 w-2/3 mt-2" />
        <SkeletonBlock className="h-6 w-24 mt-4 rounded-full" />
        <SkeletonBlock className="h-20 w-full mt-4" />
      </div>
    );
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <div className="settings-card__title">DNA</div>
      <p className="settings-card__desc">
        Kepribadian suara brand. Contoh berpasangan lebih berguna daripada kata sifat sendirian.
      </p>

      <div className="field">
        <label>Sifat suara</label>
        <div className="tag-list">
          {dna.pillars.length ? (
            dna.pillars.map((p) => (
              <span className="chip-tag" key={p}>
                {p}
                <button type="button" onClick={() => removePillar(p)}>
                  &times;
                </button>
              </span>
            ))
          ) : (
            <span className="field__hint">Belum ada. Tambahkan minimal 3 sifat.</span>
          )}
        </div>
        <div className="quick-add">
          <input
            type="text"
            className="qa-input"
            placeholder="mis. Blak-blakan"
            value={pillarInput}
            onChange={(e) => setPillarInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPillar();
              }
            }}
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={addPillar}>
            Tambah
          </button>
        </div>
      </div>

      <div className="field">
        <label>Contoh gaya bicara</label>
        <div>
          {dna.pairs.length ? (
            dna.pairs.map((pair, i) => (
              <div className="dnd-pair" key={i}>
                <div>
                  <label className="dnd-pair__label dnd-pair__label--do">Begini gaya kita</label>
                  <textarea value={pair.do} onChange={(e) => updatePair(i, "do", e.target.value)} />
                </div>
                <div>
                  <label className="dnd-pair__label dnd-pair__label--dont">Bukan gaya kita</label>
                  <textarea
                    value={pair.dont}
                    onChange={(e) => updatePair(i, "dont", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--danger btn--sm dnd-pair__remove"
                  onClick={() => removePair(i)}
                >
                  Hapus contoh
                </button>
              </div>
            ))
          ) : (
            <p className="field__hint">Belum ada contoh.</p>
          )}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addPair}>
          + Tambah contoh
        </button>
      </div>

      <div className="field">
        <label htmlFor="dna-values">Nilai inti</label>
        <textarea
          id="dna-values"
          value={draft.values}
          onChange={(e) => setDraft((d) => ({ ...d, values: e.target.value }))}
        />
      </div>

      <div className="persona-sub">
        <div className="persona-sub__title">Bahasa &amp; gaya penulisan</div>
        <p className="persona-sub__desc">
          Mekanik penulisan, bukan kepribadian &mdash; ini yang bikin konten kerasa konsisten
          walau topiknya beda-beda.
        </p>

        <div className="field__row" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="dna-sapaan">Sapaan pembaca</label>
            <select
              id="dna-sapaan"
              value={draft.sapaan}
              onChange={(e) => setDraft((d) => ({ ...d, sapaan: e.target.value as Sapaan }))}
            >
              <option value="kamu">Kamu</option>
              <option value="anda">Anda</option>
              <option value="campur">Campur sesuai konteks</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="dna-istilah">Istilah asing</label>
            <select
              id="dna-istilah"
              value={draft.istilahAsing}
              onChange={(e) =>
                setDraft((d) => ({ ...d, istilahAsing: e.target.value as IstilahAsing }))
              }
            >
              <option value="pertahankan">Boleh dipertahankan</option>
              <option value="indonesia">Diindonesiakan semua</option>
              <option value="campur">Campur wajar</option>
            </select>
          </div>
        </div>
        <div className="field__row">
          <div className="field">
            <label htmlFor="dna-format-tanggal">Contoh format tanggal</label>
            <input
              type="text"
              id="dna-format-tanggal"
              placeholder="mis. 1 Agu 2026"
              value={draft.formatTanggal}
              onChange={(e) => setDraft((d) => ({ ...d, formatTanggal: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="dna-format-angka">Contoh format angka</label>
            <input
              type="text"
              id="dna-format-angka"
              placeholder="mis. Rp150.000"
              value={draft.formatAngka}
              onChange={(e) => setDraft((d) => ({ ...d, formatAngka: e.target.value }))}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="dna-gaya-judul">Gaya judul slide</label>
          <select
            id="dna-gaya-judul"
            value={draft.gayaJudul}
            onChange={(e) => setDraft((d) => ({ ...d, gayaJudul: e.target.value as GayaJudul }))}
          >
            <option value="sentence">Sentence case &mdash; &quot;Cara menghitung rate&quot;</option>
            <option value="title">Title Case &mdash; &quot;Cara Menghitung Rate&quot;</option>
          </select>
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
