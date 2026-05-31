# AutoWaterSimu Next Water Ontology Model

> Status: first registry-backed ontology slice, 2026-05-31.

## Purpose

Water Ontology is the domain-language layer above `contracts/` wire shapes. It explains water operations objects, how they relate, what actions are meaningful, which scopes and roles matter, and what evidence an action should leave behind.

This document describes the first landed registry. It does not claim that runtime RBAC, ABAC, tenant/project/site data-scope filtering, approval workflow, or mutation audit persistence is complete.

## Source Files

| Registry | Purpose |
|---|---|
| `ontology/objects/registry.json` | Objects, identity fields, required attributes, relationships, allowed actions, scopes, and evidence refs |
| `ontology/actions/registry.json` | Actions, target objects, role requirements, evidence, approval, and rollback boundary |
| `ontology/links/registry.json` | Directed object relationships and evidence refs |
| `ontology/policies/registry.json` | Candidate policy groups over object/action/scope/evidence combinations |

The consistency gate is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

`just check-ontology`, `just check`, and `scripts/ci/pr-fast.ps1` include the same gate.

## First Objects

The first registry covers 18 objects:

- `WaterStation`, `ProcessGraph`, `ProcessUnit`, `EquipmentAsset`
- `MonitoringPoint`, `WaterQualitySample`
- `ChemicalMaterial`, `InventoryBalance`
- `WorkOrder`, `MaintenanceEvent`
- `BenchmarkCase`, `ModelVersion`, `ParameterSet`
- `ComputeJob`, `ModelRun`, `EvidencePackage`, `RiskFinding`
- `AgentDraft`

These names intentionally mix operational water objects and platform evidence objects because the Certainty/Elegance PRD asks users to understand not only compute jobs but also process graphs, model runs, parameter sets, evidence packages, and risk findings.

## Actions And Evidence

The first action set covers read, metadata update, operational registration, work-order actions, model governance, evidence publish, risk acknowledgement, agent draft approval, and compute job queueing.

Every mutating action is expected to carry an audit reason and produce at least one evidence reference. Approval-oriented actions are marked in the registry, but production approval execution remains a future runtime integration.

## Relationship Shape

The first link set captures station/process topology, equipment and monitoring structure, sample/inventory/work evidence, benchmark/model/parameter governance, job/result/evidence lineage, risk blockers, and agent draft proposals.

These relationships are semantic boundaries. They are not database foreign-key commitments.

## Policy Boundary

The first policy registry groups expected access into:

- `water_ops_read`
- `water_ops_write`
- `model_governance_write`
- `evidence_publish`
- `agent_draft_approve`

Each policy declares objects, actions, roles, scope dimensions, audit requirements, approval requirements, and required evidence refs. Current P0 runtime security still uses static token scopes plus selected security smoke tests; full production OIDC/RBAC/ABAC/data-scope/mutation-audit enforcement remains a gap.

## Validation Guarantees

`scripts/check-ontology.ps1` currently verifies:

- expected registry `schema_version` values
- non-empty entries and unique keys
- object relationships reference existing links
- object allowed actions reference existing actions
- link endpoints reference existing objects
- action target objects reference existing objects
- policy objects and actions reference existing registry entries
- required descriptive fields and non-empty arrays

The gate is intentionally schema-light and dependency-free. If registry semantics become part of runtime enforcement, the next step should be a formal JSON Schema or generated type layer.

## Current Gaps

- No runtime enforcement of ontology policies.
- No OIDC/JWKS-backed identity integration.
- No complete tenant/project/site data-scope filter across all reads.
- No complete mutation audit event store wired to all registry actions.
- No UI graph explorer or ontology-backed object browser.
- No generated Go/Python/Rust/TypeScript domain types from the registry.

These gaps are tracked as implementation work, not as ontology registry defects.
