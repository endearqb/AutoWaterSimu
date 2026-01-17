Param(
    [Parameter(Mandatory=$true)]
    [string[]]$Files
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-ToUtf8NoBom([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Error "File not found: $Path"
    }
    $backup = "$Path.bak"
    Copy-Item -LiteralPath $Path -Destination $backup -Force
    $content = Get-Content -LiteralPath $Path -Raw
    # Write UTF-8 without BOM
    [System.IO.File]::WriteAllText($Path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

foreach ($f in $Files) {
    Convert-ToUtf8NoBom -Path $f
}

Write-Host "Converted to UTF-8 (no BOM):" -ForegroundColor Green
foreach ($f in $Files) { Write-Host "- $f" }