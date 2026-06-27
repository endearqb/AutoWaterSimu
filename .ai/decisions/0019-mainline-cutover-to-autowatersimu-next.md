# 0019 - Mainline Cutover To AutoWaterSimu Next

## Status

Accepted.

## Context

The previous `main` branch represented the legacy FastAPI + React system:

- `origin/main`: `4c7d61e7df2b5c9a1751af3168f5a1d6032d20cf`
- Last commit: `Add waterdataai sponsor`

The `codex/autowatersimu-next-rebuild` branch now contains the active AutoWaterSimu Next monorepo baseline:

- `origin/codex/autowatersimu-next-rebuild`: `243e2ca4fde7b3897d17bd35f8c033a2faefacd1`
- Last commit before cutover record: `Refactor water simulation flow and remove legacy code`

The old `origin/main` is already an ancestor of the rebuild branch, so promoting rebuild to `main` can be a fast-forward rather than a force push.

## Decision

Keep the existing AutoWaterSimu repository as the canonical repository.

Promote `codex/autowatersimu-next-rebuild` to `main`.

Freeze the old FastAPI mainline as:

- Branch: `legacy/fastapi-frozen`
- Tag: `fastapi-legacy-2026-06-27`

Start v2 work from the new `main` on short branches. The first branch is `codex/udm-network-v2` unless a more specific task requires a narrower name.

Do not delete `codex/autowatersimu-next-rebuild` during the cutover; keep it as a temporary compatibility/ref history branch until repository governance is fully settled.

## Consequences

- `main` now means AutoWaterSimu Next, not the old FastAPI template-derived system.
- Legacy `backend/` and `frontend/` remain available as migration/oracle material and historical reference.
- New work should branch from `main`; old FastAPI fixes should target `legacy/fastapi-frozen` only when necessary.
- README, CI, release gates, issue/PR default targets, and repository description should be audited against the new mainline meaning.

## Alternatives Considered

- Create a new `AutoWaterSimu-Next` repository: rejected for this cutover because it would split issues, PRs, stars, Actions, history, and user entry points.
- Keep old FastAPI as `main` and develop Next permanently on a long-lived branch: rejected because default branch semantics, release gates, and contributor expectations would remain wrong.
- Force push `main`: unnecessary because the old `main` is an ancestor of the Next rebuild branch.

## Follow-up

- Confirm GitHub branch protection and default branch rules still target `main`.
- Retarget or close old PRs that still assume FastAPI `main`.
- Update repository description if it still describes only FastAPI + React.
- Keep UDM-v2 contract/runtime ADRs separate from this repository-governance decision.
