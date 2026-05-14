import Link from "next/link";
import { ShieldX, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AccessDeniedPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <WalletCards className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Finance Planner
          </h1>
        </div>

        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Acesso não autorizado</p>
            {email ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span>{" "}
                não tem permissão para aceder ao Finance Planner.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este email não tem permissão para aceder ao Finance Planner.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Se acreditas que isto é um erro, contacta o administrador.
          </p>

          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Tentar com outra conta</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
