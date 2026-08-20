import * as SQLite from 'expo-sqlite';
import { migrateDbIfNeeded } from './migrations';

const DB_NAME = 'kasif.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Initializes the database and runs migrations.
 * Should be called early in the app lifecycle.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await migrateDbIfNeeded(dbInstance);
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Returns the current database instance.
 * Throws an error if the database has not been initialized.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
