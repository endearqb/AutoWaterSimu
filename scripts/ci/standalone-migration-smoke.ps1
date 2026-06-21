param(
    [string]$LegacyDatabaseUrl = $env:AUTOWATERSIMU_LEGACY_DATABASE_URL,
    [string]$TargetDatabaseUrl = $env:COMPUTE_API_DATABASE_URL,
    [string]$ReportPath = "tmp\legacy-migration-report.json"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

Push-Location apps\api
try {
    go test ./internal/legacyimport ./cmd/migrate-legacy
} finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace($LegacyDatabaseUrl) -or [string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
    Write-Host "standalone migration smoke: skipped live DB dry-run because AUTOWATERSIMU_LEGACY_DATABASE_URL or COMPUTE_API_DATABASE_URL is not set"
    exit 0
}

New-Item -ItemType Directory -Force -Path (Split-Path $ReportPath) | Out-Null
Push-Location apps\api
try {
    go run ./cmd/migrate-legacy `
        --legacy-database-url $LegacyDatabaseUrl `
        --target-database-url $TargetDatabaseUrl `
        --dry-run `
        --resume `
        --report (Join-Path "..\.." $ReportPath)
} finally {
    Pop-Location
}

Write-Host "standalone migration smoke: passed"
