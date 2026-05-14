"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createSubscription,
  updateSubscription
} from "@/lib/actions/subscriptions";
import {
  billingCycleLabels,
  subscriptionImportanceLabels,
  subscriptionStatusLabels
} from "@/lib/constants/finance";
import {
  subscriptionFormSchema,
  type SubscriptionFormInput,
  type SubscriptionFormValues
} from "@/lib/validations/finance";
import type {
  BillingCycle,
  Subscription,
  SubscriptionFormOptions,
  SubscriptionImportance,
  SubscriptionStatus
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

type SubscriptionFormProps = {
  mode: "create" | "edit";
  options: SubscriptionFormOptions;
  initialData?: Subscription;
  onSuccess?: () => void;
};

const billingCycles = Object.entries(billingCycleLabels) as [
  BillingCycle,
  string
][];

const statuses = Object.entries(subscriptionStatusLabels) as [
  SubscriptionStatus,
  string
][];

const importanceOptions = Object.entries(subscriptionImportanceLabels) as [
  SubscriptionImportance,
  string
][];

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function SubscriptionForm({
  mode,
  options,
  initialData,
  onSuccess
}: SubscriptionFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<SubscriptionFormInput, unknown, SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      amount: initialData?.amount ?? "",
      accountId: initialData?.account_id ?? options.accounts[0]?.id ?? "",
      categoryId: initialData?.category_id ?? "",
      billingCycle: initialData?.billing_cycle ?? "monthly",
      billingDay: initialData?.billing_day ?? undefined,
      nextBillingDate: initialData?.next_billing_date ?? todayDateString(),
      status: initialData?.status ?? "active",
      importance: initialData?.importance ?? "none",
      website: initialData?.website ?? "",
      notes: initialData?.notes ?? ""
    }
  });
  const billingCycle = useWatch({ control: form.control, name: "billingCycle" });
  const canSubmit = options.accounts.length > 0 && options.categories.length > 0;

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

  function handleSubmit(values: SubscriptionFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateSubscription(initialData.id, values)
          : await createSubscription(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a assinatura.");
        return;
      }

      toast.success(result.message ?? "Assinatura salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="subscription-name">Nome</Label>
        <Input
          id="subscription-name"
          placeholder="Netflix, Spotify, internet"
          disabled={isPending}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subscription-amount">Valor</Label>
          <Input
            id="subscription-amount"
            type="number"
            step="0.01"
            min="0.01"
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldError message={form.formState.errors.amount?.message} />
        </div>

        <div className="space-y-2">
          <Label>Ciclo</Label>
          <Controller
            control={form.control}
            name="billingCycle"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={(value) => field.onChange(value as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingCycles.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.billingCycle?.message} />
        </div>
      </div>

      {billingCycle === "yearly" ? (
        <div className="space-y-2">
          <Label htmlFor="subscription-next-billing-date">
            Próxima cobrança anual
          </Label>
          <Input
            id="subscription-next-billing-date"
            type="date"
            disabled={isPending}
            {...form.register("nextBillingDate")}
          />
          <FieldError message={form.formState.errors.nextBillingDate?.message} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="subscription-billing-day">Dia de cobrança</Label>
          <Input
            id="subscription-billing-day"
            type="number"
            min="1"
            max="31"
            disabled={isPending}
            {...form.register("billingDay")}
          />
          <FieldError message={form.formState.errors.billingDay?.message} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Conta</Label>
          <Controller
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <Select
                disabled={isPending || options.accounts.length === 0}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {options.accounts.map((account) => (
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
                disabled={isPending || options.categories.length === 0}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {options.categories.map((category) => (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as SubscriptionStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(([value, label]) => (
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

        <div className="space-y-2">
          <Label>Essencialidade</Label>
          <Controller
            control={form.control}
            name="importance"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value ?? "none"}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informada</SelectItem>
                  {importanceOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.importance?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscription-website">Site</Label>
        <Input
          id="subscription-website"
          placeholder="https://servico.com"
          disabled={isPending}
          {...form.register("website")}
        />
        <FieldError message={form.formState.errors.website?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscription-notes">Notas</Label>
        <textarea
          id="subscription-notes"
          rows={4}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Plano, titular, observações de cancelamento"
          disabled={isPending}
          {...form.register("notes")}
        />
        <FieldError message={form.formState.errors.notes?.message} />
      </div>

      {!canSubmit ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cadastre uma conta ativa e uma categoria ativa de despesa para criar
          assinaturas.
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending || !canSubmit}>
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar assinatura"
            : "Criar assinatura"}
      </Button>
    </form>
  );
}
