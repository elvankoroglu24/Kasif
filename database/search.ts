import { getDb } from './index';
import { TABLES } from './schema';

export type SearchResultType = 'content' | 'commentary' | 'research';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title?: string;
  snippet: string;
  language?: string;
  work_title?: string;
  author_name?: string;
  category?: string;
  rank: number;
}

export class SearchService {
  /**
   * Performs a unified search across contents, commentaries, and researches.
   */
  static async unifiedSearch(query: string, limit: number = 20): Promise<SearchResult[]> {
    const db = getDb();
    const results: SearchResult[] = [];
    
    // FTS5 search query
    // We use snippet() to get the matching part with context
    
    try {
      // 1. Search in Contents (Translations)
      const contentQuery = `
        SELECT 
          f.content_id as id,
          'content' as type,
          w.title as work_title,
          a.name as author_name,
          f.language,
          snippet(${TABLES.FTS_CONTENT}, 2, '<b>', '</b>', '...', 20) as snippet,
          bm25(${TABLES.FTS_CONTENT}) as rank
        FROM ${TABLES.FTS_CONTENT} f
        JOIN ${TABLES.CONTENTS} c ON f.content_id = c.id
        JOIN ${TABLES.SECTIONS} s ON c.section_id = s.id
        JOIN ${TABLES.WORKS} w ON s.work_id = w.id
        LEFT JOIN ${TABLES.AUTHORS} a ON w.author_id = a.id
        WHERE ${TABLES.FTS_CONTENT} MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      const contentResults = await db.getAllAsync<any>(contentQuery, [query, limit]);
      results.push(...contentResults.map(r => ({ ...r, rank: Math.abs(r.rank) })));

      // 2. Search in Commentaries
      const commentaryQuery = `
        SELECT 
          f.commentary_id as id,
          'commentary' as type,
          f.title as title,
          snippet(${TABLES.FTS_COMMENTARY}, 2, '<b>', '</b>', '...', 20) as snippet,
          bm25(${TABLES.FTS_COMMENTARY}) as rank
        FROM ${TABLES.FTS_COMMENTARY} f
        WHERE ${TABLES.FTS_COMMENTARY} MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      const commentaryResults = await db.getAllAsync<any>(commentaryQuery, [query, limit]);
      results.push(...commentaryResults.map(r => ({ ...r, rank: Math.abs(r.rank) })));

      // 3. Search in Researches
      const researchQuery = `
        SELECT 
          f.research_id as id,
          'research' as type,
          f.title as title,
          r.category as category,
          snippet(${TABLES.FTS_RESEARCH}, 3, '<b>', '</b>', '...', 20) as snippet,
          bm25(${TABLES.FTS_RESEARCH}) as rank
        FROM ${TABLES.FTS_RESEARCH} f
        JOIN ${TABLES.RESEARCHES} r ON f.research_id = r.id
        WHERE ${TABLES.FTS_RESEARCH} MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      const researchResults = await db.getAllAsync<any>(researchQuery, [query, limit]);
      results.push(...researchResults.map(r => ({ ...r, rank: Math.abs(r.rank) })));

      // Sort combined results by rank (lower is better for bm25)
      return results.sort((a, b) => a.rank - b.rank).slice(0, limit);
    } catch (error) {
      console.error('Search failed:', error);
      // Fallback to basic LIKE search if FTS5 fails or syntax is wrong
      return this.fallbackSearch(query, limit);
    }
  }

  /**
   * Fallback search using LIKE for basic matching.
   */
  private static async fallbackSearch(query: string, limit: number): Promise<SearchResult[]> {
    const db = getDb();
    const searchParam = `%${query}%`;
    const results: SearchResult[] = [];

    const contentResults = await db.getAllAsync<any>(
      `SELECT c.id, 'content' as type, ct.text_content as snippet, w.title as work_title 
       FROM ${TABLES.CONTENT_TRANSLATIONS} ct
       JOIN ${TABLES.CONTENTS} c ON ct.content_id = c.id
       JOIN ${TABLES.SECTIONS} s ON c.section_id = s.id
       JOIN ${TABLES.WORKS} w ON s.work_id = w.id
       WHERE ct.text_content LIKE ? LIMIT ?`,
      [searchParam, limit]
    );
    results.push(...contentResults.map(r => ({ ...r, snippet: r.snippet.substring(0, 100) + '...', rank: 0 })));

    return results;
  }
}
