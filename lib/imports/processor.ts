import { revalidatePath } from "next/cache";
import {
  duplicateKey,
  inferImportType,
  normalizeLookup,
  parseImportAmount,
  parseImportDate,
  readCell
} from "@/lib/imports/normalize";
import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspace } from "@/lib/queries/workspaces";
import {
  importCommitSchema,
  importPreviewSchema,
  type ImportCommitValidationInput,
  type ImportPreviewInput
} from "@/lib/validations/imports";
import type {
  Account,
  Category,
  ImportPreviewResult,
  ImportPreviewRow,
  ImportResult,
  ManualTransactionType,
  TransactionStatus,
  TransactionType
} from "@/types/finance";

type ExistingTransactionRow = {
  transaction_date: string;
  description: string;
  amount: number | string;
  type: TransactionType;
  account_id: string | null;
  status: TransactionStatus;
};

type WorkspaceOptions = {
  accounts: Account[];
  categories: Category[];
};

function fail(message: string, fieldErrors?: ImportResult["fieldErrors"]) {
  return { ok: false, message, fieldErrors } satisfies ImportResult;
}

function previewFail(
  message: string,
  fieldErrors?: ImportPreviewResult["fieldErrors"]
) {
  return {
    ok: false,
    message,
    rows: [],
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    fieldErrors
  } satisfies ImportPreviewResult;
}

function relationByName<T extends { name: string }>(items: T[]) {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(normalizeLookup(item.name), item);
  }

  return map;
}

function relationById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

async function getWorkspaceOptions(workspaceId: string): Promise<WorkspaceOptions> {
  const supabase = await createClient();
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .neq("type", "transfer")
      .order("name", { ascending: true })
  ]);

  return {
    accounts: (accounts ?? []) as Account[],
    categories: (categories ?? []) as Category[]
  };
}

async function findDuplicateKeys(
  workspaceId: string,
  previewRows: ImportPreviewRow[]
) {
  const candidateRows = previewRows.filter(
    (row) =>
      !row.errors.length &&
      row.transactionDate &&
      row.description &&
      row.amount !== null &&
      row.type &&
      row.accountId
  );

  if (!candidateRows.length) {
    return new Set<string>();
  }

  const dates = candidateRows.map((row) => row.transactionDate as string).sort();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date, description, amount, type, account_id, status")
    .eq("workspace_id", workspaceId)
    .gte("transaction_date", dates[0])
    .lte("transaction_date", dates[dates.length - 1]);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set(
    (data as ExistingTransactionRow[])
      .filter((row) => row.status !== "cancelled" && row.account_id)
      .map((row) =>
        duplicateKey({
          transactionDate: row.transaction_date,
          description: row.description,
          amount: Number(row.amount),
          type: row.type as ManualTransactionType,
          accountId: row.account_id as string
        })
      )
  );
}

export async function buildImportPreviewForWorkspace(
  workspaceId: string,
  input: ImportPreviewInput
): Promise<ImportPreviewResult> {
  const parsed = importPreviewSchema.safeParse(input);

  if (!parsed.success) {
    return previewFail(
      "Revise o arquivo e o mapeamento.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { rows, mapping } = parsed.data;
  const headers = new Set(Object.keys(rows[0] ?? {}));
  const mappedColumns = [
    mapping.dateColumn,
    mapping.descriptionColumn,
    mapping.amountColumn,
    mapping.typeColumn,
    mapping.categoryColumn,
    mapping.accountColumn
  ].filter(Boolean) as string[];

  for (const column of mappedColumns) {
    if (!headers.has(column)) {
      return previewFail("Uma coluna mapeada não existe no CSV.");
    }
  }

  const options = await getWorkspaceOptions(workspaceId);
  const accountById = relationById(options.accounts);
  const accountByName = relationByName(options.accounts);
  const categoryById = relationById(options.categories);
  const categoryByName = relationByName(options.categories);
  const defaultAccount = accountById.get(mapping.defaultAccountId);

  if (!defaultAccount) {
    return previewFail("Selecione uma conta ativa deste workspace.", {
      defaultAccountId: ["Selecione uma conta ativa."]
    });
  }

  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];
    const warnings: string[] = [];
    const dateValue = readCell(row, mapping.dateColumn);
    const description = readCell(row, mapping.descriptionColumn);
    const amountValue = readCell(row, mapping.amountColumn);
    const typeValue = readCell(row, mapping.typeColumn);
    const accountValue = readCell(row, mapping.accountColumn);
    const categoryValue = readCell(row, mapping.categoryColumn);
    const transactionDate = parseImportDate(dateValue);
    const signedAmount = parseImportAmount(amountValue);
    const type =
      signedAmount === null
        ? null
        : inferImportType(signedAmount, typeValue, mapping.defaultType);
    const amount = signedAmount === null ? null : Math.abs(signedAmount);
    let account = defaultAccount;
    let category: Category | undefined;

    if (!transactionDate) {
      errors.push("Data inválida.");
    }

    if (!description) {
      errors.push("Descrição obrigatória.");
    }

    if (signedAmount === null || signedAmount === 0) {
      errors.push("Valor inválido.");
    }

    if (accountValue) {
      const mappedAccount = accountByName.get(normalizeLookup(accountValue));

      if (mappedAccount) {
        account = mappedAccount;
      } else {
        warnings.push("Conta não encontrada; a conta padrão será usada.");
      }
    }

    if (type) {
      if (categoryValue) {
        const mappedCategory = categoryByName.get(normalizeLookup(categoryValue));

        if (mappedCategory?.type === type) {
          category = mappedCategory;
        } else if (mappedCategory) {
          warnings.push("Categoria encontrada, mas incompatível com o tipo.");
        } else {
          warnings.push("Categoria não encontrada; a categoria padrão será usada.");
        }
      }

      if (!category) {
        const defaultCategoryId = mapping.defaultCategoryByType[type];
        const defaultCategory = defaultCategoryId
          ? categoryById.get(defaultCategoryId)
          : undefined;

        if (defaultCategory?.type === type) {
          category = defaultCategory;
        }
      }

      if (!category) {
        errors.push(`Categoria padrão ausente para ${type}.`);
      }
    }

    return {
      rowNumber,
      raw: row,
      transactionDate,
      description: description || null,
      amount,
      type,
      accountId: account?.id ?? null,
      accountName: account?.name ?? null,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      errors,
      warnings,
      duplicate: false
    };
  });
  const duplicateKeys = await findDuplicateKeys(workspaceId, previewRows);

  for (const row of previewRows) {
    if (
      row.transactionDate &&
      row.description &&
      row.amount !== null &&
      row.type &&
      row.accountId &&
      duplicateKeys.has(
        duplicateKey({
          transactionDate: row.transactionDate,
          description: row.description,
          amount: row.amount,
          type: row.type,
          accountId: row.accountId
        })
      )
    ) {
      row.duplicate = true;
      row.warnings.push("Possível duplicata no workspace.");
    }
  }

  return {
    ok: true,
    rows: previewRows,
    validRows: previewRows.filter((row) => !row.errors.length).length,
    invalidRows: previewRows.filter((row) => row.errors.length > 0).length,
    duplicateRows: previewRows.filter((row) => row.duplicate).length
  };
}

