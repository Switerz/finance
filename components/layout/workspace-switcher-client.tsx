"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createWorkspace, switchWorkspace } from "@/lib/actions/workspaces";
import type { CurrentWorkspace } from "@/lib/queries/workspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const roleLabels: Record<CurrentWorkspace["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
  viewer: "Viewer"
};

type Props = {
  current: CurrentWorkspace | null;
  workspaces: CurrentWorkspace[];
};

export function WorkspaceSwitcherClient({ current, workspaces }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCurrency, setNewCurrency] = React.useState("BRL");
  const [creating, setCreating] = React.useState(false);

  function handleSwitch(workspaceId: string) {
    if (workspaceId === current?.id) return;
    startTransition(async () => {
      const result = await switchWorkspace(workspaceId);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível trocar de workspace.");
      }
    });
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await createWorkspace({ name: newName, currency: newCurrency });
      if (result.ok) {
        toast.success("Workspace criado.");
        setCreateOpen(false);
        setNewName("");
        setNewCurrency("BRL");
        router.push("/dashboard");
      } else {
        toast.error(result.message ?? "Não foi possível criar o workspace.");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto gap-2 px-2 py-1.5"
            disabled={isPending}
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="max-w-[180px] truncate text-sm font-medium">
                {current?.name ?? "Sem workspace"}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {current?.currency ?? "BRL"}
              </span>
            </span>
            {current?.role ? (
              <Badge className="hidden sm:inline-flex" variant="secondary">
                {roleLabels[current.role]}
              </Badge>
            ) : null}
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onSelect={() => handleSwitch(ws.id)}
              className="gap-2"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{ws.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ws.currency} · {roleLabels[ws.role]}
                </span>
              </span>
              {ws.id === current?.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nome</Label>
              <Input
                id="ws-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Finanças da família"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-currency">Moeda</Label>
              <Input
                id="ws-currency"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="BRL"
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || newName.trim().length < 2}
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
