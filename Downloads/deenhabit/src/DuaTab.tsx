import { useState, useMemo } from "react";
import { DUAS, DUA_CATEGORIES } from "./duaData";
import type { UserProfile } from "./types";

interface DuaTabProps {
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  isDark: boolean;
}

export default function DuaTab({ profile, onProfileChange, isDark }: DuaTabProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const showTranslit = profile.showTransliteration ?? false;

  const favourites = profile.duaFavourites ?? [];

  function toggleFavourite(id: string) {
    const updated = favourites.includes(id)
      ? favourites.filter((f) => f !== id)
      : [...favourites, id];
    onProfileChange({ ...profile, duaFavourites: updated });
  }

  function toggleTranslit() {
    onProfileChange({ ...profile, showTransliteration: !showTranslit });
  }

  const filtered = useMemo(() => {
    let list = DUAS;
    if (activeCategory) list = list.filter((d) => d.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.translation.toLowerCase().includes(q) ||
        d.whenToRecite.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  const favDuas = DUAS.filter((d) => favourites.includes(d.id));

  const surface = isDark
    ? "bg-white/5 border-white/10"
    : "bg-black/5 border-black/10";

  function DuaCard({ dua }: { dua: typeof DUAS[0] }) {
    const isExpanded = expandedId === dua.id;
    const isFav = favourites.includes(dua.id);

    return (
      <div className={`rounded-2xl border overflow-hidden transition-all ${surface}`}>
        {/* Header */}
        <button
          onClick={() => setExpandedId(isExpanded ? null : dua.id)}
          className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{dua.title}</p>
            <p className="text-xs opacity-50 mt-0.5 line-clamp-1">{dua.whenToRecite}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>

        {/* Expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
            {/* Arabic */}
            <p className="font-arabic text-2xl leading-loose text-right pt-4" dir="rtl" lang="ar">
              {dua.arabic}
            </p>

            {/* Transliteration */}
            {showTranslit && (
              <p className="text-sm italic opacity-60 leading-relaxed border-l-2 border-emerald-500/30 pl-3">
                {dua.transliteration}
              </p>
            )}

            {/* Translation */}
            <p className="text-sm leading-relaxed opacity-80">
              {dua.translation}
            </p>

            {/* When to recite */}
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3">
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">When to recite</p>
              <p className="text-xs opacity-70 leading-relaxed">{dua.whenToRecite}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-40">📖 {dua.source}</span>
              <button
                onClick={() => toggleFavourite(dua.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isFav
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                    : "bg-white/10 hover:bg-white/15"
                }`}
              >
                {isFav ? "★ Saved" : "☆ Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header controls */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${surface}`}>
          <span className="opacity-40 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search duas…"
            className="flex-1 bg-transparent text-sm outline-none placeholder-white/25"
          />
          {search && (
            <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70 text-lg leading-none">×</button>
          )}
        </div>
        <button
          onClick={toggleTranslit}
          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 ${
            showTranslit
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : surface + " opacity-60"
          }`}
        >
          A-B-C
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            !activeCategory
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : surface + " opacity-60"
          }`}
        >
          All
        </button>
        {DUA_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : surface + " opacity-60"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Favourites section */}
      {!search && !activeCategory && favDuas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest opacity-40 flex items-center gap-2 px-1">
            <span>★</span> Saved Duas
          </h3>
          {favDuas.map((d) => <DuaCard key={d.id} dua={d} />)}
        </div>
      )}

      {/* Main list */}
      <div className="space-y-2">
        {!search && !activeCategory && (
          <h3 className="text-[11px] font-semibold uppercase tracking-widest opacity-40 flex items-center gap-2 px-1">
            <span>🤲</span>
            {favDuas.length > 0 ? "All Duas" : `${DUAS.length} Duas`}
          </h3>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-12 opacity-40">
            <p className="text-2xl mb-2">🤲</p>
            <p className="text-sm">No duas found</p>
          </div>
        ) : (
          filtered.map((d) => <DuaCard key={d.id} dua={d} />)
        )}
      </div>

      <p className="text-center text-xs opacity-20 pb-2">{DUAS.length} duas · Tap A-B-C to show transliteration</p>
    </div>
  );
}
