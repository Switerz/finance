"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createTransfer } from "@/lib/actions/transactions";
import {
  transferFormSchema,
  type TransferFormInput,
  type TransferFormValues
} from "@/lib/validations/finance";
import type { Account } from "@/types/finance";
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

type TransferFormProps = {
  accounts: Account[];
  onSuccess?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function TransferForm({ accounts, onSuccess }: TransferFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<TransferFormInput, unknown, TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      fromAccountId: accounts[0]?.id ?? "",
      toAccountId: accounts[1]?.id ?? "",
      amount: "",
      description: "Transferência",
      transactionDate: todayDateString()
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

  function handleSubmit(values: TransferFormValues) {
    startTransition(async () => {
      const result = await createTransfer(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível registrar a transferência.");
        return;
      }

      toast.success(result.message ?? "Transferência registrada.");
      onSuccess?.();
    });
  }

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Você precisa de pelo menos 2 contas ativas para registrar uma transferência.
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fromAccountId">Conta de origem</Label>
        <Select
          value={form.watch("fromAccountId")}
          onValueChange={(value) =>
            form.setValue("fromAccountId", value, { shouldValidate: true })
          }
        >
          <SelectTrigger id="fromAccountId">
            <SelectValue placeholder="Selecione a conta de origem" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={form.formState.errors.fromAccountId?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="toAccountId">Conta de destino</Label>
        <Select
          value={form.watch("toAccountId")}
          onValueChange={(value) =>
            form.setValue("toAccountId", value, { shouldValidate: true })
          }
        >
          <SelectTrigger id="toAccountId">
            <SelectValue placeholder="Selecione a conta de destino" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={form.formState.errors.toAccountId?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          {...form.register("amount")}
        />
        <FieldError message={form.formState.errors.amount?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          type="text"
          placeholder="Transferência"
          {...form.register("description")}
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="transactionDate">Data</Label>
        <Input
          id="transactionDate"
          type="date"
          {...form.register("transactionDate")}
        />
        <FieldError message={form.formState.errors.transactionDate?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Registrando…" : "Registrar transferência"}
      </Button>
    </form>
  );
}
