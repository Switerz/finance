import { describe, expect, it } from "vitest";
import { goalDeadlineStatus, monthsUntil } from "./goals";

// ─── monthsUntil ──────────────────────────────────────────────────────────────

describe("monthsUntil", () => {
  it("retorna null quando deadline é null", () => {
    expect(monthsUntil(null)).toBeNull();
  });

  it("retorna 0 quando deadline já passou", () => {
    expect(monthsUntil("2020-01-01")).toBe(0);
  });

  it("retorna pelo menos 1 para deadline no mesmo mês à frente", () => {
    const today = new Date();
    const sameMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 28));
    if (sameMonth > today) {
      const result = monthsUntil(sameMonth.toISOString().slice(0, 10));
      expect(result).toBeGreaterThanOrEqual(1);
    }
  });

  it("retorna meses corretos para prazo futuro distante", () => {
    const future = new Date(Date.UTC(new Date().getUTCFullYear() + 2, 0, 1));
    const result = monthsUntil(future.toISOString().slice(0, 10));
    expect(result).toBeGreaterThanOrEqual(20);
  });

  it("retorna 1 para deadline exatamente no próximo mês", () => {
    const today = new Date();
    // Use day 1 of next month: target.getUTCDate() < today.getUTCDate() → includesCurrentPartialMonth=0 → monthDiff=1
    const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const result = monthsUntil(nextMonth.toISOString().slice(0, 10));
    expect(result).toBe(1);
  });
});

// ─── goalDeadlineStatus ───────────────────────────────────────────────────────

describe("goalDeadlineStatus", () => {
  it("retorna 'completed' quando status é completed", () => {
    expect(goalDeadlineStatus("2030-01-01", "completed", 0.5)).toBe("completed");
  });

  it("retorna 'completed' quando progress >= 1", () => {
    expect(goalDeadlineStatus("2030-01-01", "active", 1)).toBe("completed");
    expect(goalDeadlineStatus(null, "active", 1.2)).toBe("completed");
  });

  it("retorna 'no_deadline' quando não há prazo", () => {
    expect(goalDeadlineStatus(null, "active", 0.5)).toBe("no_deadline");
  });

  it("retorna 'overdue' quando prazo já passou (monthsUntil = 0)", () => {
    expect(goalDeadlineStatus("2020-01-01", "active", 0.5)).toBe("overdue");
  });

  it("retorna 'due_soon' quando apenas 1 mês restante", () => {
    const today = new Date();
    const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const result = goalDeadlineStatus(nextMonth.toISOString().slice(0, 10), "active", 0.5);
    expect(result).toBe("due_soon");
  });

  it("retorna 'on_track' para prazo distante e progresso parcial", () => {
    const future = new Date(Date.UTC(new Date().getUTCFullYear() + 2, 0, 1));
    const result = goalDeadlineStatus(future.toISOString().slice(0, 10), "active", 0.3);
    expect(result).toBe("on_track");
  });

  it("retorna 'completed' mesmo com status paused quando progress >= 1", () => {
    expect(goalDeadlineStatus("2030-01-01", "paused", 1)).toBe("completed");
  });

  it("status cancelled com prazo no futuro retorna on_track (não é completed)", () => {
    const future = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1));
    const result = goalDeadlineStatus(future.toISOString().slice(0, 10), "cancelled", 0.2);
    expect(result).toBe("on_track");
  });
});
