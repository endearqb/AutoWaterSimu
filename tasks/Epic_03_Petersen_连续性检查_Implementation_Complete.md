Epic 03: Petersen 连续性检查 — Implementation Complete

Backend Changes

File: backend/app/models.py
Changes: Added conversion_factors to UDMComponentDefinition, new
ContinuityCheckItem model, extended UDMValidationResponse with
continuity_checks
────────────────────────────────────────
File: backend/app/services/petersen_continuity.py
Changes: New — check_continuity() service with per-process, per-dimension
balance checking, stoich_expr fallback via compile_expression(),
readable
    explanations
────────────────────────────────────────
File: backend/app/api/routes/udm_models.py
Changes: Integrated continuity check into _validate_definition_payload(),
added validation_mode query param to /validate endpoint
────────────────────────────────────────
File: backend/app/services/udm_seed_templates.py
Changes: Added conversion_factors to ASM1 (COD/N/ALK) and ASM1Slim
components, added continuityProfiles to chapter-3/chapter-7 tutorial
specs
────────────────────────────────────────
File: backend/app/tests/services/test_petersen_continuity.py
Changes: New — 14 tests covering COD/N balance, all modes
(off/teaching/strict), edge cases (no factors, expr fallback, multiple
dimensions)

Frontend Changes

File: frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx
Changes: New — Displays results grouped by dimension, with status badges,
expandable detail breakdowns, and jump-to-process navigation
────────────────────────────────────────
File: frontend/src/components/UDM/UDMModelEditorForm.tsx
Changes: Added conversion_factors to ComponentRow, preserved in
load/save/buildDraft, integrated ContinuityCheckPanel after validation
section
────────────────────────────────────────
File: frontend/src/data/tutorialLessons.ts
Changes: Added continuityProfiles to TutorialLesson interface and
chapter-3/chapter-7 data
────────────────────────────────────────
File: frontend/src/i18n/messages/zh.ts
Changes: Added flow.tutorial.continuity.* keys
────────────────────────────────────────
File: frontend/src/i18n/messages/en.ts
Changes: Added flow.tutorial.continuity.* keys
────────────────────────────────────────
File: frontend/src/client/
Changes: Auto-regenerated with ContinuityCheckItem type and
validation_mode
param

Verification

- 14/14 backend tests pass
- Frontend builds successfully (typecheck + vite build)
- Backward compatible: models without conversion_factors return empty
continuity_checks