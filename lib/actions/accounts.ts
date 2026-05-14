"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import { accountFormSchema, type AccountFormInput } from "@/lib/validations/finance";
import type { ActionResult } from "@/types/finance";

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

function toAccountPayload(values: ReturnType<typeof accountFormSchema.parse>) {
  const isCreditCard = values.type === "credit_card";

  return {
    name: values.name,
    type: values.type,
    institution: values.institution?.trim() || null,
    initial_balance: values.initialBalance,
    current_balance: values.initialBalance,
    credit_limit: isCreditCard ? values.creditLimit ?? null : null,
    closing_day: isCreditCard ? values.closingDay ?? null : null,
    due_day: isCreditCard ? values.dueDay ?? null : null,
    is_active: values.isActive
  };
}

export async function createAccount(input: AccountFormInput): Promise<ActionResult> {
  const parsed = accountFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da conta.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("accounts").insert({
    ...toAccountPayload(parsed.data),
    workspace_id: workspace.id
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidatePath("/accounts");
  return { ok: true, message: "Conta criada." };
}

export async function updateAccount(
  id: string,
  input: AccountFormInput
): Promise<ActionResult> {
  const parsed = accountFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da conta.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("accounts")
    .update(toAccountPayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidatePath("/accounts");
  return { ok: true, message: "Conta atualizada." };
}

export async function toggleAccountActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("accounts")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidatePath("/accounts");
  return {
    ok: true,
    message: isActive ? "Conta reativada." : "Conta desativada."
  };
}

export async function createDefaultAccount(): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  if (count && count > 0) {
    return fail("Este workspace já possui contas cadastradas.");
  }

  const { error: insertError } = await supabase.from("accounts").insert({
    workspace_id: workspace.id,
    name: "Conta principal",
    type: "checking",
    initial_balance: 0,
    current_balance: 0,
    is_active: true
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidatePath("/accounts");
  return { ok: true, message: "Conta principal criada." };
}
