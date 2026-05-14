import { NextRequest, NextResponse } from "next/server";
import {
  paymentMethodLabels,
  transactionStatusLabels,
  transactionTypeLabels
} from "@/lib/constants/finance";
import { formatDateBR } from "@/lib/formatters/date";
import { getWorkspaceMembers } from "@/lib/queries/settings";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod, TransactionStatus, TransactionType } from "@/types/finance";

type ExportTransactionRow = {
  transaction_date: string;
  description: string;
  amount: number | string;
  type: TransactionType;
  status: TransactionStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  tags: string[] | null;
  accounts: { name: string | null } | { name: string | null }[] | null;
  categories: { name: string | null } | { name: string | null }[] | null;
};

type CurrentWorkspace = NonNullable<Awaited<ReturnType<typeof getCurrentWorkspace>>>;

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthIndex, 1))
    .toISOString()
    .slice(0, 10);

  return {
    start: `${month}-01`,
    end
  };
}

function firstRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sanitizeCell(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  const formulaSafe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;

  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

function csvRow(values: (string | number | null | undefined)[]) {
  return values.map((value) => sanitizeCell(String(value ?? ""))).join(";");
}

function transactionToCsv(row: ExportTransactionRow) {
  const account = firstRelation(row.accounts);
  const category = firstRelation(row.categories);
  const tags = row.tags?.join(", ") ?? "";
  const amount = Number(row.amount).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return csvRow([
    formatDateBR(row.transaction_date),
    row.description,
    amount,
    transactionTypeLabels[row.type],
    transactionStatusLabels[row.status],
    account?.name ?? "Sem conta",
    category?.name ?? "Sem categoria",
    row.payment_method ? paymentMethodLabels[row.payment_method] : "",
    tags,
    row.notes ?? ""
  ]);
}

function safeFilenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function fetchWorkspaceTable(
  table: string,
  workspaceId: string,
  orderBy = "created_at"
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order(orderBy, { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function exportWorkspaceJson(workspace: CurrentWorkspace) {
  const supabase = await createClient();
  const [
    members,
    accounts,
    categories,
    transactions,
    recurringRules,
    subscriptions,
    budgets,
    goals,
    imports,
    auditLogs
  ] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    fetchWorkspaceTable("accounts", workspace.id),
    fetchWorkspaceTable("categories", workspace.id),
    fetchWorkspaceTable("transactions", workspace.id),
    fetchWorkspaceTable("recurring_rules", workspace.id),
    fetchWorkspaceTable("subscriptions", workspace.id),
    fetchWorkspaceTable("budgets", workspace.id),
    fetchWorkspaceTable("goals", workspace.id),
    fetchWorkspaceTable("imports", workspace.id),
    fetchWorkspaceTable("audit_logs", workspace.id)
  ]);
  const { data: workspaceRow, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspace.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    exported_at: new Date().toISOString(),
    product: "Finance Planner",
    format_version: 1,
    workspace: workspaceRow,
    members,
    data: {
      accounts,
      categories,
      transactions,
      recurring_rules: recurringRules,
      subscriptions,
      budgets,
      goals,
      imports,
      audit_logs: auditLogs
    }
  };
}

async function exportTransactionsCsv(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return jsonError(400, "Informe um mês válido no formato yyyy-MM.");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return jsonError(404, "Workspace não encontrado.");
  }

  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "transaction_date, description, amount, type, status, payment_method, notes, tags, accounts(name), categories(name)"
    )
    .eq("workspace_id", workspace.id)
    .gte("transaction_date", start)
    .lt("transaction_date", end)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return jsonError(500, error.message);
  }

  const header = csvRow([
    "data",
    "descricao",
    "valor",
    "tipo",
    "status",
    "conta",
    "categoria",
    "forma_pagamento",
    "tags",
    "observacoes"
  ]);
  const rows = (data ?? []).map((row) =>
    transactionToCsv(row as ExportTransactionRow)
  );
  const csv = `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-planner-transacoes-${month}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "transactions";
  const format = searchParams.get("format") ?? "";
  const month = searchParams.get("month") ?? "";
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "Autenticação necessária.");
  }

  if (type === "transactions") {
    return exportTransactionsCsv(month);
  }

  if (type !== "workspace") {
    return jsonError(400, "Tipo de exportação inválido.");
  }

  if (format && format !== "json") {
    return jsonError(400, "Formato de exportação inválido.");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return jsonError(404, "Workspace não encontrado.");
  }

  try {
    const payload = await exportWorkspaceJson(workspace);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `finance-planner-workspace-${safeFilenamePart(
      workspace.name
    )}-${today}.json`;

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return jsonError(
      500,
      error instanceof Error ? error.message : "Não foi possível exportar."
    );
  }
}
