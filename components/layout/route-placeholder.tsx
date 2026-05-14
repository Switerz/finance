import type { LucideIcon } from "lucide-react";
import { CircleDollarSign } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

type RoutePlaceholderProps = {
  title: string;
  description: string;
  actionLabel: string;
  emptyTitle?: string;
  emptyDescription?: string;
  icon?: LucideIcon;
  checklist?: string[];
};

export function RoutePlaceholder({
  title,
  description,
  actionLabel,
  emptyTitle,
  emptyDescription,
  icon = CircleDollarSign,
  checklist = []
}: RoutePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        <Button>{actionLabel}</Button>
      </PageHeader>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <EmptyState
          icon={icon}
          title={emptyTitle ?? `${title} ainda não configurado`}
          description={
            emptyDescription ??
            "A estrutura visual está pronta para receber dados reais nas próximas etapas."
          }
          actionLabel={actionLabel}
        />
        {checklist.length ? (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold">Próximos recursos</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {checklist.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
