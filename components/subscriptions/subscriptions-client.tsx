"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  Layers3,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteSubscription,
  generateSubscriptionTransaction,
  toggleSubscriptionStatus
} from "@/lib/actions/subscriptions";
import {
  billingCycleLabels,
  subscriptionImportanceLabels,
  subscriptionStatusLabels
} from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import type {
  BillingCycle,
  Subscription,
  SubscriptionFormOptions,
  SubscriptionImportance,
  SubscriptionStatus,
  SubscriptionSummary
} from "@/types/finance";
import { SubscriptionForm } from "@/components/forms/subscription-form";
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

type SubscriptionsClientProps = {
  subscriptions: Subscription[];
  summary: SubscriptionSummary;
  options: SubscriptionFormOptions;
  canWrite: boolean;
  currency: string;
};

const statusOptions = Object.entries(subscriptionStatusLabels) as [
  SubscriptionStatus,
  string
][];

const importanceOptions = Object.entries(subscriptionImportanceLabels) as [
  SubscriptionImportance,
  string
][];

const cycleOptions = Object.entries(billingCycleLabels) as [BillingCycle, string][];

function statusVariant(status: SubscriptionStatus) {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  if (status === "active") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function importanceLabel(importance: SubscriptionImportance | null) {
  return importance ? subscriptionImportanceLabels[importance] : "Não informada";
}

function matchesSearch(subscription: Subscription, search: string) {
  if (!search.trim()) {
    return true;
  }

  const target = [
    subscription.name,
    subscription.account_name,
    subscription.category_name,
    subscription.website,
    subscription.notes
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return target.includes(search.trim().toLowerCase());
}

export function SubscriptionsClient({
  subscriptions,
  summary,
  options,
  canWrite,
  currency
}: SubscriptionsClientProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingSubscription, setEditingSubscription] =
    React.useState<Subscription | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [importanceFilter, setImportanceFilter] = React.useState("all");
  const [cycleFilter, setCycleFilter] = React.useState("all");
  const canCreate =
    canWrite && options.accounts.length > 0 && options.categories.length > 0;
  const filteredSubscriptions = subscriptions.filter(
    (subscription) =>
      matchesSearch(subscription, search) &&
      (statusFilter === "all" || subscription.status === statusFilter) &&
      (importanceFilter === "all" ||
        subscription.importance === importanceFilter) &&
      (cycleFilter === "all" || subscription.billing_cycle === cycleFilter)
  );

  function openCreateSheet() {
    setEditingSubscription(null);
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setEditingSubscription(null);
    setIsSheetOpen(false);
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Assinatura",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.account_name ?? "Sem conta"} ·{" "}
              {row.original.category_name ?? "Sem categoria"}
            </p>
          </div>
        )
      },
      {
        accessorKey: "amount",
        header: "Valor",
        cell: ({ row }) => formatCurrency(row.original.amount, currency)
      },
      {
        accessorKey: "billing_cycle",
        header: "Ciclo",
        cell: ({ row }) => billingCycleLabels[row.original.billing_cycle]
      },
      {
        accessorKey: "next_billing_date",
        header: "Próxima",
        cell: ({ row }) =>
          row.original.next_billing_date
            ? formatDateBR(row.original.next_billing_date)
            : "-"
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {subscriptionStatusLabels[row.original.status]}
          </Badge>
        )
      },
      {
        accessorKey: "importance",
        header: "Essencialidade",
        cell: ({ row }) => importanceLabel(row.original.importance)
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const subscription = row.original;

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite || subscription.status !== "active"}
                onClick={async () => {
                  const result = await generateSubscriptionTransaction(
                    subscription.id
                  );

                  if (!result.ok) {
                    toast.error(
                      result.message ?? "Não foi possível gerar cobrança."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Cobrança gerada.");
                  router.refresh();
                }}
              >
                Gerar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => {
                  setEditingSubscription(subscription);
                  setIsSheetOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              {subscription.status === "active" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canWrite}
                  onClick={async () => {
                    const result = await toggleSubscriptionStatus(
                      subscription.id,
                      "paused"
                    );

                    if (!result.ok) {
                      toast.error(
                        result.message ?? "Não foi possível pausar a assinatura."
                      );
                      return;
                    }

                    toast.success(result.message ?? "Assinatura pausada.");
                    router.refresh();
                  }}
                >
                  Pausar
                </Button>
              ) : subscription.status === "paused" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canWrite}
                  onClick={async () => {
                    const result = await toggleSubscriptionStatus(
                      subscription.id,
                      "active"
                    );

                    if (!result.ok) {
                      toast.error(
                        result.message ??
                          "Não foi possível reativar a assinatura."
                      );
                      return;
                    }

                    toast.success(result.message ?? "Assinatura reativada.");
                    router.refresh();
                  }}
                >
                  Reativar
                </Button>
              ) : null}
              {subscription.status !== "cancelled" ? (
                <ConfirmDialog
                  title="Cancelar assinatura?"
                  description="A assinatura fica no histórico, mas sai dos totais ativos e próximas cobranças."
                  confirmLabel="Cancelar"
                  variant="destructive"
                  onConfirm={async () => {
                    const result = await toggleSubscriptionStatus(
                      subscription.id,
                      "cancelled"
                    );

                    if (!result.ok) {
                      toast.error(
                        result.message ??
                          "Não foi possível cancelar a assinatura."
                      );
                      return;
                    }

                    toast.success(result.message ?? "Assinatura cancelada.");
                    router.refresh();
                  }}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canWrite}
                    >
                      Cancelar
                    </Button>
                  }
                />
              ) : null}
              <ConfirmDialog
                title="Remover assinatura?"
                description="A assinatura será removida, mas transações já geradas permanecem no histórico."
                confirmLabel="Remover"
                variant="destructive"
                onConfirm={async () => {
                  const result = await deleteSubscription(subscription.id);

                  if (!result.ok) {
                    toast.error(
                      result.message ?? "Não foi possível remover a assinatura."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Assinatura removida.");
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
        title="Assinaturas"
        description="Cobranças recorrentes, essencialidade e próximos vencimentos."
      >
        <Button onClick={openCreateSheet} disabled={!canCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova assinatura
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Mensal ativo"
          value={formatCurrency(summary.monthlyTotal, currency)}
          icon={Layers3}
          tone="expense"
        />
        <MetricCard
          title="Anualizado"
          value={formatCurrency(summary.annualTotal, currency)}
          icon={CalendarClock}
        />
        <MetricCard
          title="Ativas"
          value={String(summary.activeCount)}
          icon={ReceiptText}
          tone="income"
        />
        <MetricCard
          title="Dispensáveis"
          value={String(summary.dispensableCount)}
          icon={Layers3}
          tone={summary.dispensableCount > 0 ? "expense" : "income"}
        />
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Buscar"
          />
        </div>
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
        <Select value={importanceFilter} onValueChange={setImportanceFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as essencialidades</SelectItem>
            {importanceOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os ciclos</SelectItem>
            {cycleOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subscriptions.length ? (
        <DataTable
          columns={columns}
          data={filteredSubscriptions}
          emptyTitle="Nenhuma assinatura encontrada"
          emptyDescription="Ajuste os filtros para ver outras assinaturas."
        />
      ) : (
        <EmptyState
          icon={Layers3}
          title="Nenhuma assinatura acompanhada"
          description="Cadastre serviços ativos, pausados e cancelados para acompanhar totais e próximas cobranças."
          action={
            canCreate ? (
              <Button onClick={openCreateSheet}>Criar primeira assinatura</Button>
            ) : undefined
          }
        />
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingSubscription ? "Editar assinatura" : "Nova assinatura"}
            </SheetTitle>
            <SheetDescription>
              Assinaturas ativas entram nos totais e podem gerar cobranças
              agendadas.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SubscriptionForm
              mode={editingSubscription ? "edit" : "create"}
              options={options}
              initialData={editingSubscription ?? undefined}
              onSuccess={handleSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
