import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const v1CanvasRoutes = ["/materialbalance", "/asm1", "/asm1slim", "/asm3", "/udm"]

for (const route of v1CanvasRoutes) {
  test(`${route} does not expose the UDM v2 edge selector`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator(".react-flow").first()).toBeVisible({
      timeout: 15_000,
    })

    await expect(
      page.getByRole("button", {
        name: /Create (Hydraulic|Pump|Settling|Signal) edge/i,
      }),
    ).toHaveCount(0)
  })
}

test("/hybrid does not expose the UDM v2 edge selector", async ({ page }) => {
  await page.goto("/hybrid")
  await expect(page.locator("body")).toBeVisible({ timeout: 15_000 })

  await expect(
    page.getByRole("button", {
      name: /Create (Hydraulic|Pump|Settling|Signal) edge/i,
    }),
  ).toHaveCount(0)
})
