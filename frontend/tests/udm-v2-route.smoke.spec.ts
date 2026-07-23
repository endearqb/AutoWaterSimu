import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("renders the UDM Network v2 full-screen editor", async ({ page }) => {
  await page.goto("/udm-v2")

  await expect(page.locator("[data-udm-v2-editor]")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId("udm-v2-canvas")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId("udm-v2-workbench")).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    page.getByRole("button", { name: "Add Boundary node" }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByRole("heading", { name: "UDM Network v2" }),
  ).toHaveCount(0)
})

test("adds a UDM Network v2 node from the palette", async ({ page }) => {
  await page.goto("/udm-v2")

  await page
    .getByRole("button", { name: "Add Boundary node" })
    .dragTo(page.getByTestId("udm-v2-canvas"))

  await expect(
    page.locator(".react-flow__node", { hasText: "Boundary" }),
  ).toBeVisible({ timeout: 15_000 })
})
