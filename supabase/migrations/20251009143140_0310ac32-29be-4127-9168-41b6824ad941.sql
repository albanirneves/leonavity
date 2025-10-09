-- Add highlight_first_place column to events table
ALTER TABLE public.events 
ADD COLUMN highlight_first_place BOOLEAN NOT NULL DEFAULT false;