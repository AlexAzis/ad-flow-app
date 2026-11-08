// Abbreviations for tight spaces - based on Base44 requirements
const abbreviations: Record<string, string> = {
  'presentation': 'pres.',
  'presentations': 'pres.',
  'directors': 'Dir.',
  'director': 'Dir.',
  'treatments': 'Treat.',
  'treatment': 'Treat.',
  'location': 'Loc.',
  'production': 'Prod.',
  'department': 'Dept.',
  'development': 'Dev.',
  'presentation': 'pres.',
  'marketing': 'Mktg.',
  'internal': 'Int.',
  'approval': 'App.',
  'approvals': 'App.',
  'scouting': 'Scout.',
  'department': 'Dept.',
  'construction': 'Constr.',
  'choreography': 'Choreo.',
  'styling': 'Styl.',
  'offline': 'Offline',
  'mastering': 'Master.',
  'clearcast': 'Clear.',
  'clocking': 'Clock.',
  'playout': 'Playout',
};

export function abbreviateText(text: string): string {
  let result = text;
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    result = result.replace(regex, abbr);
  });
  return result;
}

// Abbreviate only if text would be too long for the space
export function abbreviateIfNeeded(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text;
  return abbreviateText(text);
}
