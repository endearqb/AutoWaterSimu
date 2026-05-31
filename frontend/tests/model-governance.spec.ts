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

const catalog = {
  generated_at: "2026-05-31T00:00:00.000Z",
  models: [
    {
      display_name: "Material Balance",
      model_key: "material_balance",
      supported_job_types: ["simulation.material_balance.v1"],
      versions: [
        {
          benchmark_cases: [
            {
              case_id: "minimal_case",
              status: "validated",
            },
          ],
          default_parameter_set: {
            parameter_hash: "sha256:approved-parameters",
            parameter_set_id: "default",
            status: "approved",
          },
          model_version: "material_balance.v1",
          parameter_templates: [
            {
              key: "hydraulic_retention_time",
              label: "HRT",
              type: "number",
            },
          ],
          runtime: "simulation-worker",
          status: "active",
        },
      ],
    },
  ],
  schema_version: "model_catalog.v1",
}

const snapshot = (payloadHash: string, status: string, createdAt: string) => ({
  catalog_id: "default",
  created_at: createdAt,
  generated_at: catalog.generated_at,
  payload: {
    ...catalog,
    models: catalog.models.map((model) => ({
      ...model,
      versions: model.versions.map((version) => ({
        ...version,
        default_parameter_set: {
          ...version.default_parameter_set,
          parameter_hash: payloadHash,
          status,
        },
      })),
    })),
  },
  payload_hash: payloadHash,
  requested_by: "governance-smoke",
  schema_version: "model_catalog.v1",
  source_system: "playwright",
})

test("shows read-only model catalog and persisted snapshot history", async ({
  page,
}) => {
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

    if (method === "GET" && path === "/api/v1/model-catalog") {
      await route.fulfill(json(catalog))
      return
    }

    if (method === "GET" && path === "/api/v1/model-catalog/snapshots") {
      const cursor = url.searchParams.get("cursor")
      await route.fulfill(
        json({
          items: [
            cursor
              ? snapshot(
                  "sha256:previous-parameters",
                  "validated",
                  "2026-05-30T00:00:00.000Z",
                )
              : snapshot(
                  "sha256:approved-parameters",
                  "approved",
                  "2026-05-31T00:00:00.000Z",
                ),
          ],
          next_cursor: cursor ? undefined : "page-2",
          total_estimate: 2,
        }),
      )
      return
    }

    unexpectedComputeRequests.push(`${method} ${path}`)
    await route.fulfill(json({ message: "unexpected mock request" }, 404))
  })

  await page.goto("/model-governance")

  await expect(
    page.getByRole("heading", { name: "Model governance" }),
  ).toBeVisible()
  await expect(page.getByRole("cell", { name: /Material Balance/ })).toBeVisible()
  await expect(
    page.getByText("material_balance", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "sha256:approved-parameters" }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Catalog snapshots" }),
  ).toBeVisible()

  await page.getByRole("button", { name: /Next page/i }).click()
  await expect(page.getByText("sha256:previous-parameters")).toBeVisible()
  await expect(page.getByText("validated")).toBeVisible()
  expect(unexpectedComputeRequests).toEqual([])
})
