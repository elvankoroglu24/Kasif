import sqlite3
import json
import os
import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / '../kasif.db'
DATA_DIR = Path('/home/ubuntu/hadith-data')

BOOKS = [
    {'file': 'bukhari.json', 'title_tr': 'Sahih el-Buhârî', 'title_ar': 'صحيح البخاري', 'author': 'İmam Buhârî'},
    {'file': 'muslim.json', 'title_tr': 'Sahih Müslim', 'title_ar': 'صحيح مسلم', 'author': 'İmam Müslim'},
    {'file': 'abudawud.json', 'title_tr': 'Sünen Ebû Dâvûd', 'title_ar': 'سنن أبي داود', 'author': 'Ebû Dâvûd'},
    {'file': 'tirmidhi.json', 'title_tr': 'Câmi\' et-Tirmizî', 'title_ar': 'جامع الترمذي', 'author': 'İmam Tirmizî'},
    {'file': 'nasai.json', 'title_tr': 'Sünen en-Nesâî', 'title_ar': 'سنن النسائي', 'author': 'İmam Nesâî'},
    {'file': 'ibnmajah.json', 'title_tr': 'Sünen İbn Mâce', 'title_ar': 'سنن ابن ماجه', 'author': 'İbn Mâce'},
]

print(f"Target DB: {DB_PATH.resolve()}")

with sqlite3.connect(DB_PATH) as conn:
    cursor = conn.cursor()
    
    # Create tables matching schema
    cursor.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, bio TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER, title TEXT NOT NULL, alternative_title TEXT, type TEXT NOT NULL, language TEXT DEFAULT 'tr', description TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, parent_id INTEGER, title TEXT, number INTEGER, type TEXT NOT NULL, metadata TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS contents (id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER, type TEXT NOT NULL, number_in_work TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS content_translations (id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL, language TEXT NOT NULL, text_content TEXT NOT NULL, metadata TEXT)")
    
    # FTS5 tables and triggers
    cursor.execute("CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(content_id UNINDEXED, language, text_content, tokenize = 'unicode61')")
    
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS tr_content_translations_ai AFTER INSERT ON content_translations BEGIN
          INSERT INTO fts_content(content_id, language, text_content) VALUES (new.content_id, new.language, new.text_content);
        END;
    """)
    conn.commit()

    # Force import or run
    if True:
        for book_info in BOOKS:
            file_path = DATA_DIR / book_info['file']
            if not file_path.exists():
                print(f"File not found: {file_path}")
                continue

            print(f"Importing {book_info['title_tr']}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            cursor.execute("INSERT OR IGNORE INTO authors (name) VALUES (?)", (book_info['author'],))
            cursor.execute("SELECT id FROM authors WHERE name = ?", (book_info['author'],))
            author_row = cursor.fetchone()
            author_id = author_row[0] if author_row else 1

            work_metadata = {
                'title_ar': book_info['title_ar'],
                'source_dataset': 'Jaguar16/open-hadith-data',
                'license': 'CC0 1.0',
                'imported_at': datetime.datetime.now().isoformat()
            }
            cursor.execute(
                "INSERT INTO works (author_id, title, alternative_title, type, language, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                (author_id, book_info['title_tr'], book_info['title_ar'], 'hadith', 'tr', json.dumps(work_metadata))
            )
            work_id = cursor.lastrowid

            sections_map = {}
            metadata = data.get('metadata', {})
            section_details = metadata.get('section_details', {})

            for sec_num, details in section_details.items():
                sec_title = details.get('arabic', '')
                if details.get('english'):
                    sec_title = f"{details.get('english')} - {sec_title}"
                
                sec_metadata = {
                    'arabic': details.get('arabic'),
                    'english': details.get('english'),
                    'hadith_number_first': details.get('hadith_number_first'),
                    'hadith_number_last': details.get('hadith_number_last')
                }
                
                cursor.execute(
                    "INSERT INTO sections (work_id, title, number, type, metadata) VALUES (?, ?, ?, ?, ?)",
                    (work_id, sec_title, int(sec_num) if str(sec_num).isdigit() else 0, 'book', json.dumps(sec_metadata))
                )
                sections_map[str(sec_num)] = cursor.lastrowid

            hadiths = data.get('hadiths', [])
            for h in hadiths:
                sec_num = str(h.get('chapter_number') or h.get('book_number') or '0')
                sec_id = sections_map.get(sec_num)
                
                h_metadata = {
                    'collection_id': book_info['file'].replace('.json', ''),
                    'collection_name': book_info['title_tr'],
                    'book_number': h.get('book_number'),
                    'chapter_number': h.get('chapter_number'),
                    'hadith_number': h.get('hadith_number'),
                    'reference': h.get('reference'),
                    'grade': h.get('grade_ar') or h.get('grade_en'),
                    'source_url': h.get('url_source'),
                    'isnad_ar': h.get('isnad_ar'),
                    'matn_ar': h.get('matn_ar'),
                    'source_dataset': 'Jaguar16/open-hadith-data',
                    'license': 'CC0 1.0'
                }

                cursor.execute(
                    "INSERT INTO contents (section_id, type, number_in_work, metadata) VALUES (?, ?, ?, ?)",
                    (sec_id, 'hadith', str(h.get('hadith_number')), json.dumps(h_metadata))
                )
                content_id = cursor.lastrowid

                if h.get('text_ar'):
                    cursor.execute(
                        "INSERT INTO content_translations (content_id, language, text_content) VALUES (?, ?, ?)",
                        (content_id, 'ar', h.get('text_ar'))
                    )

            conn.commit()
            print(f"Finished importing {book_info['title_tr']}.")

        # Backfill FTS5 if empty
        fts_cnt = cursor.execute("SELECT COUNT(*) FROM fts_content").fetchone()[0]
        if fts_cnt == 0:
            print("Populating fts_content from content_translations...")
            cursor.execute("INSERT INTO fts_content(content_id, language, text_content) SELECT content_id, language, text_content FROM content_translations")
            conn.commit()

        cursor.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES ('version', '5')")
        conn.commit()

    # Final verification counts
    c_count = cursor.execute("SELECT COUNT(*) FROM contents").fetchone()[0]
    t_count = cursor.execute("SELECT COUNT(*) FROM content_translations").fetchone()[0]
    f_count = cursor.execute("SELECT COUNT(*) FROM fts_content").fetchone()[0]
    print(f"\nVerification Counts:\n  - contents: {c_count}\n  - content_translations: {t_count}\n  - fts_content: {f_count}")

    # Test searches
    for query in ["الصلاة", "حديث"]:
        res = cursor.execute("SELECT content_id, SUBSTR(text_content, 1, 60) FROM fts_content WHERE fts_content MATCH ? LIMIT 2", (query,)).fetchall()
        print(f"Search test '{query}': {len(res)} results")
        for r in res:
            print(f"  [{r[0]}] {r[1]}...")
