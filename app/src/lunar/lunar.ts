/**
 * Vietnamese lunisolar calendar (âm lịch), computed for a given time zone (UTC+7 by default).
 *
 * Written from first principles using formulas from Jean Meeus, "Astronomical Algorithms" (2nd ed.):
 *  - chapter 49: instants of the mean/true new moon (full periodic series + planetary terms);
 *  - chapter 25: low-precision apparent longitude of the Sun (accuracy ~0.01°).
 *
 * Calendar rules (shared by the Chinese and Vietnamese calendars; they only differ by the meridian):
 *  1. A lunar month begins on the local civil day that contains the new moon.
 *  2. The month containing the December (winter) solstice — Sun longitude 270° — is month 11.
 *  3. The span between two consecutive month-11 starts (a "suì") holds 12 or 13 months. When it holds
 *     13, the first month of the span that contains no principal term (zhongqi, a Sun longitude that
 *     is a multiple of 30°) is a leap month and takes the number of the month before it.
 *
 * All exported functions are pure; the per-span month tables are memoised.
 */

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
  /** Julian day number of the corresponding civil (Gregorian) date. */
  jdn: number;
}

export interface SolarDate {
  day: number;
  month: number;
  year: number;
}

const DEG = Math.PI / 180;
const SYNODIC_MONTH = 29.530588861;

// ---------------------------------------------------------------------------------------------
// Julian day numbers (proleptic Gregorian calendar)
// ---------------------------------------------------------------------------------------------

