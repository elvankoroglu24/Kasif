import { getDb } from './index';
import { Favorite, FavoriteHadithItem } from './types';
import { TABLES } from './schema';

export const FavoritesService = {
  async isFavorite(contentId: number): Promise<boolean> {
    const db = getDb();
    const row = await db.getFirstAsync<{ exists: number }>(
      `SELECT 1 AS exists FROM ${TABLES.FAVORITES} WHERE content_id = ? LIMIT 1`,
      [contentId],
    );
    return row?.exists === 1;
  },

  async addFavorite(contentId: number): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLES.FAVORITES} (content_id) VALUES (?)`,
      [contentId],
    );
  },

  async removeFavorite(contentId: number): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `DELETE FROM ${TABLES.FAVORITES} WHERE content_id = ?`,
      [contentId],
    );
  },

  async toggleFavorite(contentId: number): Promise<boolean> {
    const currentlyFavorite = await this.isFavorite(contentId);
    if (currentlyFavorite) {
      await this.removeFavorite(contentId);
      return false;
    }

    await this.addFavorite(contentId);
    return true;
  },

  async getFavorites(): Promise<FavoriteHadithItem[]> {
    const db = getDb();
    return db.getAllAsync<FavoriteHadithItem>(
      `
        SELECT
          f.content_id,
          c.number_in_work,
          COALESCE(w.title, '') AS work_title,
          a.name AS author_name,
          s.title AS section_title,
          s.metadata AS section_metadata,
          COALESCE(ar.text_content, fallback.text_content, '') AS text_snippet,
          f.created_at AS favorited_at
        FROM ${TABLES.FAVORITES} f
        INNER JOIN ${TABLES.CONTENTS} c ON c.id = f.content_id
        LEFT JOIN ${TABLES.SECTIONS} s ON s.id = c.section_id
        LEFT JOIN ${TABLES.WORKS} w ON w.id = s.work_id
        LEFT JOIN ${TABLES.AUTHORS} a ON a.id = w.author_id
        LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} ar
          ON ar.content_id = c.id AND ar.language = 'ar'
        LEFT JOIN ${TABLES.CONTENT_TRANSLATIONS} fallback
          ON fallback.content_id = c.id AND fallback.id = (
            SELECT MIN(ct.id)
            FROM ${TABLES.CONTENT_TRANSLATIONS} ct
            WHERE ct.content_id = c.id
          )
        ORDER BY f.created_at DESC, f.id DESC
      `,
    );
  },

  async getFavoriteRecords(): Promise<Favorite[]> {
    const db = getDb();
    return db.getAllAsync<Favorite>(
      `
        SELECT id, content_id, created_at
        FROM ${TABLES.FAVORITES}
        ORDER BY created_at DESC, id DESC
      `,
    );
  },
};

export default FavoritesService;
