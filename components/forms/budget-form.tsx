"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBudget, updateBudget } from "@/lib/actions/budgets";
import { categoryTypeLabels } from "@/lib/constants/finance";
import {
  budgetFormSchema,
  type BudgetFormInput,
  type BudgetFormValues
} from "@/lib/validations/finance";
import type { Budget, BudgetFormOptions } from "@/types/finance";
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

type BudgetFormProps = {
  mode: "create" | "edit";
  month: string;
  options: BudgetFormOptions;
  initialData?: Budget;
  onSuccess?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function BudgetForm({
  mode,
  month,
  options,
  initialData,
  onSuccess
}: BudgetFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<BudgetFormInput, unknown, BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: initialData?.category_id ?? "",
      month,
      plannedAmount: initialData?.planned_amount ?? "",
      alertThreshold: initialData
        ? Math.round(initialData.alert_threshold * 100)
        : 90
    }
  });

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

  function handleSubmit(values: BudgetFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateBudget(initialData.id, values)
          : await createBudget(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar o orçamento.");
        return;
      }

      toast.success(result.message ?? "Orçamento salvo.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <input type="hidden" {...form.register("month")} />

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Controller
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <Select
              disabled={isPending || options.categories.length === 0}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger aria-label="Categoria">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {options.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} · {categoryTypeLabels[category.type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={form.formState.errors.categoryId?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budget-planned-amount">Valor planejado</Label>
          <Input
            id="budget-planned-amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("plannedAmount")}
          />
          <FieldError message={form.formState.errors.plannedAmount?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-alert-threshold">Alerta em %</Label>
          <Input
            id="budget-alert-threshold"
            type="number"
            min="50"
            max="100"
            step="1"
            disabled={isPending}
            {...form.register("alertThreshold")}
          />
          <FieldError message={form.formState.errors.alertThreshold?.message} />
        </div>
      </div>

      {!options.categories.length ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cadastre categorias ativas de despesa ou investimento para criar
          orçamentos.
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !options.categories.length}
      >
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar orçamento"
            : "Criar orçamento"}
      </Button>
    </form>
  );
}
