import { getDb } from './index';
import { TABLES } from './schema';
import { Content, ContentTranslation, Commentary, Author, Work, Section } from './types';

export interface ContentDetail extends Content {
  translations: ContentTranslation[];
  commentaries: (Commentary & { author_name?: string; work_title?: string })[];
  section?: Section;
  work?: Work & { author_name?: string };
}

export const ContentService = {
  /**
   * Fetches full content details including translations, commentaries, and source chain.
   */
  async getContentDetail(id: number): Promise<ContentDetail | null> {
    const db = getDb();
    
    // 1. Get base content
    const content = await db.getFirstAsync<Content>(
      `SELECT * FROM ${TABLES.CONTENTS} WHERE id = ?`,
      [id]
    );
    
    if (!content) return null;

    // 2. Get translations
    const translations = await db.getAllAsync<ContentTranslation>(
      `SELECT * FROM ${TABLES.CONTENT_TRANSLATIONS} WHERE content_id = ?`,
      [id]
    );

    // 3. Get commentaries with author and work info
    const commentaries = await db.getAllAsync<any>(
      `SELECT c.*, a.name as author_name, w.title as work_title
       FROM ${TABLES.COMMENTARIES} c
       LEFT JOIN ${TABLES.AUTHORS} a ON c.author_id = a.id
       LEFT JOIN ${TABLES.EDITIONS} e ON c.edition_id = e.id
       LEFT JOIN ${TABLES.WORKS} w ON e.work_id = w.id
       WHERE c.content_id = ?`,
      [id]
    );

    // 4. Get section and work info
    let section: Section | undefined;
    let work: (Work & { author_name?: string }) | undefined;

    if (content.section_id) {
      const sectionResult = await db.getFirstAsync<Section>(
        `SELECT * FROM ${TABLES.SECTIONS} WHERE id = ?`,
        [content.section_id]
      );
      section = sectionResult || undefined;

      if (section) {
        work = await db.getFirstAsync<any>(
          `SELECT w.*, a.name as author_name
           FROM ${TABLES.WORKS} w
           LEFT JOIN ${TABLES.AUTHORS} a ON w.author_id = a.id
           WHERE w.id = ?`,
          [section.work_id]
        );
      }
    }

    return {
      ...content,
      translations,
      commentaries,
      section,
      work
    };
  }
};
