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
  QURAN_SURAHS: 'quran_surahs',
  QURAN_PAGES: 'quran_pages',
  QURAN_LINES: 'quran_lines',
  QURAN_AYAHS: 'quran_ayahs',
  QURAN_WORDS: 'quran_words',
  QURAN_WORD_MEANINGS: 'quran_word_meanings',
  QURAN_MARKERS: 'quran_markers',
  READING_PROGRESS: 'reading_progress',
  DHIKR_GROUPS: 'dhikr_groups',
  DHIKRS: 'dhikrs',
  DHIKR_PROGRESS: 'dhikr_progress',
  PERSONAL_BOOKS: 'personal_books',
  PERSONAL_BOOK_CHAPTERS: 'personal_book_chapters',
  PERSONAL_BOOK_PARAGRAPHS: 'personal_book_paragraphs',
  PERSONAL_BOOK_PROGRESS: 'personal_book_progress',
  PERSONAL_BOOK_BOOKMARKS: 'personal_book_bookmarks',
  PERSONAL_BOOK_NOTES: 'personal_book_notes',
  PERSONAL_BOOK_HIGHLIGHTS: 'personal_book_highlights',
  PERSONAL_BOOK_IMPORT_EVENTS: 'personal_book_import_events',
  // FTS5 Virtual Tables
  FTS_CONTENT: 'fts_content',
  FTS_COMMENTARY: 'fts_commentary',
  FTS_RESEARCH: 'fts_research',
  FTS_PERSONAL_BOOKS: 'fts_personal_books',
  PERSONAL_VOCABULARY_WORDS: 'personal_vocabulary_words',
  PERSONAL_VOCABULARY_EXAMPLES: 'personal_vocabulary_examples',
  PERSONAL_VOCABULARY_TAGS: 'personal_vocabulary_tags',
  PERSONAL_VOCABULARY_WORD_TAGS: 'personal_vocabulary_word_tags',
  FTS_PERSONAL_VOCABULARY: 'fts_personal_vocabulary',
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
  [TABLES.QURAN_SURAHS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_SURAHS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_tr TEXT,
      ayah_count INTEGER,
      revelation_place TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.QURAN_PAGES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_PAGES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_number INTEGER NOT NULL UNIQUE,
      juz_number INTEGER,
      hizb_quarter INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.QURAN_LINES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_LINES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      line_number INTEGER NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'ayah',
      metadata TEXT,
      UNIQUE (page_id, line_number),
      FOREIGN KEY (page_id) REFERENCES ${TABLES.QURAN_PAGES}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.QURAN_AYAHS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_AYAHS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_id INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      global_number INTEGER,
      page_id INTEGER NOT NULL,
      first_line_id INTEGER,
      last_line_id INTEGER,
      text_ar TEXT NOT NULL,
      metadata TEXT,
      UNIQUE (surah_id, ayah_number),
      FOREIGN KEY (surah_id) REFERENCES ${TABLES.QURAN_SURAHS}(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES ${TABLES.QURAN_PAGES}(id) ON DELETE CASCADE,
      FOREIGN KEY (first_line_id) REFERENCES ${TABLES.QURAN_LINES}(id) ON DELETE SET NULL,
      FOREIGN KEY (last_line_id) REFERENCES ${TABLES.QURAN_LINES}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.QURAN_WORDS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_WORDS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ayah_id INTEGER NOT NULL,
      word_index INTEGER NOT NULL,
      text_ar TEXT NOT NULL,
      normalized_text TEXT,
      metadata TEXT,
      UNIQUE (ayah_id, word_index),
      FOREIGN KEY (ayah_id) REFERENCES ${TABLES.QURAN_AYAHS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.QURAN_WORD_MEANINGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_WORD_MEANINGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'tr',
      meaning TEXT NOT NULL,
      metadata TEXT,
      UNIQUE (word_id, language),
      FOREIGN KEY (word_id) REFERENCES ${TABLES.QURAN_WORDS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.QURAN_MARKERS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.QURAN_MARKERS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marker_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      user_key TEXT NOT NULL DEFAULT 'local',
      note TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_key, marker_type, target_id)
    );
  `,
  [TABLES.READING_PROGRESS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.READING_PROGRESS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT NOT NULL,
      content_key TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
      position_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (content_type, content_key)
    );
  `,
  [TABLES.DHIKR_GROUPS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.DHIKR_GROUPS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      user_key TEXT NOT NULL DEFAULT 'local',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.DHIKRS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.DHIKRS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      title TEXT NOT NULL,
      arabic_text TEXT,
      transliteration TEXT,
      turkish_meaning TEXT,
      target_count INTEGER,
      source TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_user_created INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES ${TABLES.DHIKR_GROUPS}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.DHIKR_PROGRESS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.DHIKR_PROGRESS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dhikr_id INTEGER NOT NULL UNIQUE,
      count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dhikr_id) REFERENCES ${TABLES.DHIKRS}(id) ON DELETE CASCADE
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
  [TABLES.PERSONAL_BOOKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOKS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      original_file_name TEXT NOT NULL,
      local_file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL UNIQUE,
      file_size INTEGER,
      page_count INTEGER,
      extraction_status TEXT NOT NULL DEFAULT 'pending',
      extraction_method TEXT,
      extraction_note TEXT,
      import_status TEXT NOT NULL DEFAULT 'stored',
      last_error TEXT,
      last_read_at DATETIME,
      cover_file_path TEXT,
      content_version INTEGER NOT NULL DEFAULT 1,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.PERSONAL_BOOK_CHAPTERS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_CHAPTERS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      start_paragraph_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, order_index),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.PERSONAL_BOOK_PARAGRAPHS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_PARAGRAPHS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      chapter_id INTEGER,
      order_index INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      source_page INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, order_index),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES ${TABLES.PERSONAL_BOOK_CHAPTERS}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.PERSONAL_BOOK_PROGRESS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_PROGRESS} (
      book_id INTEGER PRIMARY KEY,
      paragraph_index INTEGER NOT NULL DEFAULT 0,
      chapter_id INTEGER,
      progress_percent REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES ${TABLES.PERSONAL_BOOK_CHAPTERS}(id) ON DELETE SET NULL
    );
  `,
  [TABLES.PERSONAL_BOOK_BOOKMARKS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_BOOKMARKS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      paragraph_index INTEGER NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, paragraph_index),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.PERSONAL_BOOK_NOTES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_NOTES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      paragraph_index INTEGER NOT NULL,
      selected_text TEXT,
      note_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.PERSONAL_BOOK_HIGHLIGHTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_HIGHLIGHTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      paragraph_index INTEGER NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      selected_text TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#F4D35E',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(book_id, paragraph_index, start_offset, end_offset),
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.PERSONAL_BOOK_IMPORT_EVENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_BOOK_IMPORT_EVENTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES ${TABLES.PERSONAL_BOOKS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.FTS_PERSONAL_BOOKS]: `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLES.FTS_PERSONAL_BOOKS} USING fts5(
      paragraph_id UNINDEXED,
      book_id UNINDEXED,
      text_content,
      tokenize = 'unicode61'
    );
  `,
  [TABLES.PERSONAL_VOCABULARY_WORDS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_VOCABULARY_WORDS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stable_key TEXT NOT NULL UNIQUE,
      arabic TEXT,
      arabic_normalized TEXT,
      arabic_transliteration TEXT,
      word_type TEXT NOT NULL DEFAULT 'other',
      root TEXT,
      masdar TEXT,
      plural TEXT,
      gender TEXT,
      turkish TEXT,
      english TEXT,
      german TEXT,
      personal_note TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.PERSONAL_VOCABULARY_EXAMPLES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_VOCABULARY_EXAMPLES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      arabic TEXT,
      turkish TEXT,
      english TEXT,
      german TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_id) REFERENCES ${TABLES.PERSONAL_VOCABULARY_WORDS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.PERSONAL_VOCABULARY_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_VOCABULARY_TAGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  [TABLES.PERSONAL_VOCABULARY_WORD_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS} (
      word_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (word_id, tag_id),
      FOREIGN KEY (word_id) REFERENCES ${TABLES.PERSONAL_VOCABULARY_WORDS}(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.PERSONAL_VOCABULARY_TAGS}(id) ON DELETE CASCADE
    );
  `,
  [TABLES.FTS_PERSONAL_VOCABULARY]: `
    CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLES.FTS_PERSONAL_VOCABULARY} USING fts5(
      word_id UNINDEXED,
      arabic,
      arabic_normalized,
      arabic_transliteration,
      turkish,
      english,
      german,
      root,
      personal_note,
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
  `CREATE INDEX IF NOT EXISTS idx_quran_pages_juz ON ${TABLES.QURAN_PAGES}(juz_number);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_lines_page ON ${TABLES.QURAN_LINES}(page_id, line_number);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_ayahs_surah ON ${TABLES.QURAN_AYAHS}(surah_id, ayah_number);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_ayahs_page ON ${TABLES.QURAN_AYAHS}(page_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_ayahs_global ON ${TABLES.QURAN_AYAHS}(global_number);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_words_ayah ON ${TABLES.QURAN_WORDS}(ayah_id, word_index);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_word_meanings_word ON ${TABLES.QURAN_WORD_MEANINGS}(word_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_markers_target ON ${TABLES.QURAN_MARKERS}(marker_type, target_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quran_markers_updated ON ${TABLES.QURAN_MARKERS}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_reading_progress_updated ON ${TABLES.READING_PROGRESS}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_dhikr_groups_order ON ${TABLES.DHIKR_GROUPS}(sort_order, id);`,
  `CREATE INDEX IF NOT EXISTS idx_dhikrs_group_order ON ${TABLES.DHIKRS}(group_id, sort_order, id);`,
  `CREATE INDEX IF NOT EXISTS idx_dhikr_progress_updated ON ${TABLES.DHIKR_PROGRESS}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_books_updated ON ${TABLES.PERSONAL_BOOKS}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_chapters_book ON ${TABLES.PERSONAL_BOOK_CHAPTERS}(book_id, order_index);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_paragraphs_book ON ${TABLES.PERSONAL_BOOK_PARAGRAPHS}(book_id, order_index);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_bookmarks_book ON ${TABLES.PERSONAL_BOOK_BOOKMARKS}(book_id, paragraph_index);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_notes_book ON ${TABLES.PERSONAL_BOOK_NOTES}(book_id, paragraph_index);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_highlights_book ON ${TABLES.PERSONAL_BOOK_HIGHLIGHTS}(book_id, paragraph_index);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_import_events_book ON ${TABLES.PERSONAL_BOOK_IMPORT_EVENTS}(book_id, id);`,
  `CREATE INDEX IF NOT EXISTS idx_vocabulary_words_updated ON ${TABLES.PERSONAL_VOCABULARY_WORDS}(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_vocabulary_words_favorite ON ${TABLES.PERSONAL_VOCABULARY_WORDS}(is_favorite, updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_vocabulary_examples_word ON ${TABLES.PERSONAL_VOCABULARY_EXAMPLES}(word_id, id);`,
  `CREATE INDEX IF NOT EXISTS idx_vocabulary_word_tags_tag ON ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS}(tag_id, word_id);`,
];
