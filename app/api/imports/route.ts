import { NextRequest, NextResponse } from "next/server";
import { commitImportForWorkspace } from "@/lib/imports/processor";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "Autenticação necessária.");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return jsonError(404, "Workspace não encontrado.");
  }

  const result = await commitImportForWorkspace({
    workspace,
    userId: user.id,
    input: body as never
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
