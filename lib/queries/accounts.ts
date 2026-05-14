import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import type { Account, AccountType, TransactionType } from "@/types/finance";

type AccountRow = Omit<
  Account,
  "type" | "initial_balance" | "current_balance" | "credit_limit"
> & {
  type: AccountType;
  initial_balance: number | string;
  current_balance: number | string;
  credit_limit: number | string | null;
};

type BalanceTransactionRow = {
  account_id: string | null;
  type: TransactionType;
  amount: number | string;
  installment_number: number | null;
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function transactionImpact(
  type: TransactionType,
  amount: number,
  installmentNumber?: number | null
) {
  if (type === "income") {
    return amount;
  }

  if (type === "expense" || type === "investment") {
    return -amount;
  }

  if (type === "transfer") {
    // installment_number=2 → credit (destination), installment_number=1 → debit (source)
    return installmentNumber === 2 ? amount : -amount;
  }

  return 0;
}

function mapAccount(row: AccountRow, balanceDelta: number): Account {
  const initialBalance = toNumber(row.initial_balance);

  return {
    ...row,
    initial_balance: initialBalance,
    current_balance: initialBalance + balanceDelta,
    credit_limit:
      row.credit_limit === null || row.credit_limit === undefined
        ? null
        : toNumber(row.credit_limit)
  };
}

export async function getAccounts(): Promise<Account[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const [{ data: accountsData, error: accountsError }, { data: transactionsData }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(
          "id, workspace_id, name, type, institution, initial_balance, current_balance, credit_limit, closing_day, due_day, is_active, created_at, updated_at"
        )
        .eq("workspace_id", workspace.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("account_id, type, amount, installment_number")
        .eq("workspace_id", workspace.id)
        .eq("status", "paid")
    ]);

  if (accountsError || !accountsData) {
    return [];
  }

  const balanceByAccount = new Map<string, number>();

  for (const transaction of (transactionsData ?? []) as BalanceTransactionRow[]) {
    if (!transaction.account_id) {
      continue;
    }

    const current = balanceByAccount.get(transaction.account_id) ?? 0;
    balanceByAccount.set(
      transaction.account_id,
      current +
        transactionImpact(
          transaction.type,
          toNumber(transaction.amount),
          transaction.installment_number
        )
    );
  }

  return (accountsData as AccountRow[]).map((account) =>
    mapAccount(account, balanceByAccount.get(account.id) ?? 0)
  );
}
