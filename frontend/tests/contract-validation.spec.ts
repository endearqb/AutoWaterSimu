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

test("validates a simulation request through the contract panel", async ({
  page,
}) => {
  const validatedDocuments: Array<Record<string, unknown>> = []
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
      await route.fulfill(json({ items: [], total_estimate: 0 }))
      return
    }

    if (method === "GET" && path === "/api/v1/model-runs") {
      await route.fulfill(json({ items: [], total_estimate: 0 }))
      return
    }

    if (method === "GET" && path === "/api/v1/model-catalog") {
      await route.fulfill(
        json({
          generated_at: "2026-05-31T00:00:00.000Z",
          models: [],
          schema_version: "model_catalog.v1",
        }),
      )
      return
    }

    if (method === "POST" && path === "/api/v1/contracts/validate") {
      const document = request.postDataJSON() as Record<string, unknown>
      validatedDocuments.push(document)
      await route.fulfill(
        json({
          contract_schema: "simulation_request.v1",
          document_schema_version: String(document.schema_version),
          errors: [],
          schema_version: "contract_validation.v1",
          valid: true,
          warnings: [],
        }),
      )
      return
    }

    unexpectedComputeRequests.push(`${method} ${path}`)
    await route.fulfill(json({ message: "unexpected mock request" }, 404))
  })

  await page.goto("/compute-jobs")

  await expect(
    page.getByRole("heading", { name: "Contract validation" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Simulation request" }).click()
  await page.getByRole("button", { name: "Validate" }).click()

  await expect
    .poll(() => validatedDocuments.length, {
      message: "contract validation should call the Compute API",
    })
    .toBe(1)

  expect(validatedDocuments[0].schema_version).toBe("simulation_request.v1")
  await expect(page.getByText("No validation errors.")).toBeVisible()
  await expect(page.getByText("simulation_request.v1").first()).toBeVisible()
  expect(unexpectedComputeRequests).toEqual([])
})
