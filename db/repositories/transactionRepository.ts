import { runQuery, runStatement } from '../database';
import { Transaction } from '@/types';

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  date: string;
  category_id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  notes: string | null;
  goal_id: string | null;
  debt_id: string | null;
  investment_id: string | null;
  recurring_id: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    amount: row.amount,
    date: row.date,
    categoryId: row.category_id,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    notes: row.notes ?? undefined,
    goalId: row.goal_id ?? undefined,
    debtId: row.debt_id ?? undefined,
    investmentId: row.investment_id ?? undefined,
    recurringId: row.recurring_id ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const rows = await runQuery<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  );
  return rows.map(mapRowToTransaction);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const rows = await runQuery<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRowToTransaction(rows[0]) : null;
}

export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const rows = await runQuery<TransactionRow>(
    `SELECT * FROM transactions WHERE substr(date, 1, 7) = ? ORDER BY date DESC, created_at DESC`,
    [month]
  );
  return rows.map(mapRowToTransaction);
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const rows = await runQuery<TransactionRow>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`,
    [startDate, endDate]
  );
  return rows.map(mapRowToTransaction);
}

export async function createTransaction(transaction: Transaction): Promise<void> {
  await runStatement(
    `INSERT INTO transactions (id, type, amount, date, category_id, from_account_id, to_account_id, notes, goal_id, debt_id, investment_id, recurring_id, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.type,
      transaction.amount,
      transaction.date,
      transaction.categoryId,
      transaction.fromAccountId ?? null,
      transaction.toAccountId ?? null,
      transaction.notes ?? null,
      transaction.goalId ?? null,
      transaction.debtId ?? null,
      transaction.investmentId ?? null,
      transaction.recurringId ?? null,
      transaction.tags ? JSON.stringify(transaction.tags) : null,
      transaction.createdAt,
      transaction.updatedAt,
    ]
  );
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  await runStatement(
    `UPDATE transactions SET type = ?, amount = ?, date = ?, category_id = ?, from_account_id = ?, to_account_id = ?, notes = ?, goal_id = ?, debt_id = ?, investment_id = ?, recurring_id = ?, tags = ?, updated_at = ?
     WHERE id = ?`,
    [
      transaction.type,
      transaction.amount,
      transaction.date,
      transaction.categoryId,
      transaction.fromAccountId ?? null,
      transaction.toAccountId ?? null,
      transaction.notes ?? null,
      transaction.goalId ?? null,
      transaction.debtId ?? null,
      transaction.investmentId ?? null,
      transaction.recurringId ?? null,
      transaction.tags ? JSON.stringify(transaction.tags) : null,
      transaction.updatedAt,
      transaction.id,
    ]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  await runStatement('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function insertTransactions(transactions: Transaction[]): Promise<void> {
  for (const transaction of transactions) {
    await createTransaction(transaction);
  }
}
