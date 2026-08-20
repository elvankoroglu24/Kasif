# Kasif Data Model Design Notes (Phase 2 / Task 2)

## Hierarchy
Source (Work) -> Book/Chapter (Sections) -> Hadith (Contents) -> Multi-language (Content Translations) -> Commentaries.

## Tables
1. **authors**: Stores author/scholar metadata.
2. **works**: Main works (e.g., Sahih Bukhari, Riyad as-Salihin). Supports types: hadith, tafsir, etc.
3. **editions**: Specific prints or versions of works.
4. **sections**: Hierarchical structure for books and chapters.
5. **contents**: Individual items (hadiths, verses, paragraphs).
6. **content_translations**: Multi-language support for content.
7. **commentaries**: Explanations linked to content, supports multiple authors/editions/languages.

## Extensibility
- `metadata` columns in all tables allow for flexible JSON data.
- `type` columns in `works`, `sections`, and `contents` allow adding new formats without schema changes.
- `content_translations` table avoids column-per-language anti-pattern.

## Performance
- Foreign keys with appropriate ON DELETE actions.
- Indexes on frequently queried columns (type, FKs).
- SQLite WAL mode enabled.
