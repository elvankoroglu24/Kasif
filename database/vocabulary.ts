import { getDb } from './index';
import { TABLES } from './schema';

/** Cilt & Mürekkep: user-owned vocabulary stays isolated from Quran, Hadith and Personal Books. */

export const VOCABULARY_WORD_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'particle', 'pronoun', 'preposition', 'other'] as const;
export type VocabularyWordType = typeof VOCABULARY_WORD_TYPES[number];

export interface VocabularyExampleInput { arabic?: string; turkish?: string; english?: string; german?: string; }
export interface VocabularyExample extends VocabularyExampleInput { id: number; wordId: number; createdAt: string; }
export interface VocabularyWordInput {
  arabic?: string; arabicTransliteration?: string; wordType?: VocabularyWordType; root?: string;
  masdar?: string; plural?: string; gender?: string; turkish?: string; english?: string; german?: string;
  personalNote?: string; tags?: string[]; examples?: VocabularyExampleInput[];
}
export interface VocabularyWord {
  id: number; stableKey: string; arabic: string | null; arabicNormalized: string | null; arabicTransliteration: string | null;
  wordType: VocabularyWordType; root: string | null; masdar: string | null; plural: string | null; gender: string | null;
  turkish: string | null; english: string | null; german: string | null; personalNote: string | null; isFavorite: boolean;
  createdAt: string; updatedAt: string; tags: string[]; examples: VocabularyExample[];
}

interface Row extends Record<string, unknown> {}
const text = (value: unknown): string | null => value == null || String(value).trim() === '' ? null : String(value).trim();
const number = (value: unknown): number => Number(value ?? 0);
const MAX_RESULTS = 100;

export function normalizeArabic(value: string): string {
  return value.normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu, '').replace(/ـ/gu, '').replace(/[إأآٱ]/gu, 'ا').replace(/ى/gu, 'ي').trim();
}

function stableKey(input: VocabularyWordInput): string {
  const key = [normalizeArabic(input.arabic ?? ''), input.turkish ?? '', input.english ?? '', input.german ?? ''].map((part) => part.trim().toLocaleLowerCase('tr-TR')).join('|');
  return key || `word-${Date.now()}`;
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 30);
}

function mapExample(row: Row): VocabularyExample {
  return { id: number(row.id), wordId: number(row.word_id), arabic: text(row.arabic) ?? undefined, turkish: text(row.turkish) ?? undefined, english: text(row.english) ?? undefined, german: text(row.german) ?? undefined, createdAt: String(row.created_at) };
}

async function related(wordId: number): Promise<{ tags: string[]; examples: VocabularyExample[] }> {
  const db = getDb();
  const [tagRows, exampleRows] = await Promise.all([
    db.getAllAsync<Row>(`SELECT t.name FROM ${TABLES.PERSONAL_VOCABULARY_TAGS} t JOIN ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS} wt ON wt.tag_id = t.id WHERE wt.word_id = ? ORDER BY t.name COLLATE NOCASE`, [wordId]),
    db.getAllAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_EXAMPLES} WHERE word_id = ? ORDER BY id ASC`, [wordId]),
  ]);
  return { tags: tagRows.map((row) => String(row.name)), examples: exampleRows.map(mapExample) };
}

async function mapWord(row: Row): Promise<VocabularyWord> {
  const links = await related(number(row.id));
  return {
    id: number(row.id), stableKey: String(row.stable_key), arabic: text(row.arabic), arabicNormalized: text(row.arabic_normalized), arabicTransliteration: text(row.arabic_transliteration),
    wordType: String(row.word_type) as VocabularyWordType, root: text(row.root), masdar: text(row.masdar), plural: text(row.plural), gender: text(row.gender),
    turkish: text(row.turkish), english: text(row.english), german: text(row.german), personalNote: text(row.personal_note), isFavorite: number(row.is_favorite) === 1,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at), tags: links.tags, examples: links.examples,
  };
}

function validate(input: VocabularyWordInput): void {
  const values = [input.arabic, input.turkish, input.english, input.german].map((value) => value?.trim()).filter(Boolean);
  if (values.length === 0) throw new Error('En az bir kelime veya karşılık girin.');
  if (input.wordType && !VOCABULARY_WORD_TYPES.includes(input.wordType)) throw new Error('Geçersiz kelime türü.');
}

async function replaceRelations(wordId: number, tags: string[], examples: VocabularyExampleInput[]): Promise<void> {
  const db = getDb();
  await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS} WHERE word_id = ?`, [wordId]);
  for (const tag of normalizeTags(tags)) {
    await db.runAsync(`INSERT INTO ${TABLES.PERSONAL_VOCABULARY_TAGS} (name) VALUES (?) ON CONFLICT(name) DO NOTHING`, [tag]);
    const tagRow = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${TABLES.PERSONAL_VOCABULARY_TAGS} WHERE name = ?`, [tag]);
    if (tagRow) await db.runAsync(`INSERT OR IGNORE INTO ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS} (word_id, tag_id) VALUES (?, ?)`, [wordId, tagRow.id]);
  }
  await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_EXAMPLES} WHERE word_id = ?`, [wordId]);
  for (const example of examples.slice(0, 30)) {
    const values = [example.arabic, example.turkish, example.english, example.german].map((value) => value?.trim() || null);
    if (values.some(Boolean)) await db.runAsync(`INSERT INTO ${TABLES.PERSONAL_VOCABULARY_EXAMPLES} (word_id, arabic, turkish, english, german) VALUES (?, ?, ?, ?, ?)`, [wordId, ...values]);
  }
}

