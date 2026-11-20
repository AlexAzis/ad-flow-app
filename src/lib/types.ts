export interface Campaign {
  id: string;
  name: string;
  client: string;
  color: string;
  logoUrl?: string;
  locked?: boolean;
  lockedBy?: string;
  people?: string[];
}

export interface Event {
  id: string;
  title: string;
  titles?: string[];
  campaignId: string;
  stage: string;
  startDate: Date;
  endDate: Date;
  assignee?: string;
  assignees?: string[];
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

export type ViewMode = 'daily' | 'vertical' | 'gantt' | 'topline' | 'people';
