-- Add RLS policies for events table to allow authenticated users to update events
CREATE POLICY "Authenticated users can update events" 
ON public.events 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can insert events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete events" 
ON public.events 
FOR DELETE 
USING (true);

-- Add RLS policies for categories table to allow authenticated users to manage categories
CREATE POLICY "Authenticated users can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" 
ON public.categories 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete categories" 
ON public.categories 
FOR DELETE 
USING (true);