import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DB_NAME, CREATE_TABLES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  if (Platform.OS === 'web') {
    console.log('SQLite not supported on web, using mock');
    return null as unknown as SQLite.SQLiteDatabase;
  }
  
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('Database opened successfully');
    return db;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('Skipping SQLite init on web');
    return;
  }
  
  try {
    const database = await getDatabase();
    const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await database.execAsync(statement + ';');
      }
    }
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function runQuery<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync<T>(sql, params);
    return result;
  } catch (error) {
    console.error('Error running query:', sql, error);
    throw error;
  }
}

export async function runStatement(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  if (Platform.OS === 'web') {
    return { changes: 0, lastInsertRowId: 0 };
  }
  
  try {
    const database = await getDatabase();
    const result = await database.runAsync(sql, params);
    return result;
  } catch (error) {
    console.error('Error running statement:', sql, error);
    throw error;
  }
}

export async function runTransaction(
  callback: () => Promise<void>
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  
  const database = await getDatabase();
  await database.withTransactionAsync(callback);
}
