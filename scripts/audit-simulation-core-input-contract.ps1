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

function Get-JsonProperty {
    param(
        [object]$Object,
        [string]$Name
    )
    if ($null -eq $Object) {
        return $null
    }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
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

function Invoke-UnknownFieldProbe {
    param(
        [string]$Root,
        [string]$Python
    )
    $previousRoot = $env:AUTOWATERSIMU_AUDIT_ROOT
    $codeFile = $null
    $stdoutFile = $null
    $stderrFile = $null
    $code = @'
import copy
import json
import os
import sys
from pathlib import Path

root = Path(os.environ["AUTOWATERSIMU_AUDIT_ROOT"])
sys.path.insert(0, str(root / "simulation_core" / "python"))

from autowatersimu_simulation_core.adapters import simulation_input_to_material_balance_input
from autowatersimu_simulation_core.material_balance.models import EdgeData, NodeData


def model_extra(model):
    return getattr(model, "model_extra", None) or {}


def contract_warnings(model):
    return getattr(model, "contract_warnings", None) or []


def adapt(payload, mode):
    adapter_error = None
    adapted = None
    try:
        adapted = simulation_input_to_material_balance_input(copy.deepcopy(payload), validation_mode=mode)
    except Exception as exc:  # pragma: no cover - returned to PowerShell audit
        adapter_error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "details": getattr(exc, "details", []),
        }
    return adapted, adapter_error


def construct_runtime_model(model_cls, **kwargs):
    model = None
    model_error = None
    try:
        model = model_cls(**kwargs)
    except Exception as exc:  # pragma: no cover - returned to PowerShell audit
        model_error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "errors": getattr(exc, "errors", lambda: [])(),
        }
    return model, model_error


payload = json.loads(
    (root / "contracts" / "examples" / "valid" / "material_balance_minimal.simulation_input.v1.json").read_text(
        encoding="utf-8"
    )
)
payload["unknown_top_level_for_audit"] = {"accepted": True}
payload["nodes"][0]["unknown_node_field_for_audit"] = "node-extra"
payload["edges"][0]["unknown_edge_field_for_audit"] = "edge-extra"

compat_adapted, compat_error = adapt(payload, "compat")
warn_adapted, warn_error = adapt(payload, "warn")
strict_adapted, strict_error = adapt(payload, "strict")

direct_node, direct_node_error = construct_runtime_model(
    NodeData,
    node_id="n_probe",
    node_type="input",
    is_inlet=True,
    initial_volume=1.0,
    initial_concentrations=[1.0],
    unknown_runtime_node_field_for_audit="node-extra",
)
direct_edge, direct_edge_error = construct_runtime_model(
    EdgeData,
    edge_id="e_probe",
    source_node_id="n_probe",
    target_node_id="n_target",
    flow_rate=1.0,
    unknown_runtime_edge_field_for_audit="edge-extra",
)

compat_node_extra = {}
compat_edge_extra = {}
compat_warnings = []
if compat_adapted is not None:
    compat_node_extra = model_extra(compat_adapted.nodes[0])
    compat_edge_extra = model_extra(compat_adapted.edges[0])
    compat_warnings = contract_warnings(compat_adapted)

warn_warnings = []
if warn_adapted is not None:
    warn_warnings = contract_warnings(warn_adapted)

strict_error_details = []
if strict_error is not None:
    strict_error_details = strict_error.get("details", [])

