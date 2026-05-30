param(
    [ValidateSet("merge", "release")]
    [string]$Mode = "merge",
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$SidecarPath = "",
    [string]$InstallerPath = "",
    [switch]$AllowMissingPackageArtifacts,
    [switch]$RunPostgresMigrationSmoke,
    [switch]$SkipLong
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

function Invoke-Gate {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $outputText = ""
    $exitCode = 0
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    try {
        $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $exitCode = $process.ExitCode
        $stdout = Get-Content -Path $stdoutFile -Raw
        $stderr = Get-Content -Path $stderrFile -Raw
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

function Normalize-ComputeClientWhitespace {
    param([string]$Root)
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $exitCode = 0
    $outputText = ""
    try {
        $sdkPath = Join-Path $Root "frontend\src\client\compute\sdk.gen.ts"
        $encoding = [System.Text.UTF8Encoding]::new($false)
        $text = [System.IO.File]::ReadAllText($sdkPath)
        $normalized = [System.Text.RegularExpressions.Regex]::Replace($text, "[ `t]+(?=`r?`n)", "")
        if (-not $normalized.EndsWith("`n")) {
            $lineEnding = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
            $normalized = $normalized + $lineEnding
        }
        if ($normalized -ne $text) {
            [System.IO.File]::WriteAllText($sdkPath, $normalized, $encoding)
            $outputText = "Trimmed trailing whitespace in frontend/src/client/compute/sdk.gen.ts"
        } else {
            $outputText = "No generated SDK trailing whitespace found"
        }
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    $script:Steps.Add((New-Step -Name "compute client whitespace normalization" -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:Failed = $true
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\release-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:DryRunSkippedArtifacts = $false
$python = Resolve-Python -Root $Root
$npm = Resolve-NativeCommand -Name "npm"
$npx = Resolve-NativeCommand -Name "npx"

Invoke-Gate -Name "contracts schema tests" -WorkingDirectory $Root -Executable $python -Arguments @("-m", "pytest", "contracts\tests", "-q")
Invoke-Gate -Name "worker self-check" -WorkingDirectory $Root -Executable $python -Arguments @("services\simulation-worker\simulation_worker\cli.py", "--self-check")
Invoke-Gate -Name "worker minimal job" -WorkingDirectory $Root -Executable $python -Arguments @("services\simulation-worker\simulation_worker\cli.py", "--run-job", "contracts\examples\valid\material_balance_minimal.compute_job.v1.json", "--artifact-dir", "tmp\release-evidence\worker-artifacts")
Invoke-Gate -Name "go compute api tests" -WorkingDirectory (Join-Path $Root "apps\api") -Executable "go" -Arguments @("test", "./...")
Invoke-Gate -Name "compute client generation" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npm -Arguments @("run", "generate-compute-client")
Normalize-ComputeClientWhitespace -Root $Root
Invoke-Gate -Name "compute client diff gate" -WorkingDirectory $Root -Executable "git" -Arguments @("diff", "--exit-code", "--", "apps/api/openapi/compute.openapi.json", "frontend/src/client/compute")
Invoke-Gate -Name "frontend typecheck" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @("tsc", "--noEmit")
Invoke-Gate -Name "desktop typecheck" -WorkingDirectory (Join-Path $Root "apps\desktop") -Executable $npm -Arguments @("run", "typecheck")
Invoke-Gate -Name "desktop rust tests" -WorkingDirectory $Root -Executable "cargo" -Arguments @("test", "--manifest-path", "apps\desktop\src-tauri\Cargo.toml")

if (-not $SkipLong) {
    Invoke-Gate -Name "frontend build" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npm -Arguments @("run", "build")
    Invoke-Gate -Name "desktop web build" -WorkingDirectory (Join-Path $Root "apps\desktop") -Executable $npm -Arguments @("run", "build")
}

if ($RunPostgresMigrationSmoke -or -not [string]::IsNullOrWhiteSpace($env:COMPUTE_API_DATABASE_URL)) {
    $previousDownSmoke = $env:COMPUTE_API_MIGRATION_DOWN_SMOKE
    $env:COMPUTE_API_MIGRATION_DOWN_SMOKE = "true"
    try {
        Invoke-Gate -Name "postgres migration up/down smoke" -WorkingDirectory (Join-Path $Root "apps\api") -Executable "go" -Arguments @("test", "./internal/compute", "-run", "TestPostgresMigrations(Up|Down)Smoke", "-count=1")
    }
    finally {
        $env:COMPUTE_API_MIGRATION_DOWN_SMOKE = $previousDownSmoke
    }
}

if ($Mode -eq "release") {
    $sidecarEvidencePath = Join-Path $EvidenceDir "packaged-sidecar-smoke.json"
    $sidecarArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "apps\desktop\scripts\smoke-packaged-sidecar.ps1"), "-RepoRoot", $Root, "-EvidencePath", $sidecarEvidencePath)
    if (-not [string]::IsNullOrWhiteSpace($SidecarPath)) {
        $sidecarArgs += @("-SidecarPath", $SidecarPath)
    }
    if ($AllowMissingPackageArtifacts) {
        $sidecarArgs += "-AllowMissing"
    }
    Invoke-Gate -Name "desktop packaged sidecar smoke" -WorkingDirectory $Root -Executable "powershell" -Arguments $sidecarArgs
    if ((Test-Path -LiteralPath $sidecarEvidencePath) -and ((Get-Content -Path $sidecarEvidencePath -Raw | ConvertFrom-Json).status -eq "skipped")) {
        $script:DryRunSkippedArtifacts = $true
    }

    $installerEvidencePath = Join-Path $EvidenceDir "nsis-installer-smoke.json"
    $installerArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Root "apps\desktop\scripts\smoke-nsis-installer.ps1"), "-RepoRoot", $Root, "-EvidencePath", $installerEvidencePath)
    if (-not [string]::IsNullOrWhiteSpace($InstallerPath)) {
        $installerArgs += @("-InstallerPath", $InstallerPath)
    }
    if ($AllowMissingPackageArtifacts) {
        $installerArgs += "-AllowMissing"
    }
    Invoke-Gate -Name "desktop nsis installer smoke" -WorkingDirectory $Root -Executable "powershell" -Arguments $installerArgs
    if ((Test-Path -LiteralPath $installerEvidencePath) -and ((Get-Content -Path $installerEvidencePath -Raw | ConvertFrom-Json).status -eq "skipped")) {
        $script:DryRunSkippedArtifacts = $true
    }
}

$report = [ordered]@{
    schema_version = "autowatersimu_next_release_gate_evidence.v1"
    mode = $Mode
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = if ($script:Failed) { "failed" } elseif ($script:DryRunSkippedArtifacts) { "dry_run_skipped_artifacts" } else { "passed" }
    allow_missing_package_artifacts = [bool]$AllowMissingPackageArtifacts
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "next-release-gates.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Release gate evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
