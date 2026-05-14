"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  installmentFormSchema,
  transactionFormSchema,
  transferFormSchema,
  type InstallmentFormInput,
  type TransactionFormInput,
  type TransferFormInput
} from "@/lib/validations/finance";
import { splitAmountIntoInstallments } from "@/lib/actions/installment-utils";
import type {
  ActionResult,
  ManualTransactionType,
  PaymentMethod,
  TransactionStatus
} from "@/types/finance";

type ExistingTransactionRow = {
  id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number | string;
  type: ManualTransactionType;
  transaction_date: string;
  payment_method: PaymentMethod | null;
  status: TransactionStatus;
  notes: string | null;
  tags: string[] | null;
};

function fail(message: string, fieldErrors?: ActionResult["fieldErrors"]) {
  return { ok: false, message, fieldErrors } satisfies ActionResult;
}

async function getWritableWorkspace() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return { workspace: null, error: "Workspace não encontrado." };
  }

  if (workspace.role === "viewer") {
    return {
      workspace: null,
      error: "Seu papel neste workspace permite apenas visualização."
    };
  }

  return { workspace, error: null };
}

function revalidateTransactionSurfaces() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function toPayload(
  values: ReturnType<typeof transactionFormSchema.parse>,
  options: { includeGeneratedFields?: boolean } = {}
) {
  const payload = {
    account_id: values.accountId,
    category_id: values.categoryId,
    description: values.description,
    amount: values.amount,
    type: values.type,
    transaction_date: values.transactionDate,
    competence_month: null,
    payment_method: values.paymentMethod ?? null,
    status: values.status,
    notes: values.notes?.trim() || null,
    tags: values.tags
  };

  if (options.includeGeneratedFields === false) {
    return payload;
  }

  return {
    ...payload,
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null
  };
}

async function validateRelations(
  workspaceId: string,
  accountId: string,
  categoryId: string,
  type: ManualTransactionType
) {
  const supabase = await createClient();
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, type")
      .eq("id", categoryId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .maybeSingle()
  ]);

  if (!account) {
    return {
      message: "Selecione uma conta ativa deste workspace.",
      fieldErrors: { accountId: ["Selecione uma conta ativa."] }
    };
  }

  if (!category) {
    return {
      message: "Selecione uma categoria ativa deste workspace.",
      fieldErrors: { categoryId: ["Selecione uma categoria ativa."] }
    };
  }

  if ((category as { type: string }).type !== type) {
    return {
      message: "A categoria precisa ser compatível com o tipo da transação.",
      fieldErrors: { categoryId: ["Selecione uma categoria do mesmo tipo."] }
    };
  }

  return null;
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonthsClamped(date: string, monthOffset: number) {
  const { year, month, day } = parseDateParts(date);
  const target = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();

  return formatDateParts(targetYear, targetMonth, Math.min(day, lastDay));
}

// extracted to installment-utils.ts to keep this "use server" file export-safe

