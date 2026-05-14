"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  recurringRuleFormSchema,
  type RecurringRuleFormInput
} from "@/lib/validations/finance";
import type {
  ActionResult,
  ManualTransactionType,
  RecurringFrequency
} from "@/types/finance";

type RecurringRuleRow = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number | string;
  type: ManualTransactionType;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  day_of_month: number | null;
  is_active: boolean;
};

function fail(message: string, fieldErrors?: ActionResult["fieldErrors"]) {
  return { ok: false, message, fieldErrors } satisfies ActionResult;
}

function revalidateRecurringSurfaces() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
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
      message: "A categoria precisa ser compatível com o tipo da recorrência.",
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

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Math.min(day, lastDay);
}

function addMonths(date: string, monthOffset: number, dayOfMonth: number) {
  const { year, month } = parseDateParts(date);
  const target = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;

  return formatDateParts(
    targetYear,
    targetMonth,
    clampDay(targetYear, targetMonth, dayOfMonth)
  );
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function frequencyStepMonths(frequency: RecurringFrequency) {
  if (frequency === "quarterly") {
    return 3;
  }

  if (frequency === "yearly") {
    return 12;
  }

  return 1;
}

function occurrenceDates(rule: RecurringRuleRow) {
  const todayMonth = monthStart(new Date().toISOString().slice(0, 10));
  const startMonth = monthStart(rule.start_date);
  const minMonth = startMonth > todayMonth ? startMonth : todayMonth;
  const day = rule.day_of_month ?? parseDateParts(rule.start_date).day;
  const step = frequencyStepMonths(rule.frequency);
  const dates: string[] = [];
  let offset = 0;

  while (dates.length < 12 && offset <= 240) {
    const date = addMonths(startMonth, offset, day);
    offset += step;

    if (date < rule.start_date || date < minMonth) {
      continue;
    }

    if (rule.end_date && date > rule.end_date) {
      break;
    }

    dates.push(date);
  }

  return dates;
}

function toRulePayload(values: ReturnType<typeof recurringRuleFormSchema.parse>) {
  return {
    account_id: values.accountId,
    category_id: values.categoryId,
    description: values.description,
    amount: values.amount,
    type: values.type,
    frequency: values.frequency,
    start_date: values.startDate,
    end_date: values.endDate ?? null,
    day_of_month: values.dayOfMonth ?? parseDateParts(values.startDate).day
  };
}

async function insertMissingOccurrences(rule: RecurringRuleRow) {
  if (!rule.is_active || !rule.account_id || !rule.category_id) {
    return 0;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const dates = occurrenceDates(rule);

  if (!dates.length) {
    return 0;
  }

  const { data: existing } = await supabase
    .from("transactions")
    .select("transaction_date")
    .eq("workspace_id", rule.workspace_id)
    .eq("recurring_rule_id", rule.id)
    .in("transaction_date", dates);
  const existingDates = new Set(
    ((existing ?? []) as { transaction_date: string }[]).map(
      (transaction) => transaction.transaction_date
    )
  );
  const rows = dates
    .filter((date) => !existingDates.has(date))
    .map((date) => ({
      workspace_id: rule.workspace_id,
      account_id: rule.account_id,
      category_id: rule.category_id,
      description: rule.description,
      amount: Number(rule.amount),
      type: rule.type,
      transaction_date: date,
      competence_month: null,
      payment_method: null,
      status: "scheduled",
      notes: null,
      tags: ["recorrente"],
      is_recurring: true,
      recurring_rule_id: rule.id,
      installment_group_id: null,
      installment_number: null,
      installment_total: null,
      created_by: user?.id ?? null
    }));

  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase.from("transactions").insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  return rows.length;
}

async function findRule(workspaceId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_rules")
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, frequency, start_date, end_date, day_of_month, is_active"
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as RecurringRuleRow | null) ?? null;
}

export async function generateRecurringTransactions(
  ruleId: string
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const rule = await findRule(workspace.id, ruleId);

  if (!rule) {
    return fail("Recorrência não encontrada.");
  }

  if (!rule.is_active) {
    return fail("Reative a recorrência antes de gerar lançamentos.");
  }

  try {
    const inserted = await insertMissingOccurrences(rule);
    revalidateRecurringSurfaces();

    return {
      ok: true,
      message:
        inserted === 0
          ? "Nenhum lançamento novo para gerar."
          : `${inserted} lançamentos agendados.`
    };
  } catch (generationError) {
    return fail(
      generationError instanceof Error
        ? generationError.message
        : "Não foi possível gerar os lançamentos."
    );
  }
}

export async function createRecurringRule(
  input: RecurringRuleFormInput
): Promise<ActionResult> {
  const parsed = recurringRuleFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos da recorrência.",
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
  const { data, error: insertError } = await supabase
    .from("recurring_rules")
    .insert({
      ...toRulePayload(parsed.data),
      is_active: true,
      workspace_id: workspace.id
    })
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, frequency, start_date, end_date, day_of_month, is_active"
    )
    .single();

  if (insertError || !data) {
    return fail(insertError?.message ?? "Não foi possível criar a recorrência.");
  }

  try {
    const inserted = await insertMissingOccurrences(data as RecurringRuleRow);
    revalidateRecurringSurfaces();

    return {
      ok: true,
      message: `Recorrência criada. ${inserted} lançamentos agendados.`
    };
  } catch (generationError) {
    return fail(
      generationError instanceof Error
        ? generationError.message
        : "Recorrência criada, mas os lançamentos não foram gerados."
    );
  }
}

export async function updateRecurringRule(
  id: string,
  input: RecurringRuleFormInput
): Promise<ActionResult> {
  const parsed = recurringRuleFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos da recorrência.",
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
  const { data, error: updateError } = await supabase
    .from("recurring_rules")
    .update(toRulePayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, frequency, start_date, end_date, day_of_month, is_active"
    )
    .maybeSingle();

  if (updateError || !data) {
    return fail(updateError?.message ?? "Recorrência não encontrada.");
  }

  try {
    const inserted = await insertMissingOccurrences(data as RecurringRuleRow);
    revalidateRecurringSurfaces();

    return {
      ok: true,
      message:
        inserted === 0
          ? "Recorrência atualizada."
          : `Recorrência atualizada. ${inserted} lançamentos agendados.`
    };
  } catch (generationError) {
    return fail(
      generationError instanceof Error
        ? generationError.message
        : "Recorrência atualizada, mas os lançamentos não foram gerados."
    );
  }
}

export async function toggleRecurringRule(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { data, error: updateError } = await supabase
    .from("recurring_rules")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, frequency, start_date, end_date, day_of_month, is_active"
    )
    .maybeSingle();

  if (updateError || !data) {
    return fail(updateError?.message ?? "Recorrência não encontrada.");
  }

  if (isActive) {
    try {
      await insertMissingOccurrences(data as RecurringRuleRow);
    } catch (generationError) {
      return fail(
        generationError instanceof Error
          ? generationError.message
          : "Recorrência reativada, mas os lançamentos não foram gerados."
      );
    }
  }

  revalidateRecurringSurfaces();
  return {
    ok: true,
    message: isActive ? "Recorrência reativada." : "Recorrência pausada."
  };
}

export async function deleteRecurringRule(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (deleteError) {
    return fail(deleteError.message);
  }

  revalidateRecurringSurfaces();
  return { ok: true, message: "Recorrência removida." };
}
