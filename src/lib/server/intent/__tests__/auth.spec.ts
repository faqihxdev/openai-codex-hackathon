import { describe, expect, test, vi } from "vitest";

import {
  type AuthorizeSession,
  guardIntentAccess
} from "@/lib/server/intent/auth";

describe("intent auth guard", () => {
  test("returns UNAUTHORIZED when user_id is missing", async () => {
    const authorizeSession = vi.fn<AuthorizeSession>();

    const result = await guardIntentAccess({
      context: { user_id: null },
      session_id: "sess-123",
      authorizeSession
    });

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      details: {
        reason: "missing_user_id",
        session_id: "sess-123"
      }
    });
    expect(authorizeSession).not.toHaveBeenCalled();
  });

  test("returns FORBIDDEN when session access is denied", async () => {
    const authorizeSession = vi.fn<AuthorizeSession>().mockReturnValue(false);

    const result = await guardIntentAccess({
      context: { user_id: "user-123" },
      session_id: "sess-123",
      authorizeSession
    });

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      details: {
        reason: "session_access_denied",
        user_id: "user-123",
        session_id: "sess-123"
      }
    });
    expect(authorizeSession).toHaveBeenCalledOnce();
    expect(authorizeSession).toHaveBeenCalledWith({
      user_id: "user-123",
      session_id: "sess-123"
    });
  });

  test("returns ok with identifiers when session access is allowed", async () => {
    const authorizeSession = vi.fn<AuthorizeSession>().mockResolvedValue(true);

    const result = await guardIntentAccess({
      context: { user_id: "user-123" },
      session_id: "sess-123",
      authorizeSession
    });

    expect(result).toEqual({
      ok: true,
      user_id: "user-123",
      session_id: "sess-123"
    });
    expect(authorizeSession).toHaveBeenCalledOnce();
    expect(authorizeSession).toHaveBeenCalledWith({
      user_id: "user-123",
      session_id: "sess-123"
    });
  });

  test("returns UNAUTHORIZED when user_id is whitespace-only", async () => {
    const authorizeSession = vi.fn<AuthorizeSession>();

    const result = await guardIntentAccess({
      context: { user_id: "   " },
      session_id: "sess-123",
      authorizeSession
    });

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      details: {
        reason: "missing_user_id",
        session_id: "sess-123"
      }
    });
    expect(authorizeSession).not.toHaveBeenCalled();
  });

  test("normalizes trimmed user_id before authorization", async () => {
    const authorizeSession = vi.fn<AuthorizeSession>().mockResolvedValue(true);

    const result = await guardIntentAccess({
      context: { user_id: " user-1 " },
      session_id: "sess-123",
      authorizeSession
    });

    expect(result).toEqual({
      ok: true,
      user_id: "user-1",
      session_id: "sess-123"
    });
    expect(authorizeSession).toHaveBeenCalledOnce();
    expect(authorizeSession).toHaveBeenCalledWith({
      user_id: "user-1",
      session_id: "sess-123"
    });
  });
});
