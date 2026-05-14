import {
  BarChart3,
  CreditCard,
  FileDown,
  Gauge,
  Goal,
  Home,
  Layers3,
  ReceiptText,
  Settings,
  Tags
} from "lucide-react";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  title: string;
  href: Route;
  icon: LucideIcon;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    title: "Visão geral",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Transações", href: "/transactions", icon: ReceiptText }
    ]
  },
  {
    title: "Cadastros",
    items: [
      { title: "Contas", href: "/accounts", icon: CreditCard },
      { title: "Categorias", href: "/categories", icon: Tags },
      { title: "Assinaturas", href: "/subscriptions", icon: Layers3 }
    ]
  },
  {
    title: "Planejamento",
    items: [
      { title: "Orçamentos", href: "/budgets", icon: Gauge },
      { title: "Metas", href: "/goals", icon: Goal },
      { title: "Relatórios", href: "/reports", icon: BarChart3 }
    ]
  },
  {
    title: "Operação",
    items: [
      { title: "Importação", href: "/imports", icon: FileDown },
      { title: "Configurações", href: "/settings", icon: Settings }
    ]
  }
] ;

export const navigationItems = navigationGroups.flatMap((group) => group.items);

export const mobileNavigationItems = [
  navigationGroups[0].items[0],
  navigationGroups[0].items[1],
  navigationGroups[1].items[0],
  navigationGroups[2].items[0]
] as const;
