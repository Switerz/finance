"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  subscriptionFormSchema,
  subscriptionStatusSchema,
  type SubscriptionFormInput
} from "@/lib/validations/finance";
import type {
  ActionResult,
  BillingCycle,
  SubscriptionStatus
} from "@/types/finance";

type SubscriptionRow = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  category_id: string | null;
  name: string;
  amount: number | string;
  billing_cycle: BillingCycle;
  billing_day: number | null;
  next_billing_date: string | null;
  status: SubscriptionStatus;
};

function fail(message: string, fieldErrors?: ActionResult["fieldErrors"]) {
  return { ok: false, message, fieldErrors } satisfies ActionResult;
}

function revalidateSubscriptionSurfaces() {
  revalidatePath("/subscriptions");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
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

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Math.min(day, lastDay);
}

function addMonthsClamped(date: string, monthOffset: number) {
  const { year, month, day } = parseDateParts(date);
  const target = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;

  return formatDateParts(
    targetYear,
    targetMonth,
    clampDay(targetYear, targetMonth, day)
  );
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function nextDateFromBillingDay(cycle: BillingCycle, billingDay: number) {
  const today = todayDateString();
  const { year, month } = parseDateParts(today);
  const currentMonthDate = formatDateParts(
    year,
    month,
    clampDay(year, month, billingDay)
  );

  if (currentMonthDate >= today) {
    return currentMonthDate;
  }

  return addMonthsClamped(currentMonthDate, cycle === "quarterly" ? 3 : 1);
}

function nextDateAfterBilling(date: string, cycle: BillingCycle) {
  if (cycle === "quarterly") {
    return addMonthsClamped(date, 3);
  }

  if (cycle === "yearly") {
    return addMonthsClamped(date, 12);
  }

  return addMonthsClamped(date, 1);
}

async function validateRelations(
  workspaceId: string,
  accountId: string,
  categoryId: string
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

  if ((category as { type: string }).type !== "expense") {
    return {
      message: "Assinaturas aceitam apenas categorias de despesa.",
      fieldErrors: { categoryId: ["Selecione uma categoria de despesa."] }
    };
  }

  return null;
}

function toPayload(values: ReturnType<typeof subscriptionFormSchema.parse>) {
  const isYearly = values.billingCycle === "yearly";
  const nextBillingDate = isYearly
    ? values.nextBillingDate ?? null
    : nextDateFromBillingDay(values.billingCycle, values.billingDay ?? 1);

  return {
    account_id: values.accountId,
    category_id: values.categoryId,
    name: values.name,
    amount: values.amount,
    billing_cycle: values.billingCycle,
    billing_day: isYearly
      ? parseDateParts(values.nextBillingDate ?? todayDateString()).day
      : values.billingDay,
    next_billing_date: nextBillingDate,
    status: values.status,
    importance: values.importance ?? null,
    website: values.website?.trim() || null,
    notes: values.notes?.trim() || null
  };
}

async function findSubscription(workspaceId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, workspace_id, account_id, category_id, name, amount, billing_cycle, billing_day, next_billing_date, status"
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as SubscriptionRow | null) ?? null;
}

export async function createSubscription(
  input: SubscriptionFormInput
): Promise<ActionResult> {
  const parsed = subscriptionFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos da assinatura.",
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
    parsed.data.categoryId
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("subscriptions").insert({
    ...toPayload(parsed.data),
    workspace_id: workspace.id
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateSubscriptionSurfaces();
  return { ok: true, message: "Assinatura criada." };
}

export async function updateSubscription(
  id: string,
  input: SubscriptionFormInput
): Promise<ActionResult> {
  const parsed = subscriptionFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos da assinatura.",
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
    parsed.data.categoryId
  );

  if (relationError) {
    return fail(relationError.message, relationError.fieldErrors);
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!current) {
    return fail("Assinatura não encontrada.");
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update(toPayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateSubscriptionSurfaces();
  return { ok: true, message: "Assinatura atualizada." };
}

export async function toggleSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
): Promise<ActionResult> {
  const parsed = subscriptionStatusSchema.safeParse(status);

  if (!parsed.success) {
    return fail("Status inválido.");
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateSubscriptionSurfaces();
  return { ok: true, message: "Status da assinatura atualizado." };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (deleteError) {
    return fail(deleteError.message);
  }

  revalidateSubscriptionSurfaces();
  return { ok: true, message: "Assinatura removida." };
}

export async function generateSubscriptionTransaction(
  id: string
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const subscription = await findSubscription(workspace.id, id);

  if (!subscription) {
    return fail("Assinatura não encontrada.");
  }

  if (subscription.status !== "active") {
    return fail("Apenas assinaturas ativas podem gerar cobrança.");
  }

  if (
    !subscription.account_id ||
    !subscription.category_id ||
    !subscription.next_billing_date
  ) {
    return fail("Assinatura sem conta, categoria ou próxima cobrança.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("description", subscription.name)
    .eq("account_id", subscription.account_id)
    .eq("transaction_date", subscription.next_billing_date)
    .eq("status", "scheduled")
    .eq("amount", Number(subscription.amount));

  if (count && count > 0) {
    return fail("Esta cobrança já foi gerada como transação agendada.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error: insertError } = await supabase.from("transactions").insert({
    workspace_id: workspace.id,
    account_id: subscription.account_id,
    category_id: subscription.category_id,
    description: subscription.name,
    amount: Number(subscription.amount),
    type: "expense",
    transaction_date: subscription.next_billing_date,
    competence_month: null,
    payment_method: null,
    status: "scheduled",
    notes: "Cobrança gerada a partir de assinatura.",
    tags: ["assinatura"],
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

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      next_billing_date: nextDateAfterBilling(
        subscription.next_billing_date,
        subscription.billing_cycle
      )
    })
    .eq("id", subscription.id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateSubscriptionSurfaces();
  return { ok: true, message: "Cobrança agendada em transações." };
}
