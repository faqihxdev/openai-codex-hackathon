export type IntentAuthContext = {
  user_id: string | null;
};

type AuthorizeSessionInput = {
  user_id: string;
  session_id: string;
};

export type AuthorizeSession = (
  input: AuthorizeSessionInput
) => Promise<boolean> | boolean;

type UnauthorizedIntentAccessResult = {
  ok: false;
  code: "UNAUTHORIZED";
  details: {
    reason: "missing_user_id";
    session_id: string;
  };
};

type ForbiddenIntentAccessResult = {
  ok: false;
  code: "FORBIDDEN";
  details: {
    reason: "session_access_denied";
    user_id: string;
    session_id: string;
  };
};

type IntentAccessSuccessResult = {
  ok: true;
  user_id: string;
  session_id: string;
};

export type GuardIntentAccessResult =
  | UnauthorizedIntentAccessResult
  | ForbiddenIntentAccessResult
  | IntentAccessSuccessResult;

type GuardIntentAccessInput = {
  context: IntentAuthContext;
  session_id: string;
  authorizeSession: AuthorizeSession;
};

export async function guardIntentAccess(
  input: GuardIntentAccessInput
): Promise<GuardIntentAccessResult> {
  const { context, session_id, authorizeSession } = input;
  const user_id = context.user_id?.trim();

  if (!user_id) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      details: {
        reason: "missing_user_id",
        session_id
      }
    };
  }

  const hasAccess = await authorizeSession({ user_id, session_id });
  if (!hasAccess) {
    return {
      ok: false,
      code: "FORBIDDEN",
      details: {
        reason: "session_access_denied",
        user_id,
        session_id
      }
    };
  }

  return {
    ok: true,
    user_id,
    session_id
  };
}
