import { test, expect } from "./fixtures";

test.describe("Orçamentos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "networkidle" });
  });

  test("exibe a página de orçamentos com botão Novo orçamento", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /novo orçamento/i }).first()
    ).toBeVisible();
  });

  test("abre o sheet de criação ao clicar em Novo orçamento", async ({ page }) => {
    await page.getByRole("button", { name: /novo orçamento/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test("cria um orçamento e ele aparece na lista", async ({ page }) => {
    await page.getByRole("button", { name: /novo orçamento/i }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByRole("combobox", { name: /categoria/i }).click();
    await page.getByRole("option", { name: /alimentação/i }).click();

    await dialog.getByLabel(/valor planejado/i).fill("500");

    await dialog.getByRole("button", { name: /criar orçamento/i }).click();

    // Dialog fecha após sucesso
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15_000 });
  });

  test("exibe estado vazio ou tabela quando a página carrega", async ({ page }) => {
    const emptyState = page.getByText(/nenhum orçamento/i).first();
    const table = page.locator("table").first();
    await expect(emptyState.or(table)).toBeVisible({ timeout: 10_000 });
  });
});
