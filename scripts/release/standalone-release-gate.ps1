param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [switch]$SkipLong,
    [switch]$RunComposeSmoke,
    [switch]$RunBackupRestoreLive,
    [switch]$RunPostgresMigrationSmoke,
    [switch]$RunReleaseImageSmoke,
    [switch]$FailOnSkip
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

function Test-IsWindows {
    return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
}

function Resolve-NativeCommand {
    param([string]$Name)
    if ((Test-IsWindows) -and ($Name -in @("npm", "npx"))) {
        return "$Name.cmd"
    }
    return $Name
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

function Invoke-BlockStep {
    param(
        [string]$Name,
        [scriptblock]$Body
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $exitCode = 0
    $outputText = ""
    try {
        $result = & $Body
        $outputText = if ($null -eq $result) { "" } else { (($result | ForEach-Object { [string]$_ }) -join "`n").Trim() }
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    $script:Steps.Add((New-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:Failed = $true
    }
}

function Mark-EvidenceGaps {
    param(
        [string]$Path,
        [string[]]$PartialStatuses
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        $script:Skipped = $true
        return
    }
    try {
        $evidence = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        if ($PartialStatuses -contains [string]$evidence.status) {
            $script:Skipped = $true
        }
    }
    catch {
        $script:Skipped = $true
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\release-evidence"
}
$ciEvidenceDir = Join-Path $Root "tmp\ci-evidence"
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
New-Item -ItemType Directory -Force -Path $ciEvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:Skipped = $false
$fullRc = [bool]($RunComposeSmoke -and $RunBackupRestoreLive -and $RunPostgresMigrationSmoke -and $RunReleaseImageSmoke -and -not $SkipLong)
$failOnAnySkip = [bool]($FailOnSkip -or $fullRc)
$npx = Resolve-NativeCommand -Name "npx"
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)
$powershellExe = "powershell"

Invoke-BlockStep -Name "standalone compose service boundary" -Body {
    Push-Location $Root
    try {
        $output = & docker compose -f docker-compose.standalone.yml config --services 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw (($output | ForEach-Object { [string]$_ }) -join "`n")
        }
        $services = @($output | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        foreach ($forbidden in @("backend", "legacy-backend")) {
            if ($services -contains $forbidden) {
                throw "standalone compose must not include service: $forbidden"
            }
        }
        foreach ($required in @("compute-postgres", "compute-api", "simulation-worker", "frontend")) {
            if ($services -notcontains $required) {
                throw "standalone compose missing service: $required"
            }
        }
        $services -join ", "
    }
    finally {
        Pop-Location
    }
}

if ($RunReleaseImageSmoke) {
    Invoke-Step `
        -Name "standalone image build smoke" `
        -WorkingDirectory $Root `
        -Executable "docker" `
        -Arguments @("compose", "-p", "autowatersimu-standalone-release-gate", "-f", "docker-compose.standalone.yml", "build")
}
else {
    Add-Step -Name "standalone image build smoke" -Status "skipped" -ExitCode 0 -Output "Pass -RunReleaseImageSmoke to build standalone compose images."
}

Invoke-Step -Name "go compute api tests" -WorkingDirectory (Join-Path $Root "apps\api") -Executable "go" -Arguments @("test", "./...")
Invoke-Step -Name "frontend standalone typecheck" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @("tsc", "--noEmit")
Invoke-Step -Name "compute api boundary audit" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\audit-compute-api-boundary.ps1"))
Invoke-Step -Name "frontend standalone compute boundary audit" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\audit-frontend-standalone-compute-boundary.ps1"))
Invoke-Step -Name "standalone migration smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-migration-smoke.ps1"))
Invoke-Step -Name "standalone five-model smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-five-model-smoke.ps1"), "-EvidenceDir", $ciEvidenceDir)

$backupArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-backup-restore-smoke.ps1"), "-EvidenceDir", $ciEvidenceDir)
if ($RunBackupRestoreLive) {
    $backupArgs += "-RunLive"
}
Invoke-Step -Name "standalone backup/restore smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments $backupArgs
Mark-EvidenceGaps -Path (Join-Path $ciEvidenceDir "standalone-backup-restore-smoke.json") -PartialStatuses @("passed_with_skips")

if ($RunPostgresMigrationSmoke -or -not [string]::IsNullOrWhiteSpace($env:COMPUTE_API_DATABASE_URL)) {
    if ([string]::IsNullOrWhiteSpace($env:COMPUTE_API_DATABASE_URL)) {
        Add-Step -Name "postgres migration rollback smoke" -Status "skipped" -ExitCode 0 -Output "COMPUTE_API_DATABASE_URL is not set."
    }
    else {
        $previousDownSmoke = $env:COMPUTE_API_MIGRATION_DOWN_SMOKE
        $env:COMPUTE_API_MIGRATION_DOWN_SMOKE = "true"
        try {
            Invoke-Step `
                -Name "postgres migration rollback smoke" `
                -WorkingDirectory (Join-Path $Root "apps\api") `
                -Executable "go" `
                -Arguments @("test", "./internal/compute", "-run", "TestPostgresMigrations(Up|Down)Smoke", "-count=1")
        }
        finally {
            $env:COMPUTE_API_MIGRATION_DOWN_SMOKE = $previousDownSmoke
        }
    }
}
else {
    Add-Step -Name "postgres migration rollback smoke" -Status "skipped" -ExitCode 0 -Output "Pass -RunPostgresMigrationSmoke with COMPUTE_API_DATABASE_URL pointing to a temporary database."
}

if ($RunComposeSmoke) {
    Invoke-Step `
        -Name "standalone live API no-auth smoke" `
        -WorkingDirectory $Root `
        -Executable $powershellExe `
        -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-smoke.ps1"), "-EvidenceDir", $ciEvidenceDir)
}
else {
    Add-Step -Name "standalone live API no-auth smoke" -Status "skipped" -ExitCode 0 -Output "Pass -RunComposeSmoke after starting standalone compose."
}

if ($SkipLong) {
    Invoke-Step `
        -Name "golden scenarios summary" `
        -WorkingDirectory $Root `
        -Executable $powershellExe `
        -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\golden-scenarios.ps1"))
}
else {
    Invoke-Step `
        -Name "golden scenarios refresh" `
        -WorkingDirectory $Root `
        -Executable $powershellExe `
        -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\golden-scenarios.ps1"), "-RefreshLocalEvidence")
}
Mark-EvidenceGaps -Path (Join-Path $ciEvidenceDir "golden-scenarios.json") -PartialStatuses @("partial", "missing", "blocked")

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
$trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
$untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)

$report = [ordered]@{
    schema_version = "autowatersimu_next_standalone_release_gate_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed -or ($failOnAnySkip -and $script:Skipped)) { "failed" } elseif ($script:Skipped) { "passed_with_skips" } else { "passed" }
    full_rc = $fullRc
    fail_on_skip = $failOnAnySkip
    skip_long = [bool]$SkipLong
    run_compose_smoke = [bool]$RunComposeSmoke
    run_backup_restore_live = [bool]$RunBackupRestoreLive
    run_postgres_migration_smoke = [bool]$RunPostgresMigrationSmoke
    run_release_image_smoke = [bool]$RunReleaseImageSmoke
    ci_evidence_dir = $ciEvidenceDir
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

$evidencePath = Join-Path $EvidenceDir "standalone-release-gate.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Standalone release gate evidence: $evidencePath"

if ($script:Failed -or ($failOnAnySkip -and $script:Skipped)) {
    exit 1
}
