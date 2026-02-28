import { describe, expect, it } from "vitest";

import { API_ERROR_CODES } from "../src/errors/index.js";
import {
  V1_ROUTE_ERROR_MATRIX,
  V1_ROUTE_MAP,
  getV1RouteKey
} from "../src/routes/index.js";

describe("V1 route error conformance", () => {
  it("defines required and allowed error codes for every route", () => {
    for (const route of V1_ROUTE_MAP) {
      const routeKey = getV1RouteKey(route.method, route.path);
      const conformance =
        V1_ROUTE_ERROR_MATRIX[
          routeKey as keyof typeof V1_ROUTE_ERROR_MATRIX
        ];

      expect(conformance).toBeDefined();
      if (!conformance) {
        throw new Error(`Missing conformance for ${routeKey}`);
      }
      expect(conformance.required.length).toBeGreaterThan(0);
      expect(conformance.allowed.length).toBeGreaterThan(0);
    }
  });

  it("auth-required routes include UNAUTHORIZED, while health does not", () => {
    for (const route of V1_ROUTE_MAP) {
      const routeKey = getV1RouteKey(route.method, route.path);
      const conformance =
        V1_ROUTE_ERROR_MATRIX[
          routeKey as keyof typeof V1_ROUTE_ERROR_MATRIX
        ];
      if (!conformance) {
        throw new Error(`Missing conformance for ${routeKey}`);
      }

      if (route.authPolicy === "REQUIRED") {
        expect(conformance.required).toContain("UNAUTHORIZED");
      }

      if (route.path === "/api/v1/health") {
        expect(conformance.required).not.toContain("UNAUTHORIZED");
        expect(conformance.allowed).not.toContain("UNAUTHORIZED");
      }
    }
  });

  it("uses only canonical error codes", () => {
    const canonicalCodes = new Set(API_ERROR_CODES);

    for (const conformance of Object.values(V1_ROUTE_ERROR_MATRIX)) {
      for (const code of conformance.required) {
        expect(canonicalCodes.has(code)).toBe(true);
      }

      for (const code of conformance.allowed) {
        expect(canonicalCodes.has(code)).toBe(true);
      }
    }
  });

  it("covers baseline and route-specific error requirements", () => {
    for (const route of V1_ROUTE_MAP) {
      const routeKey = getV1RouteKey(route.method, route.path);
      const conformance =
        V1_ROUTE_ERROR_MATRIX[
          routeKey as keyof typeof V1_ROUTE_ERROR_MATRIX
        ];
      if (!conformance) {
        throw new Error(`Missing conformance for ${routeKey}`);
      }

      expect(conformance.required).toContain("METHOD_NOT_ALLOWED");
      expect(conformance.required).toContain("INTERNAL_ERROR");

      if (route.method === "POST") {
        expect(conformance.required).toContain("INVALID_SCHEMA");
      }
    }

    const deploymentsCreate =
      V1_ROUTE_ERROR_MATRIX["POST /api/v1/deployments"];
    const deploymentsRetry =
      V1_ROUTE_ERROR_MATRIX[
        "POST /api/v1/deployments/{deployment_id}/retry"
      ];
    if (!deploymentsCreate || !deploymentsRetry) {
      throw new Error("Missing deployment conformance entries");
    }

    expect(deploymentsCreate.required).toContain("CONFLICT");
    expect(deploymentsCreate.required).toContain("DEPLOY_NOT_READY");
    expect(deploymentsRetry.required).toContain("CONFLICT");
    expect(deploymentsRetry.required).toContain("DEPLOY_NOT_READY");
  });

  it("exports an immutable route error matrix", () => {
    const requiredCodes = V1_ROUTE_ERROR_MATRIX["POST /api/v1/intent"]
      .required as string[];

    expect(() => {
      requiredCodes.push("INTERNAL_ERROR");
    }).toThrow(TypeError);
  });
});
