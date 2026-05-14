import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccounts } from "./accounts";

// Mock createClient and getCurrentWorkspace at module level
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));
vi.mock("@/lib/queries/workspaces", () => ({
  getCurrentWorkspace: vi.fn()
}));

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

const mockWorkspace = { id: "ws-1", name: "Test", currency: "BRL", role: "owner" };

const baseAccountRow = {
  id: "acc-1",
  workspace_id: "ws-1",
  name: "Conta corrente",
  type: "checking",
  institution: null,
  initial_balance: "1000",
  current_balance: "1000",
  credit_limit: null,
  closing_day: null,
  due_day: null,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z"
};

function buildSupabaseMock(accountsData: unknown[], transactionsData: unknown[]) {
  const accountsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn()
  };
  // First .order() call returns this (chainable); second resolves with data
  accountsQuery.order
    .mockReturnValueOnce(accountsQuery)
    .mockResolvedValueOnce({ data: accountsData, error: null });
  const transactionsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis()
  };
  // The second .eq on transactions resolves to the data
  transactionsQuery.eq.mockReturnValueOnce(transactionsQuery).mockResolvedValueOnce({
    data: transactionsData,
    error: null
  });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "accounts") return accountsQuery;
      return transactionsQuery;
    })
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAccounts", () => {
  it("retorna array vazio quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await getAccounts();
    expect(result).toEqual([]);
  });

  it("retorna array vazio quando Supabase retorna erro", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const orderMock = vi.fn();
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock
    };
    orderMock
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: null, error: { message: "DB error" } });
    const client = { from: vi.fn().mockReturnValue(query) };
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getAccounts();
    expect(result).toEqual([]);
  });

  it("calcula saldo adicionando receitas pagas", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "income", amount: "500", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(1500); // 1000 + 500
  });

  it("calcula saldo subtraindo despesas pagas", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "expense", amount: "200", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(800); // 1000 - 200
  });

  it("calcula saldo subtraindo investimentos pagos", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "investment", amount: "300", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(700); // 1000 - 300
  });

  it("transferência installment_number=1 debita da conta origem", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "transfer", amount: "400", installment_number: 1 }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(600); // 1000 - 400
  });

  it("transferência installment_number=2 credita na conta destino", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "transfer", amount: "400", installment_number: 2 }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(1400); // 1000 + 400
  });

  it("ignora transações de outras contas", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-2", type: "income", amount: "1000", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(1000); // inalterado
  });

  it("ignora transações sem account_id", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: null, type: "income", amount: "500", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    expect(account.current_balance).toBe(1000); // inalterado
  });

  it("combina múltiplas transações corretamente", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
    const transactions = [
      { account_id: "acc-1", type: "income", amount: "3000", installment_number: null },
      { account_id: "acc-1", type: "expense", amount: "1200", installment_number: null },
      { account_id: "acc-1", type: "investment", amount: "500", installment_number: null }
    ];
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock([baseAccountRow], transactions) as never
    );
    const [account] = await getAccounts();
    // 1000 (initial) + 3000 - 1200 - 500 = 2300
    expect(account.current_balance).toBe(2300);
  });
});
