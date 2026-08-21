import { getDb } from './index';
import { TABLES } from './schema';
import { Research, Tag, ResearchTag, ResearchSource, ResearchCategory, ResearchStatus, ResearchVisibility } from './types';

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
