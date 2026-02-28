import { describe, expect, test } from "vitest";

import {
  getDeploymentAuthContextFromHeaders,
  guardDeploymentAuth,
  REQUIRED_DEPLOYMENT_OAUTH_SCOPES
} from "@/lib/server/deployments/auth";

describe("deployment auth guard", () => {
  test("returns UNAUTHORIZED when user_id is missing", () => {
    const result = guardDeploymentAuth({
      context: {
        user_id: null,
        oauth_token_status: "valid",
        oauth_scopes: [...REQUIRED_DEPLOYMENT_OAUTH_SCOPES]
      },
      resume_context: {
        session_id: "sess-1",
        idempotency_key: "idem-1"
      }
    });

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      retryable: false,
      details: {
        reason: "missing_user_id",
        resume_context: {
          session_id: "sess-1",
          idempotency_key: "idem-1"
        }
      }
    });
  });

  test("returns recoverable UNAUTHORIZED when required scopes are missing", () => {
    const result = guardDeploymentAuth({
      context: {
        user_id: "user-1",
        oauth_token_status: "valid",
        oauth_scopes: [REQUIRED_DEPLOYMENT_OAUTH_SCOPES[0]]
      },
      resume_context: {
        session_id: "sess-1",
        idempotency_key: "idem-1"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth to fail");
    }

    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.retryable).toBe(true);
    expect(result.details.reason).toBe("missing_required_scopes");
    expect(result.details.reauth_required).toBe(true);
    expect(result.details.missing_scopes).toEqual(
      REQUIRED_DEPLOYMENT_OAUTH_SCOPES.slice(1)
    );
  });

  test("returns recoverable UNAUTHORIZED when token is expired", () => {
    const result = guardDeploymentAuth({
      context: {
        user_id: "user-1",
        oauth_token_status: "expired",
        oauth_scopes: [...REQUIRED_DEPLOYMENT_OAUTH_SCOPES]
      },
      resume_context: {
        session_id: "sess-1",
        idempotency_key: "idem-1"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth to fail");
    }

    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.retryable).toBe(true);
    expect(result.details.reason).toBe("expired_oauth_token");
    expect(result.details.reauth_required).toBe(true);
    expect(result.details.resume_context).toEqual({
      session_id: "sess-1",
      idempotency_key: "idem-1"
    });
  });

  test("returns success when user and scopes satisfy requirements", () => {
    const result = guardDeploymentAuth({
      context: {
        user_id: " user-1 ",
        oauth_token_status: "valid",
        oauth_scopes: [...REQUIRED_DEPLOYMENT_OAUTH_SCOPES]
      },
      resume_context: {
        session_id: "sess-1",
        idempotency_key: "idem-1"
      }
    });

    expect(result).toEqual({
      ok: true,
      user_id: "user-1",
      required_scopes: [...REQUIRED_DEPLOYMENT_OAUTH_SCOPES],
      granted_scopes: [...REQUIRED_DEPLOYMENT_OAUTH_SCOPES]
    });
  });
});

describe("deployment auth header parsing", () => {
  test("builds auth context from user, token status, and mixed scope separators", () => {
    const headers = new Headers({
      "x-user-id": " user-2 ",
      "x-oauth-token-status": "valid",
      "x-oauth-scopes": `${REQUIRED_DEPLOYMENT_OAUTH_SCOPES[0]}, ${REQUIRED_DEPLOYMENT_OAUTH_SCOPES[1]}`
    });

    const context = getDeploymentAuthContextFromHeaders(headers);
    expect(context).toEqual({
      user_id: "user-2",
      oauth_token_status: "valid",
      oauth_scopes: [
        REQUIRED_DEPLOYMENT_OAUTH_SCOPES[0],
        REQUIRED_DEPLOYMENT_OAUTH_SCOPES[1]
      ]
    });
  });
});
