-- Add engine compatibility column to code_examples table
-- Values: 'hyperscript', 'lokascript', 'both', or NULL (unverified)
ALTER TABLE code_examples ADD COLUMN engine TEXT DEFAULT NULL;

-- Create index for efficient filtering by engine
CREATE INDEX IF NOT EXISTS idx_examples_engine ON code_examples(engine);

-- Seed initial engine values for known hyperfixi-extensions patterns (lokascript only)
UPDATE code_examples SET engine = 'lokascript' WHERE feature = 'hyperfixi-extensions';
