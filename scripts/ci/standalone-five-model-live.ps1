param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ApiBaseUrl = "http://127.0.0.1:18088",
    [string]$PublicToken = "",
    [string]$WorkerToken = "",
    [string]$ComposeProject = "autowatersimu-next-five-model-live-smoke",
    [string]$ComputeApiHostPort = "",
    [string]$MinioHostPort = "19000",
    [string]$MinioConsoleHostPort = "19001",
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
    $exitCode = 0
    $outputText = ""
    Push-Location $WorkingDirectory
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        $outputText = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        Pop-Location
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    Add-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished
    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode."
    }
    return $outputText
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
        [string]$Token = ""
    )
    $headers = @{ Accept = "application/json" }
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Authorization"] = "Bearer $Token"
    }
    $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers $headers -TimeoutSec 60
    $content = [string]$response.Content
    $payload = $null
    if (-not [string]::IsNullOrWhiteSpace($content)) {
        $payload = $content | ConvertFrom-Json
    }
    return [ordered]@{
        status_code = [int]$response.StatusCode
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

function Invoke-WorkerLoop {
    param(
        [string]$Root,
        [string]$Python,
        [string]$ApiBaseUrl,
        [string]$WorkerToken,
        [string]$WorkerID,
        [string]$ArtifactDir
    )
    $workerCliPath = Join-PathSegments @($Root, "services", "simulation-worker", "simulation_worker", "cli.py")
    $args = @(
        $workerCliPath,
        "--run-api-loop",
        "--api-base-url",
        $ApiBaseUrl
    )
    if (-not [string]::IsNullOrWhiteSpace($WorkerToken)) {
        $args += @("--api-token", $WorkerToken)
    }
    $args += @(
        "--worker-id",
        $WorkerID,
        "--artifact-dir",
        $ArtifactDir,
        "--max-jobs",
        "5",
        "--max-idle-polls",
        "30",
        "--idle-sleep-seconds",
        "1"
    )
    $output = Invoke-CommandStep -Name "worker api loop completes five submitted jobs" -WorkingDirectory $Root -Executable $Python -Arguments $args
    if ($output -match '"status"\s*:\s*"failed"') {
        throw "Worker api loop reported failed status."
    }
    if ($output -notmatch '"jobs_processed"\s*:\s*5') {
        throw "Worker api loop did not process all five submitted jobs."
    }
}

function Start-GoApi {
    param(
        [string]$Root,
        [string]$BinaryPath,
        [string]$StdoutPath,
        [string]$StderrPath
    )
    $parameters = @{
        FilePath = $BinaryPath
        WorkingDirectory = (Join-PathSegments @($Root, "apps", "api"))
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

function Get-FiveModelSummary {
    param(
        [string]$BaseUrl,
        [string]$Token
    )
    $expectedTypes = @(
        "simulation.material_balance.v1",
        "simulation.asm1slim.v1",
        "simulation.asm1.v1",
        "simulation.asm3.v1",
        "simulation.udm.v1"
    )
    $jobs = Invoke-JsonApi -Method "GET" -Uri "$BaseUrl/api/v1/compute/jobs?limit=20" -Token $Token
    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($snapshot in @($jobs.body.items)) {
        $job = Get-ObjectProperty -Object $snapshot -Name "job"
        $jobType = [string](Get-ObjectProperty -Object $job -Name "job_type")
        if ($expectedTypes -notcontains $jobType) {
            continue
        }
        $jobID = [string](Get-ObjectProperty -Object $job -Name "job_id")
        $status = [string](Get-ObjectProperty -Object $job -Name "status")
        $result = $null
        if ($status -eq "succeeded") {
            $result = Invoke-JsonApi -Method "GET" -Uri "$BaseUrl/api/v1/compute/jobs/$jobID/result" -Token $Token
        }
        $rows.Add([ordered]@{
            job_id = $jobID
            job_type = $jobType
            status = $status
            model_run_count = if ($null -eq $result) { 0 } else { @($result.body.model_runs).Count }
            artifact_count = if ($null -eq $result) { 0 } else { @($result.body.artifacts).Count }
        }) | Out-Null
    }
    foreach ($jobType in $expectedTypes) {
        $match = @($rows | Where-Object { $_.job_type -eq $jobType -and $_.status -eq "succeeded" })
        if ($match.Count -ne 1) {
            throw "Expected exactly one succeeded job for $jobType, found $($match.Count)."
        }
    }
    return [ordered]@{
        expected_job_types = $expectedTypes
        jobs = $rows
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-PathSegments @($Root, "tmp", "ci-evidence")
}
if ([string]::IsNullOrWhiteSpace($ComputeApiHostPort)) {
    $ComputeApiHostPort = [string]([Uri]$ApiBaseUrl).Port
}
$RunID = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$SmokeDir = Join-PathSegments @($Root, "tmp", "standalone-five-model-live-smoke", $RunID)
$ArtifactDir = Join-Path $SmokeDir "worker-artifacts"
New-Item -ItemType Directory -Force -Path $EvidenceDir, $SmokeDir, $ArtifactDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$summary = [ordered]@{}
$python = Resolve-Python -Root $Root
$npx = Resolve-NativeCommand -Name "npx"
$workerID = "worker_five_model_live_$RunID"
$jobIDsPath = Join-Path $SmokeDir "job-ids.json"
$workerProcess = $null
$goApiBinary = Join-Path $SmokeDir ($(if (Test-IsWindows) { "compute-api-live.exe" } else { "compute-api-live" }))
$goApiStdout = Join-Path $SmokeDir "compute-api.stdout.log"
$goApiStderr = Join-Path $SmokeDir "compute-api.stderr.log"
$goApiProcess = $null
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)
$originalEnv = @{
    COMPUTE_API_AUTH_MODE = $env:COMPUTE_API_AUTH_MODE
    COMPUTE_API_BIND_ADDR = $env:COMPUTE_API_BIND_ADDR
    COMPUTE_API_ALLOW_REMOTE_NO_AUTH = $env:COMPUTE_API_ALLOW_REMOTE_NO_AUTH
    COMPUTE_API_PORT = $env:COMPUTE_API_PORT
    COMPUTE_API_HOST_PORT = $env:COMPUTE_API_HOST_PORT
    COMPUTE_API_DATABASE_URL = $env:COMPUTE_API_DATABASE_URL
    COMPUTE_API_ARTIFACT_DIR = $env:COMPUTE_API_ARTIFACT_DIR
    COMPUTE_API_ARCHIVE_S3_ENDPOINT = $env:COMPUTE_API_ARCHIVE_S3_ENDPOINT
    COMPUTE_API_ARCHIVE_S3_BUCKET = $env:COMPUTE_API_ARCHIVE_S3_BUCKET
    COMPUTE_API_ARCHIVE_S3_REGION = $env:COMPUTE_API_ARCHIVE_S3_REGION
    COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID = $env:COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID
    COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY = $env:COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY
    COMPUTE_API_ARCHIVE_S3_PREFIX = $env:COMPUTE_API_ARCHIVE_S3_PREFIX
    COMPUTE_API_CONTRACTS_DIR = $env:COMPUTE_API_CONTRACTS_DIR
    MINIO_HOST_PORT = $env:MINIO_HOST_PORT
    MINIO_CONSOLE_HOST_PORT = $env:MINIO_CONSOLE_HOST_PORT
    VITE_APP_MODE = $env:VITE_APP_MODE
    VITE_AUTH_MODE = $env:VITE_AUTH_MODE
    VITE_COMPUTE_API_URL = $env:VITE_COMPUTE_API_URL
    VITE_COMPUTE_API_TOKEN = $env:VITE_COMPUTE_API_TOKEN
    VITE_CONTEXT_MODE = $env:VITE_CONTEXT_MODE
    AUTOWATERSIMU_FIVE_MODEL_LIVE_API_BASE_URL = $env:AUTOWATERSIMU_FIVE_MODEL_LIVE_API_BASE_URL
    AUTOWATERSIMU_FIVE_MODEL_LIVE_API_TOKEN = $env:AUTOWATERSIMU_FIVE_MODEL_LIVE_API_TOKEN
    AUTOWATERSIMU_FIVE_MODEL_LIVE_MODE = $env:AUTOWATERSIMU_FIVE_MODEL_LIVE_MODE
    AUTOWATERSIMU_FIVE_MODEL_LIVE_JOB_IDS_PATH = $env:AUTOWATERSIMU_FIVE_MODEL_LIVE_JOB_IDS_PATH
    PLAYWRIGHT_PORT = $env:PLAYWRIGHT_PORT
    PLAYWRIGHT_BASE_URL = $env:PLAYWRIGHT_BASE_URL
    PLAYWRIGHT_DEV_SERVER_COMMAND = $env:PLAYWRIGHT_DEV_SERVER_COMMAND
    PLAYWRIGHT_REUSE_EXISTING_SERVER = $env:PLAYWRIGHT_REUSE_EXISTING_SERVER
}

try {
    Set-EnvVar -Name "COMPUTE_API_AUTH_MODE" -Value "disabled"
    Set-EnvVar -Name "COMPUTE_API_BIND_ADDR" -Value "127.0.0.1"
    Set-EnvVar -Name "COMPUTE_API_ALLOW_REMOTE_NO_AUTH" -Value "true"
    Set-EnvVar -Name "COMPUTE_API_PORT" -Value ([string]([Uri]$ApiBaseUrl).Port)
    Set-EnvVar -Name "COMPUTE_API_HOST_PORT" -Value $ComputeApiHostPort
    Set-EnvVar -Name "COMPUTE_API_DATABASE_URL" -Value "postgres://autowatersimu:autowatersimu@localhost:5434/autowatersimu_compute?sslmode=disable"
    Set-EnvVar -Name "COMPUTE_API_ARTIFACT_DIR" -Value (Join-Path $SmokeDir "compute-api-artifacts")
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_ENDPOINT" -Value "http://localhost:$MinioHostPort"
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_BUCKET" -Value "autowatersimu-archive"
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_REGION" -Value "us-east-1"
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID" -Value "minioadmin"
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY" -Value "minioadmin"
    Set-EnvVar -Name "COMPUTE_API_ARCHIVE_S3_PREFIX" -Value "compute-api/five-model-live"
    Set-EnvVar -Name "COMPUTE_API_CONTRACTS_DIR" -Value (Join-Path $Root "contracts")
    Set-EnvVar -Name "MINIO_HOST_PORT" -Value $MinioHostPort
    Set-EnvVar -Name "MINIO_CONSOLE_HOST_PORT" -Value $MinioConsoleHostPort

    Invoke-CommandStep -Name "pre-clean existing compose project" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "down", "-v", "--remove-orphans") | Out-Null
    Invoke-CommandStep -Name "docker compose config" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "config") | Out-Null
    Invoke-CommandStep -Name "start postgres and minio" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "up", "-d", "compute-postgres", "minio-init") | Out-Null
    Invoke-CommandStep -Name "build source compute api" -WorkingDirectory (Join-PathSegments @($Root, "apps", "api")) -Executable "go" -Arguments @("build", "-o", $goApiBinary, "./cmd/compute-api") | Out-Null
    $goApiStarted = (Get-Date).ToUniversalTime().ToString("o")
    $goApiProcess = Start-GoApi -Root $Root -BinaryPath $goApiBinary -StdoutPath $goApiStdout -StderrPath $goApiStderr
    Add-Step -Name "start source compute api" -Status "passed" -ExitCode 0 -Output "Started source Compute API pid=$($goApiProcess.Id), url=$ApiBaseUrl." -StartedAt $goApiStarted -FinishedAt ((Get-Date).ToUniversalTime().ToString("o"))
    $readyStarted = (Get-Date).ToUniversalTime().ToString("o")
    try {
        $readyOutput = Wait-ComputeApiReady -BaseUrl $ApiBaseUrl
        Add-Step -Name "wait compute api ready" -Status "passed" -ExitCode 0 -Output $readyOutput -StartedAt $readyStarted -FinishedAt ((Get-Date).ToUniversalTime().ToString("o"))
    }
    catch {
        $goApiOutput = Read-ProcessOutput -StdoutPath $goApiStdout -StderrPath $goApiStderr
        Add-Step -Name "wait compute api ready" -Status "failed" -ExitCode 1 -Output "$($_.Exception.Message)`n$goApiOutput" -StartedAt $readyStarted -FinishedAt ((Get-Date).ToUniversalTime().ToString("o"))
        throw
    }

    Set-EnvVar -Name "VITE_APP_MODE" -Value "standalone"
    Set-EnvVar -Name "VITE_AUTH_MODE" -Value "disabled"
    Set-EnvVar -Name "VITE_COMPUTE_API_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "VITE_COMPUTE_API_TOKEN" -Value $PublicToken
    Set-EnvVar -Name "VITE_CONTEXT_MODE" -Value "standalone"
    Set-EnvVar -Name "AUTOWATERSIMU_FIVE_MODEL_LIVE_API_BASE_URL" -Value $ApiBaseUrl
    Set-EnvVar -Name "AUTOWATERSIMU_FIVE_MODEL_LIVE_API_TOKEN" -Value $PublicToken
    Set-EnvVar -Name "AUTOWATERSIMU_FIVE_MODEL_LIVE_JOB_IDS_PATH" -Value $jobIDsPath
    Set-EnvVar -Name "PLAYWRIGHT_PORT" -Value "5175"
    Set-EnvVar -Name "PLAYWRIGHT_BASE_URL" -Value "http://127.0.0.1:5175"
    Set-EnvVar -Name "PLAYWRIGHT_DEV_SERVER_COMMAND" -Value "npm run dev -- --host 127.0.0.1 --port 5175"
    Set-EnvVar -Name "PLAYWRIGHT_REUSE_EXISTING_SERVER" -Value "0"

    Set-EnvVar -Name "AUTOWATERSIMU_FIVE_MODEL_LIVE_MODE" -Value "submit"
    Invoke-CommandStep -Name "browser submits five model jobs to live API" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @(
        "playwright",
        "test",
        "tests/standalone-five-model-live.spec.ts",
        "--project=chromium",
        "--no-deps",
        "--reporter=line"
    ) | Out-Null

    if (-not (Test-Path -LiteralPath $jobIDsPath)) {
        throw "Five-model submit did not write job id evidence at $jobIDsPath."
    }

    Invoke-WorkerLoop -Root $Root -Python $python -ApiBaseUrl $ApiBaseUrl -WorkerToken $WorkerToken -WorkerID $workerID -ArtifactDir $ArtifactDir

    Set-EnvVar -Name "AUTOWATERSIMU_FIVE_MODEL_LIVE_MODE" -Value "verify"
    Invoke-CommandStep -Name "browser verifies five model live results" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @(
        "playwright",
        "test",
        "tests/standalone-five-model-live.spec.ts",
        "--project=chromium",
        "--no-deps",
        "--reporter=line"
    ) | Out-Null

    $summary = Get-FiveModelSummary -BaseUrl $ApiBaseUrl -Token $PublicToken
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

    if ($null -ne $goApiProcess -and -not $goApiProcess.HasExited) {
        try {
            $goApiProcess.Kill()
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
    $coverageStatus = if ($script:Failed) { "not_covered_failed_smoke" } else { "covered_by_playwright_live_compute_api_and_worker_loop" }
    $report = [ordered]@{
        schema_version = "autowatersimu_next_standalone_five_model_live_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = $Root
        commit_sha = $commitSha
        branch = $branchName
        status = if ($script:Failed) { "failed" } else { "passed" }
        failure_message = $script:FailureMessage
        api_base_url = $ApiBaseUrl
        compose = [ordered]@{
            project = $ComposeProject
            compute_api_host_port = $ComputeApiHostPort
            minio_host_port = $MinioHostPort
            minio_console_host_port = $MinioConsoleHostPort
            kept_running = [bool]$KeepCompose
        }
        coverage_summary = [ordered]@{
            five_model_browser_submit_to_live_worker = $coverageStatus
            live_postgres_minio_worker_backend = if ($script:Failed) { "not_covered_failed_smoke" } else { "covered" }
            legacy_authenticated_backend_session = "not_used_asserted_no_login_or_users_requests"
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
    $evidencePath = Join-Path $EvidenceDir "standalone-five-model-live.json"
    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Standalone five-model live smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
