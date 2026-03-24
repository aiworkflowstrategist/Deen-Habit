import { useState, useEffect, useCallback, useRef } from "react";
import {
  supabase, isSupabaseConfigured,
  signInWithGoogle, signInWithEmail, signUpWithEmail, signInMagicLink,
  signOut, pushToCloud, pullFromCloud, mergeAppData, pullProfile,
  type User,
} from "./supabase";
import ProfileTab, { DEFAULT_PROFILE, loadProfile, saveProfile } from "./ProfileTab";
import QuranTab from "./QuranTab";
import DuaTab from "./DuaTab";
import type { Mode, Tab, AppData, DayData, PrayerTimes, LocationInfo, UserProfile } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRAYERS = [
  { id: "fajr", name: "Fajr", arabic: "الفجر" },
  { id: "dhuhr", name: "Dhuhr", arabic: "الظهر" },
  { id: "asr", name: "Asr", arabic: "العصر" },
  { id: "maghrib", name: "Maghrib", arabic: "المغرب" },
  { id: "isha", name: "Isha", arabic: "العشاء" },
];

const DEFAULT_LOCATION: LocationInfo = { lat: 19.076, lng: 72.8777, city: "Mumbai", country: "India" };
const STORAGE_KEY = "deenhabit_v2";
const MODE_KEY = "deenhabit_mode";
const PT_CACHE_KEY = "deenhabit_ptcache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStrTZ(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

function toHijri(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(date);
  } catch { return ""; }
}

function fmt12(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr);
  const m = mStr?.padStart(2, "0") ?? "00";
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

function timeToMins(t: string): number {
  const [h, m] = t.replace(/\s*(AM|PM)/i, "").split(":").map(Number);
  return h * 60 + m;
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function loadData(): AppData {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (!r) return { days: {}, quranGoal: 1, dhikrTarget: 33 };
    const parsed = JSON.parse(r);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid app data");
    return {
      days: typeof parsed.days === "object" && parsed.days ? parsed.days : {},
      quranGoal: Number(parsed.quranGoal) || 1,
      dhikrTarget: Number(parsed.dhikrTarget) || 33,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { days: {}, quranGoal: 1, dhikrTarget: 33 };
  }
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota full or storage disabled
  }
}

function emptyDay(date: string, mode: Mode, quranGoal: number): DayData {
  const prayers: DayData["prayers"] = {};
  for (const p of PRAYERS) prayers[p.id] = { fard: false, sunnah: false };
  return {
    date, mode, prayers, quranPages: 0, quranGoal,
    morningAdhkar: false, eveningAdhkar: false,
    subhanAllah: 0, alhamdulillah: 0, allahuAkbar: 0,
    sadaqah: false, fasting: false, sahur: false, iftar: false,
    taraweeh: false, tahajjud: false,
  };
}

