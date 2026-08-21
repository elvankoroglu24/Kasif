import { getDb } from './index';
import { TABLES } from './schema';
import { Research, Tag, ResearchTag, ResearchSource, ResearchCategory, ResearchStatus, ResearchVisibility } from './types';

export interface WorkedHadithItem {
  content_id: number;
  number_in_work: string | null;
  work_title: string;
  author_name: string | null;
  text_snippet: string;
  research_count: number;
  has_commentary: boolean;
  has_notes: boolean;
  has_research: boolean;
  has_sources: boolean;
  source_count: number;
  statuses: string[];
  last_worked_at: string;
}

export const ResearchService = {
  /**
   * Fetches all researches with optional filtering
   */
  async getAllResearches(filters?: {
    category?: string;
    status?: string;
    search?: string;
    tagId?: number;
  }): Promise<Research[]> {
    const db = getDb();
    let query = `SELECT * FROM ${TABLES.RESEARCHES} WHERE 1=1`;
    const params: any[] = [];

    if (filters?.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }

    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters?.search) {
      query += ` AND (title LIKE ? OR body LIKE ? OR summary LIKE ?)`;
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters?.tagId) {
      query += ` AND id IN (SELECT research_id FROM ${TABLES.RESEARCH_TAGS} WHERE tag_id = ?)`;
      params.push(filters.tagId);
    }

    query += ` ORDER BY updated_at DESC`;

    return await db.getAllAsync<Research>(query, params);
  },

  /**
   * Fetches a single research by ID
   */
  async getResearchById(id: number): Promise<Research | null> {
    const db = getDb();
    return await db.getFirstAsync<Research>(
      `SELECT * FROM ${TABLES.RESEARCHES} WHERE id = ?`,
      [id]
    );
  },

  /**
   * Fetches tags for a specific research
   */
  async getResearchTags(researchId: number): Promise<Tag[]> {
    const db = getDb();
    return await db.getAllAsync<Tag>(
      `SELECT t.* FROM ${TABLES.TAGS} t 
       JOIN ${TABLES.RESEARCH_TAGS} rt ON t.id = rt.tag_id 
       WHERE rt.research_id = ?`,
      [researchId]
    );
  },

  /**
   * Fetches sources for a specific research
   */
  async getResearchSources(researchId: number): Promise<ResearchSource[]> {
    const db = getDb();
    return await db.getAllAsync<ResearchSource>(
      `SELECT * FROM ${TABLES.RESEARCH_SOURCES} WHERE research_id = ?`,
      [researchId]
    );
  },

  /**
   * Fetches researches linked to a specific source
   */
  async getResearchesBySource(sourceType: string, sourceId: number): Promise<Research[]> {
    const db = getDb();
    return await db.getAllAsync<Research>(
      `SELECT r.* FROM ${TABLES.RESEARCHES} r
       JOIN ${TABLES.RESEARCH_SOURCES} rs ON r.id = rs.research_id
       WHERE rs.source_type = ? AND rs.source_id = ?
       ORDER BY r.updated_at DESC`,
      [sourceType, sourceId]
    );
  },

  /**
   * Fetches worked hadiths (hadiths with researches, notes, commentaries, or sources)
   */
  async getWorkedHadiths(filterType?: string, sortBy?: string): Promise<WorkedHadithItem[]> {
    const db = getDb();
    
    // We aggregate researches linked via research_sources where source_type = 'content'
    let query = `
      SELECT 
        c.id as content_id,
        c.number_in_work,
        w.title as work_title,
        a.name as author_name,
        SUBSTR(COALESCE(ct_tr.text_content, ct_ar.text_content), 1, 120) as text_snippet,
        COUNT(DISTINCT r.id) as research_count,
        MAX(CASE WHEN r.category = 'commentary' THEN 1 ELSE 0 END) as has_commentary,
        MAX(CASE WHEN LENGTH(r.body) > 0 THEN 1 ELSE 0 END) as has_notes,
        1 as has_research,
        COUNT(DISTINCT rs.id) as source_count,
        MAX(CASE WHEN rs.id IS NOT NULL THEN 1 ELSE 0 END) as has_sources,
        GROUP_CONCAT(DISTINCT r.status) as statuses_str,
        MAX(r.updated_at) as last_worked_at
      FROM ${TABLES.CONTENTS} c
      JOIN ${TABLES.RESEARCH_SOURCES} rs ON c.id = rs.source_id AND rs.source_type = 'content'
      JOIN ${TABLES.RESEARCHES} r ON rs.research_id = r.id
      LEFT JOIN ${TABLES.SECTIONS} s ON c.section_id = s.id
      LEFT JOIN ${TABLES.WORKS} w ON s.work_id = w.id
      LEFT JOIN ${TABLES.AUTHORS} a ON w.author_id = a.id
      LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} ct_tr ON c.id = ct_tr.content_id AND ct_tr.language = 'tr'
      LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} ct_ar ON c.id = ct_ar.content_id AND ct_ar.language = 'ar'
      WHERE c.type = 'hadith'
      GROUP BY c.id
    `;

    // Add filtering
    if (filterType) {
      if (filterType === 'commentary') {
        query += ` HAVING has_commentary = 1`;
      } else if (filterType === 'notes') {
        query += ` HAVING has_notes = 1`;
      } else if (filterType === 'research') {
        query += ` HAVING research_count > 0`;
      } else if (filterType === 'sources') {
        query += ` HAVING has_sources = 1`;
      } else if (filterType === 'draft') {
        query += ` HAVING statuses_str LIKE '%draft%'`;
      } else if (filterType === 'completed') {
        query += ` HAVING statuses_str LIKE '%completed%'`;
      }
    }

    // Add sorting
    if (sortBy === 'oldest') {
      query += ` ORDER BY last_worked_at ASC`;
    } else if (sortBy === 'work') {
      query += ` ORDER BY work_title ASC, c.id ASC`;
    } else if (sortBy === 'source') {
      query += ` ORDER BY source_count DESC, last_worked_at DESC`;
    } else {
      // Default: last_worked_at DESC
      query += ` ORDER BY last_worked_at DESC`;
    }

    const rows = await db.getAllAsync<any>(query);

    return rows.map(row => ({
      content_id: row.content_id,
      number_in_work: row.number_in_work,
      work_title: row.work_title || 'Bilinmeyen Eser',
      author_name: row.author_name,
      text_snippet: row.text_snippet ? row.text_snippet + '...' : 'Metin bulunmuyor.',
      research_count: row.research_count,
      has_commentary: Boolean(row.has_commentary),
      has_notes: Boolean(row.has_notes),
      has_research: Boolean(row.has_research),
      has_sources: Boolean(row.has_sources),
      source_count: Number(row.source_count || 0),
      statuses: row.statuses_str ? row.statuses_str.split(',') : [],
      last_worked_at: row.last_worked_at
    }));
  },

  /**
   * Creates a new research entry
   */
  async createResearch(data: {
    title: string;
    summary?: string;
    body?: string;
    category: string;
    status: string;
    visibility: string;
    tags?: string[];
    sources?: { sourceType: string; sourceId: number; note?: string }[];
  }): Promise<number> {
    const db = getDb();
    
    const result = await db.runAsync(
      `INSERT INTO ${TABLES.RESEARCHES} (title, summary, body, category, status, visibility, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [data.title, data.summary || '', data.body || '', data.category, data.status, data.visibility]
    );

    const researchId = result.lastInsertRowId;

    // Handle Tags
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const trimmedTag = tagName.trim().toLowerCase();
        if (!trimmedTag) continue;

        await db.runAsync(`INSERT OR IGNORE INTO ${TABLES.TAGS} (name) VALUES (?)`, [trimmedTag]);
        const tag = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${TABLES.TAGS} WHERE name = ?`, [trimmedTag]);
        
        if (tag) {
          await db.runAsync(
            `INSERT OR IGNORE INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (?, ?)`,
            [researchId, tag.id]
          );
        }
      }
    }

    // Handle Sources
    if (data.sources && data.sources.length > 0) {
      for (const source of data.sources) {
        await db.runAsync(
          `INSERT INTO ${TABLES.RESEARCH_SOURCES} (research_id, source_type, source_id, note) 
           VALUES (?, ?, ?, ?)`,
          [researchId, source.sourceType, source.sourceId, source.note || null]
        );
      }
    }

    return researchId;
  },

  /**
   * Updates an existing research entry
   */
  async updateResearch(id: number, data: {
    title: string;
    summary?: string;
    body?: string;
    category: string;
    status: string;
    visibility: string;
    tags?: string[];
  }): Promise<void> {
    const db = getDb();
    
    await db.runAsync(
      `UPDATE ${TABLES.RESEARCHES} 
       SET title = ?, summary = ?, body = ?, category = ?, status = ?, visibility = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data.title, data.summary || '', data.body || '', data.category, data.status, data.visibility, id]
    );

    if (data.tags !== undefined) {
      await db.runAsync(`DELETE FROM ${TABLES.RESEARCH_TAGS} WHERE research_id = ?`, [id]);
      
      for (const tagName of data.tags) {
        const trimmedTag = tagName.trim().toLowerCase();
        if (!trimmedTag) continue;

        await db.runAsync(`INSERT OR IGNORE INTO ${TABLES.TAGS} (name) VALUES (?)`, [trimmedTag]);
        const tag = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${TABLES.TAGS} WHERE name = ?`, [trimmedTag]);
        
        if (tag) {
          await db.runAsync(
            `INSERT OR IGNORE INTO ${TABLES.RESEARCH_TAGS} (research_id, tag_id) VALUES (?, ?)`,
            [id, tag.id]
          );
        }
      }
    }
  },

  /**
   * Adds a source to an existing research
   */
  async addSourceToResearch(researchId: number, sourceType: string, sourceId: number, note?: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLES.RESEARCH_SOURCES} (research_id, source_type, source_id, note) 
       VALUES (?, ?, ?, ?)`,
      [researchId, sourceType, sourceId, note || null]
    );
  },

  /**
   * Deletes a research entry and its relations
   */
  async deleteResearch(id: number): Promise<void> {
    const db = getDb();
    await db.runAsync(`DELETE FROM ${TABLES.RESEARCHES} WHERE id = ?`, [id]);
  },

  /**
   * Fetches all unique categories currently in use
   */
  async getUsedCategories(): Promise<string[]> {
    const db = getDb();
    const results = await db.getAllAsync<{ category: string }>(
      `SELECT DISTINCT category FROM ${TABLES.RESEARCHES}`
    );
    return results.map(r => r.category);
  },

  /**
   * Fetches all tags
   */
  async getAllTags(): Promise<Tag[]> {
    const db = getDb();
    return await db.getAllAsync<Tag>(`SELECT * FROM ${TABLES.TAGS} ORDER BY name ASC`);
  }
};
