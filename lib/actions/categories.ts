"use server";

import { revalidatePath } from "next/cache";
import { defaultCategories } from "@/lib/constants/finance";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  categoryFormSchema,
  type CategoryFormInput
} from "@/lib/validations/finance";
import type { ActionResult, Category } from "@/types/finance";

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

async function validateParent(
  workspaceId: string,
  parentId: string | undefined,
  type: Category["type"],
  currentCategoryId?: string
) {
  if (!parentId) {
    return null;
  }

  if (parentId === currentCategoryId) {
    return "A categoria não pode ser pai dela mesma.";
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, type")
    .eq("id", parentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return "Categoria pai não encontrada neste workspace.";
  }

  if ((data as Pick<Category, "type">).type !== type) {
    return "A categoria pai precisa ter o mesmo tipo.";
  }

  return null;
}

function toCategoryPayload(values: ReturnType<typeof categoryFormSchema.parse>) {
  return {
    name: values.name,
    type: values.type,
    parent_id: values.parentId ?? null,
    color: values.color || null,
    icon: values.icon || null,
    is_active: values.isActive
  };
}

export async function createCategory(
  input: CategoryFormInput
): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da categoria.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const parentError = await validateParent(
    workspace.id,
    parsed.data.parentId,
    parsed.data.type
  );

  if (parentError) {
    return fail(parentError, { parentId: [parentError] });
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("categories").insert({
    ...toCategoryPayload(parsed.data),
    workspace_id: workspace.id,
    is_default: false
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidatePath("/categories");
  return { ok: true, message: "Categoria criada." };
}

export async function updateCategory(
  id: string,
  input: CategoryFormInput
): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos da categoria.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const parentError = await validateParent(
    workspace.id,
    parsed.data.parentId,
    parsed.data.type,
    id
  );

  if (parentError) {
    return fail(parentError, { parentId: [parentError] });
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("categories")
    .update(toCategoryPayload(parsed.data))
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidatePath("/categories");
  return { ok: true, message: "Categoria atualizada." };
}

export async function toggleCategoryActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidatePath("/categories");
  return {
    ok: true,
    message: isActive ? "Categoria reativada." : "Categoria desativada."
  };
}

export async function seedDefaultCategories(): Promise<ActionResult> {
  const { workspace, error } = await getWritableWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  if (count && count > 0) {
    return fail("Este workspace já possui categorias cadastradas.");
  }

  const { error: insertError } = await supabase.from("categories").insert(
    defaultCategories.map((category) => ({
      workspace_id: workspace.id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      is_default: true,
      is_active: true
    }))
  );

  if (insertError) {
    return fail(insertError.message);
  }

  revalidatePath("/categories");
  return { ok: true, message: "Categorias padrão criadas." };
}
