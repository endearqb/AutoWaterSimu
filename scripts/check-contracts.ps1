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

function Test-IsWindows {
    return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
}

function Resolve-NativeCommand {
    param([string]$Name)
    if ((Test-IsWindows) -and ($Name -in @("npm", "npx"))) {
        return "$Name.cmd"
    }
    return $Name
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

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
}

function Invoke-CheckedCommand {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )

    Write-Host "==> $Name"
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    try {
        $argumentList = ($Arguments | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
        $process = Start-Process -FilePath $Executable -ArgumentList $argumentList -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $stdout = [string](Get-Content -Path $stdoutFile -Raw)
        $stderr = [string](Get-Content -Path $stderrFile -Raw)
        if (-not [string]::IsNullOrWhiteSpace($stdout)) {
            Write-Host $stdout.TrimEnd()
        }
        if (-not [string]::IsNullOrWhiteSpace($stderr)) {
            Write-Host $stderr.TrimEnd()
        }
        if ($process.ExitCode -ne 0) {
            throw "$Name failed with exit code $($process.ExitCode)"
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
}

function Read-Json {
    param([string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Compare-StringSet {
    param(
        [string[]]$Expected,
        [string[]]$Actual,
        [string]$Label
    )

    $expectedSorted = @($Expected | Sort-Object)
    $actualSorted = @($Actual | Sort-Object)
    $missing = @($expectedSorted | Where-Object { $_ -notin $actualSorted })
    $extra = @($actualSorted | Where-Object { $_ -notin $expectedSorted })
    if (($missing.Count -gt 0) -or ($extra.Count -gt 0)) {
        throw "$Label mismatch. Missing: $($missing -join ', '); Extra: $($extra -join ', ')"
    }
}

function Test-ContractsRegistry {
    param([string]$Root)

    $contractsDir = Join-Path $Root "contracts"
    $registryPath = Join-Path $contractsDir "registry.json"
    if (-not (Test-Path -LiteralPath $registryPath)) {
        throw "Missing contracts registry: $registryPath"
    }

    $registry = Read-Json -Path $registryPath
    if ($registry.schema_version -ne "contracts_registry.v1") {
        throw "registry.json schema_version must be contracts_registry.v1"
    }

    $contracts = @($registry.contracts)
    if ($contracts.Count -eq 0) {
        throw "registry.json must list at least one contract"
    }

    $schemaFiles = @(Get-ChildItem -LiteralPath $contractsDir -Filter "*.v1.json" -File | Sort-Object Name)
    $registeredSchemaFiles = @($contracts | ForEach-Object { [string]$_.schema_file })
    Compare-StringSet -Expected @($schemaFiles | ForEach-Object { $_.Name }) -Actual $registeredSchemaFiles -Label "registered schema files"

    $allListedValid = [System.Collections.Generic.List[string]]::new()
    $allListedInvalid = [System.Collections.Generic.List[string]]::new()
    $validDir = Join-Path $contractsDir "examples\valid"
    $invalidDir = Join-Path $contractsDir "examples\invalid"

    foreach ($contract in $contracts) {
        foreach ($property in @("schema_version", "schema_file", "consumers", "valid_examples", "invalid_examples", "compatibility_notes", "breaking_change_policy")) {
            if (-not ($contract.PSObject.Properties.Name -contains $property)) {
                throw "Registry entry is missing '$property': $($contract | ConvertTo-Json -Compress)"
            }
        }

        $schemaFile = [string]$contract.schema_file
        $schemaPath = Join-Path $contractsDir $schemaFile
        if (-not (Test-Path -LiteralPath $schemaPath)) {
            throw "Registered schema file does not exist: $schemaFile"
        }

        $schema = Read-Json -Path $schemaPath
        $expectedSchemaVersion = [System.IO.Path]::GetFileNameWithoutExtension($schemaFile)
        $schemaConst = [string]$schema.properties.schema_version.const
        if ($contract.schema_version -ne $expectedSchemaVersion) {
            throw "$schemaFile registry schema_version '$($contract.schema_version)' does not match filename '$expectedSchemaVersion'"
        }
        if ($schemaConst -ne $expectedSchemaVersion) {
            throw "$schemaFile schema const '$schemaConst' does not match filename '$expectedSchemaVersion'"
        }

        if (@($contract.consumers).Count -eq 0) {
            throw "$schemaFile must list at least one consumer"
        }
        if ([string]::IsNullOrWhiteSpace([string]$contract.compatibility_notes)) {
            throw "$schemaFile must include compatibility_notes"
        }
        $policy = [string]$contract.breaking_change_policy
        if ([string]::IsNullOrWhiteSpace($policy)) {
            throw "$schemaFile must include breaking_change_policy"
        }
        if (-not ($registry.breaking_change_policies.PSObject.Properties.Name -contains $policy)) {
            throw "$schemaFile references unknown breaking_change_policy '$policy'"
        }

        foreach ($relativeExample in @($contract.valid_examples)) {
            $examplePath = Join-Path $contractsDir $relativeExample
            if (-not (Test-Path -LiteralPath $examplePath)) {
                throw "$schemaFile lists missing valid example: $relativeExample"
            }
            if (-not $relativeExample.EndsWith(".$schemaFile")) {
                throw "$schemaFile valid example does not end with .$schemaFile`: $relativeExample"
            }
            $allListedValid.Add($relativeExample.Replace("\", "/")) | Out-Null
        }

        foreach ($relativeExample in @($contract.invalid_examples)) {
            $examplePath = Join-Path $contractsDir $relativeExample
            if (-not (Test-Path -LiteralPath $examplePath)) {
                throw "$schemaFile lists missing invalid example: $relativeExample"
            }
            if (-not $relativeExample.EndsWith(".$schemaFile")) {
                throw "$schemaFile invalid example does not end with .$schemaFile`: $relativeExample"
            }
            $allListedInvalid.Add($relativeExample.Replace("\", "/")) | Out-Null
        }
    }

    $validExamples = @(Get-ChildItem -LiteralPath $validDir -Filter "*.v1.json" -File | Sort-Object Name | ForEach-Object { "examples/valid/$($_.Name)" })
    $invalidExamples = @(Get-ChildItem -LiteralPath $invalidDir -Filter "*.v1.json" -File | Sort-Object Name | ForEach-Object { "examples/invalid/$($_.Name)" })
    Compare-StringSet -Expected $validExamples -Actual @($allListedValid) -Label "registered valid examples"
    Compare-StringSet -Expected $invalidExamples -Actual @($allListedInvalid) -Label "registered invalid examples"

    Write-Host "Contracts registry covers $($schemaFiles.Count) schemas, $($validExamples.Count) valid examples, and $($invalidExamples.Count) invalid examples."
    return $registry
}

function Test-CodegenManifest {
    param(
        [string]$Root,
        [object]$Registry
    )

    $manifestPath = Join-Path $Root "contracts\codegen\manifest.json"
    $readmePath = Join-Path $Root "contracts\codegen\README.md"
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "Missing contracts codegen manifest: $manifestPath"
    }
    if (-not (Test-Path -LiteralPath $readmePath)) {
        throw "Missing contracts codegen README: $readmePath"
    }

    $manifest = Read-Json -Path $manifestPath
    if ($manifest.schema_version -ne "contracts_codegen_manifest.v1") {
        throw "contracts/codegen/manifest.json schema_version must be contracts_codegen_manifest.v1"
    }
    if ($manifest.source_of_truth -ne "contracts/registry.json") {
        throw "contracts/codegen/manifest.json source_of_truth must be contracts/registry.json"
    }

    $registrySchemaVersions = @($Registry.contracts | ForEach-Object { [string]$_.schema_version })
    $coveredSchemaVersions = @($manifest.covered_schema_versions | ForEach-Object { [string]$_ })
    Compare-StringSet -Expected $registrySchemaVersions -Actual $coveredSchemaVersions -Label "codegen manifest schema coverage"

    $requiredTargets = @("typescript", "openapi", "go", "python", "rust")
    foreach ($target in $requiredTargets) {
        if (-not ($manifest.target_decisions.PSObject.Properties.Name -contains $target)) {
            throw "contracts/codegen/manifest.json missing target decision '$target'"
        }
        $decision = $manifest.target_decisions.$target
        foreach ($property in @("status", "output", "command", "drift_gate", "reason")) {
            if (-not ($decision.PSObject.Properties.Name -contains $property)) {
                throw "contracts/codegen target '$target' missing '$property'"
            }
            if ([string]::IsNullOrWhiteSpace([string]$decision.$property)) {
                throw "contracts/codegen target '$target' has empty '$property'"
            }
        }
    }

    Write-Host "Contracts codegen manifest covers $($coveredSchemaVersions.Count) schemas and $($requiredTargets.Count) target decisions."
}

function Normalize-ComputeClientWhitespace {
    param([string]$Root)

    $clientDir = Join-Path $Root "frontend\src\client\compute"
    if (-not (Test-Path -LiteralPath $clientDir)) {
        throw "Missing generated compute client directory: $clientDir"
    }

    $encoding = [System.Text.UTF8Encoding]::new($false)
    $changedPaths = [System.Collections.Generic.List[string]]::new()
    $files = Get-ChildItem -LiteralPath $clientDir -Recurse -Filter "*.ts" -File
    foreach ($file in $files) {
        $text = [System.IO.File]::ReadAllText($file.FullName)
        $normalized = [System.Text.RegularExpressions.Regex]::Replace($text, '[ \t]+(?=\r?\n)', "")
        if (-not $normalized.EndsWith("`n")) {
            $lineEnding = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
            $normalized = $normalized + $lineEnding
        }
        if ($normalized -ne $text) {
            [System.IO.File]::WriteAllText($file.FullName, $normalized, $encoding)
            $relativePath = $file.FullName.Substring($Root.Length + 1).Replace("\", "/")
            $changedPaths.Add($relativePath) | Out-Null
        }
    }

    if ($changedPaths.Count -gt 0) {
        Write-Host "Normalized generated compute client whitespace in $($changedPaths.Count) file(s): $($changedPaths -join ', ')"
    } else {
        Write-Host "No generated compute client whitespace changes found."
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
$python = Resolve-Python -Root $Root
$npm = Resolve-NativeCommand -Name "npm"

Write-Host "AutoWaterSimu Next contract gate"
Write-Host "Repo root: $Root"

$registry = Test-ContractsRegistry -Root $Root
Test-CodegenManifest -Root $Root -Registry $registry
Invoke-CheckedCommand -Name "contract schema tests" -WorkingDirectory $Root -Executable $python -Arguments @("-m", "pytest", "contracts\tests", "-q")
Invoke-CheckedCommand -Name "compute client generation" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npm -Arguments @("run", "generate-compute-client")
Normalize-ComputeClientWhitespace -Root $Root
Invoke-CheckedCommand -Name "compute client drift gate" -WorkingDirectory $Root -Executable "git" -Arguments @("diff", "--exit-code", "--", "apps/api/openapi/compute.openapi.json", "frontend/src/client/compute")

Write-Host "Contract gate passed."
