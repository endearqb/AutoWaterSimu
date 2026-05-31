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

function Invoke-InternalStep {
    param(
        [string]$Name,
        [scriptblock]$Body
    )
    $started = (Get-Date).ToUniversalTime().ToString("o")
    $exitCode = 0
    $outputText = ""
    try {
        $result = & $Body
        $outputText = if ($null -eq $result) { "" } else { [string]$result }
    }
    catch {
        $exitCode = 1
        $outputText = $_.Exception.Message
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

function Test-ReadmePaths {
    param([string]$Root)
    $requiredPaths = @(
        "AGENTS.md",
        "README_First.md",
        "README.md",
        "docs/README.md",
        "docs/rebuild/README.md",
        "docs/rebuild/AutoWaterSimu_Next_Certainty_Elegance_PRD_v1.0.md",
        "docs/rebuild/AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md",
        "docs/architecture/README.md",
        "docs/architecture/module-map.md",
        "docs/architecture/dependency-graph.md",
        "docs/architecture/local-dev.md",
        "docs/architecture/current-state.md",
        "docs/architecture/contracts.md",
        "docs/architecture/compute-api.md",
        "docs/architecture/desktop-runtime.md",
        "docs/architecture/ontology-model.md",
        "ontology/README.md",
        "ontology/objects/README.md",
        "ontology/actions/README.md",
        "ontology/links/README.md",
        "ontology/policies/README.md",
        "scripts/README.md",
        "scripts/ci/README.md",
        ".github/workflows/README.md"
    )
    $missing = @()
    foreach ($relativePath in $requiredPaths) {
        if (-not (Test-Path -LiteralPath (Join-Path $Root $relativePath))) {
            $missing += $relativePath
        }
    }
    if ($missing.Count -gt 0) {
        throw "Missing README/path entries: $($missing -join ', ')"
    }
    return "Checked $($requiredPaths.Count) README First and architecture paths."
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root "tmp\ci-evidence"
}
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$script:Steps = [System.Collections.Generic.List[object]]::new()
$script:Failed = $false
$npm = Resolve-NativeCommand -Name "npm"
$npx = Resolve-NativeCommand -Name "npx"
$powershell = if (Test-IsWindows) { "powershell" } else { "pwsh" }

$commitSha = Get-GitText -Root $Root -Arguments @("rev-parse", "HEAD")
$branchName = Get-GitText -Root $Root -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
$statusBefore = Get-GitText -Root $Root -Arguments @("status", "--porcelain")

Invoke-Step -Name "dependency boundary check" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\check-deps.ps1")
Invoke-InternalStep -Name "README path check" -Body { Test-ReadmePaths -Root $Root }
Invoke-Step -Name "ontology registry check" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\check-ontology.ps1")
Invoke-Step -Name "contracts registry and drift gate" -WorkingDirectory $Root -Executable $powershell -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts\check-contracts.ps1")
Invoke-Step -Name "go compute api tests" -WorkingDirectory (Join-Path $Root "apps\api") -Executable "go" -Arguments @("test", "./...")
Invoke-Step -Name "frontend typecheck" -WorkingDirectory (Join-Path $Root "frontend") -Executable $npx -Arguments @("tsc", "--noEmit")
Invoke-Step -Name "desktop typecheck" -WorkingDirectory (Join-Path $Root "apps\desktop") -Executable $npm -Arguments @("run", "typecheck")

$workflowFiles = @()
if (Test-Path -LiteralPath (Join-Path $Root ".github\workflows")) {
    $workflowFiles = @(
        Get-ChildItem -LiteralPath (Join-Path $Root ".github\workflows") -File |
            Where-Object { $_.Extension -in @(".yml", ".yaml") } |
            Sort-Object Name |
            ForEach-Object { $_.Name }
    )
}

$statusAfter = Get-GitText -Root $Root -Arguments @("status", "--porcelain")
$report = [ordered]@{
    schema_version = "autowatersimu_next_pr_fast_evidence.v1"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    repo_root = $Root
    commit_sha = $commitSha
    branch = $branchName
    status = if ($script:Failed) { "failed" } else { "passed" }
    is_dirty_before = -not [string]::IsNullOrWhiteSpace($statusBefore)
    is_dirty_after = -not [string]::IsNullOrWhiteSpace($statusAfter)
    dirty_files_before = @($statusBefore -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    dirty_files_after = @($statusAfter -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    workflow = [ordered]@{
        lane = "pr-fast"
        workflow_files = $workflowFiles
        github_run_id = $env:GITHUB_RUN_ID
        github_run_attempt = $env:GITHUB_RUN_ATTEMPT
        github_sha = $env:GITHUB_SHA
        github_ref = $env:GITHUB_REF
        github_workflow = $env:GITHUB_WORKFLOW
        local_status = if ([string]::IsNullOrWhiteSpace($env:GITHUB_RUN_ID)) { "local_run_not_github_status" } else { "github_actions_run" }
    }
    steps = $script:Steps
}

$evidencePath = Join-Path $EvidenceDir "pr-fast.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
Write-Host "PR fast evidence: $evidencePath"

if ($script:Failed) {
    exit 1
}