export async function commitImportForWorkspace({
  workspace,
  userId,
  input
}: {
  workspace: CurrentWorkspace;
  userId: string;
  input: ImportCommitValidationInput;
}): Promise<ImportResult> {
  if (workspace.role === "viewer") {
    return fail("Seu papel neste workspace permite apenas visualização.");
  }

  const parsed = importCommitSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Revise a seleção da importação.", parsed.error.flatten().fieldErrors);
  }

  const preview = await buildImportPreviewForWorkspace(workspace.id, parsed.data);

  if (!preview.ok) {
    return fail(preview.message ?? "Não foi possível validar o CSV.", preview.fieldErrors);
  }

  const selected = new Set(parsed.data.selectedRowNumbers);
  const selectedRows = preview.rows.filter((row) => selected.has(row.rowNumber));
  const invalidSelectedRows = selectedRows.filter((row) => row.errors.length > 0);

  if (!selectedRows.length) {
    return fail("Selecione pelo menos uma linha válida para importar.");
  }

  if (invalidSelectedRows.length) {
    return fail("A seleção contém linhas inválidas. Revise o preview.");
  }

  const supabase = await createClient();
  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({
      workspace_id: workspace.id,
      file_name: parsed.data.fileName,
      source: "csv",
      status: "uploaded",
      total_rows: parsed.data.rows.length,
      processed_rows: 0,
      created_by: userId
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    return fail(importError?.message ?? "Não foi possível registrar a importação.");
  }

  const payload = selectedRows.map((row) => ({
    workspace_id: workspace.id,
    account_id: row.accountId,
    category_id: row.categoryId,
    description: row.description,
    amount: row.amount,
    type: row.type,
    transaction_date: row.transactionDate,
    competence_month: null,
    payment_method: null,
    status: "paid",
    notes: `Importado de ${parsed.data.fileName} (${importRow.id}).`,
    tags: ["importado"],
    is_recurring: false,
    recurring_rule_id: null,
    installment_group_id: null,
    installment_number: null,
    installment_total: null,
    created_by: userId
  }));
  const { error: transactionError } = await supabase
    .from("transactions")
    .insert(payload);

  if (transactionError) {
    await supabase
      .from("imports")
      .update({ status: "failed", processed_rows: 0 })
      .eq("id", importRow.id)
      .eq("workspace_id", workspace.id);

    return fail(transactionError.message, undefined);
  }

  await supabase
    .from("imports")
    .update({ status: "processed", processed_rows: selectedRows.length })
    .eq("id", importRow.id)
    .eq("workspace_id", workspace.id);

  revalidateImportSurfaces();

  return {
    ok: true,
    message: `${selectedRows.length} transação(ões) importada(s).`,
    importId: importRow.id as string,
    processedRows: selectedRows.length,
    failedRows: 0
  };
}

export function revalidateImportSurfaces() {
  revalidatePath("/imports");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
