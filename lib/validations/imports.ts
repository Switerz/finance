import { z } from "zod";

const importRawRowSchema = z.record(
  z.union([z.string(), z.number(), z.null(), z.undefined()])
);

const optionalColumnSchema = z
  .string()
  .optional()
  .transform((value) => (!value || value === "none" ? undefined : value));

export const importDefaultTypeSchema = z.enum([
  "auto",
  "income",
  "expense",
  "investment"
]);

export const importMappingSchema = z.object({
  dateColumn: z.string().min(1, "Mapeie a coluna de data."),
  descriptionColumn: z.string().min(1, "Mapeie a coluna de descrição."),
  amountColumn: z.string().min(1, "Mapeie a coluna de valor."),
  typeColumn: optionalColumnSchema,
  categoryColumn: optionalColumnSchema,
  accountColumn: optionalColumnSchema,
  defaultAccountId: z.string().uuid("Selecione uma conta padrão."),
  defaultType: importDefaultTypeSchema.default("auto"),
  defaultCategoryByType: z
    .object({
      income: z.string().uuid().optional(),
      expense: z.string().uuid().optional(),
      investment: z.string().uuid().optional()
    })
    .default({})
});

export const importPreviewSchema = z.object({
  fileName: z.string().trim().min(1).max(180).default("import.csv"),
  rows: z
    .array(importRawRowSchema)
    .min(1, "O CSV não possui linhas para importar.")
    .max(1000, "Importe no máximo 1.000 linhas por vez."),
  mapping: importMappingSchema
});

export const importCommitSchema = importPreviewSchema.extend({
  selectedRowNumbers: z
    .array(z.number().int().min(1))
    .min(1, "Selecione pelo menos uma linha válida para importar.")
});

export type ImportPreviewInput = z.input<typeof importPreviewSchema>;
export type ImportCommitValidationInput = z.input<typeof importCommitSchema>;
