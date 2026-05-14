import { redirect } from "next/navigation";
import { AccountsClient } from "@/components/accounts/accounts-client";
import { getAccounts } from "@/lib/queries/accounts";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

export default async function AccountsPage() {
  const [workspace, accounts] = await Promise.all([
    getCurrentWorkspace(),
    getAccounts()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <AccountsClient
      accounts={accounts}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
    />
  );
}
