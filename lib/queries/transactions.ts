import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAccounts } from "@/lib/queries/accounts";
import { getBudgets } from "@/lib/queries/budgets";
import { getCategories } from "@/lib/queries/categories";
import { getGoals } from "@/lib/queries/goals";
import { getSubscriptionSummary } from "@/lib/queries/subscriptions";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  Budget,
  BudgetProjection,
  DashboardSummary,
  FinancialInsight,
  PaymentMethod,
  SavingsRateTrend,
  Transaction,
  TransactionFormOptions,
  TransactionStatus,
  TransactionType
} from "@/types/finance";

type TransactionRow = Omit<
  Transaction,
  | "type"
  | "payment_method"
  | "status"
  | "amount"
  | "tags"
  | "account_name"
  | "category_name"
  | "category_color"
  | "transfer_peer_name"
> & {
  type: TransactionType;
  payment_method: PaymentMethod | null;
  status: TransactionStatus;
  amount: number | string;
  tags: string[] | null;
  accounts: { name: string } | { name: string }[] | null;
  categories:
    | { name: string; color: string | null }
    | { name: string; color: string | null }[]
    | null;
};

export type TransactionFilters = {
  month?: string;
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeMonth(month?: string) {
  return /^\d{4}-\d{2}$/.test(month ?? "")
    ? month ?? ""
    : new Date().toISOString().slice(0, 7);
}

function getMonthRange(month?: string) {
  const normalized = normalizeMonth(month);
  const [year, monthIndex] = normalized.split("-").map(Number);
  const start = `${normalized}-01`;
  const nextMonth = new Date(Date.UTC(year, monthIndex, 1));
  const end = nextMonth.toISOString().slice(0, 10);

  return { month: normalized, start, end, year, monthIndex };
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

function elapsedDaysInMonth(month: string, totalDays: number) {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);

  if (month < currentMonth) {
    return totalDays;
  }

  if (month > currentMonth) {
    return 1;
  }

  return Math.max(1, today.getUTCDate());
}

function transactionImpact(
  type: TransactionType,
  amount: number,
  installmentNumber?: number | null
) {
  if (type === "income") {
    return amount;
  }

  if (type === "expense" || type === "investment") {
    return -amount;
  }

  if (type === "transfer") {
    return installmentNumber === 2 ? amount : -amount;
  }

  return 0;
}

function mapTransaction(
  row: TransactionRow,
  peerNameByGroup?: Map<string, string>
): Transaction {
  const account = firstRelation(row.accounts);
  const category = firstRelation(row.categories);
  const transferPeerName =
    row.type === "transfer" && row.installment_group_id
      ? (peerNameByGroup?.get(row.installment_group_id) ?? null)
      : null;

  return {
    ...row,
    amount: toNumber(row.amount),
    tags: row.tags ?? [],
    account_name: account?.name ?? null,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
    transfer_peer_name: transferPeerName
  };
}

async function getTransactionsByRange(
  workspaceId: string,
  start: string,
  end: string
): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, transaction_date, competence_month, payment_method, status, notes, tags, is_recurring, recurring_rule_id, installment_group_id, installment_number, installment_total, created_by, created_at, updated_at, accounts(name), categories(name, color)"
    )
    .eq("workspace_id", workspaceId)
    .gte("transaction_date", start)
    .lt("transaction_date", end)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data as TransactionRow[];

  // For each transfer group, map accountId → peer account name
  // key: `${groupId}|${accountId}` → peer name
  const peerByKey = new Map<string, string>();
  const transferRows = rows.filter(
    (row) => row.type === "transfer" && row.installment_group_id && row.account_id
  );

  // First pass: collect all (groupId, accountId, accountName) entries
  const transferEntries = transferRows.map((row) => ({
    groupId: row.installment_group_id!,
    accountId: row.account_id!,
    accountName: firstRelation(row.accounts)?.name ?? null
  }));

  // Second pass: for each entry, find the other side of the same group
  for (const entry of transferEntries) {
    const peer = transferEntries.find(
      (other) => other.groupId === entry.groupId && other.accountId !== entry.accountId
    );

    if (peer?.accountName) {
      peerByKey.set(`${entry.groupId}|${entry.accountId}`, peer.accountName);
    }
  }

  return rows.map((row) => {
    const peerName =
      row.type === "transfer" && row.installment_group_id && row.account_id
        ? (peerByKey.get(`${row.installment_group_id}|${row.account_id}`) ?? null)
        : null;

    return mapTransaction(
      row,
      peerName ? new Map([[row.installment_group_id!, peerName]]) : undefined
    );
  });
}

