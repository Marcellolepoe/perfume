import type { Perfume } from './types';

export interface NoteAnalysis {
  note: string;
  count: number;
  percentage: number;
  positions: { top: number; middle: number; base: number };
  primaryPosition: 'top' | 'middle' | 'base';
}

export interface AccordAnalysis {
  accord: string;
  count: number;
  percentage: number;
}

export interface ProfilePersonality {
  archetype: string;
  description: string;
  traits: string[];
  seasonality: { season: string; strength: number }[];
  occasion: { type: string; strength: number }[];
}

export interface CollectionAnalysis {
  totalPerfumes: number;
  topNotesRanked: NoteAnalysis[];
  middleNotesRanked: NoteAnalysis[];
  baseNotesRanked: NoteAnalysis[];
  allNotesRanked: NoteAnalysis[];
  accordsRanked: AccordAnalysis[];
  signature: string[];
  personality: ProfilePersonality | null;
  noteCategories: { category: string; notes: string[]; percentage: number }[];
}

const NOTE_CATEGORIES: Record<string, string[]> = {
  'Citrus & Fresh': ['bergamot', 'lemon', 'orange', 'grapefruit', 'lime', 'mandarin', 'citrus', 'yuzu', 'petitgrain'],
  'Floral': ['rose', 'jasmine', 'tuberose', 'lily', 'violet', 'iris', 'peony', 'magnolia', 'gardenia', 'ylang', 'neroli', 'orange blossom', 'freesia', 'lotus'],
  'Woody': ['sandalwood', 'cedar', 'cedarwood', 'oud', 'vetiver', 'patchouli', 'guaiac', 'birch', 'cypress', 'pine', 'teak', 'ebony'],
  'Warm & Spicy': ['vanilla', 'amber', 'cinnamon', 'cardamom', 'pepper', 'ginger', 'saffron', 'clove', 'nutmeg', 'incense', 'frankincense'],
  'Sweet & Gourmand': ['caramel', 'chocolate', 'honey', 'praline', 'tonka', 'almond', 'coffee', 'cocoa', 'sugar', 'marshmallow'],
  'Green & Herbal': ['basil', 'mint', 'lavender', 'rosemary', 'thyme', 'sage', 'tea', 'grass', 'fig leaf', 'bamboo', 'galbanum'],
  'Fruity': ['apple', 'peach', 'pear', 'berry', 'raspberry', 'strawberry', 'cherry', 'plum', 'apricot', 'blackcurrant', 'fig', 'coconut', 'mango', 'passion fruit'],
  'Musky & Animalic': ['musk', 'leather', 'suede', 'castoreum', 'civet', 'ambergris', 'animalic'],
  'Aquatic & Ozonic': ['marine', 'aquatic', 'sea', 'ocean', 'ozone', 'rain', 'water'],
  'Powdery & Soft': ['powder', 'heliotrope', 'orris', 'rice', 'talc'],
};

const ACCORD_PERSONALITIES: Record<string, { archetype: string; traits: string[]; seasons: string[]; occasions: string[] }> = {
  'woody': { archetype: 'The Sophisticate', traits: ['refined', 'confident', 'grounded'], seasons: ['autumn', 'winter'], occasions: ['evening', 'formal'] },
  'floral': { archetype: 'The Romantic', traits: ['elegant', 'feminine', 'graceful'], seasons: ['spring', 'summer'], occasions: ['daytime', 'date'] },
  'fresh': { archetype: 'The Free Spirit', traits: ['energetic', 'clean', 'uplifting'], seasons: ['spring', 'summer'], occasions: ['casual', 'sport'] },
  'citrus': { archetype: 'The Optimist', traits: ['bright', 'cheerful', 'dynamic'], seasons: ['spring', 'summer'], occasions: ['daytime', 'work'] },
  'sweet': { archetype: 'The Charmer', traits: ['warm', 'inviting', 'playful'], seasons: ['autumn', 'winter'], occasions: ['casual', 'date'] },
  'warm spicy': { archetype: 'The Bold One', traits: ['passionate', 'daring', 'memorable'], seasons: ['autumn', 'winter'], occasions: ['evening', 'special'] },
  'spicy': { archetype: 'The Bold One', traits: ['passionate', 'daring', 'memorable'], seasons: ['autumn', 'winter'], occasions: ['evening', 'special'] },
  'powdery': { archetype: 'The Classic', traits: ['timeless', 'soft', 'comforting'], seasons: ['spring', 'autumn'], occasions: ['work', 'daytime'] },
  'musky': { archetype: 'The Sensualist', traits: ['intimate', 'magnetic', 'understated'], seasons: ['all'], occasions: ['evening', 'date'] },
  'fruity': { archetype: 'The Playful One', traits: ['fun', 'youthful', 'approachable'], seasons: ['spring', 'summer'], occasions: ['casual', 'daytime'] },
  'gourmand': { archetype: 'The Indulgent', traits: ['cozy', 'comforting', 'decadent'], seasons: ['autumn', 'winter'], occasions: ['casual', 'evening'] },
  'oriental': { archetype: 'The Mystic', traits: ['mysterious', 'exotic', 'luxurious'], seasons: ['autumn', 'winter'], occasions: ['evening', 'special'] },
  'aromatic': { archetype: 'The Natural', traits: ['fresh', 'herbal', 'balanced'], seasons: ['spring', 'summer'], occasions: ['casual', 'work'] },
  'green': { archetype: 'The Natural', traits: ['fresh', 'crisp', 'invigorating'], seasons: ['spring'], occasions: ['daytime', 'casual'] },
  'aquatic': { archetype: 'The Adventurer', traits: ['fresh', 'clean', 'sporty'], seasons: ['summer'], occasions: ['casual', 'sport'] },
  'leather': { archetype: 'The Rebel', traits: ['bold', 'edgy', 'distinctive'], seasons: ['autumn', 'winter'], occasions: ['evening', 'special'] },
  'smoky': { archetype: 'The Rebel', traits: ['intense', 'provocative', 'unforgettable'], seasons: ['winter'], occasions: ['evening', 'special'] },
  'earthy': { archetype: 'The Grounded', traits: ['natural', 'authentic', 'calm'], seasons: ['autumn'], occasions: ['casual', 'daytime'] },
  'animal': { archetype: 'The Sensualist', traits: ['primal', 'seductive', 'complex'], seasons: ['winter'], occasions: ['evening', 'date'] },
  'balsamic': { archetype: 'The Healer', traits: ['soothing', 'resinous', 'meditative'], seasons: ['autumn', 'winter'], occasions: ['evening', 'casual'] },
};

