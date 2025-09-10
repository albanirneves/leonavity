-- Make whatsapp_token not nullable
ALTER TABLE public.accounts ALTER COLUMN whatsapp_token SET NOT NULL;