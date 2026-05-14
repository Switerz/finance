"use client";

import * as React from "react";
import { addMonths, format, isValid, parse, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function parseMonthParam(value: string | null) {
  if (!value) {
    return new Date();
  }

  const parsed = parse(value, "yyyy-MM", new Date());
  return isValid(parsed) ? parsed : new Date();
}

export function MonthSelector() {
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedMonth = parseMonthParam(searchParams.get("month"));

  function updateMonth(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(date, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  if (!isMounted) {
    return <div className="h-10 w-48 rounded-md border bg-background" />;
  }

  return (
    <div className="flex h-10 items-center rounded-md border bg-background shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-r-none"
        aria-label="Mês anterior"
        onClick={() => updateMonth(subMonths(selectedMonth, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex min-w-[10.5rem] items-center justify-center gap-2 px-2 text-sm font-medium">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="capitalize">
          {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-l-none"
        aria-label="Próximo mês"
        onClick={() => updateMonth(addMonths(selectedMonth, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
