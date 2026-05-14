import type {
  AccountType,
  BillingCycle,
  CategoryType,
  GoalDeadlineStatus,
  GoalStatus,
  ImportStatus,
  PaymentMethod,
  RecurringFrequency,
  SubscriptionImportance,
  SubscriptionStatus,
  TransactionStatus
} from "@/types/finance";

export const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  credit_card: "Cartão de crédito",
  cash: "Dinheiro",
  investment: "Investimento",
  other: "Outro"
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: "Receita",
  expense: "Despesa",
  investment: "Investimento",
  transfer: "Transferência"
};

export const transactionTypeLabels: Record<CategoryType, string> = {
  income: "Receita",
  expense: "Despesa",
  investment: "Investimento",
  transfer: "Transferência"
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  scheduled: "Agendado",
  cancelled: "Cancelado"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  bank_slip: "Boleto",
  transfer: "Transferência",
  other: "Outro"
};

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual"
};

export const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual"
};

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada"
};

export const subscriptionImportanceLabels: Record<
  SubscriptionImportance,
  string
> = {
  essential: "Essencial",
  useful: "Útil",
  dispensable: "Dispensável"
};

export const goalStatusLabels: Record<GoalStatus, string> = {
  active: "Ativa",
  completed: "Concluída",
  paused: "Pausada",
  cancelled: "Cancelada"
};

export const goalDeadlineStatusLabels: Record<GoalDeadlineStatus, string> = {
  no_deadline: "Sem prazo",
  on_track: "Em dia",
  due_soon: "Atenção",
  overdue: "Vencida",
  completed: "Concluída"
};

export const importStatusLabels: Record<ImportStatus, string> = {
  uploaded: "Enviado",
  mapped: "Mapeado",
  processed: "Processado",
  failed: "Falhou"
};

export const defaultCategoryColorByType: Record<CategoryType, string> = {
  income: "#078669",
  expense: "#B42318",
  investment: "#2563EB",
  transfer: "#64748B"
};

export const categoryIconOptions = [
  "badge-dollar-sign",
  "briefcase-business",
  "car",
  "circle-dollar-sign",
  "coins",
  "gamepad-2",
  "graduation-cap",
  "heart-pulse",
  "home",
  "landmark",
  "laptop",
  "line-chart",
  "piggy-bank",
  "plane",
  "receipt",
  "repeat",
  "shield-check",
  "shopping-bag",
  "trending-up",
  "utensils"
] as const;

export const defaultCategories = [
  { name: "Salário", type: "income", color: "#078669", icon: "briefcase-business" },
  { name: "Freelance", type: "income", color: "#0E7490", icon: "laptop" },
  { name: "Reembolso", type: "income", color: "#2563EB", icon: "receipt" },
  { name: "Rendimentos", type: "income", color: "#4F46E5", icon: "trending-up" },
  { name: "Outros", type: "income", color: "#64748B", icon: "circle-dollar-sign" },
  { name: "Moradia", type: "expense", color: "#B42318", icon: "home" },
  { name: "Alimentação", type: "expense", color: "#C2410C", icon: "utensils" },
  { name: "Transporte", type: "expense", color: "#B45309", icon: "car" },
  { name: "Saúde", type: "expense", color: "#BE123C", icon: "heart-pulse" },
  { name: "Educação", type: "expense", color: "#7C3AED", icon: "graduation-cap" },
  { name: "Lazer", type: "expense", color: "#DB2777", icon: "gamepad-2" },
  { name: "Assinaturas", type: "expense", color: "#9333EA", icon: "repeat" },
  { name: "Compras", type: "expense", color: "#EA580C", icon: "shopping-bag" },
  { name: "Viagem", type: "expense", color: "#0891B2", icon: "plane" },
  { name: "Impostos", type: "expense", color: "#475569", icon: "landmark" },
  { name: "Outros", type: "expense", color: "#64748B", icon: "circle-dollar-sign" },
  { name: "Renda fixa", type: "investment", color: "#2563EB", icon: "badge-dollar-sign" },
  { name: "Renda variável", type: "investment", color: "#4F46E5", icon: "line-chart" },
  { name: "Cripto", type: "investment", color: "#B45309", icon: "coins" },
  { name: "Previdência", type: "investment", color: "#0F766E", icon: "shield-check" },
  { name: "Outros", type: "investment", color: "#64748B", icon: "piggy-bank" }
] satisfies {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}[];
