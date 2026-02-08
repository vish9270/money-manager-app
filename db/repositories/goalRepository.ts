import { runQuery, runStatement } from '../database';
import { Goal } from '@/types';

interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  priority: number;
  status: string;
  account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date ?? '',
    icon: row.icon,
    color: row.color,
    priority: row.priority,
    status: row.status as Goal['status'],
    accountId: row.account_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllGoals(): Promise<Goal[]> {
  const rows = await runQuery<GoalRow>(
    'SELECT * FROM goals ORDER BY priority, name'
  );
  return rows.map(mapRowToGoal);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const rows = await runQuery<GoalRow>(
    'SELECT * FROM goals WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRowToGoal(rows[0]) : null;
}

export async function createGoal(goal: Goal): Promise<void> {
  await runStatement(
    `INSERT INTO goals (id, name, target_amount, saved_amount, target_date, icon, color, priority, status, account_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.name,
      goal.targetAmount,
      goal.savedAmount,
      goal.targetDate || null,
      goal.icon,
      goal.color,
      goal.priority,
      goal.status,
      goal.accountId ?? null,
      goal.notes ?? null,
      goal.createdAt,
      goal.updatedAt,
    ]
  );
}

export async function updateGoal(goal: Goal): Promise<void> {
  await runStatement(
    `UPDATE goals SET name = ?, target_amount = ?, saved_amount = ?, target_date = ?, icon = ?, color = ?, priority = ?, status = ?, account_id = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      goal.name,
      goal.targetAmount,
      goal.savedAmount,
      goal.targetDate || null,
      goal.icon,
      goal.color,
      goal.priority,
      goal.status,
      goal.accountId ?? null,
      goal.notes ?? null,
      goal.updatedAt,
      goal.id,
    ]
  );
}

export async function updateGoalSavedAmount(id: string, amount: number): Promise<void> {
  await runStatement(
    `UPDATE goals SET saved_amount = saved_amount + ?, updated_at = ? WHERE id = ?`,
    [amount, new Date().toISOString(), id]
  );
}

export async function deleteGoal(id: string): Promise<void> {
  await runStatement('DELETE FROM goals WHERE id = ?', [id]);
}

export async function insertGoals(goals: Goal[]): Promise<void> {
  for (const goal of goals) {
    await createGoal(goal);
  }
}
