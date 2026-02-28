import { NextResponse } from "next/server";

import { buildHealthResponse } from "./health-check";

export async function GET() {
  try {
    const { statusCode, payload } = buildHealthResponse();
    return NextResponse.json(payload, {
      status: statusCode
    });
  } catch {
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to evaluate service health."
      },
      {
        status: 500
      }
    );
  }
}
