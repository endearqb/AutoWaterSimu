param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = ""
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

function Get-LineCount {
    param([string]$Path)
    return @([System.IO.File]::ReadLines($Path)).Count
}

function Get-GoPackageDirs {
    param([string]$InternalRoot)
    $dirs = [System.Collections.Generic.HashSet[string]]::new()
    $resolvedRoot = (Resolve-Path $InternalRoot).Path.TrimEnd('\', '/')
    foreach ($file in Get-ChildItem -LiteralPath $InternalRoot -Recurse -File -Filter "*.go") {
        $resolvedDir = (Resolve-Path $file.DirectoryName).Path
        if (-not $resolvedDir.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }
        $relative = $resolvedDir.Substring($resolvedRoot.Length).TrimStart('\', '/')
        $normalized = ($relative -replace '\\', '/')
        if ([string]::IsNullOrWhiteSpace($normalized) -or $normalized -eq ".") {
            continue
        }
        $dirs.Add($normalized) | Out-Null
    }
    return @($dirs | Sort-Object)
}

function Get-MissingExpectedGoPackageDirs {
    param([string[]]$PackageDirs)
    $expected = @(
        "compute",
        "domain/workers",
        "platform/auth",
        "platform/config",
        "platform/contracts",
        "platform/httpx",
        "platform/metrics"
    )
    return @($expected | Where-Object { $_ -notin $PackageDirs })
}

function Get-StoreInterfaces {
    param([string]$StorePath)
    $interfaces = @{}
    $interfaceName = ""
    foreach ($line in Get-Content -LiteralPath $StorePath) {
        if ($line -match '^type\s+([A-Za-z][A-Za-z0-9_]*)\s+interface\s+\{') {
            $interfaceName = $Matches[1]
            $interfaces[$interfaceName] = [ordered]@{
                methods = [System.Collections.Generic.List[string]]::new()
                embeds = [System.Collections.Generic.List[string]]::new()
            }
            continue
        }
        if (-not [string]::IsNullOrWhiteSpace($interfaceName) -and $line -match '^\}') {
            $interfaceName = ""
            continue
        }
        if ([string]::IsNullOrWhiteSpace($interfaceName)) {
            continue
        }
        $trimmed = ($line -replace '//.*$', '').Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            continue
        }
        if ($trimmed -match '^([A-Za-z][A-Za-z0-9_]*)\s*\(') {
            $interfaces[$interfaceName]["methods"].Add($Matches[1]) | Out-Null
            continue
        }
        if ($trimmed -match '^([A-Za-z][A-Za-z0-9_]*)$') {
            $interfaces[$interfaceName]["embeds"].Add($Matches[1]) | Out-Null
        }
    }
    return $interfaces
}

function Resolve-InterfaceMethods {
    param(
        [hashtable]$Interfaces,
        [string]$InterfaceName,
        [string[]]$Seen = @()
    )
    if (-not $Interfaces.ContainsKey($InterfaceName)) {
        throw "Missing interface definition: $InterfaceName"
    }
    if ($InterfaceName -in $Seen) {
        $cycle = @($Seen + $InterfaceName) -join " -> "
        throw "Cyclic interface embedding detected: $cycle"
    }
    $methods = [System.Collections.Generic.List[string]]::new()
    foreach ($method in @($Interfaces[$InterfaceName]["methods"])) {
        if (-not $methods.Contains($method)) {
            $methods.Add($method) | Out-Null
        }
    }
    foreach ($embeddedInterface in @($Interfaces[$InterfaceName]["embeds"])) {
        foreach ($method in @(Resolve-InterfaceMethods -Interfaces $Interfaces -InterfaceName $embeddedInterface -Seen @($Seen + $InterfaceName))) {
            if (-not $methods.Contains($method)) {
                $methods.Add($method) | Out-Null
            }
        }
    }
    return @($methods)
}

function Get-InterfaceEmbeds {
    param(
        [hashtable]$Interfaces,
        [string]$InterfaceName
    )
    if (-not $Interfaces.ContainsKey($InterfaceName)) {
        throw "Missing interface definition: $InterfaceName"
    }
    return @($Interfaces[$InterfaceName]["embeds"])
}

function Get-InterfaceMethodSummary {
    param([hashtable]$Interfaces)
    return @(
        $Interfaces.Keys | Sort-Object | ForEach-Object {
            [ordered]@{
                interface = $_
                direct_method_count = @($Interfaces[$_]["methods"]).Count
                embedded_interfaces = @($Interfaces[$_]["embeds"])
            }
        }
    )
}

function Get-StoreMethods {
    param([string]$StorePath)
    $interfaces = Get-StoreInterfaces -StorePath $StorePath
    return @(Resolve-InterfaceMethods -Interfaces $interfaces -InterfaceName "Store")
}

function Get-StoreEmbeddedInterfaces {
    param([string]$StorePath)
    $interfaces = Get-StoreInterfaces -StorePath $StorePath
    return @(Get-InterfaceEmbeds -Interfaces $interfaces -InterfaceName "Store")
}

function Get-StoreInterfaceSummary {
    param([string]$StorePath)
    $interfaces = Get-StoreInterfaces -StorePath $StorePath
    return @(Get-InterfaceMethodSummary -Interfaces $interfaces)
}

function Get-MissingExpectedStoreEmbeds {
    param([string[]]$EmbeddedInterfaces)
    $expected = @(
        "JobStore",
        "WorkerStore",
        "ArtifactMetadataStore",
        "ArchiveMetadataStore",
        "ModelRunStore",
        "BenchmarkRunStore",
        "ModelCatalogStore",
        "ProcessGraphStore",
        "SimulationInputStore",
        "DraftConfirmationStore",
        "ResultExplanationStore",
        "MetricsStore"
    )
    return @($expected | Where-Object { $_ -notin $EmbeddedInterfaces })
}

function Get-ImplementedMethods {
    param(
        [string]$Path,
        [string]$ReceiverType
    )
    $text = Get-Content -LiteralPath $Path -Raw
    $escaped = [System.Text.RegularExpressions.Regex]::Escape($ReceiverType)
    $pattern = "func\s+\(\s*\w+\s+\*$escaped\s*\)\s+([A-Za-z][A-Za-z0-9_]*)\s*\("
    return @([regex]::Matches($text, $pattern) | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
}

function Get-ServiceStoreCalls {
    param(
        [string[]]$ServicePaths,
        [string[]]$StoreMethods
    )
    $storeMethodSet = @{}
    foreach ($method in $StoreMethods) {
        $storeMethodSet[$method] = $true
    }
    $repositoryFields = @(
        "store",
        "metadata",
        "archiveMetadata",
        "inputs",
        "processGraphs",
        "catalogs",
        "benchmarkRuns",
        "modelRuns",
        "workers",
        "jobs",
        "confirmations",
        "explanations",
        "metrics"
    )
    $repositoryFieldPattern = ($repositoryFields | ForEach-Object { [System.Text.RegularExpressions.Regex]::Escape($_) }) -join "|"
    $calls = @{}
    $sources = @{}
    foreach ($path in $ServicePaths) {
        $text = Get-Content -LiteralPath $path -Raw
        $fileName = Split-Path -Leaf $path
        foreach ($match in [regex]::Matches($text, "\b[A-Za-z][A-Za-z0-9_]*\.(?:$repositoryFieldPattern)\.([A-Za-z][A-Za-z0-9_]*)\s*\(")) {
            $name = $match.Groups[1].Value
            if (-not $storeMethodSet.ContainsKey($name)) {
                continue
            }
            if (-not $calls.ContainsKey($name)) {
                $calls[$name] = 0
            }
            if (-not $sources.ContainsKey($name)) {
                $sources[$name] = [System.Collections.Generic.List[string]]::new()
            }
            $calls[$name] += 1
            if (-not $sources[$name].Contains($fileName)) {
                $sources[$name].Add($fileName) | Out-Null
            }
        }
    }
    return [ordered]@{
        calls = $calls
        sources = $sources
    }
}

function Split-TopLevelParameters {
    param([string]$ParameterText)
    $items = [System.Collections.Generic.List[string]]::new()
    $current = [System.Text.StringBuilder]::new()
    $depth = 0
    foreach ($ch in $ParameterText.ToCharArray()) {
        if ($ch -eq "," -and $depth -eq 0) {
            $value = $current.ToString().Trim()
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                $items.Add($value) | Out-Null
            }
            $current.Clear() | Out-Null
            continue
        }
        if ($ch -in @("(", "[", "{")) {
            $depth += 1
        } elseif ($ch -in @(")", "]", "}")) {
            if ($depth -gt 0) {
                $depth -= 1
            }
        }
        $current.Append($ch) | Out-Null
    }
    $last = $current.ToString().Trim()
    if (-not [string]::IsNullOrWhiteSpace($last)) {
        $items.Add($last) | Out-Null
    }
    return @($items)
}

function Get-ConstructorParamType {
    param([string]$Parameter)
    $trimmed = ($Parameter -replace '\s+', ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
        return ""
    }
    if ($trimmed -match '^[A-Za-z_][A-Za-z0-9_]*\s+(.+)$') {
        return $Matches[1].Trim()
    }
    return $trimmed
}

function Test-StoreLikeParamType {
    param([string]$TypeName)
    $normalized = $TypeName.Trim()
    return $normalized -match '^(\*|\[\])?[A-Za-z][A-Za-z0-9_]*(Store|Stores)$'
}

function Get-ServiceConstructorBoundaries {
    param([string[]]$ServicePaths)
    $constructors = [System.Collections.Generic.List[object]]::new()
    foreach ($path in $ServicePaths) {
        $text = Get-Content -LiteralPath $path -Raw
        $fileName = Split-Path -Leaf $path
        foreach ($match in [regex]::Matches($text, 'func\s+(New[A-Za-z0-9_]*Service)\s*\((.*?)\)\s*\*?[A-Za-z][A-Za-z0-9_]*', [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
            $name = $match.Groups[1].Value
            $params = @(Split-TopLevelParameters -ParameterText $match.Groups[2].Value)
            $storeParams = [System.Collections.Generic.List[object]]::new()
            $aggregateStoreParams = [System.Collections.Generic.List[object]]::new()
            foreach ($param in $params) {
                $typeName = Get-ConstructorParamType -Parameter $param
                if ([string]::IsNullOrWhiteSpace($typeName)) {
                    continue
                }
                if (-not (Test-StoreLikeParamType -TypeName $typeName)) {
                    continue
                }
                $storeParam = [ordered]@{
                    parameter = $param
                    type = $typeName
                }
                $storeParams.Add($storeParam) | Out-Null
                if ($typeName -eq "Store") {
                    $aggregateStoreParams.Add($storeParam) | Out-Null
                }
            }
            $isPublicCompatibilityConstructor = $name -eq "NewService"
            $constructors.Add([ordered]@{
                name = $name
                file = $fileName
                is_public_compatibility_constructor = $isPublicCompatibilityConstructor
                store_like_parameter_count = $storeParams.Count
                store_like_parameters = @($storeParams)
                aggregate_store_parameters = @($aggregateStoreParams)
                exceeds_internal_store_parameter_limit = (-not $isPublicCompatibilityConstructor -and $storeParams.Count -gt 3)
                accepts_aggregate_store = (-not $isPublicCompatibilityConstructor -and $aggregateStoreParams.Count -gt 0)
            }) | Out-Null
        }
    }
    return @($constructors)
}

function ConvertTo-Domain {
    param([string]$Method)
    switch -Regex ($Method) {
        '^(FindJobByID|FindJobByIdempotency|InsertJob|ListJobs|Events|CancelJob|CompleteJob|TimeoutExpired)$' { return "jobs" }
        '^(UpsertWorker|FindWorkerByID|ClaimNext|Heartbeat)$' { return "workers" }
        '^(Artifacts|FindArtifact|InsertArtifact|ListArtifactRetentionCandidates|ArtifactReferences|DeleteArtifact)$' { return "artifacts" }
        '^(UpsertArtifactArchive|FindArtifactArchive)$' { return "archive_metadata" }
        '^(InsertModelRuns|FindModelRun|ListModelRuns|ModelRuns)$' { return "model_runs" }
        '^(UpsertBenchmarkRun|FindBenchmarkRun|ListBenchmarkRuns)$' { return "benchmark_runs" }
        '^(UpsertModelCatalog|LatestModelCatalog|ListModelCatalogSnapshots)$' { return "model_catalog" }
        '^(UpsertProcessGraph|FindProcessGraph)$' { return "process_graphs" }
        '^(UpsertSimulationInput|FindSimulationInput)$' { return "simulation_inputs" }
        '^(UpsertDraftConfirmation|FindDraftConfirmation)$' { return "draft_confirmations" }
        '^(UpsertResultExplanation|FindResultExplanation|UpdateResultExplanationReview|PublishResultExplanation)$' { return "result_explanations" }
        '^Metrics$' { return "metrics" }
        default { return "unclassified" }
    }
}

function Add-MethodToDomain {
    param(
        [hashtable]$Domains,
        [string]$Domain,
        [string]$Method,
        [int]$CallCount,
        [string[]]$CallSources = @()
    )
    if (-not $Domains.ContainsKey($Domain)) {
        $Domains[$Domain] = [System.Collections.Generic.List[object]]::new()
    }
    $Domains[$Domain].Add([ordered]@{
        method = $Method
        service_call_count = $CallCount
        service_call_sources = $CallSources
    }) | Out-Null
}

$root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $root "tmp\architecture-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$computeDir = Join-Path $root "apps\api\internal\compute"
$internalDir = Join-Path $root "apps\api\internal"
$domainDir = Join-Path $internalDir "domain"
$platformDir = Join-Path $internalDir "platform"
$storePath = Join-Path $computeDir "store.go"
$postgresPath = Join-Path $computeDir "postgres.go"
$servicePath = Join-Path $computeDir "service.go"
foreach ($path in @($computeDir, $storePath, $postgresPath, $servicePath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing required Compute API path: $path"
    }
}

$goFiles = @(Get-ChildItem -LiteralPath $computeDir -File -Filter "*.go" | Sort-Object Name)
$serviceLayerFiles = @(
    $goFiles | Where-Object {
        -not $_.Name.EndsWith("_test.go") -and $_.Name -notin @("store.go", "postgres.go")
    }
)
$domainLayerFiles = @()
if (Test-Path -LiteralPath $domainDir) {
    $domainLayerFiles = @(
        Get-ChildItem -LiteralPath $domainDir -Recurse -File -Filter "*.go" | Where-Object {
            -not $_.Name.EndsWith("_test.go")
        } | Sort-Object FullName
    )
}
$platformLayerFiles = @()
if (Test-Path -LiteralPath $platformDir) {
    $platformLayerFiles = @(
        Get-ChildItem -LiteralPath $platformDir -Recurse -File -Filter "*.go" | Where-Object {
            -not $_.Name.EndsWith("_test.go")
        } | Sort-Object FullName
    )
}
$serviceAuditFiles = @($serviceLayerFiles + $domainLayerFiles + $platformLayerFiles)
$fileStats = @(
    $goFiles | ForEach-Object {
        [ordered]@{
            file = $_.Name
            lines = Get-LineCount -Path $_.FullName
            is_test = $_.Name.EndsWith("_test.go")
        }
    }
)

$storeMethods = @(Get-StoreMethods -StorePath $storePath)
$storeEmbeddedInterfaces = @(Get-StoreEmbeddedInterfaces -StorePath $storePath)
$storeInterfaceSummary = @(Get-StoreInterfaceSummary -StorePath $storePath)
$missingExpectedStoreEmbeds = @(Get-MissingExpectedStoreEmbeds -EmbeddedInterfaces $storeEmbeddedInterfaces)
$memoryMethods = Get-ImplementedMethods -Path $storePath -ReceiverType "MemoryStore"
$postgresMethods = Get-ImplementedMethods -Path $postgresPath -ReceiverType "PostgresStore"
$serviceStoreCalls = Get-ServiceStoreCalls -ServicePaths @($serviceAuditFiles | ForEach-Object { $_.FullName }) -StoreMethods $storeMethods
$serviceCalls = $serviceStoreCalls["calls"]
$serviceCallSources = $serviceStoreCalls["sources"]
$serviceConstructorBoundaries = @(Get-ServiceConstructorBoundaries -ServicePaths @($serviceAuditFiles | ForEach-Object { $_.FullName }))
$serviceConstructorViolations = @(
    $serviceConstructorBoundaries | Where-Object {
        $_["accepts_aggregate_store"] -or $_["exceeds_internal_store_parameter_limit"]
    }
)
$internalPackageDirs = @(Get-GoPackageDirs -InternalRoot $internalDir)
$missingExpectedPackageDirs = @(Get-MissingExpectedGoPackageDirs -PackageDirs $internalPackageDirs)

$domains = @{}
foreach ($method in $storeMethods) {
    $domain = ConvertTo-Domain -Method $method
    $callCount = if ($serviceCalls.ContainsKey($method)) { $serviceCalls[$method] } else { 0 }
    $callSources = if ($serviceCallSources.ContainsKey($method)) { @($serviceCallSources[$method]) } else { @() }
    Add-MethodToDomain -Domains $domains -Domain $domain -Method $method -CallCount $callCount -CallSources $callSources
}

$domainSummaries = @(
    $domains.Keys | Sort-Object | ForEach-Object {
        $methods = @($domains[$_])
        $serviceCallCount = 0
        foreach ($method in $methods) {
            $serviceCallCount += [int]$method["service_call_count"]
        }
        [ordered]@{
            domain = $_
            method_count = $methods.Count
            service_call_count = $serviceCallCount
            methods = $methods
        }
    }
)

$missingMemory = @($storeMethods | Where-Object { $_ -notin $memoryMethods })
$missingPostgres = @($storeMethods | Where-Object { $_ -notin $postgresMethods })
$unclassified = @()
if ($domains.ContainsKey("unclassified")) {
    $unclassified = @($domains["unclassified"] | ForEach-Object { $_["method"] })
}
$largeFiles = @($fileStats | Where-Object { (-not $_.is_test -and $_.lines -gt 800) -or ($_.is_test -and $_.lines -gt 1500) })

$report = [ordered]@{
    schema_version = "autowatersimu_compute_api_boundary_audit.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $root
    package = "apps/api/internal/compute"
    store_interface = [ordered]@{
        method_count = $storeMethods.Count
        methods = $storeMethods
        embedded_interfaces = $storeEmbeddedInterfaces
        missing_expected_embedded_interfaces = $missingExpectedStoreEmbeds
        interface_summary = $storeInterfaceSummary
        service_layer_files_scanned = @($serviceAuditFiles | ForEach-Object { $_.Name })
        domain_summaries = $domainSummaries
        missing_memory_store_methods = $missingMemory
        missing_postgres_store_methods = $missingPostgres
        unclassified_methods = $unclassified
    }
    service_constructor_boundaries = [ordered]@{
        max_internal_store_like_parameters = 3
        constructors = $serviceConstructorBoundaries
        violations = $serviceConstructorViolations
    }
    package_boundaries = [ordered]@{
        internal_root = "apps/api/internal"
        package_dirs = $internalPackageDirs
        missing_expected_package_dirs = $missingExpectedPackageDirs
    }
    file_stats = $fileStats
    large_files = $largeFiles
    recommended_split_order = @(
        "artifacts + archive_metadata",
        "simulation_inputs + process_graphs",
        "draft_confirmations + result_explanations",
        "model_catalog + benchmark_runs + model_runs",
        "workers",
        "evidence governance",
        "jobs",
        "metrics"
    )
    notes = @(
        "This is a read-only architecture audit; it verifies that the aggregate Store embeds the expected domain interfaces.",
        "Public Service constructors can still accept the aggregate Store while narrowed internal services receive domain-specific interfaces.",
        "Internal domain service constructors must not accept aggregate Store and should expose at most 3 store-like constructor parameters.",
        "The package movement guardrail expects platform helpers under apps/api/internal/platform, including contracts validation, and the first worker domain package under apps/api/internal/domain/workers.",
        "Large file thresholds are advisory: non-test files >800 lines and test files >1500 lines."
    )
}

$evidencePath = Join-Path $EvidenceDir "compute-api-boundary.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8

Write-Host "Compute API boundary audit: $evidencePath"
Write-Host "Store interface methods: $($storeMethods.Count)"
Write-Host "Store embedded interfaces: $($storeEmbeddedInterfaces.Count)"
Write-Host "Domain groups: $($domainSummaries.Count)"
Write-Host "Service constructors audited: $($serviceConstructorBoundaries.Count)"
Write-Host "Internal Go package dirs: $($internalPackageDirs.Count)"
if ($missingMemory.Count -gt 0 -or $missingPostgres.Count -gt 0 -or $unclassified.Count -gt 0 -or $missingExpectedStoreEmbeds.Count -gt 0 -or $serviceConstructorViolations.Count -gt 0 -or $missingExpectedPackageDirs.Count -gt 0) {
    if ($missingMemory.Count -gt 0) {
        Write-Host "Missing MemoryStore methods: $($missingMemory -join ', ')"
    }
    if ($missingPostgres.Count -gt 0) {
        Write-Host "Missing PostgresStore methods: $($missingPostgres -join ', ')"
    }
    if ($unclassified.Count -gt 0) {
        Write-Host "Unclassified Store methods: $($unclassified -join ', ')"
    }
    if ($missingExpectedStoreEmbeds.Count -gt 0) {
        Write-Host "Missing expected Store embedded interfaces: $($missingExpectedStoreEmbeds -join ', ')"
    }
    if ($serviceConstructorViolations.Count -gt 0) {
        $violationNames = @($serviceConstructorViolations | ForEach-Object { $_["name"] })
        Write-Host "Service constructor boundary violations: $($violationNames -join ', ')"
    }
    if ($missingExpectedPackageDirs.Count -gt 0) {
        Write-Host "Missing expected internal Go package dirs: $($missingExpectedPackageDirs -join ', ')"
    }
    exit 1
}
Write-Host "Boundary audit passed."
