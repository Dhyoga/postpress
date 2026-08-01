import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PostsProvider } from "@/components/posts/PostsProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { TopbarActionProvider } from "@/components/dashboard/TopbarAction";
import { Rail } from "@/components/dashboard/Rail";
import { Topbar } from "@/components/dashboard/Topbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Middleware hanya mengecek keberadaan cookie (Edge runtime, tidak bisa query DB).
  // Validasi sesi sungguhan — kedaluwarsa atau sudah dicabut lewat logout di tab lain — ada di sini.
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  return (
    <Suspense>
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
    </Suspense>
  );
}
