export interface Campaign {
  id: string;
  name: string;
  client: string;
  color: string;
}

export interface Event {
  id: string;
  title: string;
  campaignId: string;
  stage: string;
  startDate: Date;
  endDate: Date;
  assignee?: string;
  color: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export type ViewMode = 'daily' | '6-col' | '12-col' | 'vertical' | 'gantt' | 'topline' | 'people';
