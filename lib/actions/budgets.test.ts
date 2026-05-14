import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyPreviousMonthBudgets, createBudget, deleteBudget } from "./budgets";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/workspaces", () => ({ getCurrentWorkspace: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/queries/budgets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries/budgets")>();
  return {
    ...actual,
    getBudgetFormOptions: vi.fn()
  };
});

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { getBudgetFormOptions } from "@/lib/queries/budgets";

const mockWorkspace = { id: "ws-1", name: "Test", currency: "BRL", role: "owner" };
const viewerWorkspace = { ...mockWorkspace, role: "viewer" };

function makeChain(result: object = {}) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn().mockImplementation(ret);
  chain.eq = vi.fn().mockImplementation(ret);
  chain.neq = vi.fn().mockImplementation(ret);
  chain.update = vi.fn().mockImplementation(ret);
  chain.delete = vi.fn().mockImplementation(ret);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const validBudget = {
  categoryId: "00000000-0000-0000-0000-000000000001",
  month: "2026-05-01",
  plannedAmount: 500,
  alertThreshold: 0.8
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
});

// ─── createBudget ─────────────────────────────────────────────────────────────

describe("createBudget", () => {
  it("retorna fail quando schema é inválido (plannedAmount zero)", async () => {
    const result = await createBudget({ ...validBudget, plannedAmount: 0 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(false);
  });

  it("retorna fail para role viewer", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(viewerWorkspace as never);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/visualização/);
  });

  it("retorna fail quando categoria não encontrada", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(makeChain({ data: null, error: null }))
    } as never);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/categoria/i);
  });

  it("retorna fail quando categoria é do tipo income", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(makeChain({ data: { id: "cat-1", type: "income" }, error: null }))
    } as never);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/despesa ou investimento/);
  });

  it("retorna fail quando categoria já tem orçamento no mês", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { id: "cat-1", type: "expense" }, error: null })) // categories
      .mockReturnValue(makeChain({ count: 1, error: null })); // budgets count
    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/já possui orçamento/);
  });

  it("retorna ok no happy path", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { id: "cat-1", type: "expense" }, error: null })) // categories
      .mockReturnValueOnce(makeChain({ count: 0, error: null })) // budgets count
      .mockReturnValue(makeChain({ error: null })); // budgets insert
    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never);
    const result = await createBudget(validBudget);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Orçamento criado.");
  });
});

// ─── deleteBudget ─────────────────────────────────────────────────────────────

describe("deleteBudget", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await deleteBudget("budget-1");
    expect(result.ok).toBe(false);
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(makeChain({ error: null }))
    } as never);
    const result = await deleteBudget("budget-1");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Orçamento removido.");
  });
});

// ─── copyPreviousMonthBudgets ─────────────────────────────────────────────────

describe("copyPreviousMonthBudgets", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await copyPreviousMonthBudgets({ month: "2026-05-01" });
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando não há orçamentos no mês anterior", async () => {
    vi.mocked(getBudgetFormOptions).mockResolvedValue({
      categories: [{ id: "cat-1", name: "Alimentação", type: "expense", color: null }]
    } as never);
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: [], error: null })) // previous month budgets
      .mockReturnValue(makeChain({ data: [], error: null })); // current month budgets
    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never);
    const result = await copyPreviousMonthBudgets({ month: "2026-05-01" });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Não há orçamentos/);
  });

  it("retorna fail quando todos os orçamentos já existem no mês atual", async () => {
    vi.mocked(getBudgetFormOptions).mockResolvedValue({
      categories: [{ id: "cat-1", name: "Alimentação", type: "expense", color: null }]
    } as never);
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(
        makeChain({
          data: [{ category_id: "cat-1", planned_amount: 500, alert_threshold: 0.8 }],
          error: null
        })
      )
      .mockReturnValue(makeChain({ data: [{ category_id: "cat-1" }], error: null }));
    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never);
    const result = await copyPreviousMonthBudgets({ month: "2026-05-01" });
    expect(result.ok).toBe(false);
  });

  it("retorna ok com contagem correta no happy path", async () => {
    vi.mocked(getBudgetFormOptions).mockResolvedValue({
      categories: [
        { id: "cat-1", name: "Alimentação", type: "expense", color: null },
        { id: "cat-2", name: "Transporte", type: "expense", color: null }
      ]
    } as never);
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(
        makeChain({
          data: [
            { category_id: "cat-1", planned_amount: 500, alert_threshold: 0.8 },
            { category_id: "cat-2", planned_amount: 300, alert_threshold: 0.8 }
          ],
          error: null
        })
      )
      .mockReturnValueOnce(makeChain({ data: [], error: null })) // no current budgets
      .mockReturnValue(makeChain({ error: null })); // insert
    vi.mocked(createClient).mockResolvedValue({ from: fromMock } as never);
    const result = await copyPreviousMonthBudgets({ month: "2026-05-01" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("2 orçamentos copiados.");
  });
});
