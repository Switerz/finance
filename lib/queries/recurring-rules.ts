import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  ManualTransactionType,
  RecurringFrequency,
  RecurringRule
} from "@/types/finance";

type RecurringRuleRow = Omit<
  RecurringRule,
  "amount" | "type" | "frequency" | "account_name" | "category_name" | "category_color"
> & {
  amount: number | string;
  type: ManualTransactionType;
  frequency: RecurringFrequency;
  accounts: { name: string } | { name: string }[] | null;
  categories:
    | { name: string; color: string | null }
    | { name: string; color: string | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapRecurringRule(row: RecurringRuleRow): RecurringRule {
  const account = firstRelation(row.accounts);
  const category = firstRelation(row.categories);

  return {
    ...row,
    amount: Number(row.amount),
    account_name: account?.name ?? null,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null
  };
}

export async function getRecurringRules(): Promise<RecurringRule[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select(
      "id, workspace_id, account_id, category_id, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, created_at, updated_at, accounts(name), categories(name, color)"
    )
    .eq("workspace_id", workspace.id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as RecurringRuleRow[]).map(mapRecurringRule);
}
