"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Goal as GoalIcon,
  Pencil,
  Plus,
  Target,
  Trophy
} from "lucide-react";
import { toast } from "sonner";
import { cancelGoal, completeGoal } from "@/lib/actions/goals";
import {
  goalDeadlineStatusLabels,
  goalStatusLabels
} from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import type { Goal, GoalDeadlineStatus, GoalStatus, GoalSummary } from "@/types/finance";
import { GoalForm } from "@/components/forms/goal-form";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type GoalsClientProps = {
  goals: Goal[];
  summary: GoalSummary;
  canWrite: boolean;
  currency: string;
};

const statusOptions = Object.entries(goalStatusLabels) as [
  GoalStatus,
  string
][];

function statusVariant(status: GoalStatus) {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  if (status === "completed") {
    return "default" as const;
  }

  if (status === "paused") {
    return "outline" as const;
  }

  return "secondary" as const;
}

function deadlineVariant(status: GoalDeadlineStatus) {
  if (status === "overdue") {
    return "destructive" as const;
  }

  if (status === "due_soon") {
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

function formatMonths(value: number | null) {
  if (value === null) {
    return "Sem prazo";
  }

  if (value === 0) {
    return "Vencida";
  }

  return value === 1 ? "1 mês" : `${value} meses`;
}

export function GoalsClient({
  goals,
  summary,
  canWrite,
  currency
}: GoalsClientProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGoals = goals.filter(
    (goal) =>
      (statusFilter === "all" || goal.status === statusFilter) &&
      (!normalizedSearch ||
        goal.name.toLowerCase().includes(normalizedSearch))
  );

  function openCreateSheet() {
    setEditingGoal(null);
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setIsSheetOpen(false);
    setEditingGoal(null);
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<Goal>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Meta",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.deadline
                ? `Prazo em ${formatDateBR(row.original.deadline)}`
                : "Sem prazo definido"}
            </p>
          </div>
        )
      },
      {
        accessorKey: "target_amount",
        header: "Alvo",
        cell: ({ row }) => formatCurrency(row.original.target_amount, currency)
      },
      {
        accessorKey: "current_amount",
        header: "Atual",
        cell: ({ row }) => formatCurrency(row.original.current_amount, currency)
      },
      {
        accessorKey: "remaining_amount",
        header: "Restante",
        cell: ({ row }) => formatCurrency(row.original.remaining_amount, currency)
      },
      {
        accessorKey: "progress",
        header: "Progresso",
        cell: ({ row }) => (
          <div className="min-w-36 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatPercent(row.original.progress)}</span>
              <span>{formatMonths(row.original.months_remaining)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
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
        accessorKey: "required_monthly_contribution",
        header: "Necessário/mês",
        cell: ({ row }) =>
          row.original.required_monthly_contribution
            ? formatCurrency(
                row.original.required_monthly_contribution,
                currency
              )
            : "Sem prazo"
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1.5">
            <Badge variant={statusVariant(row.original.status)}>
              {goalStatusLabels[row.original.status]}
            </Badge>
            <Badge variant={deadlineVariant(row.original.deadline_status)}>
              {goalDeadlineStatusLabels[row.original.deadline_status]}
            </Badge>
          </div>
        )
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const goal = row.original;
          const canComplete =
            canWrite &&
            goal.status !== "completed" &&
            goal.status !== "cancelled";
          const canCancel =
            canWrite &&
            goal.status !== "completed" &&
            goal.status !== "cancelled";

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => {
                  setEditingGoal(goal);
                  setIsSheetOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <ConfirmDialog
                title="Concluir meta?"
                description="A meta será marcada como concluída e o valor atual será igualado ao alvo."
                confirmLabel="Concluir"
                onConfirm={async () => {
                  const result = await completeGoal(goal.id);

                  if (!result.ok) {
                    toast.error(result.message ?? "Não foi possível concluir.");
                    return;
                  }

                  toast.success(result.message ?? "Meta concluída.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canComplete}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Concluir
                  </Button>
                }
              />
              <ConfirmDialog
                title="Cancelar meta?"
                description="A meta ficará no histórico, mas sairá dos totais ativos."
                confirmLabel="Cancelar meta"
                variant="destructive"
                onConfirm={async () => {
                  const result = await cancelGoal(goal.id);

                  if (!result.ok) {
                    toast.error(result.message ?? "Não foi possível cancelar.");
                    return;
                  }

                  toast.success(result.message ?? "Meta cancelada.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canCancel}
                  >
                    <Ban className="mr-1 h-4 w-4" />
                    Cancelar
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
        title="Metas"
        description="Objetivos financeiros com progresso, prazo e contribuição necessária."
      >
        <Button onClick={openCreateSheet} disabled={!canWrite}>
          <Plus className="mr-2 h-4 w-4" />
          Nova meta
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Alvo ativo"
          value={formatCurrency(summary.targetAmount, currency)}
          icon={Target}
        />
        <MetricCard
          title="Atual"
          value={formatCurrency(summary.currentAmount, currency)}
          icon={Trophy}
          tone="income"
        />
        <MetricCard
          title="Restante"
          value={formatCurrency(summary.remainingAmount, currency)}
          icon={GoalIcon}
          tone={summary.remainingAmount > 0 ? "investment" : "income"}
        />
        <MetricCard
          title="Metas ativas"
          value={String(summary.activeCount)}
          icon={CalendarClock}
          description={
            summary.completedCount
              ? `${summary.completedCount} concluída(s)`
              : "Nenhuma concluída"
          }
        />
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar meta"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {goals.length ? (
        <DataTable
          columns={columns}
          data={filteredGoals}
          emptyTitle="Nenhuma meta encontrada"
          emptyDescription="Ajuste os filtros para ver outras metas financeiras."
        />
      ) : (
        <EmptyState
          icon={GoalIcon}
          title="Nenhuma meta financeira"
          description="Crie metas para acompanhar alvo, progresso, prazo e contribuição mensal necessária."
          action={
            canWrite ? (
              <Button onClick={openCreateSheet}>Criar meta</Button>
            ) : undefined
          }
        />
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingGoal ? "Editar meta" : "Nova meta"}</SheetTitle>
            <SheetDescription>
              O progresso é atualizado manualmente nesta versão.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <GoalForm
              mode={editingGoal ? "edit" : "create"}
              initialData={editingGoal ?? undefined}
              onSuccess={handleSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
