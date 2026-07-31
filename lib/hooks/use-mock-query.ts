"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Simulasi query async di atas data statis lib/mock/*, supaya komponen sudah terbiasa
 * dengan bentuk { data, loading } sebelum backend Supabase siap.
 * TODO: ganti isi hook ini dengan query asli (mis. useQuery dari @tanstack/react-query
 * yang manggil lib/db/queries/) begitu backend siap — signature { data, loading } yang
 * dipakai pemanggil tidak perlu berubah, cukup ganti isi hook ini.
 */
export function useMockQuery<T>(data: T, delayMs = 450): { data: T; loading: boolean } {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), delayMs);
    return () => clearTimeout(timer);
    // Sengaja tidak menaruh `data` di deps: hook ini mensimulasikan fetch awal tiap kali
    // komponen pemanggilnya mount (mis. pindah halaman), bukan tiap kali data berubah
    // lewat mutasi lokal (approve, tambah draf, dst) — itu harus terasa instan.
  }, [delayMs]);

  return { data, loading };
}

/**
 * Dev-only: tambahkan `?mock=empty` di URL untuk melihat varian data kosong tanpa
 * backend (mis. /dashboard/queue?mock=empty). Dipakai bersama varian *_EMPTY di lib/mock/.
 */
export function useIsMockEmpty(): boolean {
  const searchParams = useSearchParams();
  return searchParams.get("mock") === "empty";
}
