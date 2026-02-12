import { runQuery, runStatement } from './database';
import { Alert } from '@/types';

interface AlertRow {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  data: string | null;
  created_at: string;
}

function mapRowToAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    type: row.type as Alert['type'],
    title: row.title,
    message: row.message,
    isRead: row.is_read === 1,
    data: row.data ? JSON.parse(row.data) : undefined,
    createdAt: row.created_at,
  };
}

export async function getAllAlerts(): Promise<Alert[]> {
  const rows = await runQuery<AlertRow>(
    `SELECT * FROM alerts ORDER BY created_at DESC`
  );
  return rows.map(mapRowToAlert);
}

export async function createAlert(alert: Alert): Promise<void> {
  await runStatement(
    `INSERT INTO alerts (id, type, title, message, is_read, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      alert.id,
      alert.type,
      alert.title,
      alert.message,
      alert.isRead ? 1 : 0,
      alert.data ? JSON.stringify(alert.data) : null,
      alert.createdAt,
    ]
  );
}

export async function markAlertAsRead(id: string): Promise<void> {
  await runStatement(
    `UPDATE alerts SET is_read = 1 WHERE id = ?`,
    [id]
  );
}

export async function markAllAlertsAsRead(): Promise<void> {
  await runStatement(`UPDATE alerts SET is_read = 1`);
}

export async function deleteAlert(id: string): Promise<void> {
  await runStatement(`DELETE FROM alerts WHERE id = ?`, [id]);
}

export async function clearAllAlerts(): Promise<void> {
  await runStatement(`DELETE FROM alerts`);
}
