"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  copyPreviousMonthBudgets,
  deleteBudget
} from "@/lib/actions/budgets";
import { categoryTypeLabels } from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import type {
  Budget,
  BudgetFormOptions,
  BudgetStatus,
  CategoryType
} from "@/types/finance";
import { BudgetForm } from "@/components/forms/budget-form";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

type BudgetsClientProps = {
  budgets: Budget[];
  options: BudgetFormOptions;
  canWrite: boolean;
  currency: string;
  month: string;
};

const budgetStatusLabels: Record<BudgetStatus, string> = {
  healthy: "Saudável",
  attention: "Atenção",
  critical: "Crítico",
  exceeded: "Estourado"
};

const budgetStatusOrder: BudgetStatus[] = [
  "healthy",
  "attention",
  "critical",
  "exceeded"
];

function statusVariant(status: BudgetStatus) {
  if (status === "exceeded") {
    return "destructive" as const;
  }

  if (status === "critical") {
    return "default" as const;
  }

  if (status === "attention") {
    return "outline" as const;
  }

  return "secondary" as const;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function BudgetsClient({
  budgets,
  options,
  canWrite,
  currency,
  month
}: BudgetsClientProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const filteredBudgets = budgets.filter(
    (budget) =>
      (typeFilter === "all" || budget.category_type === typeFilter) &&
      (statusFilter === "all" || budget.status === statusFilter)
  );
  const summary = budgets.reduce(
    (current, budget) => ({
      planned: current.planned + budget.planned_amount,
      actual: current.actual + budget.actual_amount,
      remaining: current.remaining + budget.remaining_amount,
      exceededCount:
        current.exceededCount + (budget.status === "exceeded" ? 1 : 0)
    }),
    { planned: 0, actual: 0, remaining: 0, exceededCount: 0 }
  );
  const canCreate = canWrite && options.categories.length > 0;

  function openCreateSheet() {
    setEditingBudget(null);
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setIsSheetOpen(false);
    setEditingBudget(null);
    router.refresh();
  }

  async function handleCopyPreviousMonth() {
    const result = await copyPreviousMonthBudgets({ month });

    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível copiar orçamentos.");
      return;
    }

    toast.success(result.message ?? "Orçamentos copiados.");
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        accessorKey: "category_name",
        header: "Categoria",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full border"
              style={{ backgroundColor: row.original.category_color ?? "#64748B" }}
            />
            <div className="min-w-0">
              <p className="truncate font-medium">
                {row.original.category_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {categoryTypeLabels[row.original.category_type]}
              </p>
            </div>
          </div>
        )
      },
      {
        accessorKey: "planned_amount",
        header: "Planejado",
        cell: ({ row }) => formatCurrency(row.original.planned_amount, currency)
      },
      {
        accessorKey: "actual_amount",
        header: "Realizado",
        cell: ({ row }) => formatCurrency(row.original.actual_amount, currency)
      },
      {
        accessorKey: "remaining_amount",
        header: "Restante",
        cell: ({ row }) => (
          <span
            className={
              row.original.remaining_amount < 0
                ? "font-medium text-destructive"
                : "font-medium"
            }
          >
            {formatCurrency(row.original.remaining_amount, currency)}
          </span>
        )
      },
      {
        accessorKey: "progress",
        header: "Progresso",
        cell: ({ row }) => (
          <div className="min-w-36 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatPercent(row.original.progress)}</span>
              <span>Alerta {formatPercent(row.original.alert_threshold)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={
                  row.original.status === "exceeded"
                    ? "h-2 rounded-full bg-destructive"
                    : row.original.status === "critical"
                      ? "h-2 rounded-full bg-primary"
                      : "h-2 rounded-full bg-primary/70"
                }
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(4, row.original.progress * 100)
                  )}%`
                }}
              />
            </div>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {budgetStatusLabels[row.original.status]}
          </Badge>
        )
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const budget = row.original;

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => {
                  setEditingBudget(budget);
                  setIsSheetOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <ConfirmDialog
                title="Remover orçamento?"
                description="Apenas o plano do mês será removido. As transações permanecem intactas."
                confirmLabel="Remover"
                variant="destructive"
                onConfirm={async () => {
                  const result = await deleteBudget(budget.id);

                  if (!result.ok) {
                    toast.error(
                      result.message ??
                        "Não foi possível remover o orçamento."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Orçamento removido.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canWrite}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remover
                  </Button>
                }
              />
            </div>
          );
        }
      }
    ],
    [canWrite, currency, router]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Planejamento mensal por categoria com realizado e saldo restante."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleCopyPreviousMonth}
            disabled={!canWrite}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar mês anterior
          </Button>
          <Button onClick={openCreateSheet} disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo orçamento
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Planejado"
          value={formatCurrency(summary.planned, currency)}
          icon={Gauge}
        />
        <MetricCard
          title="Realizado"
          value={formatCurrency(summary.actual, currency)}
          icon={Gauge}
          tone="expense"
        />
        <MetricCard
          title="Restante"
          value={formatCurrency(summary.remaining, currency)}
          icon={Gauge}
          tone={summary.remaining < 0 ? "expense" : "income"}
        />
        <MetricCard
          title="Estourados"
          value={String(summary.exceededCount)}
          icon={Gauge}
          tone={summary.exceededCount > 0 ? "expense" : "income"}
        />
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(["expense", "investment"] as CategoryType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {categoryTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {budgetStatusOrder.map((status) => (
              <SelectItem key={status} value={status}>
                {budgetStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {budgets.length ? (
        <DataTable
          columns={columns}
          data={filteredBudgets}
          emptyTitle="Nenhum orçamento encontrado"
          emptyDescription="Ajuste os filtros para ver outros orçamentos do mês."
        />
      ) : (
        <EmptyState
          icon={Gauge}
          title="Nenhum orçamento definido"
          description="Defina valores planejados por categoria para comparar planejado, realizado e saldo restante."
          action={
            canWrite ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleCopyPreviousMonth} variant="outline">
                  Copiar mês anterior
                </Button>
                <Button onClick={openCreateSheet} disabled={!canCreate}>
                  Criar orçamento
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingBudget ? "Editar orçamento" : "Novo orçamento"}
            </SheetTitle>
            <SheetDescription>
              O realizado considera apenas transações pagas do mês selecionado.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BudgetForm
              mode={editingBudget ? "edit" : "create"}
              month={month}
              options={options}
              initialData={editingBudget ?? undefined}
              onSuccess={handleSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
