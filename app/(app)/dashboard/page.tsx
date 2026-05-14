import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { KpiSection } from "@/components/dashboard/kpi-section";
import { getDashboardSummary } from "@/lib/queries/transactions";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";

type DashboardPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

function KpiSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams
}: DashboardPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  // Don't await — passed to child server components so they stream independently.
  const summaryPromise = getDashboardSummary(params?.month);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva do mês selecionado com dados pagos, projeções e
            alertas.
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions">Nova transação</Link>
        </Button>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection summaryPromise={summaryPromise} currency={workspace.currency} />
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsSection summaryPromise={summaryPromise} currency={workspace.currency} />
      </Suspense>
    </div>
  );
}
