import { describe, expect, it } from "vitest";

import {
  API_ERROR_CODE_DEFAULTS,
  API_ERROR_CODES,
  apiErrorSchema,
  createApiError,
  createApiErrorResponse
} from "../src/errors/index.js";

describe("API error contracts", () => {
  it("creates the standard error envelope shape with default details", () => {
    const error = createApiError({
      code: "INVALID_SCHEMA",
      message: "Payload failed validation",
      request_id: "req-123"
    });

    expect(error).toEqual({
      code: "INVALID_SCHEMA",
      message: "Payload failed validation",
      retryable: false,
      request_id: "req-123",
      details: {}
    });
  });

  it("returns helper output that validates against the schema", () => {
    const error = createApiError({
      code: "INTERNAL_ERROR",
      message: "Unexpected failure",
      request_id: "req-parse-check"
    });

    const parsed = apiErrorSchema.parse(error);
    expect(parsed).toEqual(error);
  });

  it("rejects empty runtime values for message and request_id", () => {
    expect(() =>
      createApiError({
        code: "INVALID_SCHEMA",
        message: "",
        request_id: "req-non-empty"
      })
    ).toThrow();

    expect(() =>
      createApiError({
        code: "INVALID_SCHEMA",
        message: "Has message",
        request_id: ""
      })
    ).toThrow();
  });

  it("rejects unknown error codes in schema validation", () => {
    const result = apiErrorSchema.safeParse({
      code: "UNKNOWN_CODE",
      message: "Nope",
      retryable: false,
      request_id: "req-456",
      details: {}
    });

    expect(result.success).toBe(false);
  });

  it("uses deterministic retryability and status defaults", () => {
    for (const code of API_ERROR_CODES) {
      const response = createApiErrorResponse({
        code,
        request_id: `req-${code.toLowerCase()}`
      });

      expect(response.status).toBe(API_ERROR_CODE_DEFAULTS[code].status);
      expect(response.body.error.retryable).toBe(
        API_ERROR_CODE_DEFAULTS[code].retryable
      );
    }
  });

  it("exports immutable canonical defaults", () => {
    expect(() => {
      (
        API_ERROR_CODE_DEFAULTS.INVALID_SCHEMA as {
          status: number;
          retryable: boolean;
        }
      ).status = 418;
    }).toThrow(TypeError);
  });
});
