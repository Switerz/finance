import {
  Activity,
  ArrowDownRight,
  CalendarClock,
  Goal,
  Layers3,
  PiggyBank,
  ReceiptText,
  Target,
  TrendingUp
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { formatCurrency } from "@/lib/formatters/currency";
import type { DashboardSummary } from "@/types/finance";

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

type KpiSectionProps = {
  summaryPromise: Promise<DashboardSummary>;
  currency: string;
};

export async function KpiSection({ summaryPromise, currency }: KpiSectionProps) {
  const summary = await summaryPromise;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Renda do mês"
          value={formatCurrency(summary.income, currency)}
          icon={TrendingUp}
          tone="income"
          description="Receitas pagas"
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(summary.expenses, currency)}
          icon={ReceiptText}
          tone="expense"
          description="Despesas pagas"
        />
        <MetricCard
          title="Saldo"
          value={formatCurrency(summary.balance, currency)}
          icon={Activity}
          tone={summary.balance >= 0 ? "income" : "expense"}
          description="Receitas menos saídas"
        />
        <MetricCard
          title="Taxa de poupança"
          value={formatPercent(summary.savingsRate)}
          icon={PiggyBank}
          tone="investment"
          description="Investimentos + saldo positivo"
        />
        <MetricCard
          title="Projeção"
          value={formatCurrency(summary.projectedExpenses, currency)}
          icon={CalendarClock}
          tone="expense"
          description="Despesas até o fim do mês"
        />
        <MetricCard
          title="Investimentos"
          value={formatCurrency(summary.investments, currency)}
          icon={CalendarClock}
          tone="investment"
          description="Aportes pagos"
        />
        <MetricCard
          title="Assinaturas"
          value={formatCurrency(summary.subscriptionMonthlyTotal, currency)}
          icon={Layers3}
          description="Total mensal ativo"
        />
        <MetricCard
          title="Metas ativas"
          value={String(summary.goalActiveCount)}
          icon={Goal}
          description={summary.goalNextDeadlineName ?? "Sem prazo próximo"}
        />
        <MetricCard
          title="Restante em metas"
          value={formatCurrency(summary.goalRemainingAmount, currency)}
          icon={Target}
          tone={summary.goalRemainingAmount > 0 ? "investment" : "income"}
          description="Objetivos ativos"
        />
        <MetricCard
          title="Maior categoria"
          value={summary.topCategoryName ?? "Sem dados"}
          icon={ArrowDownRight}
          description={
            summary.topCategoryAmount
              ? formatCurrency(summary.topCategoryAmount, currency)
              : "Nenhuma despesa paga"
          }
        />
      </div>

      <InsightsPanel summary={summary} currency={currency} />
    </>
  );
}
