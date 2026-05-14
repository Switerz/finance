export function getWorkspaceMemberAllowlist() {
  return (process.env.WORKSPACE_MEMBER_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowlisted(email: string) {
  const normalized = email.trim().toLowerCase();
  const allowlist = getWorkspaceMemberAllowlist();

  return allowlist.includes(normalized);
}
