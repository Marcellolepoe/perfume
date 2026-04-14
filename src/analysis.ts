import type { Perfume } from './types';

export interface NoteAnalysis {
  note: string;
  count: number;
  percentage: number;
  positions: { top: number; middle: number; base: number };
  primaryPosition: 'top' | 'middle' | 'base';
}

export interface CollectionAnalysis {
  totalPerfumes: number;
  topNotesRanked: NoteAnalysis[];
  middleNotesRanked: NoteAnalysis[];
  baseNotesRanked: NoteAnalysis[];
  allNotesRanked: NoteAnalysis[];
  accordsRanked: { accord: string; count: number; percentage: number }[];
  signature: string[];
}

export function analyzeCollection(perfumes: Perfume[]): CollectionAnalysis {
  const total = perfumes.length;
  if (total === 0) {
    return {
      totalPerfumes: 0,
      topNotesRanked: [],
      middleNotesRanked: [],
      baseNotesRanked: [],
      allNotesRanked: [],
      accordsRanked: [],
      signature: [],
    };
  }

  const noteMap = new Map<string, { count: number; top: number; middle: number; base: number }>();

  const countNote = (name: string, position: 'top' | 'middle' | 'base') => {
    const key = name.toLowerCase();
    const entry = noteMap.get(key) || { count: 0, top: 0, middle: 0, base: 0 };
    entry.count++;
    entry[position]++;
    noteMap.set(key, entry);
  };

  const accordMap = new Map<string, number>();

  for (const p of perfumes) {
    p.topNotes.forEach(n => countNote(n, 'top'));
    p.middleNotes.forEach(n => countNote(n, 'middle'));
    p.baseNotes.forEach(n => countNote(n, 'base'));
    p.accords.forEach(a => {
      const key = a.toLowerCase();
      accordMap.set(key, (accordMap.get(key) || 0) + 1);
    });
  }

  const toAnalysis = (entry: [string, { count: number; top: number; middle: number; base: number }]): NoteAnalysis => {
    const [note, data] = entry;
    const maxPos = Math.max(data.top, data.middle, data.base);
    const primaryPosition = data.top === maxPos ? 'top' : data.middle === maxPos ? 'middle' : 'base';
    return {
      note: note.charAt(0).toUpperCase() + note.slice(1),
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      positions: { top: data.top, middle: data.middle, base: data.base },
      primaryPosition,
    };
  };

  const allNotes = [...noteMap.entries()].map(toAnalysis).sort((a, b) => b.count - a.count);

  const topNotesRanked = allNotes
    .filter(n => n.positions.top > 0)
    .sort((a, b) => b.positions.top - a.positions.top);
  const middleNotesRanked = allNotes
    .filter(n => n.positions.middle > 0)
    .sort((a, b) => b.positions.middle - a.positions.middle);
  const baseNotesRanked = allNotes
    .filter(n => n.positions.base > 0)
    .sort((a, b) => b.positions.base - a.positions.base);

  const accordsRanked = [...accordMap.entries()]
    .map(([accord, count]) => ({
      accord: accord.charAt(0).toUpperCase() + accord.slice(1),
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // "Signature" = notes appearing in > 40% of the collection
  const signature = allNotes
    .filter(n => n.percentage >= 40)
    .map(n => n.note);

  return {
    totalPerfumes: total,
    topNotesRanked,
    middleNotesRanked,
    baseNotesRanked,
    allNotesRanked: allNotes,
    accordsRanked,
    signature,
  };
}
