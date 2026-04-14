export interface Perfume {
  id: string;
  name: string;
  brand: string;
  year: number | null;
  concentration: string | null;
  rating: number | null;
  ratingCount: number | null;
  accords: string[];
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  url: string | null;
}

export interface NoteInfo {
  name: string;
  count: number;
  positions: { top: number; middle: number; base: number };
}

export interface AccordInfo {
  name: string;
  count: number;
}

export interface UserProfile {
  name: string;
  createdAt: string;
  perfumeIds: string[];
  dateAdded: Record<string, string>;
  notePreferences: string[];
  accordPreferences: string[];
}
