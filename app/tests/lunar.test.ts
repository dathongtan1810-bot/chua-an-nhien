import { describe, expect, it } from 'vitest';
import {
  dayCanChi,
  formatLunar,
  jdFromDate,
  jdToDate,
  leapMonthOf,
  lunarMonthLength,
  lunarToSolar,
  monthCanChi,
  solarToLunar,
  todayLunar,
  vnDateParts,
  yearCanChi,
  zodiacAnimal,
} from '../src/lunar/lunar';

const TET: Array<[number, number, number]> = [
  [22, 1, 2023],
  [10, 2, 2024],
  [29, 1, 2025],
  [17, 2, 2026],
  [6, 2, 2027],
  [17, 2, 2007], // Vietnam (UTC+7); China (UTC+8) celebrated on 18/02/2007
];

describe('Julian day numbers', () => {
  it('matches known values', () => {
    expect(jdFromDate(1, 1, 2000)).toBe(2451545);
    expect(jdFromDate(15, 10, 1582)).toBe(2299161);
    expect(jdToDate(2451545)).toEqual({ day: 1, month: 1, year: 2000 });
  });

  it('round-trips', () => {
    for (let jd = 2400000; jd < 2500000; jd += 37) {
      const d = jdToDate(jd);
      expect(jdFromDate(d.day, d.month, d.year)).toBe(jd);
    }
  });
});

describe('Tết Nguyên Đán', () => {
  for (const [d, m, y] of TET) {
    it(`Tết ${y} is ${d}/${m}/${y}`, () => {
      const ld = solarToLunar(d, m, y);
      expect(ld).toMatchObject({ day: 1, month: 1, year: y, leap: false });
      expect(lunarToSolar(1, 1, y)).toEqual({ day: d, month: m, year: y });
    });

    it(`the day before Tết ${y} is the last day of month 12 of ${y - 1}`, () => {
      const prev = jdToDate(jdFromDate(d, m, y) - 1);
      const ld = solarToLunar(prev.day, prev.month, prev.year);
      expect(ld.month).toBe(12);
      expect(ld.year).toBe(y - 1);
      expect(ld.leap).toBe(false);
      expect(ld.day).toBe(lunarMonthLength(12, y - 1));
    });
  }

  it('China (UTC+8) puts Tết 2007 on 18/02', () => {
    expect(lunarToSolar(1, 1, 2007, false, 8)).toEqual({ day: 18, month: 2, year: 2007 });
  });
});

describe('leap months', () => {
  it('2023 has leap month 2 starting 22/03/2023', () => {
    expect(leapMonthOf(2023)).toBe(2);
    expect(solarToLunar(22, 3, 2023)).toMatchObject({ day: 1, month: 2, year: 2023, leap: true });
    expect(lunarToSolar(1, 2, 2023, true)).toEqual({ day: 22, month: 3, year: 2023 });
  });

  it('2025 has leap month 6 starting 25/07/2025', () => {
    expect(leapMonthOf(2025)).toBe(6);
    expect(solarToLunar(25, 7, 2025)).toMatchObject({ day: 1, month: 6, year: 2025, leap: true });
    expect(lunarToSolar(1, 6, 2025, true)).toEqual({ day: 25, month: 7, year: 2025 });
  });

  it('2020 has leap month 4 starting 23/05/2020', () => {
    expect(leapMonthOf(2020)).toBe(4);
    expect(solarToLunar(23, 5, 2020)).toMatchObject({ day: 1, month: 4, year: 2020, leap: true });
    expect(lunarToSolar(1, 4, 2020, true)).toEqual({ day: 23, month: 5, year: 2020 });
  });

  it('years without a leap month', () => {
    expect(leapMonthOf(2024)).toBe(0);
    expect(leapMonthOf(2026)).toBe(0);
  });

  it('returns null for a non-existent leap month or day', () => {
    expect(lunarToSolar(1, 3, 2024, true)).toBeNull();
    expect(lunarToSolar(31, 1, 2024)).toBeNull();
    expect(lunarToSolar(1, 13, 2024)).toBeNull();
    const len = lunarMonthLength(1, 2024);
    if (len === 29) expect(lunarToSolar(30, 1, 2024)).toBeNull();
  });
});

