import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { migrateDbIfNeeded } from './migrations';

const DB_NAME = 'kasif.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Pre-populates the database from a zipped asset if it doesn't exist.
 * We use ZIP to stay under GitHub's 100MB limit and reduce APK size.
 */
async function loadDatabaseAsset(): Promise<void> {
  const documentDir = Paths.document;
  if (!documentDir) return;
  
  const dbDir = new Directory(documentDir, 'SQLite');
  const dbFile = new File(dbDir, DB_NAME);

  if (!dbDir.exists) {
    await dbDir.create();
  }

  if (!dbFile.exists) {
    console.log('Pre-populated database not found, extracting from assets...');
    try {
      // 1. Get the zipped asset
      const asset = Asset.fromModule(require('../assets/database/kasif.db.zip'));
      await asset.downloadAsync();
      
      if (asset.localUri) {
        // 2. Unzip the asset to the document directory
        const zipFile = new File(asset.localUri);
        await zipFile.unzip(dbDir);
        
        console.log('Database successfully extracted from assets.');
      } else {
        throw new Error('Asset localUri is null');
      }
    } catch (error) {
      console.error('Failed to extract pre-populated database:', error);
    }
  }
}

/**
 * Initializes the database and runs migrations.
 * Should be called early in the app lifecycle.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  try {
    // 1. Ensure pre-populated data is available
    await loadDatabaseAsset();

    // 2. Open the database
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

    // 3. Run migrations for schema updates and user data tables
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
