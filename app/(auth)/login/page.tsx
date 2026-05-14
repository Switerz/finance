import { WalletCards } from "lucide-react";
import { signInWithGoogle } from "@/lib/actions/auth";
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

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-2xl">Finance Planner</CardTitle>
            <CardDescription>
              Acesso seguro ao seu planner financeiro.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error === "not_allowed"
                ? "Este email não tem acesso ao Finance Planner."
                : "Não foi possível concluir o login. Tente novamente."}
            </div>
          ) : null}
          <form action={signInWithGoogle}>
            <Button className="w-full" type="submit">
              Entrar com Google
            </Button>
          </form>
          <div className="space-y-2 opacity-60">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Magic link entra em uma próxima etapa"
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
