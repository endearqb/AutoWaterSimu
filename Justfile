set windows-shell := ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

default:
    just --list

doctor:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1

bootstrap:
    cd apps\api; go mod download
    cd frontend; npm install
    cd apps\desktop; npm install

dev:
    docker compose -f docker-compose.dev.yml up

dev-detached:
    docker compose -f docker-compose.dev.yml up -d

dev-down:
    docker compose -f docker-compose.dev.yml down

standalone-up:
    docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml up -d --build

standalone-db:
    docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml up -d compute-postgres

standalone-down:
    docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml down

standalone-reset:
    docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml down -v

standalone-status:
    docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml ps

standalone-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-smoke.ps1

standalone-migration-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-migration-smoke.ps1

dev-api:
    cd apps\api; go run ./cmd/compute-api

dev-api-noauth:
    $env:COMPUTE_API_AUTH_MODE='disabled'; $env:COMPUTE_API_BIND_ADDR='127.0.0.1'; cd apps\api; go run ./cmd/compute-api

dev-worker-loop:
    backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts --max-jobs 5 --max-idle-polls 20

dev-worker-noauth:
    backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --artifact-dir tmp\worker-api-artifacts --max-jobs 5 --max-idle-polls 20

dev-frontend:
    cd frontend; npm run dev

dev-frontend-standalone:
    cd frontend; $env:VITE_APP_MODE='standalone'; $env:VITE_AUTH_MODE='disabled'; $env:VITE_CONTEXT_MODE='standalone'; $env:VITE_COMPUTE_API_TOKEN=''; npm run dev

check:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
    backend\.venv\Scripts\python -m pytest contracts\tests -q
    cd apps\api; go test ./...
    cd frontend; npx tsc --noEmit

check-full:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode merge

pr-fast:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1

integration-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose

standalone-integration-smoke:
    just standalone-smoke

check-security:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1

browser-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1

live-backend-browser-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1

current-flow-live-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\current-flow-live-smoke.ps1

performance-baseline-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1

performance-profiling-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1

performance-golden-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1

performance-hotpath-prereview-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-hotpath-prereview-phase0.ps1

performance-go-api-latency-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1

performance-flag-matrix-phase0:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-flag-matrix-phase0.ps1

desktop-package-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1

desktop-release-artifacts-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-release-artifacts-smoke.ps1

golden-scenarios:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1

golden-scenarios-refresh:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence

golden-scenarios-refresh-integration:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke

golden-scenarios-refresh-live:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke

golden-scenarios-refresh-current-flow-live:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke

golden-scenarios-refresh-desktop-release:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-release-artifacts-smoke.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1

release-artifact-download-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1

check-deps:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1

check-contracts:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1

check-ontology:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1

audit-compute-api:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1

audit-simulation-core-input-contract:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1

audit-simulation-core-correctness-freeze:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1

audit-worker-dependency-installation:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1

worker-adapter-strict-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1

worker-packaged-no-fallback-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-packaged-no-fallback-smoke.ps1

gen:
    cd frontend; npm run generate-compute-client

lint:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
    git diff --check -- .

release-gate:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode release
