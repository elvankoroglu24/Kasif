import { getDb } from './index';
import { TABLES } from './schema';
import { VocabularyWord, VocabularyWordType } from './vocabulary';

/** Cilt & Mürekkep: study state is local-only and never changes vocabulary content. */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type LearningState = 'new' | 'learning' | 'review' | 'mastered';
export type StudyDirection = 'mixed' | 'ar_tr' | 'tr_ar' | 'ar_en' | 'en_ar' | 'ar_de' | 'de_ar';
export type StudyFilter = 'all' | 'favorites' | 'due' | 'new' | 'hard' | 'learned';

export interface ReviewState { wordId: number; reviewCount: number; correctCount: number; incorrectCount: number; currentStreak: number; ease: number; difficulty: number; lastReviewedAt: string | null; nextReviewAt: string | null; lastStreakDay: string | null; learningState: LearningState; }
export interface StudyStats { total: number; newCount: number; learningCount: number; reviewCount: number; masteredCount: number; dueCount: number; reviewedToday: number; correctToday: number; streak: number; accuracy: number; }
export interface StudyQuery { direction: StudyDirection; filter: StudyFilter; limit: number; tag?: string; wordType?: VocabularyWordType; }
export interface ReviewResult { state: ReviewState; rating: ReviewRating; }
interface Row extends Record<string, unknown> {}
const MAX_SESSION = 50;
const number = (value: unknown) => Number(value ?? 0);
const string = (value: unknown): string | null => value == null ? null : String(value);
const iso = (date: Date) => date.toISOString();
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export const REVIEW_INTERVALS_MINUTES: Record<ReviewRating, number[]> = { again: [5, 10, 30], hard: [15, 60, 240], good: [60, 1440, 4320, 10080, 20160, 43200], easy: [1440, 4320, 10080, 20160, 43200, 86400] };

export function calculateNextReview(state: ReviewState, rating: ReviewRating, now: Date): ReviewState {
  const correct = rating !== 'again'; const reviewCount = state.reviewCount + 1; const correctCount = state.correctCount + (correct ? 1 : 0); const incorrectCount = state.incorrectCount + (correct ? 0 : 1);
  const easeDelta = rating === 'easy' ? 0.15 : rating === 'hard' ? -0.15 : rating === 'again' ? -0.2 : 0.05;
  const ease = Math.max(1.3, Math.min(3.2, Math.round((state.ease + easeDelta) * 100) / 100));
  const difficulty = Math.max(0, Math.min(1, Math.round((1 - (ease - 1.3) / 1.9) * 100) / 100));
  const today = dayKey(now);
  const previousDay = state.lastStreakDay ? new Date(`${state.lastStreakDay}T00:00:00.000Z`) : null;
  const yesterday = new Date(now.getTime() - 86_400_000);
  const streak = !correct ? 0 : state.lastStreakDay === today ? state.currentStreak : previousDay && dayKey(previousDay) === dayKey(yesterday) ? state.currentStreak + 1 : 1;
  const previousState = state.learningState;
  const learningState: LearningState = rating === 'again' ? 'learning' : reviewCount >= 5 && streak >= 3 && rating !== 'hard' ? 'mastered' : previousState === 'new' ? 'learning' : reviewCount >= 3 ? 'review' : 'learning';
  const intervals = REVIEW_INTERVALS_MINUTES[rating]; const index = Math.min(intervals.length - 1, Math.max(0, reviewCount - 1));
  const next = new Date(now.getTime() + intervals[index] * 60_000);
  return { ...state, reviewCount, correctCount, incorrectCount, currentStreak: streak, ease, difficulty, lastReviewedAt: iso(now), nextReviewAt: iso(next), lastStreakDay: dayKey(now), learningState };
}

function mapState(row: Row): ReviewState { return { wordId: number(row.word_id), reviewCount: number(row.review_count), correctCount: number(row.correct_count), incorrectCount: number(row.incorrect_count), currentStreak: number(row.current_streak), ease: number(row.ease || 2.5), difficulty: number(row.difficulty), lastReviewedAt: string(row.last_reviewed_at), nextReviewAt: string(row.next_review_at), lastStreakDay: string(row.last_streak_day), learningState: String(row.learning_state || 'new') as LearningState }; }
function emptyState(wordId: number): ReviewState { return { wordId, reviewCount: 0, correctCount: 0, incorrectCount: 0, currentStreak: 0, ease: 2.5, difficulty: 0, lastReviewedAt: null, nextReviewAt: null, lastStreakDay: null, learningState: 'new' }; }

