"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/callback?next=/onboarding`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url as unknown as Parameters<typeof redirect>[0]);
  }

  redirect("/login?error=oauth_url_missing");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("workspace_id");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
