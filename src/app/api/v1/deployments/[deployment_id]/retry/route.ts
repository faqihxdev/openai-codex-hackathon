import { NextResponse } from "next/server";

import { handleDeploymentRetry } from "@/lib/server/deployments";

type RouteContext = {
  params: Promise<{
    deployment_id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { deployment_id } = await context.params;

  const result = handleDeploymentRetry({
    deployment_id
  });

  return NextResponse.json(result.body, {
    status: result.status
  });
}
