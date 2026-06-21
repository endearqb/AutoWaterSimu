# 0017 - Standalone Boundary And Provider Modes

## Status

Accepted.

## Context

The new standalone requirements set a stricter target than earlier Go Compute API P0 work:

- AutoWaterSimu Next must run without FastAPI.
- The default standalone mode has no login and no Bearer token.
- PostgreSQL remains the metadata baseline, owned by AutoWaterSimu Next in its own database or schema.
- The Python worker executes jobs but does not read or write business databases.
- NewSystem owns IAM and plant/business context in future integration.

This supersedes the static-token-only P0 auth baseline in decision `0002` for standalone development, while preserving static token as a regression/security mode.

## Decision

Use explicit provider modes instead of scattering standalone branches through handlers:

- Auth modes: `disabled`, `static_token`, future `newsystem_jwt`.
- `disabled` returns a fixed standalone principal with all AutoWaterSimu scopes and no tenant/project/site scope by default.
- `disabled` defaults to loopback binding. Non-loopback no-auth startup requires an explicit dangerous opt-in.
- `static_token` keeps the current token/scope/security smoke behavior.
- NewSystem integration is future work behind provider interfaces; it must not change worker contracts or historical simulation tables.

Use PostgreSQL as the standalone durable metadata store:

- Prefer an independent `autowatersimu_next` database.
- If sharing a PostgreSQL database, use a separately owned `simulation` schema.
- Worker processes remain database-blind and interact only through the Go API worker protocol.

Use artifact profiles:

- Minimal standalone uses local filesystem artifacts.
- Full standalone may add MinIO/S3-compatible object storage.
- Database tables store artifact metadata and checksums, not large time-series payloads.

## Consequences

- `0002` remains valid for static-token regression mode, but not as the default standalone auth mode.
- Phase 1 must introduce a PrincipalProvider-style boundary before changing handler behavior.
- Phase 2 can remove frontend login redirects without weakening static-token security tests.
- Future NewSystem JWT/context providers can be added without changing compute contracts, worker behavior, or historical result identity.

## Alternatives Considered

- Delete auth entirely for standalone: rejected because static-token regression and future NewSystem JWT need the same handler boundary.
- Keep static token as standalone default: rejected because the standalone requirement explicitly requires no login and no Bearer token.
- Let worker write PostgreSQL directly: rejected because it couples scientific execution to platform persistence and makes replay/audit harder.

## Follow-up

- Phase 1: implement auth mode config, disabled provider, loopback guard, worker optional token, and standalone compose skeleton.
- Phase 2: remove standalone frontend login redirects, `/users/me` mocks, and default compute token sending.
- Phase 6: implement legacy migration using source hashes and imported history for non-convertible records.
