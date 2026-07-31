"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    // TODO: panggil POST /api/auth/logout untuk mencabut sesi (design.md §9) setelah auth backend siap.
    router.push("/login");
  }

  return (
    <button type="button" className="rail__out" onClick={handleLogout}>
      Keluar
    </button>
  );
}
