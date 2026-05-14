export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "other";

export type CategoryType = "income" | "expense" | "investment" | "transfer";

export type TransactionType = CategoryType;

export type ManualTransactionType = Exclude<TransactionType, "transfer">;

export type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "cash"
  | "bank_slip"
  | "transfer"
  | "other";

export type TransactionStatus =
  | "paid"
  | "pending"
  | "scheduled"
  | "cancelled";

export type BudgetStatus = "healthy" | "attention" | "critical" | "exceeded";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type BillingCycle = "monthly" | "quarterly" | "yearly";

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type SubscriptionImportance = "essential" | "useful" | "dispensable";

export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export type ImportStatus = "uploaded" | "mapped" | "processed" | "failed";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type GoalDeadlineStatus =
  | "no_deadline"
  | "on_track"
  | "due_soon"
  | "overdue"
  | "completed";

export type Account = {
  id: string;
  workspace_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  initial_balance: number;
  current_balance: number;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  profile: Profile | null;
};

export type InvitationRole = "admin" | "member" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "cancelled";

export type Invitation = {
  id: string;
  workspace_id: string;
  invited_email: string;
  invited_by: string;
  token: string;
  role: InvitationRole;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  workspace_id: string;
  notify_subscriptions_due: boolean;
  notify_goals_late: boolean;
  notify_budgets_blown: boolean;
  days_before_subscription: number;
  created_at: string;
  updated_at: string;
};

export type SettingsOverview = {
  profile: Profile | null;
  workspace: {
    id: string;
    name: string;
    currency: string;
    role: WorkspaceRole;
  } | null;
  members: WorkspaceMember[];
  invitations: Invitation[];
  canAdmin: boolean;
  canDeleteWorkspace: boolean;
  notificationPreferences: NotificationPreferences | null;
};

export type Category = {
  id: string;
  workspace_id: string;
  name: string;
  type: CategoryType;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  transaction_date: string;
  competence_month: string | null;
  payment_method: PaymentMethod | null;
  status: TransactionStatus;
  notes: string | null;
  tags: string[];
  is_recurring: boolean;
  recurring_rule_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
  transfer_peer_name: string | null;
};

export type TransactionFormOptions = {
  accounts: Account[];
  categories: Category[];
};

export type RecurringRule = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  type: Exclude<TransactionType, "transfer">;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  day_of_month: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
};

export type Budget = {
  id: string;
  workspace_id: string;
  category_id: string;
  month: string;
  planned_amount: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_type: CategoryType;
  category_color: string | null;
  actual_amount: number;
  remaining_amount: number;
  progress: number;
  status: BudgetStatus;
};

export type BudgetFormOptions = {
  categories: Category[];
};

export type Subscription = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  category_id: string | null;
  name: string;
  amount: number;
  billing_cycle: BillingCycle;
  billing_day: number | null;
  next_billing_date: string | null;
  status: SubscriptionStatus;
  importance: SubscriptionImportance | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
};

export type SubscriptionFormOptions = {
  accounts: Account[];
  categories: Category[];
};

export type SubscriptionSummary = {
  monthlyTotal: number;
  annualTotal: number;
  activeCount: number;
  dispensableCount: number;
  dispensableMonthlyTotal: number;
  upcomingCount: number;
  upcoming: Subscription[];
};

export type Goal = {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  monthly_contribution: number | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  progress: number;
  remaining_amount: number;
  months_remaining: number | null;
  required_monthly_contribution: number | null;
  deadline_status: GoalDeadlineStatus;
};

export type GoalSummary = {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  activeCount: number;
  completedCount: number;
  nextDeadlineGoalName: string | null;
  nextDeadline: string | null;
};

export type BudgetSummary = {
  planned: number;
  actual: number;
  remaining: number;
  exceededCount: number;
};

export type ImportRecord = {
  id: string;
  workspace_id: string;
  file_name: string | null;
  source: string | null;
  status: ImportStatus;
  total_rows: number | null;
  processed_rows: number | null;
  created_by: string | null;
  created_at: string;
};

export type ImportFormOptions = {
  accounts: Account[];
  categories: Category[];
};

