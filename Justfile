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

dev-api:
    cd apps\api; go run ./cmd/compute-api

dev-worker-loop:
    backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts --max-jobs 5 --max-idle-polls 20

dev-frontend:
    cd frontend; npm run dev

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

check-security:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1

browser-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1

live-backend-browser-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1

desktop-package-smoke:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1

golden-scenarios:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1

golden-scenarios-refresh:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence

golden-scenarios-refresh-integration:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke

golden-scenarios-refresh-live:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke

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

gen:
    cd frontend; npm run generate-compute-client

lint:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
    git diff --check -- .

release-gate:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode release
