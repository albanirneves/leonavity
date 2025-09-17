-- Create RLS policies for votes table to allow reading vote data
CREATE POLICY "Public can view votes" 
ON public.votes 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert votes
CREATE POLICY "Authenticated users can insert votes" 
ON public.votes 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to update votes
CREATE POLICY "Authenticated users can update votes" 
ON public.votes 
FOR UPDATE 
USING (true);