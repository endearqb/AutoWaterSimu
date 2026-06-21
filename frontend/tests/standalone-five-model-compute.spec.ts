import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const apiBaseUrl = process.env.VITE_COMPUTE_API_URL || "http://localhost:8088"
const standaloneEnabled =
  process.env.VITE_APP_MODE === "standalone" ||
  process.env.VITE_AUTH_MODE === "disabled" ||
  process.env.VITE_CONTEXT_MODE === "standalone"

test.skip(
  !standaloneEnabled,
  "standalone five-model compute smoke requires standalone frontend env",
)

test("model services submit five standalone compute job types", async ({
  page,
}) => {
  const submittedJobs: Array<Record<string, unknown>> = []
  const legacyRequests: string[] = []

  await page.route(`${apiBaseUrl}/api/v1/compute/jobs`, async (route) => {
    const request = route.request()
    const headers = {
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "*",
    }
    if (request.method() === "OPTIONS") {
      await route.fulfill({ headers, status: 204 })
      return
    }
    const job = request.postDataJSON() as Record<string, unknown>
    submittedJobs.push(job)
    await route.fulfill({
      contentType: "application/json",
      headers,
      status: 202,
      body: JSON.stringify({
        job: {
          job_id: job.job_id,
          job_type: job.job_type,
          status: "queued",
          created_at: "2026-06-21T00:00:00Z",
          input_json: job,
        },
        artifacts: [],
        event_count: 1,
      }),
    })
  })

  page.on("request", (request) => {
    const url = new URL(request.url())
    const legacyPrefixes = [
      "/api/v1/material-balance",
      "/api/v1/asm1",
      "/api/v1/asm1slim",
      "/api/v1/asm3",
      "/api/v1/udm",
      "/api/v1/simple-websocket",
    ]
    if (legacyPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
      legacyRequests.push(`${request.method()} ${url.pathname}`)
    }
  })

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
        model === "materialBalance" ? "tank" : model === "asm1slim" ? "asmslim" : model
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
        name: `${model} standalone smoke`,
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
  expect(submittedJobs.map((job) => job.job_type)).toEqual([
    "simulation.material_balance.v1",
    "simulation.asm1slim.v1",
    "simulation.asm1.v1",
    "simulation.asm3.v1",
    "simulation.udm.v1",
  ])

  for (const job of submittedJobs) {
    const payload = job.payload as Record<string, unknown>
    const metadata = payload.metadata as Record<string, unknown>
    expect(payload.schema_version).toBe("simulation_input.v1")
    expect(payload.job_type).toBe(job.job_type)
    expect(Array.isArray(payload.nodes)).toBeTruthy()
    expect(Array.isArray(payload.edges)).toBeTruthy()
    expect(metadata.original_flowchart_data).toBeTruthy()
  }

  const [, asm1SlimJob, asm1Job, asm3Job, udmJob] = submittedJobs
  const asm1SlimNode = (
    (asm1SlimJob.payload as Record<string, unknown>).nodes as Array<
      Record<string, unknown>
    >
  )[1]
  const asm1Node = (
    (asm1Job.payload as Record<string, unknown>).nodes as Array<
      Record<string, unknown>
    >
  )[1]
  const asm3Node = (
    (asm3Job.payload as Record<string, unknown>).nodes as Array<
      Record<string, unknown>
    >
  )[1]
  const udmNode = (
    (udmJob.payload as Record<string, unknown>).nodes as Array<
      Record<string, unknown>
    >
  )[1]
  expect((asm1SlimNode.asm1slim_parameters as unknown[]).length).toBe(7)
  expect((asm1Node.asm1_parameters as unknown[]).length).toBe(19)
  expect((asm3Node.asm3_parameters as unknown[]).length).toBe(37)
  expect(udmNode.udm_model_id).toBe("udm_test_model")
  expect((udmNode.udm_variable_bindings as unknown[]).length).toBe(2)
})
