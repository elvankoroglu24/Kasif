import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / '../kasif.db'

if not DB_PATH.exists():
    raise SystemExit(f'Database not found at {DB_PATH}')

with sqlite3.connect(DB_PATH) as conn:
    print('=== 1. TABLE COUNTS ===')
    tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print(f'Tables found: {tables}')
    
    for t in ['contents', 'content_translations', 'commentaries', 'researches', 'fts_content']:
        if t in tables:
            cnt = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
            print(f'  - {t}: {cnt} rows')
        else:
            print(f'  - {t}: TABLE MISSING!')

    print('\n=== 2. TRANSLATION LANGUAGES ===' )
    if 'content_translations' in tables:
        langs = conn.execute('SELECT language, COUNT(*) FROM content_translations GROUP BY language').fetchall()
        for lang, count in langs:
            print(f'  - Language "{lang}": {count} rows')

    print('\n=== 3. FTS_CONTENT STATUS ===')
    if 'fts_content' in tables:
        fts_cnt = conn.execute('SELECT COUNT(*) FROM fts_content').fetchone()[0]
        print(f'  - fts_content row count: {fts_cnt}')
        sample_fts = conn.execute('SELECT content_id, language, SUBSTR(text_content, 1, 50) FROM fts_content LIMIT 3').fetchall()
        print(f'  - Sample fts rows: {sample_fts}')
    
    print('\n=== 4. SEARCH TEST: الصلاة ===')
    if 'fts_content' in tables:
        try:
            res_ar = conn.execute(
                "SELECT content_id, text_content FROM fts_content WHERE fts_content MATCH ? LIMIT 5",
                ('الصلاة',)
            ).fetchall()
            print(f'  - Match "الصلاة": {len(res_ar)} results found')
            for r in res_ar:
                print(f'    ID {r[0]}: {r[1][:80]}...')
        except Exception as e:
            print(f'  - Match "الصلاة" error: {e}')

    print('\n=== 5. SEARCH TEST: حديث ===')
    if 'fts_content' in tables:
        try:
            res_hadith = conn.execute(
                "SELECT content_id, text_content FROM fts_content WHERE fts_content MATCH ? LIMIT 5",
                ('حديث',)
            ).fetchall()
            print(f'  - Match "حديث": {len(res_hadith)} results found')
            for r in res_hadith:
                print(f'    ID {r[0]}: {r[1][:80]}...')
        except Exception as e:
            print(f'  - Match "حديث" error: {e}')

    print('\n=== 6. SEARCH TEST: namaz ===')
    if 'fts_content' in tables:
        try:
            res_tr = conn.execute(
                "SELECT content_id, text_content FROM fts_content WHERE fts_content MATCH ? LIMIT 5",
                ('namaz',)
            ).fetchall()
            print(f'  - Match "namaz": {len(res_tr)} results found')
            for r in res_tr:
                print(f'    ID {r[0]}: {r[1][:80]}...')
        except Exception as e:
            print(f'  - Match "namaz" error: {e}')
