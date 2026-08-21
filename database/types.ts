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

// Research system types

export type ResearchCategory = 
  | 'hadith' 
  | 'commentary' 
  | 'tafsir' 
  | 'fiqh' 
  | 'aqidah' 
  | 'seerah' 
  | 'arabic' 
  | 'general' 
  | 'other' 
  | string;

export type ResearchStatus = 'draft' | 'completed' | 'archived' | string;

export type ResearchVisibility = 'private' | 'shared' | 'published' | string;

export type SourceType = 'content' | 'work' | 'section' | 'author' | 'edition' | string;

export type RelationType = 'related' | 'follows' | 'expands' | 'contradicts' | string;

export interface Research {
  id: number;
  title: string;
  summary?: string;
  body?: string;
  category: ResearchCategory;
  status: ResearchStatus;
  visibility: ResearchVisibility;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface ResearchTag {
  research_id: number;
  tag_id: number;
}

export interface ResearchSource {
  id: number;
  research_id: number;
  source_type: SourceType;
  source_id: number;
  note?: string;
  created_at: string;
}

export interface ResearchRelation {
  research_id: number;
  related_research_id: number;
  relation_type: RelationType;
}

// Search system types

export type SearchResultType = 'content' | 'commentary' | 'research';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title?: string;
  snippet: string;
  language?: string;
  work_title?: string;
  author_name?: string;
  category?: string;
  rank: number;
}

