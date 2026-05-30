# AutoWaterSimu Next Support Bundle Runbook

## Scope

This runbook covers the currently implemented support and evidence export surfaces:

- Desktop support bundles created by `support_bundle_create(job_id)`.
- Desktop project packages and runtime backups that can include support bundle file records.
- Compute API evidence packages returned by `GET /api/v1/compute/jobs/{job_id}/evidence`.

It does not introduce a production upload service, ticketing integration, or external object-store archive backend.

## Desktop Support Bundles

Desktop support bundles are runtime-local JSON files with `schema_version = desktop_support_bundle.v1`.

Current behavior:

- The bundle is created for a specific job id.
- The file is written under the Desktop runtime `support_bundles/` directory.
- A `support_bundle.created` job event is recorded.
- Bundle metadata is persisted in SQLite.
- Artifact bytes are excluded by default.
- Project package export/import can include support bundle refs and, when file-backed export is used, verified support bundle file records.

The current redaction contract records:

```json
{
  "artifact_contents_included": false,
  "stderr_tail_only": true
}
```

Do not add raw artifact payloads, secrets, bearer tokens, database passwords, or full environment dumps to support bundles.

## Desktop Backup And Restore Relation

Runtime backup/restore is broader than a support bundle:

- Backup copies SQLite, artifacts, and support bundles into a runtime-local `backups/<backup_id>/` directory.
- Restore verifies `manifest.json` checksums before replacing runtime SQLite/artifact/support bundle files.
- Restore applies migrations after copying the backed-up SQLite file.

Use backup/restore for local disaster recovery. Use support bundles for job-scoped troubleshooting.

## Compute API Evidence Packages

Compute API evidence package export is not a Desktop support bundle. It returns `evidence_package.v1` for a completed job and is intended for audit/integration reads.

Current behavior:

- Evidence package references artifacts and model runs by id.
- Large artifact bytes are not inlined.
- The response exposes `X-Evidence-Checksum` for browser clients.
- Evidence reference dereference remains scoped to the job boundary.
- Governance flags are read-only evidence metadata and do not publish production commands.

## Operator Checklist

1. Identify whether the request needs a Desktop support bundle, a Desktop backup, or a Compute API evidence package.
2. For Desktop support bundles, collect the `object_key`, checksum, job id, and creation time from the UI or runtime response.
3. For project package transfer, prefer file-backed project package export so support bundle files are checksum-recorded.
4. Before restore, keep a copy of the current runtime directory.
5. Do not paste support bundle JSON into public tickets without reviewing redaction metadata.

## Validation

Recommended validation after changing Desktop support bundle logic:

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml support_bundle
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml project_package
```

Recommended validation after changing Compute API evidence export:

```powershell
cd apps\api; go test ./internal/compute -run Evidence -count=1
cd frontend; npx tsc --noEmit
```
