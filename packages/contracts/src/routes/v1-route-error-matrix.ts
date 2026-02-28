import type { ApiErrorCode } from "../errors/error-codes.js";

import { V1_ROUTE_MAP, getV1RouteKey, type V1RouteKey } from "./v1-route-map.js";

export interface V1RouteErrorConformance {
  readonly required: readonly ApiErrorCode[];
  readonly allowed: readonly ApiErrorCode[];
}

function freezeCodes(codes: readonly ApiErrorCode[]): readonly ApiErrorCode[] {
  return Object.freeze([...codes]);
}

function asAllowed(
  required: readonly ApiErrorCode[],
  additionalAllowed: readonly ApiErrorCode[]
): readonly ApiErrorCode[] {
  return freezeCodes([...new Set([...required, ...additionalAllowed])]);
}

function defineConformance(
  required: readonly ApiErrorCode[],
  additionalAllowed: readonly ApiErrorCode[]
): Readonly<V1RouteErrorConformance> {
  const frozenRequired = freezeCodes(required);

  return Object.freeze({
    required: frozenRequired,
    allowed: asAllowed(frozenRequired, additionalAllowed)
  });
}

const baseRequired = [
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR"
] as const satisfies readonly ApiErrorCode[];

const authRequired = ["UNAUTHORIZED"] as const satisfies readonly ApiErrorCode[];

const matrix: Readonly<Record<V1RouteKey, Readonly<V1RouteErrorConformance>>> =
  Object.freeze({
    "POST /api/v1/intent": defineConformance(
      [...baseRequired, ...authRequired, "INVALID_SCHEMA"],
      ["FORBIDDEN", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE"]
    ),
    "POST /api/v1/deployments": defineConformance(
      [
        ...baseRequired,
        ...authRequired,
        "INVALID_SCHEMA",
        "CONFLICT",
        "DEPLOY_NOT_READY"
      ],
      ["FORBIDDEN", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE"]
    ),
    "GET /api/v1/deployments/{deployment_id}": defineConformance(
      [...baseRequired, ...authRequired],
      ["FORBIDDEN", "NOT_FOUND", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE"]
    ),
    "POST /api/v1/deployments/{deployment_id}/retry": defineConformance(
      [
        ...baseRequired,
        ...authRequired,
        "INVALID_SCHEMA",
        "CONFLICT",
        "DEPLOY_NOT_READY"
      ],
      [
        "FORBIDDEN",
        "NOT_FOUND",
        "RATE_LIMITED",
        "UPSTREAM_UNAVAILABLE"
      ]
    ),
    "GET /api/v1/templates": defineConformance(
      [...baseRequired, ...authRequired],
      ["FORBIDDEN", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE"]
    ),
    "GET /api/v1/health": defineConformance(baseRequired, [
      "UPSTREAM_UNAVAILABLE"
    ])
  });

for (const route of V1_ROUTE_MAP) {
  const key = getV1RouteKey(route.method, route.path) as V1RouteKey;
  if (!(key in matrix)) {
    throw new Error(`Route error conformance missing for ${key}`);
  }
}

export const V1_ROUTE_ERROR_MATRIX = matrix;
