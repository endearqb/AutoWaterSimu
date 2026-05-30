param(
    [string]$SidecarPath = "",
    [string]$RepoRoot = "",
    [string]$ArtifactDir = "",
    [string]$EvidencePath = "",
    [switch]$AllowMissing
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
        schema_version = "desktop_packaged_sidecar_smoke.v1"
        generated_at = (Get-Date).ToUniversalTime().ToString("o")
        status = $Status
        reason = $Reason
        sidecar_path = $script:ResolvedSidecarPath
        artifact_dir = $script:ResolvedArtifactDir
        steps = $Steps
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:ResolvedEvidencePath) | Out-Null
    $payload | ConvertTo-Json -Depth 8 | Set-Content -Path $script:ResolvedEvidencePath -Encoding UTF8
    Write-Host "Packaged sidecar smoke evidence: $script:ResolvedEvidencePath"
    exit $ExitCode
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    $EvidencePath = Join-Path $Root "tmp\release-evidence\packaged-sidecar-smoke.json"
}
if ([string]::IsNullOrWhiteSpace($ArtifactDir)) {
    $ArtifactDir = Join-Path $Root ("tmp\desktop-sidecar-smoke-artifacts\" + (Get-Date -Format "yyyyMMddHHmmss"))
}

$script:ResolvedEvidencePath = Resolve-PathFromRoot -Root $Root -PathValue $EvidencePath
$script:ResolvedArtifactDir = Resolve-PathFromRoot -Root $Root -PathValue $ArtifactDir
$script:ResolvedSidecarPath = ""
$steps = @()

if ([string]::IsNullOrWhiteSpace($SidecarPath)) {
    $SidecarPath = $env:AUTOWATERSIMU_PACKAGED_SIDECAR
}

if ([string]::IsNullOrWhiteSpace($SidecarPath)) {
    if ($AllowMissing) {
        Write-EvidenceAndExit -Status "skipped" -Reason "No SidecarPath or AUTOWATERSIMU_PACKAGED_SIDECAR was provided." -Steps $steps -ExitCode 0
    }
    Write-EvidenceAndExit -Status "failed" -Reason "Packaged sidecar path is required." -Steps $steps -ExitCode 1
}

$script:ResolvedSidecarPath = Resolve-PathFromRoot -Root $Root -PathValue $SidecarPath
if (-not (Test-Path -LiteralPath $script:ResolvedSidecarPath -PathType Leaf)) {
    if ($AllowMissing) {
        Write-EvidenceAndExit -Status "skipped" -Reason "Packaged sidecar does not exist." -Steps $steps -ExitCode 0
    }
    Write-EvidenceAndExit -Status "failed" -Reason "Packaged sidecar does not exist." -Steps $steps -ExitCode 1
}

New-Item -ItemType Directory -Force -Path $script:ResolvedArtifactDir | Out-Null
$fixture = Join-Path $Root "contracts\examples\valid\material_balance_minimal.compute_job.v1.json"

$selfCheck = Invoke-CapturedProcess -Executable $script:ResolvedSidecarPath -Arguments @("--self-check")
$steps += [ordered]@{
    name = "sidecar self-check"
    exit_code = $selfCheck.exit_code
    stdout_excerpt = $selfCheck.stdout
    stderr_excerpt = $selfCheck.stderr
}
if ($selfCheck.exit_code -ne 0) {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar self-check exited nonzero." -Steps $steps -ExitCode 1
}

try {
    $selfCheckJson = $selfCheck.stdout | ConvertFrom-Json
}
catch {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar self-check stdout is not JSON." -Steps $steps -ExitCode 1
}
if ($selfCheckJson.status -ne "ok") {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar self-check did not return status=ok." -Steps $steps -ExitCode 1
}

$runJob = Invoke-CapturedProcess -Executable $script:ResolvedSidecarPath -Arguments @("--run-job", $fixture, "--artifact-dir", $script:ResolvedArtifactDir)
$steps += [ordered]@{
    name = "sidecar minimal job"
    exit_code = $runJob.exit_code
    stdout_excerpt = if ($runJob.stdout.Length -gt 4000) { $runJob.stdout.Substring($runJob.stdout.Length - 4000) } else { $runJob.stdout }
    stderr_excerpt = $runJob.stderr
}
if ($runJob.exit_code -ne 0) {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar minimal job exited nonzero." -Steps $steps -ExitCode 1
}

try {
    $result = $runJob.stdout | ConvertFrom-Json
}
catch {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar minimal job stdout is not JSON." -Steps $steps -ExitCode 1
}
if ($result.status -ne "succeeded") {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar minimal job did not succeed." -Steps $steps -ExitCode 1
}

$artifact = @($result.artifacts)[0]
if ($null -eq $artifact) {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar minimal job produced no artifact metadata." -Steps $steps -ExitCode 1
}
$objectKey = [string]$artifact.object_key
$artifactRelative = $objectKey.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
$artifactPath = Join-Path $script:ResolvedArtifactDir $artifactRelative
if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
    Write-EvidenceAndExit -Status "failed" -Reason "Sidecar artifact metadata points to a missing file." -Steps $steps -ExitCode 1
}

Write-EvidenceAndExit -Status "passed" -Reason "Packaged sidecar self-check and minimal job passed." -Steps $steps -ExitCode 0
