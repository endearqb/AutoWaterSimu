param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$DatabaseUrl = $env:COMPUTE_API_DATABASE_URL,
    [string]$RestoreDatabaseUrl = $env:AUTOWATERSIMU_RESTORE_DATABASE_URL,
    [string]$ArtifactDir = $env:COMPUTE_API_ARTIFACT_DIR,
    [switch]$RunLive
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    param([string]$InputRoot)
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    }
    return (Resolve-Path $InputRoot).Path
}

function Get-GitText {
    param(
        [string]$Root,
        [string[]]$Arguments
    )
    Push-Location $Root
    try {
        $output = & git @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) {
            return ""
        }
        return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    }
    finally {
        Pop-Location
    }
}

function ConvertTo-GitStatusLines {
    param([string]$StatusText)
    return @($StatusText -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Get-TrackedStatusLines {
    param([string[]]$StatusLines)
    return @($StatusLines | Where-Object { -not $_.StartsWith("??") })
}

function Get-UntrackedStatusLines {
    param([string[]]$StatusLines)
    return @($StatusLines | Where-Object { $_.StartsWith("??") })
}

function New-Step {
    param(
        [string]$Name,
        [string]$Status,
        [int]$ExitCode,
        [string]$Output,
        [string]$StartedAt,
        [string]$FinishedAt
    )
    return [ordered]@{
        name = $Name
        status = $Status
        exit_code = $ExitCode
        started_at = $StartedAt
        finished_at = $FinishedAt
        output_excerpt = if ($Output.Length -gt 4000) { $Output.Substring($Output.Length - 4000) } else { $Output }
    }
}

function Add-Step {
    param(
        [string]$Name,
        [string]$Status,
        [int]$ExitCode,
        [string]$Output
    )
    $now = (Get-Date).ToUniversalTime().ToString("o")
    $script:Steps.Add((New-Step -Name $Name -Status $Status -ExitCode $ExitCode -Output $Output -StartedAt $now -FinishedAt $now)) | Out-Null
    if ($Status -eq "failed") {
        $script:Failed = $true
    }
    if ($Status -eq "skipped") {
        $script:Skipped = $true
    }
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $exitCode = 0
    $outputText = ""
    Push-Location $WorkingDirectory
    try {
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        $outputText = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    finally {
        Pop-Location
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    $script:Steps.Add((New-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:Failed = $true
    }
}

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Convert-DatabaseUrlForDockerHost {
    param([string]$Url)
    try {
        $builder = [System.UriBuilder]::new($Url)
        if ($builder.Host -in @("localhost", "127.0.0.1", "::1")) {
            $builder.Host = "host.docker.internal"
        }
        return $builder.Uri.AbsoluteUri
    }
    catch {
        return $Url
    }
}

function Get-ArtifactManifest {
    param([string]$RootPath)
    $resolved = (Resolve-Path $RootPath).Path
    return @(
        Get-ChildItem -LiteralPath $resolved -Recurse -File |
            Sort-Object FullName |
            ForEach-Object {
                [ordered]@{
                    path = $_.FullName.Substring($resolved.Length).TrimStart("\", "/").Replace("\", "/")
                    bytes = $_.Length
                    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
                }
            }
    )
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:Skipped = $false
$workRoot = Join-Path $Root ("tmp\standalone-backup-restore\" + (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss"))
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null

$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)

try {
    $fixtureSource = Join-Path $workRoot "artifact-source"
    $fixtureBackup = Join-Path $workRoot "artifact-backup"
    $fixtureRestore = Join-Path $workRoot "artifact-restore"
    New-Item -ItemType Directory -Force -Path $fixtureSource | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $fixtureSource "job_fixture") | Out-Null
    Set-Content -LiteralPath (Join-Path $fixtureSource "job_fixture\result.json") -Encoding UTF8 -Value '{"job_id":"job_fixture","status":"succeeded"}'
    Set-Content -LiteralPath (Join-Path $fixtureSource "job_fixture\evidence.json") -Encoding UTF8 -Value '{"schema_version":"artifact_evidence_fixture.v1"}'
    Copy-Item -LiteralPath $fixtureSource -Destination $fixtureBackup -Recurse
    Copy-Item -LiteralPath $fixtureBackup -Destination $fixtureRestore -Recurse

    $sourceManifest = @(Get-ArtifactManifest -RootPath $fixtureSource)
    $restoredManifest = @(Get-ArtifactManifest -RootPath $fixtureRestore)
    $sourceJson = $sourceManifest | ConvertTo-Json -Depth 6
    $restoredJson = $restoredManifest | ConvertTo-Json -Depth 6
    if ($sourceJson -ne $restoredJson) {
        throw "artifact fixture restore checksum mismatch"
    }
    Add-Step -Name "artifact fixture checksum backup/restore" -Status "passed" -ExitCode 0 -Output "Verified $($sourceManifest.Count) fixture artifact file checksum(s)."
}
catch {
    Add-Step -Name "artifact fixture checksum backup/restore" -Status "failed" -ExitCode 1 -Output $_.Exception.Message
}

if ([string]::IsNullOrWhiteSpace($ArtifactDir)) {
    Add-Step -Name "configured artifact directory manifest" -Status "skipped" -ExitCode 0 -Output "COMPUTE_API_ARTIFACT_DIR is not set."
}
elseif (-not (Test-Path -LiteralPath $ArtifactDir)) {
    Add-Step -Name "configured artifact directory manifest" -Status "skipped" -ExitCode 0 -Output "Configured artifact directory does not exist: $ArtifactDir"
}
else {
    try {
        $manifest = @(Get-ArtifactManifest -RootPath $ArtifactDir)
        $manifestPath = Join-Path $workRoot "configured-artifact-manifest.json"
        $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        Add-Step -Name "configured artifact directory manifest" -Status "passed" -ExitCode 0 -Output "Wrote manifest for $($manifest.Count) artifact file(s): $manifestPath"
    }
    catch {
        Add-Step -Name "configured artifact directory manifest" -Status "failed" -ExitCode 1 -Output $_.Exception.Message
    }
}

if (-not $RunLive) {
    Add-Step -Name "live postgres dump/list/restore" -Status "skipped" -ExitCode 0 -Output "Pass -RunLive with COMPUTE_API_DATABASE_URL to run pg_dump/pg_restore checks."
}
elseif ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    Add-Step -Name "live postgres dump/list/restore" -Status "skipped" -ExitCode 0 -Output "COMPUTE_API_DATABASE_URL is not set."
}
else {
    $dumpPath = Join-Path $workRoot "metadata.dump"
    if ((Test-CommandAvailable -Name "pg_dump") -and (Test-CommandAvailable -Name "pg_restore")) {
        Invoke-Step -Name "live postgres pg_dump" -WorkingDirectory $Root -Executable "pg_dump" -Arguments @("--format=custom", "--file", $dumpPath, $DatabaseUrl)
        if (-not $script:Failed) {
            Invoke-Step -Name "live postgres pg_restore list" -WorkingDirectory $Root -Executable "pg_restore" -Arguments @("--list", $dumpPath)
        }
        if ([string]::IsNullOrWhiteSpace($RestoreDatabaseUrl)) {
            Add-Step -Name "live postgres restore into temporary database" -Status "skipped" -ExitCode 0 -Output "AUTOWATERSIMU_RESTORE_DATABASE_URL is not set; not restoring into any database."
        }
        elseif (-not $script:Failed) {
            Invoke-Step `
                -Name "live postgres restore into temporary database" `
                -WorkingDirectory $Root `
                -Executable "pg_restore" `
                -Arguments @("--clean", "--if-exists", "--no-owner", "--dbname", $RestoreDatabaseUrl, $dumpPath)
        }
    }
    elseif (Test-CommandAvailable -Name "docker") {
        $dockerWorkRoot = (Resolve-Path $workRoot).Path
        $dockerDatabaseUrl = Convert-DatabaseUrlForDockerHost -Url $DatabaseUrl
        $dockerRestoreDatabaseUrl = Convert-DatabaseUrlForDockerHost -Url $RestoreDatabaseUrl
        Invoke-Step -Name "live postgres pg_dump" -WorkingDirectory $Root -Executable "docker" -Arguments @("run", "--rm", "-v", "${dockerWorkRoot}:/backup", "postgres:17", "pg_dump", "--format=custom", "--file", "/backup/metadata.dump", $dockerDatabaseUrl)
        if (-not $script:Failed) {
            Invoke-Step -Name "live postgres pg_restore list" -WorkingDirectory $Root -Executable "docker" -Arguments @("run", "--rm", "-v", "${dockerWorkRoot}:/backup", "postgres:17", "pg_restore", "--list", "/backup/metadata.dump")
        }
        if ([string]::IsNullOrWhiteSpace($RestoreDatabaseUrl)) {
            Add-Step -Name "live postgres restore into temporary database" -Status "skipped" -ExitCode 0 -Output "AUTOWATERSIMU_RESTORE_DATABASE_URL is not set; not restoring into any database."
        }
        elseif (-not $script:Failed) {
            Invoke-Step `
                -Name "live postgres restore into temporary database" `
                -WorkingDirectory $Root `
                -Executable "docker" `
                -Arguments @("run", "--rm", "-v", "${dockerWorkRoot}:/backup", "postgres:17", "pg_restore", "--clean", "--if-exists", "--no-owner", "--dbname", $dockerRestoreDatabaseUrl, "/backup/metadata.dump")
        }
    }
    else {
        Add-Step -Name "live postgres dump/list/restore" -Status "failed" -ExitCode 1 -Output "pg_dump/pg_restore are not available on PATH and docker is not available for postgres client fallback."
    }
}

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
$trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
$untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)

$report = [ordered]@{
    schema_version = "autowatersimu_next_standalone_backup_restore_smoke_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
    branch = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
    status = if ($script:Failed) { "failed" } elseif ($script:Skipped) { "passed_with_skips" } else { "passed" }
    run_live = [bool]$RunLive
    database_url_set = -not [string]::IsNullOrWhiteSpace($DatabaseUrl)
    restore_database_url_set = -not [string]::IsNullOrWhiteSpace($RestoreDatabaseUrl)
    artifact_dir = $ArtifactDir
    work_root = $workRoot
    is_dirty_before = -not [string]::IsNullOrWhiteSpace($statusBefore)
    is_dirty_after = -not [string]::IsNullOrWhiteSpace($statusAfter)
    has_tracked_changes_before = $trackedStatusBefore.Count -gt 0
    has_tracked_changes_after = $trackedStatusAfter.Count -gt 0
    dirty_files_before = $statusBeforeLines
    dirty_files_after = $statusAfterLines
    tracked_changes_before = $trackedStatusBefore
    tracked_changes_after = $trackedStatusAfter
    untracked_files_before = $untrackedStatusBefore
    untracked_files_after = $untrackedStatusAfter
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "standalone-backup-restore-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Standalone backup/restore smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
