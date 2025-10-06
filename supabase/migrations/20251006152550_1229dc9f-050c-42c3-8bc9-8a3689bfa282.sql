-- Convert existing phone data to simple string array format
UPDATE public.candidates
SET phone = CASE 
  WHEN phone IS NULL OR phone = '[]'::jsonb THEN '[]'::jsonb
  WHEN jsonb_typeof(phone) = 'array' AND jsonb_array_length(phone) > 0 THEN
    -- Convert from object array to string array
    (SELECT jsonb_agg(
      CONCAT(
        COALESCE(elem->>'ddi', '+55'),
        COALESCE(elem->>'ddd', ''),
        COALESCE(elem->>'number', '')
      )
    )
    FROM jsonb_array_elements(phone) AS elem
    WHERE CONCAT(
      COALESCE(elem->>'ddi', '+55'),
      COALESCE(elem->>'ddd', ''),
      COALESCE(elem->>'number', '')
    ) != '+55'
    )
  ELSE '[]'::jsonb
END
WHERE phone IS NOT NULL;

COMMENT ON COLUMN public.candidates.phone IS 'Array of phone numbers as strings: ["5518996473715", "5511999999999"]';