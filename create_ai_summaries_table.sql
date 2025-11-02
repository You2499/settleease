-- Create ai_summaries table for storing AI-generated summaries
-- This table stores summaries with a hash of the JSON data to avoid re-generating for unchanged data

CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_hash TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, data_hash)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_hash ON ai_summaries(user_id, data_hash);

-- Enable Row Level Security
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own summaries
CREATE POLICY "Users can view their own summaries"
  ON ai_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own summaries
CREATE POLICY "Users can insert their own summaries"
  ON ai_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can update their own summaries
CREATE POLICY "Users can update their own summaries"
  ON ai_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can delete their own summaries
CREATE POLICY "Users can delete their own summaries"
  ON ai_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_summaries_updated_at
  BEFORE UPDATE ON ai_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_summaries_updated_at();

