import { useState, useEffect, useRef, useCallback } from "react";
import { SURAHS, getSurahForPage, getJuzForPage } from "./quranData";
import type { UserProfile, DayData } from "./types";

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
  surah: { number: number; name: string; englishName: string };
}

interface QuranTabProps {
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  dayData: DayData;
  onMarkPage: () => void;
  isDark: boolean;
}

const FONT_SIZES = ["text-lg", "text-xl", "text-2xl"];
const FONT_LABELS = ["S", "M", "L"];
const FONT_KEY = "deenhabit_quran_font";

async function fetchPage(page: number): Promise<AyahData[]> {
  const res = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return json.data?.ayahs ?? [];
}

export default function QuranTab({ profile, onProfileChange, dayData, onMarkPage, isDark }: QuranTabProps) {
  const [page, setPage] = useState(profile.quranLastPage || 1);
  const [pagesLoaded, setPagesLoaded] = useState<{ page: number; ayahs: AyahData[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"reader" | "surahs" | "jump">("reader");
  const [jumpInput, setJumpInput] = useState("");
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem(FONT_KEY) ?? "1"));
  const [toast, setToast] = useState<string | null>(null);
  const [surahSearch, setSurahSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const surah = getSurahForPage(page);
  const juz = getJuzForPage(page);
  const todayPages = dayData.quranPages;
  const goal = profile.quranGoal;

  const load = useCallback(async (p: number, append = false) => {
    if (append) setLoadingNext(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(p);
      if (append) {
        setPagesLoaded((prev) => {
          if (prev.some(pd => pd.page === p)) return prev;
          return [...prev, { page: p, ayahs: data }];
        });
      } else {
        setPagesLoaded([{ page: p, ayahs: data }]);
        setPage(p);
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }
    } catch {
      setError("Could not load page. Check your connection.");
    } finally {
      if (append) setLoadingNext(false); else setLoading(false);
    }
  }, []);

  // Initial setup: Load starting page
  useEffect(() => {
    load(profile.quranLastPage || 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce profile updates to avoid constant re-renders when scrolling
  useEffect(() => {
    if (page !== profile.quranLastPage) {
      const tid = setTimeout(() => {
        onProfileChange({ ...profile, quranLastPage: page });
      }, 500);
      return () => clearTimeout(tid);
    }
  }, [page, profile, onProfileChange]);

  // Observer to active page tracking
  useEffect(() => {
    if (!contentRef.current || pagesLoaded.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const p = Number(e.target.getAttribute("data-page"));
          if (p && p !== page) setPage(p);
        }
      });
    }, { root: contentRef.current, threshold: 0.2 });

    const els = contentRef.current.querySelectorAll(".quran-page-marker");
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pagesLoaded, page]);

  // Handle endless scrolling downwards
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 800 && !loading && !loadingNext && !error) {
      const last = pagesLoaded[pagesLoaded.length - 1];
      if (last && last.page < 604) {
        load(last.page + 1, true);
      }
    }
  }, [loading, loadingNext, error, pagesLoaded, load]);

  function goTo(p: number) {
    const clamped = Math.max(1, Math.min(604, p));
    load(clamped, false); // Reload completely from new page
    setView("reader");
  }

  function markRead() {
    onMarkPage();
    const remaining = goal - (todayPages + 1);
    if (remaining <= 0) {
      showToast("🎉 Daily goal reached! الحمد لله");
    } else {
      showToast(`Page ${page} marked ✓ — ${todayPages + 1}/${goal} today`);
    }
    if (page < 604) {
      goTo(page + 1);
    }
  }

  function toggleBookmark() {
    const bookmarks = profile.quranBookmarks ?? [];
    const has = bookmarks.includes(page);
    const updated = has ? bookmarks.filter((b) => b !== page) : [...bookmarks, page];
    onProfileChange({ ...profile, quranBookmarks: updated });
    showToast(has ? "Bookmark removed" : "Page bookmarked 🔖");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function cycleFont() {
    const next = (fontSize + 1) % 3;
    setFontSize(next);
    localStorage.setItem(FONT_KEY, String(next));
  }

  const isBookmarked = (profile.quranBookmarks ?? []).includes(page);
  const filteredSurahs = SURAHS.filter(
    (s) => s.name.toLowerCase().includes(surahSearch.toLowerCase()) ||
      s.arabicName.includes(surahSearch) ||
      String(s.number).includes(surahSearch)
  );

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Top bar ── */}
      <div className={`flex items-center justify-between px-1 py-2 mb-3`}>
        <div>
          <p className="text-base font-bold leading-tight">{surah.arabicName}</p>
          <p className="text-xs opacity-50">{surah.name} · Juz {juz}</p>
        </div>

        {/* Progress pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${todayPages >= goal
            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
            : "bg-white/5 border-white/10 opacity-70"
          }`}>
          📖 {todayPages}/{goal}
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => setView(view === "surahs" ? "reader" : "surahs")}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors ${view === "surahs" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 hover:bg-white/15"
              }`}>☰</button>
          <button onClick={cycleFont}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-xs font-bold transition-colors">
            {FONT_LABELS[fontSize]}
          </button>
        </div>
      </div>

      {/* ── Surah list overlay ── */}
      {view === "surahs" && (
        <div className={`absolute inset-0 z-20 flex flex-col rounded-2xl border overflow-hidden ${isDark ? "bg-[#0a0f0d] border-white/10" : "bg-[#f0f7f4] border-black/10"
          }`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-bold text-base">Surahs</h3>
            <button onClick={() => { setView("reader"); setSurahSearch(""); }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">×</button>
          </div>
          <div className="px-3 py-2">
            <input value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)}
              placeholder="Search surah…"
              className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? "bg-white/5 border-white/10 placeholder-white/30" : "bg-black/5 border-black/10 placeholder-black/30"
                }`} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {filteredSurahs.map((s) => (
              <button key={s.number} onClick={() => { goTo(s.startPage); setSurahSearch(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5 ${surah.number === s.number ? "bg-emerald-500/15 border border-emerald-500/25" : ""
                  }`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${surah.number === s.number ? "bg-emerald-500 text-white" : "bg-white/10"
                  }`}>{s.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs opacity-40">{s.type} · {s.ayahs} ayahs · p.{s.startPage}</p>
                </div>
                <p className="text-base font-arabic flex-shrink-0 opacity-80">{s.arabicName}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Page reader ── */}
      <div ref={contentRef}
        className={`flex-1 overflow-y-auto rounded-2xl border mb-3 scroll-smooth ${isDark ? "bg-white/[0.03] border-white/10" : "bg-black/[0.02] border-black/10"
          }`}
        onScroll={handleScroll}>

        {/* Page number header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] backdrop-blur-md bg-[#0a0f0d]/90">
          <span className="text-xs opacity-40 font-mono">Page {page} of 604</span>
          <button onClick={toggleBookmark} className={`text-lg transition-colors ${isBookmarked ? "text-amber-400" : "opacity-30 hover:opacity-60"}`}>
            {isBookmarked ? "🔖" : "🔖"}
          </button>
          <button onClick={() => setView(view === "jump" ? "reader" : "jump")}
            className="text-xs opacity-50 hover:opacity-80 underline">Jump to page</button>
        </div>

        {/* Jump input */}
        {view === "jump" && (
          <div className="flex gap-2 px-4 py-3 border-b border-white/[0.06]">
            <input type="number" min="1" max="604" value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { goTo(parseInt(jumpInput)); setJumpInput(""); } }}
              placeholder="Enter page (1-604)"
              className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none ${isDark ? "bg-white/5 border-white/15 placeholder-white/25" : "bg-black/5 border-black/10"
                }`} autoFocus />
            <button onClick={() => { goTo(parseInt(jumpInput)); setJumpInput(""); }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold">Go</button>
          </div>
        )}

        {/* Endless Pages Container */}
        <div className="px-4 py-4 space-y-12">
          {(!pagesLoaded.length && loading) && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
          )}

          {(!pagesLoaded.length && error) && (
            <div className="text-center py-12 space-y-3">
              <p className="text-2xl">📡</p>
              <p className="text-sm opacity-60">{error}</p>
              <button onClick={() => load(profile.quranLastPage || 1, false)} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm">Retry</button>
            </div>
          )}

          {pagesLoaded.map((pd, index) => {
            const isFirstInSurah = pd.ayahs.length > 0 && pd.ayahs[0].numberInSurah === 1;
            const pbSurah = getSurahForPage(pd.page);

            return (
              <div key={pd.page} data-page={pd.page} className="quran-page-marker relative">
                {/* Visual marker for continuous read separating pages */}
                {index > 0 && (
                  <div className="flex items-center gap-4 my-8 opacity-30 select-none">
                    <div className="flex-1 h-px bg-current" />
                    <span className="text-[10px] font-mono">Page {pd.page}</span>
                    <div className="flex-1 h-px bg-current" />
                  </div>
                )}

                {/* Surah header if page starts a new surah */}
                {isFirstInSurah && (
                  <div className="text-center py-5 mb-4 border-b border-white/[0.06]">
                    <p className="text-2xl font-arabic mb-1">{pbSurah.arabicName}</p>
                    <p className="text-sm opacity-50">{pbSurah.name} · {pbSurah.type} · {pbSurah.ayahs} Ayahs</p>
                    {pbSurah.number !== 1 && pbSurah.number !== 9 && (
                      <p className="text-lg font-arabic mt-3 opacity-70">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
                    )}
                  </div>
                )}

                {/* Ayahs */}
                <p className={`font-arabic text-right leading-loose tracking-wide text-${FONT_SIZES[fontSize].split("-")[1]} ${FONT_SIZES[fontSize]
                  } ${isDark ? "text-white/90" : "text-black/90"}`}
                  style={{ fontFamily: "'Amiri Quran', 'Noto Naskh Arabic', serif", direction: "rtl", lineHeight: "2.1" }}>
                  {pd.ayahs.map((a, i) => (
                    <span key={i}>
                      {a.text}
                      <span className="text-emerald-400 mx-1 text-base" style={{ fontFamily: "serif" }}>
                        {" "}﴿{toArabicNum(a.numberInSurah)}﴾{" "}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
            );
          })}

          {/* Bottom Loading Indicator */}
          {loadingNext && pagesLoaded.length > 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="flex items-center gap-2 pb-1">
        <button onClick={() => goTo(page - 1)} disabled={page <= 1}
          className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 font-semibold text-sm transition-colors">
          ← Prev
        </button>
        <button onClick={markRead}
          className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors">
          ✓ Mark Page {page} Read & Next
        </button>
        <button onClick={() => goTo(page + 1)} disabled={page >= 604}
          className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 font-semibold text-sm transition-colors">
          Next →
        </button>
      </div>

      {/* Bookmarks strip */}
      {(profile.quranBookmarks ?? []).length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          <span className="text-xs opacity-40 flex-shrink-0 self-center">Bookmarks:</span>
          {(profile.quranBookmarks ?? []).map((b) => (
            <button key={b} onClick={() => goTo(b)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${b === page ? "bg-amber-500/25 text-amber-300 border border-amber-500/40" : "bg-white/10 hover:bg-white/15"
                }`}>
              p.{b}
            </button>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-emerald-900/95 border border-emerald-500/40 text-sm text-white font-medium shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}
