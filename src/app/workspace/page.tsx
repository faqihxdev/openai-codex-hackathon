import type { AssistantResponse } from "@/lib/contracts/assistant-response";
import type { CanvasState } from "@/lib/contracts/canvas-state";
import type { DeploymentStatus } from "@/lib/contracts/deployment-status";

import { NodeCard, Panel, PrimaryAction, StatusChip } from "@/components/primitives";
import { AppShell } from "@/components/shell";

const canvasState: CanvasState = {
  process_name: "Expense Approval",
  form_fields: [
    { type: "SHORT_TEXT", label: "Employee name", required: true },
    { type: "DATE", label: "Expense date", required: true },
    { type: "PARAGRAPH", label: "Business justification", required: true }
  ],
  sheet_headers: ["Timestamp", "Employee name", "Expense date", "Business justification", "Edit Link"],
  flow_steps: [
    { id: "start", label: "Request Input", type: "input" },
    { id: "validate", label: "Validation", type: "process" },
    { id: "submit", label: "Approved Submission", type: "output" }
  ]
};

const assistantResponse: AssistantResponse = {
  chat_reply: "Please confirm who approves requests above 5000.",
  canvas_state: canvasState,
  canvas_state_patch: [
    {
      op: "replace",
      path: "/flow_steps/1/label",
      value: "Manager Validation"
    }
  ],
  confidence: 0.78,
  unresolved_questions: ["Who approves requests above 5000?"],
  next_actions: ["Add approval step", "Mark business justification as required"]
};

const deploymentStatus: DeploymentStatus = {
  deployment_id: "dep_001",
  status: "queued",
  assets: {
    form_id: null,
    spreadsheet_id: null,
    script_id: null
  },
  error: null,
  progress: {
    current_step: "Auth",
    completed_steps: [],
    failed_step: null
  }
};

function TopBar() {
  return (
    <>
      <div>
        <p className="font-display text-2xl font-bold">Editorial Control Room</p>
        <p className="text-meta text-muted">{canvasState.process_name}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip tone="accent">Confidence {Math.round(assistantResponse.confidence * 100)}%</StatusChip>
        <StatusChip tone="warning">{assistantResponse.unresolved_questions.length} unresolved</StatusChip>
        <StatusChip tone="neutral">{deploymentStatus.status}</StatusChip>
        <PrimaryAction className="hidden lg:inline-flex">Deploy to Google Workspace</PrimaryAction>
      </div>
    </>
  );
}

function LeftRail() {
  return (
    <div className="space-y-4">
      <Panel title="Conversation" subtitle="Agentic guidance with actionable controls" variant="elevated">
        <p className="text-sm text-ink">{assistantResponse.chat_reply}</p>
        <p className="mt-3 text-meta text-muted">Why this question: deployment policy needs an explicit approver.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip tone="accent">Add approval step</StatusChip>
          <StatusChip tone="neutral">Set threshold at 5000</StatusChip>
        </div>
      </Panel>

      <Panel title="Questions" subtitle="Resolve blockers before deploy" variant="default">
        <ul className="space-y-2 pl-4 text-sm text-ink">
          {assistantResponse.unresolved_questions.map((question) => (
            <li key={question} className="list-disc">
              {question}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function RightStage() {
  return (
    <div className="space-y-4">
      <Panel title="Canvas" subtitle="Directly edit the workflow graph" variant="elevated">
        <div className="grid gap-3">
          {canvasState.flow_steps.map((step) => (
            <NodeCard key={step.id} type={step.type} title={step.label} meta={`Step ID: ${step.id}`} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Form Preview" variant="default">
          <ul className="space-y-2 pl-4 text-sm text-ink">
            {canvasState.form_fields.map((field) => (
              <li key={field.label} className="list-disc">
                {field.label} ({field.type}) {field.required ? "Required" : "Optional"}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sheet Preview" variant="tinted">
          <ul className="space-y-2 pl-4 text-sm text-ink">
            {canvasState.sheet_headers.map((header) => (
              <li key={header} className="list-disc">
                {header}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function MobileDeploy() {
  return (
    <Panel title="Deploy" subtitle="Auth -> Form -> Sheet -> Script -> Trigger" variant="tinted">
      <p className="text-sm text-ink">Current step: {deploymentStatus.progress?.current_step}</p>
      <p className="mt-2 text-meta text-muted">Complete unresolved questions before deployment starts.</p>
    </Panel>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <AppShell
        topBar={<TopBar />}
        leftRail={<LeftRail />}
        rightStage={<RightStage />}
        mobilePanels={{
          discuss: <LeftRail />,
          design: <RightStage />,
          deploy: <MobileDeploy />
        }}
      />
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3 lg:hidden">
        <PrimaryAction className="w-full">Deploy to Google Workspace</PrimaryAction>
      </div>
    </>
  );
}
