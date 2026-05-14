import { describe, expect, it } from "vitest";
import {
  buildAlerts,
  buildBudgetProjections,
  buildInsights,
  buildSavingsRateTrend
} from "./transactions";
import { makeBudget, makeGoal, makeMonthlySeries } from "@/lib/test-fixtures";

// ─── buildBudgetProjections ───────────────────────────────────────────────────

describe("buildBudgetProjections", () => {
  it("calcula projeção proporcional ao ritmo atual", () => {
    // actual=400, elapsed=20, total=30 → projected=600, 600/1000=0.6, willExceed=false
    const budget = makeBudget({ planned_amount: 1000, actual_amount: 400 });
    const [result] = buildBudgetProjections([budget], 20, 30);
    expect(result.projected).toBeCloseTo(600);
    expect(result.projectedProgress).toBeCloseTo(0.6);
    expect(result.willExceed).toBe(false);
  });

  it("marca willExceed quando projeção ultrapassa o planejado", () => {
    const budget = makeBudget({ planned_amount: 500, actual_amount: 400 });
    const [result] = buildBudgetProjections([budget], 10, 30);
    expect(result.projected).toBeCloseTo(1200);
    expect(result.willExceed).toBe(true);
  });

  it("não marca willExceed quando dentro do planejado", () => {
    const budget = makeBudget({ planned_amount: 1000, actual_amount: 200 });
    const [result] = buildBudgetProjections([budget], 20, 30);
    expect(result.willExceed).toBe(false);
  });

  it("retorna array vazio quando não há budgets", () => {
    expect(buildBudgetProjections([], 15, 30)).toEqual([]);
  });

  it("ignora budgets com planned_amount zero", () => {
    const budget = makeBudget({ planned_amount: 0, actual_amount: 50 });
    expect(buildBudgetProjections([budget], 15, 30)).toEqual([]);
  });

  it("ordena por projectedProgress decrescente", () => {
    const high = makeBudget({ id: "high", planned_amount: 100, actual_amount: 90 });
    const low = makeBudget({ id: "low", planned_amount: 1000, actual_amount: 100 });
    const result = buildBudgetProjections([low, high], 15, 30);
    expect(result[0].categoryId).toBe("cat-1");
    expect(result[0].projectedProgress).toBeGreaterThan(result[1].projectedProgress);
  });

  it("inclui campos corretos no retorno", () => {
    const budget = makeBudget({ planned_amount: 400, actual_amount: 200 });
    const [result] = buildBudgetProjections([budget], 10, 30);
    expect(result).toMatchObject({
      categoryId: "cat-1",
      categoryName: "Alimentação",
      color: "#ef4444",
      planned: 400,
      actual: 200
    });
  });
});

// ─── buildSavingsRateTrend ────────────────────────────────────────────────────

describe("buildSavingsRateTrend", () => {
  it("retorna null quando série tem menos de 4 meses", () => {
    expect(buildSavingsRateTrend(makeMonthlySeries(3), 0.2)).toBeNull();
    expect(buildSavingsRateTrend(makeMonthlySeries(1), 0.2)).toBeNull();
  });

  it("retorna null quando série está vazia", () => {
    expect(buildSavingsRateTrend([], 0.2)).toBeNull();
  });

  it("retorna objeto com os campos corretos", () => {
    const result = buildSavingsRateTrend(makeMonthlySeries(6), 0.3);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("current", 0.3);
    expect(result).toHaveProperty("threeMonthAvg");
    expect(result).toHaveProperty("trend");
  });

  it("classifica trend como 'up' quando taxa sobe mais de 2 p.p.", () => {
    // Série com taxa histórica ~0.3 (income=5000, expenses=3000, inv=500, balance=1500 → (500+1500)/5000=0.4)
    // Passamos currentSavingsRate de 0.45 — diff > 0.02 → up
    const series = makeMonthlySeries(6);
    const result = buildSavingsRateTrend(series, 0.45);
    expect(result?.trend).toBe("up");
  });

  it("classifica trend como 'down' quando taxa cai mais de 2 p.p.", () => {
    const series = makeMonthlySeries(6);
    const result = buildSavingsRateTrend(series, 0.1);
    expect(result?.trend).toBe("down");
  });

  it("classifica trend como 'stable' quando diferença é pequena", () => {
    const series = makeMonthlySeries(6);
    // Taxa histórica ~0.4, passamos 0.41 → diff < 0.02
    const result = buildSavingsRateTrend(series, 0.41);
    expect(result?.trend).toBe("stable");
  });

  it("funciona com série de exatamente 4 meses", () => {
    const result = buildSavingsRateTrend(makeMonthlySeries(4), 0.3);
    expect(result).not.toBeNull();
  });
});

