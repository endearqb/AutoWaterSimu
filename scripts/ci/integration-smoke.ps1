param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$ApiBaseUrl = "http://localhost:8088",
    [string]$PublicToken = "dev-public-token",
    [string]$WorkerToken = "dev-worker-token",
    [string]$AdminToken = "dev-admin-token",
    [string]$ComposeProject = "autowatersimu-next-integration-smoke",
    [switch]$StartCompose,
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

function Invoke-InternalStep {
    param(
        [string]$Name,
        [scriptblock]$Body
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    try {
        $result = & $Body
        $outputText = if ($null -eq $result) { "" } else { [string]$result }
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        Add-Step -Name $Name -Status "passed" -ExitCode 0 -Output $outputText -StartedAt $started -FinishedAt $finished
        return $result
    }
    catch {
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        Add-Step -Name $Name -Status "failed" -ExitCode 1 -Output $_.Exception.Message -StartedAt $started -FinishedAt $finished
        throw
    }
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
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers $headers -ContentType "application/json" -Body $jsonBody -TimeoutSec 60
    }
    catch {
        throw (New-Object System.Exception ("$Method $Uri failed: $(Get-WebExceptionMessage -ErrorRecord $_)"))
    }
    $content = [string]$response.Content
    $payload = $null
    if (-not [string]::IsNullOrWhiteSpace($content)) {
        $payload = $content | ConvertFrom-Json
    }
    return [ordered]@{
        status_code = [int]$response.StatusCode
        headers = $response.Headers
        body = $payload
        raw = $content
    }
}

function Get-WebExceptionMessage {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)
    $message = $ErrorRecord.Exception.Message
    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) {
        return $message
    }
    try {
        $stream = $response.GetResponseStream()
        if ($null -ne $stream) {
            $reader = [System.IO.StreamReader]::new($stream)
            try {
                $body = $reader.ReadToEnd()
                if (-not [string]::IsNullOrWhiteSpace($body)) {
                    return "$message body=$body"
                }
            }
            finally {
                $reader.Dispose()
            }
        }
    }
    catch {
        return $message
    }
    return $message
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

function New-SmokeJobFile {
    param(
        [string]$Root,
        [string]$RunID,
        [string]$Name,
        [string]$OutputDir
    )
    $fixturePath = Join-PathSegments @($Root, "contracts", "examples", "valid", "material_balance_minimal.compute_job.v1.json")
    $job = Get-Content -LiteralPath $fixturePath -Raw | ConvertFrom-Json
    $jobID = "job_${Name}_${RunID}"
    $job.job_id = $jobID
    $job.request_id = "req_${Name}_${RunID}"
    $job.idempotency_key = "idem_${Name}_${RunID}"
    $job.payload.simulation_input_id = "si_${Name}_${RunID}"
    $job.payload.process_graph_id = "pg_${Name}_${RunID}"
    $job.context.trace_id = "trace_${Name}_${RunID}"
    $job.created_at = (Get-Date).ToUniversalTime().ToString("o")
    $path = Join-Path $OutputDir "$jobID.compute_job.v1.json"
    $job | ConvertTo-Json -Depth 80 | Set-Content -Path $path -Encoding UTF8
    return [ordered]@{
        job_id = $jobID
        path = $path
        payload = $job
    }
}

function Get-SHA256Hex {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $sha.ComputeHash($Bytes)
    }
    finally {
        $sha.Dispose()
    }
    return -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
}

