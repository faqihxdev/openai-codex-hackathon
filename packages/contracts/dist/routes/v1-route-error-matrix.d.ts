import type { ApiErrorCode } from "../errors/error-codes.js";
export interface V1RouteErrorConformance {
    readonly required: readonly ApiErrorCode[];
    readonly allowed: readonly ApiErrorCode[];
}
export declare const V1_ROUTE_ERROR_MATRIX: Readonly<Record<"POST /api/v1/intent" | "POST /api/v1/deployments" | "GET /api/v1/deployments/{deployment_id}" | "POST /api/v1/deployments/{deployment_id}/retry" | "GET /api/v1/templates" | "GET /api/v1/health", Readonly<V1RouteErrorConformance>>>;
//# sourceMappingURL=v1-route-error-matrix.d.ts.map