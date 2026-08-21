import sqlite3
from pathlib import Path

DB_PATH = Path('/home/ubuntu/Kasif/kasif.db')

query = """
SELECT
  c.id AS content_id,
  c.number_in_work,
  w.title AS work_title,
  a.name AS author_name,
  SUBSTR(COALESCE(ct_tr.text_content, ct_ar.text_content), 1, 120) AS text_snippet,
  COUNT(DISTINCT r.id) AS research_count,
  MAX(CASE WHEN r.category = 'commentary' THEN 1 ELSE 0 END) AS has_commentary,
  MAX(CASE WHEN LENGTH(r.body) > 0 THEN 1 ELSE 0 END) AS has_notes,
  COUNT(DISTINCT rs.id) AS source_count,
  GROUP_CONCAT(DISTINCT r.status) AS statuses_str,
  MAX(r.updated_at) AS last_worked_at
FROM contents c
JOIN research_sources rs ON c.id = rs.source_id AND rs.source_type = 'content'
JOIN researches r ON rs.research_id = r.id
LEFT JOIN sections s ON c.section_id = s.id
LEFT JOIN works w ON s.work_id = w.id
LEFT JOIN authors a ON w.author_id = a.id
LEFT JOIN content_translations ct_tr ON c.id = ct_tr.content_id AND ct_tr.language = 'tr'
LEFT JOIN content_translations ct_ar ON c.id = ct_ar.content_id AND ct_ar.language = 'ar'
WHERE c.type = 'hadith'
GROUP BY c.id
ORDER BY last_worked_at DESC
LIMIT 5
"""

if not DB_PATH.exists():
    raise SystemExit(f'Database not found: {DB_PATH}')

with sqlite3.connect(DB_PATH) as connection:
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')"
        )
    }
    required = {'contents', 'research_sources', 'researches', 'sections', 'works', 'authors', 'content_translations'}
    missing = sorted(required - tables)
    if missing:
        print(f'Existing tables/views: {sorted(tables)}')
        raise SystemExit(f'Missing tables: {missing}')

    row_counts = {
        table: connection.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        for table in ('contents', 'researches', 'research_sources')
    }
    results = connection.execute(query).fetchall()

print('Required tables: OK')
print(f"Counts: contents={row_counts['contents']}, researches={row_counts['researches']}, research_sources={row_counts['research_sources']}")
print(f'Worked hadith query: OK ({len(results)} rows returned)')
for result in results:
    print(result[:5])
