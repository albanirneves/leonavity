-- Add user_id to events table to track ownership
ALTER TABLE public.events 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing events to have a user_id (set to first admin for existing data)
UPDATE public.events 
SET user_id = (
  SELECT ur.user_id 
  FROM public.user_roles ur 
  WHERE ur.role = 'admin' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Make user_id NOT NULL after populating existing data
ALTER TABLE public.events 
ALTER COLUMN user_id SET NOT NULL;

-- Drop old RLS policies for events
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events based on role" ON public.events;

-- Create new RLS policies for events based on user ownership
CREATE POLICY "Users can view their own events or admins can view all" 
ON public.events 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events or admins can update all" 
ON public.events 
FOR UPDATE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete their own events or admins can delete all" 
ON public.events 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin')
);

-- Update RLS policies for categories to use event ownership
DROP POLICY IF EXISTS "Admins can manage all categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories based on role" ON public.categories;

CREATE POLICY "Users can view categories of their events or admins can view all" 
ON public.categories 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = categories.id_event 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage categories of their events or admins can manage all" 
ON public.categories 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = categories.id_event 
    AND e.user_id = auth.uid()
  )
);

-- Update RLS policies for candidates to use event ownership
DROP POLICY IF EXISTS "Admins can manage all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view candidates based on role" ON public.candidates;

CREATE POLICY "Users can view candidates of their events or admins can view all" 
ON public.candidates 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = candidates.id_event 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage candidates of their events or admins can manage all" 
ON public.candidates 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = candidates.id_event 
    AND e.user_id = auth.uid()
  )
);

-- Update RLS policies for votes to use event ownership
DROP POLICY IF EXISTS "Only admins can delete votes" ON public.votes;
DROP POLICY IF EXISTS "Only admins can update votes" ON public.votes;
DROP POLICY IF EXISTS "Users can insert votes based on role" ON public.votes;
DROP POLICY IF EXISTS "Users can view votes based on role" ON public.votes;

CREATE POLICY "Users can view votes of their events or admins can view all" 
ON public.votes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = votes.id_event 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert votes for their events or admins can insert all" 
ON public.votes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = votes.id_event 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update votes of their events or admins can update all" 
ON public.votes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = votes.id_event 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete votes of their events or admins can delete all" 
ON public.votes 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = votes.id_event 
    AND e.user_id = auth.uid()
  )
);

-- Simplify user_roles table - remove id_account since we're not using account-based roles anymore
-- Update RLS policies for simpler role checking
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their roles or admins can view all" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot insert admin roles for themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot modify their own admin roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Update handle_new_user function to not assign account-based roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  -- Create base profile
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  -- Default role: user (without account association)
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  -- Bootstrap first admin: if there is no admin yet, make this user admin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;