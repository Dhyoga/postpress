import { Suspense } from "react";
import { QueueView } from "@/components/queue/QueueView";

export default function QueuePage() {
  return (
    <Suspense>
      <QueueView />
    </Suspense>
  );
}
