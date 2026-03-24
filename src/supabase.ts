import { createClient, type User, type Session } from "@supabase/supabase-js";
import type { AppData, UserProfile } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

export const isSupabaseConfigured = !!supabase;

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
}
export async function signInWithEmail(e: string, p: string) {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signInWithPassword({ email: e, password: p });
}
export async function signUpWithEmail(e: string, p: string) {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signUp({ email: e, password: p, options: { emailRedirectTo: window.location.origin } });
}
export async function signInMagicLink(e: string) {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
}
export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}
export type { User, Session };

export async function pushToCloud(data: AppData, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("habit_data").upsert(
      { user_id: userId, payload: data, updated_at: new Date().toISOString() }, { onConflict: "user_id" }
    );
    return !error;
  } catch { return false; }
}

export async function pullFromCloud(userId: string): Promise<AppData | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("habit_data").select("payload").eq("user_id", userId).single();
    if (error || !data) return null;
    return data.payload as AppData;
  } catch { return null; }
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const mergedDays = { ...remote.days };
  for (const [date, localDay] of Object.entries(local.days)) {
    const remoteDay = remote.days[date];
    if (!remoteDay) { mergedDays[date] = localDay; continue; }
    const ls = Object.values(localDay.prayers).filter((p) => p.fard).length + (localDay.morningAdhkar ? 1 : 0);
    const rs = Object.values(remoteDay.prayers).filter((p) => p.fard).length + (remoteDay.morningAdhkar ? 1 : 0);
    mergedDays[date] = ls >= rs ? localDay : remoteDay;
  }
  return { days: mergedDays, quranGoal: local.quranGoal, dhikrTarget: local.dhikrTarget };
}

export async function pushProfile(profile: UserProfile, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("profiles").upsert(
      { user_id: userId, profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" }
    );
    return !error;
  } catch { return false; }
}

export async function pullProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("profiles").select("profile").eq("user_id", userId).single();
    if (error || !data) return null;
    return data.profile as UserProfile;
  } catch { return null; }
}
