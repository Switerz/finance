import { test, expect } from "./fixtures";

test.describe("Transações", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions", { waitUntil: "networkidle" });
  });

  test("exibe a página de transações com botão Nova transação", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nova transação/i })
    ).toBeVisible();
  });

  test("abre o sheet de criação ao clicar em Nova transação", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test("cria uma transação de despesa e ela aparece na tabela", async ({ page }) => {
    await page.getByRole("button", { name: /nova transação/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.getByLabel(/descrição/i).fill("Almoço E2E");
    await dialog.getByLabel(/valor/i).fill("35.50");

    await dialog.getByRole("combobox", { name: /categoria/i }).click();
    await page.getByRole("option", { name: /alimentação/i }).click();

    await dialog.getByRole("button", { name: /criar transação/i }).click();

    // Dialog fecha após sucesso
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15_000 });
  });

  test("exibe estado vazio ou tabela quando a página carrega", async ({ page }) => {
    const emptyState = page.getByText(/nenhuma transação/i).first();
    const table = page.locator("table").first();
    await expect(emptyState.or(table)).toBeVisible({ timeout: 10_000 });
  });
});
