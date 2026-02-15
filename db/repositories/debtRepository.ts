import { runQuery, runStatement } from './database';
import { Debt } from '@/types';

interface DebtRow {
  id: string;
  name: string;
  type: string;
  principal_amount: number;
  outstanding_amount: number;
  interest_rate: number | null;
  emi_amount: number | null;
  emi_day: number | null;
  start_date: string;
  end_date: string | null;
  account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Debt['type'],
    principalAmount: row.principal_amount,
    outstandingAmount: row.outstanding_amount,
    interestRate: row.interest_rate ?? 0,
    emiAmount: row.emi_amount ?? undefined,
    emiDay: row.emi_day ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    accountId: row.account_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllDebts(): Promise<Debt[]> {
  const rows = await runQuery<DebtRow>('SELECT * FROM debts ORDER BY name');
  return rows.map(mapRowToDebt);
}

export async function getDebtById(id: string): Promise<Debt | null> {
  const rows = await runQuery<DebtRow>('SELECT * FROM debts WHERE id = ?', [id]);
  return rows.length > 0 ? mapRowToDebt(rows[0]) : null;
}

export async function createDebt(debt: Debt): Promise<void> {
  await runStatement(
    `
    INSERT INTO debts (
      id, name, type,
      principal_amount, outstanding_amount,
      interest_rate, emi_amount, emi_day,
      start_date, end_date,
      account_id, notes,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      debt.id,
      debt.name,
      debt.type,
      debt.principalAmount,
      debt.outstandingAmount,
      debt.interestRate ?? null,
      debt.emiAmount ?? null,
      debt.emiDay ?? null,
      debt.startDate,
      debt.endDate ?? null,
      debt.accountId ?? null,
      debt.notes ?? null,
      debt.createdAt,
      debt.updatedAt,
    ]
  );
}

export async function updateDebt(debt: Debt): Promise<void> {
  await runStatement(
    `
    UPDATE debts
    SET name = ?,
        type = ?,
        principal_amount = ?,
        outstanding_amount = ?,
        interest_rate = ?,
        emi_amount = ?,
        emi_day = ?,
        start_date = ?,
        end_date = ?,
        account_id = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [
      debt.name,
      debt.type,
      debt.principalAmount,
      debt.outstandingAmount,
      debt.interestRate ?? null,
      debt.emiAmount ?? null,
      debt.emiDay ?? null,
      debt.startDate,
      debt.endDate ?? null,
      debt.accountId ?? null,
      debt.notes ?? null,
      debt.updatedAt,
      debt.id,
    ]
  );
}

export async function deleteDebt(id: string): Promise<void> {
  await runStatement('DELETE FROM debts WHERE id = ?', [id]);
}

/**
 * For debt totals:
 * We treat EXPENSE transactions linked to debt as "payments".
 * Example: you pay EMI from bank account.
 *
 * outstanding = principal - totalPaid
 *
 * NOTE:
 * If you later want to support "new loan disbursement" transactions,
 * we can extend logic.
 */
export async function getDebtPaymentTotal(debtId: string): Promise<number> {
  const rows = await runQuery<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE debt_id = ?
      AND type = 'expense'
    `,
    [debtId]
  );

  return rows[0]?.total ?? 0;
}

export async function recalculateDebtTotals(debtId: string): Promise<void> {
  const debt = await getDebtById(debtId);
  if (!debt) return;

  const totalPaid = await getDebtPaymentTotal(debtId);

  const newOutstanding = Math.max(debt.principalAmount - totalPaid, 0);

  await runStatement(
    `
    UPDATE debts
    SET outstanding_amount = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [newOutstanding, new Date().toISOString(), debtId]
  );
}

export async function recalculateAllDebtTotals(): Promise<void> {
  const debts = await getAllDebts();
  for (const d of debts) {
    await recalculateDebtTotals(d.id);
  }
}

export async function insertDebts(debts: Debt[]): Promise<void> {
  for (const debt of debts) {
    await createDebt(debt);
  }
}