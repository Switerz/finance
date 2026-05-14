"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import type { DashboardSummary } from "@/types/finance";

type CurrencyTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: {
    name?: string | number;
    value?: unknown;
    color?: string;
  }[];
  currency: string;
};

type ChartEmptyProps = {
  title: string;
  description: string;
};

const chartColors = {
  income: "hsl(var(--primary))",
  expense: "#B42318",
  investment: "#2563EB",
  warning: "#B54708",
  muted: "hsl(var(--muted-foreground))"
};

function CurrencyTooltip({
  active,
  label,
  payload,
  currency
}: CurrencyTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium text-popover-foreground">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            key={String(item.name)}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium text-popover-foreground">
              {formatCurrency(Number(item.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartEmpty({ title, description }: ChartEmptyProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/35 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function hasAnyValue<T extends Record<string, unknown>>(
  data: T[],
  keys: (keyof T)[]
) {
  return data.some((item) =>
    keys.some((key) => Number(item[key] ?? 0) > 0)
  );
}

export function MonthlySeriesChart({
  data,
  currency
}: {
  data: DashboardSummary["monthlySeries"];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receitas vs despesas</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyValue(data, ["income", "expenses", "investments"]) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
                    <CurrencyTooltip {...props} currency={currency} />
                  )}
                />
                <Bar
                  dataKey="income"
                  name="Receitas"
                  fill={chartColors.income}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Despesas"
                  fill={chartColors.expense}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="investments"
                  name="Investimentos"
                  fill={chartColors.investment}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty
            title="Sem histórico suficiente"
            description="Receitas, despesas e investimentos pagos aparecem aqui ao longo dos meses."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function DailyExpenseChart({
  data,
  projectedExpenses,
  currency
}: {
  data: DashboardSummary["dailyExpenseSeries"];
  projectedExpenses: number;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução diária de gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyValue(data, ["cumulative"]) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
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
                    <CurrencyTooltip {...props} currency={currency} />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Acumulado"
                  stroke={chartColors.expense}
                  fill={chartColors.expense}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty
            title="Sem despesas pagas"
            description="A curva diária aparece quando houver gastos pagos no mês selecionado."
          />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Projeção de fechamento: {formatCurrency(projectedExpenses, currency)}.
        </p>
      </CardContent>
    </Card>
  );
}

export function CategoryBreakdownChart({
  data,
  currency
}: {
  data: DashboardSummary["categoryBreakdown"];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="categoryName"
                    innerRadius={54}
                    outerRadius={86}
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={entry.categoryId ?? index}
                        fill={entry.color ?? chartColors.income}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => (
                      <CurrencyTooltip {...props} currency={currency} />
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {data.map((category) => (
                <div
                  key={category.categoryId ?? category.categoryName}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? chartColors.income }}
                    />
                    <span className="truncate font-medium">
                      {category.categoryName}
                    </span>
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {formatCurrency(category.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ChartEmpty
            title="Sem categorias no mês"
            description="Despesas pagas agrupadas por categoria aparecem aqui."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function TopCategoriesChart({
  data,
  currency
}: {
  data: DashboardSummary["categoryBreakdown"];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top categorias</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <CurrencyTooltip {...props} currency={currency} />
                  )}
                />
                <Bar dataKey="amount" name="Gasto" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.categoryId ?? index}
                      fill={entry.color ?? chartColors.income}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty
            title="Sem ranking"
            description="O ranking aparece quando houver despesas pagas no mês."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function FixedVariableChart({
  data,
  currency
}: {
  data: DashboardSummary["fixedVariableBreakdown"];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixos vs variáveis</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  <Cell fill={chartColors.income} />
                  <Cell fill={chartColors.warning} />
                </Pie>
                <Tooltip
                  content={(props) => (
                    <CurrencyTooltip {...props} currency={currency} />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty
            title="Sem despesas pagas"
            description="A separação entre gastos fixos e variáveis aparece com lançamentos pagos."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function BalanceTrendChart({
  data,
  currency
}: {
  data: DashboardSummary["monthlySeries"];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de saldo</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyValue(data, ["income", "expenses", "investments"]) ? (
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
                    <CurrencyTooltip {...props} currency={currency} />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke={chartColors.income}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty
            title="Sem evolução"
            description="O saldo mensal aparece quando houver histórico financeiro."
          />
        )}
      </CardContent>
    </Card>
  );
}
