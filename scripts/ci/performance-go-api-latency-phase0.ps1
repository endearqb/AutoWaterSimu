param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [int]$JobCount = 80,
    [int]$ListIterations = 40,
    [int]$GetIterations = 80,
    [int]$ClaimIterations = 40,
    [int]$ListLimit = 50
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
$helper = Join-Path $PSScriptRoot "performance_go_api_latency_phase0.py"

$arguments = @(
    $helper,
    "--repo-root", $Root,
    "--job-count", $JobCount,
    "--list-iterations", $ListIterations,
    "--get-iterations", $GetIterations,
    "--claim-iterations", $ClaimIterations,
    "--list-limit", $ListLimit
)
if (-not [string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $arguments += @("--evidence-dir", $EvidenceDir)
}

& $python @arguments
exit $LASTEXITCODE
