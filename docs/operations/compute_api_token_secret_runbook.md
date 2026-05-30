# Compute API Token And Secret Runbook

## Scope

This runbook covers the current Compute API P0 authentication boundary:

- static bearer tokens loaded from `COMPUTE_API_TOKENS_JSON`;
- route-level scopes enforced by the Go API;
- config-level token revocation through `revoked:true`;
- production handling expectations for token storage, rotation, validation, and incident response.

It does not describe full RBAC, dynamic token management APIs, tenant permissions, rate limits, or secret-manager provisioning. Those are not implemented in the current Compute API.

## Current Token Model

If `COMPUTE_API_TOKENS_JSON` is unset, the API creates development-only tokens:

| Token | Intended use |
|---|---|
| `dev-public-token` | Local Web/API smoke for job, artifact, evidence, model, and explanation read/write paths |
| `dev-worker-token` | Local worker smoke for worker lifecycle, job writeback, and artifact upload |

Do not use development tokens in production, shared staging, demos with real data, or CI jobs that publish artifacts.

Production-like deployments must set `COMPUTE_API_TOKENS_JSON` through deployment secrets or CI secrets. The current process reads the token config at startup, so every token config change requires a controlled API restart or redeploy.

Example shape with placeholder values only:

```json
{
  "tokens": [
    {
      "name": "web-public",
      "token": "<new-public-token>",
      "scopes": ["job:create", "job:read", "artifact:read", "evidence:read", "model:write", "explanation:write"]
    },
    {
      "name": "worker-a",
      "token": "<new-worker-token>",
      "scopes": ["worker:register", "worker:claim", "worker:heartbeat", "job:write", "artifact:write"]
    },
    {
      "name": "artifact-admin",
      "token": "<new-artifact-admin-token>",
      "scopes": ["artifact:admin"]
    },
    {
      "name": "old-worker-a",
      "token": "<old-worker-token>",
      "scopes": ["worker:register", "worker:claim", "worker:heartbeat", "job:write", "artifact:write"],
      "revoked": true
    }
  ]
}
```

Token values must be unique. Duplicate token values are rejected during authenticator setup.

## Scope Boundaries

Use the narrowest token class that can perform the task:

| Actor | Allowed scopes | Do not grant |
|---|---|---|
| Web/public API client | `job:create`, `job:read`, `artifact:read`, `evidence:read`, `model:write`, `explanation:write` when the client needs those flows | `artifact:admin`, worker scopes |
| Simulation worker | `worker:register`, `worker:claim`, `worker:heartbeat`, `job:write`, `artifact:write` | public read/write scopes, `artifact:admin`, `explanation:write` |
| Artifact retention admin automation | `artifact:admin` | worker scopes or broad public scopes unless a separate reviewed automation need exists |
| Read-only evidence integration | `job:read`, `artifact:read`, `evidence:read` | worker scopes, mutation scopes, `artifact:admin` |

Do not reuse worker tokens for admin retention deletion. Do not use artifact admin tokens for normal job submission.

## Secret Storage Rules

1. Store token values in the deployment secret manager, CI secret store, or an equivalent restricted configuration channel.
2. Keep only placeholder values in this repository, runbooks, issue comments, PR descriptions, logs, screenshots, and backup manifests.
3. Do not print `Authorization` headers, raw `COMPUTE_API_TOKENS_JSON`, database URLs with passwords, signing keys, or update-channel keys.
4. Limit access to token config changes to operators who can also restart or redeploy the Compute API.
5. Review backups with `docs/operations/compute_api_backup_restore_runbook.md`; backup manifests must record non-secret inventory only.

Generate tokens outside the repository. One PowerShell-compatible option is:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
```

## Planned Rotation Procedure

Use an overlap window for normal rotation:

1. Generate a new high-entropy token outside the repository.
2. Add the new token to `COMPUTE_API_TOKENS_JSON` with the same or narrower scopes as the token it replaces.
3. Deploy or restart the Compute API so the new config is loaded.
4. Update the dependent client, worker, or admin automation to use the new token.
5. Verify the new token against a narrow endpoint for its scope.
6. Keep the old token active only for the agreed overlap window.
7. Mark the old token record with `revoked:true`.
8. Deploy or restart the Compute API again.
9. Verify the old token is rejected and the new token still works.
10. Remove the old token record in a later cleanup once logs show no remaining use.

Do not widen scopes during rotation unless the deployment owner explicitly approves the new access.

## Validation Commands

Health and readiness do not require auth:

```powershell
Invoke-RestMethod http://localhost:8088/healthz
Invoke-RestMethod http://localhost:8088/readyz
```

Validate a read token with a read endpoint:

```powershell
$headers = @{ Authorization = "Bearer <public-read-token>" }
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:8088/api/v1/compute/jobs `
  -Headers $headers
```

Validate an artifact admin token with dry-run only:

```powershell
$headers = @{ Authorization = "Bearer <artifact-admin-token>" }
$body = '{"dry_run":true,"limit":10}'
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8088/api/v1/admin/artifacts/retention-sweep `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Validate a revoked or unknown token fails:

```powershell
$headers = @{ Authorization = "Bearer <revoked-or-invalid-token>" }
try {
  Invoke-RestMethod `
    -Method Get `
    -Uri http://localhost:8088/api/v1/compute/jobs `
    -Headers $headers
  throw "unexpected success for revoked or invalid token"
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

Expected result is `401` for an unknown or revoked token, and `403` when the token exists but lacks the required scope.

Focused code validation:

```powershell
cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics|TestStaticTokenRevocation|TestHTTPArtifactRetentionSweepRequiresAdminScope" -count=1
```

## Incident Response

Use this path when a token is suspected to be exposed:

1. Identify the token class and impacted scopes without copying the token value into notes.
2. Add `revoked:true` to the exposed token record or remove the record entirely if no overlap is needed.
3. Generate replacement tokens for any affected live clients or workers.
4. Deploy or restart the Compute API.
5. Verify the exposed token is rejected with `401`.
6. Verify replacement tokens work only for their intended narrow endpoints.
7. Review API, worker, CI, and deployment logs for unusual use of the impacted scopes.
8. Rotate any downstream secrets that may have been exposed through the same channel.
9. Record the incident outcome without raw secret values.

If the exposed token had `artifact:admin`, also run the retention and backup checks in `compute_api_lifecycle_runbook.md` and `compute_api_backup_restore_runbook.md` before any destructive retention operation continues.
