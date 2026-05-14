import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Info,
  Minus
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters/currency";
import type { DashboardSummary } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InsightsPanelProps = {
  summary: DashboardSummary;
  currency: string;
};

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle
};

const severityClass = {
  info: "text-muted-foreground",
  warning: "text-yellow-600 dark:text-yellow-400",
  critical: "text-destructive"
};

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function InsightsPanel({ summary, currency }: InsightsPanelProps) {
  const { savingsRateTrend, budgetProjections, insights } = summary;
  const atRiskProjections = budgetProjections.filter((bp) => bp.willExceed);
  const hasContent =
    savingsRateTrend !== null || atRiskProjections.length > 0 || insights.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Diagnóstico do mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savingsRateTrend !== null && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Taxa de poupança</span>
            <div className="flex items-center gap-1.5">
              {savingsRateTrend.trend === "up" && (
                <ArrowUpRight className="h-4 w-4 text-finance-income" />
              )}
              {savingsRateTrend.trend === "down" && (
                <ArrowDownRight className="h-4 w-4 text-finance-expense" />
              )}
              {savingsRateTrend.trend === "stable" && (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {formatPercent(savingsRateTrend.current)}
              </span>
              <span className="text-xs text-muted-foreground">
                (média: {formatPercent(savingsRateTrend.threeMonthAvg)})
              </span>
            </div>
          </div>
        )}

        {atRiskProjections.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Projeções de orçamento
            </p>
            {atRiskProjections.slice(0, 3).map((bp) => (
              <div key={bp.categoryId ?? bp.categoryName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate">{bp.categoryName}</span>
                  <span
                    className={
                      bp.projectedProgress > 1.3
                        ? "text-destructive font-medium"
                        : "text-yellow-600 dark:text-yellow-400 font-medium"
                    }
                  >
                    {formatPercent(bp.projectedProgress)} projetado
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      bp.projectedProgress > 1.3
                        ? "h-full rounded-full bg-destructive"
                        : "h-full rounded-full bg-yellow-500"
                    }
                    style={{ width: `${Math.min(bp.projectedProgress * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(bp.actual, currency)} atual</span>
                  <span>{formatCurrency(bp.planned, currency)} planejado</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, index) => {
              const Icon = severityIcon[insight.severity];
              const content = (
                <div className="flex items-start gap-2">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${severityClass[insight.severity]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{insight.title}</span>
                      {insight.href && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                </div>
              );

              return insight.href ? (
                <Link
                  key={index}
                  href={insight.href as Route}
                  className="block rounded-md p-2 hover:bg-muted/50 transition-colors"
                >
                  {content}
                </Link>
              ) : (
                <div key={index} className="rounded-md p-2">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
