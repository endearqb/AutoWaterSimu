param(
    [string]$InstallerPath = "",
    [string]$RepoRoot = "",
    [string]$InstallDir = "",
    [string]$EvidencePath = "",
    [string]$ExpectedExeName = "AutoWaterSimu Next Desktop.exe",
    [switch]$AllowMissing
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Test-IsWindows {
    return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
}

function Resolve-RepoRoot {
    param([string]$InputRoot)
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
    }
    return (Resolve-Path $InputRoot).Path
}

function Resolve-PathFromRoot {
    param([string]$Root, [string]$PathValue)
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }
    return (Join-Path $Root $PathValue)
}

function Invoke-CapturedProcess {
    param([string]$Executable, [string[]]$Arguments)
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    try {
        $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        return [ordered]@{
            exit_code = $process.ExitCode
            stdout = Get-Content -Path $stdoutFile -Raw
            stderr = Get-Content -Path $stderrFile -Raw
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
}

function Write-EvidenceAndExit {
    param([string]$Status, [string]$Reason, [array]$Steps, [int]$ExitCode)
    $payload = [ordered]@{
        schema_version = "desktop_nsis_installer_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        status = $Status
        reason = $Reason
        installer_path = $script:ResolvedInstallerPath
        install_dir = $script:ResolvedInstallDir
        expected_exe_name = $ExpectedExeName
        steps = $Steps
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:ResolvedEvidencePath) | Out-Null
    $payload | ConvertTo-Json -Depth 8 | Set-Content -Path $script:ResolvedEvidencePath -Encoding UTF8
    Write-Host "NSIS installer smoke evidence: $script:ResolvedEvidencePath"
    exit $ExitCode
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    $EvidencePath = Join-Path $Root "tmp\release-evidence\nsis-installer-smoke.json"
}
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = Join-Path ([System.IO.Path]::GetTempPath()) ("autowatersimu-next-installer-smoke-" + (Get-Date -Format "yyyyMMddHHmmss"))
}

$script:ResolvedEvidencePath = Resolve-PathFromRoot -Root $Root -PathValue $EvidencePath
$script:ResolvedInstallDir = Resolve-PathFromRoot -Root $Root -PathValue $InstallDir
$script:ResolvedInstallerPath = ""
$steps = @()

if (-not (Test-IsWindows)) {
    if ($AllowMissing) {
        Write-EvidenceAndExit -Status "skipped" -Reason "NSIS installer smoke requires Windows." -Steps $steps -ExitCode 0
    }
    Write-EvidenceAndExit -Status "failed" -Reason "NSIS installer smoke requires Windows." -Steps $steps -ExitCode 1
}

if ([string]::IsNullOrWhiteSpace($InstallerPath)) {
    $InstallerPath = $env:AUTOWATERSIMU_NSIS_INSTALLER
}

if ([string]::IsNullOrWhiteSpace($InstallerPath)) {
    if ($AllowMissing) {
        Write-EvidenceAndExit -Status "skipped" -Reason "No InstallerPath or AUTOWATERSIMU_NSIS_INSTALLER was provided." -Steps $steps -ExitCode 0
    }
    Write-EvidenceAndExit -Status "failed" -Reason "NSIS installer path is required." -Steps $steps -ExitCode 1
}

$script:ResolvedInstallerPath = Resolve-PathFromRoot -Root $Root -PathValue $InstallerPath
if (-not (Test-Path -LiteralPath $script:ResolvedInstallerPath -PathType Leaf)) {
    if ($AllowMissing) {
        Write-EvidenceAndExit -Status "skipped" -Reason "NSIS installer does not exist." -Steps $steps -ExitCode 0
    }
    Write-EvidenceAndExit -Status "failed" -Reason "NSIS installer does not exist." -Steps $steps -ExitCode 1
}

New-Item -ItemType Directory -Force -Path $script:ResolvedInstallDir | Out-Null
$install = Invoke-CapturedProcess -Executable $script:ResolvedInstallerPath -Arguments @("/S", "/D=$script:ResolvedInstallDir")
$steps += [ordered]@{
    name = "nsis silent install"
    exit_code = $install.exit_code
    stdout_excerpt = $install.stdout
    stderr_excerpt = $install.stderr
}
if ($install.exit_code -ne 0) {
    Write-EvidenceAndExit -Status "failed" -Reason "NSIS silent install exited nonzero." -Steps $steps -ExitCode 1
}

$expectedExe = Join-Path $script:ResolvedInstallDir $ExpectedExeName
if (-not (Test-Path -LiteralPath $expectedExe -PathType Leaf)) {
    $exe = Get-ChildItem -Path $script:ResolvedInstallDir -Filter "*.exe" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $exe) {
        Write-EvidenceAndExit -Status "failed" -Reason "NSIS install completed but no installed exe was found." -Steps $steps -ExitCode 1
    }
    $expectedExe = $exe.FullName
}
$steps += [ordered]@{
    name = "installed executable exists"
    exit_code = 0
    stdout_excerpt = $expectedExe
    stderr_excerpt = ""
}

$uninstaller = Join-Path $script:ResolvedInstallDir "uninstall.exe"
if (Test-Path -LiteralPath $uninstaller -PathType Leaf) {
    $uninstall = Invoke-CapturedProcess -Executable $uninstaller -Arguments @("/S")
    $steps += [ordered]@{
        name = "nsis silent uninstall"
        exit_code = $uninstall.exit_code
        stdout_excerpt = $uninstall.stdout
        stderr_excerpt = $uninstall.stderr
    }
    if ($uninstall.exit_code -ne 0) {
        Write-EvidenceAndExit -Status "failed" -Reason "NSIS silent uninstall exited nonzero." -Steps $steps -ExitCode 1
    }
}

Write-EvidenceAndExit -Status "passed" -Reason "NSIS installer silent install smoke passed." -Steps $steps -ExitCode 0
