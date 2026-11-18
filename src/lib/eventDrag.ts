import type { Event } from './types';

export type EventSelectionAction = 'toggle' | 'select' | 'add';

export interface EventDragPayload {
  draggedEventId: string;
  eventIds: string[];
}

export interface EventDragDetails extends EventDragPayload {
  selectionAction: EventSelectionAction | null;
}

const DRAGGED_EVENT_ID_KEY = 'eventId';
const EVENT_IDS_KEY = 'eventIds';

export function getEventDragDetails(
  draggedEventId: string,
  events: Event[],
  selectedEventIds: Set<string> | undefined,
  additive: boolean
): EventDragDetails {
  const visibleSelectedIds = new Set(
    events.filter(event => selectedEventIds?.has(event.id)).map(event => event.id)
  );
  const isSelected = visibleSelectedIds.has(draggedEventId);

  if (isSelected) {
    return {
      draggedEventId,
      eventIds: Array.from(visibleSelectedIds),
      selectionAction: null,
    };
  }

  const eventIds = additive
    ? Array.from(new Set([...visibleSelectedIds, draggedEventId]))
    : [draggedEventId];

  return {
    draggedEventId,
    eventIds,
    selectionAction: additive ? 'add' : 'select',
  };
}

export function setEventDragData(dataTransfer: DataTransfer, payload: EventDragPayload) {
  dataTransfer.setData(DRAGGED_EVENT_ID_KEY, payload.draggedEventId);
  dataTransfer.setData(EVENT_IDS_KEY, JSON.stringify(payload.eventIds));
  dataTransfer.effectAllowed = 'move';
}

export function getEventDragData(dataTransfer: DataTransfer): EventDragPayload | null {
  const draggedEventId = dataTransfer.getData(DRAGGED_EVENT_ID_KEY);
  if (!draggedEventId) return null;

  let eventIds = [draggedEventId];
  const rawEventIds = dataTransfer.getData(EVENT_IDS_KEY);
  if (rawEventIds) {
    try {
      const parsed = JSON.parse(rawEventIds);
      if (Array.isArray(parsed)) {
        eventIds = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
      }
    } catch {
      // Fall back to moving only the dragged event
    }
  }

  return {
    draggedEventId,
    eventIds: Array.from(new Set([draggedEventId, ...eventIds])),
  };
}
