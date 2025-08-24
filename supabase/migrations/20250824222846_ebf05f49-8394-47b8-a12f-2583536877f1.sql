-- Phase 1: Critical Security Fixes

-- 1. Add audit triggers for sensitive operations on votes table
CREATE OR REPLACE FUNCTION public.audit_votes_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive data access
  RAISE LOG 'Sensitive votes data accessed by user % at %', auth.uid(), now();
  
  -- For UPDATE operations, log what changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.phone != NEW.phone THEN
      RAISE LOG 'Phone number changed for vote % by user %', NEW.id, auth.uid();
    END IF;
    IF OLD.payment_payload != NEW.payment_payload THEN
      RAISE LOG 'Payment payload changed for vote % by user %', NEW.id, auth.uid();
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit trigger to votes table
CREATE TRIGGER audit_votes_access_trigger
  BEFORE SELECT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_votes_access();

-- 2. Add audit triggers for accounts table
CREATE OR REPLACE FUNCTION public.audit_accounts_access()
RETURNS TRIGGER AS $$
BEGIN
  RAISE LOG 'Sensitive accounts data accessed by user % at %', auth.uid(), now();
  
  IF TG_OP = 'UPDATE' AND OLD.access_token != NEW.access_token THEN
    RAISE LOG 'Access token changed for account % by user %', NEW.id, auth.uid();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit trigger to accounts table
CREATE TRIGGER audit_accounts_access_trigger
  BEFORE SELECT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_accounts_access();

-- 3. Create enhanced role system with separation of duties
CREATE TYPE public.app_role_detailed AS ENUM (
  'admin',
  'finance_admin', 
  'event_manager',
  'viewer',
  'user'
);

-- 4. Add role hierarchy and permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role_detailed NOT NULL,
  permission text NOT NULL,
  resource text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission, resource)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage role permissions
CREATE POLICY "Only admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Insert default role permissions (least privilege principle)
INSERT INTO public.role_permissions (role, permission, resource) VALUES
-- Admin permissions
('admin', 'read', 'votes'),
('admin', 'write', 'votes'),
('admin', 'read', 'accounts'),
('admin', 'write', 'accounts'),
('admin', 'read', 'events'),
('admin', 'write', 'events'),
('admin', 'read', 'candidates'),
('admin', 'write', 'candidates'),
('admin', 'read', 'categories'),
('admin', 'write', 'categories'),

-- Finance admin permissions (can only access payment-related data)
('finance_admin', 'read', 'votes_financial'),
('finance_admin', 'write', 'votes_financial'),

-- Event manager permissions
('event_manager', 'read', 'events'),
('event_manager', 'write', 'events'),
('event_manager', 'read', 'candidates'),
('event_manager', 'write', 'candidates'),
('event_manager', 'read', 'categories'),
('event_manager', 'write', 'categories'),
('event_manager', 'read', 'votes_summary'),

-- Viewer permissions
('viewer', 'read', 'events'),
('viewer', 'read', 'candidates'),
('viewer', 'read', 'categories'),
('viewer', 'read', 'votes_summary');

-- 6. Create function to check granular permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text, _resource text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role::text = rp.role::text
    WHERE ur.user_id = _user_id 
    AND rp.permission = _permission 
    AND rp.resource = _resource
  );
$$;

-- 7. Create secure views for sensitive data with masking
CREATE OR REPLACE VIEW public.votes_masked AS
SELECT 
  id,
  id_event,
  id_category,
  id_candidate,
  votes,
  -- Mask phone number for non-finance roles
  CASE 
    WHEN public.has_permission(auth.uid(), 'read', 'votes_financial') THEN phone
    ELSE CONCAT(LEFT(phone, 2), '****', RIGHT(phone, 2))
  END as phone_masked,
  payment_status,
  -- Hide payment details from non-finance roles
  CASE 
    WHEN public.has_permission(auth.uid(), 'read', 'votes_financial') THEN payment_payload
    ELSE NULL
  END as payment_payload_secure,
  created_at,
  events_sent,
  candidates_sent,
  categories_sent,
  votes_sent,
  confirm_sent,
  info_confirmed
FROM public.votes
WHERE public.has_permission(auth.uid(), 'read', 'votes') 
   OR public.has_permission(auth.uid(), 'read', 'votes_financial')
   OR public.has_permission(auth.uid(), 'read', 'votes_summary');

