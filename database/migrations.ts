import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA, TABLES, INDEXES } from './schema';

export const DATABASE_VERSION = 7;

const SEARCH_TRIGGERS_SQL = `
  CREATE TRIGGER IF NOT EXISTS tr_content_translations_ai AFTER INSERT ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
    INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content)
    VALUES (new.content_id, new.language, new.text_content);
  END;
  CREATE TRIGGER IF NOT EXISTS tr_content_translations_ad AFTER DELETE ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
    DELETE FROM ${TABLES.FTS_CONTENT}
    WHERE content_id = old.content_id AND language = old.language;
  END;
  CREATE TRIGGER IF NOT EXISTS tr_content_translations_au AFTER UPDATE ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
    DELETE FROM ${TABLES.FTS_CONTENT}
    WHERE content_id = old.content_id AND language = old.language;
    INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content)
    VALUES (new.content_id, new.language, new.text_content);
  END;

  CREATE TRIGGER IF NOT EXISTS tr_commentaries_ai AFTER INSERT ON ${TABLES.COMMENTARIES} BEGIN
    INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content)
    VALUES (new.id, new.title, new.text_content);
  END;
  CREATE TRIGGER IF NOT EXISTS tr_commentaries_ad AFTER DELETE ON ${TABLES.COMMENTARIES} BEGIN
    DELETE FROM ${TABLES.FTS_COMMENTARY} WHERE commentary_id = old.id;
  END;
  CREATE TRIGGER IF NOT EXISTS tr_commentaries_au AFTER UPDATE ON ${TABLES.COMMENTARIES} BEGIN
    DELETE FROM ${TABLES.FTS_COMMENTARY} WHERE commentary_id = old.id;
    INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content)
    VALUES (new.id, new.title, new.text_content);
  END;

  CREATE TRIGGER IF NOT EXISTS tr_researches_ai AFTER INSERT ON ${TABLES.RESEARCHES} BEGIN
    INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body)
    VALUES (new.id, new.title, new.summary, new.body);
  END;
  CREATE TRIGGER IF NOT EXISTS tr_researches_ad AFTER DELETE ON ${TABLES.RESEARCHES} BEGIN
    DELETE FROM ${TABLES.FTS_RESEARCH} WHERE research_id = old.id;
  END;
  CREATE TRIGGER IF NOT EXISTS tr_researches_au AFTER UPDATE ON ${TABLES.RESEARCHES} BEGIN
    DELETE FROM ${TABLES.FTS_RESEARCH} WHERE research_id = old.id;
    INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body)
    VALUES (new.id, new.title, new.summary, new.body);
  END;
`;

