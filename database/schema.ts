/**
 * Database schema definitions for Kasif app.
 * Designed to be extensible for future features like hadiths, books, favorites, etc.
 */

export const TABLES = {
  METADATA: 'metadata',
  PLACEHOLDER: 'placeholder', // Initial placeholder table for Task 1
};

export const SCHEMA = {
  [TABLES.METADATA]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.METADATA} (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `,
  [TABLES.PLACEHOLDER]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PLACEHOLDER} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
};
