"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Pencil, Power, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createDefaultAccount,
  toggleAccountActive
} from "@/lib/actions/accounts";
import { accountTypeLabels } from "@/lib/constants/finance";
import { formatCurrency } from "@/lib/formatters/currency";
import type { Account } from "@/types/finance";
import { AccountForm } from "@/components/forms/account-form";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

type AccountsClientProps = {
  accounts: Account[];
  canWrite: boolean;
  currency: string;
};

export function AccountsClient({
  accounts,
  canWrite,
  currency
}: AccountsClientProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(
    null
  );
  const activeAccounts = accounts.filter((account) => account.is_active);
  const totalBalance = activeAccounts.reduce(
    (total, account) => total + account.current_balance,
    0
  );
  const totalLimit = activeAccounts.reduce(
    (total, account) => total + (account.credit_limit ?? 0),
    0
  );

  function openCreateSheet() {
    setEditingAccount(null);
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setIsSheetOpen(false);
    setEditingAccount(null);
    router.refresh();
  }

  async function handleCreateDefaultAccount() {
    const result = await createDefaultAccount();

    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível criar a conta.");
      return;
    }

    toast.success(result.message ?? "Conta criada.");
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Conta",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            {row.original.institution ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.institution}
              </p>
            ) : null}
          </div>
        )
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => accountTypeLabels[row.original.type]
      },
      {
        accessorKey: "current_balance",
        header: "Saldo",
        cell: ({ row }) => formatCurrency(row.original.current_balance, currency)
      },
      {
        accessorKey: "credit_limit",
        header: "Limite",
        cell: ({ row }) =>
          row.original.credit_limit
            ? formatCurrency(row.original.credit_limit, currency)
            : "Não se aplica"
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "Ativa" : "Inativa"}
          </Badge>
        )
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const account = row.original;

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => {
                  setEditingAccount(account);
                  setIsSheetOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <ConfirmDialog
                title={
                  account.is_active ? "Desativar conta?" : "Reativar conta?"
                }
                description={
                  account.is_active
                    ? "A conta não será excluída e poderá ser reativada depois."
                    : "A conta voltará a aparecer como ativa nas operações."
                }
                confirmLabel={account.is_active ? "Desativar" : "Reativar"}
                variant={account.is_active ? "destructive" : "default"}
                onConfirm={async () => {
                  const result = await toggleAccountActive(
                    account.id,
                    !account.is_active
                  );

                  if (!result.ok) {
                    toast.error(
                      result.message ?? "Não foi possível atualizar a conta."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Conta atualizada.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant={account.is_active ? "outline" : "secondary"}
                    disabled={!canWrite}
                  >
                    <Power className="mr-1 h-4 w-4" />
                    {account.is_active ? "Desativar" : "Reativar"}
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
        title="Contas"
        description="Contas bancárias, cartões, dinheiro e investimentos."
      >
        <Button onClick={openCreateSheet} disabled={!canWrite}>
          <Plus className="mr-2 h-4 w-4" />
          Nova conta
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Contas ativas"
          value={String(activeAccounts.length)}
          icon={CreditCard}
        />
        <MetricCard
          title="Saldo atual"
          value={formatCurrency(totalBalance, currency)}
          icon={CreditCard}
        />
        <MetricCard
          title="Limite em cartões"
          value={formatCurrency(totalLimit, currency)}
          icon={CreditCard}
        />
      </div>

      {accounts.length ? (
        <DataTable
          columns={columns}
          data={accounts}
          emptyTitle="Nenhuma conta cadastrada"
          emptyDescription="Cadastre uma conta para começar a organizar seus lançamentos."
        />
      ) : (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma conta cadastrada"
          description="Crie sua conta principal ou cadastre manualmente bancos, cartões e carteiras."
          action={
            canWrite ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleCreateDefaultAccount}>
                  Criar Conta principal
                </Button>
                <Button variant="outline" onClick={openCreateSheet}>
                  Cadastrar manualmente
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
              {editingAccount ? "Editar conta" : "Nova conta"}
            </SheetTitle>
            <SheetDescription>
              O saldo exibido considera transações pagas vinculadas à conta.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AccountForm
              mode={editingAccount ? "edit" : "create"}
              initialData={editingAccount ?? undefined}
              onSuccess={handleSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
