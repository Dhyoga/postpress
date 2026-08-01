"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { KEYWORD_LABELS, type KeywordCategory } from "@/lib/mock/persona";
import { usePersona } from "../PersonaProvider";

const CATEGORIES: { key: KeywordCategory; label: string; placeholder: string }[] = [
  { key: "topik", label: "Kata kunci topik", placeholder: "mis. rate freelance" },
  { key: "hashtag", label: "Hashtag", placeholder: "mis. #freelanceindonesia" },
  { key: "larangan", label: "Kata terlarang", placeholder: "mis. dijamin kaya" },
  { key: "cta", label: "Bank CTA", placeholder: "mis. Simpan buat nanti" },
];

const KEYWORD_SHEETS: Record<string, KeywordCategory> = {
  "Kata Kunci Topik": "topik",
  Hashtag: "hashtag",
  "Kata Terlarang": "larangan",
  "Bank CTA": "cta",
};

function flattenKeywords(keywords: Record<KeywordCategory, string[]>) {
  return (Object.entries(keywords) as [KeywordCategory, string[]][]).flatMap(([category, values]) =>
    values.map((value) => ({ category, value })),
  );
}

export function KataKunciPanel() {
  const { keywords, saveKeywords, loading } = usePersona();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [inputs, setInputs] = useState<Record<KeywordCategory, string>>({
    topik: "",
    hashtag: "",
    larangan: "",
    cta: "",
  });

  async function addKeyword(cat: KeywordCategory) {
    const value = inputs[cat].trim();
    if (!value) {
      toast(`Isi ${KEYWORD_LABELS[cat]} dulu sebelum menambah.`);
      return;
    }
    if (keywords[cat].includes(value)) {
      setInputs((prev) => ({ ...prev, [cat]: "" }));
      return;
    }
    setBusy(true);
    try {
      const next = { ...keywords, [cat]: [...keywords[cat], value] };
      await saveKeywords(flattenKeywords(next));
      setInputs((prev) => ({ ...prev, [cat]: "" }));
    } catch {
      toast("Gagal menyimpan kata kunci. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function removeKeyword(cat: KeywordCategory, value: string) {
    setBusy(true);
    try {
      const next = { ...keywords, [cat]: keywords[cat].filter((v) => v !== value) };
      await saveKeywords(flattenKeywords(next));
    } catch {
      toast("Gagal menghapus kata kunci. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    Object.entries(KEYWORD_SHEETS).forEach(([sheetName, cat]) => {
      const header = sheetName.replace("Kata Kunci ", "");
      const rows = [[header], ...keywords[cat].map((v) => [v])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
    });
    XLSX.writeFile(wb, "template-kata-kunci-postpress.xlsx");
  }

  // Sesuai agents.md aturan #6: import Excel dan input manual berbagi jalur validasi
  // yang sama — hasil parse dikirim lewat saveKeywords(), fungsi yang sama dipakai
  // tombol "Tambah" manual, ke POST /api/persona/keywords.
  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!(data instanceof ArrayBuffer)) throw new Error("Buffer file tidak valid.");
        const wb = XLSX.read(new Uint8Array(data), { type: "array" });
        let sheetsFound = 0;
        const additions: Partial<Record<KeywordCategory, string[]>> = {};

        Object.entries(KEYWORD_SHEETS).forEach(([sheetName, cat]) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          sheetsFound++;
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
          const values = rows
            .slice(1)
            .map((row) => String(row[0] ?? "").trim())
            .filter(Boolean);
          if (values.length) additions[cat] = values;
        });

        let totalAdded = 0;
        const next = { ...keywords };
        (Object.keys(additions) as KeywordCategory[]).forEach((cat) => {
          const toAdd = (additions[cat] ?? []).filter((v) => !next[cat].includes(v));
          totalAdded += toAdd.length;
          next[cat] = [...next[cat], ...toAdd];
        });

        if (totalAdded > 0) {
          setBusy(true);
          try {
            await saveKeywords(flattenKeywords(next));
          } finally {
            setBusy(false);
          }
        }

        if (!sheetsFound) toast("Tidak ada sheet yang cocok. Pastikan nama sheet sesuai template.");
        else toast(`${totalAdded} kata kunci baru ditambahkan dari Excel.`);
      } catch {
        toast("Gagal membaca file. Pastikan formatnya sesuai template.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="settings-card">
      <div className="settings-card__title">Kata Kunci</div>
      <p className="settings-card__desc">
        Bahan ide, distribusi, dan batasan &mdash; dipisah supaya tidak jadi satu daftar campur
        aduk.
      </p>

      {loading
        ? CATEGORIES.map(({ key, label }) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <div className="tag-list">
                <SkeletonBlock className="h-6 w-24 rounded-full" />
                <SkeletonBlock className="h-6 w-32 rounded-full" />
              </div>
            </div>
          ))
        : CATEGORIES.map(({ key, label, placeholder }) => (
        <div className="field" key={key}>
          <label>{label}</label>
          <div className="tag-list">
            {keywords[key].length ? (
              keywords[key].map((v) => (
                <span className="chip-tag" key={v}>
                  {v}
                  <button type="button" disabled={busy} onClick={() => removeKeyword(key, v)}>
                    &times;
                  </button>
                </span>
              ))
            ) : (
              <span className="field__hint">Belum ada {KEYWORD_LABELS[key]}.</span>
            )}
          </div>
          <div className="quick-add">
            <input
              type="text"
              className="qa-input"
              placeholder={placeholder}
              value={inputs[key]}
              onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword(key);
                }
              }}
            />
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => addKeyword(key)}>
              Tambah
            </button>
          </div>
        </div>
      ))}

      <div className="excel-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={downloadTemplate}>
          Unduh template Excel
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} />
      </div>
    </div>
  );
}
