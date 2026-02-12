import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DB_NAME, CREATE_TABLES_SQL,DROP_TABLES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

const isWeb = Platform.OS === 'web';

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  if (isWeb) {
    console.log('SQLite not supported on web, using mock');
    return null as unknown as SQLite.SQLiteDatabase;
  }

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Important pragmas for correctness + performance
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(`PRAGMA synchronous = NORMAL;`);

    console.log('Database opened successfully');
    return db;
  } catch (error) {
    console.error('Error opening database:', error);
    throw error;
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split('\n')
    .map(line => line.replace(/--.*$/g, '').trim()) // remove inline comments
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

export async function initializeDatabase(): Promise<void> {
  if (isWeb) {
    console.log('Skipping SQLite init on web');
    return;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const database = await getDatabase();

      // Ensure FK is on even if DB is reopened
      await database.execAsync(`PRAGMA foreign_keys = ON;`);

      const statements = splitSqlStatements(CREATE_TABLES_SQL);

      await database.withTransactionAsync(async () => {
        for (const statement of statements) {
          await database.execAsync(statement + ';');
        }
      });

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  })();

  return initPromise;
}

export async function runQuery<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  if (isWeb) return [];

  try {
    const database = await getDatabase();
    return await database.getAllAsync<T>(sql, params);
  } catch (error) {
    console.error('Error running query:', sql, error);
    throw error;
  }
}

export async function runStatement(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  if (isWeb) {
    return { changes: 0, lastInsertRowId: 0 };
  }

  try {
    const database = await getDatabase();
    return await database.runAsync(sql, params);
  } catch (error) {
    console.error('Error running statement:', sql, error);
    throw error;
  }
}

export async function runTransaction(callback: () => Promise<void>): Promise<void> {
  if (isWeb) return;

  const database = await getDatabase();
  await database.withTransactionAsync(callback);
}

export async function resetDatabase(): Promise<void> {
  if (isWeb) return;

  const database = await getDatabase();

  const dropStatements = splitSqlStatements(DROP_TABLES_SQL);
  const createStatements = splitSqlStatements(CREATE_TABLES_SQL);

  await database.withTransactionAsync(async () => {
    await database.execAsync(`PRAGMA foreign_keys = OFF;`);

    // Drop all tables one-by-one
    for (const stmt of dropStatements) {
      await database.execAsync(stmt + ';');
    }

    // Create all tables one-by-one
    for (const stmt of createStatements) {
      await database.execAsync(stmt + ';');
    }

    await database.execAsync(`PRAGMA foreign_keys = ON;`);
  });

  console.log('Database reset successfully');
}
