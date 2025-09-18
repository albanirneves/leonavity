-- Add send_ranking field to events table
ALTER TABLE public.events 
ADD COLUMN send_ranking jsonb DEFAULT '[]'::jsonb;