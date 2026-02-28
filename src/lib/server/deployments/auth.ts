export const REQUIRED_DEPLOYMENT_OAUTH_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/script.projects"
] as const);

export type DeploymentOAuthTokenStatus = "valid" | "missing" | "expired";

export type DeploymentAuthContext = {
  user_id: string | null;
  oauth_token_status: DeploymentOAuthTokenStatus;
  oauth_scopes: string[];
};

export type DeploymentResumeContext = {
  session_id?: string;
  idempotency_key?: string;
  deployment_id?: string;
};

type MissingUserIdAuthResult = {
  ok: false;
  code: "UNAUTHORIZED";
  retryable: false;
  details: {
    reason: "missing_user_id";
    resume_context: DeploymentResumeContext;
  };
};

type RecoverableOAuthAuthResult = {
  ok: false;
  code: "UNAUTHORIZED";
  retryable: true;
  details: {
    reason:
      | "missing_oauth_token"
      | "expired_oauth_token"
      | "missing_required_scopes";
    reauth_required: true;
    required_scopes: string[];
    granted_scopes: string[];
    missing_scopes: string[];
    resume_context: DeploymentResumeContext;
  };
};

type DeploymentAuthSuccessResult = {
  ok: true;
  user_id: string;
  required_scopes: string[];
  granted_scopes: string[];
};

export type GuardDeploymentAuthResult =
  | MissingUserIdAuthResult
  | RecoverableOAuthAuthResult
  | DeploymentAuthSuccessResult;

type GuardDeploymentAuthInput = {
  context: DeploymentAuthContext;
  resume_context: DeploymentResumeContext;
  required_scopes?: readonly string[];
};

function normalizeScopes(scopes: readonly string[]): string[] {
  const normalized = scopes
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  return [...new Set(normalized)];
}

function parseOAuthScopes(rawScopes: string | null): string[] {
  if (!rawScopes) {
    return [];
  }

  return normalizeScopes(rawScopes.split(/[,\s]+/u));
}

function buildRecoverableOAuthError(
  reason:
    | "missing_oauth_token"
    | "expired_oauth_token"
    | "missing_required_scopes",
  required_scopes: string[],
  granted_scopes: string[],
  missing_scopes: string[],
  resume_context: DeploymentResumeContext
): RecoverableOAuthAuthResult {
  return {
    ok: false,
    code: "UNAUTHORIZED",
    retryable: true,
    details: {
      reason,
      reauth_required: true,
      required_scopes,
      granted_scopes,
      missing_scopes,
      resume_context
    }
  };
}

export function guardDeploymentAuth(
  input: GuardDeploymentAuthInput
): GuardDeploymentAuthResult {
  const user_id = input.context.user_id?.trim();
  const required_scopes = normalizeScopes(
    input.required_scopes ?? REQUIRED_DEPLOYMENT_OAUTH_SCOPES
  );
  const granted_scopes = normalizeScopes(input.context.oauth_scopes);

  if (!user_id) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      retryable: false,
      details: {
        reason: "missing_user_id",
        resume_context: input.resume_context
      }
    };
  }

  if (input.context.oauth_token_status === "missing") {
    return buildRecoverableOAuthError(
      "missing_oauth_token",
      required_scopes,
      granted_scopes,
      required_scopes,
      input.resume_context
    );
  }

  if (input.context.oauth_token_status === "expired") {
    return buildRecoverableOAuthError(
      "expired_oauth_token",
      required_scopes,
      granted_scopes,
      required_scopes,
      input.resume_context
    );
  }

  const grantedScopeSet = new Set(granted_scopes);
  const missing_scopes = required_scopes.filter(
    (scope) => !grantedScopeSet.has(scope)
  );

  if (missing_scopes.length > 0) {
    return buildRecoverableOAuthError(
      "missing_required_scopes",
      required_scopes,
      granted_scopes,
      missing_scopes,
      input.resume_context
    );
  }

  return {
    ok: true,
    user_id,
    required_scopes,
    granted_scopes
  };
}

function parseOAuthTokenStatus(
  input: string | null
): DeploymentOAuthTokenStatus | null {
  const normalized = input?.trim().toLowerCase();
  if (
    normalized === "valid" ||
    normalized === "missing" ||
    normalized === "expired"
  ) {
    return normalized;
  }

  return null;
}

export function getDeploymentAuthContextFromHeaders(
  headers: Headers
): DeploymentAuthContext {
  const user_id = headers.get("x-user-id")?.trim() ?? "";
  const parsedTokenStatus = parseOAuthTokenStatus(
    headers.get("x-oauth-token-status")
  );

  return {
    user_id: user_id.length > 0 ? user_id : null,
    oauth_token_status:
      parsedTokenStatus ?? (user_id.length > 0 ? "valid" : "missing"),
    oauth_scopes: parseOAuthScopes(headers.get("x-oauth-scopes"))
  };
}
