param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [int]$Iterations = 1,
    [switch]$FailOnOpenGaps
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

function Resolve-Python {
    param([string]$Root)
    $windowsPython = Join-Path $Root "backend\.venv\Scripts\python.exe"
    $posixPython = Join-Path $Root "backend/.venv/bin/python"
    if (Test-Path -LiteralPath $windowsPython) {
        return $windowsPython
    }
    if (Test-Path -LiteralPath $posixPython) {
        return $posixPython
    }
    return "python"
}

function Invoke-WorkerCommand {
    param(
        [string]$Python,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [string]$StderrPath
    )
    $previousLocation = Get-Location
    try {
        Set-Location $WorkingDirectory
        $stdoutPath = [System.IO.Path]::ChangeExtension($StderrPath, ".stdout.txt")
        Remove-Item -LiteralPath $stdoutPath, $StderrPath -Force -ErrorAction SilentlyContinue
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $process = Start-Process `
            -FilePath $Python `
            -ArgumentList $Arguments `
            -WorkingDirectory $WorkingDirectory `
            -RedirectStandardOutput $stdoutPath `
            -RedirectStandardError $StderrPath `
            -NoNewWindow `
            -PassThru `
            -Wait
        $stopwatch.Stop()
        $stdoutText = ""
        if (Test-Path -LiteralPath $stdoutPath) {
            $stdoutText = Get-Content -LiteralPath $stdoutPath -Raw
        }
        $stderrText = ""
        if (Test-Path -LiteralPath $StderrPath) {
            $stderrText = Get-Content -LiteralPath $StderrPath -Raw
        }
        $stdoutText = if ($null -eq $stdoutText) { "" } else { [string]$stdoutText }
        $stderrText = if ($null -eq $stderrText) { "" } else { [string]$stderrText }
        return [ordered]@{
            exit_code = $process.ExitCode
            stdout = $stdoutText.Trim()
            stderr = $stderrText.Trim()
            wall_ms = [int]$stopwatch.ElapsedMilliseconds
        }
    }
    finally {
        Set-Location $previousLocation
    }
}

function Read-JsonFile {
    param([string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [object]$Value,
        [string]$Path
    )
    $json = $Value | ConvertTo-Json -Depth 100
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json, $encoding)
}

function ConvertTo-JsonObject {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $null
    }
    return $Text | ConvertFrom-Json
}

function Add-HardViolation {
    param(
        [System.Collections.Generic.List[object]]$Violations,
        [string]$Rule,
        [string]$Summary,
        [object]$Details
    )
    $Violations.Add([ordered]@{
        rule = $Rule
        summary = $Summary
        details = $Details
    }) | Out-Null
}

