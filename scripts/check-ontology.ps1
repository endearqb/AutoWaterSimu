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

function Read-Registry {
    param(
        [string]$Root,
        [string]$RelativePath,
        [string]$ExpectedSchema,
        [string]$CollectionName
    )
    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing ontology registry: $RelativePath"
    }
    $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    if ($json.schema_version -ne $ExpectedSchema) {
        throw "$RelativePath schema_version must be $ExpectedSchema, got $($json.schema_version)"
    }
    $items = @($json.$CollectionName)
    if ($items.Count -eq 0) {
        throw "$RelativePath must contain at least one $CollectionName entry"
    }
    return $items
}

function New-KeySet {
    param(
        [object[]]$Items,
        [string]$Label
    )
    $set = @{}
    foreach ($item in $Items) {
        if (-not ($item.PSObject.Properties.Name -contains "key")) {
            throw "$Label item missing key"
        }
        $key = [string]$item.key
        if ([string]::IsNullOrWhiteSpace($key)) {
            throw "$Label item has blank key"
        }
        if ($set.ContainsKey($key)) {
            throw "$Label contains duplicate key: $key"
        }
        $set[$key] = $true
    }
    return $set
}

function Assert-Property {
    param(
        [object]$Item,
        [string]$PropertyName,
        [string]$Label
    )
    if (-not ($Item.PSObject.Properties.Name -contains $PropertyName)) {
        throw "$Label missing required property: $PropertyName"
    }
    $value = $Item.$PropertyName
    if ($null -eq $value) {
        throw "$Label has null property: $PropertyName"
    }
    if ($value -is [string] -and [string]::IsNullOrWhiteSpace($value)) {
        throw "$Label has blank property: $PropertyName"
    }
}

function Assert-NonEmptyArray {
    param(
        [object]$Item,
        [string]$PropertyName,
        [string]$Label
    )
    Assert-Property -Item $Item -PropertyName $PropertyName -Label $Label
    $values = @($Item.$PropertyName)
    if ($values.Count -eq 0) {
        throw "$Label property must be a non-empty array: $PropertyName"
    }
    foreach ($value in $values) {
        if ([string]::IsNullOrWhiteSpace([string]$value)) {
            throw "$Label property contains blank value: $PropertyName"
        }
    }
}

function Assert-KeyRefs {
    param(
        [object]$Item,
        [string]$PropertyName,
        [hashtable]$AllowedKeys,
        [string]$Label
    )
    Assert-NonEmptyArray -Item $Item -PropertyName $PropertyName -Label $Label
    foreach ($key in @($Item.$PropertyName)) {
        if (-not $AllowedKeys.ContainsKey([string]$key)) {
            throw "$Label references unknown $PropertyName key: $key"
        }
    }
}

$Root = Resolve-RepoRoot -InputRoot $RepoRoot

$objects = Read-Registry -Root $Root -RelativePath "ontology\objects\registry.json" -ExpectedSchema "ontology_objects_registry.v1" -CollectionName "objects"
$actions = Read-Registry -Root $Root -RelativePath "ontology\actions\registry.json" -ExpectedSchema "ontology_actions_registry.v1" -CollectionName "actions"
$links = Read-Registry -Root $Root -RelativePath "ontology\links\registry.json" -ExpectedSchema "ontology_links_registry.v1" -CollectionName "links"
$policies = Read-Registry -Root $Root -RelativePath "ontology\policies\registry.json" -ExpectedSchema "ontology_policies_registry.v1" -CollectionName "policies"

$objectKeys = New-KeySet -Items $objects -Label "objects"
$actionKeys = New-KeySet -Items $actions -Label "actions"
$linkKeys = New-KeySet -Items $links -Label "links"
$policyKeys = New-KeySet -Items $policies -Label "policies"

foreach ($link in $links) {
    $label = "link $($link.key)"
    foreach ($propertyName in @("from", "to", "cardinality", "description")) {
        Assert-Property -Item $link -PropertyName $propertyName -Label $label
    }
    if (-not $objectKeys.ContainsKey([string]$link.from)) {
        throw "$label references unknown from object: $($link.from)"
    }
    if (-not $objectKeys.ContainsKey([string]$link.to)) {
        throw "$label references unknown to object: $($link.to)"
    }
    Assert-NonEmptyArray -Item $link -PropertyName "evidence_refs" -Label $label
}

foreach ($action in $actions) {
    $label = "action $($action.key)"
    foreach ($propertyName in @("description", "requires_reason", "approval_required", "rollback")) {
        Assert-Property -Item $action -PropertyName $propertyName -Label $label
    }
    Assert-KeyRefs -Item $action -PropertyName "target_objects" -AllowedKeys $objectKeys -Label $label
    Assert-NonEmptyArray -Item $action -PropertyName "requires_role" -Label $label
    Assert-NonEmptyArray -Item $action -PropertyName "creates_evidence" -Label $label
}

foreach ($object in $objects) {
    $label = "object $($object.key)"
    foreach ($propertyName in @("label", "description", "category")) {
        Assert-Property -Item $object -PropertyName $propertyName -Label $label
    }
    foreach ($propertyName in @("identity", "required_attributes", "read_scope", "write_scope", "evidence_refs")) {
        Assert-NonEmptyArray -Item $object -PropertyName $propertyName -Label $label
    }
    Assert-KeyRefs -Item $object -PropertyName "relationships" -AllowedKeys $linkKeys -Label $label
    Assert-KeyRefs -Item $object -PropertyName "allowed_actions" -AllowedKeys $actionKeys -Label $label
}

foreach ($policy in $policies) {
    $label = "policy $($policy.key)"
    foreach ($propertyName in @("description", "audit_required", "approval_required")) {
        Assert-Property -Item $policy -PropertyName $propertyName -Label $label
    }
    Assert-KeyRefs -Item $policy -PropertyName "applies_to_objects" -AllowedKeys $objectKeys -Label $label
    Assert-KeyRefs -Item $policy -PropertyName "allowed_actions" -AllowedKeys $actionKeys -Label $label
    foreach ($propertyName in @("required_roles", "required_scope", "evidence_required")) {
        Assert-NonEmptyArray -Item $policy -PropertyName $propertyName -Label $label
    }
}

Write-Host "Ontology registry check passed: $($objects.Count) objects, $($actions.Count) actions, $($links.Count) links, $($policies.Count) policies."
