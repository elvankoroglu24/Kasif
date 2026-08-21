import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from './index';
import { TABLES } from './schema';

export interface ImportContentItem {
  type: string;
  number_in_work?: string;
  metadata?: any;
  translations: {
    language: string;
    text_content: string;
    metadata?: any;
  }[];
  commentaries?: {
    language: string;
    title?: string;
    text_content: string;
    author_name?: string;
    edition_name?: string;
  }[];
}

export interface ImportSectionItem {
  title: string;
  number?: number;
  type: string;
  metadata?: any;
  contents: ImportContentItem[];
  subsections?: ImportSectionItem[];
}

export interface ImportWorkData {
  author_name?: string;
  title: string;
  alternative_title?: string;
  type: string;
  language: string;
  description?: string;
  metadata?: any;
  sections: ImportSectionItem[];
}

export class ContentImportService {
  /**
   * Imports a complete work with its sections and contents.
   * Uses a transaction to ensure atomicity.
   */
  static async importWork(data: ImportWorkData): Promise<{ workId: number }> {
    const db = getDb();
    let workId = 0;

    try {
      // In expo-sqlite, we can use withTransactionAsync or manually manage it
      // For this environment, we'll use a simple sequential execution
      // but in a real app, withTransactionAsync is preferred.
      
      await db.execAsync('BEGIN TRANSACTION;');

      // 1. Handle Author
      let authorId: number | null = null;
      if (data.author_name) {
        await db.runAsync(
          `INSERT OR IGNORE INTO ${TABLES.AUTHORS} (name) VALUES (?)`,
          [data.author_name]
        );
        const author = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM ${TABLES.AUTHORS} WHERE name = ?`,
          [data.author_name]
        );
        authorId = author?.id || null;
      }

      // 2. Handle Work
      const workResult = await db.runAsync(
        `INSERT INTO ${TABLES.WORKS} (author_id, title, alternative_title, type, language, description, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          authorId,
          data.title,
          data.alternative_title || null,
          data.type,
          data.language,
          data.description || null,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      );
      workId = workResult.lastInsertRowId;

      // 3. Handle Sections and Contents recursively
      for (const section of data.sections) {
        await this.importSection(db, workId, section, null);
      }

      await db.execAsync('COMMIT;');
      return { workId };
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      console.error('Failed to import work:', error);
      throw error;
    }
  }

  private static async importSection(
    db: SQLiteDatabase,
    workId: number,
    sectionData: ImportSectionItem,
    parentId: number | null
  ): Promise<number> {
    const sectionResult = await db.runAsync(
      `INSERT INTO ${TABLES.SECTIONS} (work_id, parent_id, title, number, type, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        workId,
        parentId,
        sectionData.title,
        sectionData.number || null,
        sectionData.type,
        sectionData.metadata ? JSON.stringify(sectionData.metadata) : null
      ]
    );
    const sectionId = sectionResult.lastInsertRowId;

    // Import contents
    for (const content of sectionData.contents) {
      const contentResult = await db.runAsync(
        `INSERT INTO ${TABLES.CONTENTS} (section_id, type, number_in_work, metadata) 
         VALUES (?, ?, ?, ?)`,
        [
          sectionId,
          content.type,
          content.number_in_work || null,
          content.metadata ? JSON.stringify(content.metadata) : null
        ]
      );
      const contentId = contentResult.lastInsertRowId;

      // Import translations
      for (const trans of content.translations) {
        await db.runAsync(
          `INSERT INTO ${TABLES.CONTENT_TRANSLATIONS} (content_id, language, text_content, metadata) 
           VALUES (?, ?, ?, ?)`,
          [
            contentId,
            trans.language,
            trans.text_content,
            trans.metadata ? JSON.stringify(trans.metadata) : null
          ]
        );
      }

      // Import commentaries
      if (content.commentaries) {
        for (const comm of content.commentaries) {
          let commAuthorId: number | null = null;
          if (comm.author_name) {
            await db.runAsync(`INSERT OR IGNORE INTO ${TABLES.AUTHORS} (name) VALUES (?)`, [comm.author_name]);
            const author = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${TABLES.AUTHORS} WHERE name = ?`, [comm.author_name]);
            commAuthorId = author?.id || null;
          }

          await db.runAsync(
            `INSERT INTO ${TABLES.COMMENTARIES} (content_id, author_id, language, title, text_content) 
             VALUES (?, ?, ?, ?, ?)`,
            [contentId, commAuthorId, comm.language, comm.title || null, comm.text_content]
          );
        }
      }
    }

    // Import sub-sections
    if (sectionData.subsections) {
      for (const sub of sectionData.subsections) {
        await this.importSection(db, workId, sub, sectionId);
      }
    }

    return sectionId;
  }
}
