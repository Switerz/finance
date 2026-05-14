import { test, expect } from "@playwright/test";

// Runs WITHOUT storageState (project: unauthenticated)
test.describe("Login e redirecionamentos", () => {
  test("redireciona / para /login quando não autenticado", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redireciona /dashboard para /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("exibe página de login com botão do Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Finance Planner")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /entrar com google/i })
    ).toBeVisible();
  });

  test("exibe mensagem de erro quando param error está na URL", async ({ page }) => {
    await page.goto("/login?error=auth_error");
    await expect(
      page.getByText(/não foi possível concluir o login/i)
    ).toBeVisible();
  });
});
