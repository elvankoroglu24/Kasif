#!/usr/bin/env python3
"""Build Kasif's static, preloaded SQLite database from the Jaguar16 dataset.

The builder is intentionally destructive only to its explicit output path. It
never opens or appends to an existing project database. The generated database
contains the complete application schema, static hadith content, and a full
FTS5 index. User-facing tables are created empty so future user data is never
shipped inside the static asset.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATABASE_VERSION = 7
DEFAULT_DATA_DIR = Path('/home/ubuntu/hadith-data')
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / 'kasif.db'

BOOKS = [
    {
        'file': 'bukhari.json',
        'title_tr': 'Sahih el-Buhârî',
        'title_ar': 'صحيح البخاري',
        'author': 'İmam Buhârî',
    },
    {
        'file': 'muslim.json',
        'title_tr': 'Sahih Müslim',
        'title_ar': 'صحيح مسلم',
        'author': 'İmam Müslim',
    },
    {
        'file': 'abudawud.json',
        'title_tr': 'Sünen Ebû Dâvûd',
        'title_ar': 'سنن أبي داود',
        'author': 'Ebû Dâvûd',
    },
    {
        'file': 'tirmidhi.json',
        'title_tr': "Câmi' et-Tirmizî",
        'title_ar': 'جامع الترمذي',
        'author': 'İmam Tirmizî',
    },
    {
        'file': 'nasai.json',
        'title_tr': 'Sünen en-Nesâî',
        'title_ar': 'سنن النسائي',
        'author': 'İmam Nesâî',
    },
    {
        'file': 'ibnmajah.json',
        'title_tr': 'Sünen İbn Mâce',
        'title_ar': 'سنن ابن ماجه',
        'author': 'İbn Mâce',
    },
]

SCHEMA_SQL = """
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE placeholder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bio TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER,
  title TEXT NOT NULL,
  alternative_title TEXT,
  type TEXT NOT NULL,
  language TEXT DEFAULT 'tr',
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
);
CREATE TABLE editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT,
  year TEXT,
  location TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
CREATE TABLE sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id INTEGER NOT NULL,
  parent_id INTEGER,
  title TEXT,
  number INTEGER,
  type TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES sections(id) ON DELETE CASCADE
);
CREATE TABLE contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER,
  type TEXT NOT NULL,
  number_in_work TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);
CREATE TABLE content_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  language TEXT NOT NULL,
  text_content TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
CREATE TABLE commentaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  edition_id INTEGER,
  author_id INTEGER,
  language TEXT NOT NULL,
  title TEXT,
  text_content TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
);
CREATE TABLE researches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE research_tags (
  research_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (research_id, tag_id),
  FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE TABLE research_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
);
CREATE TABLE research_relations (
  research_id INTEGER NOT NULL,
  related_research_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related',
  PRIMARY KEY (research_id, related_research_id),
  FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
  FOREIGN KEY (related_research_id) REFERENCES researches(id) ON DELETE CASCADE
);
CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_sections_work ON sections(work_id);
CREATE INDEX idx_contents_section ON contents(section_id);
CREATE INDEX idx_translations_content ON content_translations(content_id);
CREATE INDEX idx_commentaries_content ON commentaries(content_id);
CREATE INDEX idx_researches_category ON researches(category);
CREATE INDEX idx_researches_status ON researches(status);
CREATE INDEX idx_researches_visibility ON researches(visibility);
CREATE INDEX idx_researches_updated_at ON researches(updated_at);
CREATE INDEX idx_research_sources_research ON research_sources(research_id);
CREATE INDEX idx_research_sources_target ON research_sources(source_type, source_id);
CREATE INDEX idx_research_tags_tag ON research_tags(tag_id);
CREATE VIRTUAL TABLE fts_content USING fts5(
  content_id UNINDEXED,
  language,
  text_content,
  tokenize = 'unicode61'
);
CREATE VIRTUAL TABLE fts_commentary USING fts5(
  commentary_id UNINDEXED,
  title,
  text_content,
  tokenize = 'unicode61'
);
CREATE VIRTUAL TABLE fts_research USING fts5(
  research_id UNINDEXED,
  title,
  summary,
  body,
  tokenize = 'unicode61'
);
"""

TRIGGERS_SQL = """
CREATE TRIGGER tr_content_translations_ai AFTER INSERT ON content_translations BEGIN
  INSERT INTO fts_content(content_id, language, text_content)
  VALUES (new.content_id, new.language, new.text_content);
END;
CREATE TRIGGER tr_content_translations_ad AFTER DELETE ON content_translations BEGIN
  DELETE FROM fts_content WHERE content_id = old.content_id AND language = old.language;
END;
CREATE TRIGGER tr_content_translations_au AFTER UPDATE ON content_translations BEGIN
  DELETE FROM fts_content WHERE content_id = old.content_id AND language = old.language;
  INSERT INTO fts_content(content_id, language, text_content)
  VALUES (new.content_id, new.language, new.text_content);
