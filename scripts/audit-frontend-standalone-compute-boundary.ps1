$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$FrontendSrc = Join-Path $RepoRoot "frontend\src"
$EvidenceDir = Join-Path $RepoRoot "tmp\architecture-evidence"
$EvidencePath = Join-Path $EvidenceDir "frontend-standalone-compute-boundary.json"

$computeServices = @(
  "MaterialBalanceService",
  "Asm1Service",
  "Asm1SlimService",
  "Asm3Service",
  "UdmService"
)

$files = Get-ChildItem -Path $FrontendSrc -Recurse -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notmatch "\\frontend\\src\\client\\" -and
    $_.FullName -notmatch "\\frontend\\src\\client$"
  }

$staticImportViolations = @()
$directCallViolations = @()
$websocketRuntimeImports = @()
$standaloneRuntimeViolations = @()

foreach ($file in $files) {
  $relativePath = Resolve-Path -Path $file.FullName -Relative
  $lines = Get-Content -Path $file.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $lineNo = $i + 1

    if ($line -cmatch "from\s+['""][^'""]*client[/\\]sdk\.gen['""]") {
      foreach ($service in $computeServices) {
        if ($line -cmatch "\b$service\b") {
          $staticImportViolations += [pscustomobject]@{
            file = $relativePath
            line = $lineNo
            service = $service
            text = $line.Trim()
          }
        }
      }
    }

    foreach ($service in $computeServices) {
      if ($line -cmatch "\b$service\s*\.") {
        $directCallViolations += [pscustomobject]@{
          file = $relativePath
          line = $lineNo
          service = $service
          text = $line.Trim()
        }
      }
    }

    if (
      $file.Name -ne "websocketService.ts" -and
      $line -cmatch "websocketService"
    ) {
      $websocketRuntimeImports += [pscustomobject]@{
        file = $relativePath
        line = $lineNo
        text = $line.Trim()
      }
    }
  }
}

$repoRootResolved = (Resolve-Path -Path $RepoRoot).Path
function Get-RepoRelativePath {
  param([string]$Path)
  $resolved = (Resolve-Path -Path $Path).Path
  return $resolved.Substring($repoRootResolved.Length + 1)
}

function Resolve-FrontendImport {
  param(
    [string]$FromFile,
    [string]$Specifier
  )

  $basePath = $null
  if ($Specifier.StartsWith("@/")) {
    $basePath = Join-Path $FrontendSrc $Specifier.Substring(2)
  } elseif ($Specifier.StartsWith(".")) {
    $basePath = Join-Path (Split-Path -Path $FromFile -Parent) $Specifier
  } else {
    return $null
  }

  $candidates = @(
    $basePath,
    "$basePath.ts",
    "$basePath.tsx",
    "$basePath\index.ts",
    "$basePath\index.tsx"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -Path $candidate -PathType Leaf) {
      return (Resolve-Path -Path $candidate).Path
    }
  }
  return $null
}

function Get-StaticImportSpecifiers {
  param([string]$Path)

  $text = Get-Content -Path $Path -Raw
  $matches = [regex]::Matches(
    $text,
    "(?m)^\s*import\s+(?!type\b)(?:[^'\""]+?\s+from\s+)?['\""]([^'\""]+)['\""]"
  )
  foreach ($match in $matches) {
    $match.Groups[1].Value
  }
}

$standaloneEntryFiles = @(
  (Join-Path $FrontendSrc "main.tsx"),
  (Join-Path $FrontendSrc "standaloneRouteTree.tsx")
)
$standaloneReachableFiles = New-Object 'System.Collections.Generic.HashSet[string]'
$standaloneQueue = New-Object 'System.Collections.Generic.Queue[string]'
foreach ($entryFile in $standaloneEntryFiles) {
  if (Test-Path -Path $entryFile -PathType Leaf) {
    $standaloneQueue.Enqueue((Resolve-Path -Path $entryFile).Path)
  } else {
    $standaloneRuntimeViolations += [pscustomobject]@{
      file = Get-RepoRelativePath -Path $FrontendSrc
      line = 0
      issue = "missing_entry"
      text = $entryFile
    }
  }
}

