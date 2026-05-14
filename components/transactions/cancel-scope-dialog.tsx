"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Transaction } from "@/types/finance";

export type InstallmentScope = "this" | "this_and_following" | "all";
export type RecurringScope = "this" | "this_and_following";

type Props = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: InstallmentScope | RecurringScope) => Promise<void>;
};

export function CancelScopeDialog({ transaction, open, onOpenChange, onConfirm }: Props) {
  const [scope, setScope] = React.useState<string>("this");
  const [loading, setLoading] = React.useState(false);

  const isInstallment =
    !!transaction?.installment_group_id && transaction.type !== "transfer";

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) setScope("this");
    onOpenChange(newOpen);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(scope as InstallmentScope);
    } finally {
      setLoading(false);
    }
  }

  if (!transaction) return null;

  const num = transaction.installment_number;
  const total = transaction.installment_total;
  const remaining = total && num ? total - num + 1 : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar lançamento</DialogTitle>
          <DialogDescription>
            {isInstallment && num && total
              ? `Parcela ${num}/${total} — ${transaction.description}`
              : `Recorrência — ${transaction.description}`}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={scope} onValueChange={setScope} className="gap-3">
          <label
            htmlFor="scope-this"
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value="this" id="scope-this" className="mt-0.5" />
            <div>
              <p className="font-medium leading-none">Só este lançamento</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Os demais permanecem agendados.
              </p>
            </div>
          </label>

          <label
            htmlFor="scope-following"
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem
              value="this_and_following"
              id="scope-following"
              className="mt-0.5"
            />
            <div>
              <p className="font-medium leading-none">
                {isInstallment && remaining
                  ? `Este e os seguintes (${remaining})`
                  : "Este e os próximos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isInstallment
                  ? `Cancela da parcela ${num} até a ${total}.`
                  : "Cancela esta e as próximas ocorrências agendadas da regra."}
              </p>
            </div>
          </label>

          {isInstallment && (
            <label
              htmlFor="scope-all"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
              <div>
                <p className="font-medium leading-none">Todas as parcelas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cancela todas as {total} parcelas do grupo, incluindo as anteriores.
                </p>
              </div>
            </label>
          )}
        </RadioGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Needed because <label> wrapping RadioGroupItem requires forwardRef-compatible Label.
// We inline `label` HTML element above instead.
void Label;
