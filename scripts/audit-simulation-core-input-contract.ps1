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


payload = json.loads(
    (root / "contracts" / "examples" / "valid" / "material_balance_minimal.simulation_input.v1.json").read_text(
        encoding="utf-8"
    )
)
payload["unknown_top_level_for_audit"] = {"accepted": True}
payload["nodes"][0]["unknown_node_field_for_audit"] = "node-extra"
payload["edges"][0]["unknown_edge_field_for_audit"] = "edge-extra"

adapter_error = None
adapted = None
try:
    adapted = simulation_input_to_material_balance_input(copy.deepcopy(payload))
except Exception as exc:  # pragma: no cover - returned to PowerShell audit
    adapter_error = {"type": type(exc).__name__, "message": str(exc)}

direct_node = NodeData(
    node_id="n_probe",
    node_type="input",
    is_inlet=True,
    initial_volume=1.0,
    initial_concentrations=[1.0],
    unknown_runtime_node_field_for_audit="node-extra",
)
direct_edge = EdgeData(
    edge_id="e_probe",
    source_node_id="n_probe",
    target_node_id="n_target",
    flow_rate=1.0,
    unknown_runtime_edge_field_for_audit="edge-extra",
)

adapter_node_extra = {}
adapter_edge_extra = {}
adapter_has_warnings = False
if adapted is not None:
    adapter_node_extra = model_extra(adapted.nodes[0])
    adapter_edge_extra = model_extra(adapted.edges[0])
    adapter_has_warnings = hasattr(adapted, "warnings")

report = {
    "adapter_accepts_unknown_fields": adapter_error is None,
    "adapter_error": adapter_error,
    "adapter_has_warnings": adapter_has_warnings,
    "adapter_node_unknown_preserved": "unknown_node_field_for_audit" in adapter_node_extra,
    "adapter_edge_unknown_preserved": "unknown_edge_field_for_audit" in adapter_edge_extra,
    "adapter_unknown_fields_dropped_without_warning": (
        adapter_error is None
        and not adapter_has_warnings
        and "unknown_node_field_for_audit" not in adapter_node_extra
        and "unknown_edge_field_for_audit" not in adapter_edge_extra
    ),
    "direct_runtime_node_unknown_preserved": model_extra(direct_node).get("unknown_runtime_node_field_for_audit") == "node-extra",
    "direct_runtime_edge_unknown_preserved": model_extra(direct_edge).get("unknown_runtime_edge_field_for_audit") == "edge-extra",
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
if ($nodeExtraAllow -or $edgeExtraAllow) {
    Add-Check -Checks $checks -Name "simulation_core runtime model extra policy" -Status "gap" -Summary "NodeData or EdgeData still allow unknown runtime fields." -Details $runtimeExtraDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-runtime-models-extra-allow" -Severity "medium" -Summary "Record or replace runtime extra=allow before strict input-contract mode." -Evidence $runtimeExtraDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_core runtime model extra policy" -Status "passed" -Summary "NodeData and EdgeData no longer allow unknown runtime fields." -Details $runtimeExtraDetails
}

$adapterText = Get-Content -LiteralPath $adapterPath -Raw
$adapterHasValidationMode = $adapterText -match 'validation_mode|strict|warn|warning|warnings|unknown'
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
$unknownFieldStrategyDetails = [ordered]@{
    adapter = ConvertTo-RepoRelativePath -Root $Root -Path $adapterPath
    has_static_warning_or_strict_terms = $adapterHasValidationMode
    probe = $probe
}
$dropsWithoutWarning = $false
if ($null -ne $probe) {
    $dropsWithoutWarning = [bool]$probe.adapter_unknown_fields_dropped_without_warning
}
if ((-not $adapterHasValidationMode) -or $dropsWithoutWarning) {
    Add-Check -Checks $checks -Name "simulation_core adapter unknown-field strategy" -Status "gap" -Summary "Adapter currently has no explicit warn/strict unknown-field strategy for accepted extra fields." -Details $unknownFieldStrategyDetails
    Add-OpenGap -Gaps $openGaps -Id "simulation-core-adapter-unknown-field-strategy-missing" -Severity "high" -Summary "Add structured warning or strict mode design before input-contract tightening." -Evidence $unknownFieldStrategyDetails
}
else {
    Add-Check -Checks $checks -Name "simulation_core adapter unknown-field strategy" -Status "passed" -Summary "Adapter exposes an explicit unknown-field warning or strict strategy." -Details $unknownFieldStrategyDetails
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
        "Design simulation_core adapter warn/strict unknown-field mode.",
        "Decide whether simulation_input.v1 node/edge items stay extensible or move to explicit typed fields.",
        "Keep backend/core parity drift guard green before changing runtime model extra policy."
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
