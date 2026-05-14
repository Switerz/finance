import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const e2eSecret = process.env.E2E_SECRET!;
  const testEmail = process.env.E2E_TEST_EMAIL!;

  // ── 1. Authenticate via the test API route ────────────────────────────────
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  const response = await page.request.post("/api/e2e-auth", {
    headers: { "x-e2e-secret": e2eSecret },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`E2E auth failed (${response.status()}): ${body}`);
  }

  // Save storageState (cookies) so test projects can reuse it.
  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, "user.json") });

  await browser.close();

  // ── 2. Ensure test workspace + seed data via admin client ─────────────────
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve test user id.
  const { data: users } = await admin.auth.admin.listUsers();
  const testUser = users?.users?.find((u) => u.email === testEmail);
  if (!testUser) return; // Should not happen after step 1.

  const userId = testUser.id;

  // Check if the test user already has a workspace.
  const { data: existing } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  let workspaceId: string;

  if (existing?.workspace_id) {
    workspaceId = existing.workspace_id;
  } else {
    // Create workspace directly (RPC requires a DB session).
    const { data: ws, error: wsError } = await admin
      .from("workspaces")
      .insert({ name: "E2E Workspace", owner_id: userId, currency: "BRL" })
      .select("id")
      .single();

    if (wsError || !ws) throw new Error(`Failed to create workspace: ${wsError?.message}`);
    workspaceId = ws.id;

    // Add owner to workspace_members.
    await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    });

    // Also create a profile row if it doesn't exist yet.
    await admin.from("profiles").upsert(
      { id: userId, email: testEmail, full_name: "E2E User" },
      { onConflict: "id" }
    );
  }

  // Clean up budgets so "cria orçamento" tests are idempotent across runs.
  await admin.from("budgets").delete().eq("workspace_id", workspaceId);

  // Ensure at least one account exists for the transaction tests.
  const { data: accounts } = await admin
    .from("accounts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (!accounts?.length) {
    await admin.from("accounts").insert({
      workspace_id: workspaceId,
      name: "Conta Principal",
      type: "checking",
      initial_balance: 0,
      current_balance: 0,
      is_active: true,
    });
  }

  // Ensure at least one expense category exists for the transaction / budget tests.
  const { data: categories } = await admin
    .from("categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", "expense")
    .limit(1);

  if (!categories?.length) {
    await admin.from("categories").insert([
      {
        workspace_id: workspaceId,
        name: "Alimentação",
        type: "expense",
        color: "#ef4444",
        is_active: true,
      },
      {
        workspace_id: workspaceId,
        name: "Salário",
        type: "income",
        color: "#22c55e",
        is_active: true,
      },
    ]);
  }
}
