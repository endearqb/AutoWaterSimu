# 0006 - Result Explanation Workflow Scope

## Status

Accepted.

## Context

`result_explanation.v1` defines Agent or external explanation payloads with required `evidence_refs`. PRD and Development Plan require Agent explanations to cite evidence, while also preventing Agents from bypassing contracts or user review. The project does not define an internal LLM provider or production approval publication flow.

## Decision

- AutoWaterSimu accepts externally generated `result_explanation.v1` payloads only after schema validation.
- Submission requires the target job to have a result and every referenced evidence ref to resolve within the same job boundary.
- Review is explicit and limited to `approved` or `rejected`.
- Publish requires a prior approved review and stores an audit status only.
- AutoWaterSimu does not generate natural-language explanation text, execute Agent code, publish production control commands, or mark external production approvals complete.
- Future LLM generation, reviewer assignment, approval-page UI, and production approval integration require separate contracts or endpoints.

## Consequences

- Agent/NewSystem integrations can submit, review, read, and publish explanation records through stable API surfaces.
- Published explanations remain evidence-backed metadata, not production actions.
- The workflow can be extended later without weakening the current no-side-effect boundary.
