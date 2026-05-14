import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const numberFromInput = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);

    if (typeof normalized === "string") {
      return Number(normalized.replace(",", "."));
    }

    return normalized;
  },
  z.number({ invalid_type_error: "Informe um número válido." }).finite()
);

const optionalNumberFromInput = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);

    if (normalized === undefined) {
      return undefined;
    }

    if (typeof normalized === "string") {
      return Number(normalized.replace(",", "."));
    }

    return normalized;
  },
  z
    .number({ invalid_type_error: "Informe um número válido." })
    .finite()
    .optional()
);

const optionalDayFromInput = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);

    if (normalized === undefined) {
      return undefined;
    }

    return Number(normalized);
  },
  z
    .number({ invalid_type_error: "Informe um dia válido." })
    .int("Informe um dia inteiro.")
    .min(1, "O dia deve ser entre 1 e 31.")
    .max(31, "O dia deve ser entre 1 e 31.")
    .optional()
);

const tagsFromInput = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return [];
    }

    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  },
  z.array(z.string().min(1).max(30)).max(8, "Use até 8 tags.")
);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const accountTypeSchema = z.enum([
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "other"
]);

export const categoryTypeSchema = z.enum([
  "income",
  "expense",
  "investment",
  "transfer"
]);

export const manualTransactionTypeSchema = z.enum([
  "income",
  "expense",
  "investment"
]);

export const paymentMethodSchema = z.enum([
  "pix",
  "credit_card",
  "debit_card",
  "cash",
  "bank_slip",
  "transfer",
  "other"
]);

export const transactionStatusSchema = z.enum([
  "paid",
  "pending",
  "scheduled",
  "cancelled"
]);

export const editableTransactionStatusSchema = z.enum([
  "paid",
  "pending",
  "scheduled"
]);

export const recurringFrequencySchema = z.enum([
  "monthly",
  "quarterly",
  "yearly"
]);

export const billingCycleSchema = z.enum(["monthly", "quarterly", "yearly"]);

export const subscriptionStatusSchema = z.enum([
  "active",
  "paused",
  "cancelled"
]);

export const subscriptionImportanceSchema = z.enum([
  "essential",
  "useful",
  "dispensable"
]);

export const goalStatusSchema = z.enum([
  "active",
  "completed",
  "paused",
  "cancelled"
]);

export const accountFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(80, "Use até 80 caracteres."),
    type: accountTypeSchema,
    institution: z.string().trim().max(80, "Use até 80 caracteres.").optional(),
    initialBalance: numberFromInput.default(0),
    creditLimit: optionalNumberFromInput,
    closingDay: optionalDayFromInput,
    dueDay: optionalDayFromInput,
    isActive: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    if (value.type !== "credit_card") {
      return;
    }

    if (!value.closingDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closingDay"],
        message: "Informe o dia de fechamento."
      });
    }

    if (!value.dueDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDay"],
        message: "Informe o dia de vencimento."
      });
    }

    if (value.creditLimit !== undefined && value.creditLimit < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditLimit"],
        message: "O limite não pode ser negativo."
      });
    }
  });

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(80, "Use até 80 caracteres."),
  type: categoryTypeSchema,
  parentId: z
    .string()
    .optional()
    .transform((value) => (value === "none" || value === "" ? undefined : value)),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor hexadecimal válida.")
    .optional(),
  icon: z.string().trim().max(40, "Use até 40 caracteres.").optional(),
  isActive: z.boolean().default(true)
});

export const transactionFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição com pelo menos 2 caracteres.")
    .max(120, "Use até 120 caracteres."),
  amount: numberFromInput
    .refine((value) => value > 0, "Informe um valor maior que zero.")
    .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
  type: manualTransactionTypeSchema,
  transactionDate: dateStringSchema,
  accountId: z.string().uuid("Selecione uma conta."),
  categoryId: z.string().uuid("Selecione uma categoria."),
  paymentMethod: paymentMethodSchema.optional(),
  status: editableTransactionStatusSchema.default("paid"),
  notes: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  tags: tagsFromInput.default([])
});

export const installmentFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe uma descrição com pelo menos 2 caracteres.")
    .max(120, "Use até 120 caracteres."),
  totalAmount: numberFromInput
    .refine((value) => value > 0, "Informe um valor maior que zero.")
    .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
  type: z.enum(["expense", "investment"]),
  firstDate: dateStringSchema,
  installmentTotal: z.preprocess(
    (value) => Number(value),
    z
      .number({ invalid_type_error: "Informe a quantidade de parcelas." })
      .int("Informe uma quantidade inteira.")
      .min(2, "Use pelo menos 2 parcelas.")
      .max(120, "Use até 120 parcelas.")
  ),
  accountId: z.string().uuid("Selecione uma conta."),
  categoryId: z.string().uuid("Selecione uma categoria."),
  paymentMethod: paymentMethodSchema.optional(),
  notes: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  tags: tagsFromInput.default([])
});

