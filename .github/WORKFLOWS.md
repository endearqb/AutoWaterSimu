# GitHub Automation

This directory stores GitHub automation configuration.

It owns:

- GitHub Actions workflows.
- Dependabot and labeler configuration.
- AutoWaterSimu Next merge, release, standalone RC, browser smoke, security smoke, and artifact evidence orchestration.

It does not own:

- Local script implementations.
- Business test logic.
- Release artifacts.

Maintenance rules:

1. Workflows should orchestrate repository scripts, caches, concurrency, and setup actions.
2. Keep long CI or gate logic in `scripts/` or the relevant app/service directory.
3. Do not upload signing keys, certificates, update-channel secrets, or publish tokens as workflow artifacts.
4. PostgreSQL migration smoke jobs must use temporary test databases, never production or shared databases.
5. Standalone full RC workflows must consume real external evidence and secrets; do not fabricate pass records in YAML.

Validation pointers:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1
```
