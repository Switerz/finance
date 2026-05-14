import { redirect } from "next/navigation";
import { CategoriesClient } from "@/components/categories/categories-client";
import { getCategories } from "@/lib/queries/categories";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

export default async function CategoriesPage() {
  const [workspace, categories] = await Promise.all([
    getCurrentWorkspace(),
    getCategories()
  ]);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <CategoriesClient
      categories={categories}
      canWrite={workspace.role !== "viewer"}
    />
  );
}
