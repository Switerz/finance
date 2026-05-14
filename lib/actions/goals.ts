"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  goalFormSchema,
  goalProgressSchema,
  type GoalFormInput,
  type GoalProgressInput
} from "@/lib/validations/finance";
import type { ActionResult } from "@/types/finance";

type GoalCurrentRow = {
  id: string;
  target_amount: number | string;
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

function revalidateGoalSurfaces() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

function toPayload(values: ReturnType<typeof goalFormSchema.parse>) {
  const currentAmount =
    values.status === "completed" ? values.targetAmount : values.currentAmount;

  return {
    name: values.name,
    target_amount: values.targetAmount,
    current_amount: currentAmount,
    deadline: values.deadline ?? null,
    monthly_contribution: values.monthlyContribution ?? null,
    status: values.status
  };
}

async function getGoalForWorkspace(id: string, workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("id, target_amount")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return data as GoalCurrentRow | null;
}

export async function createGoal(input: GoalFormInput): Promise<ActionResult> {
  const parsed = goalFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da meta.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("goals").insert({
    ...toPayload(parsed.data),
    workspace_id: workspace.id
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateGoalSurfaces();
  return { ok: true, message: "Meta criada." };
}

export async function updateGoal(
  id: string,
  input: GoalFormInput
): Promise<ActionResult> {
  const parsed = goalFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da meta.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const current = await getGoalForWorkspace(id, workspace.id);

  if (!current) {
    return fail("Meta não encontrada.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("goals")
    .update(toPayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateGoalSurfaces();
  return { ok: true, message: "Meta atualizada." };
}

export async function updateGoalProgress(
  id: string,
  input: GoalProgressInput
): Promise<ActionResult> {
  const parsed = goalProgressSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Informe um valor atual válido.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const current = await getGoalForWorkspace(id, workspace.id);

  if (!current) {
    return fail("Meta não encontrada.");
  }

  const targetAmount = Number(current.target_amount);

  if (parsed.data.currentAmount > targetAmount) {
    return fail("O valor atual não pode ser maior que o alvo.", {
      currentAmount: ["O valor atual não pode ser maior que o alvo."]
    });
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("goals")
    .update({ current_amount: parsed.data.currentAmount })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateGoalSurfaces();
  return { ok: true, message: "Progresso atualizado." };
}

export async function completeGoal(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const current = await getGoalForWorkspace(id, workspace.id);

  if (!current) {
    return fail("Meta não encontrada.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("goals")
    .update({
      status: "completed",
      current_amount: Number(current.target_amount)
    })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateGoalSurfaces();
  return { ok: true, message: "Meta concluída." };
}

export async function cancelGoal(id: string): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("goals")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateGoalSurfaces();
  return { ok: true, message: "Meta cancelada." };
}