function New-MultipartBody {
    param(
        [string]$Boundary,
        [string]$Metadata,
        [byte[]]$FileBytes,
        [string]$FileName,
        [string]$ContentType
    )
    $encoding = [System.Text.UTF8Encoding]::new($false)
    $stream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.StreamWriter]::new($stream, $encoding, 1024, $true)
    try {
        $writer.Write("--$Boundary`r`n")
        $writer.Write("Content-Disposition: form-data; name=`"metadata`"`r`n")
        $writer.Write("Content-Type: application/json`r`n`r`n")
        $writer.Write($Metadata)
        $writer.Write("`r`n--$Boundary`r`n")
        $writer.Write("Content-Disposition: form-data; name=`"file`"; filename=`"$FileName`"`r`n")
        $writer.Write("Content-Type: $ContentType`r`n`r`n")
        $writer.Flush()
        $stream.Write($FileBytes, 0, $FileBytes.Length)
        $writer.Write("`r`n--$Boundary--`r`n")
        $writer.Flush()
        return $stream.ToArray()
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

function Invoke-MultipartArtifactUpload {
    param(
        [string]$BaseUrl,
        [string]$Token,
        [string]$WorkerID,
        [string]$JobID,
        [object]$Metadata,
        [byte[]]$FileBytes
    )
    $boundary = "----autowatersimu-" + [Guid]::NewGuid().ToString("N")
    $metadataJson = $Metadata | ConvertTo-Json -Depth 40
    $body = New-MultipartBody -Boundary $boundary -Metadata $metadataJson -FileBytes $FileBytes -FileName "archive-candidate.json" -ContentType "application/json"
    $url = "$BaseUrl/api/v1/workers/$WorkerID/jobs/$JobID/artifact"
    $request = [System.Net.WebRequest]::CreateHttp($url)
    $request.Method = "POST"
    $request.Accept = "application/json"
    $request.ContentType = "multipart/form-data; boundary=$boundary"
    $request.Headers["Authorization"] = "Bearer $Token"
    $request.Timeout = 60000
    $request.ContentLength = $body.Length
    $requestStream = $request.GetRequestStream()
    try {
        $requestStream.Write($body, 0, $body.Length)
    }
    finally {
        $requestStream.Dispose()
    }
    try {
        $response = $request.GetResponse()
        try {
            $statusCode = [int]$response.StatusCode
            $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
            try {
                $content = $reader.ReadToEnd()
            }
            finally {
                $reader.Dispose()
            }
        }
        finally {
            $response.Dispose()
        }
    }
    catch [System.Net.WebException] {
        $message = $_.Exception.Message
        if ($null -ne $_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            try {
                $bodyText = $reader.ReadToEnd()
                if (-not [string]::IsNullOrWhiteSpace($bodyText)) {
                    $message = "$message body=$bodyText"
                }
            }
            finally {
                $reader.Dispose()
                $_.Exception.Response.Dispose()
            }
        }
        throw (New-Object System.Exception ("artifact upload failed: $message"))
    }
    return [ordered]@{
        status_code = $statusCode
        body = ($content | ConvertFrom-Json)
    }
}

function Add-ComposeDiagnostics {
    param(
        [string]$Root,
        [string]$Project
    )
    try {
        Invoke-CommandStep -Name "docker compose ps diagnostic" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $Project, "-f", "docker-compose.dev.yml", "ps") | Out-Null
    }
    catch {
        # Diagnostic collection should not hide the original failure.
    }
    try {
        Invoke-CommandStep -Name "compute api logs diagnostic" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $Project, "-f", "docker-compose.dev.yml", "logs", "--no-color", "--tail=200", "compute-api") | Out-Null
    }
    catch {
        # Diagnostic collection should not hide the original failure.
    }
}

function ConvertTo-SafeIDPart {
    param([string]$Value)
    $builder = [System.Text.StringBuilder]::new()
    foreach ($char in $Value.ToCharArray()) {
        if ([char]::IsLetterOrDigit($char) -or $char -eq '_' -or $char -eq '-') {
            [void]$builder.Append($char)
        }
        else {
            [void]$builder.Append('_')
        }
    }
    return $builder.ToString()
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-PathSegments @($Root, "tmp", "ci-evidence")
}
$RunID = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$SmokeDir = Join-PathSegments @($Root, "tmp", "integration-smoke", $RunID)
$ArtifactDir = Join-PathSegments @($SmokeDir, "worker-artifacts")
New-Item -ItemType Directory -Force -Path $EvidenceDir, $SmokeDir, $ArtifactDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$python = Resolve-Python -Root $Root
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = ConvertTo-GitStatusLines -StatusText $statusBefore
$trackedStatusBefore = Get-TrackedStatusLines -StatusLines $statusBeforeLines
$untrackedStatusBefore = Get-UntrackedStatusLines -StatusLines $statusBeforeLines
$summary = [ordered]@{}

