import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// This route is only available outside production and requires a shared secret.
// It allows the Playwright global-setup to obtain an authenticated session
// without going through the Google OAuth flow.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.E2E_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "E2E_SECRET not configured" }, { status: 500 });
  }

  if (request.headers.get("x-e2e-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const testEmail = process.env.E2E_TEST_EMAIL!;
  const testPassword = process.env.E2E_TEST_PASSWORD!;

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure test user exists; ignore "already registered" errors.
  const { error: createError } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createError && !createError.message.toLowerCase().includes("already")) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Sign in with password using the anon key.
  const auth = createSupabaseClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: signInError } = await auth.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signInError || !data.session) {
    return NextResponse.json(
      { error: signInError?.message ?? "No session returned" },
      { status: 500 }
    );
  }

  // Write the session into the SSR cookies so the middleware can read them.
  const response = NextResponse.json({ ok: true });

  const serverClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { ...options, sameSite: "lax" });
        });
      },
    },
  });

  await serverClient.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return response;
}
