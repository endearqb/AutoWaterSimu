import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization,content-type,idempotency-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
}

const json = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  headers: corsHeaders,
  status,
})

const metricsText = [
  "# HELP autowatersimu_compute_api_up API process is serving metrics",
  "# TYPE autowatersimu_compute_api_up gauge",
  "autowatersimu_compute_api_up 1",
  'autowatersimu_compute_jobs_total{status="queued"} 2',
  'autowatersimu_compute_jobs_total{status="running"} 1',
  "autowatersimu_compute_workers_registered_total 3",
  "autowatersimu_compute_artifacts_total 7",
  "autowatersimu_compute_artifact_retention_candidates_total 2",
].join("\n")

test("shows lifecycle metrics and runs guarded retention sweep", async ({
  page,
}) => {
  const sweepRequests: Array<Record<string, unknown>> = []
  const unexpectedComputeRequests: string[] = []

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "playwright-user-token")
    localStorage.setItem("compute_access_token", "playwright-compute-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill(
      json({
        email: "playwright@example.com",
        full_name: "Playwright User",
        id: "user_playwright",
        is_active: true,
        is_superuser: true,
        user_type: "ultra",
      }),
    )
  })

  await page.route("http://localhost:8088/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname

    if (method === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders, status: 204 })
      return
    }

    if (method === "GET" && path === "/healthz") {
      await route.fulfill(json({ status: "ok" }))
      return
    }

    if (method === "GET" && path === "/readyz") {
      await route.fulfill(json({ status: "ready" }))
      return
    }

    if (method === "GET" && path === "/metrics") {
      await route.fulfill({
        body: metricsText,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
        status: 200,
      })
      return
    }

    if (
      method === "POST" &&
      path === "/api/v1/admin/artifacts/retention-sweep"
    ) {
      const body = request.postDataJSON() as Record<string, unknown>
      sweepRequests.push(body)
      const dryRun = body.dry_run !== false
      await route.fulfill(
        json({
          schema_version: "artifact_retention_sweep.v1",
          checked: 2,
          deleted: dryRun ? 0 : 1,
          dry_run: dryRun,
          generated_at: "2026-05-31T00:00:00.000Z",
          items: [
            {
              action: dryRun ? "would_delete" : "deleted",
              artifact_id: "artifact_ttl_expired",
              job_id: "job_ttl",
              retention_policy: "ttl",
              retain_until: "2026-05-30T00:00:00Z",
            },
            {
              action: "skipped",
              artifact_id: "artifact_archive_candidate",
              job_id: "job_archive",
              reason: "archive_executor_not_configured",
              retention_policy: "archive_candidate",
              retain_until: "2026-05-30T00:00:00Z",
            },
          ],
          skipped: 1,
        }),
      )
      return
    }

    unexpectedComputeRequests.push(`${method} ${path}`)
    await route.fulfill(json({ message: "unexpected mock request" }, 404))
  })

  await page.goto("/compute-lifecycle")

  await expect(
    page.getByRole("heading", { name: "Compute lifecycle" }),
  ).toBeVisible()
  await expect(page.getByText("Queued jobs", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Retention candidates", { exact: true }),
  ).toBeVisible()

  const deleteButton = page.getByRole("button", {
    name: /Delete eligible TTL/i,
  })
  await expect(deleteButton).toBeDisabled()

  await page.getByRole("button", { name: /Dry run/i }).click()
  await expect(
    page.getByRole("cell", { name: "artifact_ttl_expired" }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "archive_executor_not_configured" }),
  ).toBeVisible()
  await expect(deleteButton).toBeEnabled()

  await deleteButton.click()
  await expect.poll(() => sweepRequests.length).toBe(2)
  expect(sweepRequests[0]).toMatchObject({ dry_run: true, limit: 100 })
  expect(sweepRequests[1]).toMatchObject({ dry_run: false, limit: 100 })
  await expect(page.getByRole("cell", { name: "deleted" })).toBeVisible()
  expect(unexpectedComputeRequests).toEqual([])
})
