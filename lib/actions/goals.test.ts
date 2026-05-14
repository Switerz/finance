import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelGoal, completeGoal, createGoal, updateGoal, updateGoalProgress } from "./goals";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/workspaces", () => ({ getCurrentWorkspace: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

const mockWorkspace = { id: "ws-1", name: "Test", currency: "BRL", role: "owner" };
const viewerWorkspace = { ...mockWorkspace, role: "viewer" };

function makeChain(result: object = {}) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn().mockImplementation(ret);
  chain.eq = vi.fn().mockImplementation(ret);
  chain.update = vi.fn().mockImplementation(ret);
  chain.delete = vi.fn().mockImplementation(ret);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function buildClient(goals: object = { data: { id: "goal-1", target_amount: 1000 }, error: null }) {
  return {
    from: vi.fn().mockReturnValue(makeChain(goals))
  };
}

const validGoal = {
  name: "Viagem Europa",
  targetAmount: 10000,
  currentAmount: 0,
  status: "active" as const
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentWorkspace).mockResolvedValue(mockWorkspace as never);
});

// ─── createGoal ───────────────────────────────────────────────────────────────

describe("createGoal", () => {
  it("retorna fail quando schema é inválido (targetAmount zero)", async () => {
    const result = await createGoal({ ...validGoal, targetAmount: 0 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await createGoal(validGoal);
    expect(result.ok).toBe(false);
  });

  it("retorna fail para role viewer", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(viewerWorkspace as never);
    const result = await createGoal(validGoal);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/visualização/);
  });

  it("retorna fail quando insert falha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: { message: "DB error" } }) as never
    );
    const result = await createGoal(validGoal);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("DB error");
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: null }) as never
    );
    const result = await createGoal(validGoal);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Meta criada.");
  });
});

// ─── updateGoal ───────────────────────────────────────────────────────────────

describe("updateGoal", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await updateGoal("goal-1", validGoal);
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando meta não existe", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: null }) as never
    );
    const result = await updateGoal("goal-1", validGoal);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: { id: "goal-1", target_amount: 10000 }, error: null }) as never
    );
    const result = await updateGoal("goal-1", validGoal);
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Meta atualizada.");
  });
});

// ─── updateGoalProgress ───────────────────────────────────────────────────────

describe("updateGoalProgress", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await updateGoalProgress("goal-1", { currentAmount: 500 });
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando meta não existe", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: null }) as never
    );
    const result = await updateGoalProgress("goal-1", { currentAmount: 500 });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("retorna fail quando valor atual excede o alvo", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: { id: "goal-1", target_amount: 500 }, error: null }) as never
    );
    const result = await updateGoalProgress("goal-1", { currentAmount: 600 });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.currentAmount).toBeDefined();
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: { id: "goal-1", target_amount: 1000 }, error: null }) as never
    );
    const result = await updateGoalProgress("goal-1", { currentAmount: 500 });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Progresso atualizado.");
  });
});

// ─── completeGoal ─────────────────────────────────────────────────────────────

describe("completeGoal", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await completeGoal("goal-1");
    expect(result.ok).toBe(false);
  });

  it("retorna fail quando meta não existe", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: null }) as never
    );
    const result = await completeGoal("goal-1");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não encontrada/);
  });

  it("retorna ok e usa target_amount como current_amount", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    let capturedUpdate: unknown;
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "goal-1", target_amount: 5000 },
        error: null
      }),
      update: vi.fn().mockImplementation((payload: unknown) => {
        capturedUpdate = payload;
        return { eq: vi.fn().mockReturnThis(), then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: { id: "goal-1", target_amount: 5000 }, error: null }).then(resolve)
    };
    void updateMock; void eqMock;
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue(chain) } as never);
    const result = await completeGoal("goal-1");
    expect(result.ok).toBe(true);
    expect((capturedUpdate as Record<string, unknown>)?.current_amount).toBe(5000);
    expect((capturedUpdate as Record<string, unknown>)?.status).toBe("completed");
  });
});

// ─── cancelGoal ───────────────────────────────────────────────────────────────

describe("cancelGoal", () => {
  it("retorna fail quando não há workspace", async () => {
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);
    const result = await cancelGoal("goal-1");
    expect(result.ok).toBe(false);
  });

  it("retorna ok no happy path", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildClient({ data: null, error: null }) as never
    );
    const result = await cancelGoal("goal-1");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Meta cancelada.");
  });
});
