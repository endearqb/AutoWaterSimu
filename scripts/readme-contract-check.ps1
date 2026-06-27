param(
    [string]$ConfigPath = ".ai/readme-contracts.json",
    [string]$OutputPath = "tmp/readme-contract-check.json",
    [switch]$ReportOnly,
    [switch]$FailOnWarnings
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path ".").Path
$configFullPath = Join-Path $repoRoot $ConfigPath
if (-not (Test-Path -LiteralPath $configFullPath)) {
    throw "README contract config not found: $ConfigPath"
}

$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $configFullPath | ConvertFrom-Json
$excludeDirNames = @($config.exclude_dir_names)
$typeRules = @($config.type_rules)
$absolutePathPatterns = @($config.absolute_path_patterns)
$secretPatterns = @($config.secret_patterns)

function Get-RelativePath {
    param([string]$FullName)
    return $FullName.Substring($repoRoot.Length + 1).Replace("/", "\")
}

function Test-ExcludedPath {
    param([string]$RelativePath)
    $segments = $RelativePath -split "\\"
    foreach ($segment in $segments) {
        if ($excludeDirNames -contains $segment) {
            return $true
        }
    }
    return $false
}

function Get-ReadmeType {
    param([string]$RelativePath)
    foreach ($rule in $typeRules) {
        if ($RelativePath -match $rule.pattern) {
            return [string]$rule.type
        }
    }
    return "contract"
}

function Get-MaxLines {
    param([string]$Type)
    $value = $config.max_lines.$Type
    if ($null -eq $value) {
        return [int]$config.max_lines.contract
    }
    return [int]$value
}

$readmes = Get-ChildItem -LiteralPath $repoRoot -Recurse -File -Filter "README*.md" |
    Where-Object { -not (Test-ExcludedPath (Get-RelativePath $_.FullName)) } |
    Sort-Object FullName

$documents = New-Object System.Collections.Generic.List[object]
$issues = New-Object System.Collections.Generic.List[object]
$warnings = New-Object System.Collections.Generic.List[object]

foreach ($readme in $readmes) {
    $relativePath = Get-RelativePath $readme.FullName
    $directory = Split-Path -Parent $readme.FullName
    $text = Get-Content -Raw -Encoding UTF8 -LiteralPath $readme.FullName
    $lines = ($text -split "`r?`n").Count
    $type = Get-ReadmeType $relativePath
    $maxLines = Get-MaxLines $type

    $documents.Add([pscustomobject]@{
        path = $relativePath
        type = $type
        line_count = $lines
        max_lines = $maxLines
    })

    if ($lines -gt $maxLines) {
        $warnings.Add([pscustomobject]@{
            path = $relativePath
            type = "OVERLONG"
            message = "README has $lines lines; budget for $type is $maxLines."
        })
    }

    if ($text -match "AGENTS\.md" -and $text -notmatch "README_First\.md") {
        $issues.Add([pscustomobject]@{
            path = $relativePath
            type = "CANONICAL_SOURCE_MISSING"
            message = "README mentions AGENTS.md but does not mention README_First.md."
        })
    }

    if ($text -match "(?<!n)px playwright") {
        $issues.Add([pscustomobject]@{
            path = $relativePath
            type = "COMMAND_INVALID"
            message = "Found 'px playwright'; expected 'npx playwright'."
        })
    }

    foreach ($pattern in $absolutePathPatterns) {
        if ($text -cmatch $pattern) {
            $issues.Add([pscustomobject]@{
                path = $relativePath
                type = "ABSOLUTE_PATH"
                message = "Found local machine path matching configured pattern."
            })
        }
    }

    foreach ($pattern in $secretPatterns) {
        if ($text -cmatch $pattern) {
            $issues.Add([pscustomobject]@{
                path = $relativePath
                type = "SECRET_EXPOSURE"
                message = "Found high-confidence secret-like text matching configured pattern."
            })
        }
    }

    foreach ($match in [regex]::Matches($text, '!?(?:\[[^\]]*\])\(([^)]+)\)')) {
        $target = $match.Groups[1].Value.Trim().Trim("<", ">")
        if ($target -eq "" -or $target -match "^(https?:|mailto:|#|app://)") {
            continue
        }

        $cleanTarget = ($target -split "#")[0]
        if ($cleanTarget -eq "") {
            continue
        }

        $cleanTarget = [uri]::UnescapeDataString($cleanTarget)
        $candidate = Join-Path $directory $cleanTarget
        if (-not (Test-Path -LiteralPath $candidate)) {
            $issues.Add([pscustomobject]@{
                path = $relativePath
                type = "PATH_INVALID"
                message = "Markdown link target does not exist: $target"
            })
        }
    }

    foreach ($line in ($text -split "`r?`n")) {
        if ($line -match '^\|\s*`([^`]+)`') {
            $entry = $Matches[1]
            if ($entry -match '[*?]' -or
                $entry -match '^YYYY|^0001|^xxx$|^<|^/|^http|^api/' -or
                $entry -match '\.\.\.' -or
                $entry -match '^[A-Z0-9_]+$') {
                continue
            }

            $candidate = Join-Path $directory $entry
            if (-not (Test-Path -LiteralPath $candidate)) {
                $issues.Add([pscustomobject]@{
                    path = $relativePath
                    type = "INDEX_DRIFT"
                    message = "Core table entry does not exist: $entry"
                })
            }
        }
    }
}

$summary = [pscustomobject]@{
    generated_at = (Get-Date).ToString("o")
    readme_count = $documents.Count
    issue_count = $issues.Count
    warning_count = $warnings.Count
    report_only = [bool]$ReportOnly
    fail_on_warnings = [bool]$FailOnWarnings
}

$report = [pscustomobject]@{
    summary = $summary
    issues = $issues.ToArray()
    warnings = $warnings.ToArray()
    documents = $documents.ToArray()
}

$outputFullPath = Join-Path $repoRoot $OutputPath
$outputDirectory = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputFullPath -Encoding UTF8

if ($issues.Count -gt 0) {
    $issues | Format-Table -AutoSize
    Write-Host "README contract check failed: $($issues.Count) issue(s). Evidence: $OutputPath"
    if (-not $ReportOnly) {
        exit 1
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "README contract check warnings: $($warnings.Count). Evidence: $OutputPath"
    if ($FailOnWarnings -and -not $ReportOnly) {
        exit 1
    }
}

Write-Host "README contract check passed: $($documents.Count) README files, $($warnings.Count) warning(s). Evidence: $OutputPath"
