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
  }): Promise<number> {
    const db = getDb();
    
    // Start transaction manually if needed, but expo-sqlite handles simple execs
    const result = await db.runAsync(
      `INSERT INTO ${TABLES.RESEARCHES} (title, summary, body, category, status, visibility, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [data.title, data.summary || '', data.body || '', data.category, data.status, data.visibility]
    );

    const researchId = result.lastInsertRowId;

    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const trimmedTag = tagName.trim().toLowerCase();
        if (!trimmedTag) continue;

        // Ensure tag exists
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
      // Clear existing tags
      await db.runAsync(`DELETE FROM ${TABLES.RESEARCH_TAGS} WHERE research_id = ?`, [id]);
      
      // Add new tags
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
   * Deletes a research entry and its relations
   */
  async deleteResearch(id: number): Promise<void> {
    const db = getDb();
    // Foreign keys with ON DELETE CASCADE will handle tags and sources relations
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
