import { Suspense } from "react";
import { PersonaView } from "@/components/persona/PersonaView";

export default function PersonaPage() {
  return (
    <Suspense>
      <PersonaView />
    </Suspense>
  );
}
