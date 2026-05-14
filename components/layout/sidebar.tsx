"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WalletCards } from "lucide-react";
import { navigationGroups } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  workspaceName?: string;
  userEmail?: string;
};

export function Sidebar({ workspaceName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card/95 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <WalletCards className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Finance Planner</p>
          <p className="truncate text-xs text-muted-foreground">
            {workspaceName ?? "Workspace financeiro"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {group.title}
              </p>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t px-5 py-4">
        <p className="truncate text-xs font-medium">
          {workspaceName ?? "Sem workspace"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {userEmail ?? "Sessão ativa"}
        </p>
      </div>
    </aside>
  );
}
