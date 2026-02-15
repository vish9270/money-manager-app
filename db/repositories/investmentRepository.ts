import { runQuery, runStatement } from './database';
import { Investment } from '@/types';

interface InvestmentRow {
  id: string;
  name: string;
  type: string;
  account_id: string | null;
  total_invested: number;
  current_value: number;
  monthly_target: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToInvestment(row: InvestmentRow): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Investment['type'],
    accountId: row.account_id ?? undefined,
    totalInvested: row.total_invested,
    currentValue: row.current_value,
    monthlyTarget: row.monthly_target ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllInvestments(): Promise<Investment[]> {
  const rows = await runQuery<InvestmentRow>('SELECT * FROM investments ORDER BY name');
  return rows.map(mapRowToInvestment);
}

export async function getInvestmentById(id: string): Promise<Investment | null> {
  const rows = await runQuery<InvestmentRow>('SELECT * FROM investments WHERE id = ?', [id]);
  return rows.length > 0 ? mapRowToInvestment(rows[0]) : null;
}

export async function createInvestment(investment: Investment): Promise<void> {
  await runStatement(
    `INSERT INTO investments (id, name, type, account_id, total_invested, current_value, monthly_target, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      investment.id,
      investment.name,
      investment.type,
      investment.accountId ?? null,
      investment.totalInvested,
      investment.currentValue,
      investment.monthlyTarget ?? null,
      investment.notes ?? null,
      investment.createdAt,
      investment.updatedAt,
    ]
  );
}

export async function updateInvestment(investment: Investment): Promise<void> {
  await runStatement(
    `UPDATE investments
     SET name = ?, type = ?, account_id = ?, total_invested = ?, current_value = ?, monthly_target = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      investment.name,
      investment.type,
      investment.accountId ?? null,
      investment.totalInvested,
      investment.currentValue,
      investment.monthlyTarget ?? null,
      investment.notes ?? null,
      investment.updatedAt,
      investment.id,
    ]
  );
}

/**
 * Legacy helper (increment style).
 * Keeping this for now, but Phase 2 will stop using this.
 */
export async function updateInvestmentValue(
  id: string,
  investedAmountDelta: number,
  currentValue: number
): Promise<void> {
  await runStatement(
    `UPDATE investments
     SET total_invested = total_invested + ?,
         current_value = ?,
         updated_at = ?
     WHERE id = ?`,
    [investedAmountDelta, currentValue, new Date().toISOString(), id]
  );
}

/**
 * Reads total contributed to this investment from transactions.
 * IMPORTANT:
 * We treat only INCOME transactions linked to investment as "investment contribution".
 * (If you want to support expense-style contributions, we can adjust later.)
 */
export async function getInvestmentContributionTotal(investmentId: string): Promise<number> {
  const rows = await runQuery<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE investment_id = ?
      AND type = 'income'
    `,
    [investmentId]
  );

  return rows[0]?.total ?? 0;
}

/**
 * Recalculate totalInvested based on transactions.
 * This prevents drift when transactions are edited/deleted.
 *
 * For now:
 * - total_invested = SUM(income txns linked to investment)
 * - current_value stays as-is (manual input or future price tracking)
 */
export async function recalculateInvestmentTotals(investmentId: string): Promise<void> {
  const totalInvested = await getInvestmentContributionTotal(investmentId);

  await runStatement(
    `
    UPDATE investments
    SET total_invested = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [totalInvested, new Date().toISOString(), investmentId]
  );
}

/**
 * Recalculate totals for all investments.
 * Useful for:
 * - future "Fix totals" button
 * - migration scripts
 */
export async function recalculateAllInvestmentTotals(): Promise<void> {
  const investments = await getAllInvestments();

  for (const inv of investments) {
    await recalculateInvestmentTotals(inv.id);
  }
}

export async function deleteInvestment(id: string): Promise<void> {
  await runStatement('DELETE FROM investments WHERE id = ?', [id]);
}

export async function insertInvestments(investments: Investment[]): Promise<void> {
  for (const investment of investments) {
    await createInvestment(investment);
  }
}