function generatePersonality(accordsRanked: AccordAnalysis[], allNotes: NoteAnalysis[]): ProfilePersonality | null {
  if (accordsRanked.length === 0) return null;

  const topAccords = accordsRanked.slice(0, 3);
  const primaryAccord = topAccords[0].accord.toLowerCase();
  
  const personality = ACCORD_PERSONALITIES[primaryAccord] || ACCORD_PERSONALITIES['woody'];
  
  const seasonCount: Record<string, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const occasionCount: Record<string, number> = {};
  
  for (const acc of topAccords) {
    const p = ACCORD_PERSONALITIES[acc.accord.toLowerCase()];
    if (p) {
      p.seasons.forEach(s => { if (s !== 'all') seasonCount[s] = (seasonCount[s] || 0) + acc.percentage; });
      p.occasions.forEach(o => { occasionCount[o] = (occasionCount[o] || 0) + acc.percentage; });
    }
  }

  const seasonality = Object.entries(seasonCount)
    .map(([season, strength]) => ({ season, strength }))
    .sort((a, b) => b.strength - a.strength);

  const occasion = Object.entries(occasionCount)
    .map(([type, strength]) => ({ type, strength }))
    .sort((a, b) => b.strength - a.strength);

  const topNotes = allNotes.slice(0, 5).map(n => n.note.toLowerCase());
  let description = `Your collection reveals a ${personality.archetype.toLowerCase()} sensibility. `;
  
  if (topAccords.length >= 2) {
    description += `You're drawn to ${topAccords[0].accord.toLowerCase()} and ${topAccords[1].accord.toLowerCase()} fragrances, `;
  }
  
  if (topNotes.length >= 3) {
    description += `with a particular love for ${topNotes[0]}, ${topNotes[1]}, and ${topNotes[2]}. `;
  }

  if (seasonality[0]?.strength > 50) {
    description += `Your scents lean towards ${seasonality[0].season} weather. `;
  } else if (seasonality.length >= 2) {
    description += `Your palette works well across ${seasonality[0].season} and ${seasonality[1].season}. `;
  }

  return {
    archetype: personality.archetype,
    description: description.trim(),
    traits: personality.traits,
    seasonality,
    occasion,
  };
}

function categorizeNotes(allNotes: NoteAnalysis[]): { category: string; notes: string[]; percentage: number }[] {
  const categories: { category: string; notes: string[]; count: number }[] = [];
  
  for (const [category, keywords] of Object.entries(NOTE_CATEGORIES)) {
    const matchingNotes = allNotes.filter(n => 
      keywords.some(k => n.note.toLowerCase().includes(k))
    );
    if (matchingNotes.length > 0) {
      const totalCount = matchingNotes.reduce((sum, n) => sum + n.count, 0);
      categories.push({
        category,
        notes: matchingNotes.slice(0, 5).map(n => n.note),
        count: totalCount,
      });
    }
  }

  const maxCount = Math.max(...categories.map(c => c.count), 1);
  return categories
    .map(c => ({ ...c, percentage: Math.round((c.count / maxCount) * 100) }))
    .sort((a, b) => b.count - a.count);
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
      personality: null,
      noteCategories: [],
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

  const signature = allNotes
    .filter(n => n.percentage >= 40)
    .map(n => n.note);

  const personality = generatePersonality(accordsRanked, allNotes);
  const noteCategories = categorizeNotes(allNotes);

  return {
    totalPerfumes: total,
    topNotesRanked,
    middleNotesRanked,
    baseNotesRanked,
    allNotesRanked: allNotes,
    accordsRanked,
    signature,
    personality,
    noteCategories,
  };
}

