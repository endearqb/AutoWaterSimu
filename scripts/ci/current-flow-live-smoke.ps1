param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ApiBaseUrl = "http://localhost:8088",
    [string]$PublicToken = "dev-public-token",
    [string]$WorkerToken = "dev-worker-token",
    [string]$ComposeProject = "autowatersimu-next-current-flow-live-smoke",
    [switch]$KeepCompose
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Join-PathSegments {
    param([string[]]$Segments)
    if ($Segments.Count -eq 0) {
        return ""
    }
    $path = $Segments[0]
    for ($i = 1; $i -lt $Segments.Count; $i++) {
        $path = Join-Path $path $Segments[$i]
    }
    return $path
}

function Resolve-RepoRoot {
    param([string]$InputRoot)
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        return (Resolve-Path (Join-PathSegments @($PSScriptRoot, "..", ".."))).Path
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

function Resolve-Python {
    param([string]$Root)
    $windowsPython = Join-PathSegments @($Root, "backend", ".venv", "Scripts", "python.exe")
    $posixPython = Join-PathSegments @($Root, "backend", ".venv", "bin", "python")
    if (Test-Path -LiteralPath $windowsPython) {
        return $windowsPython
    }
    if (Test-Path -LiteralPath $posixPython) {
        return $posixPython
    }
    return "python"
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

function Invoke-JsonApi {
    param(
        [string]$Method,
        [string]$Uri,
        [string]$Token = "",
        [object]$Body = $null
    )
    $headers = @{ Accept = "application/json" }
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Authorization"] = "Bearer $Token"
    }
    $jsonBody = $null
    if ($null -ne $Body) {
        $jsonBody = $Body | ConvertTo-Json -Depth 80
    }
    $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers $headers -ContentType "application/json" -Body $jsonBody -TimeoutSec 60
    $content = [string]$response.Content
    $payload = $null
    if (-not [string]::IsNullOrWhiteSpace($content)) {
        $payload = $content | ConvertFrom-Json
    }
    return [ordered]@{
        status_code = [int]$response.StatusCode
        headers = $response.Headers
        body = $payload
    }
}

function Get-ObjectProperty {
    param(
        [object]$Object,
        [string]$Name
    )
    if ($null -eq $Object) {
        return $null
    }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
}

function Wait-ComputeApiReady {
    param([string]$BaseUrl)
    $deadline = (Get-Date).AddMinutes(4)
    $lastError = ""
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-JsonApi -Method "GET" -Uri "$BaseUrl/readyz"
            if ($response.body.status -eq "ready") {
                return "Compute API ready at $BaseUrl."
            }
        }
        catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Seconds 2
    }
    throw "Compute API did not become ready at $BaseUrl. Last error: $lastError"
}

function Set-EnvVar {
    param(
        [string]$Name,
        [AllowNull()][object]$Value
    )
    $stringValue = if ($null -eq $Value) { $null } else { [string]$Value }
    [System.Environment]::SetEnvironmentVariable($Name, $stringValue, "Process")
}

