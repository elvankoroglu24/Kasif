import sqlite3
from pathlib import Path

DB_PATH = Path('/home/ubuntu/Kasif/kasif.db')

if not DB_PATH.exists():
    raise SystemExit(f'Database not found at {DB_PATH}')

with sqlite3.connect(DB_PATH) as conn:
    cursor = conn.cursor()
    
    # 1. Check contents count
    contents_count = cursor.execute("SELECT COUNT(*) FROM contents").fetchone()[0]
    translations_count = cursor.execute("SELECT COUNT(*) FROM content_translations").fetchone()[0]
    fts_count = cursor.execute("SELECT COUNT(*) FROM fts_content").fetchone()[0]
    
    print(f"Pre-check: contents={contents_count}, translations={translations_count}, fts_content={fts_count}")
    
    if fts_count == 0 and translations_count > 0:
        print("FTS5 table is empty while translations exist. Running backfill...")
        cursor.execute("INSERT INTO fts_content(content_id, language, text_content) SELECT content_id, language, text_content FROM content_translations")
        conn.commit()
        new_fts_count = cursor.execute("SELECT COUNT(*) FROM fts_content").fetchone()[0]
        print(f"Backfill complete. New fts_content count: {new_fts_count}")
    else:
        print("FTS5 table already populated or no translations found.")

    # 2. Test search for الصلاة
    res = cursor.execute(
        "SELECT content_id, text_content FROM fts_content WHERE fts_content MATCH ? LIMIT 3",
        ("الصلاة",)
    ).fetchall()
    print(f"\nTest search 'الصلاة': {len(res)} results found")
    for r in res:
        print(f"  - ID {r[0]}: {r[1][:80]}...")

    # 3. Test search for حديث
    res2 = cursor.execute(
        "SELECT content_id, text_content FROM fts_content WHERE fts_content MATCH ? LIMIT 3",
        ("حديث",)
    ).fetchall()
    print(f"\nTest search 'حديث': {len(res2)} results found")
    for r in res2:
        print(f"  - ID {r[0]}: {r[1][:80]}...")
