param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$OutputDir = "",
    [string]$SidecarPath = "",
    [switch]$ReuseExistingSidecar
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

function Resolve-PathFromRoot {
    param([string]$Root, [string]$PathValue)
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Root $PathValue))
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

function Write-MarkdownReport {
    param([string]$Path, [object]$Report)
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# Worker packaged no-fallback smoke") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("- Status: ``$($Report.status)``") | Out-Null
    $lines.Add("- Sidecar executable: ``$($Report.sidecar_executable)``") | Out-Null
    $lines.Add("- Build mode: ``$($Report.build_mode)``") | Out-Null
    $lines.Add("- Deprecated repo-path fallback used: ``$($Report.summary.deprecated_repo_path_fallback_used)``") | Out-Null
    $lines.Add("- Hard violations: ``$($Report.summary.hard_violations)``") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("## Steps") | Out-Null
    foreach ($step in @($Report.steps)) {
        $lines.Add("- ``$($step.name)``: ``$($step.status)``") | Out-Null
    }
    $lines -join "`n" | Set-Content -LiteralPath $Path -Encoding UTF8
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $Root ("tmp\worker-packaged-no-fallback-smoke\" + (Get-Date -Format "yyyyMMddHHmmss"))
}
$EvidenceDir = Resolve-PathFromRoot -Root $Root -PathValue $EvidenceDir
$OutputDir = Resolve-PathFromRoot -Root $Root -PathValue $OutputDir
New-Item -ItemType Directory -Force -Path $EvidenceDir, $OutputDir | Out-Null

$steps = [System.Collections.Generic.List[object]]::new()
$hardViolations = [System.Collections.Generic.List[object]]::new()
$buildMode = "build"
$resolvedSidecarPath = ""
$buildManifestPath = Join-Path $OutputDir "packaged-sidecar-build.json"
$sidecarEvidencePath = Join-Path $OutputDir "packaged-sidecar-smoke.json"
$artifactDir = Join-Path $OutputDir "artifacts"

try {
    if (-not [string]::IsNullOrWhiteSpace($SidecarPath)) {
        $buildMode = "provided-sidecar"
        $resolvedSidecarPath = Resolve-PathFromRoot -Root $Root -PathValue $SidecarPath
    }
    elseif ($ReuseExistingSidecar -and -not [string]::IsNullOrWhiteSpace($env:AUTOWATERSIMU_PACKAGED_SIDECAR)) {
        $buildMode = "env-sidecar"
        $resolvedSidecarPath = Resolve-PathFromRoot -Root $Root -PathValue $env:AUTOWATERSIMU_PACKAGED_SIDECAR
    }
    else {
        $buildMode = "built-sidecar"
        & (Join-Path $Root "apps\desktop\packaging\build-packaged-sidecar.ps1") `
            -RepoRoot $Root `
            -OutputDir $OutputDir `
            -SkipSmoke
        if ($LASTEXITCODE -ne 0) {
            throw "Packaged sidecar build failed with exit code $LASTEXITCODE"
        }
        if (-not (Test-Path -LiteralPath $buildManifestPath -PathType Leaf)) {
            throw "Packaged sidecar build manifest was not written: $buildManifestPath"
        }
        $buildManifest = Get-Content -LiteralPath $buildManifestPath -Raw | ConvertFrom-Json
        $resolvedSidecarPath = [string]$buildManifest.sidecar_executable
    }
    $steps.Add([ordered]@{
        name = "resolve packaged sidecar"
        status = "passed"
        build_mode = $buildMode
        sidecar_executable = $resolvedSidecarPath
        build_manifest = if (Test-Path -LiteralPath $buildManifestPath) { $buildManifestPath } else { $null }
    }) | Out-Null

    if (-not (Test-Path -LiteralPath $resolvedSidecarPath -PathType Leaf)) {
        throw "Packaged sidecar executable does not exist: $resolvedSidecarPath"
    }

    & (Join-Path $Root "apps\desktop\scripts\smoke-packaged-sidecar.ps1") `
        -RepoRoot $Root `
        -SidecarPath $resolvedSidecarPath `
        -ArtifactDir $artifactDir `
        -EvidencePath $sidecarEvidencePath
    if ($LASTEXITCODE -ne 0) {
        throw "Packaged sidecar smoke failed with exit code $LASTEXITCODE"
    }
    if (-not (Test-Path -LiteralPath $sidecarEvidencePath -PathType Leaf)) {
        throw "Packaged sidecar smoke evidence was not written: $sidecarEvidencePath"
    }
    $sidecarEvidence = Get-Content -LiteralPath $sidecarEvidencePath -Raw | ConvertFrom-Json
    $fallbackGate = @($sidecarEvidence.steps | Where-Object { $_.name -eq "sidecar fallback unused gate" })[0]
    $fallbackUsed = if ($null -ne $fallbackGate) { [bool]$fallbackGate.deprecated_repo_path_fallback_used } else { $true }
    $steps.Add([ordered]@{
        name = "packaged sidecar smoke"
        status = $sidecarEvidence.status
        evidence = $sidecarEvidencePath
        deprecated_repo_path_fallback_used = $fallbackUsed
    }) | Out-Null
    if ($sidecarEvidence.status -ne "passed") {
        Add-HardViolation -Violations $hardViolations -Rule "packaged-sidecar-smoke-must-pass" -Summary "Packaged sidecar smoke did not pass." -Details $sidecarEvidence
    }
    if ($fallbackUsed) {
        Add-HardViolation -Violations $hardViolations -Rule "packaged-sidecar-fallback-must-be-unused" -Summary "Packaged sidecar self-check used deprecated repo-path fallback." -Details $fallbackGate
    }
}
catch {
    $steps.Add([ordered]@{
        name = "worker packaged no-fallback smoke"
        status = "failed"
        error = $_.Exception.Message
    }) | Out-Null
    Add-HardViolation -Violations $hardViolations -Rule "worker-packaged-no-fallback-smoke-failed" -Summary $_.Exception.Message -Details ([ordered]@{
        build_mode = $buildMode
        sidecar_executable = $resolvedSidecarPath
        build_manifest = $buildManifestPath
        sidecar_evidence = $sidecarEvidencePath
    })
}

$fallbackUsedSummary = $false
$smokeStep = @($steps | Where-Object { $_.name -eq "packaged sidecar smoke" })[0]
if ($null -ne $smokeStep) {
    $fallbackUsedSummary = [bool]$smokeStep.deprecated_repo_path_fallback_used
}
elseif ($hardViolations.Count -gt 0) {
    $fallbackUsedSummary = $null
}

$status = if ($hardViolations.Count -eq 0) { "passed" } else { "failed" }
$report = [ordered]@{
    schema_version = "autowatersimu_worker_packaged_no_fallback_smoke.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    build_mode = $buildMode
    sidecar_executable = $resolvedSidecarPath
    build_manifest = if (Test-Path -LiteralPath $buildManifestPath) { $buildManifestPath } else { $null }
    sidecar_smoke_evidence = if (Test-Path -LiteralPath $sidecarEvidencePath) { $sidecarEvidencePath } else { $null }
    summary = [ordered]@{
        hard_violations = $hardViolations.Count
        deprecated_repo_path_fallback_used = $fallbackUsedSummary
    }
    hard_violations = @($hardViolations)
    steps = @($steps)
    next_recommended_slice = @(
        "Keep source-mode and packaged-sidecar fallback-unused evidence separate; remove deprecated repo-path fallback only in a later PR after this packaged evidence stays green."
    )
}

$evidencePath = Join-Path $EvidenceDir "worker-packaged-no-fallback-smoke.json"
$markdownPath = Join-Path $EvidenceDir "worker-packaged-no-fallback-smoke.md"
$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $evidencePath -Encoding UTF8
Write-MarkdownReport -Path $markdownPath -Report $report

Write-Output "worker packaged no-fallback smoke status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "deprecated_repo_path_fallback_used: $fallbackUsedSummary"
Write-Output "hard_violations: $($hardViolations.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
