"use client";

import { usePathname } from "next/navigation";
import { TOPBAR_TITLE } from "@/lib/nav";
import { useTopbarAction } from "./TopbarAction";

export function Topbar() {
  const pathname = usePathname();
  const action = useTopbarAction();
  const title = TOPBAR_TITLE[pathname] ?? "Postpress";

  return (
    <header className="topbar">
      <div className="topbar__date">{title}</div>
      <div className="topbar__acct">@kelasfreelance.id</div>
      <div className="topbar__spacer" />
      {action ? (
        <button type="button" className="btn btn--ghost" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </header>
  );
}
