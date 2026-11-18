export interface EventType {
  id: string;
  name: string;
  stage: 'Pre-Production' | 'Shoot' | 'Post-Production' | 'Delivery' | 'Creative Development';
}

export const eventTypes: EventType[] = [
  // Creative Development Events
  { id: 'internal-presentation', name: 'Internal presentation', stage: 'Creative Development' },
  { id: 'marketing-presentation', name: 'Marketing presentation', stage: 'Creative Development' },
  { id: 'client-presentation', name: 'Client presentation', stage: 'Creative Development' },
  { id: 'ecd-review', name: 'ECD review', stage: 'Creative Development' },

  // Pre-Production Events
  { id: 'director-scouting', name: 'Directors scouting', stage: 'Pre-Production' },
  { id: 'director-treatments', name: 'Directors treatments', stage: 'Pre-Production' },
  { id: 'location-scouting', name: 'Location scouting', stage: 'Pre-Production' },
  { id: 'casting', name: 'Casting', stage: 'Pre-Production' },
  { id: 'choreography', name: 'Choreography', stage: 'Pre-Production' },
  { id: 'art-moodboards', name: 'Art Department moodboards', stage: 'Pre-Production' },
  { id: 'art-design', name: 'Art Department design', stage: 'Pre-Production' },
  { id: 'styling-moodboards', name: 'Styling mood boards', stage: 'Pre-Production' },
  { id: 'pre-ppm', name: 'Pre-PPM', stage: 'Pre-Production' },
  { id: 'ppm', name: 'PPM', stage: 'Pre-Production' },
  { id: 'styling-fitting', name: 'Styling fitting', stage: 'Pre-Production' },
  { id: 'construction', name: 'Construction', stage: 'Pre-Production' },
  { id: 'pre-light', name: 'Pre-light', stage: 'Pre-Production' },

  // Shoot Events
  { id: 'day-1', name: 'Day 1', stage: 'Shoot' },
  { id: 'day-2', name: 'Day 2', stage: 'Shoot' },
  { id: 'day-3', name: 'Day 3', stage: 'Shoot' },
  { id: 'day-4', name: 'Day 4', stage: 'Shoot' },
  { id: 'day-5', name: 'Day 5', stage: 'Shoot' },
  { id: 'day-6', name: 'Day 6', stage: 'Shoot' },
  { id: 'day-7', name: 'Day 7', stage: 'Shoot' },

  // Post-Production Events
  { id: 'offline-edit', name: 'Offline edit', stage: 'Post-Production' },
  { id: 'offline-presentation', name: 'Offline presentation', stage: 'Post-Production' },
  { id: 'offline-amends', name: 'Offline amends', stage: 'Post-Production' },
  { id: 'offline-approval', name: 'Offline approval', stage: 'Post-Production' },
  { id: 'vfx', name: 'VFX', stage: 'Post-Production' },
  { id: 'vfx-presentation', name: 'VFX presentation', stage: 'Post-Production' },
  { id: 'vfx-approval', name: 'VFX approval', stage: 'Post-Production' },
  { id: 'audio-mix', name: 'Audio mix', stage: 'Post-Production' },
  { id: 'vo-record', name: 'VO record', stage: 'Post-Production' },

  // Delivery Events
  { id: 'mastering', name: 'Mastering', stage: 'Delivery' },
  { id: 'clearcast', name: 'Clearcast', stage: 'Delivery' },
  { id: 'clearcast-approval', name: 'Clearcast approval', stage: 'Delivery' },
  { id: 'clocking', name: 'Clocking', stage: 'Delivery' },
  { id: 'playout', name: 'Playout', stage: 'Delivery' },
];

export const getEventsByStage = (stage: string) => {
  return eventTypes.filter(event => event.stage === stage);
};

export const getAllStages = ['Creative Development', 'Pre-Production', 'Shoot', 'Post-Production', 'Delivery'] as const;

// Export events organized by stage for the modal
export const eventTypesByStage: Record<string, string[]> = {
  'Creative Development': [
    'Internal presentation',
    'Marketing presentation',
    'Client presentation',
    'ECD review',
  ],
  'Pre-Production': [
    'Directors scouting',
    'Directors treatments',
    'Location scouting',
    'Casting',
    'Choreography',
    'Art Department moodboards',
    'Art Department design',
    'Styling mood boards',
    'Pre-PPM',
    'PPM',
    'Styling fitting',
    'Construction',
    'Pre-light',
  ],
  'Shoot': [
    'Day 1',
    'Day 2',
    'Day 3',
    'Day 4',
    'Day 5',
    'Day 6',
    'Day 7',
  ],
  'Post-Production': [
    'Offline edit',
    'Offline presentation',
    'Offline amends',
    'Offline approval',
    'VFX',
    'VFX presentation',
    'VFX approval',
    'Audio mix',
    'VO record',
  ],
  'Delivery': [
    'Mastering',
    'Clearcast',
    'Clearcast approval',
    'Clocking',
    'Playout',
  ],
};