/**
 * Runs all schema migrations safely and non-destructively.
 *
 * Version 7 is the preloaded-database contract: the complete relational schema
 * exists, content tables may contain static hadith data, and every FTS5 row is
 * rebuilt from its source table exactly once during the upgrade.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  try {
    // A brand-new empty SQLite file does not have metadata yet. Create it
    // before querying its version so the fallback path is also safe.
    await db.execAsync(`
      PRAGMA foreign_keys = ON;
      ${SCHEMA[TABLES.METADATA]}
    `);

    const result = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${TABLES.METADATA} WHERE key = 'version'`,
    );
    const currentVersion = result ? Number.parseInt(result.value, 10) : 0;

    if (currentVersion >= DATABASE_VERSION) {
      // A preloaded v7 database already contains the full data set. Ensuring
      // triggers is harmless and protects user-created commentaries/research.
      await ensureFullSchemaAndSearchTriggers(db);
      return;
    }

    console.log(`Migrating database from version ${currentVersion} to ${DATABASE_VERSION}...`);

    if (currentVersion === 0) {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        ${SCHEMA[TABLES.PLACEHOLDER]}
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '1');
      `);
    }

    if (currentVersion < 2) {
      await db.execAsync(`
        ${SCHEMA[TABLES.AUTHORS]}
        ${SCHEMA[TABLES.WORKS]}
        ${SCHEMA[TABLES.EDITIONS]}
        ${SCHEMA[TABLES.SECTIONS]}
        ${SCHEMA[TABLES.CONTENTS]}
        ${SCHEMA[TABLES.CONTENT_TRANSLATIONS]}
        ${SCHEMA[TABLES.COMMENTARIES]}
        ${INDEXES[0]}
        ${INDEXES[1]}
        ${INDEXES[2]}
        ${INDEXES[3]}
        ${INDEXES[4]}
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '2');
      `);
      await seedTestData(db);
    }

    if (currentVersion < 3) {
      await db.execAsync(`
        ${SCHEMA[TABLES.RESEARCHES]}
        ${SCHEMA[TABLES.TAGS]}
        ${SCHEMA[TABLES.RESEARCH_TAGS]}
        ${SCHEMA[TABLES.RESEARCH_SOURCES]}
        ${SCHEMA[TABLES.RESEARCH_RELATIONS]}
        ${INDEXES[5]}
        ${INDEXES[6]}
        ${INDEXES[7]}
        ${INDEXES[8]}
        ${INDEXES[9]}
        ${INDEXES[10]}
        ${INDEXES[11]}
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '3');
      `);
      await seedResearchTestData(db);
    }

    if (currentVersion < 4) {
      await db.execAsync(`
        ${SCHEMA[TABLES.FTS_CONTENT]}
        ${SCHEMA[TABLES.FTS_COMMENTARY]}
        ${SCHEMA[TABLES.FTS_RESEARCH]}
        ${SEARCH_TRIGGERS_SQL}
        INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content)
          SELECT content_id, language, text_content FROM ${TABLES.CONTENT_TRANSLATIONS};
        INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content)
          SELECT id, title, text_content FROM ${TABLES.COMMENTARIES};
        INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body)
          SELECT id, title, summary, body FROM ${TABLES.RESEARCHES};
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '4');
      `);
      await seedExtraTestContent(db);
    }

    if (currentVersion < 5) {
      await db.execAsync(
        `INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '5');`,
      );
    }

    if (currentVersion < 6) {
      await ensureFullSchemaAndSearchTriggers(db);
      await db.execAsync(
        `INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '6');`,
      );
    }

    if (currentVersion < 7) {
      await ensureFullSchemaAndSearchTriggers(db);
      await rebuildFtsIndexes(db);
      await db.execAsync(`
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '7');
        PRAGMA user_version = 7;
      `);
    }

    await ensureFullSchemaAndSearchTriggers(db);
    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
}

async function ensureFullSchemaAndSearchTriggers(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ${SCHEMA[TABLES.PLACEHOLDER]}
    ${SCHEMA[TABLES.AUTHORS]}
    ${SCHEMA[TABLES.WORKS]}
    ${SCHEMA[TABLES.EDITIONS]}
    ${SCHEMA[TABLES.SECTIONS]}
    ${SCHEMA[TABLES.CONTENTS]}
    ${SCHEMA[TABLES.CONTENT_TRANSLATIONS]}
    ${SCHEMA[TABLES.COMMENTARIES]}
    ${SCHEMA[TABLES.RESEARCHES]}
    ${SCHEMA[TABLES.TAGS]}
    ${SCHEMA[TABLES.RESEARCH_TAGS]}
    ${SCHEMA[TABLES.RESEARCH_SOURCES]}
    ${SCHEMA[TABLES.RESEARCH_RELATIONS]}
    ${SCHEMA[TABLES.FTS_CONTENT]}
    ${SCHEMA[TABLES.FTS_COMMENTARY]}
    ${SCHEMA[TABLES.FTS_RESEARCH]}
    ${INDEXES.join('\n')}
    ${SEARCH_TRIGGERS_SQL}
  `);
}

async function rebuildFtsIndexes(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM ${TABLES.FTS_CONTENT};
    DELETE FROM ${TABLES.FTS_COMMENTARY};
    DELETE FROM ${TABLES.FTS_RESEARCH};
    INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content)
      SELECT content_id, language, text_content FROM ${TABLES.CONTENT_TRANSLATIONS};
    INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content)
      SELECT id, title, text_content FROM ${TABLES.COMMENTARIES};
    INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body)
      SELECT id, title, summary, body FROM ${TABLES.RESEARCHES};
  `);
}

async function seedTestData(db: SQLiteDatabase): Promise<void> {
  try {
    const workCheck = await db.getFirstAsync(`SELECT id FROM ${TABLES.WORKS} LIMIT 1`);
    if (workCheck) return;

    await db.execAsync(`
      INSERT INTO ${TABLES.AUTHORS} (name) VALUES ('Test Author');
      INSERT INTO ${TABLES.WORKS} (author_id, title, type, language) VALUES (1, 'Test Work', 'hadith', 'tr');
      INSERT INTO ${TABLES.SECTIONS} (work_id, title, number, type) VALUES (1, 'Test Book', 1, 'book');
      INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work) VALUES (1, 'hadith', '1');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (1, 'tr', 'Test hadis metni.');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (1, 'ar', 'متن الحديث التجريبي');
      INSERT INTO ${TABLES.COMMENTARIES} (content_id, language, text_content) VALUES (1, 'tr', 'Test şerh metni.');
    `);
  } catch (error) {
    console.warn('Seed data failed (non-critical):', error);
  }
}

async function seedResearchTestData(db: SQLiteDatabase): Promise<void> {
  try {
    const researchCheck = await db.getFirstAsync(`SELECT id FROM ${TABLES.RESEARCHES} LIMIT 1`);
    if (researchCheck) return;

    await db.execAsync(`
      INSERT INTO ${TABLES.RESEARCHES}
        (title, summary, body, category, status, visibility)
        VALUES ('Örnek Araştırma', 'Bu taslak bir örnek araştırmadır.', 'Araştırma gövde metni ve notlar burada yer alır.', 'general', 'draft', 'private');
      INSERT INTO ${TABLES.TAGS} (name) VALUES ('genel');
      INSERT INTO ${TABLES.TAGS} (name) VALUES ('taslak');
      INSERT INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (1, 1);
      INSERT INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (1, 2);
      INSERT INTO ${TABLES.RESEARCH_SOURCES}
        (research_id, source_type, source_id, note)
        VALUES (1, 'work', 1, 'Örnek eser referansı');
    `);
  } catch (error) {
    console.warn('Research seed data failed (non-critical):', error);
  }
}

async function seedExtraTestContent(db: SQLiteDatabase): Promise<void> {
  try {
    const ayahCheck = await db.getFirstAsync(`SELECT id FROM ${TABLES.CONTENTS} WHERE type = 'ayah' LIMIT 1`);
    if (ayahCheck) return;

    await db.execAsync(`
      INSERT INTO ${TABLES.WORKS} (title, type, language) VALUES ('TEST QURAN', 'ayah', 'ar');
      INSERT INTO ${TABLES.SECTIONS} (work_id, title, number, type, metadata)
        VALUES (2, 'TEST SURAH', 1, 'surah', '{"revelation_place": "Mecca"}');
      INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work, metadata)
        VALUES (2, 'ayah', '1', '{"page": 1, "juz": 1}');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content)
        VALUES (2, 'ar', 'TEST ARABIC AYAH');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content)
        VALUES (2, 'tr', 'TEST TÜRKÇE MEAL');
      INSERT INTO ${TABLES.WORKS} (title, type, language) VALUES ('TEST DHIKR BOOK', 'dhikr', 'ar');
      INSERT INTO ${TABLES.SECTIONS} (work_id, title, number, type)
        VALUES (3, 'TEST DHIKR SECTION', 1, 'chapter');
      INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work, metadata)
        VALUES (3, 'dhikr', '1', '{"target_count": 33}');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content)
        VALUES (3, 'ar', 'TEST ARABIC DHIKR');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content)
        VALUES (3, 'tr', 'TEST TÜRKÇE ZİKİR ANLAMI');
    `);
  } catch (error) {
    console.warn('Extra seed data failed (non-critical):', error);
  }
}
