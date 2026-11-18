import { addDays, setDate } from 'date-fns';

// Compute Easter Sunday for a year (Anonymous Gregorian algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function firstMondayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  const offset = (8 - d.getDay()) % 7;
  return addDays(d, offset);
}

function lastMondayOfMonth(year: number, month: number): Date {
  const last = new Date(year, month + 1, 0); // last day of month
  const offset = (last.getDay() + 6) % 7; // days since Monday
  return addDays(last, -offset);
}

export interface BankHoliday {
  date: Date;
  name: string;
}

// UK Bank Holidays for England & Wales
export function getUKBankHolidays(year: number): BankHoliday[] {
  const holidays: BankHoliday[] = [];

  // New Year's Day (with weekend substitute)
  const nyd = new Date(year, 0, 1);
  if (nyd.getDay() === 6) holidays.push({ date: new Date(year, 0, 3), name: "New Year's Day" });
  else if (nyd.getDay() === 0) holidays.push({ date: new Date(year, 0, 2), name: "New Year's Day" });
  else holidays.push({ date: nyd, name: "New Year's Day" });

  // Easter-related
  const easter = getEasterSunday(year);
  holidays.push({ date: addDays(easter, -2), name: 'Good Friday' });
  holidays.push({ date: addDays(easter, 1), name: 'Easter Monday' });

  // Early May Bank Holiday (first Monday in May)
  holidays.push({ date: firstMondayOfMonth(year, 4), name: 'Early May Bank Holiday' });

  // Spring Bank Holiday (last Monday in May)
  holidays.push({ date: lastMondayOfMonth(year, 4), name: 'Spring Bank Holiday' });

  // Summer Bank Holiday (last Monday in August)
  holidays.push({ date: lastMondayOfMonth(year, 7), name: 'Summer Bank Holiday' });

  // Christmas & Boxing Day (with weekend substitutes)
  const xmas = new Date(year, 11, 25);
  const dow = xmas.getDay();
  if (dow === 6) {
    // Sat 25th: Xmas BH Mon 27, Boxing BH Tue 28
    holidays.push({ date: new Date(year, 11, 27), name: 'Christmas Day' });
    holidays.push({ date: new Date(year, 11, 28), name: 'Boxing Day' });
  } else if (dow === 0) {
    // Sun 25th: Boxing Mon 26, Xmas BH Tue 27
    holidays.push({ date: new Date(year, 11, 26), name: 'Boxing Day' });
    holidays.push({ date: new Date(year, 11, 27), name: 'Christmas Day' });
  } else if (dow === 5) {
    // Fri 25th: Boxing Sat 26 → BH Mon 28
    holidays.push({ date: xmas, name: 'Christmas Day' });
    holidays.push({ date: new Date(year, 11, 28), name: 'Boxing Day' });
  } else {
    holidays.push({ date: xmas, name: 'Christmas Day' });
    holidays.push({ date: new Date(year, 11, 26), name: 'Boxing Day' });
  }

  return holidays;
}

// Get all bank holidays covering a date range
export function getBankHolidaysForRange(startDate: Date, endDate: Date): Map<string, string> {
  const map = new Map<string, string>();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    getUKBankHolidays(y).forEach(h => {
      if (h.date >= startDate && h.date <= endDate) {
        map.set(h.date.toDateString(), h.name);
      }
    });
  }
  return map;
}