END;
CREATE TRIGGER tr_commentaries_ai AFTER INSERT ON commentaries BEGIN
  INSERT INTO fts_commentary(commentary_id, title, text_content)
  VALUES (new.id, new.title, new.text_content);
END;
CREATE TRIGGER tr_commentaries_ad AFTER DELETE ON commentaries BEGIN
  DELETE FROM fts_commentary WHERE commentary_id = old.id;
END;
CREATE TRIGGER tr_commentaries_au AFTER UPDATE ON commentaries BEGIN
  DELETE FROM fts_commentary WHERE commentary_id = old.id;
  INSERT INTO fts_commentary(commentary_id, title, text_content)
  VALUES (new.id, new.title, new.text_content);
END;
CREATE TRIGGER tr_researches_ai AFTER INSERT ON researches BEGIN
  INSERT INTO fts_research(research_id, title, summary, body)
  VALUES (new.id, new.title, new.summary, new.body);
END;
CREATE TRIGGER tr_researches_ad AFTER DELETE ON researches BEGIN
  DELETE FROM fts_research WHERE research_id = old.id;
END;
CREATE TRIGGER tr_researches_au AFTER UPDATE ON researches BEGIN
  DELETE FROM fts_research WHERE research_id = old.id;
  INSERT INTO fts_research(research_id, title, summary, body)
  VALUES (new.id, new.title, new.summary, new.body);
