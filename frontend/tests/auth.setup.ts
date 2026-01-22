import { test as setup } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"

const authFile = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("locale", "en")
  })
  await page.goto("/login")
  await page.getByPlaceholder("Email").fill(firstSuperuser)
  await page.getByPlaceholder("Password").fill(firstSuperuserPassword)
  await page.getByRole("button", { name: "Log In" }).click()
  await page.waitForURL(/\/(dashboard)?$/)
  await page.context().storageState({ path: authFile })
})
