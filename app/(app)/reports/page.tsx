import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import {
  CategoryVariationChart,
  ReportBalanceChart
} from "@/components/reports/report-charts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import {
  formatReportMonth,
  getMonthlyReport
} from "@/lib/queries/reports";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type {
  MonthlyComparison,
  ReportTransactionRow
} from "@/types/finance";

type ReportsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Novo";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function comparisonValue(comparison: MonthlyComparison, currency: string) {
  if (comparison.format === "percent") {
    return formatPercent(comparison.current);
  }

  return formatCurrency(comparison.current, currency);
}

function changeTone(value: number) {
  if (value > 0) {
    return "text-destructive";
  }

  if (value < 0) {
    return "text-primary";
  }

  return "text-muted-foreground";
}

function TransactionList({
  title,
  transactions,
  currency,
  tone
}: {
  title: string;
  transactions: ReportTransactionRow[];
  currency: string;
  tone: "income" | "expense";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length ? (
          <div className="divide-y rounded-md border">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-3 p-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {transaction.description}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateBR(transaction.transaction_date)} ·{" "}
                    {transaction.category_name ?? "Sem categoria"} ·{" "}
                    {transaction.account_name ?? "Sem conta"}
                  </p>
                </div>
                <span
                  className={
                    tone === "income"
                      ? "font-medium text-primary"
                      : "font-medium text-destructive"
                  }
                >
                  {formatCurrency(transaction.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/35 text-center">
            <ReceiptText className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Sem dados no mês</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              A lista aparece quando houver transações pagas compatíveis.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const [workspace, report] = await Promise.all([
    getCurrentWorkspace(),
    getMonthlyReport(params?.month)
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  const currentMonthLabel = formatReportMonth(report.month);
  const previousMonthLabel = formatReportMonth(report.previousMonth);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Comparativo de ${currentMonthLabel} contra ${previousMonthLabel}.`}
      >
        <Button asChild>
          <Link href={report.exportUrl as Route}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Renda"
          value={formatCurrency(report.current.income, workspace.currency)}
          icon={TrendingUp}
          tone="income"
          description="Receitas pagas no mês"
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(report.current.expenses, workspace.currency)}
          icon={TrendingDown}
          tone="expense"
          description="Despesas pagas no mês"
        />
        <MetricCard
          title="Saldo"
          value={formatCurrency(report.current.balance, workspace.currency)}
          icon={BarChart3}
          tone={report.current.balance >= 0 ? "income" : "expense"}
          description="Receitas menos saídas"
        />
        <MetricCard
          title="Taxa de poupança"
          value={formatPercent(report.current.savingsRate)}
          icon={PiggyBank}
          tone="investment"
          description="Investimentos + saldo positivo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Mês atual vs anterior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.comparisons.map((comparison) => (
              <div
                key={comparison.key}
                className="grid gap-3 rounded-md border bg-muted/25 p-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{comparison.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Anterior:{" "}
                    {comparison.format === "percent"
                      ? formatPercent(comparison.previous)
                      : formatCurrency(comparison.previous, workspace.currency)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {comparisonValue(comparison, workspace.currency)}
                </span>
                <Badge variant="secondary" className={changeTone(comparison.absoluteChange)}>
                  {comparison.absoluteChange > 0 ? (
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                  ) : comparison.absoluteChange < 0 ? (
                    <ArrowDownRight className="mr-1 h-3.5 w-3.5" />
                  ) : null}
                  {formatPercent(comparison.percentChange)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <ReportBalanceChart
          data={report.balanceEvolution}
          currency={workspace.currency}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <CategoryVariationChart
          data={report.categoryVariations}
          currency={workspace.currency}
        />
        <Card>
          <CardHeader>
            <CardTitle>Variação por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {report.categoryVariations.length ? (
              <div className="divide-y rounded-md border">
                {report.categoryVariations.slice(0, 8).map((category) => (
                  <div
                    key={category.categoryId ?? category.categoryName}
                    className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              category.color ?? "hsl(var(--primary))"
                          }}
                        />
                        <p className="truncate font-medium">
                          {category.categoryName}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Atual:{" "}
                        {formatCurrency(category.currentAmount, workspace.currency)} ·
                        Anterior:{" "}
                        {formatCurrency(category.previousAmount, workspace.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={changeTone(category.absoluteChange)}>
                        {formatCurrency(category.absoluteChange, workspace.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(category.percentChange)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed bg-muted/35 text-center">
                <p className="text-sm font-medium">Sem categorias para comparar</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Cadastre despesas pagas para ver variações por categoria.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TransactionList
          title="Maiores gastos"
          transactions={report.topExpenses}
          currency={workspace.currency}
          tone="expense"
        />
        <TransactionList
          title="Maiores receitas"
          transactions={report.topIncome}
          currency={workspace.currency}
          tone="income"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análise de assinaturas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Mensal ativo</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(
                report.subscriptionAnalysis.monthlyTotal,
                workspace.currency
              )}
            </p>
          </div>
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Anualizado</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(
                report.subscriptionAnalysis.annualTotal,
                workspace.currency
              )}
            </p>
          </div>
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="mt-1 text-lg font-semibold">
              {report.subscriptionAnalysis.activeCount}
            </p>
          </div>
          <div className="rounded-md border bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">Próximas em 7 dias</p>
            <p className="mt-1 text-lg font-semibold">
              {report.subscriptionAnalysis.upcomingCount}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
