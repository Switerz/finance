"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createGoal, updateGoal } from "@/lib/actions/goals";
import { goalStatusLabels } from "@/lib/constants/finance";
import {
  goalFormSchema,
  type GoalFormInput,
  type GoalFormValues
} from "@/lib/validations/finance";
import type { Goal, GoalStatus } from "@/types/finance";
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

type GoalFormProps = {
  mode: "create" | "edit";
  initialData?: Goal;
  onSuccess?: () => void;
};

const statusOptions = Object.entries(goalStatusLabels) as [
  GoalStatus,
  string
][];

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function GoalForm({ mode, initialData, onSuccess }: GoalFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      targetAmount: initialData?.target_amount ?? "",
      currentAmount: initialData?.current_amount ?? 0,
      deadline: initialData?.deadline ?? "",
      monthlyContribution: initialData?.monthly_contribution ?? "",
      status: initialData?.status ?? "active"
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

  function handleSubmit(values: GoalFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateGoal(initialData.id, values)
          : await createGoal(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a meta.");
        return;
      }

      toast.success(result.message ?? "Meta salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="goal-name">Nome</Label>
        <Input
          id="goal-name"
          disabled={isPending}
          placeholder="Reserva de emergência"
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-target-amount">Valor alvo</Label>
          <Input
            id="goal-target-amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("targetAmount")}
          />
          <FieldError message={form.formState.errors.targetAmount?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-current-amount">Valor atual</Label>
          <Input
            id="goal-current-amount"
            type="number"
            step="0.01"
            min="0"
            disabled={isPending}
            {...form.register("currentAmount")}
          />
          <FieldError message={form.formState.errors.currentAmount?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-deadline">Prazo</Label>
          <Input
            id="goal-deadline"
            type="date"
            disabled={isPending}
            {...form.register("deadline")}
          />
          <FieldError message={form.formState.errors.deadline?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-monthly-contribution">
            Contribuição mensal planejada
          </Label>
          <Input
            id="goal-monthly-contribution"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("monthlyContribution")}
          />
          <FieldError
            message={form.formState.errors.monthlyContribution?.message}
          />
        </div>
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
                {statusOptions.map(([value, label]) => (
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar meta"
            : "Criar meta"}
      </Button>
    </form>
  );
}
