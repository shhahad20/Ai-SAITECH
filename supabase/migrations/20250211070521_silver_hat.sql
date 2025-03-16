/*
  # Add metadata column to documents table

  1. Changes
    - Add JSONB metadata column to documents table
    - Update existing documents with default metadata structure
    - Add index on metadata for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add metadata column if it doesn't exist
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT jsonb_build_object(
  'topics', ARRAY[]::text[],
  'concepts', ARRAY[]::text[],
  'tags', ARRAY[]::text[],
  'summary', '',
  'lastUpdated', now()
);

-- Create GIN index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);

-- Update existing documents with default metadata
UPDATE documents
SET metadata = jsonb_build_object(
  'topics', ARRAY[]::text[],
  'concepts', ARRAY[]::text[],
  'tags', ARRAY[]::text[],
  'summary', '',
  'lastUpdated', now()
)
WHERE metadata IS NULL;