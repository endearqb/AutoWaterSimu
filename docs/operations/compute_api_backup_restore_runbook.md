# Compute API Backup And Restore Runbook

## Scope

This runbook covers the current durable Compute API deployment shape:

- PostgreSQL metadata configured through `COMPUTE_API_DATABASE_URL`;
- local artifact object files configured through `COMPUTE_API_ARTIFACT_DIR`;
- no in-process archive backend and no built-in point-in-time recovery.

Use this runbook before enabling destructive artifact retention deletion or before a risky migration. It does not replace managed PostgreSQL backups, object-store versioning, or deployment-specific disaster recovery.

## Backup Contents

Back up these as one consistency unit:

| Item | Source | Notes |
|---|---|---|
| Metadata database | `COMPUTE_API_DATABASE_URL` | Includes jobs, workers, artifact metadata, events, model runs, registries, confirmations, explanations, and benchmark runs |
| Artifact object files | `COMPUTE_API_ARTIFACT_DIR` | Contains large result payloads referenced by artifact metadata |
| Deployment config inventory | operator-maintained | Record non-secret values such as API version, migration version, artifact dir path, and retention scheduler settings |

Do not put bearer tokens, signing keys, database passwords, or update-channel keys in the backup manifest.

In-memory Compute API mode is for local smoke only. It has no durable backup path.

## Pre-Backup Checklist

1. Schedule a maintenance window or choose a quiescent period.
2. Stop workers from claiming new jobs.
3. Wait for running jobs to finish, cancel them, or explicitly record why a crash-consistent backup is acceptable.
4. Run retention dry-run, not deletion, and save the report if retention changes are part of the maintenance:

```powershell
$headers = @{ Authorization = "Bearer <artifact-admin-token>" }
$body = '{"dry_run":true,"limit":100}'
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8088/api/v1/admin/artifacts/retention-sweep `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

## Backup Procedure

Set local variables for the backup run:

```powershell
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$backupRoot = "D:\autowatersimu-backups\compute-api-$stamp"
$artifactDir = $env:COMPUTE_API_ARTIFACT_DIR
if ([string]::IsNullOrWhiteSpace($artifactDir)) {
  throw "COMPUTE_API_ARTIFACT_DIR must be set to the durable artifact directory"
}
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
```

Dump PostgreSQL metadata:

```powershell
pg_dump `
  --format=custom `
  --file (Join-Path $backupRoot "metadata.dump") `
  $env:COMPUTE_API_DATABASE_URL
```

Copy artifact object files into the same backup root:

```powershell
$artifactBackupDir = Join-Path $backupRoot "artifacts"
robocopy $artifactDir $artifactBackupDir /MIR /R:2 /W:5
if ($LASTEXITCODE -ge 8) {
  throw "robocopy artifact backup failed with exit code $LASTEXITCODE"
}
```

Write a minimal manifest with hashes for the metadata dump and top-level inventory:

```powershell
$metadataDump = Join-Path $backupRoot "metadata.dump"
$manifest = [ordered]@{
  schema_version = "compute_api_backup_manifest.v1"
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  backup_root = $backupRoot
  artifact_dir_source = $artifactDir
  metadata_dump = "metadata.dump"
  metadata_dump_sha256 = (Get-FileHash $metadataDump -Algorithm SHA256).Hash.ToLowerInvariant()
  artifact_backup_dir = "artifacts"
  compute_api_database_url_recorded = [bool](-not [string]::IsNullOrWhiteSpace($env:COMPUTE_API_DATABASE_URL))
  retention_sweep_interval = $env:COMPUTE_API_RETENTION_SWEEP_INTERVAL
  retention_sweep_dry_run = $env:COMPUTE_API_RETENTION_SWEEP_DRY_RUN
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $backupRoot "manifest.json") -Encoding UTF8
```

Store the backup root somewhere outside the live artifact directory.

## Restore Preconditions

Restore is destructive. Do not restore over a live writer.

1. Stop the Compute API process.
2. Stop all workers.
3. Confirm the target database is the intended restore target.
4. Confirm the artifact directory path is the intended restore target.
5. Verify the backup manifest and metadata dump hash before changing the target.

```powershell
$backupRoot = "D:\autowatersimu-backups\compute-api-<stamp>"
$manifest = Get-Content -Path (Join-Path $backupRoot "manifest.json") -Raw | ConvertFrom-Json
$metadataDump = Join-Path $backupRoot $manifest.metadata_dump
$actualHash = (Get-FileHash $metadataDump -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $manifest.metadata_dump_sha256) {
  throw "metadata dump checksum mismatch"
}
```

## Restore Procedure

Restore PostgreSQL metadata:

```powershell
pg_restore `
  --clean `
  --if-exists `
  --dbname $env:COMPUTE_API_DATABASE_URL `
  $metadataDump
```

Replace the artifact directory only after the metadata restore succeeds:

```powershell
$artifactDir = $env:COMPUTE_API_ARTIFACT_DIR
$previousArtifactDir = "$artifactDir.before-restore-$((Get-Date).ToString('yyyyMMddHHmmss'))"
if (Test-Path -LiteralPath $artifactDir) {
  Rename-Item -LiteralPath $artifactDir -NewName (Split-Path -Leaf $previousArtifactDir)
}
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
robocopy (Join-Path $backupRoot "artifacts") $artifactDir /MIR /R:2 /W:5
if ($LASTEXITCODE -ge 8) {
  throw "robocopy artifact restore failed with exit code $LASTEXITCODE"
}
```

Keep the renamed previous artifact directory until the restore is verified.

## Post-Restore Verification

1. Start the Compute API process.
2. Check health and readiness:

```powershell
Invoke-RestMethod http://localhost:8088/healthz
Invoke-RestMethod http://localhost:8088/readyz
```

3. Check metrics and confirm artifact metadata exists:

```powershell
(Invoke-WebRequest http://localhost:8088/metrics).Content
```

4. Download at least one known artifact and verify `X-Artifact-Checksum` is present.
5. Resolve representative job-scoped evidence refs for a restored completed job.
6. Run a retention dry-run before re-enabling scheduled deletion.

## Recovery Limits

- The current Compute API does not provide point-in-time recovery.
- Retention deletion is not reversible unless the metadata dump and artifact files are restored as a matching pair.
- If artifact files are moved to object storage later, use provider-native versioning/retention in addition to this metadata procedure.
- Archive-candidate retention still requires a separate archive backend design; this runbook only protects existing local artifacts through backup/restore.
