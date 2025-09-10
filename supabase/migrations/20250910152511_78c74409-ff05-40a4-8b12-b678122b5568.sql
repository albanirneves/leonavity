-- First, set default values for existing null whatsapp_token records
UPDATE public.accounts 
SET whatsapp_token = ''
WHERE whatsapp_token IS NULL;

-- Then make the column not nullable
ALTER TABLE public.accounts ALTER COLUMN whatsapp_token SET NOT NULL;