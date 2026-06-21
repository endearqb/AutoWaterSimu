import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })
test.setTimeout(150_000)

const apiBaseUrl =
  process.env.AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_BASE_URL ||
  process.env.VITE_COMPUTE_API_URL ||
  "http://localhost:8088"
const computeToken =
  process.env.AUTOWATERSIMU_CURRENT_FLOW_LIVE_API_TOKEN ??
  process.env.VITE_COMPUTE_API_TOKEN ??
  ""

const authHeaders: Record<string, string> | undefined = computeToken
  ? { Authorization: `Bearer ${computeToken}` }
  : undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

test("submits current flow to live worker and reads evidence", async ({
  page,
  request,
}) => {
  const computeRequests: string[] = []
  const legacyAuthRequests: string[] = []

  await page.addInitScript(() => localStorage.clear())

  page.on("request", (liveRequest) => {
    const url = new URL(liveRequest.url())
    if (liveRequest.url().startsWith(apiBaseUrl)) {
      computeRequests.push(`${liveRequest.method()} ${url.pathname}`)
    }
    if (
      url.pathname === "/login" ||
      url.pathname.startsWith("/api/v1/login") ||
      url.pathname === "/api/v1/users" ||
      url.pathname.startsWith("/api/v1/users/")
    ) {
      legacyAuthRequests.push(`${liveRequest.method()} ${url.pathname}`)
    }
  })

  await page.goto("/compute-jobs")

  await page.evaluate(async () => {
    const storePath = "/src/stores/flowStore.ts"
    const module = await import(storePath)
    const useFlowStore = module.default
    useFlowStore.setState({
      calculationParameters: {
        hours: 2,
        max_iterations: 1000,
        max_memory_mb: 1000,
        sampling_interval_hours: 0.5,
        solver_method: "scipy_solver",
        steps_per_hour: 30,
        tolerance: 0.000001,
      },
      currentFlowChartId: "graph_current_flow_live_smoke",
      currentFlowChartName: "Playwright Current Flow Live Smoke",
      customParameters: [
        {
          defaultValue: 0,
          label: "COD",
          name: "COD",
        },
      ],
      edgeParameterConfigs: {
        e_in_tank: {
          COD: { a: 1, b: 0 },
        },
        e_tank_out: {
          COD: { a: 0.9, b: 2 },
        },
      },
      edges: [
        {
          data: { flow: 100 },
          id: "e_in_tank",
          source: "n_in",
          target: "n_tank",
          type: "editable",
        },
        {
          data: { flow: 100 },
          id: "e_tank_out",
          source: "n_tank",
          target: "n_out",
          type: "editable",
        },
      ],
      nodes: [
        {
          data: { COD: 120, label: "Influent" },
          id: "n_in",
          position: { x: 0, y: 0 },
          type: "input",
        },
        {
          data: { COD: 20, label: "Aeration tank", volume: 500 },
          id: "n_tank",
          position: { x: 220, y: 0 },
          type: "tank",
        },
        {
          data: { COD: 5, label: "Effluent" },
          id: "n_out",
          position: { x: 440, y: 0 },
          type: "output",
        },
      ],
      timeSegments: [
        {
          edgeOverrides: {
            e_in_tank: {
              factors: { COD: { a: 0.95, b: 0.5 } },
              flow: 100,
            },
          },
          endHour: 2,
          id: "seg_peak",
          startHour: 0,
        },
      ],
    })
  })

  const createRequestPromise = page.waitForRequest(
    (liveRequest) =>
      liveRequest.url() === `${apiBaseUrl}/api/v1/compute/jobs` &&
      liveRequest.method() === "POST",
  )
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${apiBaseUrl}/api/v1/compute/jobs` &&
      response.request().method() === "POST",
  )

  const currentFlowButton = page.getByRole("button", {
    name: /Current flow/i,
  })
  await expect(currentFlowButton).toBeEnabled()
  await currentFlowButton.click()

  const createRequest = await createRequestPromise
  const submittedJob = createRequest.postDataJSON() as Record<string, unknown>
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(202)
  const createdSnapshot = (await createResponse.json()) as {
    job: { job_id: string; job_type: string }
  }

  const payload = submittedJob.payload
  const metadata = submittedJob.metadata
  const jobId = createdSnapshot.job.job_id

  expect(submittedJob.job_type).toBe("simulation.material_balance.v1")
  expect(isRecord(metadata) ? metadata.source : undefined).toBe(
    "legacy_flow_export",
  )
  expect(isRecord(metadata) ? metadata.process_graph_id : undefined).toBe(
    "pg_graph_current_flow_live_smoke",
  )
  expect(isRecord(payload) ? payload.schema_version : undefined).toBe(
    "simulation_input.v1",
  )
  expect(isRecord(payload) ? payload.process_graph_id : undefined).toBe(
    "pg_graph_current_flow_live_smoke",
  )

  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${apiBaseUrl}/api/v1/compute/jobs/${jobId}`,
          { headers: authHeaders },
        )
        const snapshot = (await response.json()) as {
          job?: { status?: string }
        }
        return snapshot.job?.status || "missing"
      },
      {
        intervals: [1000, 2000, 5000],
        message: "live worker should complete the UI-submitted current-flow job",
        timeout: 120_000,
      },
    )
    .toBe("succeeded")

  const resultResponse = await request.get(
    `${apiBaseUrl}/api/v1/compute/jobs/${jobId}/result`,
    { headers: authHeaders },
  )
  expect(resultResponse.ok()).toBeTruthy()
  const result = (await resultResponse.json()) as {
    artifacts?: Array<Record<string, unknown>>
    model_runs?: Array<Record<string, unknown>>
  }
  const modelRunId = String(result.model_runs?.[0]?.model_run_id || "")
  const artifactId = String(result.artifacts?.[0]?.artifact_id || "")
  expect(modelRunId).toMatch(/^mr_/)
  expect(artifactId).toMatch(/^art_/)

  await page.goto("/compute-jobs")
  const jobCell = page.getByRole("cell", { name: jobId }).first()
  await expect(jobCell).toBeVisible({ timeout: 30_000 })
  await jobCell.click()

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
  await expect(page.getByText(modelRunId, { exact: true }).first()).toBeVisible()

  expect(computeRequests).toEqual(
    expect.arrayContaining([
      "GET /healthz",
      "GET /readyz",
      "GET /api/v1/compute/jobs",
      "POST /api/v1/compute/jobs",
      `GET /api/v1/compute/jobs/${jobId}`,
      `GET /api/v1/compute/jobs/${jobId}/result`,
      `GET /api/v1/compute/jobs/${jobId}/evidence`,
      `GET /api/v1/compute/jobs/${jobId}/evidence-ref`,
    ]),
  )
  expect(legacyAuthRequests).toEqual([])
})
