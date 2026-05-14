import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelInstallmentGroup,
  cancelRecurringGroup,
  cancelTransaction,
  createTransaction,
  createTransfer,
  deleteTransfer,
  updateTransaction
} from "./transactions";
import { splitAmountIntoInstallments } from "./installment-utils";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/workspaces", () => ({ getCurrentWorkspace: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { revalidatePath } from "next/cache";

const mockWorkspace = { id: "ws-1", name: "Test", currency: "BRL", role: "owner" };
const viewerWorkspace = { ...mockWorkspace, role: "viewer" };

// Thenable chain: awaiting the chain itself resolves to `result`.
// .maybeSingle() and .insert() also resolve to `result`.
function makeChain(result: object = {}) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn().mockImplementation(ret);
  chain.eq = vi.fn().mockImplementation(ret);
  chain.neq = vi.fn().mockImplementation(ret);
  chain.gte = vi.fn().mockImplementation(ret);
  chain.update = vi.fn().mockImplementation(ret);
  chain.delete = vi.fn().mockImplementation(ret);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  // makes `await chain` resolve to result
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function buildClient({
  accounts = { data: { id: "acc-1" }, error: null } as object,
  categories = { data: { id: "cat-1", type: "expense" }, error: null } as object,
  transactions = { data: null, error: null } as object,
  userId = "user-1"
} = {}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "accounts") return makeChain(accounts);
      if (table === "categories") return makeChain(categories);
      return makeChain(transactions);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } })
    }
  };
}

const validTx = {
  accountId: "00000000-0000-0000-0000-000000000001",
  categoryId: "00000000-0000-0000-0000-000000000002",
  description: "Supermercado",
  amount: 100,
  type: "expense" as const,
  transactionDate: "2026-05-01",
  status: "paid" as const,
  tags: []
};

const validTransfer = {
  fromAccountId: "00000000-0000-0000-0000-000000000001",
  toAccountId: "00000000-0000-0000-0000-000000000002",
  amount: 500,
  description: "Transferência",
  transactionDate: "2026-05-01"
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
});

// ─── splitAmountIntoInstallments ──────────────────────────────────────────────

describe("splitAmountIntoInstallments", () => {
  it("divide exatamente quando não há resto", () => {
    expect(splitAmountIntoInstallments(300, 3)).toEqual([100, 100, 100]);
  });

  it("coloca o resto na última parcela", () => {
    const result = splitAmountIntoInstallments(100, 3);
    expect(result[0]).toBeCloseTo(33.33);
    expect(result[1]).toBeCloseTo(33.33);
    expect(result[2]).toBeCloseTo(33.34);
  });

  it("retorna array de um elemento para parcela única", () => {
    expect(splitAmountIntoInstallments(100, 1)).toEqual([100]);
  });

  it("soma sempre igual ao total original", () => {
    const total = 999.99;
    const result = splitAmountIntoInstallments(total, 7);
    expect(result.reduce((a, b) => a + b)).toBeCloseTo(total);
  });
});

// ─── createTransaction ────────────────────────────────────────────────────────

describe("createTransaction", () => {
  it("retorna fail quando schema é inválido (amount negativo)", async () => {
    const result = await createTransaction({ ...validTx, amount: -1 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(false);
  });

  it("retorna fail para role viewer", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(viewerWorkspace as never);
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/visualização/);
  });

  it("retorna fail quando conta não encontrada", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ accounts: { data: null, error: null } }) as never
    );
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.accountId).toBeDefined();
  });

  it("retorna fail quando tipo de categoria é incompatível", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ categories: { data: { id: "cat-1", type: "income" }, error: null } }) as never
    );
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.categoryId).toBeDefined();
  });

  it("retorna fail quando insert falha com mensagem do banco", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ transactions: { data: null, error: { message: "unique constraint" } } }) as never
    );
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("unique constraint");
  });

  it("retorna ok e chama revalidatePath no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await createTransaction(validTx);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Transação criada.");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalled();
  });
});

// ─── updateTransaction ────────────────────────────────────────────────────────

describe("updateTransaction", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await updateTransaction("tx-1", validTx);
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando transação não existe", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ transactions: { data: null, error: null } }) as never
    );
    const result = await updateTransaction("tx-1", validTx);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("retorna fail quando transação está cancelada", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ transactions: { data: { status: "cancelled" }, error: null } }) as never
    );
    const result = await updateTransaction("tx-1", validTx);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/canceladas/);
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ transactions: { data: { status: "paid" }, error: null } }) as never
    );
    const result = await updateTransaction("tx-1", validTx);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Transação atualizada.");
  });
});

