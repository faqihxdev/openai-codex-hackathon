import { NextResponse } from "next/server";

import {
  getDeploymentAuthContextFromHeaders,
  handleDeployments
} from "@/lib/server/deployments";

export async function POST(request: Request) {
  try {
    const result = handleDeployments({
      rawBody: await request.json(),
      auth: getDeploymentAuthContextFromHeaders(request.headers)
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