describe('festivals', () => {
  it('Vu Lan 15/7/2025 lunar = 06/09/2025', () => {
    expect(lunarToSolar(15, 7, 2025)).toEqual({ day: 6, month: 9, year: 2025 });
    expect(solarToLunar(6, 9, 2025)).toMatchObject({ day: 15, month: 7, year: 2025, leap: false });
  });

  it('Phật Đản 15/4/2024 lunar = 22/05/2024', () => {
    expect(lunarToSolar(15, 4, 2024)).toEqual({ day: 22, month: 5, year: 2024 });
    expect(solarToLunar(22, 5, 2024)).toMatchObject({ day: 15, month: 4, year: 2024, leap: false });
  });
});

describe('round trip 1990–2050', () => {
  it('solar → lunar → solar is the identity, and lunar days advance consistently', () => {
    const startJd = jdFromDate(1, 1, 1990);
    const endJd = jdFromDate(31, 12, 2050);
    let prev = solarToLunar(31, 12, 1989);
    for (let jd = startJd; jd <= endJd; jd++) {
      const s = jdToDate(jd);
      const ld = solarToLunar(s.day, s.month, s.year);
      expect(ld.jdn).toBe(jd);
      const back = lunarToSolar(ld.day, ld.month, ld.year, ld.leap);
      if (!back || back.day !== s.day || back.month !== s.month || back.year !== s.year) {
        throw new Error(`round trip failed at ${s.day}/${s.month}/${s.year}: ${JSON.stringify(ld)}`);
      }
      if (ld.day === 1) {
        if (prev.day !== 29 && prev.day !== 30) throw new Error(`bad month length before ${jd}`);
      } else if (ld.day !== prev.day + 1) {
        throw new Error(`day did not advance at ${s.day}/${s.month}/${s.year}`);
      }
      prev = ld;
    }
  });
});

describe('Can Chi', () => {
  it('years', () => {
    expect(yearCanChi(2024)).toBe('Giáp Thìn');
    expect(yearCanChi(2025)).toBe('Ất Tỵ');
    expect(yearCanChi(2026)).toBe('Bính Ngọ');
    expect(yearCanChi(2007)).toBe('Đinh Hợi');
    expect(yearCanChi(1984)).toBe('Giáp Tý');
    expect(zodiacAnimal(2023)).toBe('Mão');
  });

  it('days', () => {
    expect(dayCanChi(jdFromDate(1, 1, 2000))).toBe('Mậu Ngọ');
    expect(dayCanChi(jdFromDate(10, 2, 2024))).toBe('Giáp Thìn');
  });

  it('months', () => {
    expect(monthCanChi(1, 2024)).toBe('Bính Dần');
    expect(monthCanChi(1, 2025)).toBe('Mậu Dần');
    expect(monthCanChi(12, 2024)).toBe('Đinh Sửu');
  });
});

describe('today / formatting', () => {
  it('vnDateParts uses UTC+7 regardless of host time zone', () => {
    // 2026-02-16T17:30:00Z is 00:30 on 17/02/2026 in Vietnam (Tết Bính Ngọ).
    const now = new Date(Date.UTC(2026, 1, 16, 17, 30));
    expect(vnDateParts(now)).toEqual({ day: 17, month: 2, year: 2026, hour: 0, minute: 30 });
    expect(todayLunar(now)).toMatchObject({ day: 1, month: 1, year: 2026, leap: false });
  });

  it('formats in Vietnamese and English', () => {
    const base = { jdn: 0, year: 2026, leap: false };
    expect(formatLunar({ ...base, day: 5, month: 9 }, 'vi')).toBe('Mùng 5 tháng 9 năm Bính Ngọ');
    expect(formatLunar({ ...base, day: 5, month: 9 }, 'en')).toBe('Day 5, month 9 (Year of Bính Ngọ)');
    expect(formatLunar({ ...base, day: 15, month: 7 }, 'vi')).toBe('Rằm tháng 7 năm Bính Ngọ');
    expect(formatLunar({ ...base, day: 23, month: 12 }, 'vi')).toBe('Ngày 23 tháng 12 năm Bính Ngọ');
    expect(formatLunar({ day: 1, month: 4, year: 2020, leap: true, jdn: 0 }, 'vi')).toBe(
      'Mùng 1 tháng 4 nhuận năm Canh Tý',
    );
  });
});
