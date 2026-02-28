import { memo, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { FlowStep, FlowStepType } from "@/lib/contracts/canvas-state";
import { cn } from "@/lib/utils/cn";

interface FlowNodeData {
  stepId: string;
  label: string;
  busy: boolean;
  canRemove: boolean;
  onRenameStep: (stepId: string, label: string) => void;
  onRemoveStep: (stepId: string) => void;
}

export interface FlowCanvasProps {
  steps: FlowStep[];
  busy: boolean;
  onRenameStep: (stepId: string, label: string) => void;
  onRemoveStep: (stepId: string) => void;
}

const flowNodeVariantClassMap: Record<FlowStepType, string> = {
  input: "border-accent bg-surface",
  process: "border-line bg-surface",
  output: "border-accent-2 bg-surface-2"
};

function EditableFlowNode({
  id,
  data,
  stepType
}: NodeProps<FlowNodeData> & {
  stepType: FlowStepType;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);

  useEffect(() => {
    setDraftLabel(data.label);
  }, [data.label]);

  function startEditing() {
    if (data.busy) {
      return;
    }
    setDraftLabel(data.label);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftLabel(data.label);
    setIsEditing(false);
  }

  function commitEditing() {
    const nextLabel = draftLabel.trim() || data.label;
    if (nextLabel !== data.label) {
      data.onRenameStep(data.stepId, nextLabel);
    }
    setDraftLabel(nextLabel);
    setIsEditing(false);
  }

  function onLabelInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEditing();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <div
      data-testid={`flow-node-${id}`}
      data-node-type={stepType}
      className={cn(
        "group min-w-[240px] rounded-panel border p-3 shadow-panel transition-colors duration-hover ease-editorial",
        flowNodeVariantClassMap[stepType]
      )}
    >
      {stepType !== "input" ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-line !bg-surface"
          aria-hidden="true"
        />
      ) : null}
      {stepType !== "output" ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-accent !bg-accent"
          aria-hidden="true"
        />
      ) : null}

      <div className="space-y-2">
        <p className="text-meta text-muted">{stepType.toUpperCase()}</p>
        {isEditing ? (
          <div className="space-y-2">
            <label htmlFor={`step-label-${id}`} className="sr-only">
              Step label for {data.stepId}
            </label>
            <input
              id={`step-label-${id}`}
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={onLabelInputKeyDown}
              className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={data.busy}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-control border border-accent bg-surface px-3 py-1 text-meta text-accent transition-colors duration-hover ease-editorial hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
                onClick={commitEditing}
                disabled={data.busy}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-control border border-line bg-surface px-3 py-1 text-meta text-ink transition-colors duration-hover ease-editorial hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:text-muted"
                onClick={cancelEditing}
                disabled={data.busy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div
              onDoubleClick={startEditing}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  startEditing();
                }
              }}
              className={cn(data.busy ? undefined : "cursor-text")}
              role="button"
              tabIndex={0}
              aria-label={`Edit ${data.label}`}
            >
              <p className="font-display text-lg font-semibold text-ink">{data.label}</p>
              <p className="text-meta text-muted">Step ID: {data.stepId}</p>
            </div>
            <div className="flex gap-2 opacity-0 transition-opacity duration-hover ease-editorial group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                aria-label={`Edit ${data.label}`}
                className="rounded-control border border-line bg-surface px-2 py-1 text-meta text-ink transition-colors duration-hover ease-editorial hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:text-muted"
                onClick={startEditing}
                disabled={data.busy}
              >
                Edit
              </button>
              {data.canRemove ? (
                <button
                  type="button"
                  aria-label={`Remove ${data.label}`}
                  className="rounded-control border border-line bg-surface px-2 py-1 text-meta text-ink transition-colors duration-hover ease-editorial hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:text-muted"
                  onClick={() => data.onRemoveStep(data.stepId)}
                  disabled={data.busy}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const InputFlowNode = memo(function InputFlowNode(props: NodeProps<FlowNodeData>) {
  return <EditableFlowNode {...props} stepType="input" />;
});

const ProcessFlowNode = memo(function ProcessFlowNode(props: NodeProps<FlowNodeData>) {
  return <EditableFlowNode {...props} stepType="process" />;
});

const OutputFlowNode = memo(function OutputFlowNode(props: NodeProps<FlowNodeData>) {
  return <EditableFlowNode {...props} stepType="output" />;
});

const flowNodeTypes: NodeTypes = {
  input: InputFlowNode,
  process: ProcessFlowNode,
  output: OutputFlowNode
};

function buildFlowNodes(
  steps: FlowStep[],
  busy: boolean,
  onRenameStep: (stepId: string, label: string) => void,
  onRemoveStep: (stepId: string) => void
): Array<Node<FlowNodeData>> {
  return steps.map((step, index) => ({
    id: step.id,
    type: step.type,
    draggable: false,
    position: {
      x: 64 + index * 312,
      y: 120
    },
    data: {
      stepId: step.id,
      label: step.label,
      busy,
      canRemove: steps.length > 1,
      onRenameStep,
      onRemoveStep
    }
  }));
}

function buildFlowEdges(steps: FlowStep[]): Edge[] {
  return steps.slice(0, -1).map((step, index) => {
    const nextStep = steps[index + 1];
    return {
      id: `${step.id}->${nextStep.id}`,
      source: step.id,
      target: nextStep.id,
      type: "smoothstep",
      style: {
        stroke: "var(--line)",
        strokeWidth: 1.5
      }
    };
  });
}

export function FlowCanvas({ steps, busy, onRenameStep, onRemoveStep }: FlowCanvasProps) {
  const nodes = useMemo(
    () => buildFlowNodes(steps, busy, onRenameStep, onRemoveStep),
    [steps, busy, onRenameStep, onRemoveStep]
  );
  const edges = useMemo(() => buildFlowEdges(steps), [steps]);

  return (
    <div className="h-[420px] overflow-hidden rounded-control border border-line bg-surface-2">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={flowNodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1
        }}
        minZoom={0.5}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="var(--line)" size={1} gap={26} />
        <Controls showInteractive={false} position="top-right" />
      </ReactFlow>
    </div>
  );
}
