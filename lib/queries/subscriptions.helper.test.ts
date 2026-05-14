import { describe, expect, it } from "vitest";
import {
  annualizedAmount,
  monthlyEquivalent,
  summarizeSubscriptions
} from "./subscriptions";
import { makeSubscription } from "@/lib/test-fixtures";

// ─── monthlyEquivalent ────────────────────────────────────────────────────────

describe("monthlyEquivalent", () => {
  it("retorna o valor direto para ciclo monthly", () => {
    expect(monthlyEquivalent(100, "monthly")).toBe(100);
  });

  it("divide por 3 para ciclo quarterly", () => {
    expect(monthlyEquivalent(300, "quarterly")).toBe(100);
  });

  it("divide por 12 para ciclo yearly", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBe(100);
  });

  it("mantém decimais corretamente", () => {
    expect(monthlyEquivalent(55.9, "monthly")).toBeCloseTo(55.9);
    expect(monthlyEquivalent(360, "quarterly")).toBeCloseTo(120);
    expect(monthlyEquivalent(960, "yearly")).toBe(80);
  });
});

// ─── annualizedAmount ─────────────────────────────────────────────────────────

describe("annualizedAmount", () => {
  it("multiplica por 12 para ciclo monthly", () => {
    expect(annualizedAmount(100, "monthly")).toBe(1200);
  });

  it("multiplica por 4 para ciclo quarterly", () => {
    expect(annualizedAmount(300, "quarterly")).toBe(1200);
  });

  it("retorna o valor direto para ciclo yearly", () => {
    expect(annualizedAmount(1200, "yearly")).toBe(1200);
  });

  it("monthlyEquivalent e annualizedAmount são consistentes", () => {
    const monthly = 55.9;
    const quarterly = 167.7;
    const yearly = 670.8;

    expect(annualizedAmount(monthly, "monthly")).toBeCloseTo(monthlyEquivalent(monthly, "monthly") * 12);
    expect(annualizedAmount(quarterly, "quarterly")).toBeCloseTo(
      monthlyEquivalent(quarterly, "quarterly") * 12
    );
    expect(annualizedAmount(yearly, "yearly")).toBeCloseTo(
      monthlyEquivalent(yearly, "yearly") * 12
    );
  });
});

// ─── summarizeSubscriptions ───────────────────────────────────────────────────

describe("summarizeSubscriptions", () => {
  it("retorna zeros quando lista está vazia", () => {
    const result = summarizeSubscriptions([]);
    expect(result.monthlyTotal).toBe(0);
    expect(result.annualTotal).toBe(0);
    expect(result.activeCount).toBe(0);
    expect(result.dispensableCount).toBe(0);
    expect(result.dispensableMonthlyTotal).toBe(0);
    expect(result.upcomingCount).toBe(0);
    expect(result.upcoming).toEqual([]);
  });

  it("soma corretamente o total mensal de assinaturas ativas", () => {
    const subs = [
      makeSubscription({ id: "s1", amount: 100, billing_cycle: "monthly", status: "active" }),
      makeSubscription({ id: "s2", amount: 300, billing_cycle: "quarterly", status: "active" }),
      makeSubscription({ id: "s3", amount: 120, billing_cycle: "yearly", status: "active" })
    ];
    const result = summarizeSubscriptions(subs);
    // 100 + 100 + 10 = 210
    expect(result.monthlyTotal).toBeCloseTo(210);
  });

  it("exclui assinaturas pausadas e canceladas do monthlyTotal", () => {
    const subs = [
      makeSubscription({ id: "s1", amount: 100, status: "active" }),
      makeSubscription({ id: "s2", amount: 200, status: "paused" }),
      makeSubscription({ id: "s3", amount: 300, status: "cancelled" })
    ];
    const result = summarizeSubscriptions(subs);
    expect(result.monthlyTotal).toBe(100);
    expect(result.activeCount).toBe(1);
  });

  it("conta corretamente assinaturas dispensáveis", () => {
    const subs = [
      makeSubscription({ id: "s1", importance: "dispensable", amount: 50, status: "active" }),
      makeSubscription({ id: "s2", importance: "essential", amount: 100, status: "active" }),
      makeSubscription({ id: "s3", importance: "dispensable", amount: 30, status: "active" })
    ];
    const result = summarizeSubscriptions(subs);
    expect(result.dispensableCount).toBe(2);
    expect(result.dispensableMonthlyTotal).toBeCloseTo(80);
  });

  it("dispensableMonthlyTotal exclui dispensáveis pausadas", () => {
    const subs = [
      makeSubscription({ id: "s1", importance: "dispensable", amount: 50, status: "active" }),
      makeSubscription({ id: "s2", importance: "dispensable", amount: 100, status: "paused" })
    ];
    const result = summarizeSubscriptions(subs);
    expect(result.dispensableMonthlyTotal).toBeCloseTo(50);
  });

  it("conta upcoming corretamente dentro de 7 dias", () => {
    const today = new Date();
    const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const farFuture = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 30));
    const farStr = farFuture.toISOString().slice(0, 10);

    const subs = [
      makeSubscription({ id: "s1", next_billing_date: tomorrowStr, status: "active" }),
      makeSubscription({ id: "s2", next_billing_date: farStr, status: "active" })
    ];
    const result = summarizeSubscriptions(subs);
    expect(result.upcomingCount).toBe(1);
    expect(result.upcoming).toHaveLength(1);
  });

  it("upcoming é limitado a 5 itens", () => {
    const today = new Date();
    const subs = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1 + i));
      return makeSubscription({ id: `s${i}`, next_billing_date: d.toISOString().slice(0, 10), status: "active" });
    });
    const result = summarizeSubscriptions(subs);
    expect(result.upcoming.length).toBeLessThanOrEqual(5);
  });

  it("calcula annualTotal corretamente", () => {
    const subs = [
      makeSubscription({ amount: 100, billing_cycle: "monthly", status: "active" }),
      makeSubscription({ amount: 1200, billing_cycle: "yearly", status: "active" })
    ];
    const result = summarizeSubscriptions(subs);
    expect(result.annualTotal).toBeCloseTo(2400);
  });
});
