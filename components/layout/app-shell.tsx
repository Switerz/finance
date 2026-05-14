import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentWorkspace()
  ]);
  const user = data.user;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userEmail={user?.email ?? undefined}
        workspaceName={workspace?.name ?? undefined}
      />
      <div className="min-h-screen md:pl-64">
        <Topbar />
        <main
          className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8"
          style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
