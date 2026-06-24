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

function Resolve-PowerShellCommand {
    if (Test-IsWindows) {
        return "powershell"
    }
    return "pwsh"
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
        [string[]]$PartialStatuses,
        [string]$HeadCommit = ""
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        $script:EvidenceGaps.Add([ordered]@{
            path = $Path
            status = "missing"
            message = "evidence file is missing"
        }) | Out-Null
        $script:Skipped = $true
        return
    }
    try {
        $evidence = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        $status = [string]$evidence.status
        if ($PartialStatuses -contains $status) {
            $message = ""
            if ($evidence.PSObject.Properties.Name -contains "message") {
                $message = [string]$evidence.message
            }
            $script:EvidenceGaps.Add([ordered]@{
                path = $Path
                status = $status
                message = $message
            }) | Out-Null
            $script:Skipped = $true
            return
        }
        if (-not [string]::IsNullOrWhiteSpace($HeadCommit)) {
            $evidenceCommit = ""
            if ($evidence.PSObject.Properties.Name -contains "commit_sha") {
                $evidenceCommit = [string]$evidence.commit_sha
            }
            if ($evidenceCommit -ne $HeadCommit) {
                $script:EvidenceGaps.Add([ordered]@{
                    path = $Path
                    status = "commit_mismatch"
                    message = "evidence commit_sha '$evidenceCommit' does not match current HEAD '$HeadCommit'"
                }) | Out-Null
                $script:Skipped = $true
            }
        }
    }
    catch {
        $script:EvidenceGaps.Add([ordered]@{
            path = $Path
            status = "invalid"
            message = $_.Exception.Message
        }) | Out-Null
        $script:Skipped = $true
    }
}

function Mark-RequiredEvidencePassed {
    param(
        [string]$Path,
        [string]$Name,
        [string]$HeadCommit = "",
        [string]$SchemaVersion = ""
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        $script:EvidenceGaps.Add([ordered]@{
            path = $Path
            status = "missing"
            message = "$Name evidence file is missing"
        }) | Out-Null
        $script:Skipped = $true
        return
    }
    try {
        $evidence = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        $message = ""
        if ($evidence.PSObject.Properties.Name -contains "message") {
            $message = [string]$evidence.message
        }
        $status = [string]$evidence.status
        if ($status -ne "passed") {
            $gapMessage = if ([string]::IsNullOrWhiteSpace($message)) { "$Name evidence status must be passed" } else { $message }
            $script:EvidenceGaps.Add([ordered]@{
                path = $Path
                status = $status
                message = $gapMessage
            }) | Out-Null
            $script:Skipped = $true
            return
        }
        if (-not [string]::IsNullOrWhiteSpace($SchemaVersion)) {
            $evidenceSchemaVersion = ""
            if ($evidence.PSObject.Properties.Name -contains "schema_version") {
                $evidenceSchemaVersion = [string]$evidence.schema_version
            }
            if ($evidenceSchemaVersion -ne $SchemaVersion) {
                $script:EvidenceGaps.Add([ordered]@{
                    path = $Path
                    status = "schema_mismatch"
                    message = "$Name evidence schema_version '$evidenceSchemaVersion' does not match expected '$SchemaVersion'"
                }) | Out-Null
                $script:Skipped = $true
            }
        }
        if (-not [string]::IsNullOrWhiteSpace($HeadCommit)) {
            $evidenceCommit = ""
            if ($evidence.PSObject.Properties.Name -contains "commit_sha") {
                $evidenceCommit = [string]$evidence.commit_sha
            }
            if ($evidenceCommit -ne $HeadCommit) {
                $script:EvidenceGaps.Add([ordered]@{
                    path = $Path
                    status = "commit_mismatch"
                    message = "$Name evidence commit_sha '$evidenceCommit' does not match current HEAD '$HeadCommit'"
                }) | Out-Null
                $script:Skipped = $true
            }
        }
    }
    catch {
        $script:EvidenceGaps.Add([ordered]@{
            path = $Path
            status = "invalid"
            message = $_.Exception.Message
        }) | Out-Null
        $script:Skipped = $true
    }
}

function Assert-SelfCheckItemOk {
    param(
        [object]$Report,
        [string]$Name
    )
    $item = $Report.PSObject.Properties[$Name]
    if ($null -eq $item) {
        throw "Worker self-check missing required field: $Name"
    }
    $ok = $item.Value.PSObject.Properties["ok"]
    if ($null -eq $ok -or $ok.Value -ne $true) {
        throw "Worker self-check failed required field: $Name"
    }
}