async function fetchPrayerTimes(lat: number, lng: number, dateStr: string, method: number): Promise<PrayerTimes | null> {
  try {
    const [y, mo, d] = dateStr.split("-");
    if (!y || !mo || !d) return null;
    const url = `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&method=${encodeURIComponent(String(method))}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.code !== 200 || !json.data?.timings) return null;
    const t = json.data.timings;
    return { Fajr: t.Fajr || "00:00", Sunrise: t.Sunrise || "00:00", Dhuhr: t.Dhuhr || "00:00", Asr: t.Asr || "00:00", Maghrib: t.Maghrib || "00:00", Isha: t.Isha || "00:00", date: dateStr, location: "" };
  } catch {
    return null;
  }
}

async function geocodeCity(query: string): Promise<LocationInfo | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    const p = data[0];
    return { lat: parseFloat(p.lat), lng: parseFloat(p.lon), city: p.display_name.split(",")[0].trim(), country: p.display_name.split(",").pop()?.trim() || "" };
  } catch { return null; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 64, stroke = 5, color }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="opacity-10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || "currentColor"} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

function Check({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-left ${checked ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-white/5 border border-white/10 hover:border-white/20"}`}>
      <span className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${checked ? "border-emerald-400 bg-emerald-400" : "border-white/30"}`}>
        {checked && <svg viewBox="0 0 12 10" className="w-3 h-3 fill-none stroke-white stroke-2"><polyline points="1,5 4,8 11,1" /></svg>}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {sub && <span className="block text-xs opacity-50">{sub}</span>}
      </span>
    </button>
  );
}

function Counter({ label, arabic, value, target, onChange }: { label: string; arabic: string; value: number; target: number; onChange: (v: number) => void }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="relative flex items-center justify-center">
        <ProgressRing pct={pct} size={72} stroke={4} color="#10b981" />
        <span className="absolute text-base font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-sm font-semibold font-arabic">{arabic}</p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-lg font-bold transition-colors">−</button>
        <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold transition-colors">+</button>
      </div>
      <p className="text-xs opacity-40">/{target}</p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme] = useState<"dark">("dark");
  const isDark = true;

  // ── Mode — persisted ──
  const [mode, setMode] = useState<Mode>(() => {
    const stored = localStorage.getItem(MODE_KEY) as Mode | null;
    if (stored === "ramadan" || stored === "annual") return stored;
    return "annual";
  });
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // localStorage disabled or quota exceeded
    }
  }, [mode]);

  // ── Tab ──
  const [tab, setTab] = useState<Tab>("today");

  // ── App data ──
  const [appData, setAppData] = useState<AppData>(loadData);
  useEffect(() => { saveData(appData); }, [appData]);

  // ── Profile ──
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  function handleProfileChange(p: UserProfile) {
    setProfile(p);
    saveProfile(p);
    if (p.quranGoal !== appData.quranGoal || p.dhikrTarget !== appData.dhikrTarget) {
      setAppData((prev) => ({ ...prev, quranGoal: p.quranGoal, dhikrTarget: p.dhikrTarget }));
    }
  }

  const tz = profile.timezone || DEFAULT_PROFILE.timezone;
  const today = toDateStrTZ(new Date(), tz);
  const hijri = toHijri(new Date());

  // ── Auth ──
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "magic">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setSyncStatus("syncing");
      const [remote, remoteProfile] = await Promise.all([pullFromCloud(user.id), pullProfile(user.id)]);
      if (remote) { const merged = mergeAppData(loadData(), remote); setAppData(merged); saveData(merged); }
      if (remoteProfile) { const p = { ...DEFAULT_PROFILE, ...remoteProfile }; setProfile(p); saveProfile(p); }
      const pushed = await pushToCloud(appData, user.id);
      setSyncStatus(pushed ? "synced" : "error");
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const ok = await pushToCloud(appData, user.id);
      setSyncStatus(ok ? "synced" : "error");
    }, 2000);
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [appData, user]);

  // ── SW update ──
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      swRegRef.current = reg;
      if (reg.waiting) setSwUpdateReady(true);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) setSwUpdateReady(true); });
      });
    });
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "SW_ACTIVATED") { } };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  // ── Prayer Times ──
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationInfo>(DEFAULT_LOCATION);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptError, setPtError] = useState<string | null>(null);
  const [showLocSearch, setShowLocSearch] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [countdown, setCountdown] = useState<{ label: string; secs: number } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PT_CACHE_KEY);
      if (raw) { const { pt, loc } = JSON.parse(raw); if (pt.date === today) { setPrayerTimes(pt); setLocation(loc); } }
    } catch { }
  }, []);

  const loadPrayerTimes = useCallback(async (loc: LocationInfo) => {
    setPtLoading(true); setPtError(null);
    const pt = await fetchPrayerTimes(loc.lat, loc.lng, today, profile.calcMethod || 1);
    setPtLoading(false);
    if (pt) {
      pt.location = `${loc.city}, ${loc.country}`;
      setPrayerTimes(pt);
      try { localStorage.setItem(PT_CACHE_KEY, JSON.stringify({ pt, loc })); } catch { }
    } else { setPtError("Could not load prayer times."); }
  }, [today, profile.calcMethod]);

  useEffect(() => {
    if (mode === "ramadan") {
      try {
        const raw = localStorage.getItem(PT_CACHE_KEY);
        if (raw) { const { pt } = JSON.parse(raw); if (pt.date === today) return; }
      } catch { }
      loadPrayerTimes(location);
    }
  }, [mode, location, today]);

  useEffect(() => {
    if (!prayerTimes || mode !== "ramadan") {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null); return;
    }
    const tick = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const fajrMins = timeToMins(prayerTimes.Fajr);
      const maghribMins = timeToMins(prayerTimes.Maghrib);
      let label = "", targetMins = 0;
      if (nowMins < fajrMins) { label = "Suhoor ends"; targetMins = fajrMins; }
      else if (nowMins < maghribMins) { label = "Iftar in"; targetMins = maghribMins; }
      else { label = "Fajr in"; targetMins = fajrMins + 24 * 60; }
      const secs = (targetMins - nowMins) * 60 - now.getSeconds();
      setCountdown({ label, secs: Math.max(0, secs) });
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [prayerTimes, mode]);

  function detectLocation() {
    if (!navigator.geolocation) { setPtError("Geolocation not supported."); return; }
    setPtLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || "Your Location";
        const newLoc: LocationInfo = { lat: pos.coords.latitude, lng: pos.coords.longitude, city, country: data.address?.country || "" };
        setLocation(newLoc); loadPrayerTimes(newLoc);
      } catch {
        const newLoc: LocationInfo = { lat: pos.coords.latitude, lng: pos.coords.longitude, city: "Your Location", country: "" };
        setLocation(newLoc); loadPrayerTimes(newLoc);
      }
    }, () => { setPtLoading(false); setPtError("Location access denied."); });
  }

  async function handleCitySearch() {
    if (!locQuery.trim()) return;
    setPtLoading(true);
    const result = await geocodeCity(locQuery.trim());
    setPtLoading(false);
    if (result) { setLocation(result); setShowLocSearch(false); setLocQuery(""); loadPrayerTimes(result); }
    else { setPtError(`Could not find "${locQuery}".`); }
  }

  // ── Day data ──
  const dayData: DayData = appData.days[today] || emptyDay(today, mode, appData.quranGoal);

  function updateDay(patch: Partial<DayData>) {
    setAppData((prev) => ({ ...prev, days: { ...prev.days, [today]: { ...dayData, ...patch } } }));
  }

  function togglePrayer(id: string, field: "fard" | "sunnah") {
    const p = dayData.prayers[id] || { fard: false, sunnah: false };
    updateDay({ prayers: { ...dayData.prayers, [id]: { ...p, [field]: !p[field] } } });
  }

  // ── Auth handlers ──
  const handleAuthSubmit = async () => {
    setAuthLoading(true); setAuthError(null); setAuthSuccess(null);
    try {
      if (authMode === "magic") {
        const { error } = await signInMagicLink(authEmail);
        if (error) throw error;
        setAuthSuccess("Magic link sent! Check your email.");
      } else if (authMode === "signup") {
        const { error } = await signUpWithEmail(authEmail, authPassword);
        if (error) throw error;
        setAuthSuccess("Account created! Check your email to confirm.");
      } else {
        const { error } = await signInWithEmail(authEmail, authPassword);
        if (error) throw error;
        setShowAuthModal(false);
      }
    } catch (err: any) { setAuthError(err.message || "Something went wrong."); }
    finally { setAuthLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true); setAuthError(null);
    try { const { error } = await signInWithGoogle(); if (error) throw error; }
    catch (err: any) { setAuthError(err.message || "Google sign-in failed."); setAuthLoading(false); }
  };

  const handleSignOut = async () => { await signOut(); setShowUserMenu(false); setSyncStatus("idle"); };

  // ── Pull to refresh ──
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const pullThreshold = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    pullStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (pullStartY.current === null || window.scrollY > 0) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStartY.current);
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, pullThreshold));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        // Check for service worker updates
        if (swRegRef.current) {
          await swRegRef.current.update();
        }
        // Force refresh prayer times if needed
        if (mode === "ramadan" && location) {
          loadPrayerTimes(location);
        }
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn("Pull refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    pullStartY.current = null;
  }, [pullDistance, isRefreshing, mode, location, loadPrayerTimes]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ── Score ──
  const todayScore = (() => {
    let score = 0, total = 14;
    for (const p of PRAYERS) { if (dayData.prayers[p.id]?.fard) score++; if (dayData.prayers[p.id]?.sunnah) score++; }
    if (dayData.morningAdhkar) score++; if (dayData.eveningAdhkar) score++; if (dayData.sadaqah) score++;
    if (dayData.quranPages >= dayData.quranGoal && dayData.quranGoal > 0) score++;
    if (mode === "ramadan") { total += 3; if (dayData.fasting) score++; if (dayData.taraweeh) score++; if (dayData.tahajjud) score++; }
    return Math.round((score / total) * 100);
  })();

  // ── Tabs ──
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "today", label: "Today", icon: "☀️" },
    { id: "dhikr", label: "Dhikr", icon: "📿" },
    { id: "quran", label: "Quran", icon: "📖" },
    { id: "dua", label: "Dua", icon: "🤲" },
    { id: "profile", label: "Profile", icon: profile.avatar || "👤" },
  ];

  const surface = "bg-white/5 border border-white/10";

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Pull to Refresh Indicator ── */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="fixed top-0 left-0 right-0 z-40 flex flex-col items-center justify-center bg-[#0a0f0d] border-b border-white/10"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "1rem"
          }}>
          <div className={`w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 flex items-center justify-center transition-transform ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${Math.min(pullDistance / pullThreshold * 360, 360)}deg)` }}>
            {!isRefreshing && <span className="text-emerald-400 text-sm">↓</span>}
          </div>
          <p className="text-xs text-emerald-400 mt-2 font-medium">
            {isRefreshing ? "Updating..." : pullDistance >= pullThreshold ? "Release to update" : "Pull to update"}
          </p>
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{
        transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
        transition: pullDistance === 0 && !isRefreshing ? "transform 0.3s ease-out" : "none"
      }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10 bg-[#0a0f0d]/80"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight"><span className="text-emerald-400">Deen</span>Habit</h1>
            <p className="text-xs opacity-40">{hijri}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <button onClick={() => setMode((m) => m === "annual" ? "ramadan" : "annual")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${mode === "ramadan"
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : "bg-white/5 border-white/10 opacity-50 hover:opacity-80"
                }`}>
              🌙 {mode === "ramadan" ? "Ramadan" : "Ramadan"}
            </button>

            {/* Sync indicator */}
            {user && <span className="text-sm">{syncStatus === "syncing" ? "🔄" : syncStatus === "synced" ? "☁️" : syncStatus === "error" ? "⚠️" : ""}</span>}

            {/* Auth */}
            {isSupabaseConfigured ? (
              user ? (
                <div className="relative">
                  <button onClick={() => setShowUserMenu((v) => !v)}
                    className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg hover:bg-emerald-500/30 transition-colors">
                    {profile.avatar || user.email?.[0]?.toUpperCase() || "U"}
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0" style={{ zIndex: 998 }} onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-11 w-56 rounded-2xl border border-white/10 bg-[#111a14] shadow-xl p-2" style={{ zIndex: 999 }}>
                        <p className="text-xs opacity-50 px-3 py-1 truncate">{user.email}</p>
                        <div className="my-1 border-t border-white/10" />
                        <button onClick={async (e) => { e.stopPropagation(); setSyncStatus("syncing"); const ok = await pushToCloud(appData, user.id); setSyncStatus(ok ? "synced" : "error"); setShowUserMenu(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 flex items-center gap-2">🔄 <span>Sync now</span></button>
                        <button onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2">🚪 <span>Sign out</span></button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  ☁️ Sign in
                </button>
              )
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-lg mx-auto px-4 py-5" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>

        {/* ── TODAY TAB ── */}
        {tab === "today" && (
          <div className="space-y-5">

            {/* Score ring */}
            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${surface}`}>
              <div className="relative flex items-center justify-center flex-shrink-0">
                <ProgressRing pct={todayScore} size={72} stroke={5} color="#10b981" />
                <span className="absolute text-lg font-bold">{todayScore}%</span>
              </div>
              <div>
                <p className="font-bold text-base">{today}</p>
                <p className="text-xs opacity-50">
                  {todayScore >= 80 ? "Excellent day, masha'Allah!" : todayScore >= 50 ? "Good progress, keep going" : "Every habit counts, bismillah"}
                </p>
              </div>
            </div>

            {/* Prayer Times — Ramadan mode */}
            {mode === "ramadan" && (
              <div className={`rounded-2xl border p-4 space-y-3 ${surface}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold opacity-70">🕌 Prayer Times</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-50">{location.city}</span>
                    <button onClick={detectLocation} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">📡</button>
                    <button onClick={() => setShowLocSearch((v) => !v)} className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/10">🔍</button>
                  </div>
                </div>
                {showLocSearch && (
                  <div className="flex gap-2">
                    <input value={locQuery} onChange={(e) => setLocQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
                      placeholder="Search city…" className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500/50 placeholder-white/25" />
                    <button onClick={handleCitySearch} className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold">Go</button>
                  </div>
                )}
                {ptLoading && <div className="flex justify-center py-2"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>}
                {ptError && <p className="text-xs text-red-400 text-center">{ptError}</p>}
                {prayerTimes && !ptLoading && (
                  <>
                    {countdown && (
                      <div className="text-center py-2">
                        <p className="text-xs opacity-50 mb-1">{countdown.label}</p>
                        <p className="text-3xl font-bold text-emerald-400 font-mono">{formatCountdown(countdown.secs)}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Suhoor ends", time: prayerTimes.Fajr, color: "text-indigo-400" },
                        { label: "Sunrise", time: prayerTimes.Sunrise, color: "text-amber-400" },
                        { label: "Iftar", time: prayerTimes.Maghrib, color: "text-emerald-400" },
                      ].map((t) => (
                        <div key={t.label} className="text-center p-2 rounded-xl bg-white/5">
                          <p className="text-[10px] opacity-50">{t.label}</p>
                          <p className={`text-sm font-bold mt-0.5 ${t.color}`}>{fmt12(t.time)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const).map((p) => (
                        <div key={p} className="text-center">
                          <p className="text-[9px] opacity-40">{p}</p>
                          <p className="text-[11px] font-medium">{fmt12(prayerTimes[p])}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Prayers */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">🕌 Prayers</h3>
              {PRAYERS.map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 flex items-center gap-3 ${surface}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs font-arabic opacity-50">{p.arabic}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => togglePrayer(p.id, "fard")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dayData.prayers[p.id]?.fard ? "bg-emerald-500 text-white" : "bg-white/10 opacity-60"}`}>
                      Fard
                    </button>
                    <button onClick={() => togglePrayer(p.id, "sunnah")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dayData.prayers[p.id]?.sunnah ? "bg-indigo-500 text-white" : "bg-white/10 opacity-60"}`}>
                      Sunnah
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quran */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">📖 Quran</h3>
              <div className={`rounded-xl border p-4 ${surface}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Pages read today</p>
                    <p className="text-xs opacity-50">Goal: {dayData.quranGoal} pages</p>
                  </div>
                  <div className="relative">
                    <ProgressRing pct={Math.min(100, (dayData.quranPages / (dayData.quranGoal || 1)) * 100)} size={48} stroke={4} color="#818cf8" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{dayData.quranPages}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateDay({ quranPages: Math.max(0, dayData.quranPages - 1) })} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-lg font-bold transition-colors">−</button>
                  <button onClick={() => { updateDay({ quranPages: dayData.quranPages + 1 }); }} className="flex-1 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/30 transition-colors">+ 1 Page</button>
                  <button onClick={() => setTab("quran")} className="px-3 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors">Read 📖</button>
                </div>
              </div>
            </div>

            {/* Adhkar */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">📿 Adhkar</h3>
              <Check checked={dayData.morningAdhkar} onChange={(v) => updateDay({ morningAdhkar: v })} label="Morning Adhkar" sub="After Fajr" />
              <Check checked={dayData.eveningAdhkar} onChange={(v) => updateDay({ eveningAdhkar: v })} label="Evening Adhkar" sub="After Asr" />
            </div>

            {/* Daily habits */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">✨ Daily</h3>
              <Check checked={dayData.sadaqah} onChange={(v) => updateDay({ sadaqah: v })} label="Sadaqah" sub="Give in charity today" />
            </div>

            {/* Ramadan extras */}
            {mode === "ramadan" && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">🌙 Ramadan</h3>
                <Check checked={dayData.fasting} onChange={(v) => updateDay({ fasting: v })} label="Fasting" sub="Sawm today" />
                <Check checked={dayData.sahur} onChange={(v) => updateDay({ sahur: v })} label="Suhoor" sub="Pre-dawn meal" />
                <Check checked={dayData.iftar} onChange={(v) => updateDay({ iftar: v })} label="Iftar" sub="Break fast at Maghrib" />
                <Check checked={dayData.taraweeh} onChange={(v) => updateDay({ taraweeh: v })} label="Taraweeh" sub="Night prayer" />
                <Check checked={dayData.tahajjud} onChange={(v) => updateDay({ tahajjud: v })} label="Tahajjud" sub="Last third of the night" />
              </div>
            )}
          </div>
        )}

        {/* ── DHIKR TAB ── */}
        {tab === "dhikr" && (
          <div className="space-y-4">
            <div className={`rounded-2xl border p-4 text-center ${surface}`}>
              <p className="text-sm font-semibold opacity-60 mb-1">Dhikr Counter</p>
              <p className="text-xs opacity-40">Tap + to count, reset with −</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Counter label="SubhanAllah" arabic="سبحان الله" value={dayData.subhanAllah} target={profile.dhikrTarget || 33} onChange={(v) => updateDay({ subhanAllah: v })} />
              <Counter label="Alhamdulillah" arabic="الحمد لله" value={dayData.alhamdulillah} target={profile.dhikrTarget || 33} onChange={(v) => updateDay({ alhamdulillah: v })} />
              <Counter label="Allahu Akbar" arabic="الله أكبر" value={dayData.allahuAkbar} target={profile.dhikrTarget || 33} onChange={(v) => updateDay({ allahuAkbar: v })} />
            </div>
            <button onClick={() => updateDay({ subhanAllah: 0, alhamdulillah: 0, allahuAkbar: 0 })}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm opacity-60 hover:opacity-80 transition-opacity">
              Reset all counters
            </button>
          </div>
        )}

        {/* ── QURAN TAB ── */}
        {tab === "quran" && (
          <QuranTab
            profile={profile}
            onProfileChange={handleProfileChange}
            dayData={dayData}
            onMarkPage={() => updateDay({ quranPages: dayData.quranPages + 1 })}
            isDark={isDark}
          />
        )}

        {/* ── DUA TAB ── */}
        {tab === "dua" && (
          <DuaTab profile={profile} onProfileChange={handleProfileChange} isDark={isDark} />
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <ProfileTab
            profile={profile}
            onProfileChange={handleProfileChange}
            user={user}
            syncStatus={syncStatus}
            onSignOut={handleSignOut}
            onShowAuth={() => setShowAuthModal(true)}
            appData={appData}
            mode={mode}
            isDark={isDark}
          />
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0a0f0d]/92 backdrop-blur-xl z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-lg mx-auto flex">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all ${tab === t.id ? "text-emerald-400" : "text-white/40 hover:text-white/60"}`}>
              <span className="text-lg">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
              {tab === t.id && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── SW Update Toast ── */}
      {swUpdateReady && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
          style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl">
            <span className="text-xl">✨</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Update available</p>
              <p className="text-xs text-emerald-300/70">A new version of DeenHabit is ready</p>
            </div>
            <button onClick={() => { swRegRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" }); window.location.reload(); }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex-shrink-0">Reload</button>
            <button onClick={() => setSwUpdateReady(false)} className="text-white/40 hover:text-white/70 text-xl leading-none flex-shrink-0">×</button>
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAuthModal(false); setAuthError(null); setAuthSuccess(null); } }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl z-10 bg-[#0e1a12]">
            <button onClick={() => { setShowAuthModal(false); setAuthError(null); setAuthSuccess(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl">×</button>
            <div className="text-center mb-6">
              <p className="text-3xl mb-2">🌙</p>
              <h2 className="text-xl font-bold">{authMode === "signup" ? "Create account" : authMode === "magic" ? "Magic link" : "Welcome back"}</h2>
              <p className="text-xs opacity-50 mt-1">Sign in to sync your habits across devices</p>
            </div>
            {authMode !== "magic" && (
              <>
                <button onClick={handleGoogleSignIn} disabled={authLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 font-semibold text-sm transition-all mb-4 disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-white/10" /><span className="text-xs opacity-40">or</span><div className="flex-1 h-px bg-white/10" /></div>
              </>
            )}
            <div className="space-y-3">
              <input type="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !authLoading && handleAuthSubmit()}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 text-sm outline-none placeholder-white/30" />
              {authMode !== "magic" && (
                <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !authLoading && handleAuthSubmit()}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:border-emerald-500/50 text-sm outline-none placeholder-white/30" />
              )}
              {authError && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">{authSuccess}</p>}
              <button onClick={handleAuthSubmit} disabled={authLoading || !authEmail}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                {authLoading ? "Please wait…" : authMode === "magic" ? "Send magic link" : authMode === "signup" ? "Create account" : "Sign in"}
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 mt-4 text-xs opacity-60">
              {authMode === "signin" && (<>
                <button onClick={() => { setAuthMode("signup"); setAuthError(null); setAuthSuccess(null); }} className="hover:opacity-100 underline">Don't have an account? Sign up</button>
                <button onClick={() => { setAuthMode("magic"); setAuthError(null); setAuthSuccess(null); }} className="hover:opacity-100 underline">Sign in with magic link</button>
              </>)}
              {authMode === "signup" && <button onClick={() => { setAuthMode("signin"); setAuthError(null); setAuthSuccess(null); }} className="hover:opacity-100 underline">Already have an account? Sign in</button>}
              {authMode === "magic" && <button onClick={() => { setAuthMode("signin"); setAuthError(null); setAuthSuccess(null); }} className="hover:opacity-100 underline">Sign in with password instead</button>}
            </div>
            <p className="text-center text-xs opacity-30 mt-4">Data is always saved locally — signing in enables sync.</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
