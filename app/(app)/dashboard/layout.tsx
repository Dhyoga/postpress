import type { ReactNode } from "react";
import { PostsProvider } from "@/components/posts/PostsProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { TopbarActionProvider } from "@/components/dashboard/TopbarAction";
import { Rail } from "@/components/dashboard/Rail";
import { Topbar } from "@/components/dashboard/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PostsProvider>
      <ToastProvider>
        <TopbarActionProvider>
          <div className="app">
            <Rail />
            <div className="main">
              <Topbar />
              <div className="content">{children}</div>
            </div>
          </div>
        </TopbarActionProvider>
      </ToastProvider>
    </PostsProvider>
  );
}
