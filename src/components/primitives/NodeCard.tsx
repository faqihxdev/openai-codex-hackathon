import type { FlowStepType } from "@/lib/contracts/canvas-state";

import { cn } from "@/lib/utils/cn";

export interface NodeCardProps {
  type: FlowStepType;
  title: string;
  meta?: string;
  onEdit?: () => void;
}

const typeClassMap: Record<FlowStepType, string> = {
  input: "border-accent bg-surface",
  process: "border-line bg-surface",
  output: "border-accent-2 bg-surface-2"
};

export function NodeCard({ type, title, meta, onEdit }: NodeCardProps) {
  return (
    <article
      data-node-type={type}
      className={cn(
        "group rounded-panel border p-4 shadow-panel transition-colors duration-hover ease-editorial",
        typeClassMap[type]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-ink">{title}</p>
          {meta ? <p className="text-meta text-muted">{meta}</p> : null}
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-control border border-line bg-surface px-3 py-1 text-meta text-ink opacity-0 transition-opacity duration-hover ease-editorial hover:border-accent hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
          >
            Edit
          </button>
        ) : null}
      </div>
    </article>
  );
}
