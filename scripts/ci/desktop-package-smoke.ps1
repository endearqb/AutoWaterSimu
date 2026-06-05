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
$python = Resolve-Python -Root $Root
$npm = Resolve-NativeCommand -Name "npm"
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusBeforeLines = ConvertTo-GitStatusLines -StatusText $statusBefore
$trackedStatusBefore = Get-TrackedStatusLines -StatusLines $statusBeforeLines
$untrackedStatusBefore = Get-UntrackedStatusLines -StatusLines $statusBeforeLines
$desktopDir = Join-Path $Root "apps\desktop"

Invoke-Step -Name "desktop package contract fixtures" -WorkingDirectory $Root -Executable $python -Arguments @("-m", "pytest", "contracts\tests\test_contract_schemas.py", "-q", "-k", "desktop_project_package or desktop_support_bundle")
Invoke-Step -Name "desktop project package export import clean runtime" -WorkingDirectory $Root -Executable "cargo" -Arguments @("test", "--manifest-path", "apps\desktop\src-tauri\Cargo.toml", "project_export_import_is_limited_to_runtime_sandbox")
Invoke-Step -Name "desktop support bundle redaction" -WorkingDirectory $Root -Executable "cargo" -Arguments @("test", "--manifest-path", "apps\desktop\src-tauri\Cargo.toml", "support_bundle_excludes_artifact_contents")
Invoke-Step -Name "desktop typecheck" -WorkingDirectory $desktopDir -Executable $npm -Arguments @("run", "typecheck")

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$statusAfterLines = ConvertTo-GitStatusLines -StatusText $statusAfter
$trackedStatusAfter = Get-TrackedStatusLines -StatusLines $statusAfterLines
$untrackedStatusAfter = Get-UntrackedStatusLines -StatusLines $statusAfterLines
$report = [ordered]@{
    schema_version = "autowatersimu_next_desktop_package_smoke_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed) { "failed" } else { "passed" }
    coverage_summary = [ordered]@{
        desktop_project_package_contract = "covered_by_contract_schema_fixture_tests"
        desktop_support_bundle_contract = "covered_by_contract_schema_fixture_tests"
        project_package_export_import_clean_runtime = "covered_by_rust_project_package_round_trip_test"
        checksum_verified_file_restore = "covered_by_rust_project_package_round_trip_test"
        metadata_restored = "covered_by_rust_project_package_round_trip_test"
        artifact_and_model_run_refs_preserved = "covered_by_rust_project_package_round_trip_test"
        support_bundle_redaction = "covered_by_rust_support_bundle_redaction_test"
        react_command_wrappers_typechecked = "covered_by_desktop_typecheck"
        packaged_worker_runtime = "not_covered"
        nsis_installer_artifact = "not_covered"
        hosted_workflow_run = "not_covered"
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

$evidencePath = Join-Path $EvidenceDir "desktop-package-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Desktop package smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
