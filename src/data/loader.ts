import type { Perfume } from '../types';
import rawData from './perfumes.json';

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

export const perfumes: Perfume[] = (rawData as CompactPerfume[]).map(p => ({
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
