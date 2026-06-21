param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ApiBaseUrl = "http://localhost:8088",
    [string]$PublicToken = "dev-public-token",
    [string]$WorkerToken = "dev-worker-token",
    [string]$ComposeProject = "autowatersimu-next-live-backend-browser-smoke",
    [switch]$KeepCompose
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

function Add-Step {
    param(
        [string]$Name,
        [string]$Status,
        [int]$ExitCode,
        [string]$Output,
        [string]$StartedAt,
        [string]$FinishedAt
    )
    $script:Steps.Add((New-Step -Name $Name -Status $Status -ExitCode $ExitCode -Output $Output -StartedAt $StartedAt -FinishedAt $FinishedAt)) | Out-Null
    if ($ExitCode -ne 0) {
        $script:Failed = $true
    }
}

function Invoke-CommandStep {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    $recorded = $false
    try {
        $argumentList = ($Arguments | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
        $process = Start-Process -FilePath $Executable -ArgumentList $argumentList -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $stdout = [string](Get-Content -Path $stdoutFile -Raw)
        $stderr = [string](Get-Content -Path $stderrFile -Raw)
        $outputText = (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        $status = if ($process.ExitCode -eq 0) { "passed" } else { "failed" }
        Add-Step -Name $Name -Status $status -ExitCode $process.ExitCode -Output $outputText -StartedAt $started -FinishedAt $finished
        $recorded = $true
        if ($process.ExitCode -ne 0) {
            throw "$Name failed with exit code $($process.ExitCode)"
        }
        return [ordered]@{
            exit_code = $process.ExitCode
            stdout = $stdout
            stderr = $stderr
            output = $outputText
        }
    }
    catch {
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        if (-not $recorded) {
            Add-Step -Name $Name -Status "failed" -ExitCode 1 -Output $_.Exception.Message -StartedAt $started -FinishedAt $finished
        }
        throw
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
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

function Get-JsonProperty {
    param(
        [object]$InputObject,
        [string]$Name
    )
    if ($null -eq $InputObject) {
        return $null
    }
    if ($InputObject.PSObject.Properties.Name -contains $Name) {
        return $InputObject.$Name
    }
    return $null
}

function Set-EnvVar {
    param(
        [string]$Name,
        [string]$Value
    )
    [System.Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path (Join-Path $Root "tmp") "ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$summary = [ordered]@{}
$powershell = Resolve-PowerShell
$npx = Resolve-NativeCommand -Name "npx"
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)
$originalEnv = @{
    VITE_APP_MODE = $env:VITE_APP_MODE
    VITE_AUTH_MODE = $env:VITE_AUTH_MODE
    VITE_COMPUTE_API_URL = $env:VITE_COMPUTE_API_URL
    VITE_COMPUTE_API_TOKEN = $env:VITE_COMPUTE_API_TOKEN
    VITE_CONTEXT_MODE = $env:VITE_CONTEXT_MODE
    AUTOWATERSIMU_LIVE_COMPUTE_API_BASE_URL = $env:AUTOWATERSIMU_LIVE_COMPUTE_API_BASE_URL
    AUTOWATERSIMU_LIVE_COMPUTE_API_TOKEN = $env:AUTOWATERSIMU_LIVE_COMPUTE_API_TOKEN
    AUTOWATERSIMU_LIVE_COMPUTE_JOB_ID = $env:AUTOWATERSIMU_LIVE_COMPUTE_JOB_ID
    AUTOWATERSIMU_LIVE_COMPUTE_MODEL_RUN_ID = $env:AUTOWATERSIMU_LIVE_COMPUTE_MODEL_RUN_ID
    AUTOWATERSIMU_LIVE_COMPUTE_ARTIFACT_ID = $env:AUTOWATERSIMU_LIVE_COMPUTE_ARTIFACT_ID
}

try {
    Invoke-CommandStep -Name "prepare live integration-backed job" -WorkingDirectory $Root -Executable $powershell -Arguments @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\ci\integration-smoke.ps1",
        "-RepoRoot",
        $Root,
        "-EvidenceDir",
        $EvidenceDir,
        "-ApiBaseUrl",
        $ApiBaseUrl,
        "-PublicToken",
        $PublicToken,
        "-WorkerToken",
        $WorkerToken,
        "-ComposeProject",
        $ComposeProject,
        "-StartCompose",
        "-KeepCompose"
    ) | Out-Null

    $integrationEvidencePath = Join-Path $EvidenceDir "integration-smoke.json"
    $integrationEvidence = Get-Content -LiteralPath $integrationEvidencePath -Raw | ConvertFrom-Json
    if ($integrationEvidence.status -ne "passed") {
        throw "Integration preparation did not pass; status=$($integrationEvidence.status)"
    }
    $integrationSummary = Get-JsonProperty -InputObject $integrationEvidence -Name "summary"
    $jobID = [string](Get-JsonProperty -InputObject $integrationSummary -Name "main_job_id")
    $modelRunID = [string](Get-JsonProperty -InputObject $integrationSummary -Name "model_run_id")
    $artifactID = [string](Get-JsonProperty -InputObject $integrationSummary -Name "artifact_id")
    if ([string]::IsNullOrWhiteSpace($jobID) -or [string]::IsNullOrWhiteSpace($modelRunID) -or [string]::IsNullOrWhiteSpace($artifactID)) {
        throw "Integration evidence did not expose main_job_id, model_run_id, and artifact_id."
    }

    $summary.integration_job_id = $jobID
    $summary.model_run_id = $modelRunID
    $summary.artifact_id = $artifactID

    Set-EnvVar -Name "VITE_APP_MODE" -Value "standalone"
    Set-EnvVar -Name "VITE_AUTH_MODE" -Value "static_token"
    Set-EnvVar -Name "VITE_COMPUTE_API_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "VITE_COMPUTE_API_TOKEN" -Value $PublicToken
    Set-EnvVar -Name "VITE_CONTEXT_MODE" -Value "standalone"
    Set-EnvVar -Name "AUTOWATERSIMU_LIVE_COMPUTE_API_BASE_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "AUTOWATERSIMU_LIVE_COMPUTE_API_TOKEN" -Value $PublicToken
    Set-EnvVar -Name "AUTOWATERSIMU_LIVE_COMPUTE_JOB_ID" -Value $jobID
    Set-EnvVar -Name "AUTOWATERSIMU_LIVE_COMPUTE_MODEL_RUN_ID" -Value $modelRunID
    Set-EnvVar -Name "AUTOWATERSIMU_LIVE_COMPUTE_ARTIFACT_ID" -Value $artifactID

    Invoke-CommandStep -Name "browser reads live compute backend job result evidence" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @(
        "playwright",
        "test",
        "tests/compute-jobs-live-backend.spec.ts",
        "--project=chromium",
        "--no-deps",
        "--reporter=line"
    ) | Out-Null
}
catch {
    $script:Failed = $true
    $script:FailureMessage = $_.Exception.Message
}
finally {
    foreach ($name in $originalEnv.Keys) {
        Set-EnvVar -Name $name -Value $originalEnv[$name]
    }

    if (-not $KeepCompose) {
        try {
            Invoke-CommandStep -Name "docker compose down" -WorkingDirectory $Root -Executable "docker" -Arguments @(
                "compose",
                "-p",
                $ComposeProject,
                "-f",
                "docker-compose.dev.yml",
                "down",
                "-v",
                "--remove-orphans"
            ) | Out-Null
        }
        catch {
            $script:Failed = $true
            if ([string]::IsNullOrWhiteSpace($script:FailureMessage)) {
                $script:FailureMessage = $_.Exception.Message
            }
        }
    }

    $statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
    $statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
    $trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
    $untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)
    $report = [ordered]@{
        schema_version = "autowatersimu_next_live_backend_browser_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = $Root
        commit_sha = $commitSha
        branch = $branchName
        status = if ($script:Failed) { "failed" } else { "passed" }
        failure_message = $script:FailureMessage
        api_base_url = $ApiBaseUrl
        compose = [ordered]@{
            project = $ComposeProject
            kept_running = [bool]$KeepCompose
        }
        coverage_summary = [ordered]@{
            live_postgres_minio_worker_backend = "covered_by_integration_smoke_prepared_job"
            frontend_live_job_result_evidence_read = "covered_by_playwright_without_compute_api_route_mocks"
            legacy_authenticated_backend_session = "not_used_asserted_no_login_or_users_requests"
            current_flow_submit_to_live_worker = "not_covered"
            hosted_workflow_run = if ([string]::IsNullOrWhiteSpace($env:GITHUB_RUN_ID)) { "not_covered" } else { "github_actions_run" }
        }
        summary = $summary
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
    $evidencePath = Join-Path $EvidenceDir "live-backend-browser-smoke.json"
    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Live backend browser smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
