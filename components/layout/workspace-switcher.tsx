import { getCurrentWorkspace, getUserWorkspaces } from "@/lib/queries/workspaces";
import { WorkspaceSwitcherClient } from "./workspace-switcher-client";

export async function WorkspaceSwitcher() {
  const [current, workspaces] = await Promise.all([
    getCurrentWorkspace(),
    getUserWorkspaces()
  ]);

  return <WorkspaceSwitcherClient current={current} workspaces={workspaces} />;
}
