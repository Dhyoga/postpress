"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ActionState = { label: string; onClick: () => void } | null;

const TopbarActionContext = createContext<{
  action: ActionState;
  setAction: (action: ActionState) => void;
} | null>(null);

export function TopbarActionProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = useState<ActionState>(null);
  return (
    <TopbarActionContext.Provider value={{ action, setAction }}>
      {children}
    </TopbarActionContext.Provider>
  );
}

function useTopbarActionContext() {
  const ctx = useContext(TopbarActionContext);
  if (!ctx) throw new Error("useTopbarAction harus dipakai di dalam TopbarActionProvider");
  return ctx;
}

export function useTopbarAction(): ActionState {
  return useTopbarActionContext().action;
}

/** Dipanggil dari halaman (Hari ini, Rencana konten, Antrean) untuk mendaftarkan tombol aksi topbar. */
export function useRegisterTopbarAction(label: string | null, onClick?: () => void) {
  const { setAction } = useTopbarActionContext();
  useEffect(() => {
    setAction(label && onClick ? { label, onClick } : null);
    return () => setAction(null);
  }, [label, onClick, setAction]);
}
