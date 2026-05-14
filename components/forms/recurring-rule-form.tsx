"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createRecurringRule,
  updateRecurringRule
} from "@/lib/actions/recurring-rules";
import {
  recurringFrequencyLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import {
  recurringRuleFormSchema,
  type RecurringRuleFormInput,
  type RecurringRuleFormValues
} from "@/lib/validations/finance";
import type {
  Account,
  Category,
  ManualTransactionType,
  RecurringFrequency,
  RecurringRule
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

const recurringTypes = [
  ["income", transactionTypeLabels.income],
  ["expense", transactionTypeLabels.expense],
  ["investment", transactionTypeLabels.investment]
] as [ManualTransactionType, string][];

const recurringFrequencies = [
  ["monthly", recurringFrequencyLabels.monthly],
  ["quarterly", recurringFrequencyLabels.quarterly],
  ["yearly", recurringFrequencyLabels.yearly]
] as [Extract<RecurringFrequency, "monthly" | "quarterly" | "yearly">, string][];

type RecurringRuleFormProps = {
  mode: "create" | "edit";
  accounts: Account[];
  categories: Category[];
  initialData?: RecurringRule;
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

function supportedFrequency(frequency: RecurringFrequency | undefined) {
  if (
    frequency === "monthly" ||
    frequency === "quarterly" ||
    frequency === "yearly"
  ) {
    return frequency;
  }

  return "monthly";
}

export function RecurringRuleForm({
  mode,
  accounts,
  categories,
  initialData,
  onSuccess
}: RecurringRuleFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<
    RecurringRuleFormInput,
    unknown,
    RecurringRuleFormValues
  >({
    resolver: zodResolver(recurringRuleFormSchema),
    defaultValues: {
      description: initialData?.description ?? "",
      amount: initialData?.amount ?? "",
      type: initialData?.type ?? "expense",
      frequency: supportedFrequency(initialData?.frequency),
      startDate: initialData?.start_date ?? todayDateString(),
      endDate: initialData?.end_date ?? "",
      dayOfMonth: initialData?.day_of_month ?? undefined,
      accountId: initialData?.account_id ?? accounts[0]?.id ?? "",
      categoryId: initialData?.category_id ?? ""
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

  function handleSubmit(values: RecurringRuleFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateRecurringRule(initialData.id, values)
          : await createRecurringRule(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a recorrência.");
        return;
      }

      toast.success(result.message ?? "Recorrência salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="recurring-description">Descrição</Label>
        <Input
          id="recurring-description"
          placeholder="Aluguel, salário, academia"
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
                  {recurringTypes.map(([value, label]) => (
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
          <Label htmlFor="recurring-amount">Valor</Label>
          <Input
            id="recurring-amount"
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
          <Label>Frequência</Label>
          <Controller
            control={form.control}
            name="frequency"
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
                  {recurringFrequencies.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.frequency?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-day">Dia do mês</Label>
          <Input
            id="recurring-day"
            type="number"
            min="1"
            max="31"
            placeholder="Usa o dia da data inicial"
            disabled={isPending}
            {...form.register("dayOfMonth")}
          />
          <FieldError message={form.formState.errors.dayOfMonth?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recurring-start">Início</Label>
          <Input
            id="recurring-start"
            type="date"
            disabled={isPending}
            {...form.register("startDate")}
          />
          <FieldError message={form.formState.errors.startDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-end">Fim opcional</Label>
          <Input
            id="recurring-end"
            type="date"
            disabled={isPending}
            {...form.register("endDate")}
          />
          <FieldError message={form.formState.errors.endDate?.message} />
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

      {!canSubmit ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cadastre uma conta ativa e categorias ativas compatíveis.
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || !canSubmit}>
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar recorrência"
            : "Criar recorrência"}
      </Button>
    </form>
  );
}
