-- Update RLS policies for candidates table to allow any authenticated user
DROP POLICY "Only admins can insert candidates" ON public.candidates;
DROP POLICY "Only admins can update candidates" ON public.candidates;
DROP POLICY "Only admins can delete candidates" ON public.candidates;

CREATE POLICY "Authenticated users can insert candidates" 
ON public.candidates 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates" 
ON public.candidates 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete candidates" 
ON public.candidates 
FOR DELETE 
TO authenticated
USING (true);