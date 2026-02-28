import { describe, expect, it } from "vitest";

import { V1_ROUTE_MAP } from "../src/routes/index.js";

describe("V1_ROUTE_MAP", () => {
  it("contains exactly six routes", () => {
    expect(V1_ROUTE_MAP).toHaveLength(6);
  });

  it("uses the /api/v1 namespace for every route", () => {
    for (const route of V1_ROUTE_MAP) {
      expect(route.path.startsWith("/api/v1")).toBe(true);
    }
  });

  it("defines the retry route with the exact shape", () => {
    const retryRoute = V1_ROUTE_MAP.find(
      (route) => route.path === "/api/v1/deployments/{deployment_id}/retry"
    );

    expect(retryRoute).toEqual({
      method: "POST",
      path: "/api/v1/deployments/{deployment_id}/retry",
      operationId: "retryDeployment",
      authPolicy: "REQUIRED",
      ownerIssueRef: "#12"
    });
  });

  it("matches the frozen route inventory for issue #12", () => {
    expect(V1_ROUTE_MAP.map((route) => `${route.method} ${route.path}`)).toEqual([
      "POST /api/v1/intent",
      "POST /api/v1/deployments",
      "GET /api/v1/deployments/{deployment_id}",
      "POST /api/v1/deployments/{deployment_id}/retry",
      "GET /api/v1/templates",
      "GET /api/v1/health"
    ]);
  });
});
