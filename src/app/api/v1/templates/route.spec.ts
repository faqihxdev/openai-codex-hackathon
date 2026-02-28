import { describe, expect, it } from "vitest";

import { TemplatesResponseSchema } from "@/lib/contracts";

import { GET } from "./route";

describe("GET /api/v1/templates", () => {
  it("returns a schema-valid starter template payload", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const parsed = TemplatesResponseSchema.parse(await response.json());
    const expenseApprovalTemplate = parsed.templates.find(
      (template) => template.id === "expense-approval"
    );

    expect(expenseApprovalTemplate).toBeDefined();
    expect(expenseApprovalTemplate?.canvas_state.form_fields.length).toBeGreaterThan(0);
    expect(expenseApprovalTemplate?.canvas_state.flow_steps.length).toBeGreaterThan(0);
  });
});
