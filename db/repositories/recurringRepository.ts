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

/**
 * We store recurring dates as YYYY-MM-DD only.
 */
function normalizeDateKey(dateStr?: string | null): string {
  if (!dateStr) return '';
  // If ISO string comes, convert it.
  if (dateStr.includes('T')) return dateStr.slice(0, 10);
  return dateStr.trim();
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
    nextRunDate: normalizeDateKey(row.next_run_date),
    lastRunDate: normalizeDateKey(row.last_run_date) || undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllRecurring(): Promise<Recurring[]> {
  const rows = await runQuery<RecurringRow>('SELECT * FROM recurring ORDER BY name');
  return rows.map(mapRowToRecurring);
}

export async function getRecurringById(id: string): Promise<Recurring | null> {
  const rows = await runQuery<RecurringRow>('SELECT * FROM recurring WHERE id = ?', [id]);
  return rows.length > 0 ? mapRowToRecurring(rows[0]) : null;
}

export async function getActiveRecurring(): Promise<Recurring[]> {
  const rows = await runQuery<RecurringRow>(
    'SELECT * FROM recurring WHERE is_active = 1 ORDER BY next_run_date'
  );
  return rows.map(mapRowToRecurring);
}

/**
 * Get recurring items that are due to run on or before a given date.
 * dateStr must be YYYY-MM-DD.
 */
export async function getDueRecurring(dateStr: string): Promise<Recurring[]> {
  const dateKey = normalizeDateKey(dateStr);

  const rows = await runQuery<RecurringRow>(
    `
    SELECT *
    FROM recurring
    WHERE is_active = 1
      AND next_run_date IS NOT NULL
      AND TRIM(next_run_date) != ''
      AND next_run_date <= ?
    ORDER BY next_run_date ASC
    `,
    [dateKey]
  );

  return rows.map(mapRowToRecurring);
}

export async function createRecurring(recurring: Recurring): Promise<void> {
  const nextRunDate = normalizeDateKey(recurring.nextRunDate);

  await runStatement(
    `
    INSERT INTO recurring (
      id, name, type, amount, frequency,
      day_of_month, day_of_week,
      category_id,
      from_account_id, to_account_id,
      is_active,
      next_run_date, last_run_date,
      notes,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
      nextRunDate || null,
      normalizeDateKey(recurring.lastRunDate) || null,
      recurring.notes ?? null,
      recurring.createdAt,
      recurring.updatedAt,
    ]
  );
}

export async function updateRecurring(recurring: Recurring): Promise<void> {
  const nextRunDate = normalizeDateKey(recurring.nextRunDate);

  await runStatement(
    `
    UPDATE recurring
    SET name = ?,
        type = ?,
        amount = ?,
        frequency = ?,
        day_of_month = ?,
        day_of_week = ?,
        category_id = ?,
        from_account_id = ?,
        to_account_id = ?,
        is_active = ?,
        next_run_date = ?,
        last_run_date = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
    `,
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
      nextRunDate || null,
      normalizeDateKey(recurring.lastRunDate) || null,
      recurring.notes ?? null,
      recurring.updatedAt,
      recurring.id,
    ]
  );
}

/**
 * Updates run tracking fields.
 * Use this after generating a transaction from recurring.
 */
export async function markRecurringRun(
  recurringId: string,
  lastRunDate: string,
  nextRunDate: string
): Promise<void> {
  await runStatement(
    `
    UPDATE recurring
    SET last_run_date = ?,
        next_run_date = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [
      normalizeDateKey(lastRunDate) || null,
      normalizeDateKey(nextRunDate) || null,
      new Date().toISOString(),
      recurringId,
    ]
  );
}

/**
 * Optional helper:
 * Disable recurring safely (for invalid configs or user pause).
 */
export async function disableRecurring(recurringId: string): Promise<void> {
  await runStatement(
    `
    UPDATE recurring
    SET is_active = 0,
        updated_at = ?
    WHERE id = ?
    `,
    [new Date().toISOString(), recurringId]
  );
}

/**
 * Safe delete.
 * recurring_runs has ON DELETE CASCADE in schema,
 * so only deleting recurring is enough.
 */
export async function deleteRecurring(id: string): Promise<void> {
  await runStatement('DELETE FROM recurring WHERE id = ?', [id]);
}

export async function insertRecurring(items: Recurring[]): Promise<void> {
  for (const item of items) {
    await createRecurring(item);
  }
}