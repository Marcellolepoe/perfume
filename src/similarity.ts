import type { Perfume } from './types';

/**
 * Weighted Jaccard similarity on the note pyramid.
 * Top notes get weight 1, middle 1.5, base 2 (base notes define a perfume's character more).
 */
export function computeSimilarity(a: Perfume, b: Perfume): number {
  const weighted = (notes: string[], weight: number) =>
    notes.map(n => ({ note: n.toLowerCase(), weight }));

  const vecA = [
    ...weighted(a.topNotes, 1),
    ...weighted(a.middleNotes, 1.5),
    ...weighted(a.baseNotes, 2),
  ];
  const vecB = [
    ...weighted(b.topNotes, 1),
    ...weighted(b.middleNotes, 1.5),
    ...weighted(b.baseNotes, 2),
  ];

  const mapA = new Map<string, number>();
  for (const { note, weight } of vecA) {
    mapA.set(note, (mapA.get(note) || 0) + weight);
  }
  const mapB = new Map<string, number>();
  for (const { note, weight } of vecB) {
    mapB.set(note, (mapB.get(note) || 0) + weight);
  }

  const allNotes = new Set([...mapA.keys(), ...mapB.keys()]);
  let intersection = 0;
  let union = 0;
  for (const note of allNotes) {
    const wA = mapA.get(note) || 0;
    const wB = mapB.get(note) || 0;
    intersection += Math.min(wA, wB);
    union += Math.max(wA, wB);
  }

  return union === 0 ? 0 : intersection / union;
}

export function findSimilar(
  target: Perfume,
  allPerfumes: Perfume[],
  limit = 12
): { perfume: Perfume; score: number }[] {
  const results: { perfume: Perfume; score: number }[] = [];
  for (const p of allPerfumes) {
    if (p.id === target.id) continue;
    const score = computeSimilarity(target, p);
    if (score > 0.05) results.push({ perfume: p, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Find perfumes sharing specific notes but with different overall profile */
export function findSameNotesDifferentAccent(
  target: Perfume,
  allPerfumes: Perfume[],
  limit = 12
): { perfume: Perfume; sharedNotes: string[]; differentNotes: string[] }[] {
  const targetAllNotes = new Set(
    [...target.topNotes, ...target.middleNotes, ...target.baseNotes].map(n => n.toLowerCase())
  );

  const results: { perfume: Perfume; sharedNotes: string[]; differentNotes: string[]; score: number }[] = [];

  for (const p of allPerfumes) {
    if (p.id === target.id) continue;
    const pAllNotes = [...p.topNotes, ...p.middleNotes, ...p.baseNotes];
    const pAllLower = new Set(pAllNotes.map(n => n.toLowerCase()));

    const shared = pAllNotes.filter(n => targetAllNotes.has(n.toLowerCase()));
    const different = pAllNotes.filter(n => !targetAllNotes.has(n.toLowerCase()));

    const similarity = computeSimilarity(target, p);

    // We want perfumes that share some notes (>= 2) but aren't too similar (< 0.7)
    if (shared.length >= 2 && similarity < 0.7 && similarity > 0.1) {
      results.push({
        perfume: p,
        sharedNotes: [...new Set(shared)],
        differentNotes: [...new Set(different)],
        score: shared.length / pAllLower.size,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
