import { redirect } from "next/navigation";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import { getRecurringRules } from "@/lib/queries/recurring-rules";
import {
  getTransactionFormOptions,
  getTransactions
} from "@/lib/queries/transactions";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

type TransactionsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function TransactionsPage({
  searchParams
}: TransactionsPageProps) {
  const params = await searchParams;
  const [workspace, transactions, recurringRules, options] = await Promise.all([
    getCurrentWorkspace(),
    getTransactions({ month: params?.month }),
    getRecurringRules(),
    getTransactionFormOptions()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <TransactionsClient
      transactions={transactions}
      recurringRules={recurringRules}
      options={options}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
    />
  );
}