// ─── cancelTransaction ────────────────────────────────────────────────────────

describe("cancelTransaction", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await cancelTransaction("tx-1");
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando update falha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ transactions: { data: null, error: { message: "DB error" } } }) as never
    );
    const result = await cancelTransaction("tx-1");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("DB error");
  });

  it("retorna ok e chama revalidatePath no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await cancelTransaction("tx-1");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Transação cancelada.");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalled();
  });
});

// ─── createTransfer ───────────────────────────────────────────────────────────

describe("createTransfer", () => {
  it("retorna fail quando schema é inválido (mesma conta)", async () => {
    const result = await createTransfer({
      ...validTransfer,
      toAccountId: validTransfer.fromAccountId
    });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.toAccountId).toBeDefined();
  });

  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await createTransfer(validTransfer);
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando conta de origem não encontrada", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: null, error: null })) // from
      .mockReturnValue(makeChain({ data: { id: "acc-2" }, error: null })); // to
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await createTransfer(validTransfer);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.fromAccountId).toBeDefined();
  });

  it("retorna fail quando conta de destino não encontrada", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { id: "acc-1" }, error: null })) // from
      .mockReturnValue(makeChain({ data: null, error: null })); // to not found
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await createTransfer(validTransfer);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.toAccountId).toBeDefined();
  });

  it("retorna fail quando insert falha", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { id: "acc-1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { id: "acc-2" }, error: null }))
      .mockReturnValue(makeChain({ data: null, error: { message: "DB error" } }));
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await createTransfer(validTransfer);
    expect(result.ok).toBe(false);
  });

  it("retorna ok e insere 2 registros no happy path", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { id: "acc-1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { id: "acc-2" }, error: null }))
      .mockReturnValue({ insert: insertMock });
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await createTransfer(validTransfer);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Transferência registrada.");
    const insertedRows = insertMock.mock.calls[0][0] as unknown[];
    expect(insertedRows).toHaveLength(2);
  });
});

// ─── cancelInstallmentGroup ───────────────────────────────────────────────────

describe("cancelInstallmentGroup", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await cancelInstallmentGroup("tx-1", "grp-1", "this");
    expect(result.ok).toBe(false);
  });

  it("scope 'this' — retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await cancelInstallmentGroup("tx-1", "grp-1", "this");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Parcelas canceladas.");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalled();
  });

  it("scope 'this_and_following' — retorna fail quando parcela não encontrada", async () => {
    const fromMock = vi.fn();
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await cancelInstallmentGroup("tx-1", "grp-1", "this_and_following");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("scope 'this_and_following' — retorna ok no happy path", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { installment_number: 2 }, error: null }))
      .mockReturnValue(makeChain({ data: null, error: null }));
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await cancelInstallmentGroup("tx-1", "grp-1", "this_and_following");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Parcelas canceladas.");
  });

  it("scope 'all' — retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await cancelInstallmentGroup("tx-1", "grp-1", "all");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Parcelas canceladas.");
  });
});

// ─── cancelRecurringGroup ─────────────────────────────────────────────────────

describe("cancelRecurringGroup", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await cancelRecurringGroup("tx-1", "rule-1", "this");
    expect(result.ok).toBe(false);
  });

  it("scope 'this' — retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await cancelRecurringGroup("tx-1", "rule-1", "this");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Recorrências canceladas.");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalled();
  });

  it("scope 'this_and_following' — retorna fail quando transação não encontrada", async () => {
    const fromMock = vi.fn();
    fromMock.mockReturnValue(makeChain({ data: null, error: null }));
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await cancelRecurringGroup("tx-1", "rule-1", "this_and_following");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("scope 'this_and_following' — retorna ok no happy path", async () => {
    const fromMock = vi.fn();
    fromMock
      .mockReturnValueOnce(makeChain({ data: { transaction_date: "2026-05-01" }, error: null }))
      .mockReturnValue(makeChain({ data: null, error: null }));
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) }
    } as never);
    const result = await cancelRecurringGroup("tx-1", "rule-1", "this_and_following");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Recorrências canceladas.");
  });
});

// ─── deleteTransfer ───────────────────────────────────────────────────────────

describe("deleteTransfer", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await deleteTransfer("group-1");
    expect(result.ok).toBe(false);
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(buildClient() as never);
    const result = await deleteTransfer("group-1");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Transferência removida.");
  });
});
