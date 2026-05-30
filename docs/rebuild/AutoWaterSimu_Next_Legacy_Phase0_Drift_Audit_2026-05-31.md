# AutoWaterSimu Next Legacy Phase 0 Drift Audit - 2026-05-31

## Scope

This audit records the current legacy baseline drift items that remain after the Phase 0 stabilization work. It covers:

- active `print(...)` usage relevant to legacy runtime behavior;
- FastAPI OpenAPI schema drift against tracked `frontend/openapi.json`;
- generated legacy frontend client drift risk.

It does not change legacy calculation behavior or replace the legacy FastAPI client.

## Inputs Checked

- `backend/README.md`
- `backend/app/README.md`
- `backend/app/api/routes/README.md`
- `backend/app/tests/README.md`
- `frontend/README.md`
- `frontend/src/README.md`
- `frontend/src/client/README.md`
- `docs/rebuild/AutoWaterSimu_Next_PRD_v1.0.md`
- `docs/rebuild/AutoWaterSimu_Next_Technical_Spec_v1.0.md`
- `docs/rebuild/AutoWaterSimu_Next_Development_Plan_v1.0.md`
- `.ai/plans/autowatersimu_next_completion_audit_2026-05-30.md`

## Print Usage Findings

Runtime route modules under `backend/app/api/routes/` currently contain no active `print(...)` calls.

The no-print regression guard now scans every Python route module under `backend/app/api/routes/*.py`, not only the ASM flowchart route subset.

`backend/app/api/routes/material_balance.py` no longer carries the UTF-8 BOM that was present during the first audit pass. The AST guard still reads route files with `utf-8-sig` so future encoding drift does not hide real route `print(...)` calls.

Active `print(...)` calls remain in ad hoc/debug/test-only files:

| File | Current status | Follow-up |
|---|---|---|
| `backend/debug_tensor_conversion.py` | Ad hoc debugging script with verbose ASM1Slim tensor output | Keep out of runtime paths; delete or convert to logging only if the script becomes maintained tooling |
| `backend/app/material_balance/simple_test.py` | Standalone manual smoke script | Keep out of runtime paths; prefer pytest for maintained coverage |
| `backend/app/material_balance/test_module.py` | Standalone manual module exercise with verbose output | Keep out of runtime paths; migrate useful checks into pytest before relying on CI |
| `backend/app/tests/test_flowchart_conversion.py` | Pytest file with debug prints in one exploratory test path | Low-risk test noise; clean when touching this test |

The commented mojibake debug `# print(...)` lines previously found in `backend/app/services/data_conversion_service.py` have been removed. Broader mojibake comments/docstrings in legacy code remain separate readability debt.

## OpenAPI And Client Drift Findings

The current FastAPI OpenAPI document and tracked `frontend/openapi.json` have the same path count and no missing/extra paths:

```txt
current_paths = 88
tracked_paths = 88
missing_paths = []
extra_paths = []
```

The remaining semantic JSON differences are non-behavioral metadata/description drift:

| OpenAPI location | Drift |
|---|---|
| `/info/title` | Current app title is `AutoWaterSimu`; tracked `frontend/openapi.json` still says `Full Stack FastAPI Project` |
| `/api/v1/material-balance/calculate` | Current description includes the Phase 0 legacy baseline note; tracked OpenAPI has the old description |
| `/api/v1/material-balance/calculate-from-flowchart` | Current description includes the raw-flowchart legacy baseline note; tracked OpenAPI has the old description |
| `/api/v1/asm1/calculate` | Current description includes the Phase 0 legacy baseline note; tracked OpenAPI has the old description |
| `/api/v1/asm1/calculate-from-flowchart` | Current description includes the raw-flowchart legacy baseline note; tracked OpenAPI has the old description |
| `/api/v1/udm/calculate` | Current description includes the Phase 0 legacy baseline note; tracked OpenAPI has the old description |
| `/api/v1/udm/calculate-from-flowchart` | Current description includes the raw-flowchart legacy baseline note; tracked OpenAPI has the old description |

No request/response path or schema shape drift was identified in this comparison. The legacy generated client is therefore not known to be behaviorally stale, but the tracked OpenAPI metadata is not byte-for-byte current.

Importing `app.models` no longer emits Pydantic protected-namespace warnings for `model_id` / `model_pair_mappings`; the affected legacy models now explicitly allow those field names. Pydantic v1-style validator and FastAPI lifespan deprecation warnings remain separate cleanup debt.

## Current Guardrails

- `backend/app/tests/api/routes/test_flowchart_routes_no_print.py` guards all route modules against active `print(...)`.
- `backend/app/tests/api/routes/test_asm_udm_validate_response.py` guards ASM1 and UDM validate response shape against the earlier validation response drift.
- `backend/app/tests/pydantic_warning_test.py` guards `app.models` import against protected namespace warning regressions.
- `frontend/README.md` documents that legacy backend schema changes require `frontend/openapi.json` export and `npm run generate-client`.
- Compute API client generation remains isolated under `frontend/src/client/compute` and does not affect the legacy client.

## Remaining Follow-Up

1. Regenerate legacy `frontend/openapi.json` and legacy client only when a behaviorally relevant FastAPI schema change is made, or when the team wants metadata/docstring drift eliminated from the tracked OpenAPI file.
2. Remove or convert ad hoc debug scripts with active prints if they become maintained tooling.
3. Broader legacy mojibake comments/docstrings should be cleaned only with localized tests or when the affected file is already being maintained.
4. Pydantic v1-style validators and FastAPI lifespan deprecation warnings remain cleanup debt.
