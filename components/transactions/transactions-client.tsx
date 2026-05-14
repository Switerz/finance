"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeftRight,
  CalendarClock,
  Copy,
  Pencil,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Undo2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteRecurringRule,
  generateRecurringTransactions,
  toggleRecurringRule
} from "@/lib/actions/recurring-rules";
import {
  cancelInstallmentGroup,
  cancelRecurringGroup,
  cancelTransaction,
  deleteTransfer,
  duplicateTransaction
} from "@/lib/actions/transactions";
import { CancelScopeDialog } from "@/components/transactions/cancel-scope-dialog";
import {
  paymentMethodLabels,
  recurringFrequencyLabels,
  transactionStatusLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDateBR } from "@/lib/formatters/date";
import type {
  ManualTransactionType,
  PaymentMethod,
  RecurringRule,
  Transaction,
  TransactionFormOptions,
  TransactionStatus
} from "@/types/finance";
import { InstallmentForm } from "@/components/forms/installment-form";
import { RecurringRuleForm } from "@/components/forms/recurring-rule-form";
import { TransactionForm } from "@/components/forms/transaction-form";
import { TransferForm } from "@/components/forms/transfer-form";
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

type OptimisticAction =
  | { type: "cancel"; id: string }
  | { type: "duplicate"; transaction: Transaction };

type TransactionsClientProps = {
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  options: TransactionFormOptions;
  canWrite: boolean;
  currency: string;
};

const typeOptions = [
  ["income", transactionTypeLabels.income],
  ["expense", transactionTypeLabels.expense],
  ["investment", transactionTypeLabels.investment]
] as [ManualTransactionType, string][];

const statusOptions = Object.entries(transactionStatusLabels) as [
  TransactionStatus,
  string
][];

