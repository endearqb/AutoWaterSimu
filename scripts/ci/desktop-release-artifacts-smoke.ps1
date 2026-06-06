param(
    [string]$RepoRoot = "",
    [string]$OutputDir = "",
    [string]$EvidenceDir = "",
    [string]$ReleaseEvidenceDir = "",
    [switch]$ReuseExistingArtifacts,
    [switch]$RunLongReleaseGate
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
    if ((Test-IsWindows) -and ($Name -in @("powershell", "cargo"))) {
        if ($Name -eq "powershell") {
            return "powershell.exe"
        }
        return "$Name.exe"
    }
    return $Name
}

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
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

function Invoke-Step {
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

function Copy-RequiredFile {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Required artifact file was not found: $Source"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Write-JsonFile {
    param([string]$Path, [object]$Value)
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    $Value | ConvertTo-Json -Depth 10 | Set-Content -Path $Path -Encoding UTF8
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if (-not (Test-IsWindows)) {
    throw "Desktop release artifact smoke currently requires Windows packaged sidecar and NSIS artifacts."
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $Root "tmp\desktop-packaging\local-release-$timestamp"
}
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
    $OutputDir = Join-Path $Root $OutputDir
}
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)

if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
if (-not [System.IO.Path]::IsPathRooted($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root $EvidenceDir
}
$EvidenceDir = [System.IO.Path]::GetFullPath($EvidenceDir)

if ([string]::IsNullOrWhiteSpace($ReleaseEvidenceDir)) {
    $ReleaseEvidenceDir = Join-Path $Root "tmp\release-evidence"
}
if (-not [System.IO.Path]::IsPathRooted($ReleaseEvidenceDir)) {
    $ReleaseEvidenceDir = Join-Path $Root $ReleaseEvidenceDir
}
$ReleaseEvidenceDir = [System.IO.Path]::GetFullPath($ReleaseEvidenceDir)

New-Item -ItemType Directory -Force -Path $OutputDir, $EvidenceDir, $ReleaseEvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$script:FailureMessage = ""
$powershell = Resolve-NativeCommand -Name "powershell"
$cargo = Resolve-NativeCommand -Name "cargo"
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)
$originalPackagedWorkerExe = $env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE

$sidecarOutputDir = Join-Path $OutputDir "sidecar"
$installerOutputDir = Join-Path $OutputDir "nsis"
$artifactBundleDir = Join-Path $OutputDir "unsigned-release-artifacts"
$sidecarExe = ""
$sidecarDistDir = ""
$installerPath = ""
$sidecarManifestPath = Join-Path $sidecarOutputDir "packaged-sidecar-build.json"
$installerManifestPath = Join-Path $installerOutputDir "nsis-installer-build.json"
$sidecarSmokePath = Join-Path $sidecarOutputDir "packaged-sidecar-smoke.json"
$installerSmokePath = Join-Path $installerOutputDir "nsis-installer-smoke.json"
$installedSidecarSmokePath = Join-Path $installerOutputDir "installed-sidecar-smoke.json"