function directionCondition(direction: StudyDirection): { sql: string; params: string[] } {
  if (direction === 'ar_tr') return { sql: 'w.arabic IS NOT NULL AND w.turkish IS NOT NULL', params: [] }; if (direction === 'tr_ar') return { sql: 'w.turkish IS NOT NULL AND w.arabic IS NOT NULL', params: [] }; if (direction === 'ar_en') return { sql: 'w.arabic IS NOT NULL AND w.english IS NOT NULL', params: [] }; if (direction === 'en_ar') return { sql: 'w.english IS NOT NULL AND w.arabic IS NOT NULL', params: [] }; if (direction === 'ar_de') return { sql: 'w.arabic IS NOT NULL AND w.german IS NOT NULL', params: [] }; if (direction === 'de_ar') return { sql: 'w.german IS NOT NULL AND w.arabic IS NOT NULL', params: [] }; return { sql: '((w.arabic IS NOT NULL AND w.turkish IS NOT NULL) OR (w.arabic IS NOT NULL AND w.english IS NOT NULL) OR (w.arabic IS NOT NULL AND w.german IS NOT NULL))', params: [] };
}

function mapWordBase(row: Row): VocabularyWord { return { id: number(row.id), stableKey: String(row.stable_key), arabic: string(row.arabic), arabicNormalized: string(row.arabic_normalized), arabicTransliteration: string(row.arabic_transliteration), wordType: String(row.word_type) as VocabularyWordType, root: string(row.root), masdar: string(row.masdar), plural: string(row.plural), gender: string(row.gender), turkish: string(row.turkish), english: string(row.english), german: string(row.german), personalNote: string(row.personal_note), isFavorite: number(row.is_favorite) === 1, createdAt: String(row.created_at), updatedAt: String(row.updated_at), tags: [], examples: [] }; }

