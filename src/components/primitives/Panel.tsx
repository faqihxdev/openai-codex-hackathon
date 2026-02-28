import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  variant?: "default" | "elevated" | "tinted";
}

const variantClassMap: Record<NonNullable<PanelProps["variant"]>, string> = {
  default: "bg-surface",
  elevated: "bg-surface shadow-panel",
  tinted: "bg-surface-2"
};

export function Panel({
  title,
  subtitle,
  variant = "default",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-panel border border-line p-4 text-ink transition-shadow duration-panel ease-editorial",
        variantClassMap[variant],
        className
      )}
    >
      {title ? <h3 className="font-display text-xl font-semibold">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      {children ? <div className={cn(title || subtitle ? "mt-4" : undefined)}>{children}</div> : null}
    </div>
  );
}
