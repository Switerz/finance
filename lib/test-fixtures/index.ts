import type {
  Account,
  Budget,
  DashboardSummary,
  Goal,
  GoalStatus,
  Subscription,
  Transaction,
  TransactionStatus,
  TransactionType
} from "@/types/finance";

export function makeTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    workspace_id: "ws-1",
    account_id: "acc-1",
    category_id: "cat-1",
    description: "Transação teste",
    amount: 100,
    type: "expense" as TransactionType,
    transaction_date: "2025-05-10",
    competence_month: null,
    payment_method: null,
    status: "paid" as TransactionStatus,
    notes: null,
    tags: [],
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    created_by: null,
    created_at: "2025-05-10T10:00:00Z",
    updated_at: "2025-05-10T10:00:00Z",
    account_name: "Conta corrente",
    category_name: "Alimentação",
    category_color: "#ef4444",
    transfer_peer_name: null,
    ...overrides
  };
}

export function makeAccount(overrides?: Partial<Account>): Account {
  return {
    id: "acc-1",
    workspace_id: "ws-1",
    name: "Conta corrente",
    type: "checking",
    institution: null,
    initial_balance: 1000,
    current_balance: 1000,
    credit_limit: null,
    closing_day: null,
    due_day: null,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides
  };
}

export function makeBudget(overrides?: Partial<Budget>): Budget {
  return {
    id: "bud-1",
    workspace_id: "ws-1",
    category_id: "cat-1",
    month: "2025-05-01",
    planned_amount: 500,
    alert_threshold: 0.8,
    created_at: "2025-05-01T00:00:00Z",
    updated_at: "2025-05-01T00:00:00Z",
    category_name: "Alimentação",
    category_type: "expense",
    category_color: "#ef4444",
    actual_amount: 250,
    remaining_amount: 250,
    progress: 0.5,
    status: "healthy",
    ...overrides
  };
}

export function makeSubscription(overrides?: Partial<Subscription>): Subscription {
  return {
    id: "sub-1",
    workspace_id: "ws-1",
    account_id: "acc-1",
    category_id: "cat-1",
    name: "Netflix",
    amount: 55.9,
    billing_cycle: "monthly",
    billing_day: 15,
    next_billing_date: null,
    status: "active",
    importance: "useful",
    website: null,
    notes: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    account_name: "Conta corrente",
    category_name: "Streaming",
    category_color: "#e11d48",
    ...overrides
  };
}

export function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "goal-1",
    workspace_id: "ws-1",
    name: "Reserva de emergência",
    target_amount: 10000,
    current_amount: 5000,
    deadline: null,
    monthly_contribution: 500,
    status: "active" as GoalStatus,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    progress: 0.5,
    remaining_amount: 5000,
    months_remaining: null,
    required_monthly_contribution: null,
    deadline_status: "no_deadline",
    ...overrides
  };
}

export function makeMonthlySeries(months = 6): DashboardSummary["monthlySeries"] {
  const base = new Date(Date.UTC(2025, 4, 1)); // May 2025

  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - (months - 1 - i), 1));
    const month = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("pt-BR", { month: "short", timeZone: "UTC" });
    const income = 5000;
    const expenses = 3000;
    const investments = 500;

    return {
      month,
      label,
      income,
      expenses,
      investments,
      balance: income - expenses - investments
    };
  });
}
