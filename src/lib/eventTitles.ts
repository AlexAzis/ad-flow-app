import type { Event } from './types';

export function getEventTitles(event: Pick<Event, 'title' | 'titles'>): string[] {
  return event.titles?.length ? event.titles : [event.title];
}

export function joinEventTitles(titles: string[]): string {
  return titles.join(' · ');
}

export function getEventDisplayTitle(
  event: Pick<Event, 'title' | 'titles'>,
  selectedEvents?: Set<string>
): string {
  if (!selectedEvents || selectedEvents.size === 0) return event.title;
  const matches = getEventTitles(event).filter(title => selectedEvents.has(title));
  return matches.length ? joinEventTitles(matches) : event.title;
}
