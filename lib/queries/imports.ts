import { getAccounts } from "@/lib/queries/accounts";
import { getCategories } from "@/lib/queries/categories";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type { ImportFormOptions, ImportRecord, ImportStatus } from "@/types/finance";

type ImportRow = {
  id: string;
  workspace_id: string;
  file_name: string | null;
  source: string | null;
  status: ImportStatus;
  total_rows: number | null;
  processed_rows: number | null;
  created_by: string | null;
  created_at: string;
};

export async function getImports(): Promise<ImportRecord[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imports")
    .select(
      "id, workspace_id, file_name, source, status, total_rows, processed_rows, created_by, created_at"
    )
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ImportRow[];
}

export async function getImportFormOptions(): Promise<ImportFormOptions> {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return {
    accounts: accounts.filter((account) => account.is_active),
    categories: categories.filter(
      (category) => category.is_active && category.type !== "transfer"
    )
  };
}
