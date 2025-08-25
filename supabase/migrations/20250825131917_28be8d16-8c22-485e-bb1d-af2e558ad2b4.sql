-- Remove phone validation functions (and any dependent triggers)
DROP FUNCTION IF EXISTS public.enforce_phone_validation() CASCADE;
DROP FUNCTION IF EXISTS public.validate_phone_format(text);

-- Relax RLS so authenticated users can insert/select votes
-- Keep admin-only for update/delete
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policies we will replace
DROP POLICY IF EXISTS "Only admins can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Only admins can view votes" ON public.votes;

-- Ensure admin-only policies for update/delete remain as-is; if missing, recreate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='Only admins can update votes'
  ) THEN
    CREATE POLICY "Only admins can update votes"
    ON public.votes FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='votes' AND policyname='Only admins can delete votes'
  ) THEN
    CREATE POLICY "Only admins can delete votes"
    ON public.votes FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- New policies for authenticated users
CREATE POLICY "Authenticated users can insert votes"
ON public.votes FOR INSERT
WITH CHECK (auth.role() = 'authenticated'::text OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view votes"
ON public.votes FOR SELECT
USING (auth.role() = 'authenticated'::text OR has_role(auth.uid(), 'admin'::app_role));