-- 8. Create summary view for event managers
CREATE OR REPLACE VIEW public.votes_summary AS
SELECT 
  id_event,
  id_category,
  id_candidate,
  COUNT(*) as total_votes,
  SUM(votes) as total_vote_count,
  COUNT(CASE WHEN payment_status = 'approved' THEN 1 END) as paid_votes,
  created_at::date as vote_date
FROM public.votes
WHERE public.has_permission(auth.uid(), 'read', 'votes_summary')
GROUP BY id_event, id_category, id_candidate, created_at::date;

-- 9. Add input validation functions
CREATE OR REPLACE FUNCTION public.validate_phone_format(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate phone format (basic validation)
  RETURN phone_input ~ '^[0-9+\-\(\)\s]{10,20}$';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_email_format(email_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basic email validation
  RETURN email_input ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- 10. Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text,
  attempt_type text NOT NULL, -- 'login', 'signup', 'reset'
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view auth attempts
CREATE POLICY "Only admins can view auth attempts"
ON public.auth_attempts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow system to insert auth attempts (for rate limiting)
CREATE POLICY "System can insert auth attempts"
ON public.auth_attempts
FOR INSERT
WITH CHECK (true);

-- 11. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(_ip_address inet, _email text, _attempt_type text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  recent_attempts integer;
BEGIN
  -- Count attempts in last 15 minutes
  SELECT COUNT(*) INTO recent_attempts
  FROM public.auth_attempts
  WHERE ip_address = _ip_address
    AND (email = _email OR email IS NULL)
    AND attempt_type = _attempt_type
    AND created_at > now() - interval '15 minutes';
  
  -- Allow max 5 attempts per 15 minutes
  RETURN recent_attempts < 5;
END;
$$;

-- 12. Update existing RLS policies to use granular permissions
DROP POLICY IF EXISTS "Only admins can view votes" ON public.votes;
DROP POLICY IF EXISTS "Only admins can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Only admins can update votes" ON public.votes;
DROP POLICY IF EXISTS "Only admins can delete votes" ON public.votes;

-- New granular RLS policies for votes
CREATE POLICY "Users with vote permissions can view votes"
ON public.votes
FOR SELECT
USING (
  public.has_permission(auth.uid(), 'read', 'votes') OR 
  public.has_permission(auth.uid(), 'read', 'votes_financial') OR
  public.has_permission(auth.uid(), 'read', 'votes_summary')
);

CREATE POLICY "Users with vote write permissions can insert votes"
ON public.votes
FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'write', 'votes'));

CREATE POLICY "Users with vote write permissions can update votes"
ON public.votes
FOR UPDATE
USING (public.has_permission(auth.uid(), 'write', 'votes'));

CREATE POLICY "Only full admins can delete votes"
ON public.votes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 13. Add session monitoring table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions, admins can see all
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- 14. Create admin security alerts function
CREATE OR REPLACE FUNCTION public.trigger_security_alert(_alert_type text, _details text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log security alerts
  RAISE LOG 'SECURITY ALERT: % - %', _alert_type, _details;
  
  -- Could integrate with external alerting systems here
  -- For now, just log the event
END;
$$;

-- 15. Add trigger for suspicious admin activities
CREATE OR REPLACE FUNCTION public.monitor_admin_activities()
RETURNS TRIGGER AS $$
DECLARE
  user_role_count integer;
BEGIN
  -- Check if user has multiple admin-level roles (suspicious)
  SELECT COUNT(*) INTO user_role_count
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin'::app_role);
  
  -- Alert if bulk operations on sensitive data
  IF TG_TABLE_NAME = 'votes' AND TG_OP = 'DELETE' THEN
    PERFORM public.trigger_security_alert('BULK_DELETE', 'Admin deleted vote record');
  END IF;
  
  IF TG_TABLE_NAME = 'accounts' AND TG_OP = 'UPDATE' AND OLD.access_token != NEW.access_token THEN
    PERFORM public.trigger_security_alert('TOKEN_CHANGE', 'Admin changed access token');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add monitoring triggers
CREATE TRIGGER monitor_votes_admin_activity
  AFTER UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_admin_activities();

CREATE TRIGGER monitor_accounts_admin_activity  
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_admin_activities();