import { NextResponse } from "next/server";
import { z } from "zod";

import { CanvasStateSchema, IntentEventSchema } from "@/lib/contracts";
import { processIntentEvent } from "@/lib/intent/engine";

const IntentRequestSchema = z.object({
  session_id: z.string().min(1),
  intent_event: IntentEventSchema,
  canvas_state: CanvasStateSchema,
  conversation_context: z
    .object({
      unresolved_questions: z.array(z.string()).optional(),
      previous_confidence: z.number().min(0).max(1).optional()
    })
    .optional()
});

export async function POST(request: Request) {
  try {
    const payload = IntentRequestSchema.parse(await request.json());
    const response = processIntentEvent(payload);
    return NextResponse.json(response, {
      status: 200
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: "INVALID_SCHEMA",
          message: "Request payload does not match /api/v1/intent contract.",
          issues: error.issues
        },
        {
          status: 400
        }
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Intent processing failed."
      },
      {
        status: 500
      }
    );
  }
}
