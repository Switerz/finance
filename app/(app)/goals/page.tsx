import { redirect } from "next/navigation";
import { GoalsClient } from "@/components/goals/goals-client";
import { getGoals, summarizeGoals } from "@/lib/queries/goals";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

export default async function GoalsPage() {
  const [workspace, goals] = await Promise.all([
    getCurrentWorkspace(),
    getGoals()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <GoalsClient
      goals={goals}
      summary={summarizeGoals(goals)}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
    />
  );
}