/** Julian day number (integer, noon-based) of a Gregorian calendar date. */
export function jdFromDate(d: number, m: number, y: number): number {
  // Shift the year so that it starts in March; February then becomes the last (variable) month.
  const shift = Math.floor((14 - m) / 12);
  const yy = y + 4800 - shift;
  const mm = m + 12 * shift - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** Inverse of {@link jdFromDate}. */
export function jdToDate(jdn: number): SolarDate {
  // Algorithm after Richards (Explanatory Supplement to the Astronomical Almanac, 3rd ed., 15.11).
  const f = jdn + 1401 + Math.floor((Math.floor((4 * jdn + 274277) / 146097) * 3) / 4) - 38;
  const e = 4 * f + 3;
  const g = Math.floor((e % 1461) / 4);
  const h = 5 * g + 2;
  const day = Math.floor((h % 153) / 5) + 1;
  const month = ((Math.floor(h / 153) + 2) % 12) + 1;
  const year = Math.floor(e / 1461) - 4716 + Math.floor((12 + 2 - month) / 12);
  return { day, month, year };
}

// ---------------------------------------------------------------------------------------------
// Astronomy
// ---------------------------------------------------------------------------------------------

/** Approximate ΔT = TT − UT in seconds (Espenak & Meeus polynomial fits). */
function deltaTSeconds(year: number): number {
  if (year >= 2005 && year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year >= 1986 && year < 2005) {
    const t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year >= 1961 && year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year >= 1941 && year < 1961) {
    const t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year >= 2050 && year < 2150) {
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
  // Generic long-term parabola; good enough for the rare dates outside the fitted ranges.
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

/** ΔT in days for a Julian Ephemeris Day. */
function deltaTDays(jd: number): number {
  const year = 2000 + (jd - 2451545) / 365.25;
  return deltaTSeconds(year) / 86400;
}

const sinD = (deg: number): number => Math.sin(deg * DEG);

/** Planetary-argument terms A2..A14 of Meeus 49 (coefficient, phase, rate per lunation). */
const PLANETARY_TERMS: ReadonlyArray<readonly [number, number, number]> = [
  [0.000165, 251.88, 0.016321],
  [0.000164, 251.83, 26.651886],
  [0.000126, 349.42, 36.412478],
  [0.00011, 84.66, 18.206239],
  [0.000062, 141.74, 53.303771],
  [0.00006, 207.14, 2.453732],
  [0.000056, 154.84, 7.30686],
  [0.000047, 34.52, 27.261239],
  [0.000042, 207.19, 0.121824],
  [0.00004, 291.34, 1.844379],
  [0.000037, 161.72, 24.198154],
  [0.000035, 239.56, 25.513099],
  [0.000023, 331.55, 3.592518],
];

/**
 * Instant (Julian Day, UT) of the true new moon number `k`, where k = 0 is the new moon of
 * 6 January 2000 and k increases by one per lunation (Meeus ch. 49).
 */
export function newMoonJd(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  let jde = 2451550.09766 + SYNODIC_MONTH * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;

  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3; // Sun mean anomaly
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4; // Moon
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;

  const periodic =
    -0.4072 * sinD(Mp) +
    0.17241 * E * sinD(M) +
    0.01608 * sinD(2 * Mp) +
    0.01039 * sinD(2 * F) +
    0.00739 * E * sinD(Mp - M) -
    0.00514 * E * sinD(Mp + M) +
    0.00208 * E * E * sinD(2 * M) -
    0.00111 * sinD(Mp - 2 * F) -
    0.00057 * sinD(Mp + 2 * F) +
    0.00056 * E * sinD(2 * Mp + M) -
    0.00042 * sinD(3 * Mp) +
    0.00042 * E * sinD(M + 2 * F) +
    0.00038 * E * sinD(M - 2 * F) -
    0.00024 * E * sinD(2 * Mp - M) -
    0.00017 * sinD(Om) -
    0.00007 * sinD(Mp + 2 * M) +
    0.00004 * sinD(2 * Mp - 2 * F) +
    0.00004 * sinD(3 * M) +
    0.00003 * sinD(Mp + M - 2 * F) +
    0.00003 * sinD(2 * Mp + 2 * F) -
    0.00003 * sinD(Mp + M + 2 * F) +
    0.00003 * sinD(Mp - M + 2 * F) -
    0.00002 * sinD(Mp - M - 2 * F) -
    0.00002 * sinD(3 * Mp + M) +
    0.00002 * sinD(4 * Mp);

  // A1 carries a small quadratic term; A2..A14 are linear in k.
  let planetary = 0.000325 * sinD(299.77 + 0.107408 * k - 0.009173 * T2);
  for (const [coef, phase, rate] of PLANETARY_TERMS) planetary += coef * sinD(phase + rate * k);

  jde += periodic + planetary;
  return jde - deltaTDays(jde);
}

/** Apparent geocentric longitude of the Sun in degrees [0, 360) at Julian Day `jdUt` (Meeus ch. 25). */
export function sunLongitude(jdUt: number): number {
  const jde = jdUt + deltaTDays(jdUt);
  const T = (jde - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinD(M) +
    (0.019993 - 0.000101 * T) * sinD(2 * M) +
    0.000289 * sinD(3 * M);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * sinD(omega);
  return ((lambda % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------------------------
// Local-day helpers
// ---------------------------------------------------------------------------------------------

/** Julian day number of the local civil day (UTC+tz) containing the instant `jdUt`. */
function localDayOf(jdUt: number, tz: number): number {
  return Math.floor(jdUt + 0.5 + tz / 24);
}

/** JDN of the local day on which new moon `k` falls. */
function newMoonDay(k: number, tz: number): number {
  return localDayOf(newMoonJd(k), tz);
}

/** Sun longitude at local midnight that starts the civil day `jdn`. */
function sunLongitudeAtDayStart(jdn: number, tz: number): number {
  return sunLongitude(jdn - 0.5 - tz / 24);
}

/** Index of the 30° principal-term sector the Sun occupies at the start of local day `jdn`. */
function termSector(jdn: number, tz: number): number {
  return Math.floor(sunLongitudeAtDayStart(jdn, tz) / 30);
}

/** Approximate lunation number for a Julian Day (k = 0 near 6 Jan 2000). */
function approxLunation(jd: number): number {
  return Math.floor((jd - 2451550.09766) / SYNODIC_MONTH);
}

/**
 * Lunation number `k` of the month 11 that contains the December solstice of Gregorian year `y`.
 * Month k contains the solstice iff the Sun is below 270° when it starts and at/above 270° when
 * the following month starts.
 */
function month11Lunation(y: number, tz: number): number {
  const guess = approxLunation(jdFromDate(20, 12, y));
  for (let k = guess - 2; k <= guess + 2; k++) {
    const start = sunLongitudeAtDayStart(newMoonDay(k, tz), tz);
    const end = sunLongitudeAtDayStart(newMoonDay(k + 1, tz), tz);
    if (start < 270 && start >= 180 && (end >= 270 || end < 90)) return k;
  }
  throw new Error(`lunar: cannot locate month 11 for year ${y}`);
}

// ---------------------------------------------------------------------------------------------
// Month tables
// ---------------------------------------------------------------------------------------------

interface MonthEntry {
  /** JDN of the first day of the month. */
  start: number;
  /** Number of days (29 or 30). */
  length: number;
  month: number;
  leap: boolean;
  /** Lunar year the month belongs to (the year whose Tết falls in that Gregorian year). */
  year: number;
}

const spanCache = new Map<string, MonthEntry[]>();

/**
 * Months of the suì running from month 11 of Gregorian year `y - 1` (inclusive) up to month 11 of
 * Gregorian year `y` (exclusive). These are months 11, 12 of lunar year y-1 and months 1..10 of
 * lunar year y (plus a possible leap month somewhere).
 */
function monthsOfSpan(y: number, tz: number): MonthEntry[] {
  const key = `${y}|${tz}`;
  const cached = spanCache.get(key);
  if (cached) return cached;

  const kFirst = month11Lunation(y - 1, tz);
  const kLast = month11Lunation(y, tz);
  const count = kLast - kFirst; // 12 or 13
  const starts: number[] = [];
  for (let k = kFirst; k <= kLast; k++) starts.push(newMoonDay(k, tz));

  // In a 13-month span, find the first month (after month 11) without a principal term.
  let leapIndex = -1;
  if (count === 13) {
    for (let i = 1; i < count; i++) {
      if (termSector(starts[i], tz) === termSector(starts[i + 1], tz)) {
        leapIndex = i;
        break;
      }
    }
  }

  const months: MonthEntry[] = [];
  let number = 11;
  let year = y - 1;
  for (let i = 0; i < count; i++) {
    const leap = i === leapIndex;
    if (i > 0 && !leap) {
      number = number === 12 ? 1 : number + 1;
      if (number === 1) year = y;
    }
    months.push({ start: starts[i], length: starts[i + 1] - starts[i], month: number, leap, year });
  }

  spanCache.set(key, months);
  return months;
}

/** Locate the month entry containing civil day `jdn`. */
function monthContaining(jdn: number, tz: number): MonthEntry {
  const { year } = jdToDate(jdn);
  let months = monthsOfSpan(year + 1, tz);
  if (jdn < months[0].start) months = monthsOfSpan(year, tz);
  for (let i = months.length - 1; i >= 0; i--) {
    if (months[i].start <= jdn) return months[i];
  }
  throw new Error(`lunar: no month found for JDN ${jdn}`);
}

/** Find the month entry for a given lunar month, or undefined if it doesn't exist. */
function findMonth(lMonth: number, lYear: number, leap: boolean, tz: number): MonthEntry | undefined {
  // Months 11 and 12 of lunar year Y open the span ending with month 11 of Gregorian year Y + 1.
  const span = lMonth >= 11 ? monthsOfSpan(lYear + 1, tz) : monthsOfSpan(lYear, tz);
  return span.find((m) => m.year === lYear && m.month === lMonth && m.leap === leap);
}

// ---------------------------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------------------------

/** Convert a Gregorian date to the lunar calendar. */
export function solarToLunar(day: number, month: number, year: number, tz = 7): LunarDate {
  const jdn = jdFromDate(day, month, year);
  const m = monthContaining(jdn, tz);
  return { day: jdn - m.start + 1, month: m.month, year: m.year, leap: m.leap, jdn };
}

/** Convert a lunar date to Gregorian; returns null if the lunar date does not exist. */
export function lunarToSolar(
  lDay: number,
  lMonth: number,
  lYear: number,
  leap = false,
  tz = 7,
): SolarDate | null {
  if (!Number.isInteger(lDay) || !Number.isInteger(lMonth) || !Number.isInteger(lYear)) return null;
  if (lMonth < 1 || lMonth > 12 || lDay < 1 || lDay > 30) return null;
  const m = findMonth(lMonth, lYear, leap, tz);
  if (!m || lDay > m.length) return null;
  return jdToDate(m.start + lDay - 1);
}

/** Number of days in a lunar month (29 or 30). Throws if the month does not exist. */
export function lunarMonthLength(lMonth: number, lYear: number, leap = false, tz = 7): 29 | 30 {
  const m = findMonth(lMonth, lYear, leap, tz);
  if (!m) throw new Error(`lunar: month ${lMonth}${leap ? ' (leap)' : ''} of ${lYear} does not exist`);
  return m.length === 30 ? 30 : 29;
}

/** Leap month number of lunar year `lYear`, or 0 if the year has none. */
export function leapMonthOf(lYear: number, tz = 7): number {
  const all = [...monthsOfSpan(lYear, tz), ...monthsOfSpan(lYear + 1, tz)];
  const leap = all.find((m) => m.leap && m.year === lYear);
  return leap ? leap.month : 0;
}

// ---------------------------------------------------------------------------------------------
// Can Chi (sexagenary cycle)
// ---------------------------------------------------------------------------------------------

const STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
const BRANCHES = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
] as const;

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Con giáp (earthly branch animal) of a lunar year, e.g. 2024 → "Thìn". */
export function zodiacAnimal(lunarYear: number): string {
  return BRANCHES[mod(lunarYear + 8, 12)];
}

/** Can Chi name of a lunar year, e.g. 2024 → "Giáp Thìn". */
export function yearCanChi(lunarYear: number): string {
  return `${STEMS[mod(lunarYear + 6, 10)]} ${zodiacAnimal(lunarYear)}`;
}

/** Can Chi name of a civil day given its Julian day number (JDN 2451545 = 1/1/2000 = Mậu Ngọ). */
export function dayCanChi(jdn: number): string {
  return `${STEMS[mod(jdn + 9, 10)]} ${BRANCHES[mod(jdn + 1, 12)]}`;
}

/**
 * Can Chi name of a lunar month. Month 1 is always a Dần month; its stem follows the year's stem
 * (Giáp/Kỷ years start with Bính Dần, Ất/Canh with Mậu Dần, ...). A leap month shares the name of
 * the month it repeats.
 */
export function monthCanChi(lMonth: number, lYear: number): string {
  return `${STEMS[mod(lYear * 12 + lMonth + 3, 10)]} ${BRANCHES[mod(lMonth + 1, 12)]}`;
}

// ---------------------------------------------------------------------------------------------
// "Today" helpers and formatting
// ---------------------------------------------------------------------------------------------

/** Civil date/time in Vietnam (UTC+7) for an instant, independent of the host time zone. */
export function vnDateParts(now: Date): {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
} {
  const shifted = new Date(now.getTime() + 7 * 3600 * 1000);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Today's lunar date in Vietnam. */
export function todayLunar(now: Date = new Date()): LunarDate {
  const p = vnDateParts(now);
  return solarToLunar(p.day, p.month, p.year, 7);
}

/** Human-readable lunar date, e.g. "Mùng 5 tháng 9 năm Bính Ngọ" / "Day 5, month 9 (Year of Bính Ngọ)". */
export function formatLunar(ld: LunarDate, lang: 'vi' | 'en'): string {
  const yearName = yearCanChi(ld.year);
  if (lang === 'en') {
    return `Day ${ld.day}, ${ld.leap ? 'leap ' : ''}month ${ld.month} (Year of ${yearName})`;
  }
  const dayLabel = ld.day <= 10 ? `Mùng ${ld.day}` : ld.day === 15 ? 'Rằm' : `Ngày ${ld.day}`;
  return `${dayLabel} tháng ${ld.month}${ld.leap ? ' nhuận' : ''} năm ${yearName}`;
}
