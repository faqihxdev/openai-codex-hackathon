import { NextResponse } from "next/server";

import {
  handleDeployments
} from "@/lib/server/deployments";

export async function POST(request: Request) {
  try {
    const result = await handleDeployments({
      rawBody: await request.json()
    });

    return NextResponse.json(result.body, {
      status: result.status
    });
  } catch {
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Deployment request handling failed."
      },
      {
        status: 500
      }
    );
  }
}
