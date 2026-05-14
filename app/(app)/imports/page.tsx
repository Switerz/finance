import { redirect } from "next/navigation";
import { ImportsClient } from "@/components/imports/imports-client";
import { getImportFormOptions, getImports } from "@/lib/queries/imports";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

export default async function ImportsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  const [imports, options] = await Promise.all([
    getImports(),
    getImportFormOptions()
  ]);

  return (
    <ImportsClient
      imports={imports}
      options={options}
      canWrite={workspace.role !== "viewer"}
      currency={workspace.currency}
    />
  );
}
