import { test, expect } from "./fixtures";

// Runs WITH storageState (project: authenticated)
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  test("carrega o dashboard sem erros", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Heading principal (h1 com Finance Planner ou título do workspace)
    await expect(page.locator("main")).toBeVisible();
  });

  test("exibe cards de KPI", async ({ page }) => {
    // Os MetricCards usam <h3> ou role=heading com os labels de receita / despesa
    await expect(
      page.getByText(/receitas|despesas|saldo|poupança/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("exibe a navegação lateral com links principais", async ({ page }) => {
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: /transações/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /contas/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /orçamentos/i })).toBeVisible();
  });

  test("navega para /transactions via sidebar", async ({ page }) => {
    await page.locator("nav").first().getByRole("link", { name: /transações/i }).click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  test("seletor de mês altera o parâmetro na URL", async ({ page }) => {
    // O topbar tem botões de navegação por mês (< e >)
    const prevBtn = page.getByRole("button", { name: /anterior|prev|‹/i }).first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await expect(page).toHaveURL(/month=/);
    }
  });
});
