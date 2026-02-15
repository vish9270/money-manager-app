import { runQuery, runStatement } from './database';
import { Account } from '@/types';

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  credit_limit: number | null;
  icon: string;
  color: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

function mapRowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Account['type'],
    balance: row.balance,
    creditLimit: row.credit_limit ?? undefined,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllAccounts(): Promise<Account[]> {
  const rows = await runQuery<AccountRow>('SELECT * FROM accounts ORDER BY name');
  return rows.map(mapRowToAccount);
}

/**
 * Useful for dropdowns / pickers (hide inactive accounts)
 */
export async function getActiveAccounts(): Promise<Account[]> {
  const rows = await runQuery<AccountRow>(
    'SELECT * FROM accounts WHERE is_active = 1 ORDER BY name'
  );
  return rows.map(mapRowToAccount);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const rows = await runQuery<AccountRow>('SELECT * FROM accounts WHERE id = ?', [id]);
  return rows.length > 0 ? mapRowToAccount(rows[0]) : null;
}

export async function createAccount(account: Account): Promise<void> {
  await runStatement(
    `
    INSERT INTO accounts (
      id, name, type, balance, credit_limit, icon, color, is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      account.id,
      account.name,
      account.type,
      account.balance,
      account.creditLimit ?? null,
      account.icon,
      account.color,
      account.isActive ? 1 : 0,
      account.createdAt,
      account.updatedAt,
    ]
  );
}

export async function updateAccount(account: Account): Promise<void> {
  await runStatement(
    `
    UPDATE accounts
    SET name = ?,
        type = ?,
        balance = ?,
        credit_limit = ?,
        icon = ?,
        color = ?,
        is_active = ?,
        updated_at = ?
    WHERE id = ?
    `,
    [
      account.name,
      account.type,
      account.balance,
      account.creditLimit ?? null,
      account.icon,
      account.color,
      account.isActive ? 1 : 0,
      account.updatedAt,
      account.id,
    ]
  );
}

/**
 * Adds delta to balance.
 * Example:
 *  - Expense: delta = -amount
 *  - Income: delta = +amount
 */
export async function updateAccountBalance(id: string, delta: number): Promise<void> {
  await runStatement(
    `
    UPDATE accounts
    SET balance = balance + ?,
        updated_at = ?
    WHERE id = ?
    `,
    [delta, nowIso(), id]
  );
}

export async function deleteAccount(id: string): Promise<void> {
  await runStatement('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function hasTransactions(accountId: string): Promise<boolean> {
  const rows = await runQuery<{ count: number }>(
    `
    SELECT COALESCE(COUNT(*), 0) as count
    FROM transactions
    WHERE from_account_id = ? OR to_account_id = ?
    `,
    [accountId, accountId]
  );

  return (rows[0]?.count ?? 0) > 0;
}

export async function insertAccounts(accounts: Account[]): Promise<void> {
  for (const account of accounts) {
    await createAccount(account);
  }
}