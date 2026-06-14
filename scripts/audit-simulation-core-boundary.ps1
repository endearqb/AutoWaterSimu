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

function Get-PythonFiles {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }
    return @(
        Get-ChildItem -LiteralPath $Path -Recurse -File -Filter "*.py" |
            Where-Object { $_.FullName -notmatch '[\\/]__pycache__[\\/]' } |
            Sort-Object FullName
    )
}

function Find-PatternHits {
    param(
        [string]$Root,
        [object[]]$Files,
        [string]$Pattern,
        [string]$Rule
    )
    $hits = [System.Collections.Generic.List[object]]::new()
    foreach ($file in @($Files)) {
        $lines = [System.IO.File]::ReadAllLines($file.FullName)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = [string]$lines[$i]
            if ($line -match $Pattern) {
                $hits.Add([ordered]@{
                    rule = $Rule
                    file = ConvertTo-RepoRelativePath -Root $Root -Path $file.FullName
                    line = $i + 1
                    text = $line.Trim()
                }) | Out-Null
            }
        }
    }
    return @($hits)
}

function Find-PatternHitsWithPythonFunction {
    param(
        [string]$Root,
        [object[]]$Files,
        [string]$Pattern,
        [string]$Rule
    )
    $hits = [System.Collections.Generic.List[object]]::new()
    foreach ($file in @($Files)) {
        $lines = [System.IO.File]::ReadAllLines($file.FullName)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = [string]$lines[$i]
            if ($line -notmatch $Pattern) {
                continue
            }
            $functionName = ""
            for ($j = $i; $j -ge 0; $j--) {
                $candidate = [string]$lines[$j]
                if ($candidate -match '^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(') {
                    $functionName = $Matches[1]
                    break
                }
            }
            $hits.Add([ordered]@{
                rule = $Rule
                file = ConvertTo-RepoRelativePath -Root $Root -Path $file.FullName
                line = $i + 1
                function = $functionName
                text = $line.Trim()
            }) | Out-Null
        }
    }
    return @($hits)
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

