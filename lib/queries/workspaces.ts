import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type CurrentWorkspace = {
  id: string;
  name: string;
  currency: string;
  role: "owner" | "admin" | "member" | "viewer";
};

type WorkspaceMemberRow = {
  role: CurrentWorkspace["role"];
  workspaces:
    | {
        id: string;
        name: string;
        currency: string;
      }
    | {
        id: string;
        name: string;
        currency: string;
      }[]
    | null;
};

function extractWorkspace(row: WorkspaceMemberRow): CurrentWorkspace | null {
  const workspace = Array.isArray(row.workspaces)
    ? row.workspaces[0]
    : row.workspaces;

  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    currency: workspace.currency,
    role: row.role
  };
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, currency)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) return null;

  const rows = data as WorkspaceMemberRow[];

  // Respect the active workspace cookie if it points to a workspace the user belongs to.
  const cookieStore = await cookies();
  const activeId = cookieStore.get("workspace_id")?.value;

  if (activeId) {
    const found = rows.find((r) => {
      const ws = Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces;
      return ws?.id === activeId;
    });
    if (found) return extractWorkspace(found);
  }

  return extractWorkspace(rows[0]);
}

export async function getUserWorkspaces(): Promise<CurrentWorkspace[]> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, currency)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as WorkspaceMemberRow[]).flatMap((row) => {
    const ws = extractWorkspace(row);
    return ws ? [ws] : [];
  });
}
