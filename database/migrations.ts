import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA, TABLES } from './schema';

const DATABASE_VERSION = 1;

/**
 * Runs database migrations safely.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  try {
    // 1. Check current version
    const result = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${TABLES.METADATA} WHERE key = 'version'`
    );
    
    const currentVersion = result ? parseInt(result.value, 10) : 0;

    if (currentVersion >= DATABASE_VERSION) {
      return;
    }

    console.log(`Migrating database from version ${currentVersion} to ${DATABASE_VERSION}...`);

    // 2. Run migrations based on version
    if (currentVersion === 0) {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        ${SCHEMA[TABLES.METADATA]}
        ${SCHEMA[TABLES.PLACEHOLDER]}
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '${DATABASE_VERSION}');
      `);
    }

    // Future migrations would go here:
    // if (currentVersion < 2) { ... }

    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
}