function Add-OpenGap {
    param(
        [System.Collections.Generic.List[object]]$Gaps,
        [string]$Id,
        [string]$Severity,
        [string]$Summary,
        [object]$Evidence
    )
    $Gaps.Add([ordered]@{
        id = $Id
        severity = $Severity
        summary = $Summary
        evidence = $Evidence
    }) | Out-Null
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$python = Resolve-Python -Root $Root
$cliPath = Join-Path $Root "services\simulation-worker\simulation_worker\cli.py"
$workDir = Join-Path $Root "tmp\performance-baseline-phase0"
$jobDir = Join-Path $workDir "jobs"
$artifactRoot = Join-Path $workDir "artifacts"
$stderrDir = Join-Path $workDir "stderr"
New-Item -ItemType Directory -Force -Path $jobDir | Out-Null
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
New-Item -ItemType Directory -Force -Path $stderrDir | Out-Null

$requiredTimingSegments = @(
    "schema_validate",
    "dependency_import",
    "adapter_convert",
    "compute",
    "artifact_serialize",
    "result_envelope",
    "total"
)
$solvers = @("scipy_solver", "rk4", "adaptive_heun")
$cases = @(
    [ordered]@{
        id = "small_material_balance"
        size = "small"
        fixture = "contracts\examples\valid\material_balance_minimal.compute_job.v1.json"
        expected_job_type = "simulation.material_balance.v1"
        required = $true
    },
    [ordered]@{
        id = "medium_asm1"
        size = "medium"
        fixture = "contracts\examples\valid\asm1_independent.compute_job.v1.json"
        expected_job_type = "simulation.asm1.v1"
        required = $true
    },
    [ordered]@{
        id = "udm_single"
        size = "udm"
        fixture = "contracts\examples\valid\udm_independent.compute_job.v1.json"
        expected_job_type = "simulation.udm.v1"
        required = $true
    },
    [ordered]@{
        id = "mixed_asm_udm"
        size = "mixed_asm_udm"
        fixture = "contracts\examples\valid\mixed_asm_udm.compute_job.v1.json"
        expected_job_type = "simulation.udm.v1"
        required = $false
    }
)

$hardViolations = [System.Collections.Generic.List[object]]::new()
$openGaps = [System.Collections.Generic.List[object]]::new()
$runs = [System.Collections.Generic.List[object]]::new()

$selfCheckStderr = Join-Path $stderrDir "self-check.stderr.txt"
$selfCheckInvocation = Invoke-WorkerCommand -Python $python -Arguments @($cliPath, "--self-check") -WorkingDirectory $Root -StderrPath $selfCheckStderr
$workerSelfCheck = $null
try {
    $workerSelfCheck = ConvertTo-JsonObject -Text $selfCheckInvocation["stdout"]
}
catch {
    Add-HardViolation -Violations $hardViolations -Rule "worker-self-check-json" -Summary "Worker self-check did not return parseable JSON." -Details $selfCheckInvocation
}
if ($selfCheckInvocation["exit_code"] -ne 0) {
    Add-HardViolation -Violations $hardViolations -Rule "worker-self-check-exit-code" -Summary "Worker self-check failed before performance baseline runs." -Details $selfCheckInvocation
}

foreach ($case in $cases) {
    $fixturePath = Join-Path $Root $case["fixture"]
    if (-not (Test-Path -LiteralPath $fixturePath)) {
        $gapDetails = [ordered]@{
            case_id = $case["id"]
            expected_fixture = $case["fixture"]
            required = [bool]$case["required"]
        }
        if ([bool]$case["required"]) {
            Add-HardViolation -Violations $hardViolations -Rule "performance-baseline-fixture-missing" -Summary "Required performance baseline fixture is missing." -Details $gapDetails
        }
        else {
            Add-OpenGap -Gaps $openGaps -Id "$($case["id"])-baseline-fixture-missing" -Severity "medium" -Summary "Phase 0 baseline fixture is not tracked yet; do not claim this baseline dimension complete." -Evidence $gapDetails
        }
        continue
    }

    foreach ($solver in $solvers) {
        for ($iteration = 1; $iteration -le $Iterations; $iteration++) {
            $runId = "$($case["id"])_$($solver)_iter$iteration"
            $job = Read-JsonFile -Path $fixturePath
            $job.job_id = "perf_phase0_$runId"
            $job.request_id = "req_perf_phase0_$runId"
            $job.idempotency_key = "idem_perf_phase0_$runId"
            $job.payload.simulation_input_id = "si_perf_phase0_$runId"
            $job.payload.parameters.solver_method = $solver
            if ($null -ne $job.context) {
                $job.context.trace_id = "trace_perf_phase0_$runId"
            }

            $jobPath = Join-Path $jobDir "$runId.compute_job.v1.json"
            $artifactDir = Join-Path $artifactRoot $runId
            New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
            Write-JsonFile -Value $job -Path $jobPath

            $stderrPath = Join-Path $stderrDir "$runId.stderr.txt"
            $invocation = Invoke-WorkerCommand -Python $python -Arguments @($cliPath, "--run-job", $jobPath, "--artifact-dir", $artifactDir) -WorkingDirectory $Root -StderrPath $stderrPath

            $result = $null
            $parseError = ""
            try {
                $result = ConvertTo-JsonObject -Text $invocation["stdout"]
            }
            catch {
                $parseError = $_.Exception.Message
            }

            $timings = $null
            $timingNames = @()
            $missingSegments = @($requiredTimingSegments)
            $artifactCount = 0
            $artifactBytes = 0L
            $status = "unparsed"
            $summary = $null
            if ($null -ne $result) {
                $status = [string]$result.status
                $summary = $result.summary
                if ($null -ne $result.runtime_audit -and $null -ne $result.runtime_audit.timings_ms) {
                    $timings = $result.runtime_audit.timings_ms
                    $timingNames = @($timings.PSObject.Properties.Name)
                    $missingSegments = @($requiredTimingSegments | Where-Object { $timingNames -notcontains $_ })
                }
                if ($null -ne $result.artifacts) {
                    $artifactCount = @($result.artifacts).Count
                    foreach ($artifact in @($result.artifacts)) {
                        if ($null -ne $artifact.size_bytes) {
                            $artifactBytes += [int64]$artifact.size_bytes
                        }
                    }
                }
            }

            $runRecord = [ordered]@{
                run_id = $runId
                case_id = $case["id"]
                size = $case["size"]
                fixture = $case["fixture"]
                solver_method = $solver
                iteration = $iteration
                exit_code = $invocation["exit_code"]
                wall_ms = $invocation["wall_ms"]
                status = $status
                job_type = if ($null -ne $result) { [string]$result.job_type } else { "" }
                timing_segments = $timings
                missing_timing_segments = $missingSegments
                artifact_count = $artifactCount
                artifact_size_bytes = $artifactBytes
                total_steps = if ($null -ne $summary -and $null -ne $summary.total_steps) { [int]$summary.total_steps } else { $null }
                total_time = if ($null -ne $summary -and $null -ne $summary.total_time) { [double]$summary.total_time } else { $null }
                stdout_parse_error = $parseError
                stderr = $invocation["stderr"]
            }
            $runs.Add($runRecord) | Out-Null

            if ($invocation["exit_code"] -ne 0) {
                Add-HardViolation -Violations $hardViolations -Rule "performance-baseline-worker-exit-code" -Summary "Worker baseline run exited non-zero." -Details $runRecord
            }
            elseif ($null -eq $result) {
                Add-HardViolation -Violations $hardViolations -Rule "performance-baseline-result-json" -Summary "Worker baseline run did not return parseable compute_result JSON." -Details $runRecord
            }
            elseif ($status -ne "succeeded") {
                Add-HardViolation -Violations $hardViolations -Rule "performance-baseline-run-status" -Summary "Worker baseline run did not succeed." -Details $runRecord
            }
            elseif ($missingSegments.Count -gt 0) {
                Add-HardViolation -Violations $hardViolations -Rule "performance-baseline-timing-segments" -Summary "Worker baseline result is missing required runtime_audit.timings_ms segments." -Details $runRecord
            }
        }
    }
}

$gitSha = ""
$gitBranch = ""
$gitStatus = @()
try {
    $gitSha = ((& git -C $Root rev-parse --short HEAD 2>$null) -join "`n").Trim()
}
catch {
    $gitSha = ""
}
try {
    $gitBranch = ((& git -C $Root branch --show-current 2>$null) -join "`n").Trim()
}
catch {
    $gitBranch = ""
}
try {
    $gitStatus = @(& git -C $Root status --short 2>$null | ForEach-Object { [string]$_ })
}
catch {
    $gitStatus = @()
}

$status = "passed"
if ($hardViolations.Count -gt 0) {
    $status = "failed"
}
elseif ($openGaps.Count -gt 0) {
    $status = "partial"
}

$report = [ordered]@{
    schema_version = "autowatersimu_performance_baseline_phase0.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    fail_on_open_gaps = [bool]$FailOnOpenGaps
    summary = [ordered]@{
        cases_defined = $cases.Count
        solvers = $solvers
        iterations = $Iterations
        runs = $runs.Count
        hard_violations = $hardViolations.Count
        open_gaps = $openGaps.Count
        required_timing_segments = $requiredTimingSegments
    }
    api_latency_metric_design = [ordered]@{
        status = "designed_not_measured"
        claim_latency_ms = "worker claim POST wall time from request start to response body parsed"
        list_latency_ms = "Compute API list/read endpoint wall time from request start to response body parsed"
        future_source = "integration-smoke or a dedicated Compute API HTTP benchmark lane"
    }
    environment = [ordered]@{
        git_sha = $gitSha
        git_branch = $gitBranch
        git_status_short = $gitStatus
        python = $python
        worker_self_check = $workerSelfCheck
    }
    matrix = $cases
    runs = @($runs)
    open_gaps = @($openGaps)
    hard_violations = @($hardViolations)
}

$evidencePath = Join-Path $EvidenceDir "performance-baseline-phase0.json"
Write-JsonFile -Value $report -Path $evidencePath

Write-Output "performance baseline phase0 status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "runs: $($runs.Count)"
Write-Output "hard_violations: $($hardViolations.Count)"
Write-Output "open_gaps: $($openGaps.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
if ($FailOnOpenGaps -and $openGaps.Count -gt 0) {
    exit 1
}
