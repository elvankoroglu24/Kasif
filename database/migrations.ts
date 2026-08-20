import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA, TABLES, INDEXES } from './schema';

const DATABASE_VERSION = 3;

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
