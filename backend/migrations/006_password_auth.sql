-- Email + password sign-in. Coexists with Google Sign-In: a user row may
-- have google_id, password_hash, or both (linked accounts).

ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
