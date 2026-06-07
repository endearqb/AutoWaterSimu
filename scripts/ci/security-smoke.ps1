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

function Test-IsWindows {
    return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
}

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
}

function New-Step {
    param(
        [string]$Name,
        [string]$Status,
        [int]$ExitCode,
        [string]$Output,
        [string]$StartedAt,
        [string]$FinishedAt
    )
    return [ordered]@{
        name = $Name
        status = $Status
        exit_code = $ExitCode
        started_at = $StartedAt
        finished_at = $FinishedAt
        output_excerpt = if ($Output.Length -gt 4000) { $Output.Substring($Output.Length - 4000) } else { $Output }
    }
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    $exitCode = 0
    $outputText = ""
    try {
        $argumentList = ($Arguments | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
        $process = Start-Process -FilePath $Executable -ArgumentList $argumentList -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $exitCode = $process.ExitCode
        $stdout = [string](Get-Content -Path $stdoutFile -Raw)
        $stderr = [string](Get-Content -Path $stderrFile -Raw)
        $outputText = (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
    }
    finally {
        Remove-Item -LiteralPath $stdoutFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrFile -Force -ErrorAction SilentlyContinue
    }
    $finished = (Get-Date).ToUniversalTime().ToString("o")
    $status = if ($exitCode -eq 0) { "passed" } else { "failed" }
    $script:Steps.Add((New-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished)) | Out-Null
    if ($exitCode -ne 0) {
        $script:Failed = $true
    }
}

function Get-GitText {
    param(
        [string]$Root,
        [string[]]$Arguments
    )
    Push-Location $Root
    try {
        $output = & git @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) {
            return ""
        }
        return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
    }
    finally {
        Pop-Location
    }
}

function ConvertTo-GitStatusLines {
    param([string]$StatusText)
    return @($StatusText -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Get-TrackedStatusLines {
    param([string[]]$StatusLines)
    return @($StatusLines | Where-Object { -not $_.StartsWith("??") })
}

function Get-UntrackedStatusLines {
    param([string[]]$StatusLines)
    return @($StatusLines | Where-Object { $_.StartsWith("??") })
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = @(ConvertTo-GitStatusLines -StatusText $statusBefore)
$trackedStatusBefore = @(Get-TrackedStatusLines -StatusLines $statusBeforeLines)
$untrackedStatusBefore = @(Get-UntrackedStatusLines -StatusLines $statusBeforeLines)

$apiDir = Join-Path $Root "apps\api"
Invoke-Step -Name "production auth config guard and token file source" -WorkingDirectory $apiDir -Executable "go" -Arguments @("test", "./cmd/compute-api", "-run", "Test(ValidateProductionAuthConfig|LoadAuthTokensJSON)", "-count=1")
Invoke-Step -Name "auth scope revocation admin audit and data-scope checks" -WorkingDirectory $apiDir -Executable "go" -Arguments @("test", "./internal/compute", "-run", "Test(HTTPAuthScopeAndMetrics|StaticTokenRevocation|HTTPArtifactRetentionSweepRequiresAdminScope|HTTPMutationAuditEventEnvelopeForJobCreate|HTTPResultExplanationAuditEvents|HTTPJobReadTenantProjectSiteScope|HTTPSimulationRegistryTenantProjectSiteScope|HTTPSimulationRegistryMutationAuditEvents|HTTPDraftConfirmationTenantProjectSiteScope|HTTPDraftConfirmationMutationAuditEvents|HTTPModelCatalogTenantProjectSiteScope|HTTPModelCatalogMutationTenantProjectSiteScope|HTTPModelRunTenantProjectSiteScope|HTTPBenchmarkRunTenantProjectSiteScope|HTTPArtifactDownloadTenantProjectSiteScope)", "-count=1")
Invoke-Step -Name "governance route scope denial and mutation audit checks" -WorkingDirectory $apiDir -Executable "go" -Arguments @("test", "./internal/compute", "-run", "Test(ModelCatalogEndpoint|DefaultParameterSetPromotionPlanEndpoint|BenchmarkCaseScheduleRunEndpoint|ContractValidationEndpoint|SimulationCheckEndpointCreatesComputeJob|NewSystemEvidenceReferenceE2E)", "-count=1")

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = @(ConvertTo-GitStatusLines -StatusText $statusAfter)
$trackedStatusAfter = @(Get-TrackedStatusLines -StatusLines $statusAfterLines)
$untrackedStatusAfter = @(Get-UntrackedStatusLines -StatusLines $statusAfterLines)
$report = [ordered]@{
    schema_version = "autowatersimu_next_security_smoke_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed) { "failed" } else { "passed" }
    coverage_summary = [ordered]@{
        production_default_token_guard = "covered_by_cmd_compute_api_tests"
        production_service_token_file_source = "COMPUTE_API_TOKENS_FILE covered_by_cmd_compute_api_tests"
        static_token_revocation = "covered_by_internal_compute_tests"
        scope_denial = "covered_by_internal_compute_http_tests"
        artifact_admin_scope = "covered_by_artifact_retention_http_test"
        mutation_audit_events = "covered_for_job_create_artifact_retention_result_explanation_draft_confirmation_draft_promotion_model_governance_and_simulation_registry_events"
        tenant_project_site_data_scope = "tenant_project_site_read_scope_covered_for_job_list_get_simulation_registry_get_draft_confirmation_get_plan_promotion_model_catalog_root_model_snapshots_model_run_get_job_filtered_list_benchmark_run_get_job_filtered_list_and_artifact_download"
    }
    is_dirty_before = -not [string]::IsNullOrWhiteSpace($statusBefore)
    is_dirty_after = -not [string]::IsNullOrWhiteSpace($statusAfter)
    has_tracked_changes_before = $trackedStatusBefore.Count -gt 0
    has_tracked_changes_after = $trackedStatusAfter.Count -gt 0
    dirty_files_before = $statusBeforeLines
    dirty_files_after = $statusAfterLines
    tracked_changes_before = $trackedStatusBefore
    tracked_changes_after = $trackedStatusAfter
    untracked_files_before = $untrackedStatusBefore
    untracked_files_after = $untrackedStatusAfter
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "security-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Security smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
