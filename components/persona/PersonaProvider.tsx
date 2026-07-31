"use client";

import { createContext, useContext, useState } from "react";
import { useIsMockEmpty, useMockQuery } from "@/lib/hooks/use-mock-query";
import {
  MOCK_KEYWORDS,
  MOCK_KEYWORDS_EMPTY,
  MOCK_PERSONA,
  MOCK_SEGMENTS,
  MOCK_SEGMENTS_EMPTY,
  type Keywords,
  type PersonaState,
  type Segment,
} from "@/lib/mock/persona";

type PersonaContextValue = {
  persona: PersonaState;
  setPersona: React.Dispatch<React.SetStateAction<PersonaState>>;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  keywords: Keywords;
  setKeywords: React.Dispatch<React.SetStateAction<Keywords>>;
  loading: boolean;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

// Menyatukan branding/DNA/visual/segmentasi/kata-kunci dalam satu context supaya
// pindah tab tidak membuang perubahan yang belum disimpan (padanan objek global
// `persona`/`segments`/`keywords` di prototipe index.html).
// TODO: ganti ke query lib/db/queries/ tabel personas/persona_segments/persona_keywords
// (design.md §4.1) setelah Supabase siap.
export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const isEmpty = useIsMockEmpty();
  const { data: seedPersona, loading: personaLoading } = useMockQuery(MOCK_PERSONA);
  const { data: seedSegments, loading: segmentsLoading } = useMockQuery(
    isEmpty ? MOCK_SEGMENTS_EMPTY : MOCK_SEGMENTS,
  );
  const { data: seedKeywords, loading: keywordsLoading } = useMockQuery(
    isEmpty ? MOCK_KEYWORDS_EMPTY : MOCK_KEYWORDS,
  );
  const [persona, setPersona] = useState<PersonaState>(seedPersona);
  const [segments, setSegments] = useState<Segment[]>(seedSegments);
  const [keywords, setKeywords] = useState<Keywords>(seedKeywords);
  const loading = personaLoading || segmentsLoading || keywordsLoading;

  return (
    <PersonaContext.Provider
      value={{ persona, setPersona, segments, setSegments, keywords, setKeywords, loading }}
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
