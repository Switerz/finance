"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import {
  paymentMethodLabels,
  transactionStatusLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import {
  transactionFormSchema,
  type TransactionFormInput,
  type TransactionFormValues
} from "@/lib/validations/finance";
import type {
  Account,
  Category,
  ManualTransactionType,
  PaymentMethod,
  Transaction
} from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const transactionTypes = [
  ["income", transactionTypeLabels.income],
  ["expense", transactionTypeLabels.expense],
  ["investment", transactionTypeLabels.investment]
] as [ManualTransactionType, string][];

const editableStatuses = [
  ["paid", transactionStatusLabels.paid],
  ["pending", transactionStatusLabels.pending],
  ["scheduled", transactionStatusLabels.scheduled]
] as const;

const paymentMethods = Object.entries(paymentMethodLabels) as [
  PaymentMethod,
  string
][];

type TransactionFormProps = {
  mode: "create" | "edit";
  accounts: Account[];
  categories: Category[];
  initialData?: Transaction;
  onSuccess?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  mode,
  accounts,
  categories,
  initialData,
  onSuccess
}: TransactionFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<TransactionFormInput, unknown, TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: initialData?.description ?? "",
      amount: initialData?.amount ?? "",
      type:
        initialData?.type && initialData.type !== "transfer"
          ? initialData.type
          : "expense",
      transactionDate: initialData?.transaction_date ?? todayDateString(),
      accountId: initialData?.account_id ?? accounts[0]?.id ?? "",
      categoryId: initialData?.category_id ?? "",
      paymentMethod: initialData?.payment_method ?? undefined,
      status:
        initialData?.status && initialData.status !== "cancelled"
          ? initialData.status
          : "paid",
      notes: initialData?.notes ?? "",
      tags: initialData?.tags.join(", ") ?? ""
    }
  });
  const selectedType = useWatch({ control: form.control, name: "type" });
  const categoryOptions = categories.filter(
    (category) => category.type === selectedType
  );
  const canSubmit = accounts.length > 0 && categoryOptions.length > 0;

  function applyServerFieldErrors(
    fieldErrors: Record<string, string[] | undefined> | undefined
  ) {
    Object.entries(fieldErrors ?? {}).forEach(([field, messages]) => {
      if (messages?.[0]) {
        form.setError(field as Parameters<typeof form.setError>[0], {
          type: "server",
          message: messages[0]
        });
      }
    });
  }

  function handleSubmit(values: TransactionFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateTransaction(initialData.id, values)
          : await createTransaction(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a transação.");
        return;
      }

      toast.success(result.message ?? "Transação salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="transaction-description">Descrição</Label>
        <Input
          id="transaction-description"
          placeholder="Mercado, salário, aluguel"
          disabled={isPending}
          {...form.register("description")}
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value as ManualTransactionType);
                  form.setValue("categoryId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.type?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-amount">Valor</Label>
          <Input
            id="transaction-amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldError message={form.formState.errors.amount?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transaction-date">Data</Label>
          <Input
            id="transaction-date"
            type="date"
            disabled={isPending}
            {...form.register("transactionDate")}
          />
          <FieldError message={form.formState.errors.transactionDate?.message} />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableStatuses.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.status?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Conta</Label>
          <Controller
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <Select
                disabled={isPending || accounts.length === 0}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.accountId?.message} />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select
                disabled={isPending || categoryOptions.length === 0}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger aria-label="Categoria">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.categoryId?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Método de pagamento</Label>
        <Controller
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <Select
              disabled={isPending}
              value={field.value ?? "none"}
              onValueChange={(value) =>
                field.onChange(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                {paymentMethods.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={form.formState.errors.paymentMethod?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction-tags">Tags</Label>
        <Input
          id="transaction-tags"
          placeholder="casa, recorrente"
          disabled={isPending}
          {...form.register("tags")}
        />
        <FieldError message={form.formState.errors.tags?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction-notes">Notas</Label>
        <textarea
          id="transaction-notes"
          rows={4}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Detalhes úteis para lembrar depois"
          disabled={isPending}
          {...form.register("notes")}
        />
        <FieldError message={form.formState.errors.notes?.message} />
      </div>

      {!canSubmit ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cadastre uma conta ativa e categorias ativas para lançar transações.
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || !canSubmit}>
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar transação"
            : "Criar transação"}
      </Button>
    </form>
  );
}
