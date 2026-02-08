import { runQuery, runStatement, runTransaction, getDatabase } from './database';
import { Budget, BudgetLine } from '@/types';

interface BudgetRow {
  id: string;
  month: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BudgetLineRow {
  id: string;
  budget_id: string;
  category_id: string;
  planned: number;
  alert_threshold: number;
}

function mapRowToBudgetLine(row: BudgetLineRow): BudgetLine {
  return {
    id: row.id,
    categoryId: row.category_id,
    planned: row.planned,
    alertThreshold: row.alert_threshold,
  };
}

export async function getAllBudgets(): Promise<Budget[]> {
  const budgetRows = await runQuery<BudgetRow>(
    'SELECT * FROM budgets ORDER BY month DESC'
  );
  
  const budgets: Budget[] = [];
  for (const row of budgetRows) {
    const lineRows = await runQuery<BudgetLineRow>(
      'SELECT * FROM budget_lines WHERE budget_id = ?',
      [row.id]
    );
    
    budgets.push({
      id: row.id,
      month: row.month,
      status: row.status as Budget['status'],
      lines: lineRows.map(mapRowToBudgetLine),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  
  return budgets;
}

export async function getBudgetByMonth(month: string): Promise<Budget | null> {
  const rows = await runQuery<BudgetRow>(
    'SELECT * FROM budgets WHERE month = ?',
    [month]
  );
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  const lineRows = await runQuery<BudgetLineRow>(
    'SELECT * FROM budget_lines WHERE budget_id = ?',
    [row.id]
  );
  
  return {
    id: row.id,
    month: row.month,
    status: row.status as Budget['status'],
    lines: lineRows.map(mapRowToBudgetLine),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createBudget(budget: Budget): Promise<void> {
  const db = await getDatabase();
  
  await db.withTransactionAsync(async () => {
    await runStatement(
      `INSERT OR REPLACE INTO budgets (id, month, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [budget.id, budget.month, budget.status, budget.createdAt, budget.updatedAt]
    );
    
    await runStatement('DELETE FROM budget_lines WHERE budget_id = ?', [budget.id]);
    
    for (const line of budget.lines) {
      await runStatement(
        `INSERT INTO budget_lines (id, budget_id, category_id, planned, alert_threshold)
         VALUES (?, ?, ?, ?, ?)`,
        [line.id, budget.id, line.categoryId, line.planned, line.alertThreshold]
      );
    }
  });
}

export async function updateBudget(budget: Budget): Promise<void> {
  await createBudget(budget);
}

export async function deleteBudget(id: string): Promise<void> {
  await runStatement('DELETE FROM budget_lines WHERE budget_id = ?', [id]);
  await runStatement('DELETE FROM budgets WHERE id = ?', [id]);
}

export async function updateBudgetLine(budgetId: string, line: BudgetLine): Promise<void> {
  await runStatement(
    `UPDATE budget_lines SET planned = ?, alert_threshold = ? WHERE id = ? AND budget_id = ?`,
    [line.planned, line.alertThreshold, line.id, budgetId]
  );
}

export async function deleteBudgetLine(lineId: string): Promise<void> {
  await runStatement('DELETE FROM budget_lines WHERE id = ?', [lineId]);
}

export async function insertBudgets(budgets: Budget[]): Promise<void> {
  for (const budget of budgets) {
    await createBudget(budget);
  }
}
