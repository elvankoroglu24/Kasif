import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA, TABLES, INDEXES } from './schema';

const DATABASE_VERSION = 6;

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
      // FTS5 Virtual Tables and Triggers
      await db.execAsync(`
        ${SCHEMA[TABLES.FTS_CONTENT]}
        ${SCHEMA[TABLES.FTS_COMMENTARY]}
        ${SCHEMA[TABLES.FTS_RESEARCH]}

        -- Triggers for content_translations
        CREATE TRIGGER IF NOT EXISTS tr_content_translations_ai AFTER INSERT ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
          INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content) VALUES (new.content_id, new.language, new.text_content);
        END;
        CREATE TRIGGER IF NOT EXISTS tr_content_translations_ad AFTER DELETE ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
          DELETE FROM ${TABLES.FTS_CONTENT} WHERE content_id = old.content_id AND language = old.language;
        END;
        CREATE TRIGGER IF NOT EXISTS tr_content_translations_au AFTER UPDATE ON ${TABLES.CONTENT_TRANSLATIONS} BEGIN
          DELETE FROM ${TABLES.FTS_CONTENT} WHERE content_id = old.content_id AND language = old.language;
          INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content) VALUES (new.content_id, new.language, new.text_content);
        END;

        -- Triggers for commentaries
        CREATE TRIGGER IF NOT EXISTS tr_commentaries_ai AFTER INSERT ON ${TABLES.COMMENTARIES} BEGIN
          INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content) VALUES (new.id, new.title, new.text_content);
        END;
        CREATE TRIGGER IF NOT EXISTS tr_commentaries_ad AFTER DELETE ON ${TABLES.COMMENTARIES} BEGIN
          DELETE FROM ${TABLES.FTS_COMMENTARY} WHERE commentary_id = old.id;
        END;
        CREATE TRIGGER IF NOT EXISTS tr_commentaries_au AFTER UPDATE ON ${TABLES.COMMENTARIES} BEGIN
          DELETE FROM ${TABLES.FTS_COMMENTARY} WHERE commentary_id = old.id;
          INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content) VALUES (new.id, new.title, new.text_content);
        END;

        -- Triggers for researches
        CREATE TRIGGER IF NOT EXISTS tr_researches_ai AFTER INSERT ON ${TABLES.RESEARCHES} BEGIN
          INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body) VALUES (new.id, new.title, new.summary, new.body);
        END;
        CREATE TRIGGER IF NOT EXISTS tr_researches_ad AFTER DELETE ON ${TABLES.RESEARCHES} BEGIN
          DELETE FROM ${TABLES.FTS_RESEARCH} WHERE research_id = old.id;
        END;
        CREATE TRIGGER IF NOT EXISTS tr_researches_au AFTER UPDATE ON ${TABLES.RESEARCHES} BEGIN
          DELETE FROM ${TABLES.FTS_RESEARCH} WHERE research_id = old.id;
          INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body) VALUES (new.id, new.title, new.summary, new.body);
        END;

        -- Initial population of FTS tables
        INSERT INTO ${TABLES.FTS_CONTENT}(content_id, language, text_content) SELECT content_id, language, text_content FROM ${TABLES.CONTENT_TRANSLATIONS};
        INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content) SELECT id, title, text_content FROM ${TABLES.COMMENTARIES};
        INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body) SELECT id, title, summary, body FROM ${TABLES.RESEARCHES};

        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '4');
      `);

      await seedExtraTestContent(db);
    }

    if (currentVersion < 5) {
      // Version 5: Kütüb-i Sitte Basic Hadith Data Import
      console.log('Database version 5: Ready for Kütüb-i Sitte data.');
      await db.execAsync(`INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '5');`);
    }

    if (currentVersion < 6) {
      // Version 6: Pre-populated Database Transition
      // We don't need to run schema creation here if the DB was copied from assets,
      // but we ensure triggers are healthy for user data.
      console.log('Database version 6: Transitioning to pre-populated structure.');
      await db.execAsync(`
        -- Ensure all user-facing triggers exist even in pre-populated DB
        CREATE TRIGGER IF NOT EXISTS tr_commentaries_ai AFTER INSERT ON ${TABLES.COMMENTARIES} BEGIN
          INSERT INTO ${TABLES.FTS_COMMENTARY}(commentary_id, title, text_content) VALUES (new.id, new.title, new.text_content);
        END;
        CREATE TRIGGER IF NOT EXISTS tr_researches_ai AFTER INSERT ON ${TABLES.RESEARCHES} BEGIN
          INSERT INTO ${TABLES.FTS_RESEARCH}(research_id, title, summary, body) VALUES (new.id, new.title, new.summary, new.body);
        END;
        INSERT OR REPLACE INTO ${TABLES.METADATA} (key, value) VALUES ('version', '6');
      `);
    }

    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
}

