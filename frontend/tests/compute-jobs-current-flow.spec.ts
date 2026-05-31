import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization,content-type,idempotency-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
}

const now = "2026-05-30T00:00:00.000Z"

type JobSnapshot = {
  job: Record<string, unknown> & {
    created_at: string
    job_id: string
    job_type: string
    status: string
  }
  artifacts: Array<Record<string, unknown>>
  event_count: number
}

const json = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  headers: corsHeaders,
  status,
})

const createSnapshot = (
  job: Record<string, unknown> & { job_id: string; job_type: string },
): JobSnapshot => ({
  job: {
    ...job,
    attempt: 0,
    created_at: String(job.created_at || now),
    job_id: job.job_id,
    job_type: job.job_type,
    payload_hash: "sha256:current-flow-payload",
    queued_at: now,
    result_hash: "sha256:current-flow-result",
    status: "queued",
    worker_id: "mock-worker",
  },
  artifacts: [
    {
      artifact_id: "artifact_current_flow_smoke",
      checksum: "sha256:artifact",
      content_type: "application/json",
      job_id: job.job_id,
      object_key: "jobs/current-flow/result.json",
      retention_policy: "retain_forever",
    },
  ],
  event_count: 1,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

test("submits current flow graph as a compute job", async ({ page }) => {
  const jobs: JobSnapshot[] = []
  const submittedJobs: Array<Record<string, unknown>> = []
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

    if (method === "GET" && path === "/api/v1/compute/jobs") {
      await route.fulfill(
        json({
          items: jobs,
          total_estimate: jobs.length,
        }),
      )
      return
    }

    if (method === "POST" && path === "/api/v1/compute/jobs") {
      const job = request.postDataJSON() as Record<string, unknown>
      if (
        typeof job.job_id !== "string" ||
        typeof job.job_type !== "string"
      ) {
        await route.fulfill(
          json({ message: "job_id and job_type are required" }, 400),
        )
        return
      }
      submittedJobs.push(job)
      const snapshot = createSnapshot({
        ...job,
        job_id: job.job_id,
        job_type: job.job_type,
      })
      jobs.unshift(snapshot)
      await route.fulfill(json(snapshot, 202))
      return
    }

    const jobMatch = path.match(/^\/api\/v1\/compute\/jobs\/([^/]+)$/)
    if (method === "GET" && jobMatch) {
      const snapshot = jobs.find((item) => item.job.job_id === jobMatch[1])
      await route.fulfill(
        snapshot
          ? json(snapshot)
          : json({ message: "job not found" }, 404),
      )
      return
    }

    const resultMatch = path.match(
      /^\/api\/v1\/compute\/jobs\/([^/]+)\/result$/,
    )
    if (method === "GET" && resultMatch) {
      await route.fulfill(
        json({
          model_runs: [
            {
              job_id: resultMatch[1],
              model_key: "material_balance",
              model_run_id: "mr_current_flow_smoke",
              model_version: "v1",
              parameter_hash: "sha256:current-flow-parameters",
            },
          ],
          summary: {
            evidence_refs: [
              "model_run:mr_current_flow_smoke",
              "artifact:artifact_current_flow_smoke",
            ],
            process_graph_id: "pg_graph_current_flow_smoke",
            status: "queued",
          },
        }),
      )
      return
    }

    const readinessMatch = path.match(
      /^\/api\/v1\/compute\/jobs\/([^/]+)\/production-readiness$/,
    )
    if (method === "GET" && readinessMatch) {
      await route.fulfill(
        json({
          auto_publish_allowed: false,
          blocking_reasons: [],
          checks: [
            {
              check_id: "job_succeeded",
              evidence_refs: [`job:${readinessMatch[1]}`],
              message: "Job completed successfully.",
              status: "passed",
            },
            {
              check_id: "governance_production_allowed",
              evidence_refs: [
                `evidence_package:evidence_${readinessMatch[1]}`,
              ],
              message:
                "Evidence governance allows this model/parameter evidence for production review.",
              status: "passed",
            },
          ],
          evidence_package_id: `evidence_${readinessMatch[1]}`,
          external_approval_required: true,
          generated_at: now,
          job_id: readinessMatch[1],
          policy_version: "production_readiness_policy.v1",
          production_ready: true,
          readiness_status: "ready_for_external_approval",
          risk_findings_summary: {
            blocking: [],
            by_severity: {
              critical: 0,
              high: 0,
              info: 1,
              low: 0,
              medium: 0,
            },
            total: 1,
          },
          schema_version: "production_readiness.v1",
          warnings: [],
        }),
      )
      return
    }

    const eventsMatch = path.match(
      /^\/api\/v1\/compute\/jobs\/([^/]+)\/events$/,
    )
    if (method === "GET" && eventsMatch) {
      await route.fulfill(
        json({
          items: [
            {
              created_at: now,
              event: { source: "playwright-current-flow-smoke" },
              event_type: "job.queued",
              id: "event_current_flow_queued",
              job_id: eventsMatch[1],
            },
          ],
        }),
      )
      return
    }

    const evidenceMatch = path.match(
      /^\/api\/v1\/compute\/jobs\/([^/]+)\/evidence-ref$/,
    )
    if (method === "GET" && evidenceMatch) {
      await route.fulfill(
        json({
          evidence_ref: url.searchParams.get("ref") || "",
          job_id: evidenceMatch[1],
          payload: { model_run_id: "mr_current_flow_smoke" },
          ref_id: "mr_current_flow_smoke",
          ref_type: "model_run",
          resolved: true,
        }),
      )
      return
    }

    if (method === "GET" && path === "/api/v1/model-runs") {
      await route.fulfill(json({ items: [], total_estimate: 0 }))
      return
    }

    if (method === "GET" && path === "/api/v1/model-catalog") {
      await route.fulfill(
        json({
          generated_at: now,
          models: [],
          schema_version: "model_catalog.v1",
        }),
      )
      return
    }

    unexpectedComputeRequests.push(`${method} ${path}`)
    await route.fulfill(json({ message: "unexpected mock request" }, 404))
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
      currentFlowChartId: "graph_current_flow_smoke",
      currentFlowChartName: "Playwright Current Flow Smoke",
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
          data: { flow: 80 },
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
            e_tank_out: {
              factors: { COD: { a: 0.85, b: 1 } },
              flow: 72,
            },
          },
          endHour: 1,
          id: "seg_peak",
          startHour: 0,
        },
      ],
    })
  })

  const currentFlowButton = page.getByRole("button", {
    name: /Current flow/i,
  })
  await expect(currentFlowButton).toBeEnabled()
  await currentFlowButton.click()

  await expect
    .poll(() => submittedJobs.length, {
      message: "current-flow submission should reach Compute API",
    })
    .toBe(1)

  const submittedJob = submittedJobs[0]
  const payload = submittedJob.payload
  const metadata = submittedJob.metadata

  expect(submittedJob.job_type).toBe("simulation.material_balance.v1")
  expect(isRecord(metadata) ? metadata.source : undefined).toBe(
    "legacy_flow_export",
  )
  expect(isRecord(metadata) ? metadata.process_graph_id : undefined).toBe(
    "pg_graph_current_flow_smoke",
  )

  expect(isRecord(payload) ? payload.schema_version : undefined).toBe(
    "simulation_input.v1",
  )
  expect(isRecord(payload) ? payload.process_graph_id : undefined).toBe(
    "pg_graph_current_flow_smoke",
  )
  expect(isRecord(payload) ? payload.process_graph_version : undefined).toBe(1)

  const nodes = isRecord(payload) ? payload.nodes : undefined
  const edges = isRecord(payload) ? payload.edges : undefined
  const timeSegments = isRecord(payload) ? payload.time_segments : undefined
  expect(Array.isArray(nodes) ? nodes : []).toHaveLength(3)
  expect(Array.isArray(edges) ? edges : []).toHaveLength(2)
  expect(Array.isArray(timeSegments) ? timeSegments : []).toHaveLength(1)

  const tankNode = Array.isArray(nodes)
    ? nodes.find(
        (node) => isRecord(node) && node.node_id === "n_tank",
      )
    : undefined
  expect(isRecord(tankNode) ? tankNode.initial_volume : undefined).toBe(500)

  const effluentEdge = Array.isArray(edges)
    ? edges.find(
        (edge) => isRecord(edge) && edge.edge_id === "e_tank_out",
      )
    : undefined
  const transform = isRecord(effluentEdge)
    ? effluentEdge.concentration_transform
    : undefined
  const codTransform = isRecord(transform) ? transform.COD : undefined
  expect(isRecord(codTransform) ? codTransform.a : undefined).toBe(0.9)
  expect(isRecord(codTransform) ? codTransform.b : undefined).toBe(2)

  await expect(
    page.getByRole("cell", {
      name: String(submittedJob.job_id),
    }),
  ).toBeVisible()
  await expect(page.getByText("pg_graph_current_flow_smoke")).toBeVisible()
  await expect(page.getByText("Production readiness")).toBeVisible()
  await expect(page.getByText("ready_for_external_approval")).toBeVisible()
  expect(unexpectedComputeRequests).toEqual([])
})
