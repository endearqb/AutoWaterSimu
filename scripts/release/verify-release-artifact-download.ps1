param(
    [string]$DownloadRoot = "",
    [string]$EvidenceDir = "",
    [string]$ArtifactName = "next-desktop-unsigned-release-artifacts"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Resolve-OptionalPath {
    param(
        [string]$InputPath,
        [string]$DefaultPath
    )
    if ([string]::IsNullOrWhiteSpace($InputPath)) {
        return $DefaultPath
    }
    return $InputPath
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

function Read-JsonFile {
    param([string]$Path)
    try {
        return Get-Content -Path $Path -Raw | ConvertFrom-Json
    }
    catch {
        throw "Downloaded artifact file is not valid JSON: $Path"
    }
}

$repoRoot = Resolve-RepoRoot
$downloadRoot = Resolve-OptionalPath -InputPath $DownloadRoot -DefaultPath (Join-Path $repoRoot "tmp\downloaded-release-artifacts")
$evidenceDirPath = Resolve-OptionalPath -InputPath $EvidenceDir -DefaultPath (Join-Path $repoRoot "tmp\release-evidence")
$startedAt = (Get-Date).ToUniversalTime().ToString("o")

$errors = [System.Collections.Generic.List[string]]::new()
$requiredFiles = @(
    "packaged-sidecar-build.json",
    "packaged-sidecar-smoke.json",
    "nsis-installer-build.json",
    "nsis-installer-smoke.json",
    "installed-sidecar-smoke.json"
)
$requiredFileHits = @()
$sidecarExecutables = @()
$installerExecutables = @()
$allFiles = @()

try {
    if (-not (Test-Path -LiteralPath $downloadRoot -PathType Container)) {
        $errors.Add("Downloaded artifact root does not exist: $downloadRoot") | Out-Null
    }
    else {
        $downloadRoot = (Resolve-Path $downloadRoot).Path
        $allFiles = @(Get-ChildItem -LiteralPath $downloadRoot -Recurse -File)

        foreach ($fileName in $requiredFiles) {
            $matches = @($allFiles | Where-Object { $_.Name -eq $fileName })
            $requiredFileHits += [ordered]@{
                name = $fileName
                count = $matches.Count
                first_match = if ($matches.Count -gt 0) { ConvertTo-RelativePath -Root $downloadRoot -Path $matches[0].FullName } else { $null }
            }
            if ($matches.Count -lt 1) {
                $errors.Add("Downloaded artifact missing required file: $fileName") | Out-Null
                continue
            }

            $json = Read-JsonFile -Path $matches[0].FullName
            if ($fileName -eq "packaged-sidecar-build.json") {
                if (-not ($json.PSObject.Properties.Name -contains "sidecar_executable") -or [string]::IsNullOrWhiteSpace([string]$json.sidecar_executable)) {
                    $errors.Add("Downloaded packaged sidecar build manifest is missing sidecar_executable.") | Out-Null
                }
            }
            if ($fileName -eq "nsis-installer-build.json") {
                if (-not ($json.PSObject.Properties.Name -contains "installer_path") -or [string]::IsNullOrWhiteSpace([string]$json.installer_path)) {
                    $errors.Add("Downloaded NSIS installer build manifest is missing installer_path.") | Out-Null
                }
            }
            if (($fileName -like "*smoke.json") -and ($json.PSObject.Properties.Name -contains "status") -and ($json.status -ne "passed")) {
                $errors.Add("Downloaded smoke evidence did not pass: $fileName status=$($json.status)") | Out-Null
            }
        }

        $sidecarExecutables = @(
            $allFiles |
                Where-Object { $_.Name -like "simulation-worker*.exe" } |
                ForEach-Object { ConvertTo-RelativePath -Root $downloadRoot -Path $_.FullName }
        )
        if ($sidecarExecutables.Count -lt 1) {
            $errors.Add("Downloaded artifact did not include a packaged simulation-worker executable.") | Out-Null
        }

        $installerExecutables = @(
            $allFiles |
                Where-Object { $_.Name -like "*setup.exe" } |
                ForEach-Object { ConvertTo-RelativePath -Root $downloadRoot -Path $_.FullName }
        )
        if ($installerExecutables.Count -lt 1) {
            $errors.Add("Downloaded artifact did not include an NSIS setup executable.") | Out-Null
        }
    }
}
catch {
    $errors.Add($_.Exception.Message) | Out-Null
}
finally {
    New-Item -ItemType Directory -Force -Path $evidenceDirPath | Out-Null
    $status = if ($errors.Count -eq 0) { "passed" } else { "failed" }
    $report = [ordered]@{
        schema_version = "autowatersimu_next_release_artifact_download_evidence.v1"
        status = $status
        artifact_name = $ArtifactName
        checked_at = (Get-Date).ToUniversalTime().ToString("o")
        started_at = $startedAt
        download_root = $downloadRoot
        required_files = $requiredFileHits
        sidecar_executables = $sidecarExecutables
        installer_executables = $installerExecutables
        downloaded_file_count = $allFiles.Count
        downloaded_total_bytes = ($allFiles | Measure-Object -Property Length -Sum).Sum
        errors = @($errors)
    }
    $evidencePath = Join-Path $evidenceDirPath "downloaded-release-artifacts.json"
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $evidencePath -Encoding UTF8
    Write-Host "Release artifact download evidence: $evidencePath"
}

if ($errors.Count -gt 0) {
    throw (($errors | ForEach-Object { "- $_" }) -join "`n")
}
