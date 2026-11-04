export interface Campaign {
  id: string;
  name: string;
  client: string;
  color: string;
  locked?: boolean;
  lockedBy?: string;
  people?: string[];
}

export interface Event {
  id: string;
  title: string;
  campaignId: string;
  stage: string;
  startDate: Date;
  endDate: Date;
  assignee?: string;
  notes?: string;
  color: string;
  isMisc?: boolean;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export type ViewMode = 'daily-6' | 'daily-12' | 'vertical' | 'gantt' | 'topline' | 'people';
