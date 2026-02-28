export type V1RouteMethod = "GET" | "POST";
export type V1RouteAuthPolicy = "REQUIRED" | "NONE";

export interface V1RouteDefinition {
  method: V1RouteMethod;
  path: string;
  operationId: string;
  authPolicy: V1RouteAuthPolicy;
  ownerIssueRef: string;
}

export function getV1RouteKey<TMethod extends V1RouteMethod, TPath extends string>(
  method: TMethod,
  path: TPath
): `${TMethod} ${TPath}` {
  return `${method} ${path}` as `${TMethod} ${TPath}`;
}

// BREAKING CONTRACT: adding, removing, or changing a route here is a breaking API change.
export const V1_ROUTE_MAP = Object.freeze([
  Object.freeze({
    method: "POST",
    path: "/api/v1/intent",
    operationId: "processIntent",
    authPolicy: "REQUIRED",
    ownerIssueRef: "#12"
  }),
  Object.freeze({
    method: "POST",
    path: "/api/v1/deployments",
    operationId: "createDeployment",
    authPolicy: "REQUIRED",
    ownerIssueRef: "#12"
  }),
  Object.freeze({
    method: "GET",
    path: "/api/v1/deployments/{deployment_id}",
    operationId: "getDeployment",
    authPolicy: "REQUIRED",
    ownerIssueRef: "#12"
  }),
  Object.freeze({
    method: "POST",
    path: "/api/v1/deployments/{deployment_id}/retry",
    operationId: "retryDeployment",
    authPolicy: "REQUIRED",
    ownerIssueRef: "#12"
  }),
  Object.freeze({
    method: "GET",
    path: "/api/v1/templates",
    operationId: "listTemplates",
    authPolicy: "REQUIRED",
    ownerIssueRef: "#12"
  }),
  Object.freeze({
    method: "GET",
    path: "/api/v1/health",
    operationId: "getHealth",
    authPolicy: "NONE",
    ownerIssueRef: "#12"
  })
] as const satisfies readonly V1RouteDefinition[]);

export type V1RouteKey =
  (typeof V1_ROUTE_MAP)[number] extends infer Route
    ? Route extends V1RouteDefinition
      ? `${Route["method"]} ${Route["path"]}`
      : never
    : never;
