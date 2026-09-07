-- Einmalig in Supabase SQL Editor ausführen
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lang VARCHAR(5) NOT NULL DEFAULT 'de'
    CHECK (lang IN ('de', 'en'));
