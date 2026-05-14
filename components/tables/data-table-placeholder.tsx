import { Skeleton } from "@/components/ui/skeleton";

export function DataTablePlaceholder() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