export async function createTransaction(
  input: TransactionFormInput
): Promise<ActionResult> {
  const parsed = transactionFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da transação.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const relationError = await validateRelations(
    workspace.id,
    parsed.data.accountId,
    parsed.data.categoryId,
    parsed.data.type
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error: insertError } = await supabase.from("transactions").insert({
    ...toPayload(parsed.data),
    workspace_id: workspace.id,
    created_by: user?.id ?? null
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transação criada." };
}

export async function updateTransaction(
  id: string,
  input: TransactionFormInput
): Promise<ActionResult> {
  const parsed = transactionFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da transação.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const relationError = await validateRelations(
    workspace.id,
    parsed.data.accountId,
    parsed.data.categoryId,
    parsed.data.type
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("status")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!current) {
    return fail("Transação não encontrada.");
  }

  if ((current as { status: TransactionStatus }).status === "cancelled") {
    return fail("Transações canceladas não podem ser editadas.");
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update(toPayload(parsed.data, { includeGeneratedFields: false }))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transação atualizada." };
}

export async function duplicateTransaction(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data, error: findError } = await supabase
    .from("transactions")
    .select(
      "id, account_id, category_id, description, amount, type, transaction_date, payment_method, status, notes, tags"
    )
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (findError || !data) {
    return fail("Transação não encontrada.");
  }

  const transaction = data as ExistingTransactionRow;

  if (!transaction.account_id || !transaction.category_id) {
    return fail("Transações sem conta ou categoria não podem ser duplicadas.");
  }

  const relationError = await validateRelations(
    workspace.id,
    transaction.account_id,
    transaction.category_id,
    transaction.type
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const { error: insertError } = await supabase.from("transactions").insert({
    workspace_id: workspace.id,
    account_id: transaction.account_id,
    category_id: transaction.category_id,
    description: transaction.description,
    amount: Number(transaction.amount),
    type: transaction.type,
    transaction_date: todayDateString(),
    competence_month: null,
    payment_method: transaction.payment_method,
    status: "pending",
    notes: transaction.notes,
    tags: transaction.tags ?? [],
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    created_by: user?.id ?? null
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transação duplicada como pendente." };
}

export async function cancelTransaction(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transação cancelada." };
}

export async function createInstallmentTransactions(
  input: InstallmentFormInput
): Promise<ActionResult> {
  const parsed = installmentFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos do parcelamento.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const relationError = await validateRelations(
    workspace.id,
    parsed.data.accountId,
    parsed.data.categoryId,
    parsed.data.type
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const installmentGroupId = crypto.randomUUID();
  const amounts = splitAmountIntoInstallments(
    parsed.data.totalAmount,
    parsed.data.installmentTotal
  );
  const payload = amounts.map((amount, index) => ({
    workspace_id: workspace.id,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    description: parsed.data.description,
    amount,
    type: parsed.data.type,
    transaction_date: addMonthsClamped(parsed.data.firstDate, index),
    competence_month: null,
    payment_method: parsed.data.paymentMethod ?? null,
    status: "scheduled",
    notes: parsed.data.notes?.trim() || null,
    tags: parsed.data.tags,
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: installmentGroupId,
    installment_number: index + 1,
    installment_total: parsed.data.installmentTotal,
    created_by: user?.id ?? null
  }));

  const { error: insertError } = await supabase.from("transactions").insert(payload);

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateTransactionSurfaces();
  return {
    ok: true,
    message: `${parsed.data.installmentTotal} parcelas agendadas.`
  };
}

export async function createTransfer(
  input: TransferFormInput
): Promise<ActionResult> {
  const parsed = transferFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da transferência.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const [{ data: fromAccount }, { data: toAccount }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id")
      .eq("id", parsed.data.fromAccountId)
      .eq("workspace_id", workspace.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id")
      .eq("id", parsed.data.toAccountId)
      .eq("workspace_id", workspace.id)
      .eq("is_active", true)
      .maybeSingle()
  ]);

  if (!fromAccount) {
    return fail("Conta de origem não encontrada.", {
      fromAccountId: ["Selecione uma conta de origem ativa."]
    });
  }

  if (!toAccount) {
    return fail("Conta de destino não encontrada.", {
      toAccountId: ["Selecione uma conta de destino ativa."]
    });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const transferGroupId = crypto.randomUUID();
  const base = {
    workspace_id: workspace.id,
    description: parsed.data.description,
    amount: parsed.data.amount,
    type: "transfer" as const,
    transaction_date: parsed.data.transactionDate,
    competence_month: null,
    payment_method: null,
    status: "paid" as const,
    notes: null,
    tags: [] as string[],
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: transferGroupId,
    installment_total: 2,
    category_id: null,
    created_by: user?.id ?? null
  };

  const { error: insertError } = await supabase.from("transactions").insert([
    { ...base, account_id: parsed.data.fromAccountId, installment_number: 1 },
    { ...base, account_id: parsed.data.toAccountId, installment_number: 2 }
  ]);

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transferência registrada." };
}

export async function cancelInstallmentGroup(
  id: string,
  groupId: string,
  scope: "this" | "this_and_following" | "all"
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();

  if (scope === "this") {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      return fail(updateError.message);
    }
  } else if (scope === "this_and_following") {
    const { data: current } = await supabase
      .from("transactions")
      .select("installment_number")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!current) {
      return fail("Parcela não encontrada.");
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("installment_group_id", groupId)
      .eq("workspace_id", workspace.id)
      .gte("installment_number", (current as { installment_number: number }).installment_number)
      .neq("status", "cancelled");

    if (updateError) {
      return fail(updateError.message);
    }
  } else {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("installment_group_id", groupId)
      .eq("workspace_id", workspace.id)
      .neq("status", "cancelled");

    if (updateError) {
      return fail(updateError.message);
    }
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Parcelas canceladas." };
}

export async function cancelRecurringGroup(
  id: string,
  ruleId: string,
  scope: "this" | "this_and_following"
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();

  if (scope === "this") {
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("workspace_id", workspace.id);

    if (updateError) {
      return fail(updateError.message);
    }
  } else {
    const { data: current } = await supabase
      .from("transactions")
      .select("transaction_date")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!current) {
      return fail("Transação não encontrada.");
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("recurring_rule_id", ruleId)
      .eq("workspace_id", workspace.id)
      .gte("transaction_date", (current as { transaction_date: string }).transaction_date)
      .neq("status", "cancelled");

    if (updateError) {
      return fail(updateError.message);
    }
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Recorrências canceladas." };
}

export async function deleteTransfer(groupId: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("installment_group_id", groupId)
    .eq("workspace_id", workspace.id)
    .eq("type", "transfer");

  if (deleteError) {
    return fail(deleteError.message);
  }

  revalidateTransactionSurfaces();
  return { ok: true, message: "Transferência removida." };
}
