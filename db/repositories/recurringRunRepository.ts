import { runQuery, runStatement } from './database';
import { RecurringRun } from '@/types';

interface RecurringRunRow {
  id: string;
  recurring_id: string;
  run_date: string;
  status: string;
  transaction_id: string | null;
  reason: string | null;
}

function normalizeDateKey(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.slice(0, 10);
  return dateStr.trim();
}

function mapRowToRecurringRun(row: RecurringRunRow): RecurringRun {
  return {
    id: row.id,
    recurringId: row.recurring_id,
    runDate: normalizeDateKey(row.run_date),
    status: row.status as RecurringRun['status'],
    transactionId: row.transaction_id ?? undefined,
    reason: row.reason ?? undefined,
  };
}

export async function getRunsByRecurringId(recurringId: string): Promise<RecurringRun[]> {
  const rows = await runQuery<RecurringRunRow>(
    `SELECT * FROM recurring_runs WHERE recurring_id = ? ORDER BY run_date DESC`,
    [recurringId]
  );
  return rows.map(mapRowToRecurringRun);
}

/**
 * Returns the run record for a specific recurringId + date (if exists).
 */
export async function getRunForDate(
  recurringId: string,
  runDate: string
): Promise<RecurringRun | null> {
  const dateKey = normalizeDateKey(runDate);

  const rows = await runQuery<RecurringRunRow>(
    `
    SELECT *
    FROM recurring_runs
    WHERE recurring_id = ?
      AND run_date = ?
    LIMIT 1
    `,
    [recurringId, dateKey]
  );

  return rows.length > 0 ? mapRowToRecurringRun(rows[0]) : null;
}

/**
 * True if this recurring has already been processed for this date.
 *
 * We treat both:
 * - success
 * - skipped
 * as "already handled"
 *
 * Because otherwise skipped would keep retrying forever.
 */
export async function hasRunForDate(recurringId: string, runDate: string): Promise<boolean> {
  const dateKey = normalizeDateKey(runDate);

  const rows = await runQuery<{ count: number }>(
    `
    SELECT COUNT(*) AS count
    FROM recurring_runs
    WHERE recurring_id = ?
      AND run_date = ?
      AND status IN ('success', 'skipped')
    `,
    [recurringId, dateKey]
  );

  return (rows[0]?.count ?? 0) > 0;
}

/**
 * Create a recurring run record.
 * (Use this if you are sure there is no duplicate)
 */
export async function createRecurringRun(run: RecurringRun): Promise<void> {
  await runStatement(
    `
    INSERT INTO recurring_runs (
      id, recurring_id, run_date, status, transaction_id, reason
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      run.id,
      run.recurringId,
      normalizeDateKey(run.runDate),
      run.status,
      run.transactionId ?? null,
      run.reason ?? null,
    ]
  );
}

/**
 * UPSERT behavior:
 * - If record exists for recurringId+runDate -> update
 * - Else -> insert
 *
 * This makes the recurring engine safe even if it runs twice.
 */
export async function upsertRecurringRun(run: RecurringRun): Promise<void> {
  const existing = await getRunForDate(run.recurringId, run.runDate);

  if (!existing) {
    await createRecurringRun(run);
    return;
  }

  await runStatement(
    `
    UPDATE recurring_runs
    SET status = ?,
        transaction_id = ?,
        reason = ?
    WHERE recurring_id = ?
      AND run_date = ?
    `,
    [
      run.status,
      run.transactionId ?? null,
      run.reason ?? null,
      run.recurringId,
      normalizeDateKey(run.runDate),
    ]
  );
}

/**
 * Useful for UI/debugging:
 * returns the last run (any status).
 */
export async function getLastRun(recurringId: string): Promise<RecurringRun | null> {
  const rows = await runQuery<RecurringRunRow>(
    `
    SELECT *
    FROM recurring_runs
    WHERE recurring_id = ?
    ORDER BY run_date DESC
    LIMIT 1
    `,
    [recurringId]
  );

  return rows.length > 0 ? mapRowToRecurringRun(rows[0]) : null;
}