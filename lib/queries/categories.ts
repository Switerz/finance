import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type { Category, CategoryType } from "@/types/finance";

type CategoryRow = Omit<Category, "type"> & {
  type: CategoryType;
};

export async function getCategories(): Promise<Category[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, workspace_id, name, type, parent_id, color, icon, is_default, is_active, created_at, updated_at"
    )
    .eq("workspace_id", workspace.id)
    .order("type", { ascending: true })
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as CategoryRow[];
}