// ─── buildInsights ────────────────────────────────────────────────────────────

describe("buildInsights", () => {
  const baseArgs = {
    budgetProjections: [],
    savingsRateTrend: null,
    dispensableSubscriptionTotal: 0,
    goals: [],
    projectedExpenses: 0,
    income: 5000
  };

  it("retorna array vazio quando não há dados relevantes", () => {
    expect(buildInsights(baseArgs)).toEqual([]);
  });

  it("gera insight de orçamento para projeções willExceed", () => {
    const projection = {
      categoryId: "cat-1",
      categoryName: "Alimentação",
      color: null,
      planned: 500,
      actual: 400,
      projected: 700,
      projectedProgress: 1.4,
      willExceed: true
    };
    const result = buildInsights({ ...baseArgs, budgetProjections: [projection] });
    expect(result.some((i) => i.type === "budget_projection")).toBe(true);
    expect(result.find((i) => i.type === "budget_projection")?.severity).toBe("critical");
  });

  it("insight de orçamento com projectedProgress 1.1 tem severity warning", () => {
    const projection = {
      categoryId: "cat-1",
      categoryName: "Lazer",
      color: null,
      planned: 300,
      actual: 200,
      projected: 330,
      projectedProgress: 1.1,
      willExceed: true
    };
    const result = buildInsights({ ...baseArgs, budgetProjections: [projection] });
    expect(result.find((i) => i.type === "budget_projection")?.severity).toBe("warning");
  });

  it("gera insight de savings_trend quando trend não é stable", () => {
    const trend = { current: 0.1, threeMonthAvg: 0.4, trend: "down" as const };
    const result = buildInsights({ ...baseArgs, savingsRateTrend: trend });
    expect(result.some((i) => i.type === "savings_trend")).toBe(true);
    expect(result.find((i) => i.type === "savings_trend")?.severity).toBe("warning");
  });

  it("não gera insight de savings_trend quando trend é stable", () => {
    const trend = { current: 0.4, threeMonthAvg: 0.4, trend: "stable" as const };
    const result = buildInsights({ ...baseArgs, savingsRateTrend: trend });
    expect(result.some((i) => i.type === "savings_trend")).toBe(false);
  });

  it("gera insight de subscription quando há total dispensável", () => {
    const result = buildInsights({ ...baseArgs, dispensableSubscriptionTotal: 100 });
    expect(result.some((i) => i.type === "subscription")).toBe(true);
  });

  it("não gera insight de subscription quando total dispensável é zero", () => {
    const result = buildInsights({ ...baseArgs, dispensableSubscriptionTotal: 0 });
    expect(result.some((i) => i.type === "subscription")).toBe(false);
  });

  it("gera insight de meta com prazo vencido (critical)", () => {
    const goal = makeGoal({ deadline_status: "overdue" });
    const result = buildInsights({ ...baseArgs, goals: [goal] });
    expect(result.some((i) => i.type === "goal")).toBe(true);
    expect(result.find((i) => i.type === "goal")?.severity).toBe("critical");
  });

  it("gera insight de meta com prazo próximo (warning)", () => {
    const goal = makeGoal({ deadline_status: "due_soon" });
    const result = buildInsights({ ...baseArgs, goals: [goal] });
    expect(result.find((i) => i.type === "goal")?.severity).toBe("warning");
  });

  it("não gera insight de goal quando prazo está ok", () => {
    const goal = makeGoal({ deadline_status: "on_track" });
    const result = buildInsights({ ...baseArgs, goals: [goal] });
    expect(result.some((i) => i.type === "goal")).toBe(false);
  });

  it("gera insight de spending quando projeção > 90% da renda", () => {
    const result = buildInsights({ ...baseArgs, projectedExpenses: 4600, income: 5000 });
    expect(result.some((i) => i.type === "spending")).toBe(true);
  });

  it("insight de spending é critical quando projeção > 100% da renda", () => {
    const result = buildInsights({ ...baseArgs, projectedExpenses: 5100, income: 5000 });
    expect(result.find((i) => i.type === "spending")?.severity).toBe("critical");
  });

  it("não gera insight de spending quando projeção < 90% da renda", () => {
    const result = buildInsights({ ...baseArgs, projectedExpenses: 4000, income: 5000 });
    expect(result.some((i) => i.type === "spending")).toBe(false);
  });

  it("não gera insight de spending quando income é zero", () => {
    const result = buildInsights({ ...baseArgs, projectedExpenses: 9999, income: 0 });
    expect(result.some((i) => i.type === "spending")).toBe(false);
  });

  it("limita a 5 insights no máximo", () => {
    const projections = Array.from({ length: 5 }, (_, i) => ({
      categoryId: `cat-${i}`,
      categoryName: `Cat ${i}`,
      color: null,
      planned: 100,
      actual: 90,
      projected: 270,
      projectedProgress: 2.7,
      willExceed: true
    }));
    const trend = { current: 0.05, threeMonthAvg: 0.4, trend: "down" as const };
    const result = buildInsights({
      ...baseArgs,
      budgetProjections: projections,
      savingsRateTrend: trend,
      dispensableSubscriptionTotal: 200,
      projectedExpenses: 4700
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("limita insights de orçamento a 2 por chamada", () => {
    const projections = Array.from({ length: 5 }, (_, i) => ({
      categoryId: `cat-${i}`,
      categoryName: `Cat ${i}`,
      color: null,
      planned: 100,
      actual: 95,
      projected: 285,
      projectedProgress: 2.85,
      willExceed: true
    }));
    const result = buildInsights({ ...baseArgs, budgetProjections: projections });
    expect(result.filter((i) => i.type === "budget_projection").length).toBeLessThanOrEqual(2);
  });
});

// ─── buildAlerts ─────────────────────────────────────────────────────────────

describe("buildAlerts", () => {
  const baseArgs = {
    budgets: [],
    subscriptionUpcomingCount: 0,
    projectedExpenses: 0,
    expenses: 0,
    expectedDailyBudget: null,
    elapsedDays: 15,
    goalsWithDeadlines: []
  };

  it("retorna alerta padrão quando não há nenhum sinal crítico", () => {
    const result = buildAlerts(baseArgs);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Nenhum alerta agora");
    expect(result[0].severity).toBe("info");
  });

  it("gera alerta de orçamento estourado (critical)", () => {
    const budget = makeBudget({ status: "exceeded", progress: 1.1 });
    const result = buildAlerts({ ...baseArgs, budgets: [budget] });
    expect(result.some((a) => a.type === "budget" && a.severity === "critical")).toBe(true);
  });

  it("gera alerta de orçamento em risco quando próximo do threshold", () => {
    const budget = makeBudget({ status: "attention", progress: 0.85, alert_threshold: 0.8 });
    const result = buildAlerts({ ...baseArgs, budgets: [budget] });
    expect(result.some((a) => a.type === "budget" && a.severity === "warning")).toBe(true);
  });

  it("gera alerta de assinaturas próximas", () => {
    const result = buildAlerts({ ...baseArgs, subscriptionUpcomingCount: 2 });
    expect(result.some((a) => a.type === "subscription")).toBe(true);
    expect(result.find((a) => a.type === "subscription")?.severity).toBe("info");
  });

  it("não gera alerta de assinatura quando count é zero", () => {
    const result = buildAlerts({ ...baseArgs, subscriptionUpcomingCount: 0 });
    expect(result.some((a) => a.type === "subscription")).toBe(false);
  });

  it("gera alerta de gasto diário acima do esperado", () => {
    // expenses=1500 / elapsedDays=10 = 150/dia > expectedDailyBudget=100/dia
    const result = buildAlerts({
      ...baseArgs,
      expenses: 1500,
      elapsedDays: 10,
      expectedDailyBudget: 100,
      projectedExpenses: 4500
    });
    expect(result.some((a) => a.type === "spending")).toBe(true);
  });

  it("gera alerta de meta com prazo crítico", () => {
    const result = buildAlerts({
      ...baseArgs,
      goalsWithDeadlines: [{ name: "Viagem", deadline_status: "overdue" }]
    });
    expect(result.some((a) => a.type === "goal" && a.severity === "critical")).toBe(true);
  });

  it("gera alerta de meta com prazo próximo (warning)", () => {
    const result = buildAlerts({
      ...baseArgs,
      goalsWithDeadlines: [{ name: "Carro", deadline_status: "due_soon" }]
    });
    expect(result.find((a) => a.type === "goal")?.severity).toBe("warning");
  });

  it("limita a 5 alertas", () => {
    const budget = makeBudget({ status: "exceeded", progress: 1.2 });
    const result = buildAlerts({
      budgets: [budget],
      subscriptionUpcomingCount: 3,
      projectedExpenses: 5000,
      expenses: 2000,
      expectedDailyBudget: 100,
      elapsedDays: 10,
      goalsWithDeadlines: [
        { name: "Meta A", deadline_status: "overdue" },
        { name: "Meta B", deadline_status: "due_soon" }
      ]
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
