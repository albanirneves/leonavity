-- Fix linter warnings related to previous migration

-- 1) Move pgcrypto extension to the "extensions" schema when possible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    BEGIN
      ALTER EXTENSION pgcrypto SET SCHEMA extensions;
    EXCEPTION WHEN others THEN
      -- If cannot move, ensure it's created in extensions for new envs
      CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
    END;
  ELSE
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
  END IF;
END $$;

-- 2) Ensure search_path is set for trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;