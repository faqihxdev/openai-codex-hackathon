import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export interface PrimaryActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
}

export function PrimaryAction({
  busy = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: PrimaryActionProps) {
  const isDisabled = disabled || busy;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={busy}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-accent bg-accent px-5 py-2.5 font-sans text-sm font-semibold text-surface transition-colors duration-hover ease-editorial",
        "hover:bg-ink hover:border-ink",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-muted",
        className
      )}
    >
      <span className={busy ? "sr-only" : undefined}>{children}</span>
      {busy ? (
        <span aria-hidden="true" className="text-meta text-surface">
          Working...
        </span>
      ) : null}
    </button>
  );
}
