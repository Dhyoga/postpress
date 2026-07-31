"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Sinkronkan tab/filter aktif dengan query param URL (mis. ?tab=dna, ?filter=review),
 * supaya halaman dengan banyak tab/filter (Persona, Antrean, Riwayat) bisa di-deep-link
 * langsung ke tab tertentu — link "buka tab Segmentasi" atau "lihat Antrean yang gagal"
 * bisa dibagikan dan tetap membuka tab yang benar saat halaman dimuat ulang.
 *
 * Navigasi antar tab pakai `router.replace(..., { scroll: false })` supaya tidak menambah
 * riwayat browser per klik tab dan tidak reload/scroll halaman — perilakunya tetap terasa
 * seperti state client biasa, cuma sekarang juga tercermin di URL.
 *
 * Komponen pemanggil WAJIB dibungkus <Suspense> di page.tsx (App Router mewajibkan ini
 * untuk komponen yang memakai useSearchParams).
 */
export function useTabQuery<T extends string>(
  paramName: string,
  validValues: readonly T[],
  defaultValue: T,
): [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramName);
  const current = (validValues as readonly string[]).includes(raw ?? "")
    ? (raw as T)
    : defaultValue;

  const setValue = useCallback(
    (value: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) {
        params.delete(paramName);
      } else {
        params.set(paramName, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, paramName, defaultValue],
  );

  return [current, setValue];
}
