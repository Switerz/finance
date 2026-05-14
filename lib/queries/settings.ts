import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type {
  Invitation,
  NotificationPreferences,
  Profile,
  SettingsOverview,
  WorkspaceMember,
  WorkspaceRole
} from "@/types/finance";

type MemberRow = Omit<WorkspaceMember, "profile" | "role"> & {
  role: WorkspaceRole;
  profiles: Profile | Profile[] | null;
};

type InvitationRow = {
  id: string;
  workspace_id: string;
  invited_email: string;
  invited_by: string;
  token: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return data as Profile;
}

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      "id, workspace_id, user_id, role, created_at, profiles(id, full_name, avatar_url, email, created_at, updated_at)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as MemberRow[]).map((row) => ({
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    profile: firstRelation(row.profiles)
  }));
}

export async function getPendingInvitations(
  workspaceId: string
): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, workspace_id, invited_email, invited_by, token, role, status, expires_at, created_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as InvitationRow[]).map((row) => ({
    id: row.id,
    workspace_id: row.workspace_id,
    invited_email: row.invited_email,
    invited_by: row.invited_by,
    token: row.token,
    role: row.role as Invitation["role"],
    status: row.status as Invitation["status"],
    expires_at: row.expires_at,
    created_at: row.created_at
  }));
}

export async function getNotificationPreferences(
  userId: string,
  workspaceId: string
): Promise<NotificationPreferences | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as NotificationPreferences | null) ?? null;
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return {
      profile: null,
      workspace: null,
      members: [],
      invitations: [],
      canAdmin: false,
      canDeleteWorkspace: false,
      notificationPreferences: null
    };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [profile, members, invitations, notificationPreferences] =
    await Promise.all([
      getCurrentProfile(),
      getWorkspaceMembers(workspace.id),
      getPendingInvitations(workspace.id),
      user
        ? getNotificationPreferences(user.id, workspace.id)
        : Promise.resolve(null)
    ]);

  return {
    profile,
    workspace,
    members,
    invitations,
    canAdmin: workspace.role === "owner" || workspace.role === "admin",
    canDeleteWorkspace: workspace.role === "owner",
    notificationPreferences
  };
}
