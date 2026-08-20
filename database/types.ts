/**
 * TypeScript types for the database entities.
 */

export interface Author {
  id: number;
  name: string;
  bio?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface Work {
  id: number;
  author_id?: number;
  title: string;
  alternative_title?: string;
  type: 'hadith' | 'tafsir' | 'fiqh' | 'article' | 'note' | string;
  language: string;
  description?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface Edition {
  id: number;
  work_id: number;
  name: string;
  publisher?: string;
  year?: string;
  location?: string;
  metadata?: string;
  created_at: string;
}

export interface Section {
  id: number;
  work_id: number;
  parent_id?: number;
  title?: string;
  number?: number;
  type: 'book' | 'chapter' | 'part' | string;
  metadata?: string;
}

export interface Content {
  id: number;
  section_id?: number;
  type: 'hadith' | 'verse' | 'paragraph' | string;
  number_in_work?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentTranslation {
  id: number;
  content_id: number;
  language: string;
  text_content: string;
  metadata?: string;
}

export interface Commentary {
  id: number;
  content_id: number;
  edition_id?: number;
  author_id?: number;
  language: string;
  title?: string;
  text_content: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}
