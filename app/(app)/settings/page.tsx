import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";
import { getSettingsOverview } from "@/lib/queries/settings";

export default async function SettingsPage() {
  const overview = await getSettingsOverview();

  if (!overview.workspace) {
    redirect("/onboarding");
  }

  return <SettingsClient overview={overview} />;
}
