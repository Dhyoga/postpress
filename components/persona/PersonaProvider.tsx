"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useApi, usePostMutation } from "@/lib/hooks/use-api";
import type {
  PersonaState,
  Segment,
  Keywords,
  KeywordCategory,
  ContentMix,
  VoicePair,
  Sapaan,
  IstilahAsing,
  GayaJudul,
  PersonaColors,
  PersonaFonts,
} from "@/lib/mock/persona";

const EMPTY_PERSONA: PersonaState = {
  branding: {
    name: "",
    tagline: "",
    positioning: "",
    dos: "",
    donts: "",
    mix: { edukasi: 0, studiKasus: 0, promosi: 0, hiburan: 0 },
    frequency: 0,
  },
  dna: {
    pillars: [],
    pairs: [],
    values: "",
    sapaan: "kamu",
    istilahAsing: "campur",
    formatTanggal: "",
    formatAngka: "",
    gayaJudul: "sentence",
  },
  visual: {
    colors: { primary: "#000000", secondary: "#000000", accent: "#000000", background: "#FFFFFF", text: "#000000" },
    fonts: { display: "", body: "", mono: "" },
    larangan: "",
  },
};

const EMPTY_KEYWORDS: Keywords = { topik: [], hashtag: [], larangan: [], cta: [] };

// Bentuk field flat tabel `personas` (lib/db/schema.ts), dipakai apa adanya oleh
// GET/POST /api/persona. UI memakai struktur bersarang (branding/dna/visual) yang
// lebih enak dipetakan ke tab-tab form — dua fungsi di bawah menjembatani keduanya
// supaya panel Branding/DNA/Visual tidak perlu tahu bentuk kolom database.
type PersonaApiFields = {
  id?: string;
  brandName?: string | null;
  tagline?: string | null;
  positioning?: string | null;
  dos?: string | null;
  donts?: string | null;
  contentMix?: Partial<ContentMix> | null;
  postFrequency?: number | null;
  voicePillars?: string[] | null;
  voicePairs?: VoicePair[] | null;
  coreValues?: string | null;
  sapaan?: Sapaan | null;
  istilahAsing?: IstilahAsing | null;
  formatTanggalContoh?: string | null;
  formatAngkaContoh?: string | null;
  gayaJudul?: GayaJudul | null;
  colors?: Partial<PersonaColors> | null;
  fonts?: Partial<PersonaFonts> | null;
  visualLarangan?: string | null;
};

function flatToNested(flat: PersonaApiFields): PersonaState {
  return {
    branding: {
      name: flat.brandName ?? "",
      tagline: flat.tagline ?? "",
      positioning: flat.positioning ?? "",
      dos: flat.dos ?? "",
      donts: flat.donts ?? "",
      mix: { ...EMPTY_PERSONA.branding.mix, ...(flat.contentMix ?? {}) },
      frequency: flat.postFrequency ?? 0,
    },
    dna: {
      pillars: flat.voicePillars ?? [],
      pairs: flat.voicePairs ?? [],
      values: flat.coreValues ?? "",
      sapaan: flat.sapaan ?? "kamu",
      istilahAsing: flat.istilahAsing ?? "campur",
      formatTanggal: flat.formatTanggalContoh ?? "",
      formatAngka: flat.formatAngkaContoh ?? "",
      gayaJudul: flat.gayaJudul ?? "sentence",
    },
    visual: {
      colors: { ...EMPTY_PERSONA.visual.colors, ...(flat.colors ?? {}) },
      fonts: { ...EMPTY_PERSONA.visual.fonts, ...(flat.fonts ?? {}) },
      larangan: flat.visualLarangan ?? "",
    },
  };
}

function nestedToFlat(nested: PersonaState): Omit<PersonaApiFields, "id"> {
  return {
    brandName: nested.branding.name,
    tagline: nested.branding.tagline,
    positioning: nested.branding.positioning,
    dos: nested.branding.dos,
    donts: nested.branding.donts,
    contentMix: nested.branding.mix,
    postFrequency: nested.branding.frequency,
    voicePillars: nested.dna.pillars,
    voicePairs: nested.dna.pairs,
    coreValues: nested.dna.values,
    sapaan: nested.dna.sapaan,
    istilahAsing: nested.dna.istilahAsing,
    formatTanggalContoh: nested.dna.formatTanggal,
    formatAngkaContoh: nested.dna.formatAngka,
    gayaJudul: nested.dna.gayaJudul,
    colors: nested.visual.colors,
    fonts: nested.visual.fonts,
    visualLarangan: nested.visual.larangan,
  };
}

type SegmentRow = { id: string; name: string; tier: string | null; description: string | null; painPoint: string | null; need: string | null };
type KeywordRow = { id: string; category: KeywordCategory; value: string };

function groupKeywords(rows: KeywordRow[]): Keywords {
  const next: Keywords = { topik: [], hashtag: [], larangan: [], cta: [] };
  for (const row of rows) {
    next[row.category] = [...next[row.category], row.value];
  }
  return next;
}

