import { z } from "zod";
export declare const apiErrorCodeSchema: z.ZodEnum<["INVALID_SCHEMA", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_ALLOWED", "CONFLICT", "DEPLOY_NOT_READY", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR"]>;
export declare const apiErrorSchema: z.ZodObject<{
    code: z.ZodEnum<["INVALID_SCHEMA", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_ALLOWED", "CONFLICT", "DEPLOY_NOT_READY", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR"]>;
    message: z.ZodString;
    retryable: z.ZodBoolean;
    request_id: z.ZodString;
    details: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    retryable: boolean;
    code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
    message: string;
    request_id: string;
    details: Record<string, unknown>;
}, {
    retryable: boolean;
    code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
    message: string;
    request_id: string;
    details: Record<string, unknown>;
}>;
export declare const apiErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodEnum<["INVALID_SCHEMA", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_ALLOWED", "CONFLICT", "DEPLOY_NOT_READY", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR"]>;
        message: z.ZodString;
        retryable: z.ZodBoolean;
        request_id: z.ZodString;
        details: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strict", z.ZodTypeAny, {
        retryable: boolean;
        code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
        message: string;
        request_id: string;
        details: Record<string, unknown>;
    }, {
        retryable: boolean;
        code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
        message: string;
        request_id: string;
        details: Record<string, unknown>;
    }>;
}, "strict", z.ZodTypeAny, {
    error: {
        retryable: boolean;
        code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
        message: string;
        request_id: string;
        details: Record<string, unknown>;
    };
}, {
    error: {
        retryable: boolean;
        code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "CONFLICT" | "DEPLOY_NOT_READY" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";
        message: string;
        request_id: string;
        details: Record<string, unknown>;
    };
}>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorResponseBody = z.infer<typeof apiErrorResponseSchema>;
//# sourceMappingURL=api-error-schema.d.ts.map