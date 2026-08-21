import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { unzip } from 'react-native-zip-archive';
import { migrateDbIfNeeded } from './migrations';

const DB_NAME = 'kasif.db';
const PRELOADED_DB_ASSET_MODULE = require('../assets/database/kasif.db.zip');

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Copies the preloaded SQLite database from the bundled APK asset on first
 * launch. Existing databases are never replaced, so user research data is
 * preserved across app updates.
 *
 * The ZIP is extracted natively because the database is large. This avoids
 * loading a 160+ MB SQLite file into the JavaScript heap.
 */
async function loadDatabaseAsset(): Promise<void> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error('Expo document directory is unavailable.');
  }

  const databaseDirectory = `${documentDirectory}SQLite`;
  const databasePath = `${databaseDirectory}/${DB_NAME}`;
  const existingDatabase = await FileSystem.getInfoAsync(databasePath);

  if (existingDatabase.exists) {
    return;
  }

  const databaseDirectoryInfo = await FileSystem.getInfoAsync(databaseDirectory);
  if (!databaseDirectoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(databaseDirectory, { intermediates: true });
  }

  try {
    const asset = Asset.fromModule(PRELOADED_DB_ASSET_MODULE);
    await asset.downloadAsync();
    const sourcePath = asset.localUri;

    if (!sourcePath) {
      throw new Error('The bundled database asset did not receive a local URI.');
    }

    await unzip(sourcePath, databaseDirectory);
  } catch (error) {
    await removePartialDatabase(databasePath);
    throw new Error(`Preloaded SQLite asset could not be extracted: ${String(error)}`);
  }

  const extractedDatabase = await FileSystem.getInfoAsync(databasePath);
  if (!extractedDatabase.exists) {
    await removePartialDatabase(databasePath);
    throw new Error(
      `Preloaded SQLite asset extraction completed without creating ${databasePath}.`,
    );
  }
}

async function removePartialDatabase(databasePath: string): Promise<void> {
  await Promise.all(
    [`${databasePath}`, `${databasePath}-wal`, `${databasePath}-shm`].map((path) =>
      FileSystem.deleteAsync(path, { idempotent: true }),
    ),
  );
}

/**
 * Initializes the database once and runs non-destructive migrations.
 * Concurrent callers share the same initialization promise.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      await loadDatabaseAsset();
      const database = await SQLite.openDatabaseAsync(DB_NAME);
      await migrateDbIfNeeded(database);
      dbInstance = database;
      return database;
    })().catch((error: unknown) => {
      initializationPromise = null;
      console.error('Failed to initialize database:', error);
      throw error;
    });
  }

  return initializationPromise;
}

/**
 * Returns the initialized database instance.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