try {
    if ($StartCompose) {
        Invoke-CommandStep -Name "docker compose config" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "config") | Out-Null
        Invoke-CommandStep -Name "start postgres minio compute api" -WorkingDirectory $Root -Executable "docker" -Arguments @("compose", "-p", $ComposeProject, "-f", "docker-compose.dev.yml", "up", "-d", "compute-api") | Out-Null
    }

    Invoke-InternalStep -Name "wait compute api ready" -Body {
        Wait-ComputeApiReady -BaseUrl $ApiBaseUrl
    } | Out-Null

    $mainJob = Invoke-InternalStep -Name "create compute job" -Body {
        $jobInfo = New-SmokeJobFile -Root $Root -RunID $RunID -Name "integration" -OutputDir $SmokeDir
        $response = Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/compute/jobs" -Token $PublicToken -Body $jobInfo.payload
        if ($response.status_code -ne 202 -and $response.status_code -ne 200) {
            throw "Unexpected create job status: $($response.status_code)"
        }
        $script:summary.main_job_id = $jobInfo.job_id
        "Created $($jobInfo.job_id) with HTTP $($response.status_code)."
    }

    $workerID = "worker_integration_$RunID"
    $workerCliPath = Join-PathSegments @($Root, "services", "simulation-worker", "simulation_worker", "cli.py")
    Invoke-CommandStep -Name "worker run api once" -WorkingDirectory $Root -Executable $python -Arguments @(
        $workerCliPath,
        "--run-api-once",
        "--api-base-url",
        $ApiBaseUrl,
        "--api-token",
        $WorkerToken,
        "--worker-id",
        $workerID,
        "--artifact-dir",
        $ArtifactDir
    ) | Out-Null

    Invoke-InternalStep -Name "verify worker result evidence and artifact" -Body {
        $jobID = $script:summary.main_job_id
        $jobResponse = Invoke-JsonApi -Method "GET" -Uri "$ApiBaseUrl/api/v1/compute/jobs/$jobID" -Token $PublicToken
        if ($jobResponse.body.job.status -ne "succeeded") {
            throw "Job $jobID did not succeed; status=$($jobResponse.body.job.status)"
        }
        $resultResponse = Invoke-JsonApi -Method "GET" -Uri "$ApiBaseUrl/api/v1/compute/jobs/$jobID/result" -Token $PublicToken
        $modelRuns = @($resultResponse.body.model_runs)
        if ($modelRuns.Count -lt 1) {
            throw "Result did not include persisted model runs."
        }
        $artifacts = @($resultResponse.body.artifacts)
        if ($artifacts.Count -lt 1) {
            throw "Result did not include uploaded artifacts."
        }
        $modelRunID = [string]$modelRuns[0].model_run_id
        $artifactID = [string]$artifacts[0].artifact_id
        $artifactResponse = Invoke-WebRequest -UseBasicParsing -Method "GET" -Uri "$ApiBaseUrl/api/v1/artifacts/$artifactID" -Headers @{ Authorization = "Bearer $PublicToken" } -TimeoutSec 60
        $artifactChecksum = [string]$artifactResponse.Headers["X-Artifact-Checksum"]
        if ([string]::IsNullOrWhiteSpace($artifactChecksum)) {
            throw "Artifact download did not expose X-Artifact-Checksum."
        }
        $evidenceResponse = Invoke-WebRequest -UseBasicParsing -Method "GET" -Uri "$ApiBaseUrl/api/v1/compute/jobs/$jobID/evidence" -Headers @{ Authorization = "Bearer $PublicToken"; Accept = "application/json" } -TimeoutSec 60
        $evidenceChecksum = [string]$evidenceResponse.Headers["X-Evidence-Checksum"]
        if ([string]::IsNullOrWhiteSpace($evidenceChecksum)) {
            throw "Evidence export did not expose X-Evidence-Checksum."
        }
        $modelRunResponse = Invoke-JsonApi -Method "GET" -Uri "$ApiBaseUrl/api/v1/model-runs/$modelRunID" -Token $PublicToken
        if ($modelRunResponse.body.model_run_id -ne $modelRunID) {
            throw "Model run lookup returned the wrong record."
        }
        $script:summary.model_run_id = $modelRunID
        $script:summary.artifact_id = $artifactID
        "Verified $jobID result, model_run=$modelRunID, artifact=$artifactID, evidence checksum and artifact checksum."
    } | Out-Null

    Invoke-InternalStep -Name "archive candidate retention dry-run" -Body {
        $archiveJob = New-SmokeJobFile -Root $Root -RunID $RunID -Name "archive" -OutputDir $SmokeDir
        $archiveJobID = $archiveJob.job_id
        $workerArchiveID = "worker_archive_$RunID"
        Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/compute/jobs" -Token $PublicToken -Body $archiveJob.payload | Out-Null
        Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/workers/register" -Token $WorkerToken -Body ([ordered]@{
            worker_id = $workerArchiveID
            capabilities = @("material_balance", "ode")
            supported_contract_versions = @("compute_job.v1", "simulation_input.v1", "compute_result.v1", "artifact.v1")
            runtime_version = "integration-smoke"
        }) | Out-Null
        $claim = Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/workers/$workerArchiveID/claim" -Token $WorkerToken -Body ([ordered]@{})
        if ($claim.body.job.job_id -ne $archiveJobID) {
            throw "Archive worker claimed unexpected job: $($claim.body.job.job_id)"
        }
        Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/workers/$workerArchiveID/heartbeat" -Token $WorkerToken -Body ([ordered]@{ job_id = $archiveJobID }) | Out-Null

        $candidateBytes = [System.Text.UTF8Encoding]::new($false).GetBytes((([ordered]@{
            schema_version = "integration_archive_smoke_payload.v1"
            job_id = $archiveJobID
            generated_at = (Get-Date).ToUniversalTime().ToString("o")
        }) | ConvertTo-Json -Depth 10))
        $safeJobID = ConvertTo-SafeIDPart -Value $archiveJobID
        $candidateArtifactID = "art_${safeJobID}_archive_candidate"
        $checksum = Get-SHA256Hex -Bytes $candidateBytes
        $metadata = [ordered]@{
            schema_version = "artifact.v1"
            artifact_id = $candidateArtifactID
            job_id = $archiveJobID
            artifact_type = "integration.archive_candidate"
            storage_provider = "local_fs"
            object_key = "jobs/$archiveJobID/archive_candidate.json"
            content_type = "application/json"
            size_bytes = $candidateBytes.Length
            checksum = "sha256:$checksum"
            created_at = (Get-Date).ToUniversalTime().ToString("o")
            retention_policy = "archive_candidate"
            retain_until = (Get-Date).ToUniversalTime().AddMinutes(-5).ToString("o")
            metadata = [ordered]@{
                description = "Integration smoke archive dry-run candidate"
            }
        }
        $uploaded = Invoke-MultipartArtifactUpload -BaseUrl $ApiBaseUrl -Token $WorkerToken -WorkerID $workerArchiveID -JobID $archiveJobID -Metadata $metadata -FileBytes $candidateBytes
        if ($uploaded.body.artifact_id -ne $candidateArtifactID) {
            throw "Archive candidate upload returned the wrong artifact."
        }
        $sweep = Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/admin/artifacts/retention-sweep" -Token $AdminToken -Body ([ordered]@{ dry_run = $true; limit = 20 })
        $matches = @($sweep.body.items | Where-Object { $_.artifact_id -eq $candidateArtifactID -and $_.action -eq "would_archive" })
        if ($matches.Count -lt 1) {
            throw "Retention dry-run did not report would_archive for $candidateArtifactID."
        }
        $completeResult = [ordered]@{
            schema_version = "compute_result.v1"
            job_id = $archiveJobID
            job_type = "simulation.material_balance.v1"
            status = "succeeded"
            summary = [ordered]@{ convergence_status = "completed"; total_steps = 0 }
            data = [ordered]@{}
            quality = [ordered]@{ data_quality = "simulated"; warnings = @() }
            artifacts = @($uploaded.body)
            runtime_audit = [ordered]@{
                model_runs = @()
                timings_ms = [ordered]@{ total = 0 }
                fallback_used = $false
                fallback_reason = ""
                worker_version = "integration-smoke"
                python_version = ""
                package_versions = [ordered]@{}
            }
        }
        Invoke-JsonApi -Method "POST" -Uri "$ApiBaseUrl/api/v1/workers/$workerArchiveID/jobs/$archiveJobID/succeed" -Token $WorkerToken -Body ([ordered]@{
            attempt = [int]$claim.body.attempt
            compute_result = $completeResult
        }) | Out-Null
        $script:summary.archive_candidate_artifact_id = $candidateArtifactID
        "Verified retention dry-run would_archive for $candidateArtifactID."
    } | Out-Null

    Invoke-InternalStep -Name "verify metrics reflect integration smoke" -Body {
        $metrics = Invoke-WebRequest -UseBasicParsing -Method "GET" -Uri "$ApiBaseUrl/metrics" -TimeoutSec 60
        $body = [string]$metrics.Content
        foreach ($expected in @(
            "autowatersimu_compute_api_up 1",
            "autowatersimu_compute_jobs_total{status=`"succeeded`"}",
            "autowatersimu_compute_artifacts_total"
        )) {
            if (-not $body.Contains($expected)) {
                throw "Metrics output missing expected text: $expected"
            }
        }
        "Verified metrics endpoint after smoke."
    } | Out-Null
}
catch {
    $script:Failed = $true
    $script:FailureMessage = $_.Exception.Message
    if ($StartCompose) {
        Add-ComposeDiagnostics -Root $Root -Project $ComposeProject
    }
}
finally {
    if ($StartCompose -and -not $KeepCompose) {
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
    $statusAfterLines = ConvertTo-GitStatusLines -StatusText $statusAfter
    $trackedStatusAfter = Get-TrackedStatusLines -StatusLines $statusAfterLines
    $untrackedStatusAfter = Get-UntrackedStatusLines -StatusLines $statusAfterLines
    $report = [ordered]@{
        schema_version = "autowatersimu_next_integration_smoke_evidence.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = $Root
        commit_sha = $commitSha
        branch = $branchName
        status = if ($script:Failed) { "failed" } else { "passed" }
        failure_message = $script:FailureMessage
        api_base_url = $ApiBaseUrl
        compose = [ordered]@{
            started = [bool]$StartCompose
            project = $ComposeProject
            kept_running = [bool]($StartCompose -and $KeepCompose)
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
    $evidencePath = Join-Path $EvidenceDir "integration-smoke.json"
    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Integration smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
