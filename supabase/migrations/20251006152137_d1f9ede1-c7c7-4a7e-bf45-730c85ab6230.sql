-- Modify candidates.phone column to store JSON array of phone numbers
ALTER TABLE public.candidates 
ALTER COLUMN phone TYPE jsonb USING 
  CASE 
    WHEN phone IS NULL THEN '[]'::jsonb
    WHEN phone = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object('ddi', '+55', 'ddd', '', 'number', phone))
  END;

-- Set default value for new records
ALTER TABLE public.candidates 
ALTER COLUMN phone SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.candidates.phone IS 'Array of phone objects with structure: [{"ddi": "+55", "ddd": "11", "number": "999999999"}]';