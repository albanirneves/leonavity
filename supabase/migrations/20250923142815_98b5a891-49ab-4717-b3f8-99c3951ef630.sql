-- Add layout_color column to events table
ALTER TABLE public.events 
ADD COLUMN layout_color TEXT DEFAULT '#fddf59';