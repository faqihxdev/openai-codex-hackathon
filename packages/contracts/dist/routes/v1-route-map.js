export function getV1RouteKey(method, path) {
    return `${method} ${path}`;
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
]);
//# sourceMappingURL=v1-route-map.js.map