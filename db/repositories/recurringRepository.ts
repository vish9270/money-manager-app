import { runQuery, runStatement } from './database';
import { Recurring } from '@/types';

interface RecurringRow {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  category_id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  is_active: number;
  next_run_date: string | null;
  last_run_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRecurring(row: RecurringRow): Recurring {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Recurring['type'],
    amount: row.amount,
    frequency: row.frequency as Recurring['frequency'],
    dayOfMonth: row.day_of_month ?? undefined,
    dayOfWeek: row.day_of_week ?? undefined,
    categoryId: row.category_id,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    isActive: row.is_active === 1,
    nextRunDate: row.next_run_date ?? '',
    lastRunDate: row.last_run_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllRecurring(): Promise<Recurring[]> {
  const rows = await runQuery<RecurringRow>(
    'SELECT * FROM recurring ORDER BY name'
  );
  return rows.map(mapRowToRecurring);
}

export async function getRecurringById(id: string): Promise<Recurring | null> {
  const rows = await runQuery<RecurringRow>(
    'SELECT * FROM recurring WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRowToRecurring(rows[0]) : null;
}

export async function getActiveRecurring(): Promise<Recurring[]> {
  const rows = await runQuery<RecurringRow>(
    'SELECT * FROM recurring WHERE is_active = 1 ORDER BY next_run_date'
  );
  return rows.map(mapRowToRecurring);
}

export async function createRecurring(recurring: Recurring): Promise<void> {
  await runStatement(
    `INSERT INTO recurring (id, name, type, amount, frequency, day_of_month, day_of_week, category_id, from_account_id, to_account_id, is_active, next_run_date, last_run_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recurring.id,
      recurring.name,
      recurring.type,
      recurring.amount,
      recurring.frequency,
      recurring.dayOfMonth ?? null,
      recurring.dayOfWeek ?? null,
      recurring.categoryId,
      recurring.fromAccountId ?? null,
      recurring.toAccountId ?? null,
      recurring.isActive ? 1 : 0,
      recurring.nextRunDate || null,
      recurring.lastRunDate ?? null,
      recurring.notes ?? null,
      recurring.createdAt,
      recurring.updatedAt,
    ]
  );
}

export async function updateRecurring(recurring: Recurring): Promise<void> {
  await runStatement(
    `UPDATE recurring SET name = ?, type = ?, amount = ?, frequency = ?, day_of_month = ?, day_of_week = ?, category_id = ?, from_account_id = ?, to_account_id = ?, is_active = ?, next_run_date = ?, last_run_date = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      recurring.name,
      recurring.type,
      recurring.amount,
      recurring.frequency,
      recurring.dayOfMonth ?? null,
      recurring.dayOfWeek ?? null,
      recurring.categoryId,
      recurring.fromAccountId ?? null,
      recurring.toAccountId ?? null,
      recurring.isActive ? 1 : 0,
      recurring.nextRunDate || null,
      recurring.lastRunDate ?? null,
      recurring.notes ?? null,
      recurring.updatedAt,
      recurring.id,
    ]
  );
}

export async function deleteRecurring(id: string): Promise<void> {
  await runStatement('DELETE FROM recurring_runs WHERE recurring_id = ?', [id]);
  await runStatement('DELETE FROM recurring WHERE id = ?', [id]);
}

export async function insertRecurring(items: Recurring[]): Promise<void> {
  for (const item of items) {
    await createRecurring(item);
  }
}
