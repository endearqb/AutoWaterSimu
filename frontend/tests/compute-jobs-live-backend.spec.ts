import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
}

const jobId = process.env.AUTOWATERSIMU_LIVE_COMPUTE_JOB_ID || ""
const modelRunId = process.env.AUTOWATERSIMU_LIVE_COMPUTE_MODEL_RUN_ID || ""
const artifactId = process.env.AUTOWATERSIMU_LIVE_COMPUTE_ARTIFACT_ID || ""
const apiBaseUrl =
  process.env.AUTOWATERSIMU_LIVE_COMPUTE_API_BASE_URL ||
  process.env.VITE_COMPUTE_API_URL ||
  "http://localhost:8088"
const computeToken =
  process.env.AUTOWATERSIMU_LIVE_COMPUTE_API_TOKEN || "dev-public-token"

test.skip(
  !jobId || !modelRunId || !artifactId,
  "live backend smoke requires AUTOWATERSIMU_LIVE_COMPUTE_* environment",
)

const json = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  headers: corsHeaders,
  status,
})

test("reads job result and evidence from live Compute API", async ({
  page,
}) => {
  const computeRequests: string[] = []

  await page.addInitScript((token) => {
    localStorage.setItem("access_token", "playwright-user-token")
    localStorage.setItem("compute_access_token", token)
  }, computeToken)

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

  page.on("request", (request) => {
    if (request.url().startsWith(apiBaseUrl)) {
      computeRequests.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })

  await page.goto("/compute-jobs")

  await expect(page.getByText(apiBaseUrl)).toBeVisible()
  await expect(page.getByText("ready").first()).toBeVisible({
    timeout: 30_000,
  })

  const jobCell = page.getByRole("cell", { name: jobId }).first()
  await expect(jobCell).toBeVisible({ timeout: 30_000 })
  await jobCell.click()

  await expect(page.getByText(jobId).first()).toBeVisible()
  await expect(page.getByText("succeeded", { exact: true }).first()).toBeVisible()
  await expect(page.getByText(artifactId).first()).toBeVisible()

  const evidenceDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: /^Evidence$/ }).click()
  const download = await evidenceDownload
  expect(download.suggestedFilename()).toBe(`evidence_${jobId}.json`)
  await expect(page.getByText(/^sha256:/).first()).toBeVisible()

  await page.getByPlaceholder("model_run:...").fill(`model_run:${modelRunId}`)
  await page.getByRole("button", { name: /^Resolve$/ }).click()
  await expect(page.getByText("model_run", { exact: true })).toBeVisible()
  await expect(page.getByText("Reference ID")).toBeVisible()
  await expect(page.getByText(modelRunId, { exact: true }).first()).toBeVisible()

  expect(computeRequests).toEqual(
    expect.arrayContaining([
      "GET /healthz",
      "GET /readyz",
      "GET /api/v1/compute/jobs",
      `GET /api/v1/compute/jobs/${jobId}`,
      `GET /api/v1/compute/jobs/${jobId}/result`,
      `GET /api/v1/compute/jobs/${jobId}/evidence`,
      `GET /api/v1/compute/jobs/${jobId}/evidence-ref`,
    ]),
  )
})
