import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/actions/workspaces";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

type InvitationRow = {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  expires_at: string;
  workspaces: { name: string } | { name: string }[] | null;
};

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-xl font-semibold">Convite inválido</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <a href="/dashboard">Ir para o dashboard</a>
      </Button>
    </div>
  );
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;

  const admin = createAdminClient();
  const { data } = await admin
    .from("invitations")
    .select("id, invited_email, role, status, expires_at, workspaces(name)")
    .eq("token", token)
    .maybeSingle();

  const inv = data as InvitationRow | null;
  const workspaceName = inv?.workspaces
    ? Array.isArray(inv.workspaces)
      ? inv.workspaces[0]?.name
      : inv.workspaces.name
    : null;

  const isExpired = inv ? new Date(inv.expires_at) <= new Date() : false;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let userEmail: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    userEmail = (profile as { email: string } | null)?.email ?? null;
  }

  const emailMismatch =
    user && inv && userEmail?.toLowerCase() !== inv.invited_email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      {errorParam ? (
        <ErrorCard message={errorParam} />
      ) : !inv ? (
        <ErrorCard message="Convite não encontrado." />
      ) : inv.status === "accepted" ? (
        <ErrorCard message="Este convite já foi aceito." />
      ) : inv.status === "cancelled" ? (
        <ErrorCard message="Este convite foi cancelado." />
      ) : isExpired ? (
        <ErrorCard message="Este convite expirou." />
      ) : emailMismatch ? (
        <ErrorCard
          message={`Este convite é para ${inv.invited_email}. Você está autenticado como ${userEmail ?? "outro email"}.`}
        />
      ) : !user ? (
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold">Convite para workspace</h1>
          <p className="text-muted-foreground">
            Você foi convidado para{" "}
            <strong>{workspaceName ?? "um workspace"}</strong> como{" "}
            <strong>{inv.role}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Faça login com o email <strong>{inv.invited_email}</strong> para aceitar.
          </p>
          <Button asChild className="w-full">
            <a href={`/login?next=/invite/${token}`}>Fazer login</a>
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold">Convite para workspace</h1>
          <p className="text-muted-foreground">
            Você foi convidado para{" "}
            <strong>{workspaceName ?? "um workspace"}</strong> como{" "}
            <strong>{inv.role}</strong>.
          </p>
          <form action={acceptInvitation}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Aceitar convite
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}
