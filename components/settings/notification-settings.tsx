"use client";

import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  removePushSubscription,
  savePushSubscription,
  updateNotificationPreferences
} from "@/lib/actions/notifications";
import type { NotificationPreferences } from "@/types/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type NotificationSettingsProps = {
  initialPreferences: NotificationPreferences | null;
};

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationSettings({
  initialPreferences
}: NotificationSettingsProps) {
  const [permission, setPermission] = React.useState<
    NotificationPermission | "unsupported"
  >("default");
  const [subscription, setSubscription] =
    React.useState<PushSubscription | null>(null);
  const [isSubscribing, startSubscribing] = React.useTransition();
  const [isSaving, startSaving] = React.useTransition();

  const [prefs, setPrefs] = React.useState({
    notifySubscriptionsDue:
      initialPreferences?.notify_subscriptions_due ?? true,
    notifyGoalsLate: initialPreferences?.notify_goals_late ?? true,
    notifyBudgetsBlown: initialPreferences?.notify_budgets_blown ?? true,
    daysBeforeSubscription:
      initialPreferences?.days_before_subscription ?? 7
  });

  React.useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then(setSubscription);
    });
  }, []);

  function handleSubscribe() {
    startSubscribing(async () => {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Push não configurado neste ambiente.");
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Permissão negada pelo navegador.");
        return;
      }

      let sub: PushSubscription;
      try {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      } catch {
        toast.error("Não foi possível ativar as notificações.");
        return;
      }

      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? ""
      });

      if (!result.ok) {
        toast.error(result.message ?? "Erro ao salvar subscrição.");
        await sub.unsubscribe();
        return;
      }

      setSubscription(sub);
      toast.success("Notificações push ativadas.");
    });
  }

  function handleUnsubscribe() {
    startSubscribing(async () => {
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await removePushSubscription(endpoint);
      setSubscription(null);
      setPermission("default");
      toast.success("Notificações push desativadas.");
    });
  }

  function handleSavePreferences() {
    startSaving(async () => {
      const result = await updateNotificationPreferences(prefs);

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível salvar.");
        return;
      }

      toast.success(result.message ?? "Preferências salvas.");
    });
  }

  if (permission === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador não suporta notificações push.
      </p>
    );
  }

  const isActive = !!subscription && permission === "granted";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Status neste dispositivo</p>
          <p className="text-sm text-muted-foreground">
            {isActive
              ? "Notificações push ativas."
              : "Receba alertas financeiros mesmo com o app fechado."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && <Badge variant="secondary">Ativa</Badge>}
          <Button
            type="button"
            variant={isActive ? "outline" : "default"}
            size="sm"
            disabled={isSubscribing}
            onClick={isActive ? handleUnsubscribe : handleSubscribe}
          >
            {isActive ? (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Desativar
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Ativar notificações
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Quando notificar</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="notify-subscriptions"
                className="text-sm font-normal"
              >
                Assinaturas prestes a vencer
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  className="h-7 w-16 text-xs"
                  value={prefs.daysBeforeSubscription}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      daysBeforeSubscription: Math.max(
                        1,
                        Math.min(30, Number(e.target.value))
                      )
                    }))
                  }
                  disabled={!prefs.notifySubscriptionsDue}
                />
                <span className="text-xs text-muted-foreground">
                  dias de antecedência
                </span>
              </div>
            </div>
            <Switch
              id="notify-subscriptions"
              checked={prefs.notifySubscriptionsDue}
              onCheckedChange={(v: boolean) =>
                setPrefs((p) => ({ ...p, notifySubscriptionsDue: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label
              htmlFor="notify-goals"
              className="text-sm font-normal"
            >
              Metas atrasadas ou sem progresso
            </Label>
            <Switch
              id="notify-goals"
              checked={prefs.notifyGoalsLate}
              onCheckedChange={(v: boolean) =>
                setPrefs((p) => ({ ...p, notifyGoalsLate: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label
              htmlFor="notify-budgets"
              className="text-sm font-normal"
            >
              Orçamentos estourados
            </Label>
            <Switch
              id="notify-budgets"
              checked={prefs.notifyBudgetsBlown}
              onCheckedChange={(v: boolean) =>
                setPrefs((p) => ({ ...p, notifyBudgetsBlown: v }))
              }
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={handleSavePreferences}
        >
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
