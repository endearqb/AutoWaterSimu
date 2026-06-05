param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ReleaseEvidenceDir = "",
    [string]$OutputPath = "",
    [switch]$RefreshLocalEvidence,
    [switch]$RunPrFast,
    [switch]$RunBrowserSmoke,
    [switch]$RunSecuritySmoke,
    [switch]$RunDesktopPackageSmoke,
    [switch]$RunReleaseArtifactDownloadSmoke,
    [switch]$RunReleaseGate,
    [switch]$RunIntegrationSmoke
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

function Resolve-PowerShell {
    if (Test-IsWindows) {
        return "powershell"
    }
    return "pwsh"
}

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
}

function New-RefreshStep {
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

function Invoke-RefreshStep {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    $exitCode = 0
    $outputText = ""
    try {
        $argumentList = ($Arguments | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
        $process = Start-Process -FilePath $Executable -ArgumentList $argumentList -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $exitCode = $process.ExitCode
        $stdout = [string](Get-Content -Path $stdoutFile -Raw)
        $stderr = [string](Get-Content -Path $stderrFile -Raw)
        $outputText = (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    $script:RefreshSteps.Add((New-RefreshStep -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:RefreshFailed = $true
    }
}

function Get-GitText {
    param(
        [string]$Root,
        [string[]]$Arguments
    )
    try {
        return [string](& git -C $Root @Arguments 2>$null)
    }
    catch {
        return ""
    }
}

function Read-Evidence {
    param(
        [string]$Lane,
        [string]$Path,
        [string]$HeadCommit
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $false
            status = "missing"
            schema_version = $null
            generated_at = $null
            commit_sha = $null
            commit_relation = "missing"
            error = $null
        }
    }
    try {
        $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        $names = $json.PSObject.Properties.Name
        $commitSha = if ($names -contains "commit_sha") { [string]$json.commit_sha } else { "" }
        $commitRelation = "unknown"
        if (-not [string]::IsNullOrWhiteSpace($commitSha)) {
            $commitRelation = if ($commitSha -eq $HeadCommit) { "current" } else { "stale" }
        }
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $true
            status = if ($names -contains "status") { [string]$json.status } else { "unknown" }
            schema_version = if ($names -contains "schema_version") { $json.schema_version } else { $null }
            generated_at = if ($names -contains "generated_at") { $json.generated_at } else { $null }
            commit_sha = if ([string]::IsNullOrWhiteSpace($commitSha)) { $null } else { $commitSha }
            commit_relation = $commitRelation
            error = $null
        }
    }
    catch {
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $true
            status = "unreadable"
            schema_version = $null
            generated_at = $null
            commit_sha = $null
            commit_relation = "unreadable"
            error = $_.Exception.Message
        }
    }
}

function Read-ReleaseGateStepEvidence {
    param(
        [string]$Lane,
        [string]$Path,
        [string]$HeadCommit,
        [string]$StepName
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $false
            status = "missing"
            schema_version = $null
            generated_at = $null
            commit_sha = $null
            commit_relation = "missing"
            source_lane = "release_gate"
            required_step = $StepName
            error = $null
        }
    }
    try {
        $json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        $names = $json.PSObject.Properties.Name
        $commitSha = if ($names -contains "commit_sha") { [string]$json.commit_sha } else { "" }
        $commitRelation = "unknown"
        if (-not [string]::IsNullOrWhiteSpace($commitSha)) {
            $commitRelation = if ($commitSha -eq $HeadCommit) { "current" } else { "stale" }
        }
        $stepMatches = @()
        if ($names -contains "steps") {
            $stepMatches = @($json.steps | Where-Object { $_.name -eq $StepName })
        }
        $stepPassed = @($stepMatches | Where-Object { $_.status -eq "passed" }).Count -gt 0
        $status = if ($json.status -eq "passed" -and $stepPassed) { "passed" } else { "missing" }
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $true
            status = $status
            schema_version = if ($names -contains "schema_version") { $json.schema_version } else { $null }
            generated_at = if ($names -contains "generated_at") { $json.generated_at } else { $null }
            commit_sha = if ([string]::IsNullOrWhiteSpace($commitSha)) { $null } else { $commitSha }
            commit_relation = $commitRelation
            source_lane = "release_gate"
            required_step = $StepName
            error = $null
        }
    }
    catch {
        return [ordered]@{
            lane = $Lane
            path = $Path
            exists = $true
            status = "unreadable"
            schema_version = $null
            generated_at = $null
            commit_sha = $null
            commit_relation = "unreadable"
            source_lane = "release_gate"
            required_step = $StepName
            error = $_.Exception.Message
        }
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

function Test-LanePassed {
    param(
        [hashtable]$LaneMap,
        [string]$Lane
    )
    return ($LaneMap.ContainsKey($Lane) -and $LaneMap[$Lane].status -eq "passed")
}

function Test-LaneFailed {
    param(
        [hashtable]$LaneMap,
        [string]$Lane
    )
    if (-not $LaneMap.ContainsKey($Lane)) {
        return $false
    }
    return ($LaneMap[$Lane].status -in @("failed", "unreadable"))
}

function Test-LaneCurrentPassed {
    param(
        [hashtable]$LaneMap,
        [string]$Lane
    )
    if (-not (Test-LanePassed -LaneMap $LaneMap -Lane $Lane)) {
        return $false
    }
    return ($LaneMap[$Lane].commit_relation -eq "current")
}

function New-Scenario {
    param(
        [hashtable]$LaneMap,
        [string]$Id,
        [string]$Title,
        [string[]]$EvidenceSources,
        [string[]]$CoveredBy,
        [string[]]$RemainingGaps
    )
    $failed = @($EvidenceSources | Where-Object { Test-LaneFailed -LaneMap $LaneMap -Lane $_ })
    $passed = @($EvidenceSources | Where-Object { Test-LaneCurrentPassed -LaneMap $LaneMap -Lane $_ })
    $missing = @($EvidenceSources | Where-Object {
        -not (Test-LaneCurrentPassed -LaneMap $LaneMap -Lane $_) -and
        -not (Test-LaneFailed -LaneMap $LaneMap -Lane $_)
    })
    $status = "missing"
    if ($failed.Count -gt 0) {
        $status = "blocked"
    }
    elseif ($passed.Count -gt 0) {
        $status = "partial"
    }
    return [ordered]@{
        id = $Id
        title = $Title
        status = $status
        evidence_sources = $EvidenceSources
        passed_sources = $passed
        missing_or_unknown_sources = $missing
        failed_sources = $failed
        covered_by_existing_evidence = $CoveredBy
        remaining_gaps = $RemainingGaps
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path (Join-Path $Root "tmp") "ci-evidence"
}
if ([string]::IsNullOrWhiteSpace($ReleaseEvidenceDir)) {
    $ReleaseEvidenceDir = Join-Path (Join-Path $Root "tmp") "release-evidence"
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $EvidenceDir "golden-scenarios.json"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null

$headCommit = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)

$script:RefreshSteps = [System.Collections.Generic.List[object]]::new()
$script:RefreshFailed = $false
$powershell = Resolve-PowerShell

if ($RefreshLocalEvidence) {
    $RunPrFast = $true
    $RunBrowserSmoke = $true
    $RunSecuritySmoke = $true
    $RunDesktopPackageSmoke = $true
    $RunReleaseArtifactDownloadSmoke = $true
    $RunReleaseGate = $true
}

if ($RunPrFast) {
    Invoke-RefreshStep -Name "refresh pr-fast evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\ci\pr-fast.ps1", "-RepoRoot", $Root, "-EvidenceDir", $EvidenceDir)
}
if ($RunBrowserSmoke) {
    Invoke-RefreshStep -Name "refresh browser smoke evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\ci\browser-smoke.ps1", "-RepoRoot", $Root, "-EvidenceDir", $EvidenceDir)
}
if ($RunSecuritySmoke) {
    Invoke-RefreshStep -Name "refresh security smoke evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\ci\security-smoke.ps1", "-RepoRoot", $Root, "-EvidenceDir", $EvidenceDir)
}
if ($RunDesktopPackageSmoke) {
    Invoke-RefreshStep -Name "refresh desktop package smoke evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\ci\desktop-package-smoke.ps1", "-RepoRoot", $Root, "-EvidenceDir", $EvidenceDir)
}
if ($RunReleaseArtifactDownloadSmoke) {
    Invoke-RefreshStep -Name "refresh release artifact download smoke evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\release\smoke-release-artifact-download.ps1", "-RepoRoot", $Root, "-EvidenceDir", $ReleaseEvidenceDir)
}
if ($RunReleaseGate) {
    Invoke-RefreshStep -Name "refresh merge release gate evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\release\next-release-gates.ps1", "-Mode", "merge", "-RepoRoot", $Root, "-EvidenceDir", $ReleaseEvidenceDir, "-SkipLong")
}
if ($RunIntegrationSmoke) {
    Invoke-RefreshStep -Name "refresh integration smoke evidence" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\ci\integration-smoke.ps1", "-RepoRoot", $Root, "-EvidenceDir", $EvidenceDir, "-StartCompose")
}

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
$trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
$untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)

