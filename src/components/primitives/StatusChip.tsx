import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface StatusChipProps {
  tone: "neutral" | "success" | "warning" | "danger" | "accent";
  children: ReactNode;
}

const toneClassMap: Record<StatusChipProps["tone"], string> = {
  neutral: "border-line bg-surface-2 text-ink",
  success: "border-success bg-success/15 text-success",
  warning: "border-warning bg-warning/15 text-warning",
  danger: "border-danger bg-danger/15 text-danger",
  accent: "border-accent bg-accent/15 text-accent"
};

export function StatusChip({ tone, children }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center rounded-chip border px-3 py-1.5 text-meta font-medium",
        toneClassMap[tone]
      )}
    >
      {children}
    </span>
  );
}
