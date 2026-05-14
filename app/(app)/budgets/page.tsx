import { redirect } from "next/navigation";
import { BudgetsClient } from "@/components/budgets/budgets-client";
import {
  getBudgetFormOptions,
  getBudgets,
  monthToDate
} from "@/lib/queries/budgets";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

type BudgetsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = await searchParams;
  const month = monthToDate(params?.month);
  const [workspace, budgets, options] = await Promise.all([
    getCurrentWorkspace(),
    getBudgets({ month: params?.month }),
    getBudgetFormOptions()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <BudgetsClient
      budgets={budgets}
      options={options}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
      month={month}
    />
  );
}