try {
    if ($ReuseExistingArtifacts -and (Test-Path -LiteralPath $sidecarManifestPath -PathType Leaf) -and (Test-Path -LiteralPath $sidecarSmokePath -PathType Leaf)) {
        $started = (Get-Date).ToUniversalTime().ToString("o")
        $sidecarSmoke = Get-Content -LiteralPath $sidecarSmokePath -Raw | ConvertFrom-Json
        if ($sidecarSmoke.status -ne "passed") {
            throw "Existing packaged sidecar smoke evidence did not pass; status=$($sidecarSmoke.status)"
        }
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        Add-Step -Name "reuse packaged sidecar artifacts" -Status "passed" -ExitCode 0 -Output "Reused $sidecarManifestPath and $sidecarSmokePath" -StartedAt $started -FinishedAt $finished
    }
    else {
        Invoke-Step -Name "build packaged sidecar and smoke" -WorkingDirectory $Root -Executable $powershell -Arguments @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "apps\desktop\packaging\build-packaged-sidecar.ps1",
            "-RepoRoot",
            $Root,
            "-OutputDir",
            $sidecarOutputDir
        ) | Out-Null
    }

    $sidecarManifest = Get-Content -LiteralPath $sidecarManifestPath -Raw | ConvertFrom-Json
    $sidecarExe = [string]$sidecarManifest.sidecar_executable
    $sidecarDistDir = [string]$sidecarManifest.dist_dir
    if ([string]::IsNullOrWhiteSpace($sidecarExe) -or -not (Test-Path -LiteralPath $sidecarExe -PathType Leaf)) {
        throw "Packaged sidecar manifest did not point to an executable artifact."
    }
    if ([string]::IsNullOrWhiteSpace($sidecarDistDir) -or -not (Test-Path -LiteralPath $sidecarDistDir -PathType Container)) {
        throw "Packaged sidecar manifest did not point to a distribution directory."
    }

    $env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE = $sidecarExe
    Invoke-Step -Name "desktop rust packaged worker runtime smoke" -WorkingDirectory $Root -Executable $cargo -Arguments @(
        "test",
        "--manifest-path",
        "apps\desktop\src-tauri\Cargo.toml",
        "packaged_worker_exe_smoke_when_env_is_available",
        "--",
        "--nocapture"
    ) | Out-Null

    if ($ReuseExistingArtifacts -and (Test-Path -LiteralPath $installerManifestPath -PathType Leaf) -and (Test-Path -LiteralPath $installerSmokePath -PathType Leaf) -and (Test-Path -LiteralPath $installedSidecarSmokePath -PathType Leaf)) {
        $started = (Get-Date).ToUniversalTime().ToString("o")
        $installerSmoke = Get-Content -LiteralPath $installerSmokePath -Raw | ConvertFrom-Json
        $installedSidecarSmoke = Get-Content -LiteralPath $installedSidecarSmokePath -Raw | ConvertFrom-Json
        if ($installerSmoke.status -ne "passed") {
            throw "Existing NSIS installer smoke evidence did not pass; status=$($installerSmoke.status)"
        }
        if ($installedSidecarSmoke.status -ne "passed") {
            throw "Existing installed sidecar smoke evidence did not pass; status=$($installedSidecarSmoke.status)"
        }
        $finished = (Get-Date).ToUniversalTime().ToString("o")
        Add-Step -Name "reuse nsis installer artifacts" -Status "passed" -ExitCode 0 -Output "Reused $installerManifestPath, $installerSmokePath, and $installedSidecarSmokePath" -StartedAt $started -FinishedAt $finished
    }
    else {
        Invoke-Step -Name "build nsis installer and smoke" -WorkingDirectory $Root -Executable $powershell -Arguments @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "apps\desktop\packaging\build-nsis-installer.ps1",
            "-RepoRoot",
            $Root,
            "-SidecarPath",
            $sidecarExe,
            "-EvidenceDir",
            $installerOutputDir
        ) | Out-Null
    }

    $installerManifest = Get-Content -LiteralPath $installerManifestPath -Raw | ConvertFrom-Json
    $installerPath = [string]$installerManifest.installer_path
    if ([string]::IsNullOrWhiteSpace($installerPath) -or -not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
        throw "NSIS installer manifest did not point to an installer artifact."
    }

    $releaseGateArgs = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\release\next-release-gates.ps1",
        "-Mode",
        "release",
        "-RepoRoot",
        $Root,
        "-EvidenceDir",
        $ReleaseEvidenceDir,
        "-SidecarPath",
        $sidecarExe,
        "-InstallerPath",
        $installerPath
    )
    if (-not $RunLongReleaseGate) {
        $releaseGateArgs += "-SkipLong"
    }
    Invoke-Step -Name "release gate with real desktop artifacts" -WorkingDirectory $Root -Executable $powershell -Arguments $releaseGateArgs | Out-Null

    New-Item -ItemType Directory -Force -Path $artifactBundleDir | Out-Null
    $artifactSidecarDir = Join-Path $artifactBundleDir "simulation-worker"
    if (Test-Path -LiteralPath $artifactSidecarDir) {
        Remove-Item -LiteralPath $artifactSidecarDir -Recurse -Force
    }
    Copy-Item -LiteralPath $sidecarDistDir -Destination $artifactSidecarDir -Recurse -Force
    Copy-RequiredFile -Source $sidecarManifestPath -Destination (Join-Path $artifactBundleDir "packaged-sidecar-build.json")
    Copy-RequiredFile -Source $sidecarSmokePath -Destination (Join-Path $artifactBundleDir "packaged-sidecar-smoke.json")
    Copy-RequiredFile -Source $installerManifestPath -Destination (Join-Path $artifactBundleDir "nsis-installer-build.json")
    Copy-RequiredFile -Source $installerSmokePath -Destination (Join-Path $artifactBundleDir "nsis-installer-smoke.json")
    Copy-RequiredFile -Source $installedSidecarSmokePath -Destination (Join-Path $artifactBundleDir "installed-sidecar-smoke.json")
    Copy-RequiredFile -Source $installerPath -Destination (Join-Path (Join-Path $artifactBundleDir "bundle\nsis") (Split-Path -Leaf $installerPath))

    Invoke-Step -Name "verify local unsigned release artifact bundle" -WorkingDirectory $Root -Executable $powershell -Arguments @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\release\verify-release-artifact-download.ps1",
        "-DownloadRoot",
        $artifactBundleDir,
        "-EvidenceDir",
        $ReleaseEvidenceDir,
        "-ArtifactName",
        "local-next-desktop-unsigned-release-artifacts"
    ) | Out-Null
}
catch {
    $script:Failed = $true
    $script:FailureMessage = $_.Exception.Message
}
finally {
    $env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE = $originalPackagedWorkerExe
    $statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
    $statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
    $trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
    $untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)

    $report = [ordered]@{
        schema_version = "autowatersimu_next_desktop_release_artifacts_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        repo_root = $Root
        commit_sha = $commitSha
        branch = $branchName
        status = if ($script:Failed) { "failed" } else { "passed" }
        failure_message = $script:FailureMessage
        output_dir = $OutputDir
        evidence_dir = $EvidenceDir
        release_evidence_dir = $ReleaseEvidenceDir
        sidecar_executable = $sidecarExe
        sidecar_dist_dir = $sidecarDistDir
        installer_path = $installerPath
        local_unsigned_artifact_bundle = $artifactBundleDir
        reuse_existing_artifacts = [bool]$ReuseExistingArtifacts
        release_gate_evidence = Join-Path $ReleaseEvidenceDir "next-release-gates.json"
        downloaded_artifact_evidence = Join-Path $ReleaseEvidenceDir "downloaded-release-artifacts.json"
        coverage_summary = [ordered]@{
            packaged_worker_pyinstaller_build = "covered_by_build_packaged_sidecar"
            packaged_worker_cli_smoke = "covered_by_packaged_sidecar_smoke"
            desktop_runtime_packaged_worker_mode = "covered_by_rust_packaged_worker_runtime_smoke"
            nsis_installer_build = "covered_by_build_nsis_installer"
            nsis_silent_install = "covered_by_nsis_installer_smoke"
            installed_packaged_sidecar_smoke = "covered_by_installer_smoke"
            release_gate_with_real_artifacts = "covered_by_next_release_gates_mode_release"
            local_unsigned_artifact_bundle_verification = "covered_by_verify_release_artifact_download"
            github_workflow_upload_download_round_trip = "not_covered_requires_hosted_workflow"
            signing_or_auto_update = "not_covered_post_p0"
        }
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
    $evidencePath = Join-Path $EvidenceDir "desktop-release-artifacts-smoke.json"
    Write-JsonFile -Path $evidencePath -Value $report
    Write-Host "Desktop release artifacts smoke evidence: $evidencePath"
}

if ($script:Failed) {
    exit 1
}
