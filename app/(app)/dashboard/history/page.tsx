import { Suspense } from "react";
import { HistoryView } from "@/components/history/HistoryView";

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryView />
    </Suspense>
  );
}