export const VocabularyStudyService = {
  async getStats(now = new Date()): Promise<StudyStats> {
    const db = getDb(); const today = dayKey(now);
    const row = await db.getFirstAsync<Row>(`SELECT COUNT(*) AS total, SUM(CASE WHEN COALESCE(r.review_count, 0) = 0 THEN 1 ELSE 0 END) AS new_count, SUM(CASE WHEN r.learning_state = 'learning' THEN 1 ELSE 0 END) AS learning_count, SUM(CASE WHEN r.learning_state = 'review' THEN 1 ELSE 0 END) AS review_count, SUM(CASE WHEN r.learning_state = 'mastered' THEN 1 ELSE 0 END) AS mastered_count, SUM(CASE WHEN r.next_review_at IS NOT NULL AND r.next_review_at <= ? THEN 1 ELSE 0 END) AS due_count, SUM(CASE WHEN r.last_streak_day = ? THEN r.current_streak ELSE 0 END) AS streak FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} w LEFT JOIN ${TABLES.PERSONAL_VOCABULARY_REVIEWS} r ON r.word_id = w.id`, [iso(now), today]);
    const todayRow = await db.getFirstAsync<Row>(`SELECT COUNT(*) AS reviewed_today, SUM(was_correct) AS correct_today FROM ${TABLES.PERSONAL_VOCABULARY_REVIEW_EVENTS} WHERE substr(reviewed_at, 1, 10) = ?`, [today]);
    const totalReviews = number(todayRow?.reviewed_today); const correctToday = number(todayRow?.correct_today); return { total: number(row?.total), newCount: number(row?.new_count), learningCount: number(row?.learning_count), reviewCount: number(row?.review_count), masteredCount: number(row?.mastered_count), dueCount: number(row?.due_count), reviewedToday: totalReviews, correctToday, streak: number(row?.streak), accuracy: totalReviews ? Math.round((correctToday / totalReviews) * 100) : 0 };
  },
  async getStudyWords(query: StudyQuery, now = new Date()): Promise<VocabularyWord[]> {
    const db = getDb(); const direction = directionCondition(query.direction); const where: string[] = [direction.sql]; const params: Array<string | number> = [...direction.params]; const limit = Math.min(MAX_SESSION, Math.max(1, query.limit));
    if (query.filter === 'favorites') where.push('w.is_favorite = 1'); if (query.filter === 'new') where.push('COALESCE(r.review_count, 0) = 0'); if (query.filter === 'due') where.push('r.next_review_at IS NOT NULL AND r.next_review_at <= ?'), params.push(iso(now)); if (query.filter === 'hard') where.push('COALESCE(r.difficulty, 0) >= 0.55'); if (query.filter === 'learned') where.push("r.learning_state IN ('review', 'mastered')"); if (query.wordType) where.push('w.word_type = ?'), params.push(query.wordType); if (query.tag) where.push(`EXISTS (SELECT 1 FROM ${TABLES.PERSONAL_VOCABULARY_WORD_TAGS} wt JOIN ${TABLES.PERSONAL_VOCABULARY_TAGS} t ON t.id = wt.tag_id WHERE wt.word_id = w.id AND t.name = ?)`), params.push(query.tag);
    const rows = await db.getAllAsync<Row>(`SELECT w.* FROM ${TABLES.PERSONAL_VOCABULARY_WORDS} w LEFT JOIN ${TABLES.PERSONAL_VOCABULARY_REVIEWS} r ON r.word_id = w.id WHERE ${where.join(' AND ')} ORDER BY CASE WHEN r.next_review_at IS NOT NULL AND r.next_review_at <= ? THEN 0 WHEN COALESCE(r.review_count, 0) = 0 THEN 1 ELSE 2 END, COALESCE(r.next_review_at, '9999-12-31') ASC, w.id ASC LIMIT ?`, [...params, iso(now), limit]);
    return rows.map(mapWordBase);
  },
  async getState(wordId: number): Promise<ReviewState> { const row = await getDb().getFirstAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_REVIEWS} WHERE word_id = ?`, [wordId]); return row ? mapState(row) : emptyState(wordId); },
  async submitReview(wordId: number, rating: ReviewRating, now = new Date()): Promise<ReviewResult> {
    const db = getDb(); let resultState: ReviewState = emptyState(wordId);
    await db.withTransactionAsync(async () => { const existing = await db.getFirstAsync<Row>(`SELECT * FROM ${TABLES.PERSONAL_VOCABULARY_REVIEWS} WHERE word_id = ?`, [wordId]); resultState = calculateNextReview(existing ? mapState(existing) : emptyState(wordId), rating, now); await db.runAsync(`INSERT INTO ${TABLES.PERSONAL_VOCABULARY_REVIEWS} (word_id, review_count, correct_count, incorrect_count, current_streak, ease, difficulty, last_reviewed_at, next_review_at, last_streak_day, learning_state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(word_id) DO UPDATE SET review_count=excluded.review_count, correct_count=excluded.correct_count, incorrect_count=excluded.incorrect_count, current_streak=excluded.current_streak, ease=excluded.ease, difficulty=excluded.difficulty, last_reviewed_at=excluded.last_reviewed_at, next_review_at=excluded.next_review_at, last_streak_day=excluded.last_streak_day, learning_state=excluded.learning_state, updated_at=CURRENT_TIMESTAMP`, [wordId, resultState.reviewCount, resultState.correctCount, resultState.incorrectCount, resultState.currentStreak, resultState.ease, resultState.difficulty, resultState.lastReviewedAt, resultState.nextReviewAt, resultState.lastStreakDay, resultState.learningState]); await db.runAsync(`INSERT INTO ${TABLES.PERSONAL_VOCABULARY_REVIEW_EVENTS} (word_id, rating, was_correct, reviewed_at) VALUES (?, ?, ?, ?)`, [wordId, rating, rating === 'again' ? 0 : 1, iso(now)]); });
    return { state: resultState, rating };
  },
  async resetStats(wordId?: number): Promise<void> { const db = getDb(); await db.withTransactionAsync(async () => { if (wordId) { await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_REVIEW_EVENTS} WHERE word_id = ?`, [wordId]); await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_REVIEWS} WHERE word_id = ?`, [wordId]); } else { await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_REVIEW_EVENTS}`); await db.runAsync(`DELETE FROM ${TABLES.PERSONAL_VOCABULARY_REVIEWS}`); } }); },
};
