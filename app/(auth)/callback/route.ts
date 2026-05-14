import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkspaceMemberAllowlist,
  isEmailAllowlisted
} from "@/lib/settings/allowlist";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const allowlist = getWorkspaceMemberAllowlist();
      if (allowlist.length > 0) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user?.email || !isEmailAllowlisted(user.email)) {
          const deniedEmail = user?.email ?? "";
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL(
              `/access-denied?email=${encodeURIComponent(deniedEmail)}`,
              request.url
            )
          );
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback", request.url)
  );
}