export interface MatchResult {
  perfume: Perfume;
  score: number;
  matchReasons: string[];
}

export interface ExploreResult {
  perfume: Perfume;
  newNotes: string[];
  categories: string[];
}

const EXPLORE_CATEGORIES: Record<string, string[]> = {
  woody: ['sandalwood', 'cedar', 'oud', 'vetiver', 'patchouli', 'guaiac', 'wood', 'oak', 'teak', 'birch'],
  floral: ['rose', 'jasmine', 'tuberose', 'lily', 'violet', 'iris', 'peony', 'magnolia', 'gardenia', 'ylang', 'neroli', 'flower', 'blossom'],
  citrus: ['bergamot', 'lemon', 'orange', 'grapefruit', 'lime', 'mandarin', 'citrus', 'yuzu', 'tangerine'],
  spicy: ['pepper', 'cinnamon', 'cardamom', 'ginger', 'saffron', 'clove', 'nutmeg', 'cumin'],
  sweet: ['vanilla', 'caramel', 'honey', 'praline', 'tonka', 'chocolate', 'sugar', 'cocoa', 'marshmallow'],
  fresh: ['mint', 'eucalyptus', 'marine', 'aquatic', 'ozonic', 'green', 'cucumber', 'tea'],
};

function getNoteCategories(notes: string[]): string[] {
  const cats = new Set<string>();
  for (const note of notes) {
    const lower = note.toLowerCase();
    for (const [category, keywords] of Object.entries(EXPLORE_CATEGORIES)) {
      if (keywords.some(k => lower.includes(k))) {
        cats.add(category);
      }
    }
  }
  return [...cats];
}

export function getProfileRecommendations(
  analysis: CollectionAnalysis,
  collectionIds: string[],
  allPerfumes: Perfume[],
  limit = 12
): { matches: MatchResult[]; explores: ExploreResult[] } {
  if (analysis.totalPerfumes < 2) return { matches: [], explores: [] };

  const topNotes = new Set(analysis.topNotesRanked.slice(0, 10).map(n => n.note.toLowerCase()));
  const midNotes = new Set(analysis.middleNotesRanked.slice(0, 10).map(n => n.note.toLowerCase()));
  const baseNotes = new Set(analysis.baseNotesRanked.slice(0, 10).map(n => n.note.toLowerCase()));
  const topAccords = new Set(analysis.accordsRanked.slice(0, 5).map(a => a.accord.toLowerCase()));
  const allFavNotes = new Set(analysis.allNotesRanked.slice(0, 20).map(n => n.note.toLowerCase()));

  const candidates = allPerfumes.filter(p => !collectionIds.includes(p.id));

  const scored = candidates.map(p => {
    let score = 0;
    const matchReasons: string[] = [];
    let accordMatches = 0;
    let noteMatches = 0;
    
    for (const a of p.accords) {
      if (topAccords.has(a.toLowerCase())) {
        score += 15;
        accordMatches++;
      }
    }
    if (accordMatches > 0) matchReasons.push(`${accordMatches} accord${accordMatches > 1 ? 's' : ''} you love`);
    
    for (const n of p.topNotes) {
      if (topNotes.has(n.toLowerCase())) { score += 8; noteMatches++; }
      else if (allFavNotes.has(n.toLowerCase())) { score += 3; noteMatches++; }
    }
    for (const n of p.middleNotes) {
      if (midNotes.has(n.toLowerCase())) { score += 10; noteMatches++; }
      else if (allFavNotes.has(n.toLowerCase())) { score += 4; noteMatches++; }
    }
    for (const n of p.baseNotes) {
      if (baseNotes.has(n.toLowerCase())) { score += 12; noteMatches++; }
      else if (allFavNotes.has(n.toLowerCase())) { score += 5; noteMatches++; }
    }
    if (noteMatches > 0) matchReasons.push(`${noteMatches} note${noteMatches > 1 ? 's' : ''} in common`);

    if (p.rating && p.rating >= 4) {
      score += 5;
      matchReasons.push(`highly rated (${p.rating.toFixed(1)})`);
    }
    if (p.ratingCount && p.ratingCount > 100) score += 3;

    const allPerfNotes = [...p.topNotes, ...p.middleNotes, ...p.baseNotes];
    const newNotes = allPerfNotes.filter(n => !allFavNotes.has(n.toLowerCase()));
    const categories = getNoteCategories(newNotes);

    return { perfume: p, score, matchReasons, newNotes, categories };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxScore = scored[0]?.score || 1;
  const matches: MatchResult[] = scored.slice(0, limit).map(s => ({
    perfume: s.perfume,
    score: Math.round((s.score / maxScore) * 100),
    matchReasons: s.matchReasons,
  }));

  const explores: ExploreResult[] = scored
    .filter(s => s.newNotes.length >= 2 && s.score > 15 && s.score < maxScore * 0.75)
    .slice(0, 30)
    .map(s => ({
      perfume: s.perfume,
      newNotes: s.newNotes.slice(0, 4),
      categories: s.categories,
    }));

  return { matches, explores };
}
