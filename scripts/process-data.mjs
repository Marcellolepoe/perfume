import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const raw = readFileSync(join(root, 'parfumo_data.csv'), 'utf-8');

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

const lines = raw.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

const perfumes = [];
const seenNames = new Set();

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  if (fields.length < headers.length) continue;

  const obj = {};
  headers.forEach((h, idx) => { obj[h] = fields[idx] || ''; });

  const rating = parseFloat(obj.Rating_Value);
  const ratingCount = parseInt(obj.Rating_Count);
  const topNotes = obj.Top_Notes ? obj.Top_Notes.split(',').map(s => s.trim()).filter(s => s && s !== 'NA') : [];
  const middleNotes = obj.Middle_Notes ? obj.Middle_Notes.split(',').map(s => s.trim()).filter(s => s && s !== 'NA') : [];
  const baseNotes = obj.Base_Notes ? obj.Base_Notes.split(',').map(s => s.trim()).filter(s => s && s !== 'NA') : [];
  const accords = obj.Main_Accords ? obj.Main_Accords.split(',').map(s => s.trim()).filter(s => s && s !== 'NA') : [];

  const hasNotes = topNotes.length > 0 || middleNotes.length > 0 || baseNotes.length > 0;
  if (!hasNotes || !obj.Name || !obj.Brand) continue;

  // Deduplicate by name+brand
  const key = `${obj.Name.toLowerCase()}|${obj.Brand.toLowerCase()}`;
  if (seenNames.has(key)) continue;
  seenNames.add(key);

  const rawId = obj.Number && obj.Number !== 'NA' ? obj.Number : null;
  const uniqueId = rawId || `p${i}`;

  perfumes.push({
    id: uniqueId,
    n: obj.Name,
    b: obj.Brand,
    y: obj.Release_Year && obj.Release_Year !== 'NA' ? parseInt(obj.Release_Year) : null,
    c: obj.Concentration && obj.Concentration !== 'NA' ? obj.Concentration : null,
    r: isNaN(rating) ? null : Math.round(rating * 100) / 100,
    rc: isNaN(ratingCount) ? null : ratingCount,
    a: accords,
    t: topNotes,
    m: middleNotes,
    ba: baseNotes,
    u: obj.URL || null,
  });
}

// Sort by rating count descending so most popular are first
perfumes.sort((a, b) => (b.rc || 0) - (a.rc || 0));

// Take top 8000 to keep bundle size reasonable (~2.5MB raw, ~500KB gzip)
const topPerfumes = perfumes.slice(0, 8000);

// Build unique notes with frequency
const noteFreq = {};
const notePositions = {};
for (const p of topPerfumes) {
  for (const n of p.t) {
    noteFreq[n] = (noteFreq[n] || 0) + 1;
    if (!notePositions[n]) notePositions[n] = { top: 0, middle: 0, base: 0 };
    notePositions[n].top++;
  }
  for (const n of p.m) {
    noteFreq[n] = (noteFreq[n] || 0) + 1;
    if (!notePositions[n]) notePositions[n] = { top: 0, middle: 0, base: 0 };
    notePositions[n].middle++;
  }
  for (const n of p.ba) {
    noteFreq[n] = (noteFreq[n] || 0) + 1;
    if (!notePositions[n]) notePositions[n] = { top: 0, middle: 0, base: 0 };
    notePositions[n].base++;
  }
}

const notes = Object.entries(noteFreq)
  .map(([name, count]) => ({ name, count, positions: notePositions[name] }))
  .sort((a, b) => b.count - a.count);

// Build unique accords
const accordFreq = {};
for (const p of topPerfumes) {
  for (const a of p.a) {
    accordFreq[a] = (accordFreq[a] || 0) + 1;
  }
}
const accords = Object.entries(accordFreq)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);

mkdirSync(join(root, 'src', 'data'), { recursive: true });

writeFileSync(join(root, 'src', 'data', 'perfumes.json'), JSON.stringify(topPerfumes));
writeFileSync(join(root, 'src', 'data', 'notes.json'), JSON.stringify(notes));
writeFileSync(join(root, 'src', 'data', 'accords.json'), JSON.stringify(accords));

const jsonSize = (Buffer.byteLength(JSON.stringify(topPerfumes)) / 1024 / 1024).toFixed(1);
console.log(`Processed ${topPerfumes.length} perfumes (${jsonSize}MB JSON), ${notes.length} unique notes, ${accords.length} unique accords`);
console.log(`Top 5: ${topPerfumes.slice(0, 5).map(p => p.n).join(', ')}`);
