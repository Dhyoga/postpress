"use client";

import { usePathname } from "next/navigation";
import { TOPBAR_TITLE } from "@/lib/nav";
import { useTopbarAction } from "./TopbarAction";
import { useApi } from "@/lib/hooks/use-api";

type IgAccountView = { id: string; handle: string; isActive: boolean };

export function Topbar() {
  const pathname = usePathname();
  const action = useTopbarAction();
  const title = TOPBAR_TITLE[pathname] ?? "Postpress";
  const { data } = useApi<{ accounts: IgAccountView[] }>("/api/settings/ig-accounts");
  const activeAccount = data?.accounts.find((a) => a.isActive);

  return (
    <header className="topbar">
      <div className="topbar__date">{title}</div>
      <div className="topbar__acct">{activeAccount ? `@${activeAccount.handle}` : "Belum tersambung"}</div>
      <div className="topbar__spacer" />
      {action ? (
        <button type="button" className="btn btn--ghost" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </header>
  );
}
