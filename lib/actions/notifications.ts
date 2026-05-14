"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type { ActionResult } from "@/types/finance";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NotificationPreferencesInput = {
  notifySubscriptionsDue: boolean;
  notifyGoalsLate: boolean;
  notifyBudgetsBlown: boolean;
  daysBeforeSubscription: number;
};

export async function savePushSubscription(
  input: PushSubscriptionInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado." };

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { ok: false, message: "Workspace não encontrado." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth_key: input.auth
    },
    { onConflict: "user_id,workspace_id,endpoint" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado." };

  const workspace = await getCurrentWorkspace();
  if (!workspace) return { ok: false, message: "Workspace não encontrado." };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      workspace_id: workspace.id,
      notify_subscriptions_due: input.notifySubscriptionsDue,
      notify_goals_late: input.notifyGoalsLate,
      notify_budgets_blown: input.notifyBudgetsBlown,
      days_before_subscription: input.daysBeforeSubscription
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Preferências salvas." };
}
