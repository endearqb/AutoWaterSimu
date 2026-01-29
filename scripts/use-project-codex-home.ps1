<#
.SYNOPSIS
  Use project-local Codex skills (stored under ./.codex/skills).

.DESCRIPTION
  Codex loads skills from $env:CODEX_HOME\\skills (or the default user profile location).
  This script sets CODEX_HOME to this repository's ./.codex folder so skills are "installed"
  into the working directory and are shareable via git.

.EXAMPLE
  .\\scripts\\use-project-codex-home.ps1
  # Then start Codex from the same terminal session.
#>

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..") -ErrorAction Stop
$ProjectCodexHome = Join-Path $ProjectRoot ".codex"

if (-not (Test-Path $ProjectCodexHome)) {
    throw "Missing .codex folder at: $ProjectCodexHome"
}

$env:CODEX_HOME = (Resolve-Path $ProjectCodexHome).Path

Write-Host "CODEX_HOME set to: $env:CODEX_HOME"
Write-Host "Skills directory: $(Join-Path $env:CODEX_HOME 'skills')"
Write-Host ""
Write-Host "Start Codex from this terminal to pick up project-local skills."

