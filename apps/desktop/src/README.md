# Directory Guide: apps/desktop/src

## 1. Responsibility

This directory contains the Phase 3C Desktop React shell.

It is responsible for:

- Calling Rust Tauri commands through typed wrappers.
- Showing worker health, local compute jobs, job details, artifact refs, and support bundle results.
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

## 3. Maintenance Rules

1. All side effects must go through Rust commands.
2. Browser-only Vite preview must stay read-only when Tauri APIs are unavailable.
3. Keep this app independent from legacy `frontend/`.

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
