import { getCurrentWorkspace } from "@/lib/queries/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  Goal,
  GoalDeadlineStatus,
  GoalStatus,
  GoalSummary
} from "@/types/finance";

type GoalRow = {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  deadline: string | null;
  monthly_contribution: number | string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function dateFromString(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function monthsUntil(deadline: string | null) {
  if (!deadline) {
    return null;
  }

  const today = todayDate();
  const target = dateFromString(deadline);

  if (target < today) {
    return 0;
  }

  const yearDiff = target.getUTCFullYear() - today.getUTCFullYear();
  const monthDiff = yearDiff * 12 + target.getUTCMonth() - today.getUTCMonth();
  const includesCurrentPartialMonth =
    target.getUTCDate() >= today.getUTCDate() ? 1 : 0;

  return Math.max(1, monthDiff + includesCurrentPartialMonth);
}

export function goalDeadlineStatus(
  deadline: string | null,
  status: GoalStatus,
  progress: number
): GoalDeadlineStatus {
  if (status === "completed" || progress >= 1) {
    return "completed";
  }

  if (!deadline) {
    return "no_deadline";
  }

  const remainingMonths = monthsUntil(deadline);

  if (remainingMonths === 0) {
    return "overdue";
  }

  if (remainingMonths === 1) {
    return "due_soon";
  }

  return "on_track";
}

function mapGoal(row: GoalRow): Goal {
  const targetAmount = toNumber(row.target_amount);
  const currentAmount = toNumber(row.current_amount);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const progress = targetAmount > 0 ? Math.min(currentAmount / targetAmount, 1) : 0;
  const monthsRemaining = monthsUntil(row.deadline);
  const requiredMonthlyContribution =
    monthsRemaining && monthsRemaining > 0
      ? remainingAmount / monthsRemaining
      : null;

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    target_amount: targetAmount,
    current_amount: currentAmount,
    deadline: row.deadline,
    monthly_contribution:
      row.monthly_contribution === null
        ? null
        : toNumber(row.monthly_contribution),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    progress,
    remaining_amount: remainingAmount,
    months_remaining: monthsRemaining,
    required_monthly_contribution: requiredMonthlyContribution,
    deadline_status: goalDeadlineStatus(row.deadline, row.status, progress)
  };
}

export async function getGoals(): Promise<Goal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, workspace_id, name, target_amount, current_amount, deadline, monthly_contribution, status, created_at, updated_at"
    )
    .eq("workspace_id", workspace.id)
    .order("status", { ascending: true })
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as GoalRow[]).map(mapGoal);
}

export function summarizeGoals(goals: Goal[]): GoalSummary {
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedCount = goals.filter((goal) => goal.status === "completed").length;
  const nextDeadlineGoal = [...activeGoals]
    .filter((goal) => goal.deadline)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0];

  return activeGoals.reduce(
    (summary, goal) => ({
      ...summary,
      targetAmount: summary.targetAmount + goal.target_amount,
      currentAmount: summary.currentAmount + goal.current_amount,
      remainingAmount: summary.remainingAmount + goal.remaining_amount
    }),
    {
      targetAmount: 0,
      currentAmount: 0,
      remainingAmount: 0,
      activeCount: activeGoals.length,
      completedCount,
      nextDeadlineGoalName: nextDeadlineGoal?.name ?? null,
      nextDeadline: nextDeadlineGoal?.deadline ?? null
    }
  );
}

export async function getGoalSummary(): Promise<GoalSummary> {
  return summarizeGoals(await getGoals());
}
