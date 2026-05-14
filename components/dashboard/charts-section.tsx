import Link from "next/link";
import type { Route } from "next";
import {
  BalanceTrendChart,
  CategoryBreakdownChart,
  DailyExpenseChart,
  FixedVariableChart,
  MonthlySeriesChart,
  TopCategoriesChart
} from "@/components/dashboard/dashboard-charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import type { DashboardSummary, Transaction } from "@/types/finance";

function alertVariant(severity: DashboardSummary["alerts"][number]["severity"]) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  if (severity === "warning") {
    return "outline" as const;
  }

  return "secondary" as const;
}

function signedTransactionAmount(transaction: Transaction) {
  if (transaction.type === "income") {
    return transaction.amount;
  }

  if (transaction.type === "expense" || transaction.type === "investment") {
    return -transaction.amount;
  }

  return 0;
}

function AlertPanel({ alerts }: { alerts: DashboardSummary["alerts"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas financeiros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const content = (
            <div className="rounded-md border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <Badge variant={alertVariant(alert.severity)}>
                  {alert.severity === "critical"
                    ? "Crítico"
                    : alert.severity === "warning"
                      ? "Atenção"
                      : "Info"}
                </Badge>
              </div>
            </div>
          );

          return alert.href ? (
            <Link key={`${alert.type}-${alert.title}`} href={alert.href as Route}>
              {content}
            </Link>
          ) : (
            <div key={`${alert.type}-${alert.title}`}>{content}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TopTransactions({
  transactions,
  currency
}: {
  transactions: Transaction[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top transações do mês</CardTitle>
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
                <span className="font-medium text-destructive">
                  {formatCurrency(signedTransactionAmount(transaction), currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/35 text-center">
            <p className="text-sm font-medium">Sem transações pagas</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              As maiores saídas aparecem aqui quando o mês tiver despesas ou
              investimentos pagos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ChartsSectionProps = {
  summaryPromise: Promise<DashboardSummary>;
  currency: string;
};

export async function ChartsSection({ summaryPromise, currency }: ChartsSectionProps) {
  const summary = await summaryPromise;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <MonthlySeriesChart
          data={summary.monthlySeries}
          currency={currency}
        />
        <AlertPanel alerts={summary.alerts} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DailyExpenseChart
          data={summary.dailyExpenseSeries}
          projectedExpenses={summary.projectedExpenses}
          currency={currency}
        />
        <CategoryBreakdownChart
          data={summary.categoryBreakdown}
          currency={currency}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TopCategoriesChart
          data={summary.categoryBreakdown}
          currency={currency}
        />
        <FixedVariableChart
          data={summary.fixedVariableBreakdown}
          currency={currency}
        />
        <BalanceTrendChart
          data={summary.monthlySeries}
          currency={currency}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <TopTransactions
          transactions={summary.topTransactions}
          currency={currency}
        />
        <Card>
          <CardHeader>
            <CardTitle>Próximas ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Revise despesas projetadas antes do fechamento do mês.</p>
            <p>Abra orçamentos em risco antes que passem do planejado.</p>
            <p>Acompanhe assinaturas próximas e metas com prazo curto.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/budgets">Ver orçamentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
