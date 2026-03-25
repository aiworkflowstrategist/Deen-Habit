export interface SurahInfo {
  number: number;
  name: string;
  arabicName: string;
  ayahs: number;
  type: "Meccan" | "Medinan";
  startPage: number;
}

// Madani mushaf page ranges for each surah (604 pages total)
export const SURAHS: SurahInfo[] = [
  { number: 1,   name: "Al-Fatihah",       arabicName: "الفاتحة",       ayahs: 7,   type: "Meccan",  startPage: 1   },
  { number: 2,   name: "Al-Baqarah",       arabicName: "البقرة",        ayahs: 286, type: "Medinan", startPage: 2   },
  { number: 3,   name: "Ali 'Imran",       arabicName: "آل عمران",      ayahs: 200, type: "Medinan", startPage: 50  },
  { number: 4,   name: "An-Nisa",          arabicName: "النساء",        ayahs: 176, type: "Medinan", startPage: 77  },
  { number: 5,   name: "Al-Ma'idah",       arabicName: "المائدة",       ayahs: 120, type: "Medinan", startPage: 106 },
  { number: 6,   name: "Al-An'am",         arabicName: "الأنعام",       ayahs: 165, type: "Meccan",  startPage: 128 },
  { number: 7,   name: "Al-A'raf",         arabicName: "الأعراف",       ayahs: 206, type: "Meccan",  startPage: 151 },
  { number: 8,   name: "Al-Anfal",         arabicName: "الأنفال",       ayahs: 75,  type: "Medinan", startPage: 177 },
  { number: 9,   name: "At-Tawbah",        arabicName: "التوبة",        ayahs: 129, type: "Medinan", startPage: 187 },
  { number: 10,  name: "Yunus",            arabicName: "يونس",          ayahs: 109, type: "Meccan",  startPage: 208 },
  { number: 11,  name: "Hud",              arabicName: "هود",           ayahs: 123, type: "Meccan",  startPage: 221 },
  { number: 12,  name: "Yusuf",            arabicName: "يوسف",          ayahs: 111, type: "Meccan",  startPage: 235 },
  { number: 13,  name: "Ar-Ra'd",          arabicName: "الرعد",         ayahs: 43,  type: "Medinan", startPage: 249 },
  { number: 14,  name: "Ibrahim",          arabicName: "إبراهيم",       ayahs: 52,  type: "Meccan",  startPage: 255 },
  { number: 15,  name: "Al-Hijr",          arabicName: "الحجر",         ayahs: 99,  type: "Meccan",  startPage: 262 },
  { number: 16,  name: "An-Nahl",          arabicName: "النحل",         ayahs: 128, type: "Meccan",  startPage: 267 },
  { number: 17,  name: "Al-Isra",          arabicName: "الإسراء",       ayahs: 111, type: "Meccan",  startPage: 282 },
  { number: 18,  name: "Al-Kahf",          arabicName: "الكهف",         ayahs: 110, type: "Meccan",  startPage: 293 },
  { number: 19,  name: "Maryam",           arabicName: "مريم",          ayahs: 98,  type: "Meccan",  startPage: 305 },
  { number: 20,  name: "Ta-Ha",            arabicName: "طه",            ayahs: 135, type: "Meccan",  startPage: 312 },
  { number: 21,  name: "Al-Anbiya",        arabicName: "الأنبياء",      ayahs: 112, type: "Meccan",  startPage: 322 },
  { number: 22,  name: "Al-Hajj",          arabicName: "الحج",          ayahs: 78,  type: "Medinan", startPage: 332 },
  { number: 23,  name: "Al-Mu'minun",      arabicName: "المؤمنون",      ayahs: 118, type: "Meccan",  startPage: 342 },
  { number: 24,  name: "An-Nur",           arabicName: "النور",         ayahs: 64,  type: "Medinan", startPage: 350 },
  { number: 25,  name: "Al-Furqan",        arabicName: "الفرقان",       ayahs: 77,  type: "Meccan",  startPage: 359 },
  { number: 26,  name: "Ash-Shu'ara",      arabicName: "الشعراء",       ayahs: 227, type: "Meccan",  startPage: 367 },
  { number: 27,  name: "An-Naml",          arabicName: "النمل",         ayahs: 93,  type: "Meccan",  startPage: 377 },
  { number: 28,  name: "Al-Qasas",         arabicName: "القصص",         ayahs: 88,  type: "Meccan",  startPage: 385 },
  { number: 29,  name: "Al-'Ankabut",      arabicName: "العنكبوت",      ayahs: 69,  type: "Meccan",  startPage: 396 },
  { number: 30,  name: "Ar-Rum",           arabicName: "الروم",         ayahs: 60,  type: "Meccan",  startPage: 404 },
  { number: 31,  name: "Luqman",           arabicName: "لقمان",         ayahs: 34,  type: "Meccan",  startPage: 411 },
  { number: 32,  name: "As-Sajdah",        arabicName: "السجدة",        ayahs: 30,  type: "Meccan",  startPage: 415 },
  { number: 33,  name: "Al-Ahzab",         arabicName: "الأحزاب",       ayahs: 73,  type: "Medinan", startPage: 418 },
  { number: 34,  name: "Saba",             arabicName: "سبأ",           ayahs: 54,  type: "Meccan",  startPage: 428 },
  { number: 35,  name: "Fatir",            arabicName: "فاطر",          ayahs: 45,  type: "Meccan",  startPage: 434 },
  { number: 36,  name: "Ya-Sin",           arabicName: "يس",            ayahs: 83,  type: "Meccan",  startPage: 440 },
  { number: 37,  name: "As-Saffat",        arabicName: "الصافات",       ayahs: 182, type: "Meccan",  startPage: 446 },
  { number: 38,  name: "Sad",              arabicName: "ص",             ayahs: 88,  type: "Meccan",  startPage: 453 },
  { number: 39,  name: "Az-Zumar",         arabicName: "الزمر",         ayahs: 75,  type: "Meccan",  startPage: 458 },
  { number: 40,  name: "Ghafir",           arabicName: "غافر",          ayahs: 85,  type: "Meccan",  startPage: 467 },
  { number: 41,  name: "Fussilat",         arabicName: "فصلت",          ayahs: 54,  type: "Meccan",  startPage: 477 },
  { number: 42,  name: "Ash-Shura",        arabicName: "الشورى",        ayahs: 53,  type: "Meccan",  startPage: 483 },
  { number: 43,  name: "Az-Zukhruf",       arabicName: "الزخرف",        ayahs: 89,  type: "Meccan",  startPage: 489 },
  { number: 44,  name: "Ad-Dukhan",        arabicName: "الدخان",        ayahs: 59,  type: "Meccan",  startPage: 496 },
  { number: 45,  name: "Al-Jathiyah",      arabicName: "الجاثية",       ayahs: 37,  type: "Meccan",  startPage: 499 },
  { number: 46,  name: "Al-Ahqaf",         arabicName: "الأحقاف",       ayahs: 35,  type: "Meccan",  startPage: 502 },
  { number: 47,  name: "Muhammad",         arabicName: "محمد",          ayahs: 38,  type: "Medinan", startPage: 507 },
  { number: 48,  name: "Al-Fath",          arabicName: "الفتح",         ayahs: 29,  type: "Medinan", startPage: 511 },
  { number: 49,  name: "Al-Hujurat",       arabicName: "الحجرات",       ayahs: 18,  type: "Medinan", startPage: 515 },
  { number: 50,  name: "Qaf",              arabicName: "ق",             ayahs: 45,  type: "Meccan",  startPage: 518 },
  { number: 51,  name: "Adh-Dhariyat",     arabicName: "الذاريات",      ayahs: 60,  type: "Meccan",  startPage: 520 },
  { number: 52,  name: "At-Tur",           arabicName: "الطور",         ayahs: 49,  type: "Meccan",  startPage: 523 },
  { number: 53,  name: "An-Najm",          arabicName: "النجم",         ayahs: 62,  type: "Meccan",  startPage: 526 },
  { number: 54,  name: "Al-Qamar",         arabicName: "القمر",         ayahs: 55,  type: "Meccan",  startPage: 528 },
  { number: 55,  name: "Ar-Rahman",        arabicName: "الرحمن",        ayahs: 78,  type: "Medinan", startPage: 531 },
  { number: 56,  name: "Al-Waqi'ah",       arabicName: "الواقعة",       ayahs: 96,  type: "Meccan",  startPage: 534 },
  { number: 57,  name: "Al-Hadid",         arabicName: "الحديد",        ayahs: 29,  type: "Medinan", startPage: 537 },
  { number: 58,  name: "Al-Mujadila",      arabicName: "المجادلة",      ayahs: 22,  type: "Medinan", startPage: 542 },
  { number: 59,  name: "Al-Hashr",         arabicName: "الحشر",         ayahs: 24,  type: "Medinan", startPage: 545 },
  { number: 60,  name: "Al-Mumtahanah",    arabicName: "الممتحنة",      ayahs: 13,  type: "Medinan", startPage: 549 },
  { number: 61,  name: "As-Saf",           arabicName: "الصف",          ayahs: 14,  type: "Medinan", startPage: 551 },
  { number: 62,  name: "Al-Jumu'ah",       arabicName: "الجمعة",        ayahs: 11,  type: "Medinan", startPage: 553 },
  { number: 63,  name: "Al-Munafiqun",     arabicName: "المنافقون",     ayahs: 11,  type: "Medinan", startPage: 554 },
  { number: 64,  name: "At-Taghabun",      arabicName: "التغابن",       ayahs: 18,  type: "Medinan", startPage: 556 },
  { number: 65,  name: "At-Talaq",         arabicName: "الطلاق",        ayahs: 12,  type: "Medinan", startPage: 558 },
  { number: 66,  name: "At-Tahrim",        arabicName: "التحريم",       ayahs: 12,  type: "Medinan", startPage: 560 },
  { number: 67,  name: "Al-Mulk",          arabicName: "الملك",         ayahs: 30,  type: "Meccan",  startPage: 562 },
  { number: 68,  name: "Al-Qalam",         arabicName: "القلم",         ayahs: 52,  type: "Meccan",  startPage: 564 },
  { number: 69,  name: "Al-Haqqah",        arabicName: "الحاقة",        ayahs: 52,  type: "Meccan",  startPage: 566 },
  { number: 70,  name: "Al-Ma'arij",       arabicName: "المعارج",       ayahs: 44,  type: "Meccan",  startPage: 568 },
  { number: 71,  name: "Nuh",              arabicName: "نوح",           ayahs: 28,  type: "Meccan",  startPage: 570 },
  { number: 72,  name: "Al-Jinn",          arabicName: "الجن",          ayahs: 28,  type: "Meccan",  startPage: 572 },
  { number: 73,  name: "Al-Muzzammil",     arabicName: "المزمل",        ayahs: 20,  type: "Meccan",  startPage: 574 },
  { number: 74,  name: "Al-Muddaththir",   arabicName: "المدثر",        ayahs: 56,  type: "Meccan",  startPage: 575 },
  { number: 75,  name: "Al-Qiyamah",       arabicName: "القيامة",       ayahs: 40,  type: "Meccan",  startPage: 577 },
  { number: 76,  name: "Al-Insan",         arabicName: "الإنسان",       ayahs: 31,  type: "Medinan", startPage: 578 },
  { number: 77,  name: "Al-Mursalat",      arabicName: "المرسلات",      ayahs: 50,  type: "Meccan",  startPage: 580 },
  { number: 78,  name: "An-Naba",          arabicName: "النبأ",         ayahs: 40,  type: "Meccan",  startPage: 582 },
  { number: 79,  name: "An-Nazi'at",       arabicName: "النازعات",      ayahs: 46,  type: "Meccan",  startPage: 583 },
  { number: 80,  name: "'Abasa",           arabicName: "عبس",           ayahs: 42,  type: "Meccan",  startPage: 585 },
  { number: 81,  name: "At-Takwir",        arabicName: "التكوير",       ayahs: 29,  type: "Meccan",  startPage: 586 },
  { number: 82,  name: "Al-Infitar",       arabicName: "الانفطار",      ayahs: 19,  type: "Meccan",  startPage: 587 },
  { number: 83,  name: "Al-Mutaffifin",    arabicName: "المطففين",      ayahs: 36,  type: "Meccan",  startPage: 587 },
  { number: 84,  name: "Al-Inshiqaq",      arabicName: "الانشقاق",      ayahs: 25,  type: "Meccan",  startPage: 589 },
  { number: 85,  name: "Al-Buruj",         arabicName: "البروج",        ayahs: 22,  type: "Meccan",  startPage: 590 },
  { number: 86,  name: "At-Tariq",         arabicName: "الطارق",        ayahs: 17,  type: "Meccan",  startPage: 591 },
  { number: 87,  name: "Al-A'la",          arabicName: "الأعلى",        ayahs: 19,  type: "Meccan",  startPage: 591 },
  { number: 88,  name: "Al-Ghashiyah",     arabicName: "الغاشية",       ayahs: 26,  type: "Meccan",  startPage: 592 },
  { number: 89,  name: "Al-Fajr",          arabicName: "الفجر",         ayahs: 30,  type: "Meccan",  startPage: 593 },
  { number: 90,  name: "Al-Balad",         arabicName: "البلد",         ayahs: 20,  type: "Meccan",  startPage: 594 },
  { number: 91,  name: "Ash-Shams",        arabicName: "الشمس",         ayahs: 15,  type: "Meccan",  startPage: 595 },
  { number: 92,  name: "Al-Layl",          arabicName: "الليل",         ayahs: 21,  type: "Meccan",  startPage: 595 },
  { number: 93,  name: "Ad-Duha",          arabicName: "الضحى",         ayahs: 11,  type: "Meccan",  startPage: 596 },
  { number: 94,  name: "Ash-Sharh",        arabicName: "الشرح",         ayahs: 8,   type: "Meccan",  startPage: 596 },
  { number: 95,  name: "At-Tin",           arabicName: "التين",         ayahs: 8,   type: "Meccan",  startPage: 597 },
  { number: 96,  name: "Al-'Alaq",         arabicName: "العلق",         ayahs: 19,  type: "Meccan",  startPage: 597 },
  { number: 97,  name: "Al-Qadr",          arabicName: "القدر",         ayahs: 5,   type: "Meccan",  startPage: 598 },
  { number: 98,  name: "Al-Bayyinah",      arabicName: "البينة",        ayahs: 8,   type: "Medinan", startPage: 598 },
  { number: 99,  name: "Az-Zalzalah",      arabicName: "الزلزلة",       ayahs: 8,   type: "Medinan", startPage: 599 },
  { number: 100, name: "Al-'Adiyat",       arabicName: "العاديات",      ayahs: 11,  type: "Meccan",  startPage: 599 },
  { number: 101, name: "Al-Qari'ah",       arabicName: "القارعة",       ayahs: 11,  type: "Meccan",  startPage: 600 },
  { number: 102, name: "At-Takathur",      arabicName: "التكاثر",       ayahs: 8,   type: "Meccan",  startPage: 600 },
  { number: 103, name: "Al-'Asr",          arabicName: "العصر",         ayahs: 3,   type: "Meccan",  startPage: 601 },
  { number: 104, name: "Al-Humazah",       arabicName: "الهمزة",        ayahs: 9,   type: "Meccan",  startPage: 601 },
  { number: 105, name: "Al-Fil",           arabicName: "الفيل",         ayahs: 5,   type: "Meccan",  startPage: 601 },
  { number: 106, name: "Quraysh",          arabicName: "قريش",          ayahs: 4,   type: "Meccan",  startPage: 602 },
  { number: 107, name: "Al-Ma'un",         arabicName: "الماعون",       ayahs: 7,   type: "Meccan",  startPage: 602 },
  { number: 108, name: "Al-Kawthar",       arabicName: "الكوثر",        ayahs: 3,   type: "Meccan",  startPage: 602 },
  { number: 109, name: "Al-Kafirun",       arabicName: "الكافرون",      ayahs: 6,   type: "Meccan",  startPage: 603 },
  { number: 110, name: "An-Nasr",          arabicName: "النصر",         ayahs: 3,   type: "Medinan", startPage: 603 },
  { number: 111, name: "Al-Masad",         arabicName: "المسد",         ayahs: 5,   type: "Meccan",  startPage: 603 },
  { number: 112, name: "Al-Ikhlas",        arabicName: "الإخلاص",       ayahs: 4,   type: "Meccan",  startPage: 604 },
  { number: 113, name: "Al-Falaq",         arabicName: "الفلق",         ayahs: 5,   type: "Meccan",  startPage: 604 },
  { number: 114, name: "An-Nas",           arabicName: "الناس",         ayahs: 6,   type: "Meccan",  startPage: 604 },
];

export function getSurahForPage(page: number): SurahInfo {
  let result = SURAHS[0];
  for (const s of SURAHS) {
    if (s.startPage <= page) result = s;
    else break;
  }
  return result;
}

// Juz boundaries (page numbers where each juz starts)
export const JUZ_PAGES: number[] = [
  1,20,38,56,74,92,110,128,146,164,
  182,200,218,236,254,272,290,308,326,344,
  362,380,398,416,434,452,470,488,506,524
];

export function getJuzForPage(page: number): number {
  let juz = 1;
  for (let i = 0; i < JUZ_PAGES.length; i++) {
    if (page >= JUZ_PAGES[i]) juz = i + 1;
    else break;
  }
  return juz;
}
