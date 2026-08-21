import sqlite3
import json
import os
import datetime
from pathlib import Path

# Yollar
DB_PATH = Path(__file__).parent / '../kasif.db'
DATA_DIR = Path('/home/ubuntu/hadith-data')

# Kütüb-i Sitte Eserleri
BOOKS_CONFIG = [
    {'file': 'bukhari.json', 'title_tr': 'Sahih el-Buhârî', 'title_ar': 'صحيح البخاري', 'author': 'İmam Buhârî'},
    {'file': 'muslim.json', 'title_tr': 'Sahih Müslim', 'title_ar': 'صحيh مسلم', 'author': 'İmam Müslim'},
    {'file': 'abudawud.json', 'title_tr': 'Sünen Ebû Dâvûd', 'title_ar': 'سنن أبي داود', 'author': 'Ebû Dâvûd'},
    {'file': 'tirmidhi.json', 'title_tr': 'Câmi\' et-Tirmizî', 'title_ar': 'جامع الترمذي', 'author': 'İmam Tirmizî'},
    {'file': 'nasai.json', 'title_tr': 'Sünen en-Nesâî', 'title_ar': 'سنن النسائي', 'author': 'İmam Nesâî'},
    {'file': 'ibnmajah.json', 'title_tr': 'Sünen İbn Mâce', 'title_ar': 'سنن ابن ماجه', 'author': 'İbn Mâce'},
]

def setup_db(cursor):
    """Tabloları ve trigger'ları şemaya uygun oluşturur."""
    cursor.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, bio TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER, title TEXT NOT NULL, alternative_title TEXT, type TEXT NOT NULL, language TEXT DEFAULT 'tr', description TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, parent_id INTEGER, title TEXT, number INTEGER, type TEXT NOT NULL, metadata TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS contents (id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER, type TEXT NOT NULL, number_in_work TEXT, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cursor.execute("CREATE TABLE IF NOT EXISTS content_translations (id INTEGER PRIMARY KEY AUTOINCREMENT, content_id INTEGER NOT NULL, language TEXT NOT NULL, text_content TEXT NOT NULL, metadata TEXT)")
    
    # FTS5
    cursor.execute("DROP TABLE IF EXISTS fts_content")
    cursor.execute("CREATE VIRTUAL TABLE fts_content USING fts5(content_id UNINDEXED, language, text_content, tokenize = 'unicode61')")
    
    # Triggers (İndeksleme için)
    cursor.execute("DROP TRIGGER IF EXISTS tr_content_translations_ai")
    cursor.execute("""
        CREATE TRIGGER tr_content_translations_ai AFTER INSERT ON content_translations BEGIN
          INSERT INTO fts_content(content_id, language, text_content) VALUES (new.content_id, new.language, new.text_content);
        END;
    """)

def import_hadiths():
    print(f"Hedef Veritabanı: {DB_PATH.resolve()}")
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        setup_db(cursor)
        conn.commit()
        
        total_hadiths = 0
        stats = {}

        for config in BOOKS_CONFIG:
            file_path = DATA_DIR / config['file']
            if not file_path.exists():
                print(f"Hata: Dosya bulunamadı -> {file_path}")
                continue
            
            print(f"Aktarılıyor: {config['title_tr']}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 1. Author (Yazar)
            cursor.execute("INSERT OR IGNORE INTO authors (name) VALUES (?)", (config['author'],))
            cursor.execute("SELECT id FROM authors WHERE name = ?", (config['author'],))
            author_id = cursor.fetchone()[0]
            
            # 2. Work (Eser)
            work_meta = {
                'title_ar': config['title_ar'],
                'source': 'Jaguar16/open-hadith-data',
                'license': 'CC0',
                'import_date': datetime.datetime.now().isoformat()
            }
            cursor.execute(
                "INSERT INTO works (author_id, title, alternative_title, type, language, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                (author_id, config['title_tr'], config['title_ar'], 'hadith', 'tr', json.dumps(work_meta))
            )
            work_id = cursor.lastrowid
            
            book_hadith_count = 0
            
            # 3. Hiyerarşik Aktarım: Books -> Chapters -> Hadiths
            books = data.get('books', [])
            for book in books:
                # Section (Kitap/Bölüm)
                sec_meta = {
                    'name_ar': book.get('name_ar'),
                    'name_en': book.get('name_en'),
                    'book_number': book.get('book_number')
                }
                cursor.execute(
                    "INSERT INTO sections (work_id, title, number, type, metadata) VALUES (?, ?, ?, ?, ?)",
                    (work_id, book.get('name_en') or book.get('name_ar'), book.get('book_number'), 'book', json.dumps(sec_meta))
                )
                section_id = cursor.lastrowid
                
                # Hadiths
                hadiths = book.get('hadiths', [])
                for h in hadiths:
                    h_meta = {
                        'hadith_number': h.get('hadith_number'),
                        'reference': h.get('reference'),
                        'grade': h.get('grade_ar') or h.get('grade_en'),
                        'isnad': h.get('isnad_ar'),
                        'matn': h.get('matn_ar')
                    }
                    
                    # Content (Hadis Kaydı)
                    cursor.execute(
                        "INSERT INTO contents (section_id, type, number_in_work, metadata) VALUES (?, ?, ?, ?)",
                        (section_id, 'hadith', str(h.get('hadith_number')), json.dumps(h_meta))
                    )
                    content_id = cursor.lastrowid
                    
                    # Translation (Arapça Metin)
                    if h.get('text_ar'):
                        cursor.execute(
                            "INSERT INTO content_translations (content_id, language, text_content) VALUES (?, ?, ?)",
                            (content_id, 'ar', h.get('text_ar'))
                        )
                        book_hadith_count += 1
            
            conn.commit()
            stats[config['title_tr']] = book_hadith_count
            total_hadiths += book_hadith_count
            print(f"Tamamlandı: {config['title_tr']} ({book_hadith_count} hadis)")

        # Sürüm Bilgisi
        cursor.execute("INSERT OR REPLACE INTO metadata (key, value) VALUES ('version', '5')")
        conn.commit()
        
        print("\n" + "="*30)
        print("AKTIRIM İSTATİSTİKLERİ")
        print("="*30)
        for name, count in stats.items():
            print(f"{name:<20}: {count}")
        print("-" * 30)
        print(f"{'TOPLAM':<20}: {total_hadiths}")
        print("="*30)
        
        # FTS5 Doğrulama
        fts_cnt = cursor.execute("SELECT COUNT(*) FROM fts_content").fetchone()[0]
        print(f"FTS5 İndeks Sayısı: {fts_cnt}")
        
        # Arama Testi
        print("\nArama Testi (الصلاة):")
        res = cursor.execute("SELECT content_id, SUBSTR(text_content, 1, 100) FROM fts_content WHERE fts_content MATCH 'الصلاة' LIMIT 3").fetchall()
        for r in res:
            print(f"  - [{r[0]}] {r[1]}...")

if __name__ == "__main__":
    import_hadiths()