function Start-WorkerLoop {
    param(
        [string]$Root,
        [string]$Python,
        [string]$ApiBaseUrl,
        [string]$WorkerToken,
        [string]$WorkerID,
        [string]$ArtifactDir,
        [string]$StdoutPath,
        [string]$StderrPath
    )
    $workerCliPath = Join-PathSegments @($Root, "services", "simulation-worker", "simulation_worker", "cli.py")
    $args = @(
        $workerCliPath,
        "--run-api-loop",
        "--api-base-url",
        $ApiBaseUrl,
        "--api-token",
        $WorkerToken,
        "--worker-id",
        $WorkerID,
        "--artifact-dir",
        $ArtifactDir,
        "--max-jobs",
        "1",
        "--max-idle-polls",
        "180",
        "--idle-sleep-seconds",
        "1"
    )
    $argumentList = ($args | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
    $parameters = @{
        FilePath = $Python
        ArgumentList = $argumentList
        WorkingDirectory = $Root
        PassThru = $true
        RedirectStandardOutput = $StdoutPath
        RedirectStandardError = $StderrPath
    }
    if (Test-IsWindows) {
        $parameters["WindowStyle"] = "Hidden"
    }
    return Start-Process @parameters
}

function Read-ProcessOutput {
    param(
        [string]$StdoutPath,
        [string]$StderrPath
    )
    $stdout = if (Test-Path -LiteralPath $StdoutPath) { [string](Get-Content -LiteralPath $StdoutPath -Raw) } else { "" }
    $stderr = if (Test-Path -LiteralPath $StderrPath) { [string](Get-Content -LiteralPath $StderrPath -Raw) } else { "" }
    return (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
}

function Wait-WorkerLoop {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$StdoutPath,
        [string]$StderrPath
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $exited = $Process.WaitForExit(60000)
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    if (-not $exited) {
        try {
            $Process.Kill()
        }
        catch {
            # Preserve the timeout failure below.
        }
        $output = Read-ProcessOutput -StdoutPath $StdoutPath -StderrPath $StderrPath
        Add-Step -Name "worker loop completed one UI-submitted job" -Status "failed" -ExitCode 1 -Output "Worker loop did not exit after the browser scenario.`n$output" -StartedAt $started -FinishedAt $finished
        throw "Worker loop did not exit after processing the browser scenario."
    }
    $outputText = Read-ProcessOutput -StdoutPath $StdoutPath -StderrPath $StderrPath
    $Process.Refresh()
    $exitCode = $Process.ExitCode
    if ($null -eq $exitCode) {
        $exitCode = 0
    }
    $exitCode = [int]$exitCode
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    Add-Step -Name "worker loop completed one UI-submitted job" -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished
    if ($exitCode -ne 0) {
        throw "Worker loop failed with exit code $exitCode."
    }
}

function Get-CurrentFlowSummary {
    param(
        [string]$BaseUrl,
        [string]$Token
    )
    $jobs = Invoke-JsonApi -Method "GET" -Uri "$BaseUrl/api/v1/compute/jobs?limit=20" -Token $Token
    $snapshots = @($jobs.body.items)
    $match = $snapshots | Where-Object {
        $job = Get-ObjectProperty -Object $_ -Name "job"
        $inputJson = Get-ObjectProperty -Object $job -Name "input_json"
        $metadata = Get-ObjectProperty -Object $inputJson -Name "metadata"
        (Get-ObjectProperty -Object $job -Name "status") -eq "succeeded" -and
        (Get-ObjectProperty -Object $job -Name "job_type") -eq "simulation.material_balance.v1" -and
        (Get-ObjectProperty -Object $metadata -Name "source") -eq "legacy_flow_export"
    } | Select-Object -First 1
    if ($null -eq $match) {
        throw "Could not find a succeeded legacy_flow_export current-flow job."
    }
    $job = Get-ObjectProperty -Object $match -Name "job"
    $inputJson = Get-ObjectProperty -Object $job -Name "input_json"
    $metadata = Get-ObjectProperty -Object $inputJson -Name "metadata"
    $jobID = [string](Get-ObjectProperty -Object $job -Name "job_id")
    $result = Invoke-JsonApi -Method "GET" -Uri "$BaseUrl/api/v1/compute/jobs/$jobID/result" -Token $Token
    $modelRunID = [string]@($result.body.model_runs)[0].model_run_id
    $artifactID = [string]@($result.body.artifacts)[0].artifact_id
    return [ordered]@{
        job_id = $jobID
        status = [string](Get-ObjectProperty -Object $job -Name "status")
        process_graph_id = [string](Get-ObjectProperty -Object $metadata -Name "process_graph_id")
        model_run_id = $modelRunID
        artifact_id = $artifactID
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-PathSegments @($Root, "tmp", "ci-evidence")
}
$RunID = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$SmokeDir = Join-PathSegments @($Root, "tmp", "current-flow-live-smoke", $RunID)
$ArtifactDir = Join-Path $SmokeDir "worker-artifacts"
New-Item -ItemType Directory -Force -Path $EvidenceDir, $SmokeDir, $ArtifactDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$summary = [ordered]@{}
$python = Resolve-Python -Root $Root
$npx = Resolve-NativeCommand -Name "npx"
$workerID = "worker_current_flow_live_$RunID"
$workerStdout = Join-Path $SmokeDir "worker-loop.stdout.log"
$workerStderr = Join-Path $SmokeDir "worker-loop.stderr.log"
$workerProcess = $null
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)
$originalEnv = @{
    VITE_COMPUTE_API_URL = $env:VITE_COMPUTE_API_URL
    VITE_COMPUTE_API_TOKEN = $env:VITE_COMPUTE_API_TOKEN
    AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_BASE_URL = $env:AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_BASE_URL
    AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_TOKEN = $env:AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_TOKEN
}

try {
    Invoke-CommandStep -Name "pre-clean existing compose project" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "down", "-v", "--remove-orphans") | Out-Null
    Invoke-CommandStep -Name "docker compose config" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "config") | Out-Null
    Invoke-CommandStep -Name "start postgres minio compute api" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "up", "-d", "compute-api") | Out-Null
    $readyStarted = (Get-Date).ToUniversalTime().ToString("o")
    $readyOutput = Wait-ComputeApiReady -BaseUrl $ApiBaseUrl
    Add-Step -Name "wait compute api ready" -Status "passed" -ExitCode 0 -Output $readyOutput -StartedAt $readyStarted -FinishedAt ((Get-Date).ToUniversalTime().ToString("o"))

    $workerStarted = (Get-Date).ToUniversalTime().ToString("o")
    $workerProcess = Start-WorkerLoop -Root $Root -Python $python -ApiBaseUrl $ApiBaseUrl -WorkerToken $WorkerToken -WorkerID $workerID -ArtifactDir $ArtifactDir -StdoutPath $workerStdout -StderrPath $workerStderr
    Add-Step -Name "start worker api loop" -Status "passed" -ExitCode 0 -Output "Started worker loop pid=$($workerProcess.Id), worker_id=$workerID." -StartedAt $workerStarted -FinishedAt ((Get-Date).ToUniversalTime().ToString("o"))

    Set-EnvVar -Name "VITE_COMPUTE_API_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "VITE_COMPUTE_API_TOKEN" -Value $PublicToken
    Set-EnvVar -Name "AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_BASE_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_TOKEN" -Value $PublicToken

    Invoke-CommandStep -Name "browser submits current flow to live worker and reads evidence" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @(
        "playwright",
        "test",
        "tests/compute-jobs-current-flow-live.spec.ts",
        "--project=chromium",
        "--no-deps",
        "--reporter=line"
    ) | Out-Null

    Wait-WorkerLoop -Process $workerProcess -StdoutPath $workerStdout -StderrPath $workerStderr
    $workerProcess = $null

    $summary = Get-CurrentFlowSummary -BaseUrl $ApiBaseUrl -Token $PublicToken
}
catch {
    $script:Failed = $true
    $script:FailureMessage = $_.Exception.Message
}
finally {
    foreach ($name in $originalEnv.Keys) {
        Set-EnvVar -Name $name -Value $originalEnv[$name]
    }

    if ($null -ne $workerProcess -and -not $workerProcess.HasExited) {
        try {
            $workerProcess.Kill()
        }
        catch {
            # Cleanup only.
        }
    }

    if (-not $KeepCompose) {
        try {
            Invoke-CommandStep -Name "docker compose down" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "down", "-v", "--remove-orphans") | Out-Null
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
    $liveCoverageStatus = if ($script:Failed) { "not_covered_failed_smoke" } else { "covered_by_playwright_live_compute_api_and_worker_loop" }
    $backendCoverageStatus = if ($script:Failed) { "not_covered_failed_smoke" } else { "covered" }
    $browserCoverageStatus = if ($script:Failed) { "not_covered_failed_smoke" } else { "covered_by_playwright_live_compute_api" }
    $report = [ordered]@{
        schema_version = "autowatersimu_next_current_flow_live_smoke.v1"
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
            current_flow_submit_to_live_worker = $liveCoverageStatus
            live_postgres_minio_worker_backend = $backendCoverageStatus
            evidence_package_download = $browserCoverageStatus
            evidence_ref_resolution = $browserCoverageStatus
            legacy_authenticated_backend_session = "mocked_users_me_only"
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
    $evidencePath = Join-Path $EvidenceDir "current-flow-live-smoke.json"
    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Current-flow live smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
