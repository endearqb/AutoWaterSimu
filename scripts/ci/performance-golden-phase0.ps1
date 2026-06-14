param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$GoldenDir = "",
    [string[]]$Solvers = @(),
    [string[]]$CaseIds = @(),
    [switch]$FailOnOpenGaps
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

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
$python = Resolve-Python -Root $Root
$helper = Join-Path $PSScriptRoot "performance_golden_phase0.py"

$arguments = @($helper, "--repo-root", $Root)
if (-not [string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $arguments += @("--evidence-dir", $EvidenceDir)
}
if (-not [string]::IsNullOrWhiteSpace($GoldenDir)) {
    $arguments += @("--golden-dir", $GoldenDir)
}
foreach ($solver in $Solvers) {
    if (-not [string]::IsNullOrWhiteSpace($solver)) {
        $arguments += @("--solver", $solver)
    }
}
foreach ($caseId in $CaseIds) {
    if (-not [string]::IsNullOrWhiteSpace($caseId)) {
        $arguments += @("--case-id", $caseId)
    }
}
if ($FailOnOpenGaps) {
    $arguments += "--fail-on-open-gaps"
}

& $python @arguments
exit $LASTEXITCODE
