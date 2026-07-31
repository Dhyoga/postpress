"use client";

import { createContext, useContext, useState } from "react";
import {
  MOCK_KEYWORDS,
  MOCK_PERSONA,
  MOCK_SEGMENTS,
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
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

// Menyatukan branding/DNA/visual/segmentasi/kata-kunci dalam satu context supaya
// pindah tab tidak membuang perubahan yang belum disimpan (padanan objek global
// `persona`/`segments`/`keywords` di prototipe index.html).
// TODO: ganti ke query lib/db/queries/ tabel personas/persona_segments/persona_keywords
// (design.md §4.1) setelah Supabase siap.
export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<PersonaState>(MOCK_PERSONA);
  const [segments, setSegments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [keywords, setKeywords] = useState<Keywords>(MOCK_KEYWORDS);

  return (
    <PersonaContext.Provider
      value={{ persona, setPersona, segments, setSegments, keywords, setKeywords }}
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
