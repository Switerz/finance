// Supabase Edge Function — send-notifications
// Cron: todo domingo às 09:00 UTC (configurar em supabase/config.toml ou no dashboard)
//
// Env vars necessárias:
//   SUPABASE_URL              — injectada automaticamente pelo Supabase
//   SUPABASE_SERVICE_ROLE_KEY — injectada automaticamente pelo Supabase
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT             — ex: mailto:suporte@seuapp.com

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:suporte@financeplanner.app";

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

async function sendPush(
  endpoint: string,
  p256dh: string,
  authKey: string,
  payload: PushPayload
): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth: authKey } },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "gone";
    console.error("Push error:", err);
    return "error";
  }
}

Deno.serve(async (req) => {
  // Aceita POST autenticado com o service role key no header Authorization.
  // O Supabase cron injeta isso automaticamente.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const stats = { sent: 0, gone: 0, errors: 0 };

  // Busca todas as subscrições com preferências ativas
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select(
      "id, endpoint, p256dh, auth_key, workspace_id, user_id"
    );

  if (subsError || !subs?.length) {
    return new Response(
      JSON.stringify({ message: "No subscriptions", stats }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  for (const sub of subs) {
    // Busca as preferências deste utilizador+workspace
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select(
        "notify_subscriptions_due, notify_goals_late, notify_budgets_blown, days_before_subscription"
      )
      .eq("user_id", sub.user_id)
      .eq("workspace_id", sub.workspace_id)
      .maybeSingle();

    // Se não há preferências, usa os padrões (tudo ativo, 7 dias)
    const notifySubsDue = prefs?.notify_subscriptions_due ?? true;
    const notifyGoals = prefs?.notify_goals_late ?? true;
    const notifyBudgets = prefs?.notify_budgets_blown ?? true;
    const daysBefore = prefs?.days_before_subscription ?? 7;

    const notifications: PushPayload[] = [];

    // ── Assinaturas vencendo ────────────────────────────────────────────────
    if (notifySubsDue) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysBefore);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      const { data: dueSubs } = await admin
        .from("subscriptions")
        .select("name, next_billing_date")
        .eq("workspace_id", sub.workspace_id)
        .eq("status", "active")
        .lte("next_billing_date", dueDateStr)
        .gte("next_billing_date", today);

      if (dueSubs?.length) {
        notifications.push({
          title: "Assinatura vencendo",
          body:
            dueSubs.length === 1
              ? `${dueSubs[0].name} vence em breve.`
              : `${dueSubs.length} assinaturas vencem nos próximos dias.`,
          url: "/subscriptions",
          tag: "subscriptions-due"
        });
      }
    }

    // ── Metas atrasadas ────────────────────────────────────────────────────
    if (notifyGoals) {
      const { data: lateGoals } = await admin
        .from("goals")
        .select("name")
        .eq("workspace_id", sub.workspace_id)
        .eq("status", "active")
        .lt("deadline", today);

      if (lateGoals?.length) {
        notifications.push({
          title: "Meta atrasada",
          body:
            lateGoals.length === 1
              ? `A meta "${lateGoals[0].name}" está atrasada.`
              : `${lateGoals.length} metas estão atrasadas.`,
          url: "/goals",
          tag: "goals-late"
        });
      }
    }

    // ── Orçamentos estourados ──────────────────────────────────────────────
    if (notifyBudgets) {
      const currentMonth = today.slice(0, 7);

      // Usa a view ou RPC se disponível; fallback para query simples
      const { data: blown } = await admin
        .from("budgets")
        .select("id, planned_amount, realized_amount")
        .eq("workspace_id", sub.workspace_id)
        .eq("month", currentMonth)
        .not("realized_amount", "is", null);

      const blownCount = (blown ?? []).filter(
        (b) =>
          typeof b.realized_amount === "number" &&
          typeof b.planned_amount === "number" &&
          b.realized_amount > b.planned_amount
      ).length;

      if (blownCount > 0) {
        notifications.push({
          title: "Orçamento estourado",
          body:
            blownCount === 1
              ? "Um orçamento deste mês foi ultrapassado."
              : `${blownCount} orçamentos deste mês foram ultrapassados.`,
          url: "/budgets",
          tag: "budgets-blown"
        });
      }
    }

    // ── Envia as notificações acumuladas ───────────────────────────────────
    for (const payload of notifications) {
      const result = await sendPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth_key,
        payload
      );

      if (result === "ok") {
        stats.sent++;
      } else if (result === "gone") {
        stats.gone++;
        // Subscrição inválida — remove da base para não reenviar
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        stats.errors++;
      }
    }
  }

  return new Response(JSON.stringify({ message: "Done", stats }), {
    headers: { "Content-Type": "application/json" }
  });
});