while ($standaloneQueue.Count -gt 0) {
  $currentFile = $standaloneQueue.Dequeue()
  if (-not $standaloneReachableFiles.Add($currentFile)) {
    continue
  }

  foreach ($specifier in Get-StaticImportSpecifiers -Path $currentFile) {
    $resolved = Resolve-FrontendImport -FromFile $currentFile -Specifier $specifier
    if ($null -eq $resolved) {
      continue
    }

    $relativePath = Get-RepoRelativePath -Path $resolved
    if ($relativePath -match "^frontend\\src\\client\\(?!compute\\)") {
      $standaloneRuntimeViolations += [pscustomobject]@{
        file = Get-RepoRelativePath -Path $currentFile
        line = 0
        issue = "legacy_client_static_import"
        text = $specifier
      }
      continue
    }

    $standaloneQueue.Enqueue($resolved)
  }
}

$forbiddenStandaloneRuntimePaths = @(
  "frontend\src\hooks\useAuth.ts",
  "frontend\src\routes\login.tsx",
  "frontend\src\routes\signup.tsx",
  "frontend\src\routes\recover-password.tsx",
  "frontend\src\routes\reset-password.tsx",
  "frontend\src\routes\_layout\admin.tsx",
  "frontend\src\routes\_layout\items.tsx",
  "frontend\src\routes\_layout\settings.tsx",
  "frontend\src\routeTree.gen.ts"
)

foreach ($reachable in $standaloneReachableFiles) {
  $relativePath = Get-RepoRelativePath -Path $reachable
  if ($forbiddenStandaloneRuntimePaths -contains $relativePath) {
    $standaloneRuntimeViolations += [pscustomobject]@{
      file = $relativePath
      line = 0
      issue = "forbidden_standalone_reachable_file"
      text = $relativePath
    }
  }

  $lines = Get-Content -Path $reachable
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -cmatch "LoginService|UsersService|/users/me|/login/access-token") {
      $standaloneRuntimeViolations += [pscustomobject]@{
        file = $relativePath
        line = $i + 1
        issue = "legacy_auth_marker"
        text = $line.Trim()
      }
    }
  }
}

$standaloneAdapterPath = Join-Path $FrontendSrc "services\standaloneComputeService.ts"
$standaloneAdapterText = Get-Content -Path $standaloneAdapterPath -Raw
$requiredJobTypes = @(
  "simulation.material_balance.v1",
  "simulation.asm1slim.v1",
  "simulation.asm1.v1",
  "simulation.asm3.v1",
  "simulation.udm.v1"
)
$missingJobTypes = @(
  foreach ($jobType in $requiredJobTypes) {
    if (-not $standaloneAdapterText.Contains($jobType)) {
      $jobType
    }
  }
)

$status = if (
  $staticImportViolations.Count -eq 0 -and
  $directCallViolations.Count -eq 0 -and
  $websocketRuntimeImports.Count -eq 0 -and
  $standaloneRuntimeViolations.Count -eq 0 -and
  $missingJobTypes.Count -eq 0
) {
  "passed"
} else {
  "failed"
}

New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null
$report = [pscustomobject]@{
  schema_version = "frontend_standalone_compute_boundary_audit.v1"
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  status = $status
  checked_file_count = $files.Count
  static_legacy_compute_imports = $staticImportViolations
  direct_legacy_compute_calls = $directCallViolations
  websocket_runtime_imports = $websocketRuntimeImports
  standalone_runtime_reachable_files = @(
    $standaloneReachableFiles | ForEach-Object { Get-RepoRelativePath -Path $_ } | Sort-Object
  )
  standalone_runtime_legacy_violations = $standaloneRuntimeViolations
  required_job_types = $requiredJobTypes
  missing_job_types = $missingJobTypes
}
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $EvidencePath -Encoding UTF8

Write-Host "frontend standalone compute boundary audit: $status"
Write-Host "evidence: $EvidencePath"

if ($status -ne "passed") {
  exit 1
}
