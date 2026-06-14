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

function Write-JsonFile {
    param(
        [object]$Value,
        [string]$Path
    )
    $json = $Value | ConvertTo-Json -Depth 100
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json, $encoding)
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
    param(
        [object]$Report,
        [string]$Path
    )
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# Performance Flag Matrix Phase 0") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("- Status: ``$($Report.status)``") | Out-Null
    $lines.Add("- Flags: ``$($Report.summary.flags)``") | Out-Null
    $lines.Add("- Matrix cases: ``$($Report.summary.matrix_cases)``") | Out-Null
    $lines.Add("- Hard violations: ``$($Report.summary.hard_violations)``") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("## Flags") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("| Flag | Current/default | Target | Runtime status | Exit condition |") | Out-Null
    $lines.Add("|---|---|---|---|---|") | Out-Null
    foreach ($flag in @($Report.flags)) {
        $lines.Add("| ``$($flag.id)`` | ``$($flag.default_value)`` | ``$($flag.target_value)`` | $($flag.runtime_status) | $($flag.exit_condition) |") | Out-Null
    }
    $lines.Add("") | Out-Null
    $lines.Add("## Matrix Cases") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("| Case | Runtime status | Purpose |") | Out-Null
    $lines.Add("|---|---|---|") | Out-Null
    foreach ($case in @($Report.matrix_cases)) {
        $lines.Add("| ``$($case.id)`` | $($case.runtime_status) | $($case.purpose) |") | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($lines -join "`n") + "`n", $encoding)
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$performanceFlags = @(
    [ordered]@{
        id = "UDM_EXPR_CACHE"
        owner = "simulation_core"
        default_value = "true"
        target_value = "true"
        runtime_status = "implemented_always_on_no_runtime_toggle"
        supported_values = @("true")
        exit_condition = "Keep cache always on while KPI-017 Phase 0 golden evidence passes; no runtime toggle is needed unless a regression requires a rollback PR."
        evidence = @("performance-golden-phase0 KPI-017 expression cache build-time micro evidence")
    },
    [ordered]@{
        id = "USE_UNIFIED_RHS"
        owner = "simulation_core"
        default_value = "false"
        target_value = "true"
        runtime_status = "planned_blocked_until_PR11"
        supported_values = @("false", "true")
        exit_condition = "Sunset false path only after PR-11 L3 goldens, correctness-freeze audit, and optional shadow comparison pass for mixed and single-model graphs."
        evidence = @("future PR-11 runtime flag tests", "performance-golden-phase0 L3 matrix")
    },
    [ordered]@{
        id = "UDM_EXPRESSION_ENGINE"
        owner = "simulation_core"
        default_value = "ast"
        target_value = "bytecode_or_model_codegen"
        runtime_status = "planned_optional_PR9_PR10_PR25"
        supported_values = @("ast", "bytecode", "model_codegen")
        exit_condition = "Keep ast as rollback until bytecode/model_codegen passes L1/L3 goldens and shows measured expression-bucket benefit; remove experimental engines if benefit is not material."
        evidence = @("future expression-engine benchmark", "performance-hotpath-prereview expression bucket")
    },
    [ordered]@{
        id = "CLAMP_STATE_IN_RHS"
        owner = "simulation_core"
        default_value = "decision_pending"
        target_value = "decision_value_from_PR12"
        runtime_status = "planned_blocked_until_PR12"
        supported_values = @("off", "on", "decision_pending")
        exit_condition = "Retire the flag after PR-12 records the output projection decision, default-branch current-state golden, and release compatibility note."
        evidence = @("performance-golden-phase0 default branch current-state golden", "correctness-freeze audit")
    },
    [ordered]@{
        id = "SOLVER_DEFAULT"
        owner = "simulation_core"
        default_value = "scipy_solver"
        target_value = "scipy_solver"
        runtime_status = "decision_closed_no_switch_ADR0016"
        supported_values = @("scipy_solver")
        exit_condition = "Do not introduce a solver-default switch without a new ADR, refreshed L3 goldens, compatibility notes, and rollout flag; current sunset is no action."
        evidence = @("ADR 0016", "performance-golden-phase0 solver matrix")
    },
    [ordered]@{
        id = "SHADOW_RHS_COMPARE"
        owner = "simulation_core"
        default_value = "false"
        target_value = "false"
        runtime_status = "planned_optional_PR11_rollout"
        supported_values = @("false", "true")
        exit_condition = "Remove shadow comparison after unified RHS is default for a defined soak window with no L3/correctness-freeze regressions."
        evidence = @("future PR-11 shadow comparison evidence")
    }
)

