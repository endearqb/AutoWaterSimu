# Directory Guide: apps/desktop/src

## 1. Responsibility

This directory contains the Phase 3C Desktop React shell.

It is responsible for:

- Calling Rust Tauri commands through typed wrappers.
- Showing worker health, local projects, project package import/export counts, project-associated local compute jobs/canvas graphs, queued-job cancellation, canvas/process graph command smoke, job details, artifact/model_run refs, JSON/CSV export results, backup/restore results, and support bundle results.
- Providing a dev-mode material balance demo flow.

It is not responsible for:

- Starting worker processes directly.
- Writing SQLite or local files directly.
- Reusing legacy Chakra pages.

## 2. Core Files

| File / directory | Purpose |
|---|---|
| `main.tsx` | React entrypoint |
| `App.tsx` | Desktop MVP workbench |
| `styles.css` | Local COSS-compatible visual styling |
| `lib/desktopCommands.ts` | Tauri command wrapper |
| `fixtures/materialBalanceMinimalJob.ts` | Embedded demo compute job |
| `fixtures/materialBalanceGraphFixtures.ts` | Embedded canvas/process graph command smoke fixtures |

## 3. Maintenance Rules

1. All side effects must go through Rust commands.
2. Browser-only Vite preview must stay read-only when Tauri APIs are unavailable.
3. Keep this app independent from legacy `frontend/`.
4. Export controls call Rust commands; React must not write local files directly.
5. Canvas/process graph buttons use Rust command wrappers; React must not persist graph JSON itself.
6. Project controls call Rust registry/package export/import commands only; React must not create local project files or mutate SQLite directly.
7. When a project is selected, demo job creation and CanvasGraph save pass that `project_id` to Rust; Rust remains responsible for validation and persistence.

## 4. Public Interfaces

This directory calls Tauri commands exposed by `apps/desktop/src-tauri`.

## 5. Dependency Boundary

Can depend on:

- React.
- `@tauri-apps/api`.
- Local fixtures and UI helpers.

Should not depend on:

- Chakra UI.
- Legacy FastAPI client.
- Node filesystem or shell APIs.

## 6. Testing

After changes run:

```powershell
cd apps\desktop; npm run typecheck
cd apps\desktop; npm run build
```

## 7. AI Notes

Read the parent Desktop README and keep Rust as the owner of SQLite, worker lifecycle, and artifact paths.
