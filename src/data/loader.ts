import type { Perfume } from '../types';

interface CompactPerfume {
  id: string;
  n: string;
  b: string;
  y: number | null;
  c: string | null;
  r: number | null;
  rc: number | null;
  a: string[];
  t: string[];
  m: string[];
  ba: string[];
  u: string | null;
}

function hydrate(raw: CompactPerfume[]): Perfume[] {
  return raw.map(p => ({
    id: p.id,
    name: p.n,
    brand: p.b,
    year: p.y,
    concentration: p.c,
    rating: p.r,
    ratingCount: p.rc,
    accords: p.a,
    topNotes: p.t,
    middleNotes: p.m,
    baseNotes: p.ba,
    url: p.u,
  }));
}

let cachedPerfumes: Perfume[] | null = null;

export async function loadPerfumes(): Promise<Perfume[]> {
  if (cachedPerfumes) return cachedPerfumes;
  
  const base = import.meta.env.BASE_URL || '/';
  const res = await fetch(`${base}perfumes.json`);
  const raw: CompactPerfume[] = await res.json();
  cachedPerfumes = hydrate(raw);
  return cachedPerfumes;
}

export function getPerfumes(): Perfume[] {
  return cachedPerfumes || [];
}
