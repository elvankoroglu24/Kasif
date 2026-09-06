import { getDb } from './index';
import { TABLES } from './schema';

export type DhikrRecord = {
  id: number;
  title: string;
  arabicText: string | null;
  transliteration: string | null;
  turkishMeaning: string | null;
  targetCount: number | null;
  source: string | null;
  currentCount: number;
  groupTitle: string | null;
  isUserCreated: boolean;
};

type DhikrRow = {
  id: number;
  title: string;
  arabic_text: string | null;
  transliteration: string | null;
  turkish_meaning: string | null;
  target_count: number | null;
  source: string | null;
  current_count: number | null;
  group_title: string | null;
  is_user_created: number;
};

function mapRow(row: DhikrRow): DhikrRecord {
  return {
    id: Number(row.id),
    title: String(row.title),
    arabicText: row.arabic_text,
    transliteration: row.transliteration,
    turkishMeaning: row.turkish_meaning,
    targetCount: row.target_count == null ? null : Number(row.target_count),
    source: row.source,
    currentCount: Number(row.current_count ?? 0),
    groupTitle: row.group_title,
    isUserCreated: Number(row.is_user_created) === 1,
  };
}

const SELECT = `
  SELECT d.id, d.title, d.arabic_text, d.transliteration, d.turkish_meaning,
         d.target_count, d.source, d.is_user_created,
         COALESCE(p.count, 0) AS current_count,
         g.title AS group_title
  FROM ${TABLES.DHIKRS} d
  LEFT JOIN ${TABLES.DHIKR_PROGRESS} p ON p.dhikr_id = d.id
  LEFT JOIN ${TABLES.DHIKR_GROUPS} g ON g.id = d.group_id
`;

export const DhikrService = {
  async list(): Promise<DhikrRecord[]> {
    const rows = await getDb().getAllAsync<DhikrRow>(
      `${SELECT} WHERE d.is_active = 1 ORDER BY d.is_user_created DESC, d.sort_order ASC, d.id ASC`,
    );
    return rows.map(mapRow);
  },

  async create(input: { title: string; description?: string; targetCount: number }): Promise<number> {
    const title = input.title.trim();
    if (!title) throw new Error('Zikir adı boş olamaz.');
    const targetCount = Math.max(0, Math.floor(input.targetCount));
    const db = getDb();
    const result = await db.runAsync(
      `INSERT INTO ${TABLES.DHIKRS}
        (title, turkish_meaning, target_count, is_active, is_user_created, updated_at)
       VALUES (?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
      [title, input.description?.trim() || null, targetCount || null],
    );
    return Number(result.lastInsertRowId);
  },

  async update(id: number, input: { title: string; description?: string; targetCount: number }): Promise<void> {
    const title = input.title.trim();
    if (!title) throw new Error('Zikir adı boş olamaz.');
    await getDb().runAsync(
      `UPDATE ${TABLES.DHIKRS}
       SET title = ?, turkish_meaning = ?, target_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_user_created = 1`,
      [title, input.description?.trim() || null, Math.max(0, Math.floor(input.targetCount)) || null, id],
    );
  },

  async remove(id: number): Promise<void> {
    await getDb().runAsync(`DELETE FROM ${TABLES.DHIKRS} WHERE id = ? AND is_user_created = 1`, [id]);
  },

  async setCount(id: number, count: number): Promise<void> {
    const safeCount = Math.max(0, Math.floor(count));
    await getDb().runAsync(
      `INSERT INTO ${TABLES.DHIKR_PROGRESS} (dhikr_id, count, completed_at, updated_at)
       VALUES (?, ?, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT(dhikr_id) DO UPDATE SET count = excluded.count, completed_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      [id, safeCount],
    );
  },

  async reset(id: number): Promise<void> {
    await this.setCount(id, 0);
  },
};