export type ImportDefaultType = ManualTransactionType | "auto";

export type ImportMapping = {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  typeColumn?: string;
  categoryColumn?: string;
  accountColumn?: string;
  defaultAccountId: string;
  defaultType: ImportDefaultType;
  defaultCategoryByType: Partial<Record<ManualTransactionType, string>>;
};

export type ImportRawRow = Record<string, string | number | null | undefined>;

export type ImportPreviewRow = {
  rowNumber: number;
  raw: ImportRawRow;
  transactionDate: string | null;
  description: string | null;
  amount: number | null;
  type: ManualTransactionType | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
};

export type ImportPreviewResult = {
  ok: boolean;
  message?: string;
  rows: ImportPreviewRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type ImportCommitInput = {
  fileName: string;
  rows: ImportRawRow[];
  mapping: ImportMapping;
  selectedRowNumbers: number[];
};

export type ImportResult = ActionResult & {
  importId?: string;
  processedRows?: number;
  failedRows?: number;
};

export type BudgetProjection = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  planned: number;
  actual: number;
  projected: number;
  projectedProgress: number;
  willExceed: boolean;
};

export type SavingsRateTrend = {
  current: number;
  threeMonthAvg: number;
  trend: "up" | "down" | "stable";
};

export type FinancialInsight = {
  type: "budget_projection" | "savings_trend" | "subscription" | "goal" | "spending";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  href?: string;
};

export type DashboardSummary = {
  income: number;
  expenses: number;
  investments: number;
  balance: number;
  savingsRate: number;
  projectedExpenses: number;
  dailyAverageExpense: number;
  expectedDailyBudget: number | null;
  paidTransactionsCount: number;
  pendingTransactionsCount: number;
  scheduledTransactionsCount: number;
  topCategoryName: string | null;
  topCategoryAmount: number;
  budgetExceededCount: number;
  budgetRiskCategoryName: string | null;
  budgetRiskProgress: number;
  subscriptionMonthlyTotal: number;
  subscriptionUpcomingCount: number;
  goalActiveCount: number;
  goalRemainingAmount: number;
  goalNextDeadlineName: string | null;
  recentTransactions: Transaction[];
  topTransactions: Transaction[];
  monthlySeries: {
    month: string;
    label: string;
    income: number;
    expenses: number;
    investments: number;
    balance: number;
  }[];
  dailyExpenseSeries: {
    date: string;
    day: number;
    amount: number;
    cumulative: number;
  }[];
  categoryBreakdown: {
    categoryId: string | null;
    categoryName: string;
    color: string | null;
    amount: number;
  }[];
  fixedVariableBreakdown: {
    name: "Fixo" | "Variável";
    amount: number;
  }[];
  alerts: {
    type: "budget" | "subscription" | "spending" | "goal";
    title: string;
    description: string;
    severity: "info" | "warning" | "critical";
    href?: string;
  }[];
  budgetProjections: BudgetProjection[];
  savingsRateTrend: SavingsRateTrend | null;
  insights: FinancialInsight[];
  dispensableSubscriptionTotal: number;
};

export type MonthlyComparison = {
  key:
    | "income"
    | "expenses"
    | "investments"
    | "balance"
    | "savingsRate"
    | "dailyAverageExpense";
  label: string;
  current: number;
  previous: number;
  absoluteChange: number;
  percentChange: number | null;
  format: "currency" | "percent";
};

export type CategoryVariation = {
  categoryId: string | null;
  categoryName: string;
  color: string | null;
  currentAmount: number;
  previousAmount: number;
  absoluteChange: number;
  percentChange: number | null;
};

export type ReportTransactionRow = Transaction;

export type MonthlyReport = {
  month: string;
  previousMonth: string;
  current: DashboardSummary;
  previous: DashboardSummary;
  comparisons: MonthlyComparison[];
  categoryVariations: CategoryVariation[];
  topExpenses: ReportTransactionRow[];
  topIncome: ReportTransactionRow[];
  balanceEvolution: DashboardSummary["monthlySeries"];
  subscriptionAnalysis: SubscriptionSummary;
  exportUrl: string;
};

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
