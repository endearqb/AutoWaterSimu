param(
    [string]$RepoRoot = "",
    [string]$OutputDir = "",
    [string]$TargetTriple = "x86_64-pc-windows-msvc",
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    param([string]$InputRoot)
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
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
    if ((Test-IsWindows) -and ($Name -in @("uv", "powershell"))) {
        return "$Name.exe"
    }
    return $Name
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if (-not (Test-IsWindows)) {
    throw "Desktop packaged sidecar build currently supports Windows PyInstaller artifacts only."
}
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $Root ("tmp\desktop-packaging\sidecar-" + (Get-Date -Format "yyyyMMddHHmmss"))
}
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $Root $OutputDir
}

$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$distPath = Join-Path $OutputDir "dist"
$buildPath = Join-Path $OutputDir "build"
$specPath = Join-Path $OutputDir "spec"
$manifestPath = Join-Path $OutputDir "packaged-sidecar-build.json"
New-Item -ItemType Directory -Force -Path $OutputDir, $distPath, $buildPath, $specPath | Out-Null

$dataSeparator = if (Test-IsWindows) { ";" } else { ":" }
$entryPoint = Join-Path $Root "apps\desktop\packaging\pyinstaller_entrypoint.py"
$contractsData = (Join-Path $Root "contracts") + $dataSeparator + "contracts"
$uv = Resolve-NativeCommand -Name "uv"

$pyinstallerArgs = @(
    "run",
    "--project", (Join-Path $Root "backend"),
    "--with", "pyinstaller",
    "pyinstaller",
    "--noconfirm",
    "--clean",
    "--onedir",
    "--name", "simulation-worker",
    "--distpath", $distPath,
    "--workpath", $buildPath,
    "--specpath", $specPath,
    "--paths", (Join-Path $Root "services\simulation-worker"),
    "--paths", (Join-Path $Root "simulation_core\python"),
    "--paths", (Join-Path $Root "contracts\python"),
    "--add-data", $contractsData,
    "--collect-submodules", "autowatersimu_simulation_core",
    "--collect-submodules", "autowatersimu_contracts",
    "--hidden-import", "simulation_worker.api_client",
    "--hidden-import", "simulation_worker.runner",
    $entryPoint
)

& $uv @pyinstallerArgs
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller sidecar build failed with exit code $LASTEXITCODE"
}

$bundleDir = Join-Path $distPath "simulation-worker"
$sourceExe = Join-Path $bundleDir "simulation-worker.exe"
$targetExeName = "simulation-worker-$TargetTriple.exe"
if (-not (Test-Path -LiteralPath $sourceExe -PathType Leaf)) {
    throw "Expected PyInstaller executable was not found: $sourceExe"
}
$targetExe = Join-Path $bundleDir $targetExeName
Move-Item -LiteralPath $sourceExe -Destination $targetExe -Force

$manifest = [ordered]@{
    schema_version = "desktop_packaged_sidecar_build.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    packaging_tool = "pyinstaller"
    packaging_mode = "onedir"
    target_triple = $TargetTriple
    dist_dir = $bundleDir
    sidecar_executable = $targetExe
    smoke_evidence = if ($SkipSmoke) { $null } else { Join-Path $OutputDir "packaged-sidecar-smoke.json" }
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8

if (-not $SkipSmoke) {
    & (Resolve-NativeCommand -Name "powershell") -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "apps\desktop\scripts\smoke-packaged-sidecar.ps1") -RepoRoot $Root -SidecarPath $targetExe -EvidencePath (Join-Path $OutputDir "packaged-sidecar-smoke.json")
    if ($LASTEXITCODE -ne 0) {
        throw "Packaged sidecar smoke failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Packaged sidecar manifest: $manifestPath"
Write-Host "Packaged sidecar executable: $targetExe"
