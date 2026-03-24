import { useState } from "react";
import type { UserProfile, AppData, Madhab, CalcMethod, Mode } from "./types";
import type { User } from "@supabase/supabase-js";
import { pushProfile, isSupabaseConfigured } from "./supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATARS = ["🧕","👳","🧔","👤","⭐","🌙","☪️","📿","🕌","🌿","💎","🦁","🌸","🦋","🌺","🐉"];
const MADHABS: Madhab[] = ["Hanafi", "Shafi'i", "Maliki", "Hanbali"];
const CALC_METHODS: { id: CalcMethod; short: string; label: string }[] = [
  { id: 1,  short: "Karachi", label: "Univ. of Islamic Sciences, Karachi" },
  { id: 3,  short: "MWL",     label: "Muslim World League" },
  { id: 5,  short: "Egypt",   label: "Egyptian General Authority" },
  { id: 2,  short: "ISNA",    label: "ISNA (North America)" },
  { id: 15, short: "Gulf",    label: "Gulf Region" },
];
const REMINDER_OPTS = [
  { val: 0, label: "Off" }, { val: 5, label: "5 min" },
  { val: 15, label: "15 min" }, { val: 30, label: "30 min" }, { val: 45, label: "45 min" },
];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const PRAYERS_LIST = ["fajr","dhuhr","asr","maghrib","isha"];

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "", kunyah: "", avatar: "🧕", gender: "unspecified", niyyah: "",
  madhab: "Hanafi", calcMethod: 1,
  homeCity: "Mumbai, India", homeLat: 19.076, homeLng: 72.8777,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  ramadanStartDate: "", iftarReminderMins: 15, suhoorReminderMins: 30,
  quranGoal: 1, dhikrTarget: 33, quranLastPage: 1, quranBookmarks: [],
  showTransliteration: false, duaFavourites: [], joinedAt: new Date().toISOString(),
};

const PROFILE_KEY = "deenhabit_profile";
export function loadProfile(): UserProfile {
  try { const r = localStorage.getItem(PROFILE_KEY); if (r) return { ...DEFAULT_PROFILE, ...JSON.parse(r) }; } catch {}
  return { ...DEFAULT_PROFILE };
}
export function saveProfile(p: UserProfile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStrTZ(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function getWeekDatesTZ(tz: string): string[] {
  const today = new Date();
  const todayStr = toDateStrTZ(today, tz);
  const todayDate = new Date(todayStr + "T00:00:00");
  const dow = todayDate.getDay();
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStrTZ(d, tz);
  });
}

function getMonthDatesTZ(tz: string): string[] {
  const today = new Date();
  const todayStr = toDateStrTZ(today, tz);
  const [y, m] = todayStr.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    return toDateStrTZ(d, tz);
  });
}

function calcDayScore(d: any, mode: Mode): number {
  if (!d) return 0;
  let score = 0, total = 10;
  for (const p of PRAYERS_LIST) { if (d.prayers?.[p]?.fard) score++; if (d.prayers?.[p]?.sunnah) score++; }
  if (d.morningAdhkar) score++; if (d.eveningAdhkar) score++; if (d.sadaqah) score++;
  if (d.quranPages >= (d.quranGoal || 1) && (d.quranGoal || 1) > 0) score++;
  if (mode === "ramadan") { total += 3; if (d.fasting) score++; if (d.taraweeh) score++; if (d.tahajjud) score++; }
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function ScoreCell({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : pct > 0 ? "bg-red-400" : "bg-white/10";
  return <div className={`w-full aspect-square rounded-md ${color} transition-all`} style={{ opacity: pct > 0 ? 0.3 + (pct / 100) * 0.7 : 1 }} title={`${pct}%`} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: string; children: string }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-widest opacity-40 flex items-center gap-2 px-1 mb-2"><span>{icon}</span>{children}</h3>;
}

function FormCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden divide-y divide-white/[0.06]">{children}</div>;
}

