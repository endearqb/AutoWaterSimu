import { mkdirSync } from "node:fs"
import { resolve } from "node:path"

import { expect, test } from "@playwright/test"

const screenshotDirectory = resolve(process.cwd(), "../tmp/udm-v2-canvas-v1.0")

test.use({ storageState: { cookies: [], origins: [] } })
test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }))

for (const viewport of [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1280x720", width: 1280, height: 720 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
]) {
  test(`captures ${viewport.name} without viewport overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto("/udm-v2")
    await expect(
      page.getByRole("application", { name: "UDM Network v2 canvas" }),
    ).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewportWidth)

    if (viewport.width >= 1024) {
      const workbench = await page
        .getByTestId("udm-v2-workbench")
        .boundingBox()
      expect(workbench?.width).toBeLessThanOrEqual(360)
    }

    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    })
  })
}

test("uses one language across the compact workbench", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("locale", "zh"))
  await page.goto("/udm-v2")

  await expect(page.getByText("未命名 UDM 网络 v2")).toBeVisible()
  await expect(page.getByText("连接线", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "创建水力连接线" })).toBeVisible()
  await expect(page.getByRole("button", { name: "添加二沉池节点" })).toBeVisible()
  await expect(page.getByText("Nodes", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Hyd", { exact: true })).toHaveCount(0)
})
