"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import {
  categoryIconOptions,
  categoryTypeLabels,
  defaultCategoryColorByType
} from "@/lib/constants/finance";
import {
  categoryFormSchema,
  type CategoryFormInput,
  type CategoryFormValues
} from "@/lib/validations/finance";
import type { Category, CategoryType } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const categoryTypes = Object.entries(categoryTypeLabels) as [
  CategoryType,
  string
][];

type CategoryFormProps = {
  mode: "create" | "edit";
  categories: Category[];
  initialData?: Category;
  onSuccess?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function CategoryForm({
  mode,
  categories,
  initialData,
  onSuccess
}: CategoryFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? "expense",
      parentId: initialData?.parent_id ?? "none",
      color:
        initialData?.color ??
        defaultCategoryColorByType[initialData?.type ?? "expense"],
      icon: initialData?.icon ?? "circle-dollar-sign",
      isActive: initialData?.is_active ?? true
    }
  });
  const selectedType = useWatch({ control: form.control, name: "type" });
  const parentOptions = categories.filter(
    (category) =>
      category.is_active &&
      category.type === selectedType &&
      category.id !== initialData?.id
  );

  function applyServerFieldErrors(
    fieldErrors: Record<string, string[] | undefined> | undefined
  ) {
    Object.entries(fieldErrors ?? {}).forEach(([field, messages]) => {
      if (messages?.[0]) {
        form.setError(field as Parameters<typeof form.setError>[0], {
          type: "server",
          message: messages[0]
        });
      }
    });
  }

  function handleSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateCategory(initialData.id, values)
          : await createCategory(values);

      if (!result.ok) {
        applyServerFieldErrors(result.fieldErrors);
        toast.error(result.message ?? "Não foi possível salvar a categoria.");
        return;
      }

      toast.success(result.message ?? "Categoria salva.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          placeholder="Alimentação"
          disabled={isPending}
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={(value) => {
                  const nextType = value as CategoryType;
                  field.onChange(nextType);
                  form.setValue("parentId", "none");
                  form.setValue("color", defaultCategoryColorByType[nextType]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryTypes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.type?.message} />
        </div>

        <div className="space-y-2">
          <Label>Categoria pai</Label>
          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <Select
                disabled={isPending || parentOptions.length === 0}
                value={field.value ?? "none"}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria pai</SelectItem>
                  {parentOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.parentId?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category-color">Cor</Label>
          <Input
            id="category-color"
            type="color"
            className="h-10 px-2 py-1"
            disabled={isPending}
            {...form.register("color")}
          />
          <FieldError message={form.formState.errors.color?.message} />
        </div>

        <div className="space-y-2">
          <Label>Ícone</Label>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <Select
                disabled={isPending}
                value={field.value ?? "circle-dollar-sign"}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryIconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.icon?.message} />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          disabled={isPending}
          {...form.register("isActive")}
        />
        Categoria ativa
      </label>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : mode === "edit"
            ? "Salvar categoria"
            : "Criar categoria"}
      </Button>
    </form>
  );
}
