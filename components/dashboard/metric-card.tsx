import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "income" | "expense" | "investment";

const toneClassName: Record<MetricTone, string> = {
  default: "text-foreground",
  income: "text-finance-income",
  expense: "text-finance-expense",
  investment: "text-finance-investment"
};

type MetricCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: MetricTone;
  description?: string;
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "default",
  description
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", toneClassName[tone])} />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-normal">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