$supportingFlags = @(
    [ordered]@{
        id = "AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE"
        owner = "simulation_worker"
        default_value = "compat"
        target_value = "strict"
        runtime_status = "implemented_opt_in"
        supported_values = @("compat", "warn", "strict")
        exit_condition = "Switch default only after strict smoke remains green, stored-flow failures are attributed, and frontend/user-facing copy is updated."
        evidence = @("worker-adapter-strict-smoke")
    }
)

$matrixCases = @(
    [ordered]@{
        id = "default_current"
        runtime_status = "covered_by_current_gates"
        purpose = "Current production-compatible performance defaults."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "false"
            UDM_EXPRESSION_ENGINE = "ast"
            CLAMP_STATE_IN_RHS = "decision_pending"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("performance-baseline-phase0", "performance-golden-phase0", "performance-hotpath-prereview-phase0", "correctness-freeze audit")
    },
    [ordered]@{
        id = "target_future"
        runtime_status = "blocked_until_PR11_PR12_PR25"
        purpose = "Target matrix row after planned behavior-changing flags exist."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "true"
            UDM_EXPRESSION_ENGINE = "bytecode_or_model_codegen"
            CLAMP_STATE_IN_RHS = "decision_value_from_PR12"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("future PR-11/PR-12/PR-25 evidence")
    },
    [ordered]@{
        id = "flip_use_unified_rhs"
        runtime_status = "blocked_until_PR11"
        purpose = "One-factor flip for unified RHS."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "true"
            UDM_EXPRESSION_ENGINE = "ast"
            CLAMP_STATE_IN_RHS = "decision_pending"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("future PR-11 L3 and correctness-freeze evidence")
    },
    [ordered]@{
        id = "flip_udm_expression_engine"
        runtime_status = "blocked_until_PR9_PR10_PR25"
        purpose = "One-factor flip for the optional expression engine."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "false"
            UDM_EXPRESSION_ENGINE = "bytecode"
            CLAMP_STATE_IN_RHS = "decision_pending"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("future expression-engine L1/L3 evidence")
    },
    [ordered]@{
        id = "flip_clamp_state_in_rhs"
        runtime_status = "blocked_until_PR12"
        purpose = "One-factor flip for clamp/projection decision."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "false"
            UDM_EXPRESSION_ENGINE = "ast"
            CLAMP_STATE_IN_RHS = "on_or_off_from_PR12"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("future PR-12 default-branch golden and release note")
    },
    [ordered]@{
        id = "flip_solver_default_future_switch"
        runtime_status = "blocked_by_ADR0016_until_new_ADR"
        purpose = "Placeholder for a future solver-default switch; current target remains scipy_solver."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "false"
            UDM_EXPRESSION_ENGINE = "ast"
            CLAMP_STATE_IN_RHS = "decision_pending"
            SOLVER_DEFAULT = "future_solver_requires_new_ADR"
            SHADOW_RHS_COMPARE = "false"
        }
        evidence = @("ADR 0016")
    },
    [ordered]@{
        id = "flip_shadow_rhs_compare"
        runtime_status = "blocked_until_PR11"
        purpose = "One-factor flip for optional shadow comparison during unified RHS rollout."
        flag_values = [ordered]@{
            UDM_EXPR_CACHE = "true"
            USE_UNIFIED_RHS = "false"
            UDM_EXPRESSION_ENGINE = "ast"
            CLAMP_STATE_IN_RHS = "decision_pending"
            SOLVER_DEFAULT = "scipy_solver"
            SHADOW_RHS_COMPARE = "true"
        }
        evidence = @("future PR-11 shadow comparison evidence")
    },
    [ordered]@{
        id = "supporting_worker_adapter_strict"
        runtime_status = "covered_by_worker_adapter_strict_smoke"
        purpose = "Supporting rollout flag outside the v1.4 performance flag table."
        flag_values = [ordered]@{
            AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE = "strict"
        }
        evidence = @("worker-adapter-strict-smoke")
    }
)

