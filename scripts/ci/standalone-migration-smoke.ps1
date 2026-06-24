param(
    [string]$LegacyDatabaseUrl = $env:AUTOWATERSIMU_LEGACY_DATABASE_URL,
    [string]$TargetDatabaseUrl = $env:COMPUTE_API_DATABASE_URL,
    [string]$ReportPath = "tmp\legacy-migration-report.json",
    [string]$EvidenceDir = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $repoRoot "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

function Get-GitText {
    param([string[]]$Arguments)
    $output = & git @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Write-Evidence {
    param(
        [string]$Status,
        [bool]$LiveDryRun,
        [string]$Message
    )
    $evidence = [ordered]@{
        schema_version = "autowatersimu_next_standalone_migration_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = [string]$repoRoot
        commit_sha = Get-GitText -Arguments @("rev-parse", "HEAD")
        branch = Get-GitText -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
        status = $Status
        live_db_dry_run = $LiveDryRun
        message = $Message
        report_path = $ReportPath
    }
    $path = Join-Path $EvidenceDir "standalone-migration-smoke.json"
    $evidence | ConvertTo-Json -Depth 6 | Set-Content -Path $path -Encoding UTF8
    Write-Host "standalone migration smoke evidence: $path"
}

Push-Location apps\api
try {
    go test ./internal/legacyimport ./cmd/migrate-legacy
} finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace($LegacyDatabaseUrl) -or [string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
    $message = "skipped live DB dry-run because AUTOWATERSIMU_LEGACY_DATABASE_URL or COMPUTE_API_DATABASE_URL is not set"
    Write-Host "standalone migration smoke: $message"
    Write-Evidence -Status "passed_with_skips" -LiveDryRun $false -Message $message
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
Write-Evidence -Status "passed" -LiveDryRun $true -Message "live DB dry-run passed"
