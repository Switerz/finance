import { Suspense } from "react";
import { MonthSelector } from "@/components/layout/month-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { createClient } from "@/lib/supabase/server";

export async function Topbar() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <WorkspaceSwitcher />
      <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
        <Suspense fallback={<div className="h-10 w-48 rounded-md border" />}>
          <MonthSelector />
        </Suspense>
        <ThemeToggle />
        <UserMenu
          email={user?.email}
          name={user?.user_metadata?.full_name ?? user?.user_metadata?.name}
        />
      </div>
    </header>
  );
}
