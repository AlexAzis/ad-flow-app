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
  'marketing': 'Mktg.',
  'internal': 'Int.',
  'approval': 'App.',
  'approvals': 'App.',
  'scouting': 'Scout.',
  'construction': 'Constr.',
  'choreography': 'Choreo.',
  'styling': 'Styl.',
  'mastering': 'Master.',
  'clearcast': 'Clear.',
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
