-- Supabase Database Schema for Ad Flow

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages table
CREATE TABLE stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3498DB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table
CREATE TABLE people (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assignee_id UUID REFERENCES people(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_campaign_id ON events(campaign_id);
CREATE INDEX idx_events_assignee_id ON events(assignee_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust these based on your auth requirements)
-- For development, you can use these permissive policies:
CREATE POLICY "Enable read access for all users" ON campaigns FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON campaigns FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON campaigns FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON stages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON stages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON stages FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON stages FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON people FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON people FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON people FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON events FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON events FOR DELETE USING (true);

-- Insert sample stages
INSERT INTO stages (name, color) VALUES
  ('Briefing', '#E74C3C'),
  ('Concept', '#F39C12'),
  ('Pre-Production', '#3498DB'),
  ('Production', '#9B59B6'),
  ('Post-Production', '#1ABC9C'),
  ('Delivery', '#34495E');

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
