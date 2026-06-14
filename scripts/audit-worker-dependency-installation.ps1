param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [switch]$AllowDeprecatedRepoPathFallback
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    param([string]$InputRoot)
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
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

function ConvertTo-RepoRelativePath {
    param(
        [string]$Root,
        [string]$Path
    )
    $rootPath = (Resolve-Path $Root).Path.TrimEnd([char[]]@("\", "/"))
    $fullPath = (Resolve-Path $Path).Path
    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return ($fullPath.Substring($rootPath.Length).TrimStart([char[]]@("\", "/")) -replace '\\', '/')
    }
    return ($fullPath -replace '\\', '/')
}

function Add-Check {
    param(
        [System.Collections.Generic.List[object]]$Checks,
        [string]$Name,
        [string]$Status,
        [string]$Summary,
        [object]$Details
    )
    $Checks.Add([ordered]@{
        name = $Name
        status = $Status
        summary = $Summary
        details = $Details
    }) | Out-Null
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

function Invoke-WorkerSelfCheck {
    param(
        [string]$Root,
        [string]$Python
    )
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    try {
        $process = Start-Process `
            -FilePath $Python `
            -ArgumentList @("services\simulation-worker\simulation_worker\cli.py", "--self-check") `
            -WorkingDirectory $Root `
            -NoNewWindow `
            -Wait `
            -PassThru `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError $stderrFile
        $stdoutRaw = Get-Content -Path $stdoutFile -Raw
        $stderrRaw = Get-Content -Path $stderrFile -Raw
        $stdout = if ($null -eq $stdoutRaw) { "" } else { [string]$stdoutRaw }
        $stderr = if ($null -eq $stderrRaw) { "" } else { [string]$stderrRaw }
        return [ordered]@{
            exit_code = $process.ExitCode
            stdout = $stdout.Trim()
            stderr = $stderr.Trim()
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\architecture-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$checks = [System.Collections.Generic.List[object]]::new()
$hardViolations = [System.Collections.Generic.List[object]]::new()
$python = Resolve-Python -Root $Root
$backendPyprojectPath = Join-Path $Root "backend\pyproject.toml"
$backendPyprojectText = if (Test-Path -LiteralPath $backendPyprojectPath) { Get-Content -LiteralPath $backendPyprojectPath -Raw } else { "" }
$backendDeclaresWorkerPackages = (
    $backendPyprojectText -match '"autowatersimu-contracts"' -and
    $backendPyprojectText -match '"autowatersimu-simulation-core"' -and
    $backendPyprojectText -match '"autowatersimu-contracts"\s*=\s*\{\s*path\s*=\s*"\.\./contracts/python"' -and
    $backendPyprojectText -match '"autowatersimu-simulation-core"\s*=\s*\{\s*path\s*=\s*"\.\./simulation_core/python"'
)
$dependencyDetails = [ordered]@{
    backend_pyproject = if (Test-Path -LiteralPath $backendPyprojectPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendPyprojectPath } else { $null }
    declares_autowatersimu_contracts = $backendPyprojectText -match '"autowatersimu-contracts"'
    declares_autowatersimu_simulation_core = $backendPyprojectText -match '"autowatersimu-simulation-core"'
    source_maps_contracts = $backendPyprojectText -match '"autowatersimu-contracts"\s*=\s*\{\s*path\s*=\s*"\.\./contracts/python"'
    source_maps_simulation_core = $backendPyprojectText -match '"autowatersimu-simulation-core"\s*=\s*\{\s*path\s*=\s*"\.\./simulation_core/python"'
}
if ($backendDeclaresWorkerPackages) {
    Add-Check -Checks $checks -Name "backend worker dependency declarations" -Status "passed" -Summary "backend pyproject declares both worker helper packages as editable local dependencies." -Details $dependencyDetails
}
else {
    Add-Check -Checks $checks -Name "backend worker dependency declarations" -Status "failed" -Summary "backend pyproject does not declare both worker helper packages as editable local dependencies." -Details $dependencyDetails
    Add-HardViolation -Violations $hardViolations -Rule "worker-helper-packages-must-be-installable" -Summary "Source-mode worker must be runnable from installed autowatersimu helper packages, not only repo-path fallback." -Details $dependencyDetails
}

$selfCheckProcess = Invoke-WorkerSelfCheck -Root $Root -Python $python
$selfCheckPayload = $null
$selfCheckParseError = ""
if ($selfCheckProcess["exit_code"] -eq 0 -and -not [string]::IsNullOrWhiteSpace($selfCheckProcess["stdout"])) {
    try {
        $selfCheckPayload = $selfCheckProcess["stdout"] | ConvertFrom-Json
    }
    catch {
        $selfCheckParseError = $_.Exception.Message
    }
}

$selfCheckDetails = [ordered]@{
    python = $python
    exit_code = $selfCheckProcess["exit_code"]
    stderr = $selfCheckProcess["stderr"]
    parse_error = $selfCheckParseError
    packaging_mode = if ($null -ne $selfCheckPayload) { $selfCheckPayload.packaging_mode } else { $null }
    worker_dependency_imports = if ($null -ne $selfCheckPayload) { $selfCheckPayload.worker_dependency_imports } else { $null }
    minimal_job_status = if ($null -ne $selfCheckPayload) { $selfCheckPayload.minimal_job_status } else { $null }
}

if ($selfCheckProcess["exit_code"] -eq 0 -and $null -ne $selfCheckPayload -and $selfCheckPayload.worker_dependency_imports.ok -eq $true -and $selfCheckPayload.minimal_job_status.ok -eq $true) {
    Add-Check -Checks $checks -Name "worker source-mode self-check" -Status "passed" -Summary "Worker self-check ran successfully and minimal job self-check succeeded." -Details $selfCheckDetails
}
else {
    Add-Check -Checks $checks -Name "worker source-mode self-check" -Status "failed" -Summary "Worker self-check did not produce a successful dependency and minimal-job result." -Details $selfCheckDetails
    Add-HardViolation -Violations $hardViolations -Rule "worker-source-mode-self-check-must-pass" -Summary "Source-mode worker must run self-check through installed dependencies before fallback removal decisions." -Details $selfCheckDetails
}

$fallbackUsed = $false
if ($null -ne $selfCheckPayload -and $null -ne $selfCheckPayload.worker_dependency_imports) {
    $fallbackUsed = [bool]$selfCheckPayload.worker_dependency_imports.deprecated_repo_path_fallback_used
}
$fallbackDetails = [ordered]@{
    allow_deprecated_repo_path_fallback = [bool]$AllowDeprecatedRepoPathFallback
    deprecated_repo_path_fallback_used = $fallbackUsed
    worker_dependency_imports = if ($null -ne $selfCheckPayload) { $selfCheckPayload.worker_dependency_imports } else { $null }
}
if ($fallbackUsed -and (-not $AllowDeprecatedRepoPathFallback)) {
    Add-Check -Checks $checks -Name "worker dependency fallback unused gate" -Status "failed" -Summary "Worker source-mode self-check used the deprecated repo-path fallback." -Details $fallbackDetails
    Add-HardViolation -Violations $hardViolations -Rule "worker-dependency-fallback-must-be-unused-in-ci-gate" -Summary "At least one CI/default gate must require installed worker packages and reject deprecated repo-path fallback usage." -Details $fallbackDetails
}
else {
    $summary = if ($fallbackUsed) { "Worker fallback was used, but this run explicitly allowed deprecated fallback." } else { "Worker source-mode self-check did not use the deprecated repo-path fallback." }
    Add-Check -Checks $checks -Name "worker dependency fallback unused gate" -Status "passed" -Summary $summary -Details $fallbackDetails
}

$status = if ($hardViolations.Count -gt 0) { "failed" } else { "passed" }
$report = [ordered]@{
    schema_version = "autowatersimu_worker_dependency_installation_audit.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    allow_deprecated_repo_path_fallback = [bool]$AllowDeprecatedRepoPathFallback
    summary = [ordered]@{
        checks = $checks.Count
        hard_violations = $hardViolations.Count
        deprecated_repo_path_fallback_used = $fallbackUsed
    }
    hard_violations = @($hardViolations)
    checks = @($checks)
    next_recommended_slice = @(
        "Keep this fallback-unused source-mode gate in default CI before deciding when to remove the deprecated repo-path fallback; packaged sidecar fallback removal remains a separate non-Desktop-excluded evidence item."
    )
}

$evidencePath = Join-Path $EvidenceDir "worker-dependency-installation.json"
$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

Write-Output "worker dependency installation audit status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "deprecated_repo_path_fallback_used: $fallbackUsed"
Write-Output "hard_violations: $($hardViolations.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
