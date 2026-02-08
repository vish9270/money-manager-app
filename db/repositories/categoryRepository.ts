import { runQuery, runStatement } from './database';
import { Category } from '@/types';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  parent_id: string | null;
  is_system: number;
}

function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type as Category['type'],
    parentId: row.parent_id ?? undefined,
    isSystem: row.is_system === 1,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await runQuery<CategoryRow>(
    'SELECT * FROM categories ORDER BY name'
  );
  return rows.map(mapRowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await runQuery<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? mapRowToCategory(rows[0]) : null;
}

export async function createCategory(category: Category): Promise<void> {
  await runStatement(
    `INSERT OR IGNORE INTO categories (id, name, icon, color, type, parent_id, is_system)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.name,
      category.icon,
      category.color,
      category.type,
      category.parentId ?? null,
      category.isSystem ? 1 : 0,
    ]
  );
}

export async function updateCategory(category: Category): Promise<void> {
  await runStatement(
    `UPDATE categories SET name = ?, icon = ?, color = ?, type = ?, parent_id = ?
     WHERE id = ?`,
    [
      category.name,
      category.icon,
      category.color,
      category.type,
      category.parentId ?? null,
      category.id,
    ]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  await runStatement('DELETE FROM categories WHERE id = ?', [id]);
}

export async function hasTransactions(categoryId: string): Promise<boolean> {
  const rows = await runQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [categoryId]
  );
  return rows[0]?.count > 0;
}

export async function insertCategories(categories: Category[]): Promise<void> {
  for (const category of categories) {
    await createCategory(category);
  }
}
