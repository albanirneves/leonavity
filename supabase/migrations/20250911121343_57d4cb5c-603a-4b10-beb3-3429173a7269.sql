-- Add RLS policies for candidates table to allow admin operations
CREATE POLICY "Only admins can insert candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update candidates" 
ON public.candidates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete candidates" 
ON public.candidates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));