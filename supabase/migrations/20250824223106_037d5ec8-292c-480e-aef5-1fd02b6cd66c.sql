-- Fix security warnings from the linter

-- 1. Fix function search path mutable warnings by setting search_path
CREATE OR REPLACE FUNCTION public.comprehensive_security_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.track_user_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.enforce_phone_validation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NOT public.validate_phone_format(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_auth_attempt(_ip_address inet, _email text, _attempt_type text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_attempts (ip_address, email, attempt_type, success)
  VALUES (_ip_address, _email, _attempt_type, _success);
END;
$$;