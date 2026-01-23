import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { createUser } from "./utils/privateApi.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser, logOutUser } from "./utils/user"

const tabs = ["Profile", "Change Password"]

// User Information

test("My profile tab is active by default", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true",
  )
})

test("All tabs are visible", async ({ page }) => {
  await page.goto("/settings")
  for (const tab of tabs) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible()
  }
})

test.describe("Edit user full name and email successfully", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Edit user name with a valid name", async ({ page }) => {
    const email = randomEmail()
    const updatedName = "Test User 2"
    const password = randomPassword()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Profile" }).click()
    const profilePanel = page.getByRole("tabpanel", { name: "Profile" })
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Username").fill(updatedName)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("User updated successfully")).toBeVisible()
    // Check if the new name is displayed on the page
    await expect(
      profilePanel.getByText(updatedName, { exact: true }),
    ).toBeVisible()
  })

  test("Edit user email with a valid email", async ({ page }) => {
    const email = randomEmail()
    const updatedEmail = randomEmail()
    const password = randomPassword()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Profile" }).click()
    const profilePanel = page.getByRole("tabpanel", { name: "Profile" })
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(updatedEmail)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("User updated successfully")).toBeVisible()
    await expect(
      profilePanel.getByText(updatedEmail, { exact: true }),
    ).toBeVisible()
  })
})

test.describe("Edit user with invalid data", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Edit user email with an invalid email", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const invalidEmail = ""

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Profile" }).click()
    const profilePanel = page.getByRole("tabpanel", { name: "Profile" })
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(invalidEmail)
    await page.getByLabel("Username").click()
    await expect(
      profilePanel.getByText("This field is required", { exact: true }),
    ).toBeVisible()
  })

  test("Cancel edit action restores original name", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const updatedName = "Test User"

    const user = await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Profile" }).click()
    const profilePanel = page.getByRole("tabpanel", { name: "Profile" })
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Username").fill(updatedName)
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await expect(
      profilePanel.getByText(user.full_name as string, { exact: true }),
    ).toBeVisible()
  })

  test("Cancel edit action restores original email", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const updatedEmail = randomEmail()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Profile" }).click()
    const profilePanel = page.getByRole("tabpanel", { name: "Profile" })
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(updatedEmail)
    await page.getByRole("button", { name: "Cancel" }).first().click()
    await expect(
      profilePanel.getByText(email, { exact: true }),
    ).toBeVisible()
  })
})

// Change Password

test.describe("Change password successfully", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Update password successfully", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const NewPassword = randomPassword()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Change Password" }).click()
    await page.getByPlaceholder("Current Password").fill(password)
    await page.getByPlaceholder("New Password", { exact: true }).fill(NewPassword)
    await page.getByPlaceholder("Confirm New Password").fill(NewPassword)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Password updated successfully.")).toBeVisible()

    await logOutUser(page)

    // Check if the user can log in with the new password
    await logInUser(page, email, NewPassword)
  })
})

test.describe("Change password with invalid data", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Update password with weak passwords", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    const weakPassword = "weak"

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Change Password" }).click()
    await page.getByPlaceholder("Current Password").fill(password)
    await page
      .getByPlaceholder("New Password", { exact: true })
      .fill(weakPassword)
    await page.getByPlaceholder("Confirm New Password").fill(weakPassword)
    await page.locator("body").click()
    await expect(
      page.getByText("Must be at least 8 characters"),
    ).toBeVisible()
  })

  test("New password and confirmation password do not match", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    const newPassword = randomPassword()
    const confirmPassword = randomPassword()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Change Password" }).click()
    await page.getByPlaceholder("Current Password").fill(password)
    await page
      .getByPlaceholder("New Password", { exact: true })
      .fill(newPassword)
    await page.getByPlaceholder("Confirm New Password").fill(confirmPassword)
    await page.getByPlaceholder("Current Password").click()
    await expect(page.getByText("The passwords do not match")).toBeVisible()
  })

  test("Current password and new password are the same", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()

    await createUser({ email, password })

    // Log in the user
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Change Password" }).click()
    await page.getByPlaceholder("Current Password").fill(password)
    await page.getByPlaceholder("New Password", { exact: true }).fill(password)
    await page.getByPlaceholder("Confirm New Password").fill(password)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(
      page.getByText(/New password cannot be the same as the current one|Something went wrong\./),
    ).toBeVisible()
  })
})
