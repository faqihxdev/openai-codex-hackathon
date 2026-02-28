export type V1RouteMethod = "GET" | "POST";
export type V1RouteAuthPolicy = "REQUIRED" | "NONE";
export interface V1RouteDefinition {
    method: V1RouteMethod;
    path: string;
    operationId: string;
    authPolicy: V1RouteAuthPolicy;
    ownerIssueRef: string;
}
export declare function getV1RouteKey<TMethod extends V1RouteMethod, TPath extends string>(method: TMethod, path: TPath): `${TMethod} ${TPath}`;
export declare const V1_ROUTE_MAP: readonly [Readonly<{
    method: "POST";
    path: "/api/v1/intent";
    operationId: "processIntent";
    authPolicy: "REQUIRED";
    ownerIssueRef: "#12";
}>, Readonly<{
    method: "POST";
    path: "/api/v1/deployments";
    operationId: "createDeployment";
    authPolicy: "REQUIRED";
    ownerIssueRef: "#12";
}>, Readonly<{
    method: "GET";
    path: "/api/v1/deployments/{deployment_id}";
    operationId: "getDeployment";
    authPolicy: "REQUIRED";
    ownerIssueRef: "#12";
}>, Readonly<{
    method: "POST";
    path: "/api/v1/deployments/{deployment_id}/retry";
    operationId: "retryDeployment";
    authPolicy: "REQUIRED";
    ownerIssueRef: "#12";
}>, Readonly<{
    method: "GET";
    path: "/api/v1/templates";
    operationId: "listTemplates";
    authPolicy: "REQUIRED";
    ownerIssueRef: "#12";
}>, Readonly<{
    method: "GET";
    path: "/api/v1/health";
    operationId: "getHealth";
    authPolicy: "NONE";
    ownerIssueRef: "#12";
}>];
export type V1RouteKey = (typeof V1_ROUTE_MAP)[number] extends infer Route ? Route extends V1RouteDefinition ? `${Route["method"]} ${Route["path"]}` : never : never;
//# sourceMappingURL=v1-route-map.d.ts.map