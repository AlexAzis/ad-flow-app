-- Supabase Database Schema for Ad Flow
-- Run this once in the Supabase SQL editor. IDs are TEXT because the app generates its own.

-- Campaigns table
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_by TEXT,
  people TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table
CREATE TABLE people (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Team Member',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table (campaign_id is NULL for Misc events)
CREATE TABLE events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assignee TEXT,
  assignees TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  is_misc BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom event names added per stage via "Manage Events"
CREATE TABLE custom_event_types (
  stage TEXT PRIMARY KEY,
  names TEXT[] NOT NULL DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX idx_events_campaign_id ON events(campaign_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_event_types ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust these based on your auth requirements)
-- For development, these permissive policies let anyone with the anon key read and write:
CREATE POLICY "Enable all access for all users" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON custom_event_types FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
