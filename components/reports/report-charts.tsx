"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import type { CategoryVariation, MonthlyReport } from "@/types/finance";

type TooltipPayload = {
  name?: string | number;
  value?: unknown;
};

function ChartTooltip({
  active,
  label,
  payload,
  currency
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
  currency: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={String(item.name)} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium">
              {formatCurrency(Number(item.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/35 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ReportBalanceChart({
  data,
  currency
}: {
  data: MonthlyReport["balanceEvolution"];
  currency: string;
}) {
  const hasData = data.some(
    (item) => item.income > 0 || item.expenses > 0 || item.investments > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução mensal de saldo</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      compactDisplay: "short"
                    }).format(Number(value))
                  }
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip {...props} currency={currency} />
                  )}
                />
                <Line
                  dataKey="balance"
                  name="Saldo"
                  type="monotone"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart
            title="Sem evolução ainda"
            description="A evolução aparece quando houver transações pagas em meses diferentes."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryVariationChart({
  data,
  currency
}: {
  data: CategoryVariation[];
  currency: string;
}) {
  const rows = data.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variação por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip {...props} currency={currency} />
                  )}
                />
                <Bar
                  dataKey="absoluteChange"
                  name="Variação"
                  radius={[0, 4, 4, 0]}
                >
                  {rows.map((entry) => (
                    <Cell
                      key={entry.categoryId ?? entry.categoryName}
                      fill={
                        entry.absoluteChange >= 0
                          ? "#B42318"
                          : "hsl(var(--primary))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart
            title="Sem categorias para comparar"
            description="As variações aparecem quando houver despesas pagas no mês atual ou anterior."
          />
        )}
      </CardContent>
    </Card>
  );
}
