/**
 * Database schema definitions for Kasif app.
 * Designed to be extensible for all Islamic content types (Hadith, Tafsir, Fiqh, etc.)
 */

export const TABLES = {
  METADATA: 'metadata',
  PLACEHOLDER: 'placeholder',
  AUTHORS: 'authors',
  WORKS: 'works',
  EDITIONS: 'editions',
  SECTIONS: 'sections',
  CONTENTS: 'contents',
  CONTENT_TRANSLATIONS: 'content_translations',
  COMMENTARIES: 'commentaries',
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
  [TABLES.AUTHORS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.AUTHORS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bio TEXT,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.WORKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.WORKS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER,
      title TEXT NOT NULL,
      alternative_title TEXT,
      type TEXT NOT NULL, -- 'hadith', 'tafsir', 'fiqh', 'article', etc.
      language TEXT DEFAULT 'tr',
      description TEXT,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES ${TABLES.AUTHORS}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.EDITIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.EDITIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      publisher TEXT,
      year TEXT,
      location TEXT,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES ${TABLES.WORKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.SECTIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SECTIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      parent_id INTEGER,
      title TEXT,
      number INTEGER,
      type TEXT NOT NULL, -- 'book', 'chapter', 'part', etc.
      metadata TEXT, -- JSON string
      FOREIGN KEY (work_id) REFERENCES ${TABLES.WORKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES ${TABLES.SECTIONS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.CONTENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.CONTENTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER,
      type TEXT NOT NULL, -- 'hadith', 'verse', 'paragraph', etc.
      number_in_work TEXT,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES ${TABLES.SECTIONS}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.CONTENT_TRANSLATIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.CONTENT_TRANSLATIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      language TEXT NOT NULL, -- 'ar', 'tr', 'en', etc.
      text_content TEXT NOT NULL,
      metadata TEXT, -- JSON string
      FOREIGN KEY (content_id) REFERENCES ${TABLES.CONTENTS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.COMMENTARIES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.COMMENTARIES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      edition_id INTEGER,
      author_id INTEGER,
      language TEXT NOT NULL,
      title TEXT,
      text_content TEXT NOT NULL,
      metadata TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES ${TABLES.CONTENTS}(id) ON DELETE CASCADE,
      FOREIGN KEY (edition_id) REFERENCES ${TABLES.EDITIONS}(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES ${TABLES.AUTHORS}(id) ON DELETE SET NULL
    );
  `,
};

// Index definitions for performance
export const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_works_type ON ${TABLES.WORKS}(type);`,
  `CREATE INDEX IF NOT EXISTS idx_sections_work ON ${TABLES.SECTIONS}(work_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contents_section ON ${TABLES.CONTENTS}(section_id);`,
  `CREATE INDEX IF NOT EXISTS idx_translations_content ON ${TABLES.CONTENT_TRANSLATIONS}(content_id);`,
  `CREATE INDEX IF NOT EXISTS idx_commentaries_content ON ${TABLES.COMMENTARIES}(content_id);`,
];
