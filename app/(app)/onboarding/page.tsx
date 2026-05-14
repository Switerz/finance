import { redirect } from "next/navigation";
import { WalletCards } from "lucide-react";
import { createInitialWorkspace } from "@/lib/actions/workspaces";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const workspace = await getCurrentWorkspace();

  if (workspace) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Primeiro workspace"
        description="Crie a carteira financeira que vai concentrar contas, categorias e lançamentos."
      />
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Carteira principal</CardTitle>
            <CardDescription>
              Você pode renomear e convidar membros depois.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={createInitialWorkspace} className="space-y-5">
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Não foi possível criar o workspace. Revise o nome e tente
                novamente.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="workspace_name">Nome do workspace</Label>
              <Input
                id="workspace_name"
                name="workspace_name"
                placeholder="Finanças da família"
                defaultValue="Minhas finanças"
                minLength={2}
                required
              />
            </div>
            <input type="hidden" name="currency" value="BRL" />
            <Button type="submit">Criar workspace</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