$hardViolations = [System.Collections.Generic.List[object]]::new()
$performanceFlagIds = @($performanceFlags | ForEach-Object { [string]$_["id"] })
$allFlagIds = @($performanceFlags + $supportingFlags | ForEach-Object { [string]$_["id"] })
$matrixIdsByFlag = @{}
foreach ($flagId in $allFlagIds) {
    $matrixIdsByFlag[$flagId] = [System.Collections.Generic.List[string]]::new()
}

foreach ($flag in @($performanceFlags + $supportingFlags)) {
    foreach ($requiredKey in @("id", "default_value", "target_value", "runtime_status", "exit_condition")) {
        if (-not $flag.Contains($requiredKey) -or [string]::IsNullOrWhiteSpace([string]$flag[$requiredKey])) {
            Add-HardViolation -Violations $hardViolations -Rule "flag-metadata-incomplete" -Summary "Flag metadata is missing a required field." -Details $flag
        }
    }
}

foreach ($case in @($matrixCases)) {
    if (-not $case.Contains("flag_values") -or $null -eq $case["flag_values"]) {
        Add-HardViolation -Violations $hardViolations -Rule "matrix-case-missing-flag-values" -Summary "Matrix case has no flag_values map." -Details $case
        continue
    }
    foreach ($flagId in @($case["flag_values"].Keys)) {
        if ($allFlagIds -notcontains $flagId) {
            Add-HardViolation -Violations $hardViolations -Rule "matrix-case-unknown-flag" -Summary "Matrix case references an unknown flag." -Details ([ordered]@{ case_id = $case["id"]; flag_id = $flagId })
            continue
        }
        $matrixIdsByFlag[$flagId].Add([string]$case["id"]) | Out-Null
    }
}

$defaultCase = @($matrixCases | Where-Object { $_["id"] -eq "default_current" })[0]
foreach ($flagId in $performanceFlagIds) {
    if ($null -eq $defaultCase -or -not $defaultCase["flag_values"].Contains($flagId)) {
        Add-HardViolation -Violations $hardViolations -Rule "default-matrix-missing-performance-flag" -Summary "default_current matrix case must pin every performance flag." -Details ([ordered]@{ flag_id = $flagId })
    }
    if ($matrixIdsByFlag[$flagId].Count -eq 0) {
        Add-HardViolation -Violations $hardViolations -Rule "flag-missing-matrix-coverage" -Summary "Each flag must appear in at least one matrix case." -Details ([ordered]@{ flag_id = $flagId })
    }
}

$status = if ($hardViolations.Count -gt 0) { "failed" } else { "passed" }
$report = [ordered]@{
    schema_version = "autowatersimu_performance_flag_matrix_phase0.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    summary = [ordered]@{
        flags = $performanceFlags.Count + $supportingFlags.Count
        performance_flags = $performanceFlags.Count
        supporting_flags = $supportingFlags.Count
        matrix_cases = $matrixCases.Count
        hard_violations = $hardViolations.Count
        runtime_combo_execution = "blocked_until_planned_flags_are_implemented"
    }
    flags = @($performanceFlags + $supportingFlags)
    matrix_cases = @($matrixCases)
    hard_violations = @($hardViolations)
}

$evidencePath = Join-Path $EvidenceDir "performance-flag-matrix-phase0.json"
$markdownPath = Join-Path $EvidenceDir "performance-flag-matrix-phase0.md"
Write-JsonFile -Value $report -Path $evidencePath
Write-MarkdownReport -Report $report -Path $markdownPath

Write-Output "performance flag matrix phase0 status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "markdown: $markdownPath"
Write-Output "flags: $($report.summary.flags)"
Write-Output "matrix_cases: $($report.summary.matrix_cases)"
Write-Output "hard_violations: $($hardViolations.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