function Row({ icon, iconBg = "bg-white/10", label, value, valueColor = "opacity-60", onClick, children }: {
  icon: string; iconBg?: string; label: string; value?: string; valueColor?: string; onClick?: () => void; children?: React.ReactNode;
}) {
  return (
    <div>
      <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${onClick ? "hover:bg-white/5 active:bg-white/10" : "cursor-default"}`}>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${iconBg}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {value && <p className={`text-xs truncate mt-0.5 ${valueColor}`}>{value}</p>}
        </div>
        {onClick && <span className="text-white/20 text-sm flex-shrink-0">›</span>}
      </button>
      {children}
    </div>
  );
}

function InlineEdit({ open, value, placeholder, type = "text", multiline = false, onChange, onSave }: {
  open: boolean; value: string; placeholder: string; type?: string; multiline?: boolean; onChange: (v: string) => void; onSave: () => void;
}) {
  if (!open) return null;
  return (
    <div className="px-4 pb-3 pt-1 flex gap-2 items-start bg-white/[0.03] border-t border-white/[0.06]">
      {multiline
        ? <textarea autoFocus rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-white/[0.06] border border-white/15 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm outline-none resize-none placeholder-white/25 transition-colors" />
        : <input autoFocus type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            style={type === "date" ? { colorScheme: "dark" } : undefined}
            className="flex-1 bg-white/[0.06] border border-white/15 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm outline-none placeholder-white/25 transition-colors" />
      }
      <button onClick={onSave} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors flex-shrink-0 mt-0.5">Save</button>
    </div>
  );
}

function SegPicker<T extends string | number>({ open, options, value, onSelect }: {
  open: boolean; options: { val: T; label: string }[]; value: T; onSelect: (v: T) => void;
}) {
  if (!open) return null;
  return (
    <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2 bg-white/[0.03] border-t border-white/[0.06]">
      {options.map((o) => (
        <button key={String(o.val)} onClick={() => onSelect(o.val)}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${value === o.val ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-white/5 border-white/10 opacity-60 hover:opacity-100"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileTab({ profile, onProfileChange, user, syncStatus, onSignOut, onShowAuth, appData, mode, isDark }: {
  profile: UserProfile; onProfileChange: (p: UserProfile) => void;
  user: User | null; syncStatus: string; onSignOut: () => void; onShowAuth: () => void;
  appData: AppData; mode: Mode; isDark: boolean;
}) {
  const [section, setSection] = useState<"stats" | "settings">("stats");
  const [open, setOpen] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tz = profile.timezone || DEFAULT_PROFILE.timezone;
  const today = toDateStrTZ(new Date(), tz);
  const weekDates = getWeekDatesTZ(tz);
  const monthDates = getMonthDatesTZ(tz);

  function toggle(key: string, init = "") {
    if (open === key) { setOpen(null); return; }
    setTempVal(init); setOpen(key); setShowAvatarPicker(false);
  }
  function patch(u: Partial<UserProfile>) { onProfileChange({ ...profile, ...u }); }
  function saveText(field: keyof UserProfile) { patch({ [field]: tempVal } as any); setOpen(null); }
  function selectSeg<T>(field: keyof UserProfile, val: T) { patch({ [field]: val } as any); setOpen(null); }

  // ── Stats ──
  const allDays = Object.values(appData.days);
  const totalPages = allDays.reduce((a: number, d: any) => a + (d.quranPages || 0), 0);
  const trackedDays = allDays.length;
  const streak = (() => {
    let s = 0; const d = new Date();
    while (true) {
      const key = toDateStrTZ(d, tz);
      const day = appData.days[key] as any;
      if (day && PRAYERS_LIST.some((p) => day.prayers?.[p]?.fard)) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();

  const weekScores = weekDates.map((d) => calcDayScore(appData.days[d] as any, mode));
  const monthScores = monthDates.map((d) => calcDayScore(appData.days[d] as any, mode));
  const avgScore = weekScores.length > 0 ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.filter((s) => s > 0).length) || 0 : 0;

  const joinedDate = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Today";

  async function handleSaveToCloud() {
    if (!user) return;
    setSaving(true);
    const ok = await pushProfile(profile, user.id);
    setSaving(false);
    setSaveMsg(ok ? "Saved ✓" : "Failed — check connection");
    setTimeout(() => setSaveMsg(null), 3000);
  }

  return (
    <div className="space-y-5">

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <button onClick={() => { setShowAvatarPicker((v) => !v); setOpen(null); }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-3xl hover:border-emerald-400/60 transition-all active:scale-95">
              {profile.avatar}
            </button>
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0f0d] flex items-center justify-center text-[9px]">✏️</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-lg font-bold leading-tight truncate">{profile.displayName || <span className="opacity-30 italic text-base">Your name</span>}</p>
            {profile.kunyah && <p className="text-sm text-emerald-400 italic mt-0.5">{profile.kunyah}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">🕌 {profile.madhab}</span>
              {profile.homeCity && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">📍 {profile.homeCity.split(",")[0]}</span>}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">🕐 {tz.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        {/* Avatar picker */}
        {showAvatarPicker && (
          <div className="grid grid-cols-8 gap-2 mb-4 p-3 rounded-xl bg-black/20 border border-white/10">
            {AVATARS.map((e) => (
              <button key={e} onClick={() => { patch({ avatar: e }); setShowAvatarPicker(false); }}
                className={`text-xl aspect-square rounded-lg flex items-center justify-center transition-all ${profile.avatar === e ? "bg-emerald-500/25 border border-emerald-500/50 scale-110" : "hover:bg-white/10"}`}>
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Niyyah */}
        <button onClick={() => toggle("niyyah", profile.niyyah)}
          className="w-full text-left p-3 rounded-xl bg-black/20 border border-white/10 hover:border-white/20 transition-colors">
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-40 mb-1">Daily Intention · نية</p>
          <p className={`text-sm leading-relaxed ${profile.niyyah ? "opacity-80 italic" : "opacity-30 italic"}`}>
            {profile.niyyah || "Tap to set your daily intention…"}
          </p>
        </button>
        {open === "niyyah" && (
          <div className="mt-2 flex gap-2">
            <textarea autoFocus rows={3} value={tempVal} placeholder="Write your niyyah…" onChange={(e) => setTempVal(e.target.value)}
              className="flex-1 bg-white/[0.06] border border-white/15 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm outline-none resize-none placeholder-white/25" />
            <button onClick={() => saveText("niyyah")} className="px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold">Save</button>
          </div>
        )}
      </div>

      {/* ── Section toggle ── */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
        {(["stats", "settings"] as const).map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${section === s ? "bg-emerald-500 text-white" : "opacity-50 hover:opacity-80"}`}>
            {s === "stats" ? "📊 Stats" : "⚙️ Settings"}
          </button>
        ))}
      </div>

      {/* ══ STATS SECTION ══ */}
      {section === "stats" && (
        <div className="space-y-5">
          {/* Quick stats */}
          <div>
            <SectionLabel icon="📈">Overview</SectionLabel>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { emoji: "🔥", val: streak, label: "Day Streak", color: "text-orange-400" },
                { emoji: "📖", val: totalPages, label: "Pages Read", color: "text-indigo-400" },
                { emoji: "📅", val: trackedDays, label: "Days Tracked", color: "text-emerald-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-xl mb-1">{s.emoji}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] opacity-40 leading-tight mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[11px] opacity-30 mt-2">Tracking since {joinedDate}</p>
          </div>

          {/* Weekly view */}
          <div>
            <SectionLabel icon="📅">This Week</SectionLabel>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {DAY_LABELS.map((l) => <p key={l} className="text-center text-[10px] opacity-40 font-medium">{l}</p>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekScores.map((pct, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <ScoreCell pct={pct} />
                    <p className="text-[9px] opacity-40">{weekDates[i]?.slice(8)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="opacity-50">Weekly average</span>
                <span className={`font-bold ${avgScore >= 80 ? "text-emerald-400" : avgScore >= 50 ? "text-amber-400" : "text-red-400"}`}>{isNaN(avgScore) ? 0 : avgScore}%</span>
              </div>
            </div>
          </div>

          {/* Monthly view */}
          <div>
            <SectionLabel icon="🗓️">This Month</SectionLabel>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-7 gap-1">
                {monthScores.map((pct, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <ScoreCell pct={pct} />
                    <p className="text-[8px] opacity-30">{i + 1}</p>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex gap-3 mt-3 pt-3 border-t border-white/[0.06] justify-center">
                {[["bg-emerald-500","80%+"],["bg-amber-400","50%+"],["bg-red-400","<50%"],["bg-white/10","—"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                    <span className="text-[10px] opacity-50">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prayer breakdown */}
          <div>
            <SectionLabel icon="🕌">Prayer Consistency (This Week)</SectionLabel>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              {PRAYERS_LIST.map((pid) => {
                const done = weekDates.filter((d) => (appData.days[d] as any)?.prayers?.[pid]?.fard).length;
                const pct = Math.round((done / 7) * 100);
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <span className="text-xs w-14 opacity-60 capitalize">{pid}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs w-8 text-right font-mono opacity-60">{done}/7</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ SETTINGS SECTION ══ */}
      {section === "settings" && (
        <div className="space-y-5">

          {/* Personal Info */}
          <div>
            <SectionLabel icon="👤">Personal Info</SectionLabel>
            <FormCard>
              <Row icon="✍️" iconBg="bg-emerald-500/15" label="Full Name"
                value={profile.displayName || "Not set"} valueColor="text-emerald-400"
                onClick={() => toggle("displayName", profile.displayName)}>
                <InlineEdit open={open === "displayName"} value={tempVal} placeholder="Your full name" onChange={setTempVal} onSave={() => saveText("displayName")} />
              </Row>
              <Row icon="🌿" iconBg="bg-emerald-500/15" label="Kunyah"
                value={profile.kunyah || "Not set"} valueColor="text-emerald-400"
                onClick={() => toggle("kunyah", profile.kunyah)}>
                <InlineEdit open={open === "kunyah"} value={tempVal} placeholder="e.g. Abu Abdullah, Umm Yusuf" onChange={setTempVal} onSave={() => saveText("kunyah")} />
              </Row>
              <Row icon="⚧" label="Gender"
                value={profile.gender === "male" ? "Male" : profile.gender === "female" ? "Female" : "Prefer not to say"}
                onClick={() => toggle("gender")}>
                <SegPicker open={open === "gender"}
                  options={[{val:"male" as const,label:"Male"},{val:"female" as const,label:"Female"},{val:"unspecified" as const,label:"Prefer not to say"}]}
                  value={profile.gender} onSelect={(v) => selectSeg("gender", v)} />
              </Row>
            </FormCard>
          </div>

          {/* Prayer Preferences */}
          <div>
            <SectionLabel icon="🕌">Prayer Preferences</SectionLabel>
            <FormCard>
              <Row icon="📚" iconBg="bg-emerald-500/15" label="Madhab"
                value={profile.madhab} valueColor="text-emerald-400" onClick={() => toggle("madhab")}>
                <SegPicker open={open === "madhab"} options={MADHABS.map((m) => ({val:m,label:m}))} value={profile.madhab} onSelect={(v) => selectSeg("madhab", v)} />
              </Row>
              <Row icon="🧮" iconBg="bg-indigo-500/15" label="Calculation Method"
                value={CALC_METHODS.find((c) => c.id === profile.calcMethod)?.label ?? ""}
                onClick={() => toggle("calcMethod")}>
                <SegPicker open={open === "calcMethod"} options={CALC_METHODS.map((c) => ({val:c.id,label:c.short}))} value={profile.calcMethod} onSelect={(v) => selectSeg("calcMethod", v)} />
              </Row>
              <Row icon="📍" iconBg="bg-amber-500/15" label="Home City"
                value={profile.homeCity || "Not set"} valueColor="text-amber-400"
                onClick={() => toggle("homeCity", profile.homeCity)}>
                <InlineEdit open={open === "homeCity"} value={tempVal} placeholder="e.g. Mumbai, Delhi, London" onChange={setTempVal} onSave={() => saveText("homeCity")} />
              </Row>
              <Row icon="🕐" iconBg="bg-indigo-500/15" label="Timezone"
                value={profile.timezone || DEFAULT_PROFILE.timezone} valueColor="text-indigo-400"
                onClick={() => toggle("timezone", profile.timezone || DEFAULT_PROFILE.timezone)}>
                <InlineEdit open={open === "timezone"} value={tempVal} placeholder="e.g. Asia/Kolkata" onChange={setTempVal}
                  onSave={() => {
                    try { new Intl.DateTimeFormat("en", { timeZone: tempVal }); saveText("timezone"); }
                    catch { alert("Invalid timezone. Use IANA format e.g. Asia/Kolkata"); }
                  }} />
                {open === "timezone" && <p className="px-4 pb-2 text-[11px] opacity-40">Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>}
              </Row>
            </FormCard>
          </div>

          {/* Ramadan */}
          <div>
            <SectionLabel icon="🌙">Ramadan Settings</SectionLabel>
            <FormCard>
              <Row icon="📅" iconBg="bg-amber-500/15" label="Ramadan Start Date"
                value={profile.ramadanStartDate ? new Date(profile.ramadanStartDate + "T00:00:00").toLocaleDateString("en-GB", {day:"numeric",month:"long",year:"numeric"}) : "Not set"}
                valueColor="text-amber-400" onClick={() => toggle("ramadanStartDate", profile.ramadanStartDate)}>
                <InlineEdit open={open === "ramadanStartDate"} value={tempVal} placeholder="" type="date" onChange={setTempVal} onSave={() => saveText("ramadanStartDate")} />
              </Row>
              <Row icon="🔔" iconBg="bg-amber-500/15" label="Iftar Reminder"
                value={`${REMINDER_OPTS.find((r) => r.val === profile.iftarReminderMins)?.label ?? "15 min"} before Maghrib`}
                valueColor="text-amber-400" onClick={() => toggle("iftarReminderMins")}>
                <SegPicker open={open === "iftarReminderMins"} options={REMINDER_OPTS.map((r)=>({val:r.val,label:r.label}))} value={profile.iftarReminderMins} onSelect={(v) => selectSeg("iftarReminderMins", v)} />
              </Row>
              <Row icon="⏰" label="Suhoor Reminder"
                value={`${REMINDER_OPTS.find((r) => r.val === profile.suhoorReminderMins)?.label ?? "30 min"} before Fajr`}
                onClick={() => toggle("suhoorReminderMins")}>
                <SegPicker open={open === "suhoorReminderMins"} options={REMINDER_OPTS.map((r)=>({val:r.val,label:r.label}))} value={profile.suhoorReminderMins} onSelect={(v) => selectSeg("suhoorReminderMins", v)} />
              </Row>
            </FormCard>
          </div>

          {/* Goals */}
          <div>
            <SectionLabel icon="🎯">Habit Goals</SectionLabel>
            <FormCard>
              <Row icon="📖" iconBg="bg-indigo-500/15" label="Daily Quran Goal"
                value={`${profile.quranGoal} page${profile.quranGoal !== 1 ? "s" : ""} / day`} valueColor="text-indigo-400"
                onClick={() => toggle("quranGoal", String(profile.quranGoal))}>
                <InlineEdit open={open === "quranGoal"} value={tempVal} placeholder="Pages per day" type="number" onChange={setTempVal}
                  onSave={() => { patch({ quranGoal: Math.max(1, parseInt(tempVal) || 1) }); setOpen(null); }} />
              </Row>
              <Row icon="📿" iconBg="bg-emerald-500/15" label="Dhikr Target"
                value={`${profile.dhikrTarget} per dhikr`} valueColor="text-emerald-400"
                onClick={() => toggle("dhikrTarget", String(profile.dhikrTarget))}>
                <InlineEdit open={open === "dhikrTarget"} value={tempVal} placeholder="Count per dhikr" type="number" onChange={setTempVal}
                  onSave={() => { patch({ dhikrTarget: Math.max(1, parseInt(tempVal) || 33) }); setOpen(null); }} />
              </Row>
            </FormCard>
          </div>

          {/* Account */}
          <div>
            <SectionLabel icon="⚙️">Account</SectionLabel>
            <FormCard>
              {isSupabaseConfigured ? (
                user ? (
                  <>
                    <Row icon="☁️" iconBg="bg-emerald-500/15" label="Cloud Sync"
                      value={syncStatus === "syncing" ? "Syncing…" : syncStatus === "synced" ? "Up to date" : syncStatus === "error" ? "Sync error" : user.email ?? ""}
                      valueColor={syncStatus === "error" ? "text-red-400" : "text-emerald-400"} />
                    <div className="px-4 py-3 border-t border-white/[0.06]">
                      <button onClick={handleSaveToCloud} disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                        {saving ? "Saving…" : "💾 Save profile to cloud"}
                      </button>
                      {saveMsg && <p className={`text-center text-xs mt-2 ${saveMsg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{saveMsg}</p>}
                    </div>
                    <button onClick={onSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-500/5 transition-colors border-t border-white/[0.06]">
                      <span className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">🚪</span>
                      <div><p className="text-sm font-medium text-red-400">Sign Out</p><p className="text-xs opacity-40 truncate">{user.email}</p></div>
                    </button>
                  </>
                ) : (
                  <button onClick={onShowAuth}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-emerald-500/5 transition-colors">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">☁️</span>
                    <div><p className="text-sm font-medium text-emerald-400">Sign in to sync</p><p className="text-xs opacity-40">Save across devices</p></div>
                    <span className="text-white/20 text-sm ml-auto">›</span>
                  </button>
                )
              ) : (
                <Row icon="ℹ️" label="Cloud Sync" value="Configure Supabase to enable" />
              )}
            </FormCard>
          </div>

          {/* Danger Zone */}
          <div>
            <SectionLabel icon="⚠️">Danger Zone</SectionLabel>
            <FormCard>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-500/5 transition-colors">
                  <span className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">🗑️</span>
                  <div><p className="text-sm font-medium text-red-400">Delete All Data</p><p className="text-xs text-red-400/40">Cannot be undone</p></div>
                </button>
              ) : (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-sm text-red-400 font-medium">Delete all habit data and profile?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-bold">Yes, delete</button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-semibold">Cancel</button>
                  </div>
                </div>
              )}
            </FormCard>
          </div>

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
