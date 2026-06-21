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

function Invoke-WithEnv {
    param(
        [hashtable]$EnvVars,
        [scriptblock]$Body
    )
    $previous = @{}
    foreach ($key in $EnvVars.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
        [Environment]::SetEnvironmentVariable($key, [string]$EnvVars[$key], "Process")
    }
    try {
        & $Body
    }
    finally {
        foreach ($key in $EnvVars.Keys) {
            [Environment]::SetEnvironmentVariable($key, $previous[$key], "Process")
        }
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$python = Resolve-Python -Root $Root
$npx = Resolve-NativeCommand -Name "npx"
$artifactRoot = Join-Path $Root "tmp\standalone-five-model-smoke"
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null

$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)

$fixtures = @(
    @{ name = "material balance worker fixture"; key = "material_balance"; path = "contracts\examples\valid\material_balance_minimal.compute_job.v1.json" },
    @{ name = "asm1slim worker fixture"; key = "asm1slim"; path = "contracts\examples\valid\asm1slim_independent.compute_job.v1.json" },
    @{ name = "asm1 worker fixture"; key = "asm1"; path = "contracts\examples\valid\asm1_independent.compute_job.v1.json" },
    @{ name = "asm3 worker fixture"; key = "asm3"; path = "contracts\examples\valid\asm3_independent.compute_job.v1.json" },
    @{ name = "udm worker fixture"; key = "udm"; path = "contracts\examples\valid\udm_independent.compute_job.v1.json" }
)

foreach ($fixture in $fixtures) {
    $fixturePath = Join-Path $Root $fixture.path
    $artifactDir = Join-Path $artifactRoot $fixture.key
    New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
    Invoke-Step `
        -Name $fixture.name `
        -WorkingDirectory $Root `
        -Executable $python `
        -Arguments @("services\simulation-worker\simulation_worker\cli.py", "--run-job", $fixturePath, "--artifact-dir", $artifactDir)
}

Invoke-WithEnv -EnvVars @{
    VITE_APP_MODE = "standalone"
    VITE_AUTH_MODE = "disabled"
    VITE_CONTEXT_MODE = "standalone"
    VITE_COMPUTE_API_URL = "http://localhost:8088"
    VITE_COMPUTE_API_TOKEN = ""
} -Body {
    Invoke-Step `
        -Name "frontend standalone five-model playwright smoke" `
        -WorkingDirectory (Join-Path $Root "frontend") `
        -Executable $npx `
        -Arguments @("playwright", "test", "tests/standalone-five-model-compute.spec.ts", "--project=chromium", "--no-deps", "--reporter=line")
}

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
$trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
$untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)

$report = [ordered]@{
    schema_version = "autowatersimu_next_standalone_five_model_smoke_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
    branch = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
    status = if ($script:Failed) { "failed" } else { "passed" }
    coverage_summary = [ordered]@{
        worker_fixtures = @($fixtures | ForEach-Object { $_.key })
        frontend_mock_backed_submit_and_result = "standalone-five-model-compute.spec.ts"
        legacy_fastapi_calculation_paths = "guarded_by_frontend_boundary_audit"
        live_postgres_minio_worker_backend = "not_covered_by_this_script"
    }
    artifact_root = $artifactRoot
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

$evidencePath = Join-Path $EvidenceDir "standalone-five-model-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Standalone five-model smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
