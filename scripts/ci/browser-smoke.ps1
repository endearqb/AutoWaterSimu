param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = ""
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

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
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

function Invoke-Step {
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
    $script:Steps.Add((New-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:Failed = $true
    }
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

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path (Join-Path $Root "tmp") "ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$npx = Resolve-NativeCommand -Name "npx"
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = ConvertTo-GitStatusLines -StatusText $statusBefore
$trackedStatusBefore = Get-TrackedStatusLines -StatusLines $statusBeforeLines
$untrackedStatusBefore = Get-UntrackedStatusLines -StatusLines $statusBeforeLines
$frontendDir = Join-Path $Root "frontend"
$commonArgs = @("playwright", "test", "--project=chromium", "--no-deps", "--reporter=line")

Invoke-Step -Name "browser current flow to readiness smoke" -WorkingDirectory $frontendDir -Executable $npx -Arguments (@("playwright", "test", "tests/compute-jobs-current-flow.spec.ts") + $commonArgs[2..($commonArgs.Count - 1)])
Invoke-Step -Name "browser contract validation smoke" -WorkingDirectory $frontendDir -Executable $npx -Arguments (@("playwright", "test", "tests/contract-validation.spec.ts") + $commonArgs[2..($commonArgs.Count - 1)])
Invoke-Step -Name "browser model governance smoke" -WorkingDirectory $frontendDir -Executable $npx -Arguments (@("playwright", "test", "tests/model-governance.spec.ts") + $commonArgs[2..($commonArgs.Count - 1)])
Invoke-Step -Name "browser lifecycle retention smoke" -WorkingDirectory $frontendDir -Executable $npx -Arguments (@("playwright", "test", "tests/compute-lifecycle.spec.ts") + $commonArgs[2..($commonArgs.Count - 1)])

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = ConvertTo-GitStatusLines -StatusText $statusAfter
$trackedStatusAfter = Get-TrackedStatusLines -StatusLines $statusAfterLines
$untrackedStatusAfter = Get-UntrackedStatusLines -StatusLines $statusAfterLines
$report = [ordered]@{
    schema_version = "autowatersimu_next_browser_smoke_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed) { "failed" } else { "passed" }
    coverage_summary = [ordered]@{
        current_flow_to_compute_job = "covered_by_mock_backed_playwright"
        job_result_and_production_readiness_read = "covered_by_mock_backed_playwright"
        evidence_package_download = "covered_by_mock_backed_playwright"
        evidence_ref_resolution = "covered_by_mock_backed_playwright"
        contract_validation_panel = "covered_by_mock_backed_playwright"
        model_governance_catalog_and_snapshots = "covered_by_mock_backed_playwright"
        lifecycle_metrics_and_retention_guard = "covered_by_mock_backed_playwright"
        live_postgres_minio_worker_backend = "not_covered"
        authenticated_legacy_backend_session = "not_covered"
        hosted_workflow_run = if ([string]::IsNullOrWhiteSpace($env:GITHUB_RUN_ID)) { "not_covered" } else { "github_actions_run" }
    }
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

$evidencePath = Join-Path $EvidenceDir "browser-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Browser smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
