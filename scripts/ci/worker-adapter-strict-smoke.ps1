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
$helper = Join-Path $PSScriptRoot "worker_adapter_strict_smoke.py"

$arguments = @($helper, "--repo-root", $Root)
if (-not [string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $arguments += @("--evidence-dir", $EvidenceDir)
}

& $python @arguments
exit $LASTEXITCODE
