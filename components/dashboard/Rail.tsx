"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV } from "@/lib/nav";
import { usePosts } from "@/components/posts/PostsProvider";
import { QUEUE_STATUSES } from "@/lib/status";
import { LogoutButton } from "./LogoutButton";

export function Rail() {
  const pathname = usePathname();
  const { posts } = usePosts();
  const todayBadge = posts.filter((p) => p.status === "review").length;
  const queueBadge = posts.filter((p) => QUEUE_STATUSES.includes(p.status)).length;

  return (
    <aside className="rail">
      <div className="rail__mark eyebrow">Postpress</div>
      <nav className="rail__nav">
        {DASHBOARD_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rail__link"
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.href === "/dashboard" ? (
              <span className="rail__badge">{todayBadge}</span>
            ) : null}
            {item.href === "/dashboard/queue" ? (
              <span className="rail__badge rail__badge--info">{queueBadge}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="rail__foot">
        <div className="rail__who">
          Rangga
          <span>admin</span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