function statusVariant(status: TransactionStatus) {
  if (status === "cancelled") {
    return "destructive" as const;
  }

  if (status === "paid") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function signedAmount(transaction: Transaction) {
  if (transaction.type === "income") {
    return transaction.amount;
  }

  if (transaction.type === "expense" || transaction.type === "investment") {
    return -transaction.amount;
  }

  if (transaction.type === "transfer") {
    return transaction.installment_number === 2
      ? transaction.amount
      : -transaction.amount;
  }

  return 0;
}

function signedRecurringAmount(rule: RecurringRule) {
  if (rule.type === "income") {
    return rule.amount;
  }

  return -rule.amount;
}

function installmentLabel(transaction: Transaction) {
  if (!transaction.installment_number || !transaction.installment_total) {
    return null;
  }

  return `${transaction.installment_number}/${transaction.installment_total}`;
}

function matchesSearch(transaction: Transaction, search: string) {
  if (!search.trim()) {
    return true;
  }

  const target = [
    transaction.description,
    transaction.account_name,
    transaction.category_name,
    transaction.payment_method
      ? paymentMethodLabels[transaction.payment_method as PaymentMethod]
      : null,
    ...transaction.tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return target.includes(search.trim().toLowerCase());
}

function sheetTitle(
  sheetMode: "transaction" | "installment" | "recurring" | "transfer" | null,
  editingTransaction: Transaction | null,
  editingRecurringRule: RecurringRule | null
) {
  if (sheetMode === "installment") {
    return "Compra parcelada";
  }

  if (sheetMode === "recurring") {
    return editingRecurringRule ? "Editar recorrência" : "Nova recorrência";
  }

  if (sheetMode === "transfer") {
    return "Transferência entre contas";
  }

  return editingTransaction ? "Editar transação" : "Nova transação";
}

function sheetDescription(
  sheetMode: "transaction" | "installment" | "recurring" | "transfer" | null
) {
  if (sheetMode === "installment") {
    return "As parcelas serão criadas como agendadas e só entram no saldo quando pagas.";
  }

  if (sheetMode === "recurring") {
    return "A regra gera os próximos lançamentos como agendados, sem duplicar datas existentes.";
  }

  if (sheetMode === "transfer") {
    return "A transferência é registrada como paga e movimenta o saldo das duas contas.";
  }

  return "Apenas transações pagas entram no saldo real das contas.";
}

export function TransactionsClient({
  transactions,
  recurringRules,
  options,
  canWrite,
  currency
}: TransactionsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"transactions" | "recurring">(
    "transactions"
  );
  const [sheetMode, setSheetMode] = React.useState<
    "transaction" | "installment" | "recurring" | "transfer" | null
  >(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] =
    React.useState<Transaction | null>(null);
  const [editingRecurringRule, setEditingRecurringRule] =
    React.useState<RecurringRule | null>(null);
  const [cancelScopeTarget, setCancelScopeTarget] =
    React.useState<Transaction | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [accountFilter, setAccountFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const [optimisticTransactions, addOptimistic] = React.useOptimistic(
    transactions,
    (state: Transaction[], action: OptimisticAction): Transaction[] => {
      if (action.type === "cancel") {
        return state.map((t) =>
          t.id === action.id ? { ...t, status: "cancelled" as TransactionStatus } : t
        );
      }
      if (action.type === "duplicate") {
        const clone: Transaction = {
          ...action.transaction,
          id: `optimistic-${action.transaction.id}`,
          status: "pending" as TransactionStatus,
          transaction_date: new Date().toISOString().slice(0, 10),
          installment_group_id: null,
          installment_number: null,
          installment_total: null,
          is_recurring: false,
          recurring_rule_id: null
        };
        return [clone, ...state];
      }
      return state;
    }
  );

  const [isMutating, startMutation] = React.useTransition();

  const paidTransactions = optimisticTransactions.filter(
    (transaction) => transaction.status === "paid"
  );
  const income = paidTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = paidTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const investments = paidTransactions
    .filter((transaction) => transaction.type === "investment")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const filteredTransactions = optimisticTransactions.filter(
    (transaction) =>
      matchesSearch(transaction, search) &&
      (typeFilter === "all" || transaction.type === typeFilter) &&
      (statusFilter === "all" || transaction.status === statusFilter) &&
      (accountFilter === "all" || transaction.account_id === accountFilter) &&
      (categoryFilter === "all" || transaction.category_id === categoryFilter)
  );
  const canCreate =
    canWrite && options.accounts.length > 0 && options.categories.length > 0;

  function openCreateSheet() {
    setEditingTransaction(null);
    setEditingRecurringRule(null);
    setSheetMode("transaction");
    setIsSheetOpen(true);
  }

  function openInstallmentSheet() {
    setEditingTransaction(null);
    setEditingRecurringRule(null);
    setSheetMode("installment");
    setIsSheetOpen(true);
  }

  function openRecurringSheet(rule?: RecurringRule) {
    setEditingTransaction(null);
    setEditingRecurringRule(rule ?? null);
    setSheetMode("recurring");
    setIsSheetOpen(true);
  }

  function openTransferSheet() {
    setEditingTransaction(null);
    setEditingRecurringRule(null);
    setSheetMode("transfer");
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setIsSheetOpen(false);
    setEditingTransaction(null);
    setEditingRecurringRule(null);
    setSheetMode(null);
    router.refresh();
  }

  const transactionColumns = React.useMemo<ColumnDef<Transaction>[]>(
    () => {
      function cancelTx(id: string) {
        startMutation(async () => {
          addOptimistic({ type: "cancel", id });
          const result = await cancelTransaction(id);

          if (!result.ok) {
            toast.error(result.message ?? "Não foi possível cancelar a transação.");
            return;
          }

          toast.success(result.message ?? "Transação cancelada.");
          router.refresh();
        });
      }

      function duplicateTx(transaction: Transaction) {
        startMutation(async () => {
          addOptimistic({ type: "duplicate", transaction });
          const result = await duplicateTransaction(transaction.id);

          if (!result.ok) {
            toast.error(result.message ?? "Não foi possível duplicar a transação.");
            return;
          }

          toast.success(result.message ?? "Transação duplicada.");
          router.refresh();
        });
      }

      return [
        {
          accessorKey: "transaction_date",
          header: "Data",
          cell: ({ row }) => formatDateBR(row.original.transaction_date)
        },
        {
          accessorKey: "description",
          header: "Descrição",
          cell: ({ row }) => {
            const t = row.original;
            const isTransfer = t.type === "transfer";
            const subtitle = isTransfer
              ? t.transfer_peer_name
                ? t.installment_number === 2
                  ? `← ${t.transfer_peer_name}`
                  : `→ ${t.transfer_peer_name}`
                : t.account_name ?? "Sem conta"
              : `${t.account_name ?? "Sem conta"} · ${t.category_name ?? "Sem categoria"}`;

            return (
              <div className="min-w-0">
                <p className="truncate font-medium">{t.description}</p>
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              </div>
            );
          }
        },
        {
          id: "installment",
          header: "Parcela",
          enableSorting: false,
          cell: ({ row }) => {
            const label = installmentLabel(row.original);

            return label ? <Badge variant="outline">{label}</Badge> : "-";
          }
        },
        {
          accessorKey: "type",
          header: "Tipo",
          cell: ({ row }) => transactionTypeLabels[row.original.type]
        },
        {
          accessorKey: "amount",
          header: "Valor",
          cell: ({ row }) => {
            const value = signedAmount(row.original);

            return (
              <span
                className={
                  value >= 0 ? "font-medium text-emerald-700" : "font-medium"
                }
              >
                {formatCurrency(value, currency)}
              </span>
            );
          }
        },
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ row }) => (
            <Badge variant={statusVariant(row.original.status)}>
              {transactionStatusLabels[row.original.status]}
            </Badge>
          )
        },
        {
          id: "actions",
          header: "Ações",
          enableSorting: false,
          cell: ({ row }) => {
            const transaction = row.original;
            const isCancelled = transaction.status === "cancelled";
            const isTransfer = transaction.type === "transfer";
            const isInstallmentTx =
              transaction.installment_group_id !== null && !isTransfer;
            const isRecurringTx = transaction.is_recurring;
            const needsScopePicker = isInstallmentTx || isRecurringTx;
            const isOptimistic = transaction.id.startsWith("optimistic-");

            if (isTransfer) {
              return (
                <div className="flex justify-end gap-2">
                  <ConfirmDialog
                    title="Desfazer transferência?"
                    description="Os dois lançamentos serão removidos permanentemente e os saldos das contas serão revertidos."
                    confirmLabel="Desfazer"
                    variant="destructive"
                    onConfirm={async () => {
                      const groupId = transaction.installment_group_id;

                      if (!groupId) {
                        toast.error("Transferência inválida.");
                        return;
                      }

                      const result = await deleteTransfer(groupId);

                      if (!result.ok) {
                        toast.error(
                          result.message ?? "Não foi possível desfazer a transferência."
                        );
                        return;
                      }

                      toast.success(result.message ?? "Transferência desfeita.");
                      router.refresh();
                    }}
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || isMutating}
                      >
                        <Undo2 className="mr-1 h-4 w-4" />
                        Desfazer
                      </Button>
                    }
                  />
                </div>
              );
            }

            return (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canWrite || isCancelled || isMutating || isOptimistic}
                  onClick={() => {
                    setEditingTransaction(transaction);
                    setEditingRecurringRule(null);
                    setSheetMode("transaction");
                    setIsSheetOpen(true);
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canWrite || isMutating || isOptimistic}
                  onClick={() => duplicateTx(transaction)}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Duplicar
                </Button>
                {needsScopePicker ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canWrite || isCancelled || isMutating || isOptimistic}
                    onClick={() => setCancelScopeTarget(transaction)}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Cancelar
                  </Button>
                ) : (
                  <ConfirmDialog
                    title="Cancelar transação?"
                    description="A transação será mantida no histórico, mas não entrará nos saldos e indicadores."
                    confirmLabel="Cancelar"
                    variant="destructive"
                    onConfirm={() => cancelTx(transaction.id)}
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || isCancelled || isMutating || isOptimistic}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Cancelar
                      </Button>
                    }
                  />
                )}
              </div>
            );
          }
        }
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, currency, router, isMutating]
  );

  const recurringColumns = React.useMemo<ColumnDef<RecurringRule>[]>(
    () => [
      {
        accessorKey: "description",
        header: "Recorrência",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.description}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.account_name ?? "Sem conta"} ·{" "}
              {row.original.category_name ?? "Sem categoria"}
            </p>
          </div>
        )
      },
      {
        accessorKey: "frequency",
        header: "Frequência",
        cell: ({ row }) => recurringFrequencyLabels[row.original.frequency]
      },
      {
        accessorKey: "day_of_month",
        header: "Dia",
        cell: ({ row }) => row.original.day_of_month ?? "-"
      },
      {
        accessorKey: "amount",
        header: "Valor",
        cell: ({ row }) => {
          const value = signedRecurringAmount(row.original);

          return (
            <span
              className={
                value >= 0 ? "font-medium text-emerald-700" : "font-medium"
              }
            >
              {formatCurrency(value, currency)}
            </span>
          );
        }
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "Ativa" : "Pausada"}
          </Badge>
        )
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const rule = row.original;

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite || !rule.is_active}
                onClick={async () => {
                  const result = await generateRecurringTransactions(rule.id);

                  if (!result.ok) {
                    toast.error(result.message ?? "Não foi possível gerar.");
                    return;
                  }

                  toast.success(result.message ?? "Lançamentos gerados.");
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
                onClick={() => openRecurringSheet(rule)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={async () => {
                  const result = await toggleRecurringRule(rule.id, !rule.is_active);

                  if (!result.ok) {
                    toast.error(
                      result.message ?? "Não foi possível alterar a recorrência."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Recorrência atualizada.");
                  router.refresh();
                }}
              >
                {rule.is_active ? "Pausar" : "Reativar"}
              </Button>
              <ConfirmDialog
                title="Remover recorrência?"
                description="A regra será removida, mas lançamentos já gerados serão preservados."
                confirmLabel="Remover"
                variant="destructive"
                onConfirm={async () => {
                  const result = await deleteRecurringRule(rule.id);

                  if (!result.ok) {
                    toast.error(
                      result.message ?? "Não foi possível remover a recorrência."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Recorrência removida.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canWrite}
                  >
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
        title="Transações"
        description="Lançamentos, parcelas e recorrências do workspace."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={openTransferSheet}
            disabled={!canWrite || options.accounts.length < 2}
            variant="outline"
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transferir
          </Button>
          <Button onClick={openInstallmentSheet} disabled={!canCreate} variant="outline">
            <CalendarClock className="mr-2 h-4 w-4" />
            Parcelar
          </Button>
          <Button onClick={openCreateSheet} disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova transação
          </Button>
        </div>
      </PageHeader>

      <div className="inline-flex rounded-md border bg-muted p-1">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "transactions" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("transactions")}
        >
          Lançamentos
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "recurring" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("recurring")}
        >
          Recorrências
        </Button>
      </div>

      {activeTab === "transactions" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Receitas pagas"
              value={formatCurrency(income, currency)}
              icon={ReceiptText}
              tone="income"
            />
            <MetricCard
              title="Despesas pagas"
              value={formatCurrency(expenses, currency)}
              icon={ReceiptText}
              tone="expense"
            />
            <MetricCard
              title="Investimentos"
              value={formatCurrency(investments, currency)}
              icon={ReceiptText}
              tone="investment"
            />
            <MetricCard
              title="Saldo do mês"
              value={formatCurrency(income - expenses - investments, currency)}
              icon={ReceiptText}
            />
          </div>

          <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Buscar"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {typeOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
                {statusOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {options.accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {options.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {optimisticTransactions.length ? (
            <DataTable
              columns={transactionColumns}
              data={filteredTransactions}
              emptyTitle="Nenhuma transação encontrada"
              emptyDescription="Ajuste os filtros para ver outros lançamentos deste mês."
            />
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="Nenhuma transação lançada"
              description="Registre receitas, despesas e investimentos para alimentar saldos e indicadores."
              action={
                canCreate ? (
                  <Button onClick={openCreateSheet}>Criar primeira transação</Button>
                ) : undefined
              }
            />
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => openRecurringSheet()} disabled={!canCreate}>
              <Repeat className="mr-2 h-4 w-4" />
              Nova recorrência
            </Button>
          </div>

          {recurringRules.length ? (
            <DataTable
              columns={recurringColumns}
              data={recurringRules}
              emptyTitle="Nenhuma recorrência encontrada"
              emptyDescription="Crie uma regra para gerar lançamentos agendados."
            />
          ) : (
            <EmptyState
              icon={Repeat}
              title="Nenhuma recorrência configurada"
              description="Use recorrências para salários, aluguel e contas fixas planejadas."
              action={
                canCreate ? (
                  <Button onClick={() => openRecurringSheet()}>
                    Criar recorrência
                  </Button>
                ) : undefined
              }
            />
          )}
        </>
      )}

      <CancelScopeDialog
        transaction={cancelScopeTarget}
        open={cancelScopeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelScopeTarget(null);
        }}
        onConfirm={async (scope) => {
          if (!cancelScopeTarget) return;

          let result;

          if (
            cancelScopeTarget.installment_group_id &&
            cancelScopeTarget.type !== "transfer"
          ) {
            result = await cancelInstallmentGroup(
              cancelScopeTarget.id,
              cancelScopeTarget.installment_group_id,
              scope as "this" | "this_and_following" | "all"
            );
          } else if (
            cancelScopeTarget.is_recurring &&
            cancelScopeTarget.recurring_rule_id
          ) {
            result = await cancelRecurringGroup(
              cancelScopeTarget.id,
              cancelScopeTarget.recurring_rule_id,
              scope as "this" | "this_and_following"
            );
          } else {
            return;
          }

          if (!result.ok) {
            toast.error(result.message ?? "Não foi possível cancelar.");
            return;
          }

          toast.success(result.message ?? "Cancelado.");
          setCancelScopeTarget(null);
          router.refresh();
        }}
      />

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);

          if (!open) {
            setEditingTransaction(null);
            setEditingRecurringRule(null);
            setSheetMode(null);
          }
        }}
      >
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {sheetTitle(sheetMode, editingTransaction, editingRecurringRule)}
            </SheetTitle>
            <SheetDescription>{sheetDescription(sheetMode)}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {sheetMode === "transfer" ? (
              <TransferForm
                accounts={options.accounts}
                onSuccess={handleSuccess}
              />
            ) : null}

            {sheetMode === "installment" ? (
              <InstallmentForm
                accounts={options.accounts}
                categories={options.categories}
                onSuccess={handleSuccess}
              />
            ) : null}

            {sheetMode === "recurring" ? (
              <RecurringRuleForm
                mode={editingRecurringRule ? "edit" : "create"}
                accounts={options.accounts}
                categories={options.categories}
                initialData={editingRecurringRule ?? undefined}
                onSuccess={handleSuccess}
              />
            ) : null}

            {sheetMode === "transaction" ? (
              <TransactionForm
                mode={editingTransaction ? "edit" : "create"}
                accounts={options.accounts}
                categories={options.categories}
                initialData={editingTransaction ?? undefined}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
