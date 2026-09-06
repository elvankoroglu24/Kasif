import * as FileSystem from 'expo-file-system/legacy';
import { getDb } from './index';
import { TABLES } from './schema';

export type PersonalBook = {
  id: number;
  title: string;
  author: string | null;
  originalFileName: string;
  localFilePath: string;
  fileSize: number | null;
  extractionStatus: string;
  lastReadAt: string | null;
  paragraphIndex: number;
  progressPercent: number;
  createdAt: string;
};

type BookRow = {
  id: number; title: string; author: string | null; original_file_name: string;
  local_file_path: string; file_size: number | null; extraction_status: string;
  last_read_at: string | null; paragraph_index: number | null; progress_percent: number | null; created_at: string;
};

function mapBook(row: BookRow): PersonalBook {
  return {
    id: Number(row.id), title: String(row.title), author: row.author,
    originalFileName: String(row.original_file_name), localFilePath: String(row.local_file_path),
    fileSize: row.file_size == null ? null : Number(row.file_size), extractionStatus: String(row.extraction_status),
    lastReadAt: row.last_read_at, paragraphIndex: Number(row.paragraph_index ?? 0),
    progressPercent: Number(row.progress_percent ?? 0), createdAt: String(row.created_at),
  };
}

const SELECT = `
  SELECT b.*, COALESCE(p.paragraph_index, 0) AS paragraph_index,
         COALESCE(p.progress_percent, 0) AS progress_percent
  FROM ${TABLES.PERSONAL_BOOKS} b
  LEFT JOIN ${TABLES.PERSONAL_BOOK_PROGRESS} p ON p.book_id = b.id
`;

export const PersonalBooksService = {
  async list(): Promise<PersonalBook[]> {
    const rows = await getDb().getAllAsync<BookRow>(`${SELECT} ORDER BY b.updated_at DESC, b.id DESC`);
    return rows.map(mapBook);
  },

  async importTxt(input: { uri: string; name: string; size?: number; title?: string }): Promise<number> {
    const db = getDb();
    const title = input.title?.trim() || input.name.replace(/\.txt$/i, '') || 'Yerel kitap';
    const destinationDirectory = `${FileSystem.documentDirectory}personal-books`;
    await FileSystem.makeDirectoryAsync(destinationDirectory, { intermediates: true });
    const safeName = `${Date.now()}-${input.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destination = `${destinationDirectory}/${safeName}`;
    await FileSystem.copyAsync({ from: input.uri, to: destination });
    const text = await FileSystem.readAsStringAsync(destination);
    const paragraphs = text.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean);
    const fileHash = `${input.name}:${input.size ?? text.length}:${destination}`;

    try {
      await db.execAsync('BEGIN');
      const result = await db.runAsync(
        `INSERT INTO ${TABLES.PERSONAL_BOOKS}
          (title, original_file_name, local_file_path, file_hash, file_size, extraction_status, extraction_method, import_status)
         VALUES (?, ?, ?, ?, ?, 'complete', 'txt', 'stored')`,
        [title, input.name, destination, fileHash, input.size ?? text.length],
      );
      const bookId = Number(result.lastInsertRowId);
      for (let index = 0; index < paragraphs.length; index += 1) {
        await db.runAsync(
          `INSERT INTO ${TABLES.PERSONAL_BOOK_PARAGRAPHS} (book_id, order_index, text_content)
           VALUES (?, ?, ?)`,
          [bookId, index, paragraphs[index]],
        );
      }
      await db.runAsync(
        `INSERT INTO ${TABLES.PERSONAL_BOOK_PROGRESS} (book_id, paragraph_index, progress_percent)
         VALUES (?, 0, 0)`,
        [bookId],
      );
      await db.execAsync('COMMIT');
      return bookId;
    } catch (error) {
      await db.execAsync('ROLLBACK');
      await FileSystem.deleteAsync(destination, { idempotent: true });
      throw error;
    }
  },

  async getParagraphs(bookId: number): Promise<{ order_index: number; text_content: string }[]> {
    return getDb().getAllAsync(
      `SELECT order_index, text_content FROM ${TABLES.PERSONAL_BOOK_PARAGRAPHS}
       WHERE book_id = ? ORDER BY order_index ASC`,
      [bookId],
    );
  },

  async updateProgress(bookId: number, paragraphIndex: number, totalParagraphs: number): Promise<void> {
    const percent = totalParagraphs <= 1 ? 100 : Math.min(100, (paragraphIndex / (totalParagraphs - 1)) * 100);
    await getDb().runAsync(
      `INSERT INTO ${TABLES.PERSONAL_BOOK_PROGRESS} (book_id, paragraph_index, progress_percent, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(book_id) DO UPDATE SET paragraph_index = excluded.paragraph_index, progress_percent = excluded.progress_percent, updated_at = CURRENT_TIMESTAMP`,
      [bookId, paragraphIndex, percent],
    );
    await getDb().runAsync(`UPDATE ${TABLES.PERSONAL_BOOKS} SET last_read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bookId]);
  },

  async remove(book: PersonalBook): Promise<void> {
    await getDb().runAsync(`DELETE FROM ${TABLES.PERSONAL_BOOKS} WHERE id = ?`, [book.id]);
    await FileSystem.deleteAsync(book.localFilePath, { idempotent: true });
  },
};
