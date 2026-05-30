# AutoWaterSimu Next Legacy Phase 0 Drift Audit - 2026-05-31

## Scope

This audit records the current legacy baseline drift items that remain after the Phase 0 stabilization work. It covers:

- active `print(...)` usage relevant to legacy runtime behavior;
- FastAPI OpenAPI schema drift against local generated input `frontend/openapi.json`;
- generated legacy frontend client drift risk under `frontend/src/client`.

It does not change legacy calculation behavior or replace the legacy FastAPI client.

## Inputs Checked

- `backend/README.md`
- `backend/app/README.md`
- `backend/app/api/routes/README.md`
- `backend/app/tests/README.md`
- `frontend/README.md`
- `frontend/src/README.md`
- `frontend/src/client/README.md`
- `frontend/.gitignore`
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

`frontend/openapi.json` is ignored by `frontend/.gitignore` and is therefore a local generated input for `npm run generate-client`, not a tracked source artifact.

After regenerating `frontend/openapi.json` from the current FastAPI app and running `npm run generate-client`, the current FastAPI OpenAPI document and local `frontend/openapi.json` match exactly:

```txt
current_paths = 88
local_paths = 88
missing_paths = []
extra_paths = []
matches = True
```

The tracked generated legacy client is current with that local OpenAPI input. The refresh added the missing `UDMComponentDefinition.note` field to `frontend/src/client/types.gen.ts` and updated generated SDK comments for the legacy calculation endpoints. No request/response path count drift or missing/extra paths were identified.

Importing `app.models` no longer emits Pydantic protected-namespace warnings for `model_id` / `model_pair_mappings`; the affected legacy models now explicitly allow those field names. Legacy model validators have been migrated to Pydantic v2 `field_validator`, so `app.models` import no longer emits Pydantic v1-style validator warnings.

FastAPI startup/shutdown now uses an application lifespan context manager in `backend/app/main.py`, so importing `app.main` no longer emits deprecated `@app.on_event` warnings. The remaining warning observed in targeted backend tests is the third-party `python_multipart` import deprecation from Starlette form parsing.

## Current Guardrails

- `backend/app/tests/api/routes/test_flowchart_routes_no_print.py` guards all route modules against active `print(...)`.
- `backend/app/tests/api/routes/test_asm_udm_validate_response.py` guards ASM1 and UDM validate response shape against the earlier validation response drift.
- `backend/app/tests/pydantic_warning_test.py` guards `app.models` import against protected namespace and Pydantic v1 validator warning regressions.
- `frontend/README.md` documents that legacy backend schema changes require local `frontend/openapi.json` export and `npm run generate-client`; only generated client output under `frontend/src/client` is tracked.
- Compute API client generation remains isolated under `frontend/src/client/compute` and does not affect the legacy client.

## Remaining Follow-Up

1. Regenerate local `frontend/openapi.json` and legacy client whenever a behaviorally relevant FastAPI schema change is made; commit generated client output under `frontend/src/client`.
2. Remove or convert ad hoc debug scripts with active prints if they become maintained tooling.
3. Broader legacy mojibake comments/docstrings should be cleaned only with localized tests or when the affected file is already being maintained.
4. Third-party `python_multipart` import warning remains cleanup debt; treat it separately from legacy application code unless dependency versions or import behavior change.