function Assert-WorkerImageSelfCheck {
    param([string]$Text)
    try {
        $report = $Text | ConvertFrom-Json
    }
    catch {
        throw "Worker self-check output is not valid JSON: $Text"
    }

    if ([string]::IsNullOrWhiteSpace([string]$report.worker_version)) {
        throw "Worker self-check missing worker_version."
    }

    foreach ($field in @(
        "worker_dependency_imports",
        "artifact_temp_writable",
        "minimal_job_status",
        "numpy",
        "scipy",
        "torch",
        "torchdiffeq"
    )) {
        Assert-SelfCheckItemOk -Report $report -Name $field
    }

    if ($report.worker_dependency_imports.deprecated_repo_path_fallback_used -eq $true) {
        throw "Worker self-check used deprecated repo-path dependency fallback."
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
$script:EvidenceGaps = [System.Collections.Generic.List[object]]::new()
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
$powershellExe = Resolve-PowerShellCommand

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
    Invoke-BlockStep -Name "standalone image content smoke" -Body {
        $image = "autowatersimu-standalone-simulation-worker:latest"
        $inspect = & docker image inspect $image 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw (($inspect | ForEach-Object { [string]$_ }) -join "`n")
        }
        $check = & docker run --rm --entrypoint sh $image -lc "test ! -e /workspace/backend && test ! -e /app/backend && python /workspace/services/simulation-worker/simulation_worker/cli.py --self-check" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw (($check | ForEach-Object { [string]$_ }) -join "`n")
        }
        $checkText = (($check | ForEach-Object { [string]$_ }) -join "`n").Trim()
        Assert-WorkerImageSelfCheck -Text $checkText
        $checkText
    }
}
else {
    Add-Step -Name "standalone image content smoke" -Status "skipped" -ExitCode 0 -Output "Pass -RunReleaseImageSmoke to inspect the standalone worker image."
}

Invoke-Step -Name "go compute api tests" -WorkingDirectory (Join-Path $Root "apps\api") -Executable "go" -Arguments @("test", "./...")
Invoke-Step -Name "frontend standalone typecheck" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @("tsc", "--noEmit")
Invoke-Step -Name "compute api boundary audit" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\audit-compute-api-boundary.ps1"))
Invoke-Step -Name "frontend standalone compute boundary audit" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\audit-frontend-standalone-compute-boundary.ps1"))
Invoke-Step -Name "standalone migration smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-migration-smoke.ps1"))
Mark-EvidenceGaps -Path (Join-Path $ciEvidenceDir "standalone-migration-smoke.json") -PartialStatuses @("passed_with_skips") -HeadCommit $commitSha
Invoke-Step -Name "standalone five-model smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-five-model-smoke.ps1"), "-EvidenceDir", $ciEvidenceDir)

$backupArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "scripts\ci\standalone-backup-restore-smoke.ps1"), "-EvidenceDir", $ciEvidenceDir)
if ($RunBackupRestoreLive) {
    $backupArgs += "-RunLive"
}
Invoke-Step -Name "standalone backup/restore smoke" -WorkingDirectory $Root -Executable $powershellExe -Arguments $backupArgs
Mark-EvidenceGaps -Path (Join-Path $ciEvidenceDir "standalone-backup-restore-smoke.json") -PartialStatuses @("passed_with_skips") -HeadCommit $commitSha

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
Mark-EvidenceGaps -Path (Join-Path $ciEvidenceDir "golden-scenarios.json") -PartialStatuses @("partial", "missing", "blocked") -HeadCommit $commitSha
Mark-RequiredEvidencePassed `
    -Path (Join-Path $ciEvidenceDir "standalone-five-model-live.json") `
    -Name "standalone five-model live UI/API/PostgreSQL/worker/artifact evidence" `
    -HeadCommit $commitSha `
    -SchemaVersion "autowatersimu_next_standalone_five_model_live_smoke.v1"
Mark-RequiredEvidencePassed `
    -Path (Join-Path $ciEvidenceDir "standalone-legacy-production-rehearsal.json") `
    -Name "production legacy read-only/full migration rehearsal" `
    -HeadCommit $commitSha `
    -SchemaVersion "autowatersimu_next_standalone_legacy_production_rehearsal.v1"
Mark-RequiredEvidencePassed `
    -Path (Join-Path $ciEvidenceDir "standalone-s3-artifact-profile-live.json") `
    -Name "MinIO/S3 full artifact profile live validation" `
    -HeadCommit $commitSha `
    -SchemaVersion "autowatersimu_next_standalone_s3_artifact_profile_live.v1"

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
    hosted_workflow_run = if ([string]::IsNullOrWhiteSpace($env:GITHUB_RUN_ID)) { "not_covered" } else { "github_actions_run" }
    github_run_id = $env:GITHUB_RUN_ID
    github_repository = $env:GITHUB_REPOSITORY
    github_ref = $env:GITHUB_REF
    github_sha = $env:GITHUB_SHA
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
    evidence_gaps = $script:EvidenceGaps
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "standalone-release-gate.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Standalone release gate evidence: $evidencePath"

if ($script:Failed -or ($failOnAnySkip -and $script:Skipped)) {
    exit 1
}
