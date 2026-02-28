# API v1 Route Map (PRD-00)

Canonical source contract: `packages/contracts/src/routes/v1-route-map.ts` (`V1_ROUTE_MAP`).

## Contract Freeze

This route map is frozen for PRD-00.
Adding, removing, or changing existing route definitions is a breaking API change.

## MVP Route Inventory

| Method | Path | Auth Policy |
|---|---|---|
| `POST` | `/api/v1/intent` | `REQUIRED` |
| `POST` | `/api/v1/deployments` | `REQUIRED` |
| `GET` | `/api/v1/deployments/{deployment_id}` | `REQUIRED` |
| `POST` | `/api/v1/deployments/{deployment_id}/retry` | `REQUIRED` |
| `GET` | `/api/v1/templates` | `REQUIRED` |
| `GET` | `/api/v1/health` | `NONE` |
