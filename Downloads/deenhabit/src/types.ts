export type Mode = "annual" | "ramadan";
export type Theme = "light" | "dark";
export type Tab = "today" | "dhikr" | "quran" | "dua" | "profile";
export type Madhab = "Hanafi" | "Shafi'i" | "Maliki" | "Hanbali";
export type CalcMethod = 1 | 2 | 3 | 4 | 5 | 15;

export interface UserProfile {
  displayName: string;
  kunyah: string;
  avatar: string;
  gender: "male" | "female" | "unspecified";
  niyyah: string;
  madhab: Madhab;
  calcMethod: CalcMethod;
  homeCity: string;
  homeLat: number;
  homeLng: number;
  timezone: string;
  ramadanStartDate: string;
  iftarReminderMins: number;
  suhoorReminderMins: number;
  quranGoal: number;
  dhikrTarget: number;
  quranLastPage: number;
  quranBookmarks: number[];
  showTransliteration: boolean;
  joinedAt: string;
}

export interface DayData {
  date: string;
  mode: Mode;
  prayers: { [prayerId: string]: { fard: boolean; sunnah: boolean } };
  quranPages: number;
  quranGoal: number;
  morningAdhkar: boolean;
  eveningAdhkar: boolean;
  subhanAllah: number;
  alhamdulillah: number;
  allahuAkbar: number;
  sadaqah: boolean;
  fasting: boolean;
  sahur: boolean;
  iftar: boolean;
  taraweeh: boolean;
  tahajjud: boolean;
}

export interface AppData {
  days: { [date: string]: DayData };
  quranGoal: number;
  dhikrTarget: number;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  date: string;
  location: string;
}

export interface LocationInfo {
  lat: number;
  lng: number;
  city: string;
  country: string;
}
