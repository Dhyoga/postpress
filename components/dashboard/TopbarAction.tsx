"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

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

/**
 * Dipanggil dari halaman (Hari ini, Rencana konten, Antrean) untuk mendaftarkan tombol aksi
 * topbar. `onClick` disimpan lewat ref, bukan dependency array — pemanggil sering mengirim
 * closure baru tiap render (mis. arrow function inline), dan memasukkannya ke deps bikin efek
 * jalan tiap render lalu memicu setAction terus-menerus ("Maximum update depth exceeded").
 */
export function useRegisterTopbarAction(label: string | null, onClick?: () => void) {
  const { setAction } = useTopbarActionContext();
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  });

  const hasHandler = Boolean(onClick);
  useEffect(() => {
    setAction(label && hasHandler ? { label, onClick: () => onClickRef.current?.() } : null);
    return () => setAction(null);
  }, [label, hasHandler, setAction]);
}