/**
 * Seeds small amount of test data to verify the schema.
 */
async function seedTestData(db: SQLiteDatabase) {
  try {
    console.log('Seeding test data...');
    
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
    
    console.log('Test data seeded successfully.');
  } catch (error) {
    console.warn('Seed data failed (non-critical):', error);
  }
}

/**
 * Seeds placeholder research test data for schema verification.
 */
async function seedResearchTestData(db: SQLiteDatabase) {
  try {
    console.log('Seeding research test data...');
    
    const researchCheck = await db.getFirstAsync(`SELECT id FROM ${TABLES.RESEARCHES} LIMIT 1`);
    if (researchCheck) return;

    await db.execAsync(`
      INSERT INTO ${TABLES.RESEARCHES} (title, summary, body, category, status, visibility) 
      VALUES ('Örnek Araştırma', 'Bu taslak bir örnek araştırmadır.', 'Araştırma gövde metni ve notlar burada yer alır.', 'general', 'draft', 'private');
      
      INSERT INTO ${TABLES.TAGS} (name) VALUES ('genel');
      INSERT INTO ${TABLES.TAGS} (name) VALUES ('taslak');

      INSERT INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (1, 1);
      INSERT INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (1, 2);

      INSERT INTO ${TABLES.RESEARCH_SOURCES} (research_id, source_type, source_id, note) 
      VALUES (1, 'work', 1, 'Örnek eser referansı');
    `);
    
    console.log('Research test data seeded successfully.');
  } catch (error) {
    console.warn('Research seed data failed (non-critical):', error);
  }
}

/**
 * Seeds additional test content for various types (Ayah, Dhikr, etc.)
 */
async function seedExtraTestContent(db: SQLiteDatabase) {
  try {
    console.log('Seeding extra test content...');

    // Check if we already have test ayah
    const ayahCheck = await db.getFirstAsync(`SELECT id FROM ${TABLES.CONTENTS} WHERE type = 'ayah' LIMIT 1`);
    if (ayahCheck) return;

    await db.execAsync(`
      -- TEST QURAN DATA
      INSERT INTO ${TABLES.WORKS} (title, type, language) VALUES ('TEST QURAN', 'ayah', 'ar');
      INSERT INTO ${TABLES.SECTIONS} (work_id, title, number, type, metadata) VALUES (2, 'TEST SURAH', 1, 'surah', '{"revelation_place": "Mecca"}');
      INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work, metadata) VALUES (2, 'ayah', '1', '{"page": 1, "juz": 1}');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (2, 'ar', 'TEST ARABIC AYAH');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (2, 'tr', 'TEST TÜRKÇE MEAL');

      -- TEST DHIKR DATA
      INSERT INTO ${TABLES.WORKS} (title, type, language) VALUES ('TEST DHIKR BOOK', 'dhikr', 'ar');
      INSERT INTO ${TABLES.SECTIONS} (work_id, title, number, type) VALUES (3, 'TEST DHIKR SECTION', 1, 'chapter');
      INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work, metadata) VALUES (3, 'dhikr', '1', '{"target_count": 33}');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (3, 'ar', 'TEST ARABIC DHIKR');
      INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content) VALUES (3, 'tr', 'TEST TÜRKÇE ZİKİR ANLAMI');
    `);

    console.log('Extra test content seeded successfully.');
  } catch (error) {
    console.warn('Extra seed data failed (non-critical):', error);
  }
}
