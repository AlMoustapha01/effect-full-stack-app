import { expect, test } from "@playwright/test"
import { e2eEmail } from "./db"

test("sign-up, create + toggle + delete a todo", async ({ page }) => {
  const email = e2eEmail("todos")
  const password = "password123"

  // Sign up
  await page.goto("/sign-up")
  await page.getByLabel("Name").fill("Test User")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign up" }).click()

  // Should land on /todos
  await page.waitForURL("**/todos")
  await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible()

  // Create
  await page.getByPlaceholder("What needs doing?").fill("First todo")
  await page.getByRole("button", { name: "Add" }).click()
  const item = page.getByTestId("todo-item").first()
  await expect(item).toContainText("First todo")
  await expect(item).toHaveAttribute("data-completed", "false")

  // Toggle
  await item.getByRole("checkbox").click()
  await expect(item).toHaveAttribute("data-completed", "true")

  // Delete
  await item.getByRole("button", { name: "Delete" }).click()
  await expect(page.getByTestId("todo-item")).toHaveCount(0)
})
