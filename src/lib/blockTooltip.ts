import { format, isSameDay, isSameYear } from 'date-fns';
import type { Event } from './types';
import { getEventTitles, joinEventTitles } from './eventTitles';

// Date span for a block, e.g. "Mon 7 Dec 2026" or "7 Dec – 11 Dec 2026"
export function blockDates(start: Date, end: Date): string {
  if (isSameDay(start, end)) return format(start, 'EEE d MMM yyyy');
  return `${format(start, isSameYear(start, end) ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

// Hover text for a block: full event name(s), campaign, people, dates and notes
export function blockTooltip(event: Event, details: { campaign?: string; people?: string } = {}): string {
  return [
    joinEventTitles(getEventTitles(event)),
    details.campaign,
    details.people,
    blockDates(new Date(event.startDate), new Date(event.endDate)),
    event.notes,
  ]
    .filter(Boolean)
    .join('\n');
}