report = {
    "compat_accepts_unknown_fields": compat_error is None,
    "compat_error": compat_error,
    "compat_contract_warnings_count": len(compat_warnings),
    "compat_node_unknown_preserved": "unknown_node_field_for_audit" in compat_node_extra,
    "compat_edge_unknown_preserved": "unknown_edge_field_for_audit" in compat_edge_extra,
    "compat_unknown_fields_dropped_without_warning": (
        compat_error is None
        and len(compat_warnings) == 0
        and "unknown_node_field_for_audit" not in compat_node_extra
        and "unknown_edge_field_for_audit" not in compat_edge_extra
    ),
    "warn_accepts_unknown_fields": warn_error is None,
    "warn_error": warn_error,
    "warn_contract_warnings_count": len(warn_warnings),
    "warn_contract_warning_paths": [item.get("path") for item in warn_warnings],
    "strict_rejects_unknown_fields": strict_error is not None and strict_adapted is None,
    "strict_error": strict_error,
    "strict_error_paths": [item.get("path") for item in strict_error_details],
    "direct_runtime_node_unknown_preserved": (
        direct_node is not None
        and model_extra(direct_node).get("unknown_runtime_node_field_for_audit") == "node-extra"
    ),
    "direct_runtime_edge_unknown_preserved": (
        direct_edge is not None
        and model_extra(direct_edge).get("unknown_runtime_edge_field_for_audit") == "edge-extra"
    ),
    "direct_runtime_node_unknown_rejected": direct_node_error is not None and direct_node is None,
    "direct_runtime_edge_unknown_rejected": direct_edge_error is not None and direct_edge is None,
    "direct_runtime_node_error": direct_node_error,
    "direct_runtime_edge_error": direct_edge_error,
}
print(json.dumps(report, sort_keys=True))
'@
    try {
        $env:AUTOWATERSIMU_AUDIT_ROOT = $Root
        $codeFile = New-TemporaryFile
        $stdoutFile = New-TemporaryFile
        $stderrFile = New-TemporaryFile
        Set-Content -LiteralPath $codeFile -Value $code -Encoding UTF8
        $process = Start-Process -FilePath $Python -ArgumentList @($codeFile) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $exitCode = $process.ExitCode
        $stdout = [string](Get-Content -LiteralPath $stdoutFile -Raw)
        $stderr = [string](Get-Content -LiteralPath $stderrFile -Raw)
        $outputText = (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
        if ($exitCode -ne 0) {
            return [ordered]@{
                status = "failed"
                exit_code = $exitCode
                output = $outputText.Trim()
                parsed = $null
            }
        }
        return [ordered]@{
            status = "passed"
            exit_code = $exitCode
            output = $outputText.Trim()
            parsed = $outputText | ConvertFrom-Json
        }
    }
    catch {
        return [ordered]@{
            status = "failed"
            exit_code = 1
            output = $_.Exception.Message
            parsed = $null
        }
    }
    finally {
        if ($null -ne $codeFile) {
            Remove-Item -LiteralPath $codeFile -Force -ErrorAction SilentlyContinue
        }
        if ($null -ne $stdoutFile) {
            Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        }
        if ($null -ne $stderrFile) {
            Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
        }
        if ($null -eq $previousRoot) {
            Remove-Item Env:\AUTOWATERSIMU_AUDIT_ROOT -ErrorAction SilentlyContinue
        }
        else {
            $env:AUTOWATERSIMU_AUDIT_ROOT = $previousRoot
        }
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

$schemaPath = Join-Path $Root "contracts\simulation_input.v1.json"
$modelsPath = Join-Path $Root "simulation_core\python\autowatersimu_simulation_core\material_balance\models.py"
$adapterPath = Join-Path $Root "simulation_core\python\autowatersimu_simulation_core\adapters\material_balance.py"

$schema = Get-Content -LiteralPath $schemaPath -Raw | ConvertFrom-Json
$schemaProperties = Get-JsonProperty -Object $schema -Name "properties"
$topAdditionalProperties = Get-JsonProperty -Object $schema -Name "additionalProperties"
if ($topAdditionalProperties -eq $false) {
    Add-Check -Checks $checks -Name "simulation_input top-level schema closure" -Status "passed" -Summary "simulation_input.v1 rejects unknown top-level fields through additionalProperties=false." -Details ([ordered]@{
        schema = ConvertTo-RepoRelativePath -Root $Root -Path $schemaPath
        additional_properties = $topAdditionalProperties
    })
}
else {
    $details = [ordered]@{
        schema = ConvertTo-RepoRelativePath -Root $Root -Path $schemaPath
        additional_properties = $topAdditionalProperties
    }
    Add-Check -Checks $checks -Name "simulation_input top-level schema closure" -Status "gap" -Summary "simulation_input.v1 does not explicitly close unknown top-level fields." -Details $details
    Add-OpenGap -Gaps $openGaps -Id "simulation-input-top-level-schema-open" -Severity "medium" -Summary "Close or explicitly justify simulation_input.v1 top-level unknown field behavior before strict input-contract mode." -Evidence $details
}

$nodesSchema = Get-JsonProperty -Object $schemaProperties -Name "nodes"
$edgesSchema = Get-JsonProperty -Object $schemaProperties -Name "edges"
$nodeItems = Get-JsonProperty -Object $nodesSchema -Name "items"
$edgeItems = Get-JsonProperty -Object $edgesSchema -Name "items"
$nodeItemAdditional = Get-JsonProperty -Object $nodeItems -Name "additionalProperties"
$edgeItemAdditional = Get-JsonProperty -Object $edgeItems -Name "additionalProperties"
$nodeItemProperties = Get-JsonProperty -Object $nodeItems -Name "properties"
$edgeItemProperties = Get-JsonProperty -Object $edgeItems -Name "properties"
$nodeItemsOpen = ($null -eq $nodeItemProperties) -and ($nodeItemAdditional -ne $false)
$edgeItemsOpen = ($null -eq $edgeItemProperties) -and ($edgeItemAdditional -ne $false)
$nodeEdgeSchemaDetails = [ordered]@{
    schema = ConvertTo-RepoRelativePath -Root $Root -Path $schemaPath
    node_items_type = Get-JsonProperty -Object $nodeItems -Name "type"
    node_items_additional_properties = $nodeItemAdditional
    node_items_has_properties = $null -ne $nodeItemProperties
    edge_items_type = Get-JsonProperty -Object $edgeItems -Name "type"
    edge_items_additional_properties = $edgeItemAdditional
    edge_items_has_properties = $null -ne $edgeItemProperties
}
if ($nodeItemsOpen -or $edgeItemsOpen) {
    Add-Check -Checks $checks -Name "simulation_input node/edge field schema" -Status "gap" -Summary "simulation_input.v1 nodes/edges are still open objects, so typo and camelCase strategy is not contractually explicit." -Details $nodeEdgeSchemaDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-input-node-edge-items-open-schema" -Severity "high" -Summary "Define explicit node/edge field strategy before tightening simulation_core input contracts." -Evidence $nodeEdgeSchemaDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_input node/edge field schema" -Status "passed" -Summary "simulation_input.v1 node/edge item fields are explicit." -Details $nodeEdgeSchemaDetails
}

$modelsText = Get-Content -LiteralPath $modelsPath -Raw
$nodeExtraAllow = $modelsText -match 'class\s+NodeData[\s\S]*?model_config\s*=\s*ConfigDict\(\s*extra\s*=\s*"allow"\s*\)'
$edgeExtraAllow = $modelsText -match 'class\s+EdgeData[\s\S]*?model_config\s*=\s*ConfigDict\(\s*extra\s*=\s*"allow"\s*\)'
$runtimeExtraDetails = [ordered]@{
    file = ConvertTo-RepoRelativePath -Root $Root -Path $modelsPath
    node_extra_allow = $nodeExtraAllow
    edge_extra_allow = $edgeExtraAllow
}

$adapterText = Get-Content -LiteralPath $adapterPath -Raw
$adapterHasValidationMode = (
    $adapterText -match 'validation_mode' -and
    $adapterText -match 'strict' -and
    $adapterText -match 'warn' -and
    $adapterText -match 'contract_warnings' -and
    $adapterText -match 'unknown'
)
$python = Resolve-Python -Root $Root
$unknownFieldProbe = Invoke-UnknownFieldProbe -Root $Root -Python $python
if ($unknownFieldProbe["status"] -ne "passed") {
    $hardViolations.Add([ordered]@{
        rule = "simulation-core-input-contract-probe-must-run"
        output = $unknownFieldProbe["output"]
        python = $python
    }) | Out-Null
    Add-Check -Checks $checks -Name "unknown field runtime probe" -Status "failed" -Summary "Unknown-field runtime probe failed." -Details $unknownFieldProbe
}
else {
    Add-Check -Checks $checks -Name "unknown field runtime probe" -Status "passed" -Summary "Unknown-field runtime probe executed successfully." -Details $unknownFieldProbe
}

$probe = $unknownFieldProbe["parsed"]
$directRuntimeNodeUnknownRejected = $false
$directRuntimeEdgeUnknownRejected = $false
if ($null -ne $probe) {
    $directRuntimeNodeUnknownRejected = [bool](Get-JsonProperty -Object $probe -Name "direct_runtime_node_unknown_rejected")
    $directRuntimeEdgeUnknownRejected = [bool](Get-JsonProperty -Object $probe -Name "direct_runtime_edge_unknown_rejected")
}
$runtimeExtraDetails["direct_runtime_node_unknown_rejected"] = $directRuntimeNodeUnknownRejected
$runtimeExtraDetails["direct_runtime_edge_unknown_rejected"] = $directRuntimeEdgeUnknownRejected
$runtimeExtraPolicyPassed = (
    -not ($nodeExtraAllow -or $edgeExtraAllow) -and
    $directRuntimeNodeUnknownRejected -and
    $directRuntimeEdgeUnknownRejected
)
if (-not $runtimeExtraPolicyPassed) {
    Add-Check -Checks $checks -Name "simulation_core runtime model extra policy" -Status "gap" -Summary "NodeData or EdgeData still accept unknown runtime fields." -Details $runtimeExtraDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-runtime-models-extra-allow" -Severity "medium" -Summary "Forbid direct runtime NodeData/EdgeData unknown fields before strict input-contract mode." -Evidence $runtimeExtraDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_core runtime model extra policy" -Status "passed" -Summary "NodeData and EdgeData reject direct unknown runtime fields." -Details $runtimeExtraDetails
}

$unknownFieldStrategyDetails = [ordered]@{
    adapter = ConvertTo-RepoRelativePath -Root $Root -Path $adapterPath
    has_static_warn_strict_terms = $adapterHasValidationMode
    probe = $probe
}
$warnAcceptsUnknownFields = $false
$warnContractWarningsCount = 0
$strictRejectsUnknownFields = $false
if ($null -ne $probe) {
    $warnAcceptsUnknownFields = [bool](Get-JsonProperty -Object $probe -Name "warn_accepts_unknown_fields")
    $warnWarningsValue = Get-JsonProperty -Object $probe -Name "warn_contract_warnings_count"
    if ($null -ne $warnWarningsValue) {
        $warnContractWarningsCount = [int]$warnWarningsValue
    }
    $strictRejectsUnknownFields = [bool](Get-JsonProperty -Object $probe -Name "strict_rejects_unknown_fields")
}
$adapterUnknownFieldStrategyPassed = (
    $adapterHasValidationMode -and
    $warnAcceptsUnknownFields -and
    $warnContractWarningsCount -ge 3 -and
    $strictRejectsUnknownFields
)
if (-not $adapterUnknownFieldStrategyPassed) {
    Add-Check -Checks $checks -Name "simulation_core adapter unknown-field strategy" -Status "gap" -Summary "Adapter warn/strict unknown-field strategy is not fully proven by the runtime probe." -Details $unknownFieldStrategyDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-adapter-unknown-field-strategy-missing" -Severity "high" -Summary "Add and prove structured warn/strict unknown-field mode before input-contract tightening." -Evidence $unknownFieldStrategyDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_core adapter unknown-field strategy" -Status "passed" -Summary "Adapter keeps default compatibility while proving opt-in warn and strict unknown-field modes." -Details $unknownFieldStrategyDetails
}

$status = "passed"
if ($hardViolations.Count -gt 0) {
    $status = "failed"
}
elseif ($openGaps.Count -gt 0) {
    $status = "partial"
}

$report = [ordered]@{
    schema_version = "autowatersimu_simulation_core_input_contract_audit.v1"
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
        "Keep simulation_input.v1 node/edge explicit field schema and runtime NodeData/EdgeData extra=forbid green when adding worker-executable fields.",
        "Keep adapter compat/warn/strict evidence green before changing worker default validation mode.",
        "Keep backend/core parity drift guard green before backend thin-shell or hot-path performance changes."
    )
}

$evidencePath = Join-Path $EvidenceDir "simulation-core-input-contract.json"
$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $evidencePath -Encoding UTF8

Write-Output "simulation_core input contract audit status: $status"
Write-Output "evidence: $evidencePath"
Write-Output "hard_violations: $($hardViolations.Count)"
Write-Output "open_gaps: $($openGaps.Count)"

if ($hardViolations.Count -gt 0) {
    exit 1
}
if ($FailOnOpenGaps -and $openGaps.Count -gt 0) {
    exit 1
}
