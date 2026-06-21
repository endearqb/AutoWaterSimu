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
  required_job_types = $requiredJobTypes
  missing_job_types = $missingJobTypes
}
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $EvidencePath -Encoding UTF8

Write-Host "frontend standalone compute boundary audit: $status"
Write-Host "evidence: $EvidencePath"

if ($status -ne "passed") {
  exit 1
}
