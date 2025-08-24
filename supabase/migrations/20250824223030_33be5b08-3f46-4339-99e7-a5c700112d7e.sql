-- Final security fixes - remove existing conflicting triggers and add comprehensive security

-- Drop any conflicting triggers
DROP TRIGGER IF EXISTS audit_votes_operations ON public.votes;
DROP TRIGGER IF EXISTS audit_accounts_operations ON public.accounts;
DROP TRIGGER IF EXISTS monitor_votes_admin_activity ON public.votes;
DROP TRIGGER IF EXISTS monitor_accounts_admin_activity ON public.accounts;

-- Remove problematic functions that conflicted
DROP FUNCTION IF EXISTS public.audit_votes_access();
DROP FUNCTION IF EXISTS public.audit_accounts_access();

-- Add comprehensive security audit logging
CREATE OR REPLACE FUNCTION public.comprehensive_security_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all operations on sensitive tables with enhanced detail
  IF TG_TABLE_NAME = 'votes' THEN
    CASE TG_OP
      WHEN 'INSERT' THEN
        RAISE LOG 'AUDIT: Vote created - ID: % Event: % Category: % Candidate: % Phone: % User: %', 
          NEW.id, NEW.id_event, NEW.id_category, NEW.id_candidate, LEFT(NEW.phone, 3) || '***', auth.uid();
      WHEN 'UPDATE' THEN
        IF OLD.phone != NEW.phone THEN
          RAISE LOG 'SECURITY ALERT: Phone number changed for vote % by user % from % to %', 
            NEW.id, auth.uid(), LEFT(OLD.phone, 3) || '***', LEFT(NEW.phone, 3) || '***';
        END IF;
        IF OLD.payment_payload IS DISTINCT FROM NEW.payment_payload THEN
          RAISE LOG 'SECURITY ALERT: Payment payload modified for vote % by user %', NEW.id, auth.uid();
        END IF;
      WHEN 'DELETE' THEN
        RAISE LOG 'SECURITY ALERT: Vote deleted - ID: % by user %', OLD.id, auth.uid();
    END CASE;
  ELSIF TG_TABLE_NAME = 'accounts' THEN
    CASE TG_OP
      WHEN 'UPDATE' THEN
        IF OLD.access_token != NEW.access_token THEN
          RAISE LOG 'SECURITY ALERT: Access token changed for account % (%) by user %', 
            NEW.id, NEW.name, auth.uid();
        END IF;
      WHEN 'DELETE' THEN
        RAISE LOG 'SECURITY ALERT: Account deleted - ID: % Name: % by user %', 
          OLD.id, OLD.name, auth.uid();
    END CASE;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the comprehensive audit triggers
CREATE TRIGGER votes_security_audit
  BEFORE INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.comprehensive_security_audit();

CREATE TRIGGER accounts_security_audit
  BEFORE INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.comprehensive_security_audit();

-- Add session tracking for security monitoring
CREATE OR REPLACE FUNCTION public.track_user_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert session tracking
  INSERT INTO public.user_sessions (user_id, last_activity, is_active)
  VALUES (auth.uid(), now(), true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_activity = now(),
    is_active = true;
END;
$$;

-- Create database function to enforce phone validation
CREATE OR REPLACE FUNCTION public.enforce_phone_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NOT public.validate_phone_format(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add phone validation trigger
CREATE TRIGGER validate_phone_on_votes
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_phone_validation();

-- Add rate limiting tracking function
CREATE OR REPLACE FUNCTION public.log_auth_attempt(_ip_address inet, _email text, _attempt_type text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.auth_attempts (ip_address, email, attempt_type, success)
  VALUES (_ip_address, _email, _attempt_type, _success);
END;
$$;