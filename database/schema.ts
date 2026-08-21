/**
 * Database schema definitions for Kasif app.
 * Designed to be extensible for all Islamic content types and personal research infrastructure.
 * Includes FTS5 support for fast searching across Arabic and Turkish texts.
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
  RESEARCHES: 'researches',
  TAGS: 'tags',
  RESEARCH_TAGS: 'research_tags',
  RESEARCH_SOURCES: 'research_sources',
  RESEARCH_RELATIONS: 'research_relations',
  FAVORITES: 'favorites',
  // FTS5 Virtual Tables
  FTS_CONTENT: 'fts_content',
  FTS_COMMENTARY: 'fts_commentary',
  FTS_RESEARCH: 'fts_research',
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
  [TABLES.RESEARCHES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RESEARCHES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      category TEXT NOT NULL DEFAULT 'general', -- 'hadith', 'commentary', 'tafsir', 'fiqh', 'aqidah', 'seerah', 'arabic', 'general', 'other'
      status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'completed', 'archived'
      visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'shared', 'published'
      user_id TEXT, -- Future auth/ownership support
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TAGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.RESEARCH_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RESEARCH_TAGS} (
      research_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (research_id, tag_id),
      FOREIGN KEY (research_id) REFERENCES ${TABLES.RESEARCHES}(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.TAGS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.RESEARCH_SOURCES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RESEARCH_SOURCES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      research_id INTEGER NOT NULL,
      source_type TEXT NOT NULL, -- 'content', 'work', 'section', 'author', 'edition'
      source_id INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (research_id) REFERENCES ${TABLES.RESEARCHES}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.RESEARCH_RELATIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.RESEARCH_RELATIONS} (
      research_id INTEGER NOT NULL,
      related_research_id INTEGER NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'related', -- 'related', 'follows', 'expands', 'contradicts'
      PRIMARY KEY (research_id, related_research_id),
      FOREIGN KEY (research_id) REFERENCES ${TABLES.RESEARCHES}(id) ON DELETE CASCADE,
      FOREIGN KEY (related_research_id) REFERENCES ${TABLES.RESEARCHES}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.FAVORITES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.FAVORITES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES ${TABLES.CONTENTS}(id) ON DELETE CASCADE
    );
  `,
  // FTS5 Virtual Tables
  [TABLES.FTS_CONTENT]: `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLES.FTS_CONTENT} USING fts5(
      content_id UNINDEXED,
      language,
      text_content,
      tokenize = 'unicode61'
    );
  `,
  [TABLES.FTS_COMMENTARY]: `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLES.FTS_COMMENTARY} USING fts5(
      commentary_id UNINDEXED,
      title,
      text_content,
      tokenize = 'unicode61'
    );
  `,
  [TABLES.FTS_RESEARCH]: `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLES.FTS_RESEARCH} USING fts5(
      research_id UNINDEXED,
      title,
      summary,
      body,
      tokenize = 'unicode61'
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
  `CREATE INDEX IF NOT EXISTS idx_researches_category ON ${TABLES.RESEARCHES}(category);`,
  `CREATE INDEX IF NOT EXISTS idx_researches_status ON ${TABLES.RESEARCHES}(status);`,
  `CREATE INDEX IF NOT EXISTS idx_researches_visibility ON ${TABLES.RESEARCHES}(visibility);`,
  `CREATE INDEX IF NOT EXISTS idx_researches_updated_at ON ${TABLES.RESEARCHES}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_research_sources_research ON ${TABLES.RESEARCH_SOURCES}(research_id);`,
  `CREATE INDEX IF NOT EXISTS idx_research_sources_target ON ${TABLES.RESEARCH_SOURCES}(source_type, source_id);`,
  `CREATE INDEX IF NOT EXISTS idx_research_tags_tag ON ${TABLES.RESEARCH_TAGS}(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON ${TABLES.FAVORITES}(created_at);`,
];
