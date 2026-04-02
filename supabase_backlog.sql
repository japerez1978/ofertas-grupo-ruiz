-- Backlog de presupuestos para técnicos
CREATE TABLE backlog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id TEXT NOT NULL,
  offer_data JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  hubspot_new_offer_id TEXT
);

-- Index for fast queries
CREATE INDEX idx_backlog_status ON backlog(status);
CREATE INDEX idx_backlog_priority ON backlog(priority);

-- Enable Row Level Security
ALTER TABLE backlog ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (same org)
CREATE POLICY "Allow all for authenticated" ON backlog
  FOR ALL USING (auth.role() = 'authenticated');
