param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [switch]$FailOnOpenGaps
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

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\architecture-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$checks = [System.Collections.Generic.List[object]]::new()
$openGaps = [System.Collections.Generic.List[object]]::new()
$hardViolations = [System.Collections.Generic.List[object]]::new()

$corePath = Join-Path $Root "simulation_core\python\autowatersimu_simulation_core\material_balance\core.py"
$testPath = Join-Path $Root "simulation_core\tests\test_material_balance_core_boundary.py"
if (-not (Test-Path -LiteralPath $corePath)) {
    $hardViolations.Add([ordered]@{ rule = "simulation-core-core-py-missing"; path = $corePath }) | Out-Null
}
if (-not (Test-Path -LiteralPath $testPath)) {
    $hardViolations.Add([ordered]@{ rule = "simulation-core-boundary-tests-missing"; path = $testPath }) | Out-Null
}

$coreText = if (Test-Path -LiteralPath $corePath) { Get-Content -LiteralPath $corePath -Raw } else { "" }
$testText = if (Test-Path -LiteralPath $testPath) { Get-Content -LiteralPath $testPath -Raw } else { "" }

$branchOrderPattern = 'if\s+asm1slim_params\s+is\s+not\s+None\s+and\s+asm1slim_mask\.any\(\):[\s\S]*?elif\s+asm1_params\s+is\s+not\s+None\s+and\s+asm1_mask\.any\(\):[\s\S]*?elif\s+asm3_params\s+is\s+not\s+None\s+and\s+asm3_mask\.any\(\):[\s\S]*?elif\s+udm_mask\s+is\s+not\s+None\s+and\s+udm_mask\.any\(\)\s+and\s+udm_runtime_payload:[\s\S]*?else:'
$hasExpectedBranchOrder = $coreText -match $branchOrderPattern
$branchOrderDetails = [ordered]@{
    file = ConvertTo-RepoRelativePath -Root $Root -Path $corePath
    expected_order = @("asm1slim", "asm1", "asm3", "udm", "default")
    mutual_exclusive_order_detected = $hasExpectedBranchOrder
}
if ($hasExpectedBranchOrder) {
    Add-Check -Checks $checks -Name "run_hours branch precedence source shape" -Status "passed" -Summary "_run_hours keeps the current mutually exclusive model branch order." -Details $branchOrderDetails
}
else {
    Add-Check -Checks $checks -Name "run_hours branch precedence source shape" -Status "gap" -Summary "_run_hours branch order is not recognized by the correctness freeze audit." -Details $branchOrderDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-run-hours-branch-order-unfrozen" -Severity "high" -Summary "Freeze or intentionally update _run_hours mixed-model branch precedence before performance work." -Evidence $branchOrderDetails
}

$activeClampMatches = [regex]::Matches($coreText, '(?m)^\s*x\s*=\s*torch\.clamp\(x,\s*min=0\)')
$defaultCommentedClamp = $coreText -match '(?m)^\s*#\s*x\s*=\s*torch\.clamp\(x,\s*min=0\)'
$clampDetails = [ordered]@{
    file = ConvertTo-RepoRelativePath -Root $Root -Path $corePath
    active_run_hours_clamp_count = $activeClampMatches.Count
    default_branch_commented_clamp_detected = $defaultCommentedClamp
}
if ($activeClampMatches.Count -ge 4 -and $defaultCommentedClamp) {
    Add-Check -Checks $checks -Name "run_hours clamp policy source shape" -Status "passed" -Summary "ASM/UDM branches clamp solver output while the default branch keeps the current commented clamp state." -Details $clampDetails
}
else {
    Add-Check -Checks $checks -Name "run_hours clamp policy source shape" -Status "gap" -Summary "_run_hours clamp policy source shape is not fully frozen by audit." -Details $clampDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-run-hours-clamp-policy-unfrozen" -Severity "medium" -Summary "Freeze or intentionally update branch clamp behavior before performance work." -Evidence $clampDetails
}

$requiredTests = @(
    "test_run_hours_uses_first_available_model_branch_order",
    "test_run_hours_current_branch_precedence_and_clamp_policy",
    "test_ode_balance_respects_compute_mask_for_state_and_volume_derivatives"
)
$missingTests = @($requiredTests | Where-Object { $testText -notmatch [regex]::Escape($_) })
$testDetails = [ordered]@{
    file = ConvertTo-RepoRelativePath -Root $Root -Path $testPath
    required_tests = $requiredTests
    missing_tests = $missingTests
}
if ($missingTests.Count -eq 0) {
    Add-Check -Checks $checks -Name "simulation_core correctness freeze tests" -Status "passed" -Summary "Core-only tests freeze branch precedence, clamp policy, and compute_mask behavior." -Details $testDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_core correctness freeze tests" -Status "gap" -Summary "Required correctness freeze tests are missing." -Details $testDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-correctness-freeze-tests-missing" -Severity "high" -Summary "Add core-only correctness freeze tests before performance work." -Evidence $testDetails
}

$status = "passed"
if ($hardViolations.Count -gt 0) {
    $status = "failed"
}
elseif ($openGaps.Count -gt 0) {
    $status = "partial"
}

$report = [ordered]@{
    schema_version = "autowatersimu_simulation_core_correctness_freeze_audit.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    fail_on_open_gaps = [bool]$FailOnOpenGaps
    summary = [ordered]@{
        checks = $checks.Count
        hard_violations = $hardViolations.Count
        open_gaps = $openGaps.Count
    }
    hard_violations = @($hardViolations)
    open_gaps = @($openGaps)
    checks = @($checks)
    next_recommended_slice = @(
        "Keep the current _run_hours branch precedence and clamp freeze green before hot-path optimization.",
        "Use an explicit correctness decision before changing mixed ASM/UDM branch semantics.",
        "Keep backend/core parity drift guard green until backend thin-shell migration."
    )
}

$evidencePath = Join-Path $EvidenceDir "simulation-core-correctness-freeze.json"
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

Write-Output "simulation_core correctness freeze audit status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "hard_violations: $($hardViolations.Count)"
Write-Output "open_gaps: $($openGaps.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
if ($FailOnOpenGaps -and $openGaps.Count -gt 0) {
    exit 1
}
