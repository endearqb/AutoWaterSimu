param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ApiBaseUrl = "http://localhost:8088"
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

function Invoke-Native {
    param(
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    Push-Location $WorkingDirectory
    try {
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        if ($exitCode -ne 0) {
            throw "$Executable $($Arguments -join ' ') failed with exit code $exitCode`n$text"
        }
        return $text
    }
    finally {
        Pop-Location
    }
}

function New-Step {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Output,
        [string]$StartedAt,
        [string]$FinishedAt
    )
    return [ordered]@{
        name = $Name
        status = $Status
        started_at = $StartedAt
        finished_at = $FinishedAt
        output_excerpt = if ($Output.Length -gt 4000) { $Output.Substring($Output.Length - 4000) } else { $Output }
    }
}

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Body
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    try {
        $result = & $Body
        $output = if ($null -eq $result) { "" } else { (($result | ForEach-Object { [string]$_ }) -join "`n").Trim() }
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        $script:Steps.Add((New-Step -Name $Name -Status "passed" -Output $output -StartedAt $started -FinishedAt $finished)) | Out-Null
        return $result
    }
    catch {
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        $script:Steps.Add((New-Step -Name $Name -Status "failed" -Output $_.Exception.Message -StartedAt $started -FinishedAt $finished)) | Out-Null
        $script:Failed = $true
        $script:FailureMessage = $_.Exception.Message
        throw
    }
}

function Invoke-NoAuthJson {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null
    )
    $jsonBody = $null
    if ($null -ne $Body) {
        $jsonBody = $Body | ConvertTo-Json -Depth 80
    }
    $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers @{ Accept = "application/json" } -ContentType "application/json" -Body $jsonBody -TimeoutSec 60
    $payload = $null
    if (-not [string]::IsNullOrWhiteSpace([string]$response.Content)) {
        $payload = [string]$response.Content | ConvertFrom-Json
    }
    return [ordered]@{
        status_code = [int]$response.StatusCode
        body = $payload
    }
}

function Wait-ComputeApiReady {
    param([string]$BaseUrl)
    $deadline = (Get-Date).AddMinutes(4)
    $lastError = ""
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-NoAuthJson -Method "GET" -Uri "$BaseUrl/readyz"
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

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$summary = [ordered]@{}
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")

try {
    Invoke-Step -Name "standalone compose excludes legacy backend" -Body {
        $servicesText = Invoke-Native -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-f", "docker-compose.standalone.yml", "config", "--services")
        $services = @($servicesText -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        if ($services -contains "backend" -or $services -contains "legacy-backend") {
            throw "docker-compose.standalone.yml must not include legacy backend service"
        }
        foreach ($required in @("compute-postgres", "compute-api", "simulation-worker", "frontend")) {
            if ($services -notcontains $required) {
                throw "standalone compose missing service: $required"
            }
        }
        $script:summary.services = $services
        $services -join ", "
    } | Out-Null

    Invoke-Step -Name "wait standalone compute api ready" -Body {
        Wait-ComputeApiReady -BaseUrl $ApiBaseUrl
    } | Out-Null

    Invoke-Step -Name "create and read compute job without authorization" -Body {
        $runID = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
        $fixturePath = Join-Path $Root "contracts\examples\valid\material_balance_minimal.compute_job.v1.json"
        $job = Get-Content -LiteralPath $fixturePath -Raw | ConvertFrom-Json
        $jobID = "job_standalone_$runID"
        $job.job_id = $jobID
        $job.request_id = "req_standalone_$runID"
        $job.idempotency_key = "idem_standalone_$runID"
        $job.payload.simulation_input_id = "si_standalone_$runID"
        $job.payload.process_graph_id = "pg_standalone_$runID"
        $job.context.trace_id = "trace_standalone_$runID"
        $job.created_at = (Get-Date).ToUniversalTime().ToString("o")

        $createResponse = Invoke-NoAuthJson -Method "POST" -Uri "$ApiBaseUrl/api/v1/compute/jobs" -Body $job
        if ($createResponse.status_code -ne 202 -and $createResponse.status_code -ne 200) {
            throw "unexpected no-auth create status: $($createResponse.status_code)"
        }
        $readResponse = Invoke-NoAuthJson -Method "GET" -Uri "$ApiBaseUrl/api/v1/compute/jobs/$jobID"
        if ($readResponse.status_code -ne 200 -or $readResponse.body.job.job_id -ne $jobID) {
            throw "unexpected no-auth read response for $jobID"
        }
        $script:summary.job_id = $jobID
        "Created and read $jobID without Authorization header."
    } | Out-Null
}
catch {
    $script:Failed = $true
    if ([string]::IsNullOrWhiteSpace($script:FailureMessage)) {
        $script:FailureMessage = $_.Exception.Message
    }
}
finally {
    $statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
    $report = [ordered]@{
        schema_version = "autowatersimu_next_standalone_smoke_evidence.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = $Root
        commit_sha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
        branch = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
        status = if ($script:Failed) { "failed" } else { "passed" }
        failure_message = $script:FailureMessage
        api_base_url = $ApiBaseUrl
        used_authorization_header = $false
        summary = $summary
        dirty_files_before = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
        dirty_files_after = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
        steps = $script:Steps
    }
    $evidencePath = Join-Path $EvidenceDir "standalone-smoke.json"
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Standalone smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
