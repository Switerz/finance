import { redirect } from "next/navigation";
import { SubscriptionsClient } from "@/components/subscriptions/subscriptions-client";
import {
  getSubscriptionFormOptions,
  getSubscriptions,
  summarizeSubscriptions
} from "@/lib/queries/subscriptions";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

export default async function SubscriptionsPage() {
  const [workspace, subscriptions, options] = await Promise.all([
    getCurrentWorkspace(),
    getSubscriptions(),
    getSubscriptionFormOptions()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <SubscriptionsClient
      subscriptions={subscriptions}
      summary={summarizeSubscriptions(subscriptions)}
      options={options}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
    />
  );
}
