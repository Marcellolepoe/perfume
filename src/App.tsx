import { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import Fuse from 'fuse.js';
import {
  Search, Heart, ChevronLeft, X, BarChart3, Compass, Sparkles,
  User, Download, Upload, ArrowUpRight,
} from 'lucide-react';
import type { Perfume } from './types';
import { perfumes } from './data/loader';
import { loadProfile, saveProfile, addPerfume, removePerfume } from './store';
import { findSimilar, findSameNotesDifferentAccent } from './similarity';
import { analyzeCollection, getProfileRecommendations, type CollectionAnalysis } from './analysis';

type View = 'home' | 'detail' | 'collection' | 'analysis' | 'profile';

const ACCORD_COLORS: Record<string, string> = {
  woody: '#B8A088', citrus: '#E4C86A', floral: '#D4A0B0', fresh: '#8CBDB0',
  sweet: '#D4A0A0', warm: '#CDA06A', spicy: '#C48A7A', powdery: '#D4BFC4',
  musky: '#C4B8A8', fruity: '#D4A480', green: '#8AAA8A', aromatic: '#9AAA80',
  aquatic: '#7AA4B8', earthy: '#A89080', leather: '#8A7060', oriental: '#C4A468',
  smoky: '#908888', gourmand: '#B8906A', balsamic: '#B49A78', synthetic: '#A498B8',
  animal: '#A08070',
};

function NotePill({ note, position }: { note: string; position?: 'top' | 'middle' | 'base' }) {
  const styles = {
    top: 'bg-sky-50 text-sky-400 border-sky-100',
    middle: 'bg-blush-50 text-blush-400 border-blush-100',
    base: 'bg-honey-50 text-honey-400 border-honey-100',
  };
  return (
    <span className={`inline-block px-3 py-1 text-[11px] tracking-wide font-medium rounded-full border ${position ? styles[position] : 'bg-warm-100 text-warm-500 border-warm-200'}`}>
      {note}
    </span>
  );
}

function AccordBadge({ accord }: { accord: string }) {
  const color = ACCORD_COLORS[accord.toLowerCase()] || '#A69882';
  return (
    <span
      className="inline-block px-3 py-1 text-[10px] tracking-widest uppercase font-medium rounded-full"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {accord}
    </span>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-warm-400 text-xs tracking-wide">Unrated</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-warm-700 font-medium text-sm">{rating.toFixed(1)}</span>
      <div className="flex gap-px">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < Math.floor(rating);
          const half = i === Math.floor(rating) && rating % 1 >= 0.25;
          return (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-honey-300' : half ? 'bg-honey-200' : 'bg-warm-200'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PerfumeCard({
  perfume, onClick, onToggleCollection, inCollection,
}: {
  perfume: Perfume; onClick: () => void;
  onToggleCollection: () => void; inCollection: boolean;
}) {
  return (
    <div
      className="group bg-warm-50 rounded-2xl border border-warm-200/60 p-5 hover:border-warm-300 hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer relative"
      onClick={onClick}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggleCollection(); }}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all duration-200 ${
          inCollection
            ? 'text-blush-400 bg-blush-50'
            : 'text-warm-300 hover:text-blush-300 hover:bg-blush-50/50'
        }`}
        title={inCollection ? 'Remove from collection' : 'Add to collection'}
      >
        <Heart className="w-4 h-4" fill={inCollection ? 'currentColor' : 'none'} strokeWidth={1.5} />
      </button>

      <div className="pr-10">
        <h3 className="font-medium text-warm-800 text-[15px] leading-snug tracking-tight">
          {perfume.name}
        </h3>
        <p className="text-xs text-warm-500 mt-1 tracking-wide">{perfume.brand}</p>
      </div>

      <div className="mt-3">
        <StarRating rating={perfume.rating} />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {perfume.accords.slice(0, 3).map((a, i) => (
          <AccordBadge key={`${a}-${i}`} accord={a} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {[...perfume.topNotes.slice(0, 2), ...perfume.baseNotes.slice(0, 1)].map((n, i) => (
          <span key={`${n}-${i}`} className="text-[10px] text-warm-400 tracking-wide">
            {n}{i < 2 ? ' · ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function PerfumeDetail({
  perfume, onBack, onToggleCollection, inCollection, allPerfumes, onNavigate,
}: {
  perfume: Perfume; onBack: () => void;
  onToggleCollection: () => void; inCollection: boolean;
  allPerfumes: Perfume[]; onNavigate: (p: Perfume) => void;
}) {
  const similar = useMemo(() => findSimilar(perfume, allPerfumes), [perfume, allPerfumes]);
  const sameButDiff = useMemo(() => findSameNotesDifferentAccent(perfume, allPerfumes), [perfume, allPerfumes]);
  const [showTab, setShowTab] = useState<'similar' | 'explore'>('similar');

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-warm-400 hover:text-warm-700 mb-8 text-xs tracking-widest uppercase transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back to browse
      </button>

      <div className="bg-warm-50 rounded-3xl border border-warm-200/60 overflow-hidden">
        <div className="p-8 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-2">{perfume.brand}</p>
              <h1 className="text-2xl font-medium text-warm-900 tracking-tight leading-tight">{perfume.name}</h1>
              <div className="flex items-center gap-4 mt-3">
                {perfume.year && (
                  <span className="text-xs text-warm-400 tracking-wide">{perfume.year}</span>
                )}
                {perfume.concentration && (
                  <span className="text-[10px] tracking-widest uppercase text-warm-500 bg-warm-100 px-2.5 py-1 rounded-full">
                    {perfume.concentration}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <StarRating rating={perfume.rating} />
                {perfume.ratingCount && (
                  <span className="text-[10px] text-warm-400 tracking-wide">
                    {perfume.ratingCount.toLocaleString()} reviews
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onToggleCollection}
              className={`p-3 rounded-full transition-all duration-200 ${
                inCollection
                  ? 'text-blush-400 bg-blush-50 border border-blush-100'
                  : 'text-warm-300 bg-warm-100 border border-warm-200 hover:text-blush-300 hover:bg-blush-50/50'
              }`}
            >
              <Heart className="w-5 h-5" fill={inCollection ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
          </div>

          {perfume.accords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {perfume.accords.map((a, i) => <AccordBadge key={`${a}-${i}`} accord={a} />)}
            </div>
          )}
        </div>

        <div className="border-t border-warm-200/60" />

        <div className="p-8 space-y-7">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-5">Note Pyramid</h2>

            {perfume.topNotes.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-px bg-sky-200" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-warm-500">Top</span>
                  <span className="text-[10px] text-warm-300 italic">opens in the first moments</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-11">
                  {perfume.topNotes.map((n, i) => <NotePill key={`${n}-${i}`} note={n} position="top" />)}
                </div>
              </div>
            )}

            {perfume.middleNotes.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-px bg-blush-200" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-warm-500">Heart</span>
                  <span className="text-[10px] text-warm-300 italic">the core character</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-11">
                  {perfume.middleNotes.map((n, i) => <NotePill key={`${n}-${i}`} note={n} position="middle" />)}
                </div>
              </div>
            )}

            {perfume.baseNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-px bg-honey-200" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-warm-500">Base</span>
                  <span className="text-[10px] text-warm-300 italic">lingers for hours</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-11">
                  {perfume.baseNotes.map((n, i) => <NotePill key={`${n}-${i}`} note={n} position="base" />)}
                </div>
              </div>
            )}
          </div>

          {perfume.url && (
            <a
              href={perfume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-warm-400 hover:text-warm-600 tracking-wide transition-colors"
            >
              View on Parfumo <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>

      {/* Similar / Explore */}
      <div className="mt-10">
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowTab('similar')}
            className={`px-4 py-2 rounded-full text-xs tracking-wide transition-all duration-200 ${
              showTab === 'similar'
                ? 'bg-lavender-50 text-lavender-500 border border-lavender-200'
                : 'text-warm-400 border border-warm-200/60 hover:border-warm-300'
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />
            Similar scents
          </button>
          <button
            onClick={() => setShowTab('explore')}
            className={`px-4 py-2 rounded-full text-xs tracking-wide transition-all duration-200 ${
              showTab === 'explore'
                ? 'bg-sage-50 text-sage-500 border border-sage-200'
                : 'text-warm-400 border border-warm-200/60 hover:border-warm-300'
            }`}
          >
            <Compass className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />
            Same notes, different character
          </button>
        </div>

        {showTab === 'similar' && (
          <div className="space-y-3">
            {similar.map(({ perfume: p, score }) => (
              <div
                key={p.id}
                className="bg-warm-50 rounded-2xl border border-warm-200/60 p-4 hover:border-warm-300 cursor-pointer transition-all duration-200"
                onClick={() => onNavigate(p)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-warm-800 tracking-tight">{p.name}</p>
                    <p className="text-[11px] text-warm-400 mt-0.5 tracking-wide">{p.brand}</p>
                  </div>
                  <span className="text-[10px] tracking-widest font-medium text-lavender-400 bg-lavender-50 px-2.5 py-1 rounded-full border border-lavender-100">
                    {Math.round(score * 100)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {p.accords.slice(0, 3).map((a, i) => <AccordBadge key={`${a}-${i}`} accord={a} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {showTab === 'explore' && (
          <div className="space-y-3">
            {sameButDiff.map(({ perfume: p, sharedNotes, differentNotes }) => (
              <div
                key={p.id}
                className="bg-warm-50 rounded-2xl border border-warm-200/60 p-4 hover:border-warm-300 cursor-pointer transition-all duration-200"
                onClick={() => onNavigate(p)}
              >
                <p className="font-medium text-sm text-warm-800 tracking-tight">{p.name}</p>
                <p className="text-[11px] text-warm-400 mt-0.5 tracking-wide">{p.brand}</p>
                <div className="flex gap-6 mt-2.5">
                  <div>
                    <span className="text-[9px] tracking-[0.15em] uppercase text-warm-300">Shared</span>
                    <p className="text-[11px] text-sage-500 mt-0.5">{sharedNotes.slice(0, 4).join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-[9px] tracking-[0.15em] uppercase text-warm-300">New to explore</span>
                    <p className="text-[11px] text-lavender-400 mt-0.5">{differentNotes.slice(0, 4).join(', ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisView({
  analysis, profileName, collectionIds, onNavigate, onToggleCollection,
}: {
  analysis: CollectionAnalysis;
  profileName: string;
  collectionIds: string[];
  onNavigate: (p: Perfume) => void;
  onToggleCollection: (id: string) => void;
}) {
  const [recTab, setRecTab] = useState<'matches' | 'explore'>('matches');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const recommendations = useMemo(
    () => getProfileRecommendations(analysis, collectionIds, perfumes, 12),
    [analysis, collectionIds]
  );

  const filteredExplores = useMemo(() => {
    if (!categoryFilter) return recommendations.explores;
    return recommendations.explores.filter(e => e.categories.includes(categoryFilter));
  }, [recommendations.explores, categoryFilter]);

  if (analysis.totalPerfumes === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-6 h-6 text-warm-300" strokeWidth={1.5} />
        </div>
        <p className="text-warm-500 text-sm">Your scent profile will appear here once you</p>
        <p className="text-warm-500 text-sm">add a few perfumes to your collection.</p>
      </div>
    );
  }

  const NoteBar = ({ notes, label, color }: { notes: typeof analysis.allNotesRanked; label: string; color: string }) => (
    <div>
      <h3 className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mb-3">{label}</h3>
      <div className="space-y-2">
        {notes.slice(0, 6).map(n => (
          <div key={n.note} className="flex items-center gap-3">
            <span className="text-[11px] text-warm-600 w-20 text-right truncate">{n.note}</span>
            <div className="flex-1 bg-warm-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(n.percentage, 8)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-warm-400 w-8 tabular-nums">{n.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Personality Overview */}
      {analysis.personality && (
        <div className="bg-gradient-to-br from-lavender-50 to-blush-50 rounded-3xl border border-lavender-100/60 p-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/60 border border-lavender-200/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-lavender-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-lavender-400 mb-1">
                {profileName ? `${profileName}'s` : 'Your'} Scent Identity
              </p>
              <h2 className="text-xl font-medium text-warm-800 mb-2">
                {analysis.personality.archetype}
              </h2>
              <p className="text-sm text-warm-600 leading-relaxed">
                {analysis.personality.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {analysis.personality.traits.map(t => (
                  <span key={t} className="text-[10px] tracking-wide text-lavender-500 bg-white/60 border border-lavender-200/50 px-3 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Seasonality */}
          {analysis.personality.seasonality.length > 0 && (
            <div className="mt-6 pt-6 border-t border-lavender-200/30">
              <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mb-3">Best seasons for your scents</p>
              <div className="flex gap-3">
                {analysis.personality.seasonality.slice(0, 4).map(s => (
                  <div key={s.season} className="flex-1 text-center">
                    <div className="text-lg mb-1">
                      {s.season === 'spring' ? '🌸' : s.season === 'summer' ? '☀️' : s.season === 'autumn' ? '🍂' : '❄️'}
                    </div>
                    <p className="text-[10px] text-warm-500 capitalize">{s.season}</p>
                    <div className="mt-1 h-1 bg-warm-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lavender-300 rounded-full"
                        style={{ width: `${Math.min(s.strength, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-warm-50 rounded-2xl border border-warm-200/60 p-5 text-center">
          <p className="text-2xl font-light text-warm-700">{analysis.totalPerfumes}</p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mt-1">Perfumes</p>
        </div>
        <div className="bg-warm-50 rounded-2xl border border-warm-200/60 p-5 text-center">
          <p className="text-2xl font-light text-warm-700">{analysis.allNotesRanked.length}</p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mt-1">Unique Notes</p>
        </div>
        <div className="bg-warm-50 rounded-2xl border border-warm-200/60 p-5 text-center">
          <p className="text-2xl font-light text-warm-700">{analysis.accordsRanked.length}</p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mt-1">Accords</p>
        </div>
      </div>

      {/* Signature & Accords */}
      <div className="bg-warm-50 rounded-3xl border border-warm-200/60 p-8">
        {analysis.signature.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mb-2">Your Signature Notes</p>
            <p className="text-[10px] text-warm-300 mb-3">Present in 40%+ of your collection</p>
            <div className="flex flex-wrap gap-2">
              {analysis.signature.map(n => (
                <span key={n} className="text-xs font-medium text-warm-700 bg-warm-100 border border-warm-200 px-4 py-1.5 rounded-full">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.accordsRanked.length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-warm-400 mb-4">Accord Preferences</p>
            <div className="space-y-2.5">
              {analysis.accordsRanked.slice(0, 8).map((a, i) => {
                const color = ACCORD_COLORS[a.accord.toLowerCase()] || '#A69882';
                const maxPct = analysis.accordsRanked[0]?.percentage || 100;
                const width = Math.round((a.percentage / maxPct) * 100);
                return (
                  <div key={a.accord} className="flex items-center gap-3">
                    <span className="text-[11px] text-warm-600 w-16 text-right truncate capitalize">{a.accord}</span>
                    <div className="flex-1 bg-warm-100 rounded-full h-5 overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center"
                        style={{ width: `${Math.max(width, 10)}%`, backgroundColor: `${color}40` }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: '100%', backgroundColor: color, opacity: 0.7 + (0.3 * (1 - i / 8)) }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-warm-600 w-10 tabular-nums">{a.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Note Pyramid Visualization */}
      <div className="bg-warm-50 rounded-3xl border border-warm-200/60 p-8">
        <h2 className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-6">Your Note Pyramid</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <NoteBar notes={analysis.topNotesRanked} label="🌿 Top Notes" color="#7AA4B8" />
          <NoteBar notes={analysis.middleNotesRanked} label="🌸 Heart Notes" color="#D4A0B0" />
          <NoteBar notes={analysis.baseNotesRanked} label="🪵 Base Notes" color="#C9A455" />
        </div>
      </div>

      {/* Note Categories Breakdown */}
      {analysis.noteCategories.length > 0 && (
        <div className="bg-warm-50 rounded-3xl border border-warm-200/60 p-8">
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-4">Scent Families You Love</h2>
          <div className="space-y-3">
            {analysis.noteCategories.slice(0, 6).map(cat => (
              <div key={cat.category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-warm-600">{cat.category}</span>
                  <span className="text-[10px] text-warm-400">{cat.notes.slice(0, 3).join(', ')}</span>
                </div>
                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lavender-300 to-blush-300 rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {(recommendations.matches.length > 0 || recommendations.explores.length > 0) && (
        <div className="bg-warm-50 rounded-3xl border border-warm-200/60 p-8">
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-4">
            Perfumes For You
          </h2>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRecTab('matches')}
              className={`px-4 py-2 rounded-full text-xs tracking-wide transition-all ${
                recTab === 'matches'
                  ? 'bg-lavender-50 text-lavender-500 border border-lavender-200'
                  : 'text-warm-400 border border-warm-200/60 hover:border-warm-300'
              }`}
            >
              <Sparkles className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />
              Perfect Matches ({recommendations.matches.length})
            </button>
            <button
              onClick={() => setRecTab('explore')}
              className={`px-4 py-2 rounded-full text-xs tracking-wide transition-all ${
                recTab === 'explore'
                  ? 'bg-sage-50 text-sage-500 border border-sage-200'
                  : 'text-warm-400 border border-warm-200/60 hover:border-warm-300'
              }`}
            >
              <Compass className="w-3 h-3 inline mr-1.5" strokeWidth={1.5} />
              Explore New Territory ({recommendations.explores.length})
            </button>
          </div>

          {recTab === 'matches' && (
            <div>
              <p className="text-xs text-warm-400 mb-4">
                Scored by how well they match your taste for {analysis.accordsRanked[0]?.accord.toLowerCase()} and {analysis.allNotesRanked[0]?.note.toLowerCase()}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {recommendations.matches.slice(0, 8).map(m => (
                  <div
                    key={m.perfume.id}
                    className="bg-white/50 rounded-2xl border border-warm-200/60 p-4 hover:border-warm-300 cursor-pointer transition-all group"
                    onClick={() => onNavigate(m.perfume)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-warm-800 truncate">{m.perfume.name}</p>
                        <p className="text-[11px] text-warm-400 mt-0.5">{m.perfume.brand}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-1.5 bg-warm-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-lavender-400 to-blush-400"
                              style={{ width: `${m.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-lavender-500">{m.score}%</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); onToggleCollection(m.perfume.id); }}
                          className="p-1.5 rounded-full text-warm-300 hover:text-blush-400 hover:bg-blush-50 transition-colors"
                        >
                          <Heart className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.perfume.accords.slice(0, 3).map((a, i) => <AccordBadge key={`${a}-${i}`} accord={a} />)}
                    </div>
                    <p className="text-[10px] text-warm-400 italic">
                      {m.matchReasons.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recTab === 'explore' && (
            <div>
              <p className="text-xs text-warm-400 mb-3">
                These share your favorites but introduce new notes to expand your palette
              </p>
              
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`text-[10px] px-3 py-1.5 rounded-full transition-all ${
                    !categoryFilter ? 'bg-sage-100 text-sage-600 border border-sage-200' : 'border border-warm-200/60 text-warm-400 hover:border-warm-300'
                  }`}
                >
                  All ({recommendations.explores.length})
                </button>
                {['woody', 'floral', 'citrus', 'spicy', 'sweet', 'fresh'].map(cat => {
                  const count = recommendations.explores.filter(e => e.categories.includes(cat)).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                      className={`text-[10px] px-3 py-1.5 rounded-full capitalize transition-all ${
                        categoryFilter === cat ? 'bg-sage-100 text-sage-600 border border-sage-200' : 'border border-warm-200/60 text-warm-400 hover:border-warm-300'
                      } ${count === 0 ? 'opacity-40' : ''}`}
                      disabled={count === 0}
                    >
                      {cat} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {filteredExplores.slice(0, 8).map(({ perfume: p, newNotes, categories }) => (
                  <div
                    key={p.id}
                    className="bg-white/50 rounded-2xl border border-warm-200/60 p-4 hover:border-warm-300 cursor-pointer transition-all"
                    onClick={() => onNavigate(p)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-warm-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-warm-400 mt-0.5">{p.brand}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onToggleCollection(p.id); }}
                        className="p-1.5 rounded-full text-warm-300 hover:text-blush-400 hover:bg-blush-50 transition-colors"
                      >
                        <Heart className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {categories.slice(0, 3).map(c => (
                          <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-sage-50 text-sage-500 capitalize border border-sage-100">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <span className="text-[9px] tracking-[0.1em] uppercase text-warm-300">New notes to try</span>
                      <p className="text-[11px] text-sage-600 mt-0.5">{newNotes.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredExplores.length === 0 && (
                <p className="text-center text-xs text-warm-300 py-8">No perfumes found with {categoryFilter} notes to explore</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileView({
  profileName, onNameChange, collectionCount, onExport, onImport,
}: {
  profileName: string; onNameChange: (name: string) => void;
  collectionCount: number; onExport: () => void; onImport: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profileName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-warm-50 rounded-3xl border border-warm-200/60 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-lavender-50 border border-lavender-100 flex items-center justify-center">
            <User className="w-8 h-8 text-lavender-300" strokeWidth={1.5} />
          </div>
        </div>

        {editing ? (
          <div className="text-center">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onNameChange(draft); setEditing(false); }
                if (e.key === 'Escape') { setDraft(profileName); setEditing(false); }
              }}
              placeholder="Your name"
              className="text-center text-lg font-medium text-warm-800 bg-transparent border-b border-warm-300 outline-none pb-1 w-48"
            />
            <div className="flex justify-center gap-3 mt-3">
              <button
                onClick={() => { onNameChange(draft); setEditing(false); }}
                className="text-[10px] tracking-widest uppercase text-sage-500 hover:text-sage-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setDraft(profileName); setEditing(false); }}
                className="text-[10px] tracking-widest uppercase text-warm-400 hover:text-warm-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => setEditing(true)}
              className="text-lg font-medium text-warm-800 hover:text-warm-600 transition-colors"
            >
              {profileName || 'Set your name'}
            </button>
            <p className="text-[10px] tracking-widest uppercase text-warm-400 mt-1">
              {profileName ? 'tap to edit' : 'tap to personalise'}
            </p>
          </div>
        )}

        <div className="border-t border-warm-200/60 mt-6 pt-6">
          <div className="text-center mb-6">
            <p className="text-2xl font-light text-warm-700">{collectionCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mt-1">
              perfumes in collection
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onExport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-warm-200 text-xs text-warm-500 hover:border-warm-300 hover:text-warm-700 transition-all"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              Export
            </button>
            <button
              onClick={onImport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-warm-200 text-xs text-warm-500 hover:border-warm-300 hover:text-warm-700 transition-all"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [profile, setProfile] = useState(loadProfile);
  const [accordFilter, setAccordFilter] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(48);

  // Defer search to avoid blocking UI on every keystroke
  const deferredSearch = useDeferredValue(searchInput);

  const collectionIds = profile.perfumeIds;

  const fuse = useMemo(
    () => new Fuse(perfumes, {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'brand', weight: 2 },
        { name: 'topNotes', weight: 1 },
        { name: 'middleNotes', weight: 1 },
        { name: 'baseNotes', weight: 1 },
        { name: 'accords', weight: 1.5 },
      ],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
    }),
    []
  );

  const searchResults = useMemo(() => {
    if (!deferredSearch.trim()) return null;
    return fuse.search(deferredSearch, { limit: 100 }).map(r => r.item);
  }, [deferredSearch, fuse]);

  const filteredPerfumes = useMemo(() => {
    let list = searchResults || perfumes;
    if (accordFilter) {
      list = list.filter(p => p.accords.some(a => a.toLowerCase() === accordFilter.toLowerCase()));
    }
    return list;
  }, [searchResults, accordFilter]);

  const displayPerfumes = filteredPerfumes.slice(0, displayCount);

  // Reset page when filters change
  useEffect(() => { setDisplayCount(48); }, [deferredSearch, accordFilter]);

  const collectionPerfumes = useMemo(
    () => perfumes.filter(p => collectionIds.includes(p.id)),
    [collectionIds]
  );

  const analysis = useMemo(
    () => analyzeCollection(collectionPerfumes),
    [collectionPerfumes]
  );

  const toggleCollection = useCallback((id: string) => {
    if (collectionIds.includes(id)) {
      setProfile(removePerfume(id));
    } else {
      setProfile(addPerfume(id));
    }
  }, [collectionIds]);

  const navigateToDetail = useCallback((p: Perfume) => {
    setSelectedPerfume(p);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const topAccords = useMemo(() => {
    const freq = new Map<string, number>();
    for (const p of perfumes) {
      for (const a of p.accords) {
        freq.set(a, (freq.get(a) || 0) + 1);
      }
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name);
  }, []);

  const handleExport = () => {
    const data = JSON.stringify(profile, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scentmate-${profile.name || 'profile'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data && Array.isArray(data.perfumeIds)) {
            const updated = { ...profile, ...data };
            saveProfile(updated);
            setProfile(updated);
          }
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-xl border-b border-warm-200/40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setView('home'); setSelectedPerfume(null); }}
              className="group"
            >
              <span className="text-base font-medium text-warm-800 tracking-tight">
                ScentMate
              </span>
            </button>

            <nav className="flex items-center gap-1">
              {([
                { id: 'home' as View, label: 'Browse', icon: Search, count: 0 },
                { id: 'collection' as View, label: 'Collection', icon: Heart, count: collectionIds.length },
                { id: 'analysis' as View, label: 'Profile', icon: BarChart3, count: 0 },
                { id: 'profile' as View, label: 'Settings', icon: User, count: 0 },
              ]).map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => { setView(id); setSelectedPerfume(null); }}
                  className={`relative px-3 py-1.5 rounded-full text-[11px] tracking-wide transition-all duration-200 ${
                    view === id
                      ? 'bg-warm-200/60 text-warm-800'
                      : 'text-warm-400 hover:text-warm-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{label}</span>
                  {count ? (
                    <span className="ml-1 text-[9px] bg-blush-100 text-blush-400 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === 'detail' && selectedPerfume ? (
          <PerfumeDetail
            perfume={selectedPerfume}
            onBack={() => setView('home')}
            onToggleCollection={() => toggleCollection(selectedPerfume.id)}
            inCollection={collectionIds.includes(selectedPerfume.id)}
            allPerfumes={perfumes}
            onNavigate={navigateToDetail}
          />
        ) : view === 'analysis' ? (
          <AnalysisView
            analysis={analysis}
            profileName={profile.name}
            collectionIds={collectionIds}
            onNavigate={navigateToDetail}
            onToggleCollection={toggleCollection}
          />
        ) : view === 'profile' ? (
          <ProfileView
            profileName={profile.name}
            onNameChange={(name) => {
              const updated = { ...profile, name };
              saveProfile(updated);
              setProfile(updated);
            }}
            collectionCount={collectionIds.length}
            onExport={handleExport}
            onImport={handleImport}
          />
        ) : view === 'collection' ? (
          <div>
            <div className="mb-8">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-warm-400 mb-1">
                {profile.name ? `${profile.name}'s Collection` : 'My Collection'}
              </h2>
              <p className="text-xs text-warm-400">
                {collectionPerfumes.length === 0
                  ? 'Heart the perfumes you love to start building your scent profile'
                  : `${collectionPerfumes.length} perfume${collectionPerfumes.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {collectionPerfumes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collectionPerfumes.map(p => (
                  <PerfumeCard
                    key={p.id}
                    perfume={p}
                    onClick={() => navigateToDetail(p)}
                    onToggleCollection={() => toggleCollection(p.id)}
                    inCollection={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-blush-50 flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-blush-200" strokeWidth={1.5} />
                </div>
                <p className="text-warm-400 text-sm">Browse and heart perfumes to add them here</p>
              </div>
            )}
          </div>
        ) : (
          /* Home / Browse */
          <div>
            <div className="mb-8">
              <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-300" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by name, brand, or note..."
                  className="w-full pl-11 pr-10 py-3 rounded-2xl border border-warm-200/60 bg-warm-50 text-sm text-warm-800 placeholder:text-warm-300 focus:outline-none focus:border-warm-300 transition-colors"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-300 hover:text-warm-500 transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Accord filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {accordFilter && (
                <button
                  onClick={() => setAccordFilter(null)}
                  className="text-[10px] tracking-widest uppercase bg-warm-800 text-cream px-3 py-1.5 rounded-full flex items-center gap-1.5"
                >
                  {accordFilter} <X className="w-3 h-3" strokeWidth={1.5} />
                </button>
              )}
              {topAccords.map(a => (
                <button
                  key={a}
                  onClick={() => setAccordFilter(accordFilter === a ? null : a)}
                  className={`text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full border transition-all duration-200 ${
                    accordFilter === a
                      ? 'bg-warm-200/60 border-warm-300 text-warm-700'
                      : 'border-warm-200/60 text-warm-400 hover:border-warm-300 hover:text-warm-500'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <p className="text-[10px] tracking-widest uppercase text-warm-300 mb-4">
              {displayPerfumes.length} of {filteredPerfumes.length} perfumes
              {searchInput && ` for "${searchInput}"`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayPerfumes.map(p => (
                <PerfumeCard
                  key={p.id}
                  perfume={p}
                  onClick={() => navigateToDetail(p)}
                  onToggleCollection={() => toggleCollection(p.id)}
                  inCollection={collectionIds.includes(p.id)}
                />
              ))}
            </div>

            {filteredPerfumes.length > displayPerfumes.length && (
              <div className="text-center mt-10">
                <button
                  onClick={() => setDisplayCount(prev => prev + 48)}
                  className="px-6 py-2.5 rounded-full border border-warm-200 text-xs tracking-widest uppercase text-warm-500 hover:border-warm-300 hover:text-warm-700 transition-all duration-200"
                >
                  Show more
                </button>
                <p className="text-[10px] text-warm-300 mt-2 tracking-wide">
                  {displayPerfumes.length} of {filteredPerfumes.length.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-warm-200/40 mt-16 py-8 text-center">
        <p className="text-[10px] tracking-[0.15em] uppercase text-warm-300">
          ScentMate — {perfumes.length.toLocaleString()} perfumes from the Parfumo community
        </p>
      </footer>
    </div>
  );
}
