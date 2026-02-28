import type { CanvasState } from "@/lib/contracts/canvas-state";

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  canvas_state: CanvasState;
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "expense-approval",
    name: "Expense Approval",
    description: "Collect requests, validate policy, and route manager sign-off above a threshold.",
    canvas_state: {
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
    }
  },
  {
    id: "it-access-request",
    name: "IT Access Request",
    description: "Collect access details, route security review, then provision and confirm.",
    canvas_state: {
      process_name: "IT Access Request",
      form_fields: [
        { type: "SHORT_TEXT", label: "Employee name", required: true },
        { type: "SHORT_TEXT", label: "System requested", required: true },
        { type: "PARAGRAPH", label: "Access reason", required: true },
        { type: "DATE", label: "Needed by", required: false }
      ],
      sheet_headers: ["Timestamp", "Employee name", "System requested", "Access reason", "Needed by", "Edit Link"],
      flow_steps: [
        { id: "collect", label: "Collect Request", type: "input" },
        { id: "security-review", label: "Security Review", type: "process" },
        { id: "provision", label: "Provision Access", type: "output" }
      ]
    }
  },
  {
    id: "pto-request",
    name: "PTO Request",
    description: "Capture leave details, check balance, and record approval decision.",
    canvas_state: {
      process_name: "PTO Request",
      form_fields: [
        { type: "SHORT_TEXT", label: "Employee name", required: true },
        { type: "DATE", label: "Start date", required: true },
        { type: "DATE", label: "End date", required: true },
        { type: "PARAGRAPH", label: "Coverage plan", required: false }
      ],
      sheet_headers: ["Timestamp", "Employee name", "Start date", "End date", "Coverage plan", "Edit Link"],
      flow_steps: [
        { id: "capture", label: "Capture Request", type: "input" },
        { id: "balance-check", label: "Balance Check", type: "process" },
        { id: "notify", label: "Notify Decision", type: "output" }
      ]
    }
  }
];

export const DEFAULT_TEMPLATE_ID = WORKSPACE_TEMPLATES[0]?.id ?? "expense-approval";

export function cloneCanvasState(canvasState: CanvasState): CanvasState {
  return structuredClone(canvasState);
}

export function getTemplateById(templateId: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((template) => template.id === templateId);
}

export function getDefaultCanvasState(): CanvasState {
  const template = getTemplateById(DEFAULT_TEMPLATE_ID) ?? WORKSPACE_TEMPLATES[0];
  return cloneCanvasState(template.canvas_state);
}
