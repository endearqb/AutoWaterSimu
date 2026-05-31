param(
    [string]$RepoRoot = ""
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

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-Check {
    param(
        [System.Collections.Generic.List[object]]$Checks,
        [string]$Name,
        [string]$Subsystem,
        [bool]$Required,
        [bool]$Available,
        [string]$Hint
    )
    $Checks.Add([ordered]@{
        name = $Name
        subsystem = $Subsystem
        required = $Required
        status = if ($Available) { "ok" } elseif ($Required) { "missing" } else { "optional-missing" }
        hint = $Hint
    }) | Out-Null
}

$root = Resolve-RepoRoot -InputRoot $RepoRoot
$checks = [System.Collections.Generic.List[object]]::new()

$backendPython = Join-Path $root "backend\.venv\Scripts\python.exe"
$backendPythonAvailable = (Test-Path -LiteralPath $backendPython) -or (Test-CommandAvailable "python")

Add-Check $checks "git" "repo" $true (Test-CommandAvailable "git") "Install Git and ensure git is on PATH."
Add-Check $checks "rg" "repo-search" $false (Test-CommandAvailable "rg") "Install ripgrep for faster manual repository searches."
Add-Check $checks "go" "apps/api" $true (Test-CommandAvailable "go") "Install the Go toolchain required by apps/api/go.mod."
Add-Check $checks "node" "frontend" $true (Test-CommandAvailable "node") "Install Node.js for frontend and desktop web tooling."
Add-Check $checks "npm" "frontend" $true (Test-CommandAvailable "npm") "Install npm for frontend scripts."
Add-Check $checks "npx" "frontend" $true (Test-CommandAvailable "npx") "Install npx for TypeScript and Playwright commands."
Add-Check $checks "python" "contracts/worker" $true $backendPythonAvailable "Create backend/.venv or install Python on PATH."
Add-Check $checks "cargo" "apps/desktop" $false (Test-CommandAvailable "cargo") "Install Rust for desktop Rust tests and release gates."
Add-Check $checks "docker" "local-dev" $false (Test-CommandAvailable "docker") "Install Docker Desktop for compose-based local infrastructure."
Add-Check $checks "just" "monorepo-entry" $false (Test-CommandAvailable "just") "Install just to use the root Justfile."

Write-Host "AutoWaterSimu Next doctor"
Write-Host "Repo root: $root"
$checks | ForEach-Object { [pscustomobject]$_ } | Format-Table -AutoSize

$missingRequired = @($checks | Where-Object { $_.required -and $_.status -ne "ok" })
if ($missingRequired.Count -gt 0) {
    Write-Error ("Missing required tool(s): " + (($missingRequired | ForEach-Object { $_.name }) -join ", "))
    exit 1
}

Write-Host "Doctor passed for required fast-check tooling."
