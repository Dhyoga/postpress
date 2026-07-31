import type { PostStatus } from "@/lib/mock/types";
import { STATUS_CHIP_CLASS, STATUS_LABEL } from "@/lib/status";

export function StatusChip({ status }: { status: PostStatus }) {
  return <span className={`chip ${STATUS_CHIP_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}
