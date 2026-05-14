"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Power, Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import {
  seedDefaultCategories,
  toggleCategoryActive
} from "@/lib/actions/categories";
import { categoryTypeLabels } from "@/lib/constants/finance";
import type { Category } from "@/types/finance";
import { CategoryForm } from "@/components/forms/category-form";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

type CategoriesClientProps = {
  categories: Category[];
  canWrite: boolean;
};

export function CategoriesClient({
  categories,
  canWrite
}: CategoriesClientProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] =
    React.useState<Category | null>(null);
  const activeCategories = categories.filter((category) => category.is_active);
  const parentCategoryById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  function openCreateSheet() {
    setEditingCategory(null);
    setIsSheetOpen(true);
  }

  function handleSuccess() {
    setIsSheetOpen(false);
    setEditingCategory(null);
    router.refresh();
  }

  async function handleSeedDefaultCategories() {
    const result = await seedDefaultCategories();

    if (!result.ok) {
      toast.error(result.message ?? "Não foi possível criar categorias.");
      return;
    }

    toast.success(result.message ?? "Categorias criadas.");
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Categoria",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full border"
              style={{ backgroundColor: row.original.color ?? "#64748B" }}
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.name}</p>
              {row.original.icon ? (
                <p className="truncate text-xs text-muted-foreground">
                  {row.original.icon}
                </p>
              ) : null}
            </div>
          </div>
        )
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => categoryTypeLabels[row.original.type]
      },
      {
        accessorKey: "parent_id",
        header: "Pai",
        cell: ({ row }) =>
          row.original.parent_id
            ? parentCategoryById.get(row.original.parent_id)?.name ??
              "Categoria removida"
            : "Sem pai"
      },
      {
        accessorKey: "is_default",
        header: "Origem",
        cell: ({ row }) => (
          <Badge variant={row.original.is_default ? "secondary" : "outline"}>
            {row.original.is_default ? "Padrão" : "Manual"}
          </Badge>
        )
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "Ativa" : "Inativa"}
          </Badge>
        )
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: ({ row }) => {
          const category = row.original;

          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canWrite}
                onClick={() => {
                  setEditingCategory(category);
                  setIsSheetOpen(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
              <ConfirmDialog
                title={
                  category.is_active
                    ? "Desativar categoria?"
                    : "Reativar categoria?"
                }
                description={
                  category.is_active
                    ? "A categoria não será excluída e poderá ser reativada depois."
                    : "A categoria voltará a aparecer nos formulários."
                }
                confirmLabel={category.is_active ? "Desativar" : "Reativar"}
                variant={category.is_active ? "destructive" : "default"}
                onConfirm={async () => {
                  const result = await toggleCategoryActive(
                    category.id,
                    !category.is_active
                  );

                  if (!result.ok) {
                    toast.error(
                      result.message ??
                        "Não foi possível atualizar a categoria."
                    );
                    return;
                  }

                  toast.success(result.message ?? "Categoria atualizada.");
                  router.refresh();
                }}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant={category.is_active ? "outline" : "secondary"}
                    disabled={!canWrite}
                  >
                    <Power className="mr-1 h-4 w-4" />
                    {category.is_active ? "Desativar" : "Reativar"}
                  </Button>
                }
              />
            </div>
          );
        }
      }
    ],
    [canWrite, parentCategoryById, router]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Categorias e subcategorias de receitas, despesas e investimentos."
      >
        <Button onClick={openCreateSheet} disabled={!canWrite}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Categorias ativas"
          value={String(activeCategories.length)}
          icon={Tags}
        />
        <MetricCard
          title="Categorias padrão"
          value={String(categories.filter((category) => category.is_default).length)}
          icon={Tags}
        />
        <MetricCard
          title="Subcategorias"
          value={String(categories.filter((category) => category.parent_id).length)}
          icon={Tags}
        />
      </div>

      {categories.length ? (
        <DataTable
          columns={columns}
          data={categories}
          emptyTitle="Nenhuma categoria cadastrada"
          emptyDescription="Crie categorias para classificar receitas, despesas e investimentos."
        />
      ) : (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria cadastrada"
          description="Crie categorias padrão ou cadastre manualmente a estrutura do seu workspace."
          action={
            canWrite ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleSeedDefaultCategories}>
                  Criar categorias padrão
                </Button>
                <Button variant="outline" onClick={openCreateSheet}>
                  Cadastrar manualmente
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? "Editar categoria" : "Nova categoria"}
            </SheetTitle>
            <SheetDescription>
              Use subcategorias para organizar leituras futuras sem perder
              simplicidade na entrada de dados.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CategoryForm
              mode={editingCategory ? "edit" : "create"}
              categories={categories}
              initialData={editingCategory ?? undefined}
              onSuccess={handleSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