function Invoke-CoreOnlyImportSmoke {
    param(
        [string]$Root,
        [string]$CorePythonPath,
        [string]$Python
    )
    $previousPythonPath = $env:PYTHONPATH
    $previousLocation = Get-Location
    $code = "import json, sys; import autowatersimu_simulation_core as core; from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator; print(json.dumps({'version': getattr(core, '__version__', ''), 'calculator': MaterialBalanceCalculator.__name__, 'pythonpath_head': sys.path[:3]}))"
    try {
        $env:PYTHONPATH = $CorePythonPath
        Set-Location $Root
        $output = & $Python -c $code 2>&1
        $exitCode = $LASTEXITCODE
        $outputText = (@($output) | ForEach-Object { [string]$_ }) -join "`n"
        return [ordered]@{
            status = if ($exitCode -eq 0) { "passed" } else { "failed" }
            exit_code = $exitCode
            output = $outputText.Trim()
            python = $Python
            pythonpath = $CorePythonPath
        }
    }
    catch {
        return [ordered]@{
            status = "failed"
            exit_code = 1
            output = $_.Exception.Message
            python = $Python
            pythonpath = $CorePythonPath
        }
    }
    finally {
        if ($null -eq $previousPythonPath) {
            Remove-Item Env:\PYTHONPATH -ErrorAction SilentlyContinue
        }
        else {
            $env:PYTHONPATH = $previousPythonPath
        }
        Set-Location $previousLocation
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\architecture-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$checks = [System.Collections.Generic.List[object]]::new()
$openGaps = [System.Collections.Generic.List[object]]::new()
$hardViolations = [System.Collections.Generic.List[object]]::new()

$simulationCorePython = Join-Path $Root "simulation_core\python"
$contractsPython = Join-Path $Root "contracts\python"
$corePackage = Join-Path $simulationCorePython "autowatersimu_simulation_core"
$workerRuntime = Join-Path $Root "services\simulation-worker\simulation_worker"
$coreTests = Join-Path $Root "simulation_core\tests"
$workerTests = Join-Path $Root "services\simulation-worker\tests"
$backendMaterialBalance = Join-Path $Root "backend\app\material_balance"
$backendPyproject = Join-Path $Root "backend\pyproject.toml"

$corePyproject = Join-Path $simulationCorePython "pyproject.toml"
$coreSetup = Join-Path $simulationCorePython "setup.py"
$corePackagingPresent = (Test-Path -LiteralPath $corePyproject) -or (Test-Path -LiteralPath $coreSetup)
if ($corePackagingPresent) {
    Add-Check -Checks $checks -Name "simulation_core packaging metadata" -Status "passed" -Summary "simulation_core/python has packaging metadata." -Details ([ordered]@{
        pyproject = Test-Path -LiteralPath $corePyproject
        setup_py = Test-Path -LiteralPath $coreSetup
    })
}
else {
    $details = [ordered]@{
        expected = @("simulation_core/python/pyproject.toml", "simulation_core/python/setup.py")
        found = @()
    }
    Add-Check -Checks $checks -Name "simulation_core packaging metadata" -Status "gap" -Summary "simulation_core/python has no pyproject.toml or setup.py." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-python-packaging-metadata-missing" -Severity "high" -Summary "simulation_core/python is not installable as a package yet." -Evidence $details
}

$contractsPyproject = Join-Path $contractsPython "pyproject.toml"
$contractsSetup = Join-Path $contractsPython "setup.py"
$contractsPackagingPresent = (Test-Path -LiteralPath $contractsPyproject) -or (Test-Path -LiteralPath $contractsSetup)
if ($contractsPackagingPresent) {
    Add-Check -Checks $checks -Name "contracts python packaging metadata" -Status "passed" -Summary "contracts/python has packaging metadata." -Details ([ordered]@{
        pyproject = Test-Path -LiteralPath $contractsPyproject
        setup_py = Test-Path -LiteralPath $contractsSetup
    })
}
else {
    $details = [ordered]@{
        expected = @("contracts/python/pyproject.toml", "contracts/python/setup.py")
        found = @()
    }
    Add-Check -Checks $checks -Name "contracts python packaging metadata" -Status "gap" -Summary "contracts/python has no pyproject.toml or setup.py." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "contracts-python-packaging-metadata-missing" -Severity "medium" -Summary "Worker currently path-injects contracts/python along with simulation_core/python; packaging should cover both helper packages before removing repo-path fallback." -Evidence $details
}

$initPath = Join-Path $corePackage "__init__.py"
$version = ""
if (Test-Path -LiteralPath $initPath) {
    $initText = Get-Content -LiteralPath $initPath -Raw
    if ($initText -match '__version__\s*=\s*"([^"]+)"') {
        $version = $Matches[1]
    }
}
if ([string]::IsNullOrWhiteSpace($version)) {
    $details = [ordered]@{ file = "simulation_core/python/autowatersimu_simulation_core/__init__.py" }
    Add-Check -Checks $checks -Name "simulation_core package version" -Status "gap" -Summary "simulation_core package version is not exposed through __version__." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-version-missing" -Severity "medium" -Summary "Packaging should expose a stable package version." -Evidence $details
}
else {
    Add-Check -Checks $checks -Name "simulation_core package version" -Status "passed" -Summary "simulation_core exposes __version__." -Details ([ordered]@{ version = $version })
}

$coreFiles = Get-PythonFiles -Path $corePackage
$workerFiles = Get-PythonFiles -Path $workerRuntime
$legacyImportPattern = '^\s*(from\s+app(\.|\s)|import\s+app(\.|\s|$))'
$coreLegacyImportHits = @(Find-PatternHits -Root $Root -Files $coreFiles -Pattern $legacyImportPattern -Rule "core-runtime-must-not-import-legacy-backend-app")
$workerLegacyImportHits = @(Find-PatternHits -Root $Root -Files $workerFiles -Pattern $legacyImportPattern -Rule "worker-runtime-must-not-import-legacy-backend-app")
foreach ($hit in @($coreLegacyImportHits + $workerLegacyImportHits)) {
    $hardViolations.Add($hit) | Out-Null
}
Add-Check -Checks $checks -Name "runtime legacy backend imports" -Status $(if (($coreLegacyImportHits.Count + $workerLegacyImportHits.Count) -eq 0) { "passed" } else { "failed" }) -Summary "simulation_core and worker runtime must not import legacy backend app.* modules." -Details ([ordered]@{
    core_runtime_hits = $coreLegacyImportHits
    worker_runtime_hits = $workerLegacyImportHits
})

$workerLegacyFallbackHits = @(Find-PatternHits -Root $Root -Files $workerFiles -Pattern '(?<![A-Za-z0-9_])_ensure_repo_import_paths(?![A-Za-z0-9_])' -Rule "worker-runtime-legacy-repo-path-fallback")
$workerPathMutationHits = @(Find-PatternHitsWithPythonFunction -Root $Root -Files $workerFiles -Pattern 'sys\.path\.(insert|append)' -Rule "worker-runtime-repo-path-fallback")
$deprecatedFallbackCallHits = @(Find-PatternHitsWithPythonFunction -Root $Root -Files $workerFiles -Pattern '_ensure_deprecated_repo_import_paths\s*\(' -Rule "worker-runtime-deprecated-repo-path-fallback-call")
$unsafePathMutationHits = @($workerPathMutationHits | Where-Object { $_["function"] -ne "_ensure_deprecated_repo_import_paths" })
$unsafeDeprecatedFallbackCallHits = @(
    $deprecatedFallbackCallHits |
        Where-Object { $_["function"] -ne "_ensure_worker_dependency_imports" -and $_["text"] -notmatch '^\s*def\s+' }
)
$deprecatedFallbackHits = @($workerPathMutationHits | Where-Object { $_["function"] -eq "_ensure_deprecated_repo_import_paths" })
$workerFallbackDetails = [ordered]@{
    legacy_fallback_hits = $workerLegacyFallbackHits
    unsafe_path_mutation_hits = $unsafePathMutationHits
    unsafe_deprecated_fallback_call_hits = $unsafeDeprecatedFallbackCallHits
    deprecated_fallback_hits = $deprecatedFallbackHits
    deprecated_fallback_call_hits = $deprecatedFallbackCallHits
}
if (($workerLegacyFallbackHits.Count + $unsafePathMutationHits.Count + $unsafeDeprecatedFallbackCallHits.Count) -gt 0) {
    Add-Check -Checks $checks -Name "worker repo path fallback" -Status "gap" -Summary "Worker runtime still has unsafe repo-path fallback or sys.path mutation outside the dependency-import gate." -Details $workerFallbackDetails
    Add-OpenGap -Gaps $openGaps -Id "worker-runtime-repo-path-fallback-present" -Severity "high" -Summary "Keep worker repo-path fallback only as a deprecated compatibility path gated behind missing installed package imports." -Evidence $workerFallbackDetails
}
elseif ($deprecatedFallbackHits.Count -gt 0) {
    Add-Check -Checks $checks -Name "worker repo path fallback" -Status "passed" -Summary "Worker runtime prefers installed packages and keeps repo-path mutation only as a deprecated compatibility fallback behind the dependency-import gate." -Details $workerFallbackDetails
}
else {
    Add-Check -Checks $checks -Name "worker repo path fallback" -Status "passed" -Summary "Worker runtime does not mutate sys.path." -Details @()
}

$backendExceptionsPath = Join-Path $backendMaterialBalance "exceptions.py"
$coreExceptionsPath = Join-Path $corePackage "material_balance\exceptions.py"
$requiredExceptionExports = @(
    "MaterialBalanceError",
    "InvalidInputError",
    "CalculationError",
    "ConvergenceError",
    "DimensionMismatchError",
    "NegativeVolumeError"
)
$backendPyprojectText = if (Test-Path -LiteralPath $backendPyproject) { Get-Content -LiteralPath $backendPyproject -Raw } else { "" }
$backendDeclaresSimulationCoreDependency = $backendPyprojectText -match 'autowatersimu-simulation-core'
$backendExceptionsText = if (Test-Path -LiteralPath $backendExceptionsPath) { Get-Content -LiteralPath $backendExceptionsPath -Raw } else { "" }
$backendExceptionsThinShellDetected = $backendExceptionsText -match 'autowatersimu_simulation_core\.material_balance\.exceptions'
$missingExceptionExports = @()
foreach ($exceptionName in $requiredExceptionExports) {
    if ($backendExceptionsText -notmatch [regex]::Escape($exceptionName)) {
        $missingExceptionExports += $exceptionName
    }
}
$backendExceptionThinShellDetails = [ordered]@{
    backend = if (Test-Path -LiteralPath $backendExceptionsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendExceptionsPath } else { $null }
    core = if (Test-Path -LiteralPath $coreExceptionsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $coreExceptionsPath } else { $null }
    backend_dependency_declared = $backendDeclaresSimulationCoreDependency
    thin_shell_detected = $backendExceptionsThinShellDetected
    required_exports = $requiredExceptionExports
    missing_exports = $missingExceptionExports
}
if ($backendDeclaresSimulationCoreDependency -and $backendExceptionsThinShellDetected -and $missingExceptionExports.Count -eq 0) {
    Add-Check -Checks $checks -Name "backend material_balance exceptions thin shell" -Status "passed" -Summary "Legacy backend material_balance exceptions are a compatibility re-export of simulation_core exceptions." -Details $backendExceptionThinShellDetails
}
else {
    Add-Check -Checks $checks -Name "backend material_balance exceptions thin shell" -Status "gap" -Summary "Legacy backend material_balance exceptions have not been migrated to a dependency-backed simulation_core re-export." -Details $backendExceptionThinShellDetails
    Add-OpenGap -Gaps $openGaps -Id "backend-material-balance-exceptions-thin-shell-missing" -Severity "medium" -Summary "Keep backend exception class identity aligned with simulation_core before the broader backend material_balance thin-shell migration." -Evidence $backendExceptionThinShellDetails
}

$backendCorePath = Join-Path $backendMaterialBalance "core.py"
$coreCorePath = Join-Path $corePackage "material_balance\core.py"
$backendModelsPath = Join-Path $backendMaterialBalance "models.py"
$coreModelsPath = Join-Path $corePackage "material_balance\models.py"
$backendUtilsPath = Join-Path $backendMaterialBalance "utils.py"
$coreUtilsPath = Join-Path $corePackage "material_balance\utils.py"
$backendServicesPath = Join-Path $Root "backend\app\services"
$backendCoreDriftGuardPath = Join-Path $coreTests "test_material_balance_core.py"
$requiredBackendCoreDriftGuardCases = @(
    "material_balance_minimal",
    "asm1slim_model_bound",
    "asm1slim_independent",
    "asm1_independent",
    "asm3_independent",
    "udm_independent"
)
$backendCoreText = ""
$backendCoreCalculatorThinShellDetected = $false
$backendResultModelThinShellDetected = $false
if (Test-Path -LiteralPath $backendCorePath) {
    $backendCoreText = Get-Content -LiteralPath $backendCorePath -Raw
    $backendCoreCalculatorThinShellDetected = (
        $backendCoreText -match 'autowatersimu_simulation_core\.material_balance\.core' -and
        $backendCoreText -notmatch 'class\s+MaterialBalanceCalculator'
    )
    $backendResultModelThinShellDetected = (
        $backendCoreText -match 'from\s+autowatersimu_simulation_core\.material_balance\.models\s+import\s+MaterialBalanceResult'
    )
}
$backendServiceFiles = Get-PythonFiles -Path $backendServicesPath
$backendResultLegacyServiceImports = @(Find-PatternHits -Root $Root -Files $backendServiceFiles -Pattern '^\s*from\s+app\.material_balance\.models\s+import\s+MaterialBalanceResult\b' -Rule "backend-services-must-not-import-legacy-material-balance-result")
$backendResultThinShellDetails = [ordered]@{
    backend_core = if (Test-Path -LiteralPath $backendCorePath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendCorePath } else { $null }
    backend_services = if (Test-Path -LiteralPath $backendServicesPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendServicesPath } else { $null }
    core_model = if (Test-Path -LiteralPath $coreModelsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $coreModelsPath } else { $null }
    backend_dependency_declared = $backendDeclaresSimulationCoreDependency
    result_model_thin_shell_detected = $backendResultModelThinShellDetected
    legacy_service_import_hits = $backendResultLegacyServiceImports
}
if ($backendDeclaresSimulationCoreDependency -and $backendResultModelThinShellDetected -and $backendResultLegacyServiceImports.Count -eq 0) {
    Add-Check -Checks $checks -Name "backend material_balance result model thin shell" -Status "passed" -Summary "Legacy backend calculator returns the simulation_core MaterialBalanceResult model, and ASM/UDM services annotate against that core result model." -Details $backendResultThinShellDetails
}
else {
    Add-Check -Checks $checks -Name "backend material_balance result model thin shell" -Status "gap" -Summary "Legacy backend calculator and ASM/UDM services have not fully moved the result model leaf to simulation_core." -Details $backendResultThinShellDetails
    Add-OpenGap -Gaps $openGaps -Id "backend-material-balance-result-model-thin-shell-missing" -Severity "medium" -Summary "Move the calculator result model leaf to simulation_core before deleting legacy backend material_balance models or broader thin-shell migration." -Evidence $backendResultThinShellDetails
}

$requiredUtilityExports = @(
    "validate_tensor_dimensions",
    "convert_flowchart_json_to_input",
    "convert_result_to_json",
    "paginate_timeseries_data",
    "validate_calculation_parameters",
    "estimate_memory_usage",
    "create_example_input"
)
$backendUtilsText = if (Test-Path -LiteralPath $backendUtilsPath) { Get-Content -LiteralPath $backendUtilsPath -Raw } else { "" }
$backendUtilsThinShellDetected = $backendUtilsText -match 'autowatersimu_simulation_core\.material_balance\.utils'
$missingUtilityExports = @()
foreach ($utilityName in $requiredUtilityExports) {
    if ($backendUtilsText -notmatch [regex]::Escape($utilityName)) {
        $missingUtilityExports += $utilityName
    }
}
$backendUtilsThinShellDetails = [ordered]@{
    backend = if (Test-Path -LiteralPath $backendUtilsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendUtilsPath } else { $null }
    core = if (Test-Path -LiteralPath $coreUtilsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $coreUtilsPath } else { $null }
    backend_dependency_declared = $backendDeclaresSimulationCoreDependency
    thin_shell_detected = $backendUtilsThinShellDetected
    required_exports = $requiredUtilityExports
    missing_exports = $missingUtilityExports
}
if ($backendDeclaresSimulationCoreDependency -and $backendUtilsThinShellDetected -and $missingUtilityExports.Count -eq 0) {
    Add-Check -Checks $checks -Name "backend material_balance utils thin shell" -Status "passed" -Summary "Legacy backend material_balance utility helpers are compatibility re-exports of simulation_core utility helpers." -Details $backendUtilsThinShellDetails
}
else {
    Add-Check -Checks $checks -Name "backend material_balance utils thin shell" -Status "gap" -Summary "Legacy backend material_balance utility helpers have not been migrated to simulation_core re-exports." -Details $backendUtilsThinShellDetails
    Add-OpenGap -Gaps $openGaps -Id "backend-material-balance-utils-thin-shell-missing" -Severity "medium" -Summary "Move dead-code-candidate backend material_balance utility helpers to simulation_core re-exports before broader model/helper cleanup." -Evidence $backendUtilsThinShellDetails
}
$driftPairs = @(
    [ordered]@{
        role = "calculator"
        backend = if (Test-Path -LiteralPath $backendCorePath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendCorePath } else { $null }
        core = if (Test-Path -LiteralPath $coreCorePath) { ConvertTo-RepoRelativePath -Root $Root -Path $coreCorePath } else { $null }
    },
    [ordered]@{
        role = "runtime models"
        backend = if (Test-Path -LiteralPath $backendModelsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendModelsPath } else { $null }
        core = if (Test-Path -LiteralPath $coreModelsPath) { ConvertTo-RepoRelativePath -Root $Root -Path $coreModelsPath } else { $null }
    }
)
$backendCoreDriftGuardDetected = $false
$missingBackendCoreDriftGuardCases = @()
if (Test-Path -LiteralPath $backendCoreDriftGuardPath) {
    $backendCoreDriftGuardText = Get-Content -LiteralPath $backendCoreDriftGuardPath -Raw
    foreach ($caseId in $requiredBackendCoreDriftGuardCases) {
        if ($backendCoreDriftGuardText -notmatch [regex]::Escape($caseId)) {
            $missingBackendCoreDriftGuardCases += $caseId
        }
    }
    $backendCoreDriftGuardDetected = (
        $backendCoreDriftGuardText -match 'BACKEND_CORE_DRIFT_GUARD_CASES' -and
        $backendCoreDriftGuardText -match 'REQUIRED_BACKEND_CORE_DRIFT_GUARD_CASES' -and
        $backendCoreDriftGuardText -match 'test_backend_core_drift_guard_manifest_is_complete' -and
        $backendCoreDriftGuardText -match '_assert_backend_core_result_match' -and
        $missingBackendCoreDriftGuardCases.Count -eq 0
    )
}
$backendCoreDriftGuardDetails = [ordered]@{
    detected = $backendCoreDriftGuardDetected
    path = if (Test-Path -LiteralPath $backendCoreDriftGuardPath) { ConvertTo-RepoRelativePath -Root $Root -Path $backendCoreDriftGuardPath } else { $null }
    required_cases = $requiredBackendCoreDriftGuardCases
    missing_cases = $missingBackendCoreDriftGuardCases
}
$backendCoreDuplicateDetected = (Test-Path -LiteralPath $backendCorePath) -and (Test-Path -LiteralPath $coreCorePath)
if ($backendCoreDuplicateDetected -and (-not $backendCoreCalculatorThinShellDetected) -and (-not $backendCoreDriftGuardDetected)) {
    $details = [ordered]@{
        backend_core_calculator_thin_shell_detected = $backendCoreCalculatorThinShellDetected
        backend_result_model_thin_shell_detected = $backendResultModelThinShellDetected
        mirrored_files = $driftPairs
        drift_guard = $backendCoreDriftGuardDetails
    }
    Add-Check -Checks $checks -Name "backend/core dual implementation drift risk" -Status "gap" -Summary "Legacy backend and simulation_core both keep material balance implementations; backend is not yet a thin shell over simulation_core." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "backend-core-dual-implementation-drift-risk" -Severity "high" -Summary "Before performance work, define golden/parity strategy and then make backend a thin shell or keep explicit drift guards." -Evidence $details
}
else {
    $backendCoreDriftSummary = "Backend material balance calculator is thin-shell-like or no duplicate core implementation was detected."
    if ($backendCoreDuplicateDetected -and (-not $backendCoreCalculatorThinShellDetected) -and $backendCoreDriftGuardDetected) {
        $backendCoreDriftSummary = "Legacy backend and simulation_core still duplicate material balance implementations, but explicit backend/core parity drift guard coverage is present."
    }
    Add-Check -Checks $checks -Name "backend/core dual implementation drift risk" -Status "passed" -Summary $backendCoreDriftSummary -Details ([ordered]@{
        backend_core_calculator_thin_shell_detected = $backendCoreCalculatorThinShellDetected
        backend_result_model_thin_shell_detected = $backendResultModelThinShellDetected
        mirrored_files = $driftPairs
        drift_guard = $backendCoreDriftGuardDetails
    })
}

$coreTestFiles = Get-PythonFiles -Path $coreTests
$workerTestFiles = Get-PythonFiles -Path $workerTests
$testBackendPattern = '^\s*BACKEND_PATH\s*=|backend[\\/]|^\s*(from\s+app(\.|\s)|import\s+app(\.|\s|$))'
$coreTestBackendHits = @(Find-PatternHits -Root $Root -Files $coreTestFiles -Pattern $testBackendPattern -Rule "simulation-core-tests-backend-oracle-dependency")
$workerTestBackendHits = @(Find-PatternHits -Root $Root -Files $workerTestFiles -Pattern $testBackendPattern -Rule "worker-tests-backend-oracle-dependency")
$coreOnlyTestFiles = @()
$backendOracleTestFiles = @()
foreach ($file in @($coreTestFiles)) {
    $fileHits = @(Find-PatternHits -Root $Root -Files @($file) -Pattern $testBackendPattern -Rule "simulation-core-tests-backend-oracle-dependency")
    if ($fileHits.Count -eq 0) {
        $coreOnlyTestFiles += (ConvertTo-RepoRelativePath -Root $Root -Path $file.FullName)
    }
    else {
        $backendOracleTestFiles += (ConvertTo-RepoRelativePath -Root $Root -Path $file.FullName)
    }
}
if ($coreOnlyTestFiles.Count -eq 0) {
    $details = [ordered]@{
        backend_oracle_hits = $coreTestBackendHits
        backend_oracle_test_files = @($backendOracleTestFiles | Sort-Object -Unique)
        core_only_test_files = $coreOnlyTestFiles
    }
    Add-Check -Checks $checks -Name "simulation_core tests collect boundary" -Status "gap" -Summary "simulation_core has no core-only test file separated from backend parity/oracle tests." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-tests-collect-backend-oracle-dependency" -Severity "high" -Summary "Split core-only boundary/golden tests from backend parity/oracle tests so core-only collect does not add backend to sys.path." -Evidence $details
}
else {
    Add-Check -Checks $checks -Name "simulation_core tests collect boundary" -Status "passed" -Summary "simulation_core has core-only tests separated from backend parity/oracle tests." -Details ([ordered]@{
        backend_oracle_hits = $coreTestBackendHits
        backend_oracle_test_files = @($backendOracleTestFiles | Sort-Object -Unique)
        core_only_test_files = $coreOnlyTestFiles
    })
}
$workerRuntimeTestBackendHits = @()
$workerBackendOracleTestFiles = @()
$workerRuntimeBoundaryTestFiles = @()
foreach ($file in @($workerTestFiles)) {
    $relativePath = ConvertTo-RepoRelativePath -Root $Root -Path $file.FullName
    $fileHits = @(Find-PatternHits -Root $Root -Files @($file) -Pattern $testBackendPattern -Rule "worker-tests-backend-oracle-dependency")
    if ($fileHits.Count -eq 0) {
        $workerRuntimeBoundaryTestFiles += $relativePath
        continue
    }
    if ($relativePath -match '(^|/)test_worker_backend_oracle\.py$') {
        $workerBackendOracleTestFiles += $relativePath
        continue
    }
    $workerRuntimeTestBackendHits += $fileHits
}
$workerTestBoundaryDetails = [ordered]@{
    backend_oracle_hits = $workerTestBackendHits
    backend_oracle_test_files = @($workerBackendOracleTestFiles | Sort-Object -Unique)
    runtime_boundary_test_files = @($workerRuntimeBoundaryTestFiles | Sort-Object -Unique)
    runtime_boundary_backend_hits = $workerRuntimeTestBackendHits
}
if ($workerRuntimeTestBackendHits.Count -gt 0) {
    Add-Check -Checks $checks -Name "worker tests backend oracle dependency" -Status "gap" -Summary "Worker runtime/CLI/API tests still collect with legacy backend oracle dependencies." -Details $workerTestBoundaryDetails
    Add-OpenGap -Gaps $openGaps -Id "worker-tests-backend-oracle-dependency" -Severity "medium" -Summary "Keep backend oracle tests isolated from worker runtime boundary tests before packaging gate promotion." -Evidence $workerTestBoundaryDetails
}
elseif ($workerBackendOracleTestFiles.Count -gt 0) {
    Add-Check -Checks $checks -Name "worker tests backend oracle dependency" -Status "passed" -Summary "Worker backend oracle tests are isolated from runtime/CLI/API boundary tests." -Details $workerTestBoundaryDetails
}
else {
    Add-Check -Checks $checks -Name "worker tests backend oracle dependency" -Status "passed" -Summary "Worker tests do not statically add/import backend oracle dependencies." -Details @()
}

$python = Resolve-Python -Root $Root
$importSmoke = Invoke-CoreOnlyImportSmoke -Root $Root -CorePythonPath $simulationCorePython -Python $python
Add-Check -Checks $checks -Name "core-only import smoke" -Status $importSmoke["status"] -Summary "Import autowatersimu_simulation_core with PYTHONPATH limited to simulation_core/python." -Details $importSmoke
if ($importSmoke["status"] -ne "passed") {
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-core-only-import-smoke-failed" -Severity "high" -Summary "simulation_core must import without backend path before packaging and performance work." -Evidence $importSmoke
}

$status = "passed"
if ($hardViolations.Count -gt 0) {
    $status = "failed"
}
elseif ($openGaps.Count -gt 0) {
    $status = "partial"
}

$report = [ordered]@{
    schema_version = "autowatersimu_simulation_core_boundary_audit.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    status = $status
    fail_on_open_gaps = [bool]$FailOnOpenGaps
    summary = [ordered]@{
        checks = $checks.Count
        hard_violations = $hardViolations.Count
        open_gaps = $openGaps.Count
        simulation_core_version = $version
    }
    hard_violations = @($hardViolations)
    open_gaps = @($openGaps)
    checks = @($checks)
    next_recommended_slice = @(
        "Use the explicit backend/core parity drift guard as the baseline before backend thin-shell migration, input-contract tightening, or hot-path optimization."
    )
}

$evidencePath = Join-Path $EvidenceDir "simulation-core-boundary.json"
$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

Write-Output "simulation_core boundary audit status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "hard_violations: $($hardViolations.Count)"
Write-Output "open_gaps: $($openGaps.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
if ($FailOnOpenGaps -and $openGaps.Count -gt 0) {
    exit 1
}
