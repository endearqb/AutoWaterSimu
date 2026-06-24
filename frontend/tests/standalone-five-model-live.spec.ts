import { expect, test } from "@playwright/test"
import { readFile, writeFile } from "node:fs/promises"

test.use({ storageState: { cookies: [], origins: [] } })
test.setTimeout(240_000)

const apiBaseUrl =
  process.env.AUTOWATERSIMU_FIVE_MODEL_LIVE_API_BASE_URL ||
  process.env.VITE_COMPUTE_API_URL ||
  "http://localhost:8088"
const apiToken =
  process.env.AUTOWATERSIMU_FIVE_MODEL_LIVE_API_TOKEN ||
  process.env.VITE_COMPUTE_API_TOKEN ||
  ""
const standaloneEnabled =
  process.env.VITE_APP_MODE === "standalone" ||
  process.env.VITE_AUTH_MODE === "disabled" ||
  process.env.VITE_CONTEXT_MODE === "standalone"
const liveMode = process.env.AUTOWATERSIMU_FIVE_MODEL_LIVE_MODE || "full"
const jobIDsPath = process.env.AUTOWATERSIMU_FIVE_MODEL_LIVE_JOB_IDS_PATH || ""

test.skip(
  !standaloneEnabled,
  "standalone five-model live smoke requires standalone frontend env",
)

const expectedJobTypes = [
  "simulation.material_balance.v1",
  "simulation.asm1slim.v1",
  "simulation.asm1.v1",
  "simulation.asm3.v1",
  "simulation.udm.v1",
]

const authHeaders = apiToken
  ? {
      Authorization: `Bearer ${apiToken}`,
    }
  : undefined

