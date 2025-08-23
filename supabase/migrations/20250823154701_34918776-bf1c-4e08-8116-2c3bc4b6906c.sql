-- CRITICAL SECURITY FIXES: Enable RLS and create comprehensive policies

-- 1. Enable RLS on all sensitive tables
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. VOTES TABLE POLICIES (Most Critical - Contains PII and Payment Data)
-- Only admins can access votes data
CREATE POLICY "Only admins can view votes" ON public.votes
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert votes" ON public.votes
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update votes" ON public.votes
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete votes" ON public.votes
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. ACCOUNTS TABLE POLICIES (Contains Business Access Tokens)
-- Only admins can access account data
CREATE POLICY "Only admins can view accounts" ON public.accounts
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert accounts" ON public.accounts
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update accounts" ON public.accounts
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete accounts" ON public.accounts
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. EVENTS TABLE POLICIES
-- Admins can do everything, others can only view active events
CREATE POLICY "Admins can manage all events" ON public.events
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active events" ON public.events
FOR SELECT USING (
  NOT public.has_role(auth.uid(), 'admin') AND 
  active = true AND 
  auth.role() = 'authenticated'
);

-- 5. CANDIDATES TABLE POLICIES
-- Admins can manage all, others can only view candidates for active events
CREATE POLICY "Admins can manage all candidates" ON public.candidates
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view candidates for active events" ON public.candidates
FOR SELECT USING (
  NOT public.has_role(auth.uid(), 'admin') AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = candidates.id_event AND events.active = true
  )
);

-- 6. CATEGORIES TABLE POLICIES
-- Admins can manage all, others can only view categories for active events
CREATE POLICY "Admins can manage all categories" ON public.categories
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view categories for active events" ON public.categories
FOR SELECT USING (
  NOT public.has_role(auth.uid(), 'admin') AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = categories.id_event AND events.active = true
  )
);

-- 7. STRENGTHEN USER_ROLES SECURITY
-- Prevent users from modifying their own roles (additional safeguard)
CREATE POLICY "Users cannot modify their own admin roles" ON public.user_roles
FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') AND 
  (user_id != auth.uid() OR role != 'admin')
);

CREATE POLICY "Users cannot insert admin roles for themselves" ON public.user_roles
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') AND 
  (user_id != auth.uid() OR role != 'admin')
);

-- 8. CREATE AUDIT FUNCTION FOR SENSITIVE OPERATIONS
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive operations to a separate audit table (if needed later)
  RAISE LOG 'Sensitive operation on table % by user %', TG_TABLE_NAME, auth.uid();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ADD TRIGGERS FOR AUDIT LOGGING ON SENSITIVE TABLES
CREATE TRIGGER audit_votes_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

CREATE TRIGGER audit_accounts_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- 10. CREATE FUNCTION TO CHECK IF USER IS ADMIN (Additional Security Layer)
CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;