import { getCategories } from "@/lib/queries/categories";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  Budget,
  BudgetFormOptions,
  BudgetStatus,
  BudgetSummary,
  CategoryType,
  TransactionType
} from "@/types/finance";

type BudgetRow = {
  id: string;
  workspace_id: string;
  category_id: string;
  month: string;
  planned_amount: number | string;
  alert_threshold: number | string;
  created_at: string;
  updated_at: string;
  categories:
    | {
        name: string;
        type: CategoryType;
        color: string | null;
      }
    | {
        name: string;
        type: CategoryType;
        color: string | null;
      }[]
    | null;
};

type ActualTransactionRow = {
  category_id: string | null;
  amount: number | string;
  type: TransactionType;
};

export type BudgetFilters = {
  month?: string;
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function monthToDate(month?: string) {
  const normalized = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month ?? ""
    : new Date().toISOString().slice(0, 7);

  return `${normalized}-01`;
}

export function getMonthRange(monthDate: string) {
  const normalized = monthDate.slice(0, 7);
  const [year, monthIndex] = normalized.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthIndex, 1));

  return {
    month: `${normalized}-01`,
    start: `${normalized}-01`,
    end: nextMonth.toISOString().slice(0, 10)
  };
}

export function previousMonthDate(monthDate: string) {
  const [year, monthIndex] = monthDate.slice(0, 7).split("-").map(Number);
  const previous = new Date(Date.UTC(year, monthIndex - 2, 1));

  return previous.toISOString().slice(0, 10);
}

function getBudgetStatus(
  actualAmount: number,
  plannedAmount: number,
  alertThreshold: number
): BudgetStatus {
  if (plannedAmount <= 0) {
    return "healthy";
  }

  const progress = actualAmount / plannedAmount;

  if (progress > 1) {
    return "exceeded";
  }

  if (progress >= alertThreshold) {
    return "critical";
  }

  if (progress >= 0.7) {
    return "attention";
  }

  return "healthy";
}

function mapBudget(row: BudgetRow, actualAmount: number): Budget {
  const category = firstRelation(row.categories);
  const plannedAmount = toNumber(row.planned_amount);
  const alertThreshold = toNumber(row.alert_threshold);

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    category_id: row.category_id,
    month: row.month,
    planned_amount: plannedAmount,
    alert_threshold: alertThreshold,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: category?.name ?? "Categoria removida",
    category_type: category?.type ?? "expense",
    category_color: category?.color ?? null,
    actual_amount: actualAmount,
    remaining_amount: plannedAmount - actualAmount,
    progress: plannedAmount > 0 ? actualAmount / plannedAmount : 0,
    status: getBudgetStatus(actualAmount, plannedAmount, alertThreshold)
  };
}

export async function getBudgets(
  filters: BudgetFilters = {}
): Promise<Budget[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const month = monthToDate(filters.month);
  const { start, end } = getMonthRange(month);
  const supabase = await createClient();
  const [{ data: budgetsData, error: budgetsError }, { data: actualsData }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          "id, workspace_id, category_id, month, planned_amount, alert_threshold, created_at, updated_at, categories(name, type, color)"
        )
        .eq("workspace_id", workspace.id)
        .eq("month", month)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("category_id, amount, type")
        .eq("workspace_id", workspace.id)
        .eq("status", "paid")
        .gte("transaction_date", start)
        .lt("transaction_date", end)
    ]);

  if (budgetsError || !budgetsData) {
    return [];
  }

  const actualByCategory = new Map<string, number>();

  for (const transaction of (actualsData ?? []) as ActualTransactionRow[]) {
    if (!transaction.category_id) {
      continue;
    }

    if (transaction.type !== "expense" && transaction.type !== "investment") {
      continue;
    }

    const current = actualByCategory.get(transaction.category_id) ?? 0;
    actualByCategory.set(
      transaction.category_id,
      current + toNumber(transaction.amount)
    );
  }

  return (budgetsData as BudgetRow[])
    .map((budget) => mapBudget(budget, actualByCategory.get(budget.category_id) ?? 0))
    .sort((a, b) => {
      if (a.category_type === b.category_type) {
        return a.category_name.localeCompare(b.category_name, "pt-BR");
      }

      return a.category_type === "expense" ? -1 : 1;
    });
}

export async function getBudgetFormOptions(): Promise<BudgetFormOptions> {
  const categories = await getCategories();

  return {
    categories: categories.filter(
      (category) =>
        category.is_active &&
        (category.type === "expense" || category.type === "investment")
    )
  };
}

export function summarizeBudgets(budgets: Budget[]): BudgetSummary {
  return budgets.reduce(
    (summary, budget) => ({
      planned: summary.planned + budget.planned_amount,
      actual: summary.actual + budget.actual_amount,
      remaining: summary.remaining + budget.remaining_amount,
      exceededCount:
        summary.exceededCount + (budget.status === "exceeded" ? 1 : 0)
    }),
    { planned: 0, actual: 0, remaining: 0, exceededCount: 0 }
  );
}
