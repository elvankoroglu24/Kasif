import { Section } from '../database/types';

type SectionMetadata = {
  name_en?: string;
  name_ar?: string;
  name_tr?: string;
  title_tr?: string;
};

const SAFE_TURKISH_TITLES: Record<string, string> = {
  'praying at night in ramadaan (taraweeh)': 'Ramazan Gecelerinde Namaz (Teravih)',
  'praying at night in ramadan (taraweeh)': 'Ramazan Gecelerinde Namaz (Teravih)',
  'prayer at night in ramadaan (taraweeh)': 'Ramazan Gecelerinde Namaz (Teravih)',
  'prayer at night in ramadan (taraweeh)': 'Ramazan Gecelerinde Namaz (Teravih)',
};

function parseSectionMetadata(metadata?: string): SectionMetadata {
  if (!metadata) return {};

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const record = parsed as Record<string, unknown>;
    return {
      name_en: typeof record.name_en === 'string' ? record.name_en.trim() : undefined,
      name_ar: typeof record.name_ar === 'string' ? record.name_ar.trim() : undefined,
      name_tr: typeof record.name_tr === 'string' ? record.name_tr.trim() : undefined,
      title_tr: typeof record.title_tr === 'string' ? record.title_tr.trim() : undefined,
    };
  } catch {
    return {};
  }
}

function normalizeTitle(title?: string): string {
  return title?.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ') || '';
}

/**
 * Resolves the user-facing section title without changing database content.
 * Priority: curated Turkish mapping, trusted Turkish metadata, Arabic metadata,
 * then the original section title.
 */
export function displaySectionTitle(section?: Section | null): string {
  if (!section) return '';

  const metadata = parseSectionMetadata(section.metadata);
  const sourceTitle = metadata.name_en || section.title?.trim() || '';
  const mappedTitle = SAFE_TURKISH_TITLES[normalizeTitle(sourceTitle)];

  if (mappedTitle) return mappedTitle;
  if (metadata.name_tr) return metadata.name_tr;
  if (metadata.title_tr) return metadata.title_tr;
  if (metadata.name_ar) return metadata.name_ar;
  if (section.title?.trim()) return section.title.trim();
  return sourceTitle;
}

export { parseSectionMetadata };
