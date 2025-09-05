-- Supabase todos table schema for use with example.tsx
CREATE TABLE IF NOT EXISTS todos (
  id serial PRIMARY KEY,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
); 