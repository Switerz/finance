"use server";

import { revalidatePath } from "next/cache";
import {
  getBudgetFormOptions,
  previousMonthDate
} from "@/lib/queries/budgets";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  budgetCopySchema,
  budgetFormSchema,
  type BudgetCopyInput,
  type BudgetFormInput
} from "@/lib/validations/finance";
import type { ActionResult, CategoryType } from "@/types/finance";

type ExistingBudgetRow = {
  id: string;
  category_id: string;
  planned_amount: number | string;
  alert_threshold: number | string;
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

function revalidateBudgetSurfaces() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

async function validateBudgetCategory(
  workspaceId: string,
  categoryId: string
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, type")
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return "Selecione uma categoria ativa deste workspace.";
  }

  const type = (data as { type: CategoryType }).type;

  if (type !== "expense" && type !== "investment") {
    return "Orçamentos aceitam apenas categorias de despesa ou investimento.";
  }

  return null;
}

function toPayload(values: ReturnType<typeof budgetFormSchema.parse>) {
  return {
    category_id: values.categoryId,
    month: values.month,
    planned_amount: values.plannedAmount,
    alert_threshold: values.alertThreshold
  };
}

export async function createBudget(input: BudgetFormInput): Promise<ActionResult> {
  const parsed = budgetFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos do orçamento.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const categoryError = await validateBudgetCategory(
    workspace.id,
    parsed.data.categoryId
  );

  if (categoryError) {
    return fail(categoryError, { categoryId: [categoryError] });
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("category_id", parsed.data.categoryId)
    .eq("month", parsed.data.month);

  if (count && count > 0) {
    return fail("Esta categoria já possui orçamento neste mês.", {
      categoryId: ["Esta categoria já possui orçamento neste mês."]
    });
  }

  const { error: insertError } = await supabase.from("budgets").insert({
    ...toPayload(parsed.data),
    workspace_id: workspace.id
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateBudgetSurfaces();
  return { ok: true, message: "Orçamento criado." };
}

export async function updateBudget(
  id: string,
  input: BudgetFormInput
): Promise<ActionResult> {
  const parsed = budgetFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos do orçamento.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const categoryError = await validateBudgetCategory(
    workspace.id,
    parsed.data.categoryId
  );

  if (categoryError) {
    return fail(categoryError, { categoryId: [categoryError] });
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!current) {
    return fail("Orçamento não encontrado.");
  }

  const { count } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("category_id", parsed.data.categoryId)
    .eq("month", parsed.data.month)
    .neq("id", id);

  if (count && count > 0) {
    return fail("Esta categoria já possui orçamento neste mês.", {
      categoryId: ["Esta categoria já possui orçamento neste mês."]
    });
  }

  const { error: updateError } = await supabase
    .from("budgets")
    .update(toPayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateBudgetSurfaces();
  return { ok: true, message: "Orçamento atualizado." };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (deleteError) {
    return fail(deleteError.message);
  }

  revalidateBudgetSurfaces();
  return { ok: true, message: "Orçamento removido." };
}

export async function copyPreviousMonthBudgets(
  input: BudgetCopyInput
): Promise<ActionResult> {
  const parsed = budgetCopySchema.safeParse(input);

  if (!parsed.success) {
    return fail("Informe um mês válido.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const currentMonth = parsed.data.month;
  const previousMonth = previousMonthDate(currentMonth);
  const supabase = await createClient();
  const [{ data: previousBudgets }, { data: currentBudgets }, options] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("id, category_id, planned_amount, alert_threshold")
        .eq("workspace_id", workspace.id)
        .eq("month", previousMonth),
      supabase
        .from("budgets")
        .select("category_id")
        .eq("workspace_id", workspace.id)
        .eq("month", currentMonth),
      getBudgetFormOptions()
    ]);

  const activeCategoryIds = new Set(
    options.categories.map((category) => category.id)
  );
  const existingCategoryIds = new Set(
    (currentBudgets ?? []).map((budget) => (budget as { category_id: string }).category_id)
  );
  const rowsToInsert = ((previousBudgets ?? []) as ExistingBudgetRow[])
    .filter(
      (budget) =>
        activeCategoryIds.has(budget.category_id) &&
        !existingCategoryIds.has(budget.category_id)
    )
    .map((budget) => ({
      workspace_id: workspace.id,
      category_id: budget.category_id,
      month: currentMonth,
      planned_amount: Number(budget.planned_amount),
      alert_threshold: Number(budget.alert_threshold)
    }));

  if (!rowsToInsert.length) {
    return fail("Não há orçamentos novos para copiar do mês anterior.");
  }

  const { error: insertError } = await supabase
    .from("budgets")
    .insert(rowsToInsert);

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateBudgetSurfaces();
  return {
    ok: true,
    message:
      rowsToInsert.length === 1
        ? "1 orçamento copiado."
        : `${rowsToInsert.length} orçamentos copiados.`
  };
}