export const VocabularyService = {
  async list(limit = MAX_RESULTS): Promise<VocabularyWord[]> {
    const db = getDb(); const rows = await db.getAllAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} ORDER BY updated_at DESC, id DESC LIMIT ?`, [Math.min(MAX_RESULTS, Math.max(1, limit))]);
    return Promise.all(rows.map(mapWord));
  },
  async get(id: number): Promise<VocabularyWord | null> {
    const row = await getDb().getFirstAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} WHERE id = ?`, [id]);
    return row ? mapWord(row) : null;
  },
  async create(input: VocabularyWordInput): Promise<number> {
    validate(input); const db = getDb(); const arabic = input.arabic?.trim() || null;
    let createdId = 0;
    await db.withTransactionAsync(async () => {
      const created = await db.runAsync(`INSERT INTO ${TABLES.PERSONAL_VOCABULARY_WORDS} (stable_key, arabic, arabic_normalized, arabic_transliteration, word_type, root, masdar, plural, gender, turkish, english, german, personal_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stableKey(input), arabic, arabic ? normalizeArabic(arabic) : null, input.arabicTransliteration?.trim() || null, input.wordType ?? 'other', input.root?.trim() || null, input.masdar?.trim() || null, input.plural?.trim() || null, input.gender?.trim() || null, input.turkish?.trim() || null, input.english?.trim() || null, input.german?.trim() || null, input.personalNote?.trim() || null]);
      createdId = created.lastInsertRowId; await replaceRelations(createdId, input.tags ?? [], input.examples ?? []);
    });
    return createdId;
  },
  async update(id: number, input: VocabularyWordInput): Promise<void> {
    validate(input); const db = getDb(); const arabic = input.arabic?.trim() || null;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(`UPDATE ${TABLES.PERSONAL_VOCABULARY_WORDS} SET stable_key = ?, arabic = ?, arabic_normalized = ?, arabic_transliteration = ?, word_type = ?, root = ?, masdar = ?, plural = ?, gender = ?, turkish = ?, english = ?, german = ?, personal_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [stableKey(input), arabic, arabic ? normalizeArabic(arabic) : null, input.arabicTransliteration?.trim() || null, input.wordType ?? 'other', input.root?.trim() || null, input.masdar?.trim() || null, input.plural?.trim() || null, input.gender?.trim() || null, input.turkish?.trim() || null, input.english?.trim() || null, input.german?.trim() || null, input.personalNote?.trim() || null, id]);
      if (result.changes === 0) throw new Error('Kelime bulunamadı.'); await replaceRelations(id, input.tags ?? [], input.examples ?? []);
    });
  },
  async remove(id: number): Promise<void> { await getDb().runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} WHERE id = ?`, [id]); },
  async toggleFavorite(id: number): Promise<boolean> { const db = getDb(); await db.runAsync(`UPDATE ${TABLES.PERSONAL_VOCABULARY_WORDS} SET is_favorite = CASE is_favorite WHEN 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]); const row = await db.getFirstAsync<{ is_favorite: number }>(`SELECT is_favorite FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} WHERE id = ?`, [id]); return Number(row?.is_favorite ?? 0) === 1; },
  async search(query: string, limit = MAX_RESULTS): Promise<VocabularyWord[]> {
    const db = getDb(); const clean = query.trim(); const bounded = Math.min(MAX_RESULTS, Math.max(1, limit));
    if (!clean) return this.list(bounded);
    const normalized = normalizeArabic(clean); const tokens = normalized.split(/\s+/u).map((token) => token.replace(/["'():*^{}\[\]]/gu, '')).filter(Boolean).slice(0, 8);
    if (!tokens.length) return this.list(bounded);
    const match = tokens.map((token) => `"${token.replace(/"/gu, '""')}"*`).join(' AND ');
    try {
      const rows = await db.getAllAsync<Row>(`SELECT w.* FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} w JOIN ${TABLES.FTS_PERSONAL_VOCABULARY} f ON f.word_id = w.id WHERE ${TABLES.FTS_PERSONAL_VOCABULARY} MATCH ? ORDER BY w.updated_at DESC, w.id DESC LIMIT ?`, [match, bounded]);
      return Promise.all(rows.map(mapWord));
    } catch (error) {
      console.warn('Kelime FTS araması başarısız:', error);
      const like = `%${clean.replace(/[%_]/gu, '')}%`; const rows = await db.getAllAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} WHERE arabic LIKE ? OR arabic_normalized LIKE ? OR turkish LIKE ? OR english LIKE ? OR german LIKE ? OR root LIKE ? OR arabic_transliteration LIKE ? OR personal_note LIKE ? ORDER BY updated_at DESC, id DESC LIMIT ?`, [like, `%${normalized}%`, like, like, like, like, like, like, bounded]);
      return Promise.all(rows.map(mapWord));
    }
  },
  async getTags(): Promise<string[]> { const rows = await getDb().getAllAsync<Row>(`SELECT name FROM ${TABLES.PERSONAL_VOCABULARY_TAGS} ORDER BY name COLLATE NOCASE`); return rows.map((row) => String(row.name)); },
};
