"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/finance";

const COOKIE_NAME = "workspace_id";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365
};

export async function createInitialWorkspace(formData: FormData) {
  const workspaceName = String(formData.get("workspace_name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "BRL").trim() || "BRL";

  if (workspaceName.length < 2) {
    redirect("/onboarding?error=workspace_name");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_initial_workspace", {
    workspace_name: workspaceName,
    workspace_currency: currency
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, data as string, COOKIE_OPTIONS);

  redirect("/dashboard");
}

export async function createWorkspace(input: {
  name: string;
  currency?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();

  if (name.length < 2) {
    return { ok: false, message: "O nome precisa ter pelo menos 2 caracteres." };
  }

  const currency = (input.currency ?? "BRL").toUpperCase().slice(0, 3) || "BRL";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_initial_workspace", {
    workspace_name: name,
    workspace_currency: currency
  });

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Não foi possível criar o workspace."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, data as string, COOKIE_OPTIONS);

  revalidatePath("/", "layout");
  return { ok: true, message: "Workspace criado." };
}

export async function switchWorkspace(workspaceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado." };

  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return { ok: false, message: "Workspace não encontrado." };

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, workspaceId, COOKIE_OPTIONS);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function acceptInvitation(formData: FormData): Promise<never> {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/");
  }

  // Use admin client to read invitation by token (bypasses RLS).
  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, workspace_id, invited_email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  const inv = invitation as {
    id: string;
    workspace_id: string;
    invited_email: string;
    role: string;
    status: string;
    expires_at: string;
  } | null;

  if (!inv || inv.status !== "pending" || new Date(inv.expires_at) < new Date()) {
    redirect(`/invite/${token}?error=${encodeURIComponent("Convite inválido ou expirado.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  // Verify user's email matches the invitation.
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const userEmail = (profile as { email: string } | null)?.email?.toLowerCase();

  if (userEmail !== inv.invited_email) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent(`Este convite é para ${inv.invited_email}.`)}`
    );
  }

  // Check if already a member (idempotent).
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", inv.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await admin.from("workspace_members").insert({
      workspace_id: inv.workspace_id,
      user_id: user.id,
      role: inv.role
    });

    if (insertError) {
      redirect(
        `/invite/${token}?error=${encodeURIComponent(insertError.message)}`
      );
    }
  }

  // Mark invitation as accepted.
  await admin
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  // Set the accepted workspace as active.
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, inv.workspace_id, COOKIE_OPTIONS);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
