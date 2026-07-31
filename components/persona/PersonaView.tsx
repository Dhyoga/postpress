"use client";

import { TabBar } from "@/components/ui/TabBar";
import { useTabQuery } from "@/lib/hooks/use-tab-query";
import { PersonaProvider } from "./PersonaProvider";
import { BrandingPanel } from "./panels/BrandingPanel";
import { DnaPanel } from "./panels/DnaPanel";
import { KataKunciPanel } from "./panels/KataKunciPanel";
import { SegmentasiPanel } from "./panels/SegmentasiPanel";
import { VisualPanel } from "./panels/VisualPanel";

const TABS = [
  { value: "branding", label: "Branding" },
  { value: "dna", label: "DNA" },
  { value: "segmentasi", label: "Segmentasi" },
  { value: "visual", label: "Visual" },
  { value: "katakunci", label: "Kata Kunci" },
] as const;

type PersonaTab = (typeof TABS)[number]["value"];
const TAB_VALUES = TABS.map((t) => t.value) as PersonaTab[];

export function PersonaView() {
  const [tab, setTab] = useTabQuery<PersonaTab>("tab", TAB_VALUES, "branding");

  return (
    <PersonaProvider>
      <section className="view">
        <div className="panel-head">
          <div>
            <h1>Persona</h1>
            <p>
              Profil brand yang jadi acuan gaya, target, dan batasan konten. Diisi manual atau
              diimpor dari Excel &mdash; belum dihubungkan ke AI.
            </p>
          </div>
        </div>

        <TabBar
          items={TABS}
          active={tab}
          onChange={(value) => setTab(value as PersonaTab)}
          ariaLabel="Tab Persona"
        />

        {tab === "branding" ? <BrandingPanel /> : null}
        {tab === "dna" ? <DnaPanel /> : null}
        {tab === "segmentasi" ? <SegmentasiPanel /> : null}
        {tab === "visual" ? <VisualPanel /> : null}
        {tab === "katakunci" ? <KataKunciPanel /> : null}
      </section>
    </PersonaProvider>
  );
}
