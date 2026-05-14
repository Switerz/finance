import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSubscriptionSummary } from "@/lib/queries/subscriptions";
import {
  getDashboardSummary,
  getTransactions
} from "@/lib/queries/transactions";
import type {
  CategoryVariation,
  DashboardSummary,
  MonthlyComparison,
  MonthlyReport,
  Transaction
} from "@/types/finance";

function normalizeMonth(month?: string) {
  return /^\d{4}-\d{2}$/.test(month ?? "")
    ? month ?? ""
    : new Date().toISOString().slice(0, 7);
}

function previousMonth(month: string) {
  return format(subMonths(new Date(`${month}-01T00:00:00.000Z`), 1), "yyyy-MM");
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}

function comparison(
  key: MonthlyComparison["key"],
  label: string,
  current: number,
  previous: number,
  formatType: MonthlyComparison["format"] = "currency"
): MonthlyComparison {
  return {
    key,
    label,
    current,
    previous,
    absoluteChange: current - previous,
    percentChange: percentChange(current, previous),
    format: formatType
  };
}

function buildComparisons(
  current: DashboardSummary,
  previous: DashboardSummary
): MonthlyComparison[] {
  return [
    comparison("income", "Renda", current.income, previous.income),
    comparison("expenses", "Despesas", current.expenses, previous.expenses),
    comparison(
      "investments",
      "Investimentos",
      current.investments,
      previous.investments
    ),
    comparison("balance", "Saldo", current.balance, previous.balance),
    comparison(
      "savingsRate",
      "Taxa de poupança",
      current.savingsRate,
      previous.savingsRate,
      "percent"
    ),
    comparison(
      "dailyAverageExpense",
      "Média diária",
      current.dailyAverageExpense,
      previous.dailyAverageExpense
    )
  ];
}

function categoryTotals(transactions: Transaction[]) {
  const totals = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      color: string | null;
      amount: number;
    }
  >();

  for (const transaction of transactions) {
    if (transaction.status !== "paid" || transaction.type !== "expense") {
      continue;
    }

    const key = transaction.category_id ?? "uncategorized";
    const current = totals.get(key) ?? {
      categoryId: transaction.category_id,
      categoryName: transaction.category_name ?? "Sem categoria",
      color: transaction.category_color,
      amount: 0
    };

    current.amount += transaction.amount;
    totals.set(key, current);
  }

  return totals;
}

function buildCategoryVariations(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[]
): CategoryVariation[] {
  const currentTotals = categoryTotals(currentTransactions);
  const previousTotals = categoryTotals(previousTransactions);
  const keys = new Set([...currentTotals.keys(), ...previousTotals.keys()]);

  return [...keys]
    .map((key) => {
      const current = currentTotals.get(key);
      const previous = previousTotals.get(key);
      const currentAmount = current?.amount ?? 0;
      const previousAmount = previous?.amount ?? 0;

      return {
        categoryId: current?.categoryId ?? previous?.categoryId ?? null,
        categoryName:
          current?.categoryName ?? previous?.categoryName ?? "Sem categoria",
        color: current?.color ?? previous?.color ?? null,
        currentAmount,
        previousAmount,
        absoluteChange: currentAmount - previousAmount,
        percentChange: percentChange(currentAmount, previousAmount)
      };
    })
    .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
}

function topTransactions(
  transactions: Transaction[],
  type: "income" | "expense"
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.status === "paid" && transaction.type === type
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

export async function getMonthlyReport(month?: string): Promise<MonthlyReport> {
  const selectedMonth = normalizeMonth(month);
  const previous = previousMonth(selectedMonth);
  const [
    currentSummary,
    previousSummary,
    currentTransactions,
    previousTransactions,
    subscriptionAnalysis
  ] = await Promise.all([
    getDashboardSummary(selectedMonth),
    getDashboardSummary(previous),
    getTransactions({ month: selectedMonth }),
    getTransactions({ month: previous }),
    getSubscriptionSummary()
  ]);

  return {
    month: selectedMonth,
    previousMonth: previous,
    current: currentSummary,
    previous: previousSummary,
    comparisons: buildComparisons(currentSummary, previousSummary),
    categoryVariations: buildCategoryVariations(
      currentTransactions,
      previousTransactions
    ),
    topExpenses: topTransactions(currentTransactions, "expense"),
    topIncome: topTransactions(currentTransactions, "income"),
    balanceEvolution: currentSummary.monthlySeries,
    subscriptionAnalysis,
    exportUrl: `/api/export?type=transactions&month=${selectedMonth}`
  };
}

export function formatReportMonth(month: string) {
  return format(new Date(`${month}-01T00:00:00.000Z`), "MMMM yyyy", {
    locale: ptBR
  });
}