END;
"""


def json_text(value: Any) -> str | None:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) if value is not None else None


def int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def make_metadata(**values: Any) -> str:
    return json.dumps(values, ensure_ascii=False, separators=(',', ':'))


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f'Dataset file not found: {path}')


def create_database(output: Path, data_dir: Path) -> dict[str, Any]:
    output = output.resolve()
    data_dir = data_dir.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()
    for sidecar in (Path(f'{output}-wal'), Path(f'{output}-shm')):
        if sidecar.exists():
            sidecar.unlink()

    for book in BOOKS:
        require_file(data_dir / book['file'])

    conn = sqlite3.connect(output)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = OFF')
    conn.execute('PRAGMA synchronous = OFF')
    conn.execute('PRAGMA page_size = 4096')
    conn.executescript(SCHEMA_SQL)

    imported = []
    total_contents = 0
    now = datetime.now(timezone.utc).isoformat()

    try:
        conn.execute('BEGIN')
        for config in BOOKS:
            source_path = data_dir / config['file']
            with source_path.open('r', encoding='utf-8') as handle:
                dataset = json.load(handle)

            author_meta = make_metadata(source='Jaguar16/open-hadith-data', license='CC0')
            conn.execute(
                'INSERT INTO authors (name, metadata) VALUES (?, ?)',
                (config['author'], author_meta),
            )
            author_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
            work_meta = make_metadata(
                title_ar=config['title_ar'],
                source='Jaguar16/open-hadith-data',
                license='CC0',
                source_file=config['file'],
                imported_at=now,
            )
            conn.execute(
                '''INSERT INTO works
                   (author_id, title, alternative_title, type, language, metadata)
                   VALUES (?, ?, ?, 'hadith', 'ar', ?)''',
                (author_id, config['title_tr'], config['title_ar'], work_meta),
            )
            work_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
            book_count = 0
            chapter_count = 0

            for book in dataset.get('books', []):
                book_number = int_or_none(book.get('book_number'))
                book_meta = make_metadata(
                    book_key=book.get('book_key'),
                    name_ar=book.get('name_ar'),
                    name_en=book.get('name_en'),
                    book_number=book.get('book_number'),
                )
                conn.execute(
                    '''INSERT INTO sections (work_id, title, number, type, metadata)
                       VALUES (?, ?, ?, 'book', ?)''',
                    (work_id, book.get('name_en') or book.get('name_ar') or f'Book {book_number}', book_number, book_meta),
                )
                book_section_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]

                chapter_ids: dict[int, int] = {}
                for chapter in book.get('chapters', []):
                    chapter_number = int_or_none(chapter.get('chapter_number'))
                    chapter_meta = make_metadata(
                        name_ar=chapter.get('name_ar'),
                        name_en=chapter.get('name_en'),
                        chapter_number=chapter.get('chapter_number'),
                    )
                    conn.execute(
                        '''INSERT INTO sections
                           (work_id, parent_id, title, number, type, metadata)
                           VALUES (?, ?, ?, ?, 'chapter', ?)''',
                        (
                            work_id,
                            book_section_id,
                            chapter.get('name_en') or chapter.get('name_ar') or f'Chapter {chapter_number}',
                            chapter_number,
                            chapter_meta,
                        ),
                    )
                    chapter_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
                    if chapter_number is not None:
                        chapter_ids[chapter_number] = chapter_id
                    chapter_count += 1

                for hadith in book.get('hadiths', []):
                    text_ar = (hadith.get('text_ar') or '').strip()
                    if not text_ar:
                        continue
                    chapter_number = int_or_none(hadith.get('chapter_number'))
                    section_id = chapter_ids.get(chapter_number, book_section_id)
                    hadith_meta = {
                        'hadith_number': hadith.get('hadith_number'),
                        'chapter_number': hadith.get('chapter_number'),
                        'reference': hadith.get('reference'),
                        'source_reference': hadith.get('source_reference'),
                        'in_book_reference': hadith.get('in_book_reference'),
                        'grade_ar': hadith.get('grade_ar'),
                        'grade_en': hadith.get('grade_en'),
                        'source_grade': hadith.get('source_grade'),
                        'isnad_ar': hadith.get('isnad_ar'),
                        'isnad_en': hadith.get('isnad_en'),
                        'matn_ar': hadith.get('matn_ar'),
                        'matn_en': hadith.get('matn_en'),
                        'narrator': hadith.get('narrator'),
                        'has_variants': hadith.get('has_variants'),
                        'url_source': hadith.get('url_source'),
                    }
                    conn.execute(
                        '''INSERT INTO contents (section_id, type, number_in_work, metadata)
                           VALUES (?, 'hadith', ?, ?)''',
                        (section_id, str(hadith.get('hadith_number', '')), json_text(hadith_meta)),
                    )
                    content_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
                    translation_meta = make_metadata(
                        source='Jaguar16/open-hadith-data',
                        source_file=config['file'],
                        hadith_number=hadith.get('hadith_number'),
                    )
                    conn.execute(
                        '''INSERT INTO content_translations
                           (content_id, language, text_content, metadata)
                           VALUES (?, 'ar', ?, ?)''',
                        (content_id, text_ar, translation_meta),
                    )
                    total_contents += 1
                    book_count += 1

            imported.append({
                'file': config['file'],
                'work': config['title_tr'],
                'hadiths': book_count,
                'chapters': chapter_count,
            })

        # Bulk-populate FTS exactly once from the completed translation table.
        conn.execute('''INSERT INTO fts_content (content_id, language, text_content)
                        SELECT content_id, language, text_content
                        FROM content_translations
                        ORDER BY id''')
        conn.executescript(TRIGGERS_SQL)
        conn.execute("INSERT INTO metadata (key, value) VALUES ('version', ?)", (str(DATABASE_VERSION),))
        conn.execute("INSERT INTO metadata (key, value) VALUES ('preloaded', 'true')")
        conn.execute("INSERT INTO metadata (key, value) VALUES ('dataset', 'Jaguar16/open-hadith-data')")
        conn.execute("INSERT INTO metadata (key, value) VALUES ('license', 'CC0')")
        conn.execute("INSERT INTO metadata (key, value) VALUES ('content_count', ?)", (str(total_contents),))
        conn.execute('PRAGMA user_version = 7')
        conn.commit()

        # Compact the final static asset and remove transient free pages.
        conn.execute('VACUUM')
        conn.execute('PRAGMA integrity_check')
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        if output.exists():
            output.unlink()
        raise

    counts = {
        'authors': conn.execute('SELECT COUNT(*) FROM authors').fetchone()[0],
        'works': conn.execute('SELECT COUNT(*) FROM works').fetchone()[0],
        'sections': conn.execute('SELECT COUNT(*) FROM sections').fetchone()[0],
        'contents': conn.execute('SELECT COUNT(*) FROM contents').fetchone()[0],
        'content_translations': conn.execute('SELECT COUNT(*) FROM content_translations').fetchone()[0],
        'fts_content': conn.execute('SELECT COUNT(*) FROM fts_content').fetchone()[0],
        'distinct_fts_content_ids': conn.execute('SELECT COUNT(DISTINCT content_id) FROM fts_content').fetchone()[0],
        'commentaries': conn.execute('SELECT COUNT(*) FROM commentaries').fetchone()[0],
        'researches': conn.execute('SELECT COUNT(*) FROM researches').fetchone()[0],
    }
    integrity = conn.execute('PRAGMA integrity_check').fetchone()[0]
    version = conn.execute("SELECT value FROM metadata WHERE key = 'version'").fetchone()[0]
    user_version = conn.execute('PRAGMA user_version').fetchone()[0]
    page_count = conn.execute('PRAGMA page_count').fetchone()[0]
    freelist_count = conn.execute('PRAGMA freelist_count').fetchone()[0]
    conn.close()

    return {
        'output': str(output),
        'size_bytes': output.stat().st_size,
        'integrity_check': integrity,
        'metadata_version': version,
        'pragma_user_version': user_version,
        'page_count': page_count,
        'freelist_count': freelist_count,
        'counts': counts,
        'books': imported,
        'database_version': DATABASE_VERSION,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = create_database(args.output, args.data_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
