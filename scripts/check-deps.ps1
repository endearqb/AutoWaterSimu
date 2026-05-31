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

function ConvertTo-RelativePath {
    param(
        [string]$Root,
        [string]$Path
    )
    $rootPath = (Resolve-Path $Root).Path.TrimEnd([char[]]@("\", "/"))
    $fullPath = (Resolve-Path $Path).Path
    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath.Substring($rootPath.Length).TrimStart([char[]]@("\", "/"))
    }
    return $fullPath
}

function Get-SearchFiles {
    param(
        [string]$Root,
        [string[]]$RelativePaths
    )
    $excludedSegments = @(
        "\node_modules\",
        "\dist\",
        "\build\",
        "\.venv\",
        "\.git\",
        "\.pytest_cache\",
        "\target\",
        "\tmp\"
    )
    $files = [System.Collections.Generic.List[object]]::new()
    foreach ($relativePath in $RelativePaths) {
        $path = Join-Path $Root $relativePath
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }
        Get-ChildItem -LiteralPath $path -Recurse -File | ForEach-Object {
            $fullName = $_.FullName
            $normalized = $fullName.Replace("/", "\")
            if ($_.Extension -eq ".md") {
                return
            }
            if ($normalized.EndsWith("\contracts\registry.json", [System.StringComparison]::OrdinalIgnoreCase)) {
                return
            }
            if ($normalized.EndsWith("\contracts\codegen\manifest.json", [System.StringComparison]::OrdinalIgnoreCase)) {
                return
            }
            foreach ($segment in $excludedSegments) {
                if ($normalized.IndexOf($segment, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                    return
                }
            }
            $files.Add($_) | Out-Null
        }
    }
    return @($files)
}

function Invoke-DependencyRule {
    param(
        [string]$Root,
        [string]$RuleName,
        [string[]]$RelativePaths,
        [string]$Pattern,
        [System.Collections.Generic.List[object]]$Violations
    )
    $files = Get-SearchFiles -Root $Root -RelativePaths $RelativePaths
    if ($files.Count -eq 0) {
        return
    }
    $matches = Select-String -LiteralPath ($files | ForEach-Object { $_.FullName }) -Pattern $Pattern -AllMatches
    foreach ($match in $matches) {
        $relativePath = ConvertTo-RelativePath -Root $Root -Path $match.Path
        $matchText = "{0}:{1}:{2}" -f $relativePath, $match.LineNumber, $match.Line.Trim()
        $Violations.Add([ordered]@{
            rule = $RuleName
            match = $matchText
        }) | Out-Null
    }
}

$root = Resolve-RepoRoot -InputRoot $RepoRoot
$violations = [System.Collections.Generic.List[object]]::new()

Invoke-DependencyRule `
    -Root $root `
    -RuleName "contracts-must-not-depend-on-runtime" `
    -RelativePaths @("contracts") `
    -Pattern 'apps[/\\]api|apps[/\\]desktop|frontend[/\\]src|backend[/\\]app|services[/\\]simulation-worker|from\s+backend|autowatersimu/apps/api' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "apps-api-must-not-import-legacy-backend" `
    -RelativePaths @("apps/api") `
    -Pattern 'backend[/\\]app|from\s+backend|autowatersimu/backend' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "apps-api-platform-must-not-import-compute-domain" `
    -RelativePaths @("apps/api/internal/platform") `
    -Pattern 'apps[/\\]api[/\\]internal[/\\]compute|autowatersimu/apps/api/internal/compute' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "apps-api-domain-must-not-import-compute-package" `
    -RelativePaths @("apps/api/internal/domain") `
    -Pattern 'apps[/\\]api[/\\]internal[/\\]compute|autowatersimu/apps/api/internal/compute' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "apps-desktop-must-not-import-legacy-frontend" `
    -RelativePaths @("apps/desktop") `
    -Pattern 'frontend[/\\]src|from\s+[''"].*frontend[/\\]|import\s+.*frontend[/\\]' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "frontend-routes-components-must-not-import-generated-compute-client" `
    -RelativePaths @("frontend/src/routes", "frontend/src/components") `
    -Pattern 'client/compute|@/client/compute|src/client/compute|\.\./.*client/compute' `
    -Violations $violations

Invoke-DependencyRule `
    -Root $root `
    -RuleName "legacy-backend-must-not-depend-on-next-runtime" `
    -RelativePaths @("backend/app") `
    -Pattern 'apps[/\\]api|apps[/\\]desktop|services[/\\]simulation-worker|frontend[/\\]src[/\\]client[/\\]compute' `
    -Violations $violations

if ($violations.Count -gt 0) {
    Write-Host "Dependency boundary violations found:"
    foreach ($violation in $violations) {
        Write-Host "- [$($violation.rule)] $($violation.match)"
    }
    exit 1
}

Write-Host "Dependency boundary checks passed."
