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

export type ViewMode = 'daily-6' | 'daily-12' | 'vertical' | 'gantt' | 'topline' | 'people';
/var/folders/lp/xqv8l4914pv8j7tf448gqddm0000gn/T/TemporaryItems/NSIRD_screencaptureui_snGtxh/Screenshot 2026-11-06 at 13.15.00.png