function isFixedExpense(transaction: Transaction) {
  return (
    transaction.type === "expense" &&
    (transaction.is_recurring ||
      Boolean(transaction.recurring_rule_id) ||
      transaction.tags.some((tag) => tag.toLowerCase() === "assinatura"))
  );
}

function buildMonthlySeries(transactions: Transaction[], selectedMonth: string) {
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00.000Z`);
  const months = Array.from({ length: 6 }, (_, index) =>
    format(subMonths(selectedDate, 5 - index), "yyyy-MM")
  );
  const rows = new Map(
    months.map((month) => [
      month,
      {
        month,
        label: format(new Date(`${month}-01T00:00:00.000Z`), "MMM", {
          locale: ptBR
        }),
        income: 0,
        expenses: 0,
        investments: 0,
        balance: 0
      }
    ])
  );

  for (const transaction of transactions) {
    if (transaction.status !== "paid") {
      continue;
    }

    const month = transaction.transaction_date.slice(0, 7);
    const row = rows.get(month);

    if (!row) {
      continue;
    }

    if (transaction.type === "income") {
      row.income += transaction.amount;
    }

    if (transaction.type === "expense") {
      row.expenses += transaction.amount;
    }

    if (transaction.type === "investment") {
      row.investments += transaction.amount;
    }
  }

  return [...rows.values()].map((row) => ({
    ...row,
    balance: row.income - row.expenses - row.investments
  }));
}

function buildDailyExpenseSeries(
  paidTransactions: Transaction[],
  year: number,
  monthIndex: number
) {
  const totalDays = daysInMonth(year, monthIndex);
  const rows = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(monthIndex).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return {
      date,
      day,
      amount: 0,
      cumulative: 0
    };
  });

  for (const transaction of paidTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const day = Number(transaction.transaction_date.slice(8, 10));
    const row = rows[day - 1];

    if (row) {
      row.amount += transaction.amount;
    }
  }

  let cumulative = 0;

  return rows.map((row) => {
    cumulative += row.amount;
    return {
      ...row,
      cumulative
    };
  });
}

function buildCategoryBreakdown(paidTransactions: Transaction[]) {
  const categoryTotals = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      color: string | null;
      amount: number;
    }
  >();

  for (const transaction of paidTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const key = transaction.category_id ?? "uncategorized";
    const current = categoryTotals.get(key) ?? {
      categoryId: transaction.category_id,
      categoryName: transaction.category_name ?? "Sem categoria",
      color: transaction.category_color,
      amount: 0
    };

    current.amount += transaction.amount;
    categoryTotals.set(key, current);
  }

  return [...categoryTotals.values()].sort((a, b) => b.amount - a.amount);
}

export function buildBudgetProjections(
  budgets: Budget[],
  elapsedDays: number,
  totalDays: number
): BudgetProjection[] {
  return budgets
    .filter((budget) => budget.planned_amount > 0)
    .map((budget) => {
      const projected = (budget.actual_amount / elapsedDays) * totalDays;
      const projectedProgress = projected / budget.planned_amount;

      return {
        categoryId: budget.category_id,
        categoryName: budget.category_name,
        color: budget.category_color,
        planned: budget.planned_amount,
        actual: budget.actual_amount,
        projected,
        projectedProgress,
        willExceed: projected > budget.planned_amount
      };
    })
    .sort((a, b) => b.projectedProgress - a.projectedProgress);
}

export function buildSavingsRateTrend(
  monthlySeries: DashboardSummary["monthlySeries"],
  currentSavingsRate: number
): SavingsRateTrend | null {
  if (monthlySeries.length < 4) {
    return null;
  }

  // Last 3 months before the current one
  const previousMonths = monthlySeries.slice(-4, -1);
  const rates = previousMonths.map((month) =>
    month.income > 0
      ? (month.investments + Math.max(month.balance, 0)) / month.income
      : 0
  );
  const threeMonthAvg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
  const diff = currentSavingsRate - threeMonthAvg;
  const trend: SavingsRateTrend["trend"] =
    diff > 0.02 ? "up" : diff < -0.02 ? "down" : "stable";

  return { current: currentSavingsRate, threeMonthAvg, trend };
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function buildInsights({
  budgetProjections,
  savingsRateTrend,
  dispensableSubscriptionTotal,
  goals,
  projectedExpenses,
  income
}: {
  budgetProjections: BudgetProjection[];
  savingsRateTrend: SavingsRateTrend | null;
  dispensableSubscriptionTotal: number;
  goals: { name: string; deadline_status: string; required_monthly_contribution: number | null }[];
  projectedExpenses: number;
  income: number;
}): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  // Budget projections at risk
  for (const bp of budgetProjections.filter((b) => b.willExceed).slice(0, 2)) {
    insights.push({
      type: "budget_projection",
      severity: bp.projectedProgress > 1.3 ? "critical" : "warning",
      title: `${bp.categoryName} deve estourar o orçamento`,
      description: `Projeção de ${formatPercent(bp.projectedProgress)} do planejado até o fim do mês.`,
      href: "/budgets"
    });
  }

  // Savings rate trend
  if (savingsRateTrend && savingsRateTrend.trend !== "stable") {
    const isUp = savingsRateTrend.trend === "up";
    insights.push({
      type: "savings_trend",
      severity: isUp ? "info" : "warning",
      title: isUp ? "Taxa de poupança subindo" : "Taxa de poupança caindo",
      description: `${formatPercent(savingsRateTrend.current)} este mês vs. média de ${formatPercent(savingsRateTrend.threeMonthAvg)} nos 3 meses anteriores.`
    });
  }

  // Dispensable subscriptions
  if (dispensableSubscriptionTotal > 0) {
    insights.push({
      type: "subscription",
      severity: "info",
      title: "Assinaturas dispensáveis ativas",
      description: `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dispensableSubscriptionTotal)}/mês em assinaturas classificadas como dispensáveis.`,
      href: "/subscriptions"
    });
  }

  // Goal at risk
  const urgentGoal = goals.find(
    (goal) => goal.deadline_status === "overdue" || goal.deadline_status === "due_soon"
  );

  if (urgentGoal) {
    const contributionNote =
      urgentGoal.required_monthly_contribution !== null
        ? ` Contribuição necessária: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(urgentGoal.required_monthly_contribution)}/mês.`
        : "";
    insights.push({
      type: "goal",
      severity: urgentGoal.deadline_status === "overdue" ? "critical" : "warning",
      title: `Meta "${urgentGoal.name}" com prazo próximo`,
      description: `Revise o aporte para cumprir o prazo.${contributionNote}`,
      href: "/goals"
    });
  }

  // Overspending projection
  if (income > 0 && projectedExpenses > income * 0.9) {
    insights.push({
      type: "spending",
      severity: projectedExpenses > income ? "critical" : "warning",
      title: "Projeção de despesas elevada",
      description: `Com o ritmo atual, as despesas do mês devem chegar a ${formatPercent(projectedExpenses / income)} da renda.`,
      href: "/transactions"
    });
  }

  return insights.slice(0, 5);
}

export function buildAlerts({
  budgets,
  subscriptionUpcomingCount,
  projectedExpenses,
  expenses,
  expectedDailyBudget,
  elapsedDays,
  goalsWithDeadlines
}: {
  budgets: Budget[];
  subscriptionUpcomingCount: number;
  projectedExpenses: number;
  expenses: number;
  expectedDailyBudget: number | null;
  elapsedDays: number;
  goalsWithDeadlines: { name: string; deadline_status: string }[];
}): DashboardSummary["alerts"] {
  const alerts: DashboardSummary["alerts"] = [];
  const exceededBudgets = budgets.filter((budget) => budget.status === "exceeded");
  const riskBudget = [...budgets].sort((a, b) => b.progress - a.progress)[0];

  if (exceededBudgets.length) {
    alerts.push({
      type: "budget",
      title: "Orçamentos estourados",
      description: `${exceededBudgets.length} categoria(s) passaram do planejado.`,
      severity: "critical",
      href: "/budgets"
    });
  } else if (riskBudget && riskBudget.progress >= riskBudget.alert_threshold) {
    alerts.push({
      type: "budget",
      title: "Orçamento em risco",
      description: `${riskBudget.category_name} já usou ${Math.round(
        riskBudget.progress * 100
      )}% do planejado.`,
      severity: "warning",
      href: "/budgets"
    });
  }

  if (subscriptionUpcomingCount > 0) {
    alerts.push({
      type: "subscription",
      title: "Assinaturas próximas",
      description: `${subscriptionUpcomingCount} cobrança(s) vencem em até 7 dias.`,
      severity: "info",
      href: "/subscriptions"
    });
  }

  if (
    expectedDailyBudget !== null &&
    expenses / elapsedDays > expectedDailyBudget
  ) {
    alerts.push({
      type: "spending",
      title: "Gasto diário acima do esperado",
      description: `A projeção do mês está em ${Math.round(
        projectedExpenses
      ).toLocaleString("pt-BR")} antes dos investimentos.`,
      severity: "warning",
      href: "/transactions"
    });
  }

  const urgentGoal = goalsWithDeadlines.find(
    (goal) => goal.deadline_status === "overdue" || goal.deadline_status === "due_soon"
  );

  if (urgentGoal) {
    alerts.push({
      type: "goal",
      title: "Meta com prazo próximo",
      description: `${urgentGoal.name} precisa de revisão de aporte.`,
      severity: urgentGoal.deadline_status === "overdue" ? "critical" : "warning",
      href: "/goals"
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "budget",
      title: "Nenhum alerta agora",
      description: "Orçamentos, assinaturas e metas estão sem sinal crítico.",
      severity: "info"
    });
  }

  return alerts.slice(0, 5);
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const { start, end } = getMonthRange(filters.month);

  return getTransactionsByRange(workspace.id, start, end);
}

export async function getTransactionFormOptions(): Promise<TransactionFormOptions> {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return {
    accounts: accounts.filter((account) => account.is_active),
    categories: categories.filter(
      (category) => category.is_active && category.type !== "transfer"
    )
  };
}

export async function getDashboardSummary(
  month?: string
): Promise<DashboardSummary> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return {
      income: 0,
      expenses: 0,
      investments: 0,
      balance: 0,
      savingsRate: 0,
      projectedExpenses: 0,
      dailyAverageExpense: 0,
      expectedDailyBudget: null,
      paidTransactionsCount: 0,
      pendingTransactionsCount: 0,
      scheduledTransactionsCount: 0,
      topCategoryName: null,
      topCategoryAmount: 0,
      budgetExceededCount: 0,
      budgetRiskCategoryName: null,
      budgetRiskProgress: 0,
      subscriptionMonthlyTotal: 0,
      subscriptionUpcomingCount: 0,
      goalActiveCount: 0,
      goalRemainingAmount: 0,
      goalNextDeadlineName: null,
      recentTransactions: [],
      topTransactions: [],
      monthlySeries: [],
      dailyExpenseSeries: [],
      categoryBreakdown: [],
      fixedVariableBreakdown: [],
      alerts: [],
      budgetProjections: [],
      savingsRateTrend: null,
      insights: [],
      dispensableSubscriptionTotal: 0
    };
  }

  const { month: selectedMonth, start, end, year, monthIndex } = getMonthRange(month);
  const selectedDate = new Date(`${selectedMonth}-01T00:00:00.000Z`);
  const seriesStart = format(subMonths(selectedDate, 5), "yyyy-MM-01");
  const [
    transactions,
    seriesTransactions,
    budgets,
    subscriptionSummary,
    goals
  ] = await Promise.all([
    getTransactionsByRange(workspace.id, start, end),
    getTransactionsByRange(workspace.id, seriesStart, end),
    getBudgets({ month }),
    getSubscriptionSummary(),
    getGoals()
  ]);
  const paidTransactions = transactions.filter(
    (transaction) => transaction.status === "paid"
  );
  const income = paidTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = paidTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const investments = paidTransactions
    .filter((transaction) => transaction.type === "investment")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const balance = paidTransactions.reduce(
    (total, transaction) =>
      total +
      transactionImpact(
        transaction.type,
        transaction.amount,
        transaction.installment_number
      ),
    0
  );
  const totalDays = daysInMonth(year, monthIndex);
  const elapsedDays = elapsedDaysInMonth(selectedMonth, totalDays);
  const projectedExpenses =
    expenses > 0 ? (expenses / elapsedDays) * totalDays : 0;
  const dailyAverageExpense = expenses > 0 ? expenses / elapsedDays : 0;
  const expectedDailyBudget = income > 0 ? income / totalDays : null;
  const categoryBreakdown = buildCategoryBreakdown(paidTransactions);
  const topCategory = categoryBreakdown[0] ?? null;
  const budgetExceededCount = budgets.filter(
    (budget) => budget.status === "exceeded"
  ).length;
  const budgetRisk = [...budgets].sort((a, b) => b.progress - a.progress)[0];
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const nextDeadlineGoal = [...activeGoals]
    .filter((goal) => goal.deadline)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0];
  const fixedAmount = paidTransactions
    .filter(isFixedExpense)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const variableAmount = Math.max(expenses - fixedAmount, 0);
  const savingsRate = income > 0 ? (investments + Math.max(balance, 0)) / income : 0;
  const monthlySeries = buildMonthlySeries(seriesTransactions, selectedMonth);
  const budgetProjections = buildBudgetProjections(budgets, elapsedDays, totalDays);
  const savingsRateTrend = buildSavingsRateTrend(monthlySeries, savingsRate);
  const dispensableSubscriptionTotal = subscriptionSummary.dispensableMonthlyTotal;
  const insights = buildInsights({
    budgetProjections,
    savingsRateTrend,
    dispensableSubscriptionTotal,
    goals: activeGoals,
    projectedExpenses,
    income
  });

  return {
    income,
    expenses,
    investments,
    balance,
    savingsRate,
    projectedExpenses,
    dailyAverageExpense,
    expectedDailyBudget,
    paidTransactionsCount: paidTransactions.length,
    pendingTransactionsCount: transactions.filter(
      (transaction) => transaction.status === "pending"
    ).length,
    scheduledTransactionsCount: transactions.filter(
      (transaction) => transaction.status === "scheduled"
    ).length,
    topCategoryName: topCategory?.categoryName ?? null,
    topCategoryAmount: topCategory?.amount ?? 0,
    budgetExceededCount,
    budgetRiskCategoryName: budgetRisk?.category_name ?? null,
    budgetRiskProgress: budgetRisk?.progress ?? 0,
    subscriptionMonthlyTotal: subscriptionSummary.monthlyTotal,
    subscriptionUpcomingCount: subscriptionSummary.upcomingCount,
    goalActiveCount: activeGoals.length,
    goalRemainingAmount: activeGoals.reduce(
      (total, goal) => total + goal.remaining_amount,
      0
    ),
    goalNextDeadlineName: nextDeadlineGoal?.name ?? null,
    recentTransactions: transactions.slice(0, 6),
    topTransactions: paidTransactions
      .filter(
        (transaction) =>
          transaction.type === "expense" || transaction.type === "investment"
      )
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    monthlySeries,
    dailyExpenseSeries: buildDailyExpenseSeries(
      paidTransactions,
      year,
      monthIndex
    ),
    categoryBreakdown: categoryBreakdown.slice(0, 5),
    fixedVariableBreakdown: ([
      { name: "Fixo", amount: fixedAmount },
      { name: "Variável", amount: variableAmount }
    ] satisfies DashboardSummary["fixedVariableBreakdown"]).filter(
      (item) => item.amount > 0
    ),
    alerts: buildAlerts({
      budgets,
      subscriptionUpcomingCount: subscriptionSummary.upcomingCount,
      projectedExpenses,
      expenses,
      expectedDailyBudget,
      elapsedDays,
      goalsWithDeadlines: activeGoals
    }),
    budgetProjections,
    savingsRateTrend,
    insights,
    dispensableSubscriptionTotal
  };
}