test("five model services complete against live compute API and worker", async ({
  page,
  request,
}) => {
  const submittedJobs: Array<Record<string, unknown>> = []
  const legacyRequests: string[] = []

  page.on("request", (request) => {
    const url = new URL(request.url())
    const legacyPrefixes = [
      "/api/v1/auth",
      "/api/v1/users",
      "/api/v1/material-balance",
      "/api/v1/asm1",
      "/api/v1/asm1slim",
      "/api/v1/asm3",
      "/api/v1/udm/",
      "/api/v1/simple-websocket",
    ]
    if (legacyPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
      legacyRequests.push(`${request.method()} ${url.pathname}`)
    }
    if (
      request.method() === "POST" &&
      url.origin === new URL(apiBaseUrl).origin &&
      url.pathname === "/api/v1/compute/jobs"
    ) {
      submittedJobs.push(request.postDataJSON() as Record<string, unknown>)
    }
  })

  let jobIDs: string[] = []

  if (liveMode !== "verify") {
    await page.goto("/")

    await page.evaluate(async () => {
      const materialStorePath = "/src/stores/materialBalanceStore.ts"
      const asm1SlimPath = "/src/services/asm1slimService.ts"
      const asm1Path = "/src/services/asm1Service.ts"
      const asm3Path = "/src/services/asm3Service.ts"
      const udmPath = "/src/services/udmService.ts"
      const [
        materialStoreModule,
        asm1SlimModule,
        asm1Module,
        asm3Module,
        udmModule,
      ] = await Promise.all([
        import(materialStorePath),
        import(asm1SlimPath),
        import(asm1Path),
        import(asm3Path),
        import(udmPath),
      ])

      const modelComponents = {
        materialBalance: ["COD"],
        asm1slim: [
          "dissolvedOxygen",
          "cod",
          "nitrate",
          "ammonia",
          "totalAlkalinity",
        ],
        asm1: [
          "X_BH",
          "X_BA",
          "X_S",
          "X_i",
          "X_ND",
          "S_O",
          "S_S",
          "S_NO",
          "S_NH",
          "S_ND",
          "S_ALK",
        ],
        asm3: [
          "X_H",
          "X_A",
          "X_S",
          "X_I",
          "X_ND",
          "X_STO",
          "S_O",
          "S_S",
          "S_NO",
          "S_NH",
          "S_ND",
          "S_ALK",
          "S_I",
        ],
        udm: ["A", "B"],
      } as const

      const edgeData = (components: readonly string[]) =>
        components.reduce<Record<string, number>>(
          (record, name) => ({
            ...record,
            [`${name}_a`]: 1,
            [`${name}_b`]: 0,
          }),
          { flow: 10 },
        )

      const nodeData = (components: readonly string[], volume?: number) =>
        components.reduce<Record<string, number>>(
          (record, name, index) => ({
            ...record,
            [name]: index + 1,
          }),
          volume === undefined ? {} : { volume },
        )

      const flow = (
        model:
          | "materialBalance"
          | "asm1slim"
          | "asm1"
          | "asm3"
          | "udm",
      ) => {
        const components = modelComponents[model]
        const modelNodeType =
          model === "materialBalance"
            ? "tank"
            : model === "asm1slim"
              ? "asmslim"
              : model
        const modelNodeExtra =
          model === "udm"
            ? {
                udmComponents: [
                  { name: "S", default_value: 1 },
                  { name: "P", default_value: 0 },
                ],
                udmComponentNames: ["S", "P"],
                udmModelHash:
                  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                udmModelId: "udm_test_model",
                udmModelSnapshot: {
                  components: [
                    { name: "S", default_value: 1 },
                    { name: "P", default_value: 0 },
                  ],
                  hash:
                    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  id: "udm_test_model",
                  name: "UDM test model",
                  parameters: [{ name: "k", default_value: 0.1 }],
                  processes: [
                    { name: "convert", rate_expr: "k*S", stoich: { P: 1, S: -1 } },
                  ],
                  version: 1,
                },
                udmModelVersion: 1,
                udmParameterValues: { k: 0.1 },
                udmProcesses: [
                  { name: "convert", rate_expr: "k*S", stoich: { P: 1, S: -1 } },
                ],
              }
            : {}
        return {
          calculationParameters: {
            hours: 0.5,
            solver_method: "scipy_solver",
            steps_per_hour: 20,
            tolerance: 0.000001,
          },
          customParameters: components.map((name) => ({
            defaultValue: 0,
            label: name,
            name,
          })),
          edges: [
            {
              data: edgeData(components),
              id: `e_${model}_in_reactor`,
              source: `n_${model}_in`,
              target: `n_${model}_reactor`,
              type: "editable",
            },
            {
              data: edgeData(components),
              id: `e_${model}_reactor_out`,
              source: `n_${model}_reactor`,
              target: `n_${model}_out`,
              type: "editable",
            },
          ],
          name: `${model} standalone live smoke`,
          nodes: [
            {
              data: nodeData(components),
              id: `n_${model}_in`,
              position: { x: 0, y: 0 },
              type: "input",
            },
            {
              data: {
                ...nodeData(components, 10),
                ...modelNodeExtra,
              },
              id: `n_${model}_reactor`,
              position: { x: 200, y: 0 },
              type: modelNodeType,
            },
            {
              data: nodeData(components),
              id: `n_${model}_out`,
              position: { x: 400, y: 0 },
              type: "output",
            },
          ],
          timeSegments: [],
        }
      }

      await materialStoreModule.useMaterialBalanceStore
        .getState()
        .createCalculationJobFromFlowchart(flow("materialBalance"))
      await asm1SlimModule.asm1SlimService.createCalculationJobFromFlowchart(
        flow("asm1slim"),
      )
      await asm1Module.asm1Service.createCalculationJobFromFlowchart(flow("asm1"))
      await asm3Module.asm3Service.createCalculationJobFromFlowchart(flow("asm3"))
      await udmModule.udmService.createCalculationJobFromFlowchart(flow("udm"))
    })

    expect(legacyRequests).toEqual([])
    await expect.poll(() => submittedJobs.length).toBe(5)
    expect(submittedJobs.map((job) => job.job_type)).toEqual(expectedJobTypes)
    jobIDs = submittedJobs.map((job) => String(job.job_id))
    if (jobIDsPath) {
      await writeFile(jobIDsPath, JSON.stringify({ job_ids: jobIDs }, null, 2))
    }
    if (liveMode === "submit") {
      return
    }
  } else {
    const payload = JSON.parse(await readFile(jobIDsPath, "utf-8")) as {
      job_ids?: string[]
    }
    jobIDs = payload.job_ids || []
  }

  expect(jobIDs).toHaveLength(5)
  const statuses = new Map<string, string>()
  await expect
    .poll(
      async () => {
        for (const jobID of jobIDs) {
          const response = await request.get(
            `${apiBaseUrl}/api/v1/compute/jobs/${jobID}`,
            { headers: authHeaders },
          )
          expect(response.ok()).toBeTruthy()
          const snapshot = (await response.json()) as {
            job?: { status?: string }
          }
          statuses.set(jobID, snapshot.job?.status || "")
        }
        return jobIDs.map((jobID) => statuses.get(jobID))
      },
      { intervals: [1000, 2000, 5000], timeout: 180_000 },
    )
    .toEqual(jobIDs.map(() => "succeeded"))

  for (const jobID of jobIDs) {
    const response = await request.get(
      `${apiBaseUrl}/api/v1/compute/jobs/${jobID}/result`,
      { headers: authHeaders },
    )
    expect(response.ok()).toBeTruthy()
    const result = (await response.json()) as {
      artifacts?: unknown[]
      model_runs?: unknown[]
    }
    expect(result.model_runs?.length).toBeGreaterThan(0)
    expect(result.artifacts?.length).toBeGreaterThan(0)
  }

  await page.goto("/compute-jobs")
  for (const jobID of jobIDs) {
    await expect(page.getByRole("cell", { name: jobID }).first()).toBeVisible({
      timeout: 30_000,
    })
  }
})
