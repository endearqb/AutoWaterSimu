param(
    [string]$RepoRoot = "",
    [string]$EvidenceDir = "",
    [string]$FixtureRoot = ""
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

function ConvertTo-ProcessArgument {
    param([string]$Argument)
    if ($Argument -match '[\s"]') {
        return '"' + ($Argument -replace '"', '\"') + '"'
    }
    return $Argument
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

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    $Value | ConvertTo-Json -Depth 8 | Set-Content -Path $Path -Encoding UTF8
}

function Write-TextFixture {
    param(
        [string]$Path,
        [string]$Value
    )
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    Set-Content -Path $Path -Value $Value -Encoding UTF8
}

function New-Step {
    param(
        [string]$Name,
        [string]$Status,
        [int]$ExitCode,
        [string]$Output,
        [string]$StartedAt,
        [string]$FinishedAt,
        [string]$EvidencePath,
        [string]$EvidenceStatus
    )
    return [ordered]@{
        name = $Name
        status = $Status
        exit_code = $ExitCode
        started_at = $StartedAt
        finished_at = $FinishedAt
        evidence_path = $EvidencePath
        evidence_status = $EvidenceStatus
        output_excerpt = if ($Output.Length -gt 4000) { $Output.Substring($Output.Length - 4000) } else { $Output }
    }
}

function Invoke-Verifier {
    param(
        [string]$Name,
        [string]$Root,
        [string]$DownloadRoot,
        [string]$StepEvidenceDir,
        [bool]$ExpectSuccess
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $stdoutFile = New-TemporaryFile
    $stderrFile = New-TemporaryFile
    $exitCode = 0
    $outputText = ""
    $evidencePath = Join-Path $StepEvidenceDir "downloaded-release-artifacts.json"
    $evidenceStatus = $null
    try {
        $scriptPath = Join-Path $Root "scripts\release\verify-release-artifact-download.ps1"
        $arguments = @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            $scriptPath,
            "-DownloadRoot",
            $DownloadRoot,
            "-EvidenceDir",
            $StepEvidenceDir,
            "-ArtifactName",
            "fixture-$Name"
        )
        $argumentList = ($arguments | ForEach-Object { ConvertTo-ProcessArgument -Argument $_ }) -join " "
        $process = Start-Process -FilePath "powershell" -ArgumentList $argumentList -WorkingDirectory $Root -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $exitCode = $process.ExitCode
        $stdout = [string](Get-Content -Path $stdoutFile -Raw)
        $stderr = [string](Get-Content -Path $stderrFile -Raw)
        $outputText = (($stdout, $stderr) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"
        if (Test-Path -LiteralPath $evidencePath -PathType Leaf) {
            $evidenceStatus = (Get-Content -Path $evidencePath -Raw | ConvertFrom-Json).status
        }
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
    $actualSuccess = $exitCode -eq 0
    $expectedEvidenceStatus = if ($ExpectSuccess) { "passed" } else { "failed" }
    $matchedExpectation = ($actualSuccess -eq $ExpectSuccess) -and ($evidenceStatus -eq $expectedEvidenceStatus)
    $status = if ($matchedExpectation) { "passed" } else { "failed" }
    $script:Steps.Add((New-Step -Name $Name -Status $status -ExitCode $exitCode -Output $outputText -StartedAt $started -FinishedAt $finished -EvidencePath $evidencePath -EvidenceStatus $evidenceStatus)) | Out-Null
    if (-not $matchedExpectation) {
        $script:Failed = $true
    }
}

function New-ReleaseArtifactFixture {
    param(
        [string]$Root,
        [bool]$IncludeInstallerExecutable
    )
    Write-JsonFile -Path (Join-Path $Root "packaged-sidecar-build.json") -Value ([ordered]@{
        schema_version = "fixture.packaged_sidecar_build.v1"
        status = "passed"
        sidecar_executable = "dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe"
    })
    Write-JsonFile -Path (Join-Path $Root "packaged-sidecar-smoke.json") -Value ([ordered]@{
        schema_version = "fixture.packaged_sidecar_smoke.v1"
        status = "passed"
    })
    Write-JsonFile -Path (Join-Path $Root "nsis-installer-build.json") -Value ([ordered]@{
        schema_version = "fixture.nsis_installer_build.v1"
        status = "passed"
        installer_path = "bundle\nsis\AutoWaterSimu-setup.exe"
    })
    Write-JsonFile -Path (Join-Path $Root "nsis-installer-smoke.json") -Value ([ordered]@{
        schema_version = "fixture.nsis_installer_smoke.v1"
        status = "passed"
    })
    Write-JsonFile -Path (Join-Path $Root "installed-sidecar-smoke.json") -Value ([ordered]@{
        schema_version = "fixture.installed_sidecar_smoke.v1"
        status = "passed"
    })
    Write-TextFixture -Path (Join-Path $Root "dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe") -Value "fixture simulation worker executable"
    if ($IncludeInstallerExecutable) {
        Write-TextFixture -Path (Join-Path $Root "bundle\nsis\AutoWaterSimu-setup.exe") -Value "fixture nsis setup executable"
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\release-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

if ([string]::IsNullOrWhiteSpace($FixtureRoot)) {
    $FixtureRoot = Join-Path $Root "tmp\release-artifact-download-fixtures"
}
$fixtureRunId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssfffZ")
$fixtureRunRoot = Join-Path $FixtureRoot $fixtureRunId
$successFixtureRoot = Join-Path $fixtureRunRoot "success"
$missingInstallerFixtureRoot = Join-Path $fixtureRunRoot "missing-installer"
New-ReleaseArtifactFixture -Root $successFixtureRoot -IncludeInstallerExecutable $true
New-ReleaseArtifactFixture -Root $missingInstallerFixtureRoot -IncludeInstallerExecutable $false

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")

Invoke-Verifier `
    -Name "valid release artifact download fixture" `
    -Root $Root `
    -DownloadRoot $successFixtureRoot `
    -StepEvidenceDir (Join-Path $EvidenceDir "artifact-download-fixture-success") `
    -ExpectSuccess $true

Invoke-Verifier `
    -Name "missing installer executable rejection fixture" `
    -Root $Root `
    -DownloadRoot $missingInstallerFixtureRoot `
    -StepEvidenceDir (Join-Path $EvidenceDir "artifact-download-fixture-missing-installer") `
    -ExpectSuccess $false

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$report = [ordered]@{
    schema_version = "autowatersimu_next_release_artifact_download_smoke.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed) { "failed" } else { "passed" }
    fixture_root = ConvertTo-RelativePath -Root $Root -Path $fixtureRunRoot
    coverage_summary = [ordered]@{
        valid_downloaded_release_artifact_bundle = "covered_by_fixture_backed_verifier"
        missing_installer_executable_rejection = "covered_by_expected_failure_fixture"
        real_github_workflow_artifact_download = "not_covered_by_fixture_smoke"
        hosted_workflow_execution_context = if ([string]::IsNullOrWhiteSpace($env:GITHUB_RUN_ID)) { "not_covered" } else { "github_actions_run" }
        signed_installer_or_auto_update = "not_covered_post_p0"
    }
    is_dirty_before = -not [string]::IsNullOrWhiteSpace($statusBefore)
    is_dirty_after = -not [string]::IsNullOrWhiteSpace($statusAfter)
    dirty_files_before = @($statusBefore -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    dirty_files_after = @($statusAfter -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "release-artifact-download-smoke.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "Release artifact download smoke evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