type PersonaContextValue = {
  persona: PersonaState;
  setPersona: React.Dispatch<React.SetStateAction<PersonaState>>;
  segments: Segment[];
  keywords: Keywords;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => void;
  savePersona: (partial: Partial<PersonaState>) => Promise<void>;
  saveSegments: (items: Segment[]) => Promise<void>;
  saveKeywords: (items: Array<{ category: KeywordCategory; value: string }>) => Promise<void>;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const { data: personaRes, loading: personaLoading, refetch: refetchPersona } = useApi<{ persona: PersonaApiFields | null }>("/api/persona");
  const { data: segmentsRes, loading: segmentsLoading, refetch: refetchSegments } = useApi<{ segments: SegmentRow[] }>(
    "/api/persona/segments",
  );
  const { data: keywordsRes, loading: keywordsLoading, refetch: refetchKeywords } = useApi<{ keywords: KeywordRow[] }>(
    "/api/persona/keywords",
  );

  const [persona, setPersona] = useState<PersonaState>(EMPTY_PERSONA);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [keywords, setKeywords] = useState<Keywords>(EMPTY_KEYWORDS);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const loading = personaLoading || segmentsLoading || keywordsLoading;

  useEffect(() => {
    if (personaRes?.persona) {
      setPersona(flatToNested(personaRes.persona));
      if (personaRes.persona.id) setPersonaId(personaRes.persona.id);
    }
  }, [personaRes]);

  useEffect(() => {
    if (segmentsRes?.segments) {
      setSegments(
        segmentsRes.segments.map((s) => ({
          id: s.id,
          name: s.name,
          tier: (s.tier as Segment["tier"]) ?? "Sekunder",
          description: s.description ?? "",
          painPoint: s.painPoint ?? "",
          need: s.need ?? "",
        })),
      );
    }
  }, [segmentsRes]);

  useEffect(() => {
    if (keywordsRes?.keywords) setKeywords(groupKeywords(keywordsRes.keywords));
  }, [keywordsRes]);

  const personaMutate = usePostMutation<Record<string, unknown>, { persona: PersonaApiFields }>();
  const segmentsMutate = usePostMutation<{ personaId: string; items: unknown[] }, { segments: SegmentRow[] }>();
  const keywordsMutate = usePostMutation<{ personaId: string; items: unknown[] }, { keywords: KeywordRow[] }>();

  const refresh = useCallback(() => {
    refetchPersona();
    refetchSegments();
    refetchKeywords();
  }, [refetchPersona, refetchSegments, refetchKeywords]);

  async function savePersona(partial: Partial<PersonaState>) {
    const merged: PersonaState = {
      branding: { ...persona.branding, ...partial.branding },
      dna: { ...persona.dna, ...partial.dna },
      visual: { ...persona.visual, ...partial.visual },
    };
    const res = await personaMutate.mutate("/api/persona", nestedToFlat(merged));
    if (!res?.persona) throw new Error(personaMutate.error ?? "Gagal menyimpan persona");
    setPersona(flatToNested(res.persona));
    if (res.persona.id) setPersonaId(res.persona.id);
  }

  async function ensurePersonaId(): Promise<string> {
    if (personaId) return personaId;
    const res = await personaMutate.mutate("/api/persona", nestedToFlat(persona));
    if (!res?.persona?.id) throw new Error(personaMutate.error ?? "Gagal membuat persona");
    setPersonaId(res.persona.id);
    return res.persona.id;
  }

  async function saveSegments(items: Segment[]) {
    const targetId = await ensurePersonaId();
    const payload = items.map((it) => ({
      name: it.name,
      tier: it.tier,
      description: it.description,
      painPoint: it.painPoint,
      need: it.need,
    }));
    const res = await segmentsMutate.mutate("/api/persona/segments", { personaId: targetId, items: payload });
    if (!res?.segments) throw new Error(segmentsMutate.error ?? "Gagal menyimpan segmentasi");
    setSegments(
      res.segments.map((s) => ({
        id: s.id,
        name: s.name,
        tier: (s.tier as Segment["tier"]) ?? "Sekunder",
        description: s.description ?? "",
        painPoint: s.painPoint ?? "",
        need: s.need ?? "",
      })),
    );
  }

  async function saveKeywords(items: Array<{ category: KeywordCategory; value: string }>) {
    const targetId = await ensurePersonaId();
    const res = await keywordsMutate.mutate("/api/persona/keywords", { personaId: targetId, items });
    if (!res?.keywords) throw new Error(keywordsMutate.error ?? "Gagal menyimpan kata kunci");
    setKeywords(groupKeywords(res.keywords));
  }

  return (
    <PersonaContext.Provider
      value={{
        persona,
        setPersona,
        segments,
        keywords,
        loading,
        saving: personaMutate.loading || segmentsMutate.loading || keywordsMutate.loading,
        error: personaMutate.error || segmentsMutate.error || keywordsMutate.error,
        refresh,
        savePersona,
        saveSegments,
        saveKeywords,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona harus dipakai di dalam PersonaProvider");
  return ctx;
}
