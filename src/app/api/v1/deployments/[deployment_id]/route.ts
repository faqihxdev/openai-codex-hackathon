import { NextResponse } from "next/server";

import {
  getDeploymentAuthContextFromHeaders,
  handleDeploymentStatus
} from "@/lib/server/deployments";

type RouteContext = {
  params: Promise<{
    deployment_id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const { deployment_id } = await context.params;

  const result = handleDeploymentStatus({
    deployment_id,
    auth: getDeploymentAuthContextFromHeaders(request.headers)
  });

  return NextResponse.json(result.body, {
    status: result.status
  });
}
