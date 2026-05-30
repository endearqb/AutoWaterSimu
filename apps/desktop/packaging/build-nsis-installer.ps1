param(
    [string]$RepoRoot = "",
    [string]$SidecarPath = "",
    [string]$SidecarDistDir = "",
    [string]$StagingDir = "",
    [string]$EvidenceDir = "",
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedSidecarExeName = "simulation-worker-x86_64-pc-windows-msvc.exe"

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
        return [System.IO.Path]::GetFullPath($PathValue)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Root $PathValue))
}

function Resolve-NativeCommand {
    param([string]$Name)
    if ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
        if ($Name -eq "npm") {
            return "npm.cmd"
        }
        if ($Name -eq "powershell") {
            return "powershell.exe"
        }
    }
    return $Name
}

function Assert-PathInside {
    param([string]$Parent, [string]$Child, [string]$Label)
    $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $childFull = [System.IO.Path]::GetFullPath($Child).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must stay under $parentFull, got $childFull"
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
$DesktopDir = Join-Path $Root "apps\desktop"
$TauriDir = Join-Path $DesktopDir "src-tauri"
$DefaultStageRoot = Join-Path $TauriDir "target\release-sidecar"

if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root ("tmp\desktop-packaging\nsis-" + (Get-Date -Format "yyyyMMddHHmmss"))
}
$EvidenceDir = Resolve-PathFromRoot -Root $Root -PathValue $EvidenceDir
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

if ([string]::IsNullOrWhiteSpace($SidecarPath)) {
    $SidecarPath = $env:AUTOWATERSIMU_PACKAGED_SIDECAR
}
if ([string]::IsNullOrWhiteSpace($SidecarDistDir)) {
    if ([string]::IsNullOrWhiteSpace($SidecarPath)) {
        throw "SidecarPath, SidecarDistDir, or AUTOWATERSIMU_PACKAGED_SIDECAR is required."
    }
    $SidecarPath = Resolve-PathFromRoot -Root $Root -PathValue $SidecarPath
    if (-not (Test-Path -LiteralPath $SidecarPath -PathType Leaf)) {
        throw "SidecarPath does not exist: $SidecarPath"
    }
    $SidecarDistDir = Split-Path -Parent $SidecarPath
}
else {
    $SidecarDistDir = Resolve-PathFromRoot -Root $Root -PathValue $SidecarDistDir
    if ([string]::IsNullOrWhiteSpace($SidecarPath)) {
        $SidecarPath = Join-Path $SidecarDistDir $ExpectedSidecarExeName
    }
    else {
        $SidecarPath = Resolve-PathFromRoot -Root $Root -PathValue $SidecarPath
    }
}

if (-not (Test-Path -LiteralPath $SidecarDistDir -PathType Container)) {
    throw "SidecarDistDir does not exist: $SidecarDistDir"
}
if (-not (Test-Path -LiteralPath $SidecarPath -PathType Leaf)) {
    throw "Expected packaged sidecar executable was not found: $SidecarPath"
}

if ([string]::IsNullOrWhiteSpace($StagingDir)) {
    $StagingDir = $DefaultStageRoot
}
$StagingDir = Resolve-PathFromRoot -Root $Root -PathValue $StagingDir
Assert-PathInside -Parent (Join-Path $TauriDir "target") -Child $StagingDir -Label "StagingDir"
$StageBundleDir = Join-Path $StagingDir "simulation-worker"

if (Test-Path -LiteralPath $StageBundleDir) {
    Assert-PathInside -Parent $StagingDir -Child $StageBundleDir -Label "StageBundleDir"
    Remove-Item -LiteralPath $StageBundleDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $StageBundleDir | Out-Null
Get-ChildItem -LiteralPath $SidecarDistDir -Force | Copy-Item -Destination $StageBundleDir -Recurse -Force

$StagedSidecarExe = Join-Path $StageBundleDir $ExpectedSidecarExeName
if (-not (Test-Path -LiteralPath $StagedSidecarExe -PathType Leaf)) {
    throw "Staged packaged sidecar executable was not found: $StagedSidecarExe"
}

$npm = Resolve-NativeCommand -Name "npm"
$tauriArgs = @(
    "run", "tauri", "--",
    "build",
    "--bundles", "nsis",
    "--config", "src-tauri/tauri.release.conf.json",
    "--ci",
    "--no-sign"
)

Push-Location $DesktopDir
try {
    & $npm @tauriArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri NSIS build failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

$NsisBundleDir = Join-Path $TauriDir "target\release\bundle\nsis"
$Installer = Get-ChildItem -Path $NsisBundleDir -Filter "*.exe" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
if ($null -eq $Installer) {
    throw "No NSIS installer was found under $NsisBundleDir"
}

$SmokeEvidencePath = Join-Path $EvidenceDir "nsis-installer-smoke.json"
if (-not $SkipSmoke) {
    & (Resolve-NativeCommand -Name "powershell") -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "apps\desktop\scripts\smoke-nsis-installer.ps1") -RepoRoot $Root -InstallerPath $Installer.FullName -EvidencePath $SmokeEvidencePath
    if ($LASTEXITCODE -ne 0) {
        throw "NSIS installer smoke failed with exit code $LASTEXITCODE"
    }
}

$ManifestPath = Join-Path $EvidenceDir "nsis-installer-build.json"
$Manifest = [ordered]@{
    schema_version = "desktop_nsis_installer_build.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    sidecar_source_dir = $SidecarDistDir
    sidecar_executable = $SidecarPath
    staged_sidecar_dir = $StageBundleDir
    tauri_config = Join-Path $TauriDir "tauri.release.conf.json"
    installer_path = $Installer.FullName
    smoke_evidence = if ($SkipSmoke) { $null } else { $SmokeEvidencePath }
}
$Manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "NSIS installer manifest: $ManifestPath"
Write-Host "NSIS installer executable: $($Installer.FullName)"
