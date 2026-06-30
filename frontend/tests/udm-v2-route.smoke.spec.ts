import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("renders the UDM Network v2 route skeleton", async ({ page }) => {
  await page.goto("/udm-v2")

  await expect(
    page.getByRole("heading", { name: "UDM Network v2" }),
  ).toBeVisible()
  await expect(page.getByTestId("udm-v2-canvas")).toBeVisible()
  await expect(page.getByText("udm_network_v2")).toBeVisible()
})
