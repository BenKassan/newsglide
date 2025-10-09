-- Migration: Fix Topic Creation RLS Policies
-- Description: Allow authenticated users to create public topics for searches
-- Date: 2025-10-01

-- ============================================================================
-- Update RLS policies to allow topic creation
-- ============================================================================

-- Policy: Allow authenticated users to create public topics from searches
-- This enables the search functionality to work for logged-in users
CREATE POLICY "Authenticated users can create public topics"
  ON discover_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
