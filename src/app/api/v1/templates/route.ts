import { NextResponse } from "next/server";

import type { StarterTemplate } from "@/lib/contracts";
import { TemplatesResponseSchema } from "@/lib/contracts";

function buildTemplatesResponse() {
  const seedTemplates: StarterTemplate[] = [
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
    }
  ];

  return {
    templates: seedTemplates
  };
}

export async function GET() {
  try {
    const payload = TemplatesResponseSchema.parse(buildTemplatesResponse());
    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to load starter templates."
      },
      { status: 500 }
    );
  }
}
