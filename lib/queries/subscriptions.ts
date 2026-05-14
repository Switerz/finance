import { getAccounts } from "@/lib/queries/accounts";
import { getCategories } from "@/lib/queries/categories";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  BillingCycle,
  Subscription,
  SubscriptionFormOptions,
  SubscriptionImportance,
  SubscriptionStatus,
  SubscriptionSummary
} from "@/types/finance";

type SubscriptionRow = Omit<
  Subscription,
  | "amount"
  | "billing_cycle"
  | "status"
  | "importance"
  | "account_name"
  | "category_name"
  | "category_color"
> & {
  amount: number | string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  importance: SubscriptionImportance | null;
  accounts: { name: string } | { name: string }[] | null;
  categories:
    | { name: string; color: string | null }
    | { name: string; color: string | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function monthlyEquivalent(amount: number, cycle: BillingCycle) {
  if (cycle === "quarterly") {
    return amount / 3;
  }

  if (cycle === "yearly") {
    return amount / 12;
  }

  return amount;
}

export function annualizedAmount(amount: number, cycle: BillingCycle) {
  if (cycle === "quarterly") {
    return amount * 4;
  }

  if (cycle === "yearly") {
    return amount;
  }

  return amount * 12;
}

function mapSubscription(row: SubscriptionRow): Subscription {
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

export async function getSubscriptions(): Promise<Subscription[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, workspace_id, account_id, category_id, name, amount, billing_cycle, billing_day, next_billing_date, status, importance, website, notes, created_at, updated_at, accounts(name), categories(name, color)"
    )
    .eq("workspace_id", workspace.id)
    .order("status", { ascending: true })
    .order("next_billing_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as SubscriptionRow[]).map(mapSubscription);
}

export async function getSubscriptionFormOptions(): Promise<SubscriptionFormOptions> {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return {
    accounts: accounts.filter((account) => account.is_active),
    categories: categories.filter(
      (category) => category.is_active && category.type === "expense"
    )
  };
}

export function summarizeSubscriptions(
  subscriptions: Subscription[]
): SubscriptionSummary {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const upcomingLimit = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7)
  )
    .toISOString()
    .slice(0, 10);
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  );
  const upcoming = activeSubscriptions
    .filter(
      (subscription) =>
        subscription.next_billing_date !== null &&
        subscription.next_billing_date >= todayDate &&
        subscription.next_billing_date <= upcomingLimit
    )
    .sort((a, b) =>
      (a.next_billing_date ?? "").localeCompare(b.next_billing_date ?? "")
    );

  return {
    monthlyTotal: activeSubscriptions.reduce(
      (total, subscription) =>
        total + monthlyEquivalent(subscription.amount, subscription.billing_cycle),
      0
    ),
    annualTotal: activeSubscriptions.reduce(
      (total, subscription) =>
        total + annualizedAmount(subscription.amount, subscription.billing_cycle),
      0
    ),
    activeCount: activeSubscriptions.length,
    dispensableCount: activeSubscriptions.filter(
      (subscription) => subscription.importance === "dispensable"
    ).length,
    dispensableMonthlyTotal: activeSubscriptions
      .filter((subscription) => subscription.importance === "dispensable")
      .reduce(
        (total, subscription) =>
          total + monthlyEquivalent(subscription.amount, subscription.billing_cycle),
        0
      ),
    upcomingCount: upcoming.length,
    upcoming: upcoming.slice(0, 5)
  };
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  return summarizeSubscriptions(await getSubscriptions());
}
