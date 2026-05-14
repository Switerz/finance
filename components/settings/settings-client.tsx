"use client";

import * as React from "react";
import { Bell, Download, ShieldAlert, WalletCards } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCurrentWorkspace,
  updateProfile,
  updateWorkspace
} from "@/lib/actions/settings";
import type { ActionResult, SettingsOverview, WorkspaceRole } from "@/types/finance";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsClientProps = {
  overview: SettingsOverview;
};

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
  viewer: "Viewer"
};

function showResult(result: ActionResult, fallbackSuccess: string) {
  if (!result.ok) {
    toast.error(result.message ?? "Não foi possível salvar.");
    return false;
  }

  toast.success(result.message ?? fallbackSuccess);
  return true;
}

export function SettingsClient({ overview }: SettingsClientProps) {
  const [isPending, startTransition] = React.useTransition();
  const [profile, setProfile] = React.useState({
    fullName: overview.profile?.full_name ?? "",
    avatarUrl: overview.profile?.avatar_url ?? ""
  });
  const [workspace, setWorkspace] = React.useState({
    name: overview.workspace?.name ?? "",
    currency: overview.workspace?.currency ?? "BRL"
  });
  const [confirmationName, setConfirmationName] = React.useState("");
  const canAdmin = overview.canAdmin;
  const canDeleteWorkspace = overview.canDeleteWorkspace;
  const workspaceName = overview.workspace?.name ?? "";
  const canConfirmDelete =
    canDeleteWorkspace && confirmationName.trim() === workspaceName;

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await updateProfile(profile).then((result) =>
        showResult(result, "Perfil atualizado.")
      );
    });
  }

  function submitWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await updateWorkspace(workspace).then((result) =>
        showResult(result, "Workspace atualizado.")
      );
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Perfil, workspace, notificações e ações administrativas."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Nome e avatar associados à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      fullName: event.target.value
                    }))
                  }
                  placeholder="Seu nome"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={profile.avatarUrl}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      avatarUrl: event.target.value
                    }))
                  }
                  placeholder="https://..."
                  disabled={isPending}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Email: {overview.profile?.email ?? "Não informado"}
              </p>
              <Button type="submit" disabled={isPending}>
                Salvar perfil
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              Nome e moeda padrão do seu espaço financeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitWorkspace} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Nome</Label>
                  <Input
                    id="workspaceName"
                    value={workspace.name}
                    onChange={(event) =>
                      setWorkspace((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    disabled={!canAdmin || isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspaceCurrency">Moeda</Label>
                  <Input
                    id="workspaceCurrency"
                    value={workspace.currency}
                    onChange={(event) =>
                      setWorkspace((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase()
                      }))
                    }
                    maxLength={3}
                    disabled={!canAdmin || isPending}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  Seu papel:{" "}
                  {overview.workspace ? roleLabels[overview.workspace.role] : "-"}
                </Badge>
                <Button type="submit" disabled={!canAdmin || isPending}>
                  Salvar workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações push
          </CardTitle>
          <CardDescription>
            Alertas financeiros enviados para o dispositivo, mesmo com o app
            fechado. Cada dispositivo precisa ser ativado individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettings
            initialPreferences={overview.notificationPreferences}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportação
            </CardTitle>
            <CardDescription>
              Baixe um backup JSON operacional com os dados do workspace atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inclui contas, categorias, transações, recorrências, assinaturas,
              orçamentos, metas, imports e logs de auditoria.
            </p>
            <Button asChild variant="outline">
              <a href="/api/export?type=workspace&format=json">
                <WalletCards className="mr-2 h-4 w-4" />
                Exportar JSON
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Área de perigo
            </CardTitle>
            <CardDescription>
              A exclusão remove o workspace e todos os dados relacionados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation">
                Digite {workspaceName || "o nome do workspace"}
              </Label>
              <Input
                id="deleteConfirmation"
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                disabled={!canDeleteWorkspace || isPending}
              />
            </div>
            <ConfirmDialog
              title="Excluir workspace definitivamente?"
              description="Esta ação usa cascade no banco e não pode ser desfeita."
              confirmLabel="Excluir workspace"
              variant="destructive"
              onConfirm={async () => {
                const result = await deleteCurrentWorkspace({
                  confirmationName
                });

                if (result) {
                  showResult(result, "Workspace excluído.");
                }
              }}
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canConfirmDelete || isPending}
                >
                  Excluir workspace
                </Button>
              }
            />
            {!canDeleteWorkspace ? (
              <p className="text-sm text-muted-foreground">
                Apenas o owner pode excluir o workspace.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
