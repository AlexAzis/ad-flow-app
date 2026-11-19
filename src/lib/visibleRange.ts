import { addDays, addMonths, addWeeks, differenceInDays, differenceInWeeks, startOfDay, startOfWeek } from 'date-fns';
import { Event } from './types';

// Every view renders two weeks of history before its anchor so the past can be
// reached by scrolling back, but nothing earlier is ever shown.
export const LOOKBACK_DAYS = 14;

// The date a view opens on: the navigated date, but never before today.
export function anchorDay(currentDate: Date): Date {
  const today = startOfDay(new Date());
  const day = startOfDay(currentDate);
  return day < today ? today : day;
}

export function anchorWeek(currentDate: Date): Date {
  return startOfWeek(anchorDay(currentDate), { weekStartsOn: 1 });
}

// Index of the cell an export should stop at: the end of the week after the last
// filtered event's week. Returns -1 when there are no events (no end crop), and
// the anchor period is always included even if every event sits in the past.
export function exportEndIndex(
  events: Event[],
  anchor: Date,
  rangeStart: Date,
  unit: 'day' | 'week'
): number {
  if (events.length === 0) return -1;
  const lastEnd = new Date(Math.max(...events.map(e => new Date(e.endDate).getTime())));
  const week = startOfWeek(lastEnd < anchor ? anchor : lastEnd, { weekStartsOn: 1 });
  return unit === 'week'
    ? differenceInWeeks(addWeeks(week, 1), rangeStart)
    : differenceInDays(addDays(week, 13), rangeStart);
}

// Index of the day one month after the last filtered event ends. The anchor is
// always covered even if every event sits in the past. Returns -1 when there
// are no events.
export function monthAfterEndIndex(events: Event[], anchor: Date, rangeStart: Date): number {
  if (events.length === 0) return -1;
  const lastEnd = new Date(Math.max(...events.map(e => new Date(e.endDate).getTime())));
  const end = addMonths(lastEnd < anchor ? anchor : lastEnd, 1);
  return differenceInDays(end, rangeStart);
}
