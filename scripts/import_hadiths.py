import sqlite3
import json
import os
import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '../kasif.db')
DATA_DIR = '/home/ubuntu/hadith-data'

BOOKS = [
    {'file': 'bukhari.json', 'title_tr': 'Sahih el-Buhârî', 'title_ar': 'صحيح البخاري', 'author': 'İmam Buhârî'},
    {'file': 'muslim.json', 'title_tr': 'Sahih Müslim', 'title_ar': 'صحيح مسلم', 'author': 'İmam Müslim'},
    {'file': 'abudawud.json', 'title_tr': 'Sünen Ebû Dâvûd', 'title_ar': 'سنن أبي داود', 'author': 'Ebû Dâvûd'},
    {'file': 'tirmidhi.json', 'title_tr': 'Câmi\' et-Tirmizî', 'title_ar': 'جامع الترمذي', 'author': 'İmam Tirmizî'},
    {'file': 'nasai.json', 'title_tr': 'Sünen en-Nesâî', 'title_ar': 'سنن النسائي', 'author': 'İmam Nesâî'},
    {'file': 'ibnmajah.json', 'title_tr': 'Sünen İbn Mâce', 'title_ar': 'سنن ابن ماجه', 'author': 'İbn Mâce'},
]

def init_db(conn):
    cursor = conn.cursor()
    # Basic tables based on schema.ts
    cursor.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, bio TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER, title TEXT NOT NULL, alternative_title TEXT, type TEXT NOT NULL, language TEXT DEFAULT 'tr', description TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, parent_id INTEGER, title TEXT, number INTEGER, type TEXT NOT NULL, metadata TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS contents (id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER, type TEXT NOT NULL, number_in_work TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS content_translations (id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL, language TEXT NOT NULL, text_content TEXT NOT NULL, metadata TEXT)")
    
    # FTS5 tables
    cursor.execute("CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(content_id UNINDEXED, language, text_content, tokenize = 'unicode61')")
    
    # Triggers for FTS
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS tr_content_translations_ai AFTER INSERT ON content_translations BEGIN
          INSERT INTO fts_content(content_id, language, text_content) VALUES (new.content_id, new.language, new.text_content);
        END;
    """)
    
    conn.commit()

def import_books():
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cursor = conn.cursor()

    for book_info in BOOKS:
        file_path = os.path.join(DATA_DIR, book_info['file'])
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        print(f"Importing {book_info['title_tr']}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 1. Author
        cursor.execute("INSERT OR IGNORE INTO authors (name) VALUES (?)", (book_info['author'],))
        cursor.execute("SELECT id FROM authors WHERE name = ?", (book_info['author'],))
        author_id = cursor.fetchone()[0]

        # 2. Work
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

        # 3. Sections
        sections_map = {} # section_number -> section_id
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
                (work_id, sec_title, int(sec_num), 'book', json.dumps(sec_metadata))
            )
            sections_map[sec_num] = cursor.lastrowid

        # 4. Hadiths
        hadiths = data.get('hadiths', [])
        for h in hadiths:
            sec_num = h.get('chapter_number') or h.get('book_number') # Fallback
            sec_id = sections_map.get(str(sec_num))
            
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
                (sec_id, 'hadith', h.get('hadith_number'), json.dumps(h_metadata))
            )
            content_id = cursor.lastrowid

            # Arabic Translation
            if h.get('text_ar'):
                cursor.execute(
                    "INSERT INTO content_translations (content_id, language, text_content) VALUES (?, ?, ?)",
                    (content_id, 'ar', h.get('text_ar'))
                )
            
            # English Translation (Optional, but let's include if requested in future, for now user said priority is Arabic)
            # if h.get('text_en'):
            #     cursor.execute(
            #         "INSERT INTO content_translations (content_id, language, text_content) VALUES (?, ?, ?)",
            #         (content_id, 'en', h.get('text_en'))
            #     )

        conn.commit()
        print(f"Finished importing {book_info['title_tr']}.")

    # Set version to 5
    cursor.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES ('version', '5')")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    import_books()
