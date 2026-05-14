"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { accountTypeLabels } from "@/lib/constants/finance";
import {
  accountFormSchema,
  type AccountFormInput,
  type AccountFormValues
} from "@/lib/validations/finance";
import type { Account, AccountType } from "@/types/finance";
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

const accountTypes = Object.entries(accountTypeLabels) as [AccountType, string][];

type AccountFormProps = {
  mode: "create" | "edit";
  initialData?: Account;
  onSuccess?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function AccountForm({ mode, initialData, onSuccess }: AccountFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? "checking",
      institution: initialData?.institution ?? "",
      initialBalance: initialData?.initial_balance ?? 0,
      creditLimit: initialData?.credit_limit ?? "",
      closingDay: initialData?.closing_day ?? "",
      dueDay: initialData?.due_day ?? "",
      isActive: initialData?.is_active ?? true
    }
  });
  const selectedType = useWatch({ control: form.control, name: "type" });
  const isCreditCard = selectedType === "credit_card";

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

  function handleSubmit(values: AccountFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateAccount(initialData.id, values)
          : await createAccount(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a conta.");
        return;
      }

      toast.success(result.message ?? "Conta salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="account-name">Nome</Label>
        <Input
          id="account-name"
          placeholder="Conta principal"
          disabled={isPending}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
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
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(([value, label]) => (
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
          <Label htmlFor="account-institution">Instituição</Label>
          <Input
            id="account-institution"
            placeholder="Banco, corretora ou carteira"
            disabled={isPending}
            {...form.register("institution")}
          />
          <FieldError message={form.formState.errors.institution?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-initial-balance">Saldo inicial</Label>
        <Input
          id="account-initial-balance"
          type="number"
          step="0.01"
          disabled={isPending}
          {...form.register("initialBalance")}
        />
        <FieldError message={form.formState.errors.initialBalance?.message} />
      </div>

      {isCreditCard ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="account-credit-limit">Limite</Label>
            <Input
              id="account-credit-limit"
              type="number"
              step="0.01"
              min="0"
              disabled={isPending}
              {...form.register("creditLimit")}
            />
            <FieldError message={form.formState.errors.creditLimit?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-closing-day">Fechamento</Label>
            <Input
              id="account-closing-day"
              type="number"
              min="1"
              max="31"
              disabled={isPending}
              {...form.register("closingDay")}
            />
            <FieldError message={form.formState.errors.closingDay?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-due-day">Vencimento</Label>
            <Input
              id="account-due-day"
              type="number"
              min="1"
              max="31"
              disabled={isPending}
              {...form.register("dueDay")}
            />
            <FieldError message={form.formState.errors.dueDay?.message} />
          </div>
        </div>
      ) : null}

      <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          disabled={isPending}
          {...form.register("isActive")}
        />
        Conta ativa
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : mode === "edit" ? "Salvar conta" : "Criar conta"}
      </Button>
    </form>
  );
}