export const recurringRuleFormSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(2, "Informe uma descrição com pelo menos 2 caracteres.")
      .max(120, "Use até 120 caracteres."),
    amount: numberFromInput
      .refine((value) => value > 0, "Informe um valor maior que zero.")
      .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
    type: manualTransactionTypeSchema,
    frequency: recurringFrequencySchema.default("monthly"),
    startDate: dateStringSchema,
    endDate: z
      .string()
      .optional()
      .transform((value) => (value === "" ? undefined : value))
      .pipe(dateStringSchema.optional()),
    dayOfMonth: optionalDayFromInput,
    accountId: z.string().uuid("Selecione uma conta."),
    categoryId: z.string().uuid("Selecione uma categoria.")
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data final deve ser posterior à data inicial."
      });
    }
  });

export const budgetFormSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria."),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Informe um mês válido."),
  plannedAmount: numberFromInput
    .refine((value) => value > 0, "Informe um valor maior que zero.")
    .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
  alertThreshold: numberFromInput
    .refine(
      (value) => (value >= 0.5 && value <= 1) || (value >= 50 && value <= 100),
      "O alerta deve ficar entre 50% e 100%."
    )
    .transform((value) => (value > 1 ? value / 100 : value))
});

export const budgetCopySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Informe um mês válido.")
});

export const subscriptionFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(120, "Use até 120 caracteres."),
    amount: numberFromInput
      .refine((value) => value > 0, "Informe um valor maior que zero.")
      .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
    accountId: z.string().uuid("Selecione uma conta."),
    categoryId: z.string().uuid("Selecione uma categoria."),
    billingCycle: billingCycleSchema,
    billingDay: optionalDayFromInput,
    nextBillingDate: z
      .string()
      .optional()
      .transform((value) => (value === "" ? undefined : value))
      .pipe(dateStringSchema.optional()),
    status: subscriptionStatusSchema.default("active"),
    importance: z
      .union([subscriptionImportanceSchema, z.literal("none")])
      .optional()
      .transform((value) => (value === "none" ? undefined : value)),
    website: z.string().trim().max(200, "Use até 200 caracteres.").optional(),
    notes: z.string().trim().max(500, "Use até 500 caracteres.").optional()
  })
  .superRefine((value, ctx) => {
    if (value.billingCycle === "monthly" || value.billingCycle === "quarterly") {
      if (!value.billingDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["billingDay"],
          message: "Informe o dia de cobrança."
        });
      }
    }

    if (value.billingCycle === "yearly" && !value.nextBillingDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextBillingDate"],
        message: "Informe a próxima cobrança anual."
      });
    }
  });

export const goalFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(120, "Use até 120 caracteres."),
    targetAmount: numberFromInput
      .refine((value) => value > 0, "Informe um valor maior que zero.")
      .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
    currentAmount: numberFromInput
      .refine((value) => value >= 0, "O valor atual não pode ser negativo.")
      .refine((value) => value <= 999999999999.99, "Informe um valor menor.")
      .default(0),
    deadline: z
      .string()
      .optional()
      .transform((value) => (value === "" ? undefined : value))
      .pipe(dateStringSchema.optional()),
    monthlyContribution: optionalNumberFromInput
      .refine(
        (value) => value === undefined || value > 0,
        "A contribuição deve ser maior que zero."
      )
      .refine(
        (value) => value === undefined || value <= 999999999999.99,
        "Informe um valor menor."
      ),
    status: goalStatusSchema.default("active")
  })
  .superRefine((value, ctx) => {
    if (value.currentAmount > value.targetAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentAmount"],
        message: "O valor atual não pode ser maior que o alvo."
      });
    }
  });

export const goalProgressSchema = z.object({
  currentAmount: numberFromInput
    .refine((value) => value >= 0, "O valor atual não pode ser negativo.")
    .refine((value) => value <= 999999999999.99, "Informe um valor menor.")
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
export type AccountFormInput = z.input<typeof accountFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
export type TransactionFormInput = z.input<typeof transactionFormSchema>;
export type InstallmentFormValues = z.infer<typeof installmentFormSchema>;
export type InstallmentFormInput = z.input<typeof installmentFormSchema>;
export type RecurringRuleFormValues = z.infer<typeof recurringRuleFormSchema>;
export type RecurringRuleFormInput = z.input<typeof recurringRuleFormSchema>;
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;
export type BudgetFormInput = z.input<typeof budgetFormSchema>;
export type BudgetCopyInput = z.input<typeof budgetCopySchema>;
export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;
export type SubscriptionFormInput = z.input<typeof subscriptionFormSchema>;
export type GoalFormValues = z.infer<typeof goalFormSchema>;
export type GoalFormInput = z.input<typeof goalFormSchema>;
export type GoalProgressInput = z.input<typeof goalProgressSchema>;

export const transferFormSchema = z
  .object({
    fromAccountId: z.string().uuid("Selecione a conta de origem."),
    toAccountId: z.string().uuid("Selecione a conta de destino."),
    amount: numberFromInput
      .refine((value) => value > 0, "Informe um valor maior que zero.")
      .refine((value) => value <= 999999999999.99, "Informe um valor menor."),
    description: z
      .string()
      .trim()
      .min(2, "Informe uma descrição com pelo menos 2 caracteres.")
      .max(120, "Use até 120 caracteres.")
      .default("Transferência"),
    transactionDate: dateStringSchema
  })
  .superRefine((value, ctx) => {
    if (value.fromAccountId === value.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "A conta de destino deve ser diferente da conta de origem."
      });
    }
  });

export type TransferFormValues = z.infer<typeof transferFormSchema>;
export type TransferFormInput = z.input<typeof transferFormSchema>;