$laneEvidence = @(
    (Read-Evidence -Lane "pr_fast" -Path (Join-Path $EvidenceDir "pr-fast.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "integration" -Path (Join-Path $EvidenceDir "integration-smoke.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "browser" -Path (Join-Path $EvidenceDir "browser-smoke.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "security" -Path (Join-Path $EvidenceDir "security-smoke.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "desktop_package" -Path (Join-Path $EvidenceDir "desktop-package-smoke.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "release_gate" -Path (Join-Path $ReleaseEvidenceDir "next-release-gates.json") -HeadCommit $headCommit),
    (Read-ReleaseGateStepEvidence -Lane "postgres_migration_release_gate" -Path (Join-Path $ReleaseEvidenceDir "next-release-gates.json") -HeadCommit $headCommit -StepName "postgres migration up/down smoke"),
    (Read-Evidence -Lane "release_artifact_download_smoke" -Path (Join-Path $ReleaseEvidenceDir "release-artifact-download-smoke.json") -HeadCommit $headCommit),
    (Read-Evidence -Lane "downloaded_release_artifacts" -Path (Join-Path $ReleaseEvidenceDir "downloaded-release-artifacts.json") -HeadCommit $headCommit)
)

$laneMap = @{}
foreach ($lane in $laneEvidence) {
    $laneMap[[string]$lane.lane] = $lane
}

$scenarios = @(
    (New-Scenario -LaneMap $laneMap -Id "current_flow_to_evidence" -Title "Current flow to evidence" -EvidenceSources @("integration", "browser") -CoveredBy @("Integration smoke proves API job/worker/artifact/model_run/evidence package path when available.", "Browser smoke proves mock-backed Compute Jobs current-flow/result/evidence UI orchestration when available.") -RemainingGaps @("No single live browser scenario joins the real PostgreSQL/MinIO/worker integration stack to frontend reads.", "No hosted green run has been recorded in this branch evidence.")),
    (New-Scenario -LaneMap $laneMap -Id "model_parameter_governance" -Title "Model parameter governance" -EvidenceSources @("browser", "security", "pr_fast") -CoveredBy @("Browser smoke covers mock-backed Model governance route orchestration when available.", "Security/pr-fast lanes cover selected governance API checks when available.") -RemainingGaps @("No end-to-end benchmark worker run to benchmark_run to promotion plan to approved parameter set scenario evidence.", "No hosted model governance scenario evidence.")),
    (New-Scenario -LaneMap $laneMap -Id "agent_draft_confirmation" -Title "Agent draft confirmation" -EvidenceSources @("pr_fast", "security") -CoveredBy @("PR fast includes contracts and Go API checks when available.", "Security smoke covers selected mutation audit paths when available.") -RemainingGaps @("No full Agent draft to confirmation to promoted simulation-check to explanation publish scenario lane.", "No user-facing approval workflow evidence.")),
    (New-Scenario -LaneMap $laneMap -Id "artifact_lifecycle" -Title "Artifact lifecycle" -EvidenceSources @("integration", "security", "release_gate") -CoveredBy @("Integration smoke covers artifact upload/download checksum and retention dry-run when available.", "Security smoke covers artifact admin-scope and selected retention audit checks when available.", "Release gate covers worker/artifact release checks when available.") -RemainingGaps @("No complete archive to hot delete to fallback download golden scenario evidence.", "No hosted release artifact round trip evidence.")),
    (New-Scenario -LaneMap $laneMap -Id "desktop_offline_project" -Title "Desktop offline project" -EvidenceSources @("desktop_package", "release_gate") -CoveredBy @("Desktop package smoke covers source-mode package export/import and support bundle redaction when available.", "Release gate may cover packaged artifacts when available.") -RemainingGaps @("No packaged worker exe or NSIS installer startup evidence in this scenario summary.", "No hosted Desktop package/release artifact evidence recorded.")),
    (New-Scenario -LaneMap $laneMap -Id "postgresql_migration" -Title "PostgreSQL migration" -EvidenceSources @("integration", "postgres_migration_release_gate") -CoveredBy @("Integration smoke starts an isolated PostgreSQL-backed API stack when available.", "Release gate counts only when the postgres migration up/down smoke step is present and passed.") -RemainingGaps @("No current-HEAD dedicated fresh DB migration up/down scenario evidence is required by this summary unless the postgres migration release gate step ran.", "No hosted migration green run recorded.")),
    (New-Scenario -LaneMap $laneMap -Id "security_permissions" -Title "Security permissions" -EvidenceSources @("security", "pr_fast") -CoveredBy @("Security smoke covers production token guard, token revocation, scope denial, selected audit, and job/artifact read-scope checks when available.") -RemainingGaps @("Full OIDC/JWKS, RBAC/ABAC, all-object data scope, ontology-backed policy enforcement, and all-mutation audit remain incomplete.", "No hosted security green run recorded.")),
    (New-Scenario -LaneMap $laneMap -Id "release_evidence" -Title "Release evidence" -EvidenceSources @("release_gate", "release_artifact_download_smoke", "downloaded_release_artifacts") -CoveredBy @("Release gate and fixture-backed artifact download smoke provide partial local release evidence when available.") -RemainingGaps @("No hosted unsigned artifact upload/download round trip is required by this summary.", "No signing, installer publish, or auto-update evidence."))
)

$statusCounts = [ordered]@{
    covered = @($scenarios | Where-Object { $_.status -eq "covered" }).Count
    partial = @($scenarios | Where-Object { $_.status -eq "partial" }).Count
    missing = @($scenarios | Where-Object { $_.status -eq "missing" }).Count
    blocked = @($scenarios | Where-Object { $_.status -eq "blocked" }).Count
}

$overallStatus = if ($statusCounts.blocked -gt 0) {
    "blocked"
}
elseif ($statusCounts.missing -gt 0) {
    "partial"
}
elseif ($statusCounts.partial -gt 0) {
    "partial"
}
else {
    "covered"
}

$report = [ordered]@{
    schema_version = "autowatersimu_next_golden_scenarios_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    commit_sha = $headCommit
    branch = $branchName
    status = $overallStatus
    status_counts = $statusCounts
    interpretation = "Scenario-level summary only. Partial status does not mean the golden scenario is complete. Passed sources count only when the lane evidence commit matches this report commit."
    refresh_requested = [bool]($RefreshLocalEvidence -or $RunPrFast -or $RunBrowserSmoke -or $RunSecuritySmoke -or $RunDesktopPackageSmoke -or $RunReleaseArtifactDownloadSmoke -or $RunReleaseGate -or $RunIntegrationSmoke)
    refresh_failed = [bool]$script:RefreshFailed
    refresh_steps = $script:RefreshSteps
    is_dirty_before = -not [string]::IsNullOrWhiteSpace($statusBefore)
    has_tracked_changes_before = $trackedStatusBefore.Count -gt 0
    dirty_files_before = $statusBeforeLines
    tracked_changes_before = $trackedStatusBefore
    untracked_files_before = $untrackedStatusBefore
    is_dirty_after = -not [string]::IsNullOrWhiteSpace($statusAfter)
    has_tracked_changes_after = $trackedStatusAfter.Count -gt 0
    dirty_files_after = $statusAfterLines
    tracked_changes_after = $trackedStatusAfter
    untracked_files_after = $untrackedStatusAfter
    lane_evidence = $laneEvidence
    scenarios = $scenarios
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "Golden scenario evidence: $OutputPath"

if ($script:RefreshFailed) {
    exit 1
}
