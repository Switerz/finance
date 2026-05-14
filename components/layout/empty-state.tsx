import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  action
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="max-w-sm space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ?? (actionLabel ? <Button>{actionLabel}</Button> : null)}
      </CardContent>
    </Card>
  );
}
