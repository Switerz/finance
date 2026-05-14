"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createInstallmentTransactions } from "@/lib/actions/transactions";
import {
  paymentMethodLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import {
  installmentFormSchema,
  type InstallmentFormInput,
  type InstallmentFormValues
} from "@/lib/validations/finance";
import type {
  Account,
  Category,
  ManualTransactionType,
  PaymentMethod
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

const installmentTypes = [
  ["expense", transactionTypeLabels.expense],
  ["investment", transactionTypeLabels.investment]
] as [Extract<ManualTransactionType, "expense" | "investment">, string][];

const paymentMethods = Object.entries(paymentMethodLabels) as [
  PaymentMethod,
  string
][];

type InstallmentFormProps = {
  accounts: Account[];
  categories: Category[];
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

export function InstallmentForm({
  accounts,
  categories,
  onSuccess
}: InstallmentFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<InstallmentFormInput, unknown, InstallmentFormValues>({
    resolver: zodResolver(installmentFormSchema),
    defaultValues: {
      description: "",
      totalAmount: "",
      type: "expense",
      firstDate: todayDateString(),
      installmentTotal: 2,
      accountId: accounts[0]?.id ?? "",
      categoryId: "",
      paymentMethod: undefined,
      notes: "",
      tags: ""
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

  function handleSubmit(values: InstallmentFormValues) {
    startTransition(async () => {
      const result = await createInstallmentTransactions(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível criar o parcelamento.");
        return;
      }

      toast.success(result.message ?? "Parcelamento criado.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="installment-description">Descrição</Label>
        <Input
          id="installment-description"
          placeholder="Compra parcelada"
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
                  field.onChange(value);
                  form.setValue("categoryId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentTypes.map(([value, label]) => (
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
          <Label htmlFor="installment-total-amount">Valor total</Label>
          <Input
            id="installment-total-amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("totalAmount")}
          />
          <FieldError message={form.formState.errors.totalAmount?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="installment-first-date">Primeira parcela</Label>
          <Input
            id="installment-first-date"
            type="date"
            disabled={isPending}
            {...form.register("firstDate")}
          />
          <FieldError message={form.formState.errors.firstDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installment-total">Parcelas</Label>
          <Input
            id="installment-total"
            type="number"
            min="2"
            max="120"
            disabled={isPending}
            {...form.register("installmentTotal")}
          />
          <FieldError message={form.formState.errors.installmentTotal?.message} />
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
                <SelectTrigger>
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
        <Label htmlFor="installment-tags">Tags</Label>
        <Input
          id="installment-tags"
          placeholder="cartão, compra"
          disabled={isPending}
          {...form.register("tags")}
        />
        <FieldError message={form.formState.errors.tags?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="installment-notes">Notas</Label>
        <textarea
          id="installment-notes"
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
          Cadastre uma conta ativa e categorias ativas de despesa ou investimento.
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || !canSubmit}>
        {isPending ? "Criando..." : "Criar parcelas agendadas"}
      </Button>
    </form>
  );
}
