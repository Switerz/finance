"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  addWorkspaceMemberSchema,
  deleteWorkspaceSchema,
  profileSettingsSchema,
  workspaceMemberRoleSchema,
  workspaceSettingsSchema,
  type AddWorkspaceMemberInput,
  type DeleteWorkspaceInput,
  type ProfileSettingsInput,
  type WorkspaceMemberRoleInput,
  type WorkspaceSettingsInput
} from "@/lib/validations/settings";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type { ActionResult, InvitationRole, WorkspaceRole } from "@/types/finance";

function fail(message: string, fieldErrors?: ActionResult["fieldErrors"]) {
  return { ok: false, message, fieldErrors } satisfies ActionResult;
}

async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

async function getAdminWorkspace() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return { workspace: null, error: "Workspace não encontrado." };
  }

  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return {
      workspace: null,
      error: "Seu papel neste workspace não permite gerenciar configurações."
    };
  }

  return { workspace, error: null };
}

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function updateProfile(
  input: ProfileSettingsInput
): Promise<ActionResult> {
  const parsed = profileSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os campos do perfil.", parsed.error.flatten().fieldErrors);
  }

  const user = await getSessionUser();

  if (!user) {
    return fail("Autenticação necessária.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName?.trim() || null,
      avatar_url: parsed.data.avatarUrl?.trim() || null
    })
    .eq("id", user.id);

  if (error) {
    return fail(error.message);
  }

  revalidateSettingsSurfaces();
  return { ok: true, message: "Perfil atualizado." };
}

export async function updateWorkspace(
  input: WorkspaceSettingsInput
): Promise<ActionResult> {
  const parsed = workspaceSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return fail(
      "Revise os campos do workspace.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("workspaces")
    .update({
      name: parsed.data.name,
      currency: parsed.data.currency
    })
    .eq("id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateSettingsSurfaces();
  return { ok: true, message: "Workspace atualizado." };
}

export async function addWorkspaceMemberByEmail(
  input: AddWorkspaceMemberInput
): Promise<ActionResult> {
  const parsed = addWorkspaceMemberSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise os dados do membro.", parsed.error.flatten().fieldErrors);
  }

  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  let profile: { id: string; email: string | null } | null = null;

  try {
    const admin = createAdminClient();
    const { data, error: findError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (findError) {
      return fail(findError.message);
    }

    profile = data as { id: string; email: string | null } | null;
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Não foi possível usar a chave server-side."
    );
  }

  if (!profile) {
    return fail("Profile não encontrado. O usuário precisa fazer login uma vez.");
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    return fail("Este usuário já é membro do workspace.");
  }

  const { error: insertError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: profile.id,
    role: parsed.data.role
  });

  if (insertError) {
    return fail(insertError.message);
  }

  revalidateSettingsSurfaces();
  return { ok: true, message: "Membro adicionado." };
}

export async function createInvitation(input: {
  email: string;
  role: InvitationRole;
}): Promise<ActionResult & { token?: string }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Informe um email válido.");
  }

  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return fail("Autenticação necessária.");

  // Check for existing pending invitation.
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return fail("Já existe um convite pendente para este email.");
  }

  // Check if user is already a member.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profile) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", (profile as { id: string }).id)
      .maybeSingle();

    if (member) {
      return fail("Este usuário já é membro do workspace.");
    }
  }

  const { data: invitation, error: insertError } = await supabase
    .from("invitations")
    .insert({
      workspace_id: workspace.id,
      invited_email: email,
      invited_by: user.id,
      role: input.role
    })
    .select("token")
    .single();

  if (insertError || !invitation) {
    return {
      ok: false,
      message: insertError?.message ?? "Não foi possível criar o convite."
    };
  }

  revalidatePath("/settings");
  return {
    ok: true,
    message: "Convite criado.",
    token: (invitation as { token: string }).token
  };
}

export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidatePath("/settings");
  return { ok: true, message: "Convite cancelado." };
}

export async function updateWorkspaceMemberRole(
  memberId: string,
  role: WorkspaceMemberRoleInput
): Promise<ActionResult> {
  const parsed = workspaceMemberRoleSchema.safeParse(role);

  if (!parsed.success) {
    return fail("Papel inválido.");
  }

  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!member) {
    return fail("Membro não encontrado.");
  }

  if ((member as { role: WorkspaceRole }).role === "owner") {
    return fail("O owner não pode ter o papel alterado.");
  }

  const { error: updateError } = await supabase
    .from("workspace_members")
    .update({ role: parsed.data })
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);

  if (updateError) {
    return fail(updateError.message);
  }

  revalidateSettingsSurfaces();
  return { ok: true, message: "Papel atualizado." };
}

export async function removeWorkspaceMember(memberId: string): Promise<ActionResult> {
  const { workspace, error } = await getAdminWorkspace();

  if (!workspace) {
    return fail(error ?? "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!member) {
    return fail("Membro não encontrado.");
  }

  if ((member as { role: WorkspaceRole }).role === "owner") {
    return fail("O owner não pode ser removido.");
  }

  const { error: deleteError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspace.id);

  if (deleteError) {
    return fail(deleteError.message);
  }

  revalidateSettingsSurfaces();
  return { ok: true, message: "Membro removido." };
}

export async function deleteCurrentWorkspace(input: DeleteWorkspaceInput) {
  const parsed = deleteWorkspaceSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Confirme o nome do workspace.", parsed.error.flatten().fieldErrors);
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return fail("Workspace não encontrado.");
  }

  if (workspace.role !== "owner") {
    return fail("Apenas o owner pode excluir o workspace.");
  }

  if (parsed.data.confirmationName !== workspace.name) {
    return fail("O nome digitado não confere.", {
      confirmationName: ["Digite o nome exatamente como exibido."]
    });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspace.id);

  if (error) {
    return fail(error.message);
  }

  const cookieStore = await cookies();
  cookieStore.delete("workspace_id");

  revalidatePath("/", "layout");
  redirect("/onboarding");
}
